'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

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

const COLORS = {
  seed: '#111',
  ggProfile: '#34a853',
  noProfile: '#ddd',
  edge: '#e0e0e0',
  edgeHover: '#bbb',
  mutualEdge: '#f5a623',
  label: '#111',
  labelBg: 'rgba(255,255,255,0.95)',
  expandedRing: '#111',
  loadingRing: '#4285f4',
  mutualRing: '#f5a623',
  selectedRing: '#4285f4',
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// Count edges per node
function getDegreeCounts(edges: GraphEdge[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of edges) {
    counts.set(e.source, (counts.get(e.source) || 0) + 1);
    counts.set(e.target, (counts.get(e.target) || 0) + 1);
  }
  return counts;
}

export function NetworkGraph({ users, seed, onExpandNode, onSelectionChange }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [hideLeaves, setHideLeaves] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const iterationRef = useRef(0);
  const initializedForRef = useRef<string>('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickNodeRef = useRef<string | null>(null);
  // viewBox as ref for perf — updated via direct DOM manipulation
  const viewBoxRef = useRef({ x: 0, y: 0, w: 800, h: 600 });
  const isPanningRef = useRef(false);
  // Force re-render only when graph structure changes (add/remove nodes)
  const [structureVersion, setStructureVersion] = useState(0);

  // Sync selection changes to parent
  useEffect(() => {
    onSelectionChange?.(selectedNodes);
  }, [selectedNodes, onSelectionChange]);

  // Build graph data when users/seed change (initial load only)
  useEffect(() => {
    const dataKey = `${seed}:${users.map(u => u.username).join(',')}`;
    if (initializedForRef.current === dataKey) return;
    initializedForRef.current = dataKey;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    nodes.push({
      id: seed,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: 30,
      color: COLORS.seed,
      isSeed: true,
      isExpanded: true,
      isLoading: false,
      avatar: `https://github.com/${seed}.png?size=96`,
      user: null,
      hidden: false,
    });

    const angleStep = (2 * Math.PI) / Math.max(users.length, 1);
    const spreadRadius = Math.min(dimensions.width, dimensions.height) * 0.4;

    users.forEach((u, i) => {
      const angle = angleStep * i;
      const r = Math.max(14, Math.log(u.followers + 1) * 5.5);
      nodes.push({
        id: u.username,
        x: cx + Math.cos(angle) * spreadRadius + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * spreadRadius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: r,
        color: u.hasGGProfile ? COLORS.ggProfile : COLORS.noProfile,
        isSeed: false,
        isExpanded: false,
        isLoading: false,
        avatar: u.avatar,
        user: u,
        hidden: false,
      });
      edges.push({ source: seed, target: u.username });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterationRef.current = 0;
    viewBoxRef.current = { x: 0, y: 0, w: dimensions.width, h: dimensions.height };
    setStructureVersion(v => v + 1);
  }, [users, seed, dimensions]);

  // Add new nodes incrementally (for expand)
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
        const edgeExists = edges.some(
          e => (e.source === parentId && e.target === u.username) ||
               (e.source === u.username && e.target === parentId)
        );
        if (!edgeExists) {
          edges.push({ source: parentId, target: u.username });
        }
        return;
      }

      const angle = angleStep * i;
      const spread = 160 + Math.random() * 60;
      const r = Math.max(14, Math.log(u.followers + 1) * 5.5);

      nodes.push({
        id: u.username,
        x: parent.x + Math.cos(angle) * spread,
        y: parent.y + Math.sin(angle) * spread,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: r,
        color: u.hasGGProfile ? COLORS.ggProfile : COLORS.noProfile,
        isSeed: false,
        isExpanded: false,
        isLoading: false,
        avatar: u.avatar,
        user: u,
        hidden: false,
      });

      edges.push({ source: parentId, target: u.username });
      added++;
    });

    parent.isExpanded = true;
    parent.isLoading = false;

    if (added > 0) {
      iterationRef.current = Math.max(0, iterationRef.current - 80);
    }

    setStructureVersion(v => v + 1);
  }, []);

  // Handle node expand (single click)
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

  // Toggle selection (shift-click)
  const toggleSelection = useCallback((nodeId: string) => {
    setSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Apply hide-leaves filter
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

  // Force simulation — pure math, no React state changes
  const simulate = useCallback(() => {
    const allNodes = nodesRef.current;
    const edges = edgesRef.current;
    // Only simulate visible nodes
    const nodes = allNodes.filter(n => !n.hidden);
    if (nodes.length === 0) return;

    const iteration = iterationRef.current;
    const n = nodes.length;
    const alpha = Math.max(0.01, 1 - iteration * 0.004);

    const repulsionStrength = (3000 + n * 80) * alpha;
    const springStrength = 0.012;
    const springLength = 150 + Math.sqrt(n) * 12;
    const damping = 0.82;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = nodes[i].radius + nodes[j].radius + 16;
        const effectiveDist = Math.max(dist, minDist * 0.5);
        const force = repulsionStrength / (effectiveDist * effectiveDist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Hard collision
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const minDist = nodes[i].radius + nodes[j].radius + 8;
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          if (nodes[i].id !== dragNode) {
            nodes[i].x -= nx * overlap;
            nodes[i].y -= ny * overlap;
          }
          if (nodes[j].id !== dragNode) {
            nodes[j].x += nx * overlap;
            nodes[j].y += ny * overlap;
          }
        }
      }
    }

    // Springs (only for edges where both nodes are visible)
    const visibleIds = new Set(nodes.map(n => n.id));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const edge of edges) {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - springLength;
      const force = springStrength * displacement;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      const dx = cx - node.x;
      const dy = cy - node.y;
      node.vx += dx * 0.0005 * alpha;
      node.vy += dy * 0.0005 * alpha;
    }

    // Velocity
    for (const node of nodes) {
      if (node.id === dragNode) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }

    // Pin seed softly
    const seedNode = allNodes[0];
    if (seedNode && seedNode.isSeed && seedNode.id !== dragNode) {
      seedNode.x += (cx - seedNode.x) * 0.02;
      seedNode.y += (cy - seedNode.y) * 0.02;
    }

    // Auto-fit viewBox (every 10 frames, only if not panning/dragging)
    if (iteration % 10 === 0 && !isPanningRef.current && !dragNode) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const node of nodes) {
        minX = Math.min(minX, node.x - node.radius - 50);
        minY = Math.min(minY, node.y - node.radius - 50);
        maxX = Math.max(maxX, node.x + node.radius + 50);
        maxY = Math.max(maxY, node.y + node.radius + 50);
      }
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const aspect = dimensions.width / dimensions.height;
      let fitW = contentW;
      let fitH = contentH;
      if (fitW / fitH > aspect) {
        fitH = fitW / aspect;
      } else {
        fitW = fitH * aspect;
      }
      const targetW = Math.max(fitW, dimensions.width);
      const targetH = Math.max(fitH, dimensions.height);
      const targetX = (minX + maxX) / 2 - targetW / 2;
      const targetY = (minY + maxY) / 2 - targetH / 2;

      const vb = viewBoxRef.current;
      viewBoxRef.current = {
        x: vb.x + (targetX - vb.x) * 0.06,
        y: vb.y + (targetY - vb.y) * 0.06,
        w: vb.w + (targetW - vb.w) * 0.06,
        h: vb.h + (targetH - vb.h) * 0.06,
      };
    }

    iterationRef.current++;
  }, [dimensions, dragNode]);

  // Animation loop — pure DOM manipulation, no React re-renders
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      simulate();

      const svg = svgRef.current;
      if (svg) {
        // Update viewBox directly on SVG element
        const vb = viewBoxRef.current;
        svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        const edgeEls = svg.querySelectorAll('.graph-edge');
        edgeEls.forEach((el, i) => {
          const edge = edges[i];
          if (!edge) return;
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt || src.hidden || tgt.hidden) {
            el.setAttribute('visibility', 'hidden');
            return;
          }
          el.setAttribute('visibility', 'visible');
          el.setAttribute('x1', String(src.x));
          el.setAttribute('y1', String(src.y));
          el.setAttribute('x2', String(tgt.x));
          el.setAttribute('y2', String(tgt.y));
        });

        const nodeEls = svg.querySelectorAll('.graph-node');
        nodeEls.forEach((el, i) => {
          const node = nodes[i];
          if (!node) return;
          if (node.hidden) {
            (el as HTMLElement).style.display = 'none';
            return;
          }
          (el as HTMLElement).style.display = '';
          el.setAttribute('transform', `translate(${node.x},${node.y})`);
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [simulate]);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Mouse handlers
  const getSvgPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
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
      const dx = svgPt.x - node.x;
      const dy = svgPt.y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 4) {
        setDragNode(node.id);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        node.vx = 0;
        node.vy = 0;
        e.preventDefault();
        return;
      }
    }

    // Pan
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
      if (node) {
        node.x = svgPt.x;
        node.y = svgPt.y;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }

    if (isPanning) {
      const vb = viewBoxRef.current;
      const scale = vb.w / dimensions.width;
      const dx = (e.clientX - panStart.current.x) * scale;
      const dy = (e.clientY - panStart.current.y) * scale;
      viewBoxRef.current = {
        ...vb,
        x: panStart.current.vx - dx,
        y: panStart.current.vy - dy,
      };
      return;
    }

    // Hover
    const svgPt = getSvgPoint(e);
    if (!svgPt) return;
    let found: string | null = null;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.hidden) continue;
      const dx = svgPt.x - node.x;
      const dy = svgPt.y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 4) {
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
  }, [dragNode, isPanning, dimensions, getSvgPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragNode) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const moved = Math.sqrt(dx * dx + dy * dy);

      if (moved < 5) {
        const nodeId = dragNode;

        // Shift-click = select for analysis
        if (e.shiftKey) {
          toggleSelection(nodeId);
          setDragNode(null);
          setIsPanning(false);
          isPanningRef.current = false;
          return;
        }

        if (clickTimerRef.current && lastClickNodeRef.current === nodeId) {
          // Double click — open GitHub profile
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
          lastClickNodeRef.current = null;
          window.open(`https://github.com/${nodeId}`, '_blank');
        } else {
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
          lastClickNodeRef.current = nodeId;
          clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            lastClickNodeRef.current = null;
            handleExpand(nodeId);
          }, 250);
        }
      }
    }

    setDragNode(null);
    setIsPanning(false);
    isPanningRef.current = false;
  }, [dragNode, handleExpand, toggleSelection]);

  const handleMouseLeave = useCallback(() => {
    setDragNode(null);
    setIsPanning(false);
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svgPt = getSvgPoint(e);
    if (!svgPt) return;

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const vb = viewBoxRef.current;
    const newW = clamp(vb.w * zoomFactor, 200, dimensions.width * 10);
    const newH = clamp(vb.h * zoomFactor, 125, dimensions.height * 10);
    const mouseRatioX = (svgPt.x - vb.x) / vb.w;
    const mouseRatioY = (svgPt.y - vb.y) / vb.h;
    viewBoxRef.current = {
      x: svgPt.x - mouseRatioX * newW,
      y: svgPt.y - mouseRatioY * newH,
      w: newW,
      h: newH,
    };
  }, [dimensions, getSvgPoint]);

  // Compute degree counts for rendering (mutual detection)
  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  const degrees = getDegreeCounts(edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const mutualCount = nodes.filter(n => !n.isSeed && !n.hidden && (degrees.get(n.id) || 0) >= 2).length;
  const totalVisible = nodes.filter(n => !n.hidden).length;

  // Ring color logic
  const getRingColor = (node: GraphNode, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return COLORS.selectedRing;
    if (node.isSeed) return COLORS.seed;
    if (isHovered) return '#111';
    const deg = degrees.get(node.id) || 0;
    if (deg >= 2) return COLORS.mutualRing; // social router
    if (node.isExpanded) return COLORS.expandedRing;
    if (node.color === COLORS.ggProfile) return COLORS.ggProfile;
    return '#ccc';
  };

  const getRingWidth = (node: GraphNode, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return 3;
    if (isHovered || node.isSeed) return 2.5;
    const deg = degrees.get(node.id) || 0;
    if (deg >= 2) return 2.5;
    if (node.isExpanded) return 2;
    return 1.5;
  };

  const vb = viewBoxRef.current;

  return (
    <div
      ref={containerRef}
      className="w-full border border-[#eee] rounded bg-white relative"
      style={{ height: 600 }}
    >
      {/* Top bar: legend + controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex gap-3 text-xs text-[#888] bg-white/90 px-2 py-1 rounded">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#111]" />
            Seed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-[#f5a623] bg-white" />
            Router ({mutualCount})
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#34a853]" />
            GG Profile
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ddd] border border-[#ccc]" />
            Unscanned
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setHideLeaves(!hideLeaves)}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              hideLeaves
                ? 'bg-[#111] text-white'
                : 'bg-white/90 text-[#888] border border-[#ddd] hover:text-[#111]'
            }`}
          >
            {hideLeaves ? `Routers only (${totalVisible})` : 'Show routers only'}
          </button>
          {selectedNodes.size > 0 && (
            <button
              onClick={() => setSelectedNodes(new Set())}
              className="px-2.5 py-1 text-xs text-[#888] bg-white/90 border border-[#ddd] rounded hover:text-[#111] transition-colors"
            >
              Clear {selectedNodes.size} selected
            </button>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-[#bbb] z-10">
        Click to expand · Shift-click to select · Double-click for GitHub · Scroll to zoom
      </div>

      {selectedNodes.size > 0 && (
        <div className="absolute bottom-3 left-3 text-xs text-[#666] z-10 bg-white/90 px-2 py-1 rounded border border-[#eee]">
          {selectedNodes.size} selected for analysis
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: dragNode ? 'grabbing' : isPanning ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
      >
        <defs>
          {nodes.map((node) => (
            <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
              <circle r={node.radius} cx={0} cy={0} />
            </clipPath>
          ))}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            .loading-ring { animation: spin 1.2s linear infinite; transform-origin: center; }
          `}</style>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;
          const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
          // Mutual edge: both ends have degree >= 2
          const isMutualEdge = (degrees.get(edge.source) || 0) >= 2 && (degrees.get(edge.target) || 0) >= 2;
          return (
            <line
              key={`edge-${i}`}
              className="graph-edge"
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={isHovered ? COLORS.edgeHover : isMutualEdge ? COLORS.mutualEdge : COLORS.edge}
              strokeWidth={isHovered ? 1.5 : isMutualEdge ? 1.2 : 0.8}
              opacity={isMutualEdge ? 0.6 : 1}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNodes.has(node.id);
          const deg = degrees.get(node.id) || 0;
          const isMutual = !node.isSeed && deg >= 2;

          return (
            <g
              key={node.id}
              className="graph-node"
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={(e) => {
                e.stopPropagation();
                dragStartPos.current = { x: e.clientX, y: e.clientY };
                setDragNode(node.id);
                node.vx = 0;
                node.vy = 0;
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => { if (!dragNode) setHoveredNode(null); }}
            >
              {/* Selection glow */}
              {isSelected && (
                <circle
                  r={node.radius + 5}
                  fill="none"
                  stroke={COLORS.selectedRing}
                  strokeWidth={2}
                  opacity={0.4}
                />
              )}

              {/* Border ring */}
              <circle
                r={node.radius + 2}
                fill="none"
                stroke={getRingColor(node, isHovered, isSelected)}
                strokeWidth={getRingWidth(node, isHovered, isSelected)}
                opacity={node.color === COLORS.noProfile && !isHovered && !isMutual && !isSelected ? 0.6 : 1}
              />

              {/* Avatar */}
              <image
                href={node.avatar}
                x={-node.radius}
                y={-node.radius}
                width={node.radius * 2}
                height={node.radius * 2}
                clipPath={`url(#clip-${node.id})`}
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Loading spinner */}
              {node.isLoading && (
                <circle
                  className="loading-ring"
                  r={node.radius + 5}
                  fill="none"
                  stroke={COLORS.loadingRing}
                  strokeWidth={2}
                  strokeDasharray={`${node.radius * 2} ${node.radius * 4}`}
                  strokeLinecap="round"
                />
              )}

              {/* Mutual badge (connection count) */}
              {isMutual && !isHovered && (
                <g>
                  <circle
                    cx={node.radius * 0.7}
                    cy={-node.radius * 0.7}
                    r={6}
                    fill={COLORS.mutualRing}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <text
                    x={node.radius * 0.7}
                    y={-node.radius * 0.7 + 3.5}
                    textAnchor="middle"
                    fill="white"
                    fontSize={8}
                    fontWeight={700}
                  >
                    {deg}
                  </text>
                </g>
              )}

              {/* Expanded indicator (non-mutual) */}
              {node.isExpanded && !node.isSeed && !isMutual && (
                <circle
                  cx={node.radius * 0.7}
                  cy={-node.radius * 0.7}
                  r={3}
                  fill={COLORS.expandedRing}
                  stroke="white"
                  strokeWidth={1}
                />
              )}

              {/* Seed label */}
              {node.isSeed && (
                <text
                  y={node.radius + 16}
                  textAnchor="middle"
                  fill={COLORS.label}
                  fontSize={11}
                  fontWeight={600}
                >
                  @{node.id}
                </text>
              )}

              {/* Hover tooltip */}
              {isHovered && !node.isSeed && (
                <>
                  <rect
                    x={-60}
                    y={node.radius + 5}
                    width={120}
                    height={isMutual ? 44 : node.isExpanded ? 32 : 44}
                    rx={4}
                    fill={COLORS.labelBg}
                    stroke="#eee"
                    strokeWidth={0.5}
                  />
                  <text
                    y={node.radius + 19}
                    textAnchor="middle"
                    fill={COLORS.label}
                    fontSize={10}
                    fontWeight={600}
                  >
                    @{node.id}
                  </text>
                  <text
                    y={node.radius + 31}
                    textAnchor="middle"
                    fill="#888"
                    fontSize={9}
                  >
                    {(node.user?.followers ?? 0).toLocaleString()} followers · {deg} connections
                  </text>
                  {isMutual && (
                    <text
                      y={node.radius + 43}
                      textAnchor="middle"
                      fill={COLORS.mutualRing}
                      fontSize={8}
                      fontWeight={600}
                    >
                      social router
                    </text>
                  )}
                  {!node.isExpanded && !node.isLoading && !isMutual && (
                    <text
                      y={node.radius + 43}
                      textAnchor="middle"
                      fill="#aaa"
                      fontSize={8}
                      fontStyle="italic"
                    >
                      click to explore
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
