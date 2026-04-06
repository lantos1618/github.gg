'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface NetworkUser {
  username: string;
  avatar: string;
  name: string | null;
  bio: string | null;
  followers: number;
  publicRepos: number;
  hasGGProfile: boolean;
}

interface NetworkGraphProps {
  users: NetworkUser[];
  seed: string;
  onExpandNode?: (username: string) => Promise<NetworkUser[] | null>;
  onSelectionChange?: (selected: Set<string>) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isSeed: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  avatar: string;
  user: NetworkUser | null;
  hidden: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
}

const PALETTE = {
  seed: '#111',
  ggProfile: '#22863a',
  noProfile: '#c8c8c8',
  edge: '#e8e8e8',
  edgeActive: '#bbb',
  edgeMutual: '#e8a838',
  label: '#333',
  labelMuted: '#999',
  labelBg: 'rgba(255,255,255,0.96)',
  ring: '#ddd',
  ringExpanded: '#111',
  ringMutual: '#e8a838',
  ringSelected: '#3b82f6',
  ringLoading: '#3b82f6',
  searchHit: '#ef4444',
  bg: '#fafafa',
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** Scale node radius by follower count (log scale so huge accounts don't dominate). */
const getNodeRadius = (followers: number, isSeed: boolean): number => {
  if (isSeed) return 35;
  const MIN = 8;
  const MAX = 32;
  if (followers <= 0) return MIN;
  // Log scale: log(1) = 0, log(1000) ≈ 3, log(1M) ≈ 6
  const scale = Math.log10(followers + 1) / Math.log10(1_000_000);
  return MIN + (MAX - MIN) * Math.min(scale, 1);
};

function getDegreeCounts(edges: GraphEdge[]): Map<string, number> {
  const c = new Map<string, number>();
  for (const e of edges) {
    c.set(e.source, (c.get(e.source) || 0) + 1);
    c.set(e.target, (c.get(e.target) || 0) + 1);
  }
  return c;
}

// Compute a curved path between two points with slight perpendicular offset
function curvedEdgePath(sx: number, sy: number, tx: number, ty: number, curvature: number = 0.15): string {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  // perpendicular offset
  const cx = mx - dy * curvature;
  const cy = my + dx * curvature;
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

export function NetworkGraph({ users, seed, onExpandNode, onSelectionChange }: NetworkGraphProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [hideLeaves, setHideLeaves] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const iterationRef = useRef(0);
  const initializedForRef = useRef<string>('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickNodeRef = useRef<string | null>(null);
  const viewBoxRef = useRef({ x: 0, y: 0, w: 900, h: 800 });
  const isPanningRef = useRef(false);
  const autoFitEnabledRef = useRef(true);
  const [structureVersion, setStructureVersion] = useState(0);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(
      nodesRef.current
        .filter(n => n.id.toLowerCase().includes(q) || n.user?.name?.toLowerCase().includes(q))
        .map(n => n.id)
    );
  }, [searchQuery, structureVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onSelectionChange?.(selectedNodes);
  }, [selectedNodes, onSelectionChange]);

  // Build graph data
  useEffect(() => {
    const dataKey = `${seed}:${users.map(u => u.username).join(',')}`;
    if (initializedForRef.current === dataKey) return;
    initializedForRef.current = dataKey;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    nodes.push({
      id: seed, x: cx, y: cy, vx: 0, vy: 0,
      radius: getNodeRadius(0, true), color: PALETTE.seed, isSeed: true,
      isExpanded: true, isLoading: false,
      avatar: `https://github.com/${seed}.png?size=128`,
      user: null, hidden: false,
    });

    const angleStep = (2 * Math.PI) / Math.max(users.length, 1);
    const spread = Math.min(dimensions.width, dimensions.height) * 0.38;

    users.forEach((u, i) => {
      const angle = angleStep * i - Math.PI / 2; // start from top
      const r = getNodeRadius(u.followers, false);
      const jitter = (Math.random() - 0.5) * 30;
      nodes.push({
        id: u.username,
        x: cx + Math.cos(angle) * (spread + jitter),
        y: cy + Math.sin(angle) * (spread + jitter),
        vx: 0, vy: 0, radius: r,
        color: u.hasGGProfile ? PALETTE.ggProfile : PALETTE.noProfile,
        isSeed: false, isExpanded: false, isLoading: false,
        avatar: u.avatar, user: u, hidden: false,
      });
      edges.push({ source: seed, target: u.username });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterationRef.current = 0;
    viewBoxRef.current = { x: 0, y: 0, w: dimensions.width, h: dimensions.height };
    setStructureVersion(v => v + 1);
  }, [users, seed, dimensions]);

  // Add nodes on expand
  const addNodes = useCallback((parentId: string, newUsers: NetworkUser[]) => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const existingIds = new Set(nodes.map(n => n.id));
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    let added = 0;
    const angleStep = (2 * Math.PI) / Math.max(newUsers.length, 1);

    newUsers.forEach((u, i) => {
      if (existingIds.has(u.username)) {
        if (!edges.some(e =>
          (e.source === parentId && e.target === u.username) ||
          (e.source === u.username && e.target === parentId)
        )) {
          edges.push({ source: parentId, target: u.username });
        }
        return;
      }

      const angle = angleStep * i;
      const sp = 140 + Math.random() * 80;
      const r = getNodeRadius(u.followers, false);

      nodes.push({
        id: u.username,
        x: parent.x + Math.cos(angle) * sp,
        y: parent.y + Math.sin(angle) * sp,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: r, color: u.hasGGProfile ? PALETTE.ggProfile : PALETTE.noProfile,
        isSeed: false, isExpanded: false, isLoading: false,
        avatar: u.avatar, user: u, hidden: false,
      });
      edges.push({ source: parentId, target: u.username });
      added++;
    });

    parent.isExpanded = true;
    parent.isLoading = false;

    if (added > 0) {
      iterationRef.current = Math.max(0, iterationRef.current - 100);
      autoFitEnabledRef.current = true;
    }
    setStructureVersion(v => v + 1);
  }, []);

  const handleExpand = useCallback(async (username: string) => {
    if (!onExpandNode) return;
    const node = nodesRef.current.find(n => n.id === username);
    if (!node || node.isExpanded || node.isLoading) return;

    node.isLoading = true;
    setStructureVersion(v => v + 1);

    try {
      const newUsers = await onExpandNode(username);
      if (newUsers) {
        addNodes(username, newUsers);
      } else {
        node.isLoading = false;
        node.isExpanded = true;
        setStructureVersion(v => v + 1);
      }
    } catch {
      node.isLoading = false;
      setStructureVersion(v => v + 1);
    }
  }, [onExpandNode, addNodes]);

  const toggleSelection = useCallback((nodeId: string) => {
    setSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Fit to view
  const fitToView = useCallback(() => {
    const nodes = nodesRef.current.filter(n => !n.hidden);
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x - node.radius - 80);
      minY = Math.min(minY, node.y - node.radius - 80);
      maxX = Math.max(maxX, node.x + node.radius + 80);
      maxY = Math.max(maxY, node.y + node.radius + 80);
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const aspect = dimensions.width / dimensions.height;
    let fitW = contentW, fitH = contentH;
    if (fitW / fitH > aspect) fitH = fitW / aspect;
    else fitW = fitH * aspect;

    viewBoxRef.current = {
      x: (minX + maxX) / 2 - fitW / 2,
      y: (minY + maxY) / 2 - fitH / 2,
      w: fitW,
      h: fitH,
    };
    autoFitEnabledRef.current = true;
  }, [dimensions]);

  // Hide leaves filter
  useEffect(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!hideLeaves) {
      for (const n of nodes) n.hidden = false;
      setStructureVersion(v => v + 1);
      return;
    }
    const degrees = getDegreeCounts(edges);
    for (const n of nodes) {
      n.hidden = !n.isSeed && (degrees.get(n.id) || 0) < 2;
    }
    setStructureVersion(v => v + 1);
  }, [hideLeaves, structureVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force simulation
  const simulate = useCallback(() => {
    const allNodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodes = allNodes.filter(n => !n.hidden);
    if (nodes.length === 0) return;

    const iteration = iterationRef.current;
    const n = nodes.length;
    // Never fully freeze — keep minimum alpha so dragging always works
    const alpha = Math.max(0.02, 1 - iteration * 0.005);

    {
      const repulsion = (4000 + n * 100) * alpha;
      const springK = 0.01;
      const springLen = 160 + Math.sqrt(n) * 14;
      const damping = 0.82;
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;

      // Repulsion (O(n^2) — fine for < 500 nodes)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minD = nodes[i].radius + nodes[j].radius + 20;
          const eff = Math.max(dist, minD * 0.4);
          const f = repulsion / (eff * eff);
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }

      // Hard collision resolution
      if (alpha > 0.03) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const minD = nodes[i].radius + nodes[j].radius + 10;
            if (dist < minD) {
              const overlap = (minD - dist) / 2;
              const nx = dx / dist, ny = dy / dist;
              if (nodes[i].id !== dragNode) { nodes[i].x -= nx * overlap; nodes[i].y -= ny * overlap; }
              if (nodes[j].id !== dragNode) { nodes[j].x += nx * overlap; nodes[j].y += ny * overlap; }
            }
          }
        }
      }

      // Spring forces
      const visibleIds = new Set(nodes.map(n => n.id));
      const nMap = new Map(nodes.map(n => [n.id, n]));
      for (const edge of edges) {
        if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
        const src = nMap.get(edge.source);
        const tgt = nMap.get(edge.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const disp = dist - springLen;
        const f = springK * disp;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        src.vx += fx; src.vy += fy;
        tgt.vx -= fx; tgt.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (cx - node.x) * 0.0004 * alpha;
        node.vy += (cy - node.y) * 0.0004 * alpha;
      }

      // Integrate
      for (const node of nodes) {
        if (node.id === dragNode) continue;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      }

      // Soft pin seed to center
      const seedNode = allNodes[0];
      if (seedNode?.isSeed && seedNode.id !== dragNode) {
        seedNode.x += (cx - seedNode.x) * 0.015;
        seedNode.y += (cy - seedNode.y) * 0.015;
      }
    }

    // Continuous auto-fit — always follow the graph unless user pans/zooms manually
    if (autoFitEnabledRef.current && iteration % 3 === 0 && !isPanningRef.current && !dragNode) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const node of nodes) {
        const pad = node.radius + 70;
        minX = Math.min(minX, node.x - pad);
        minY = Math.min(minY, node.y - pad);
        maxX = Math.max(maxX, node.x + pad);
        maxY = Math.max(maxY, node.y + pad);
      }
      const cW = maxX - minX, cH = maxY - minY;
      const aspect = dimensions.width / dimensions.height;
      let fitW = cW, fitH = cH;
      if (fitW / fitH > aspect) fitH = fitW / aspect;
      else fitW = fitH * aspect;
      const tW = Math.max(fitW, dimensions.width * 0.6);
      const tH = Math.max(fitH, dimensions.height * 0.6);
      const tX = (minX + maxX) / 2 - tW / 2;
      const tY = (minY + maxY) / 2 - tH / 2;
      const vb = viewBoxRef.current;
      // Faster lerp early, slower later for smooth settling
      const t = iteration < 60 ? 0.15 : 0.05;
      viewBoxRef.current = {
        x: vb.x + (tX - vb.x) * t,
        y: vb.y + (tY - vb.y) * t,
        w: vb.w + (tW - vb.w) * t,
        h: vb.h + (tH - vb.h) * t,
      };
    }

    iterationRef.current++;
  }, [dimensions, dragNode]);

  // Render loop — direct DOM updates
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      simulate();

      const svg = svgRef.current;
      if (svg) {
        const vb = viewBoxRef.current;
        svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const nMap = new Map(nodes.map(n => [n.id, n]));

        // Update edges (curved paths)
        const edgeEls = svg.querySelectorAll('.graph-edge');
        edgeEls.forEach((el, i) => {
          const edge = edges[i];
          if (!edge) return;
          const src = nMap.get(edge.source);
          const tgt = nMap.get(edge.target);
          if (!src || !tgt || src.hidden || tgt.hidden) {
            el.setAttribute('visibility', 'hidden');
            return;
          }
          el.setAttribute('visibility', 'visible');
          el.setAttribute('d', curvedEdgePath(src.x, src.y, tgt.x, tgt.y, 0.08));
        });

        // Update nodes
        const nodeEls = svg.querySelectorAll('.graph-node');
        nodeEls.forEach((el, i) => {
          const node = nodes[i];
          if (!node) return;
          if (node.hidden) { (el as HTMLElement).style.display = 'none'; return; }
          (el as HTMLElement).style.display = '';
          el.setAttribute('transform', `translate(${node.x},${node.y})`);
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [simulate]);

  // Capture wheel events with { passive: false } to prevent page scroll when zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheelCapture = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener('wheel', handleWheelCapture, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelCapture);
  }, []);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mouse handlers
  const getSvgPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svgPt = getSvgPoint(e);
    if (!svgPt) return;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.hidden) continue;
      const dx = svgPt.x - node.x, dy = svgPt.y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 4) {
        setDragNode(node.id);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        node.vx = 0; node.vy = 0;
        e.preventDefault();
        return;
      }
    }
    setIsPanning(true);
    isPanningRef.current = true;
    const vb = viewBoxRef.current;
    panStart.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
    e.preventDefault();
  }, [getSvgPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragNode) {
      const svgPt = getSvgPoint(e);
      if (!svgPt) return;
      const node = nodesRef.current.find(n => n.id === dragNode);
      if (node) { node.x = svgPt.x; node.y = svgPt.y; node.vx = 0; node.vy = 0; }
      // Reheat simulation so other nodes react to the drag
      iterationRef.current = Math.min(iterationRef.current, 120);
      return;
    }
    if (isPanning) {
      const vb = viewBoxRef.current;
      const scale = vb.w / dimensions.width;
      viewBoxRef.current = {
        ...vb,
        x: panStart.current.vx - (e.clientX - panStart.current.x) * scale,
        y: panStart.current.vy - (e.clientY - panStart.current.y) * scale,
      };
      return;
    }
    const svgPt = getSvgPoint(e);
    if (!svgPt) return;
    let found: string | null = null;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.hidden) continue;
      const dx = svgPt.x - node.x, dy = svgPt.y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 6) { found = node.id; break; }
    }
    setHoveredNode(found);
  }, [dragNode, isPanning, dimensions, getSvgPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragNode) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        const nodeId = dragNode;
        if (e.metaKey || e.ctrlKey) {
          window.open(`/${nodeId}`, '_blank');
          setDragNode(null); setIsPanning(false); isPanningRef.current = false;
          return;
        }
        if (e.shiftKey) {
          toggleSelection(nodeId);
          setDragNode(null); setIsPanning(false); isPanningRef.current = false;
          return;
        }
        if (clickTimerRef.current && lastClickNodeRef.current === nodeId) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null; lastClickNodeRef.current = null;
          router.push(`/${nodeId}`);
        } else {
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
          lastClickNodeRef.current = nodeId;
          clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null; lastClickNodeRef.current = null;
            handleExpand(nodeId);
          }, 250);
        }
      }
    }
    setDragNode(null); setIsPanning(false); isPanningRef.current = false;
  }, [dragNode, handleExpand, toggleSelection]);

  const handleMouseLeave = useCallback(() => {
    setDragNode(null); setIsPanning(false); isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svgPt = getSvgPoint(e);
    if (!svgPt) return;
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    const vb = viewBoxRef.current;
    const newW = clamp(vb.w * factor, 200, dimensions.width * 12);
    const newH = clamp(vb.h * factor, 140, dimensions.height * 12);
    const rx = (svgPt.x - vb.x) / vb.w;
    const ry = (svgPt.y - vb.y) / vb.h;
    viewBoxRef.current = { x: svgPt.x - rx * newW, y: svgPt.y - ry * newH, w: newW, h: newH };
    autoFitEnabledRef.current = false;
  }, [dimensions, getSvgPoint]);

  // Computed values for rendering
  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  const degrees = getDegreeCounts(edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const totalVisible = nodes.filter(n => !n.hidden).length;
  const totalEdges = edges.length;
  const routerCount = nodes.filter(n => !n.isSeed && !n.hidden && (degrees.get(n.id) || 0) >= 2).length;

  const getRingColor = (node: GraphNode, hovered: boolean, selected: boolean, isSearchHit: boolean) => {
    if (isSearchHit) return PALETTE.searchHit;
    if (selected) return PALETTE.ringSelected;
    if (node.isSeed) return PALETTE.seed;
    if (hovered) return '#111';
    const deg = degrees.get(node.id) || 0;
    if (deg >= 2) return PALETTE.ringMutual;
    if (node.isExpanded) return PALETTE.ringExpanded;
    if (node.color === PALETTE.ggProfile) return PALETTE.ggProfile;
    return PALETTE.ring;
  };

  const getRingWidth = (node: GraphNode, hovered: boolean, selected: boolean, isSearchHit: boolean) => {
    if (isSearchHit) return 3;
    if (selected) return 3;
    if (hovered || node.isSeed) return 2.5;
    if ((degrees.get(node.id) || 0) >= 2) return 2;
    if (node.isExpanded) return 2;
    return 1.5;
  };

  const vb = viewBoxRef.current;

  // Escape to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isFullscreen]);

  useEffect(() => {
    autoFitEnabledRef.current = true;
    iterationRef.current = Math.max(0, iterationRef.current - 50);
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-hidden' : 'w-full rounded-lg bg-white relative overflow-hidden'}
      style={isFullscreen ? { touchAction: 'none' } : { height: '70vh', minHeight: 600, border: '1px solid #eee', touchAction: 'none' }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-10 px-4 py-3 bg-gradient-to-b from-white via-white/95 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex gap-3 text-[11px] text-[#888] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#111]" /> Seed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-[1.5px] border-[#e8a838] bg-white" /> Router
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22863a]" /> GG
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#c8c8c8]" /> New
            </span>
          </div>
          <span className="text-[11px] text-[#bbb] font-mono">{totalVisible} nodes · {totalEdges} edges · {routerCount} routers</span>
        </div>
        <div className="flex gap-1.5 items-center pointer-events-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search graph..."
            className="w-32 px-2 py-1 text-[11px] border border-[#e0e0e0] rounded bg-white/90 text-[#333] placeholder:text-[#ccc] focus:outline-none focus:border-[#999] transition-colors"
          />
          <button
            onClick={fitToView}
            className="px-2 py-1 text-[11px] font-medium rounded bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999] transition-colors"
            title="Fit all nodes in view"
          >
            Fit
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="px-2 py-1 text-[11px] font-medium rounded bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999] transition-colors"
          >
            {isFullscreen ? 'Exit' : 'Full'}
          </button>
          <button
            onClick={() => setHideLeaves(!hideLeaves)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              hideLeaves ? 'bg-[#111] text-white border border-[#111]' : 'bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999]'
            }`}
          >
            {hideLeaves ? 'All' : 'Routers'}
          </button>
          {selectedNodes.size > 0 && (
            <button
              onClick={() => setSelectedNodes(new Set())}
              className="px-2 py-1 text-[11px] font-medium text-[#3b82f6] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
            >
              {selectedNodes.size} selected ×
            </button>
          )}
        </div>
      </div>

      {/* Bottom hints */}
      <div className="absolute bottom-2 right-3 text-[10px] text-[#c0c0c0] z-10 select-none">
        click expand · double-click profile · cmd+click new tab · shift select · scroll zoom{isFullscreen ? ' · esc exit' : ''}
      </div>

      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: dragNode ? 'grabbing' : isPanning ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
      >
        <defs>
          {nodes.map(node => (
            <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
              <circle r={node.radius} cx={0} cy={0} />
            </clipPath>
          ))}
          {/* Subtle drop shadow for nodes */}
          <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.08" />
          </filter>
          <filter id="node-shadow-hover" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.12" />
          </filter>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse-ring { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.3; } }
            .loading-ring { animation: spin 1.2s linear infinite; transform-origin: center; }
            .search-ring { animation: pulse-ring 1.5s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Edges — curved bezier paths */}
        {edges.map((edge, i) => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;
          const hovered = hoveredNode === edge.source || hoveredNode === edge.target;
          const srcDeg = degrees.get(edge.source) || 0;
          const tgtDeg = degrees.get(edge.target) || 0;
          const isMutual = srcDeg >= 2 && tgtDeg >= 2;
          const dist = Math.sqrt((tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2);
          const opacity = hovered ? 0.7 : isMutual ? 0.4 : clamp(1 - dist / 1200, 0.15, 0.6);

          return (
            <path
              key={`edge-${i}`}
              className="graph-edge"
              d={curvedEdgePath(src.x, src.y, tgt.x, tgt.y, isMutual ? 0.12 : 0.06)}
              fill="none"
              stroke={hovered ? PALETTE.edgeActive : isMutual ? PALETTE.edgeMutual : PALETTE.edge}
              strokeWidth={hovered ? 1.5 : isMutual ? 1.2 : 0.8}
              opacity={opacity}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const hovered = hoveredNode === node.id;
          const selected = selectedNodes.has(node.id);
          const deg = degrees.get(node.id) || 0;
          const isMutual = !node.isSeed && deg >= 2;
          const isSearchHit = searchMatches.has(node.id);

          return (
            <g
              key={node.id}
              className="graph-node"
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={(e) => {
                e.stopPropagation();
                dragStartPos.current = { x: e.clientX, y: e.clientY };
                setDragNode(node.id);
                node.vx = 0; node.vy = 0;
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => { if (!dragNode) setHoveredNode(null); }}
              filter={hovered ? 'url(#node-shadow-hover)' : 'url(#node-shadow)'}
            >
              {/* Search pulse ring */}
              {isSearchHit && (
                <circle
                  className="search-ring"
                  r={node.radius + 8}
                  fill="none"
                  stroke={PALETTE.searchHit}
                  strokeWidth={2}
                />
              )}

              {/* Selection glow */}
              {selected && (
                <circle r={node.radius + 6} fill="none" stroke={PALETTE.ringSelected} strokeWidth={2} opacity={0.35} />
              )}

              {/* Border ring */}
              <circle
                r={node.radius + 2}
                fill="white"
                stroke={getRingColor(node, hovered, selected, isSearchHit)}
                strokeWidth={getRingWidth(node, hovered, selected, isSearchHit)}
              />

              {/* Avatar */}
              <image
                href={node.avatar}
                x={-node.radius} y={-node.radius}
                width={node.radius * 2} height={node.radius * 2}
                clipPath={`url(#clip-${node.id})`}
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Loading spinner */}
              {node.isLoading && (
                <circle
                  className="loading-ring"
                  r={node.radius + 5}
                  fill="none" stroke={PALETTE.ringLoading}
                  strokeWidth={2}
                  strokeDasharray={`${node.radius * 2} ${node.radius * 4}`}
                  strokeLinecap="round"
                />
              )}

              {/* Connection count badge */}
              {isMutual && !hovered && (
                <g>
                  <circle cx={node.radius * 0.7} cy={-node.radius * 0.7} r={7}
                    fill={PALETTE.ringMutual} stroke="white" strokeWidth={1.5} />
                  <text x={node.radius * 0.7} y={-node.radius * 0.7 + 3.5}
                    textAnchor="middle" fill="white" fontSize={8} fontWeight={700}>{deg}</text>
                </g>
              )}

              {/* Expanded dot */}
              {node.isExpanded && !node.isSeed && !isMutual && (
                <circle cx={node.radius * 0.7} cy={-node.radius * 0.7} r={3}
                  fill={PALETTE.ringExpanded} stroke="white" strokeWidth={1} />
              )}

              {/* Always-visible label */}
              <text
                y={node.radius + 14}
                textAnchor="middle"
                fill={hovered ? PALETTE.label : PALETTE.labelMuted}
                fontSize={node.isSeed ? 11 : 9}
                fontWeight={node.isSeed || hovered || isMutual ? 600 : 400}
                style={{ pointerEvents: 'none' }}
              >
                {node.id.length > 14 ? node.id.slice(0, 12) + '…' : node.id}
              </text>

              {/* Follower count for routers / hovered */}
              {(isMutual || hovered) && !node.isSeed && node.user && (
                <text
                  y={node.radius + 24}
                  textAnchor="middle"
                  fill={PALETTE.labelMuted}
                  fontSize={8}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.user.followers.toLocaleString()} followers
                </text>
              )}

              {/* Hover tooltip card */}
              {hovered && !node.isSeed && node.user && (
                <g transform={`translate(0, ${node.radius + (isMutual ? 32 : 20)})`}>
                  <rect
                    x={-90} y={0}
                    width={180}
                    height={node.user.bio ? 58 : 38}
                    rx={6}
                    fill={PALETTE.labelBg}
                    stroke="#e0e0e0"
                    strokeWidth={0.5}
                  />
                  <text x={0} y={14} textAnchor="middle" fill={PALETTE.label} fontSize={10} fontWeight={600}>
                    {node.user.name || node.id}
                  </text>
                  <text x={0} y={26} textAnchor="middle" fill={PALETTE.labelMuted} fontSize={8.5}>
                    {node.user.followers.toLocaleString()} followers · {node.user.publicRepos} repos · {deg} links
                  </text>
                  {node.user.bio && (
                    <text x={0} y={40} textAnchor="middle" fill="#aaa" fontSize={8}>
                      {node.user.bio.length > 40 ? node.user.bio.slice(0, 38) + '…' : node.user.bio}
                    </text>
                  )}
                  {!node.isExpanded && !node.isLoading && (
                    <text x={0} y={node.user.bio ? 52 : 36} textAnchor="middle" fill="#bbb" fontSize={7.5} fontStyle="italic">
                      click to explore network
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
