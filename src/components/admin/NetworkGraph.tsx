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
  isFollower?: boolean;
  isFollowing?: boolean;
  isMutual?: boolean;
  similarity?: number;
  archetype?: string | null;
  score?: number | null;
  topSkills?: string[];
}

export type EdgeType = 'social' | 'semantic';

export interface EdgeFilter {
  following: boolean;
  followers: boolean;
  semantic: boolean;
}

export interface NetworkGraphProps {
  users: NetworkUser[];
  seed: string;
  semanticUsers?: NetworkUser[];
  edgeFilter?: EdgeFilter;
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

export type EdgeDirection = 'following' | 'follower' | 'mutual' | null;

interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  similarity?: number;
  direction?: EdgeDirection;
}

const PALETTE = {
  seed: '#111',
  ggProfile: '#22863a',
  noProfile: '#c8c8c8',
  edge: '#e8e8e8',
  edgeActive: '#bbb',
  edgeMutual: '#e8a838',
  edgeSemantic: '#8b5cf6',
  edgeSemanticActive: '#7c3aed',
  label: '#333',
  labelMuted: '#999',
  labelBg: 'rgba(255,255,255,0.96)',
  ring: '#ddd',
  ringExpanded: '#111',
  ringMutual: '#e8a838',
  ringSemantic: '#8b5cf6',
  ringSelected: '#3b82f6',
  ringLoading: '#3b82f6',
  searchHit: '#ef4444',
  bg: '#fafafa',
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

const getNodeRadius = (followers: number, isSeed: boolean): number => {
  if (isSeed) return 35;
  const MIN = 8;
  const MAX = 32;
  if (followers <= 0) return MIN;
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

// --- QuadTree for Barnes-Hut and Hit Testing ---
class QuadTree {
  bounds: { x: number, y: number, w: number, h: number };
  mass: number = 0;
  cx: number = 0;
  cy: number = 0;
  node: GraphNode | null = null;
  children: QuadTree[] | null = null;

  constructor(bounds: { x: number, y: number, w: number, h: number }) {
    this.bounds = bounds;
  }

  insert(node: GraphNode): boolean {
    if (!this.contains(node.x, node.y)) return false;

    if (this.children === null && this.node === null) {
      this.node = node;
      this.mass = 1;
      this.cx = node.x;
      this.cy = node.y;
      return true;
    }

    if (this.children === null) {
      this.subdivide();
      const existing = this.node!;
      this.node = null;
      this.insertIntoChildren(existing);
    }

    this.insertIntoChildren(node);

    const totalMass = this.mass + 1;
    this.cx = (this.cx * this.mass + node.x) / totalMass;
    this.cy = (this.cy * this.mass + node.y) / totalMass;
    this.mass = totalMass;

    return true;
  }

  subdivide() {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    this.children = [
      new QuadTree({ x, y, w: hw, h: hh }),
      new QuadTree({ x: x + hw, y, w: hw, h: hh }),
      new QuadTree({ x, y: y + hh, w: hw, h: hh }),
      new QuadTree({ x: x + hw, y: y + hh, w: hw, h: hh })
    ];
  }

  insertIntoChildren(node: GraphNode) {
    if (!this.children) return;
    for (let i = 0; i < 4; i++) {
      if (this.children[i].insert(node)) break;
    }
  }

  contains(x: number, y: number) {
    const { x: bx, y: by, w, h } = this.bounds;
    return x >= bx && x <= bx + w && y >= by && y <= by + h;
  }

  intersects(x: number, y: number, w: number, h: number) {
    const { x: bx, y: by, w: bw, h: bh } = this.bounds;
    return !(x > bx + bw || x + w < bx || y > by + bh || y + h < by);
  }
}

function applyBarnesHut(node: GraphNode, qt: QuadTree, theta: number, repulsion: number) {
  if (qt.mass === 0) return;
  const dx = qt.cx - node.x;
  const dy = qt.cy - node.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq) || 1;

  if (qt.children === null || (qt.bounds.w / dist) < theta) {
    if (qt.node !== node) {
      const minD = node.radius + (qt.node ? qt.node.radius : 10) + 20;
      const eff = Math.max(dist, minD * 0.4);
      const f = (repulsion * qt.mass) / (eff * eff);
      node.vx -= (dx / dist) * f;
      node.vy -= (dy / dist) * f;
    }
  } else {
    for (let i = 0; i < 4; i++) {
      applyBarnesHut(node, qt.children[i], theta, repulsion);
    }
  }
}

function hitTestQuadTree(qt: QuadTree, x: number, y: number, padding: number): GraphNode | null {
  if (!qt.intersects(x - padding, y - padding, padding * 2, padding * 2)) return null;
  if (qt.node) {
    const dx = qt.node.x - x;
    const dy = qt.node.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= qt.node.radius + padding) return qt.node;
  }
  if (qt.children) {
    for (let i = 0; i < 4; i++) {
      const found = hitTestQuadTree(qt.children[i], x, y, padding);
      if (found) return found;
    }
  }
  return null;
}

// --- Image Cache ---
const imageCache = new Map<string, HTMLImageElement | ImageBitmap>();
function getCachedImage(url: string): HTMLImageElement | ImageBitmap | null {
  if (imageCache.has(url)) return imageCache.get(url)!;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  imageCache.set(url, img);
  img.onload = async () => {
    try {
      const bmp = await createImageBitmap(img);
      imageCache.set(url, bmp);
    } catch (e) {
      // fallback to img
    }
  };
  return null;
}

export function NetworkGraph({ users, seed, semanticUsers, edgeFilter, onExpandNode, onSelectionChange }: NetworkGraphProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [maxDepth, setMaxDepth] = useState<number>(Infinity);
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
  const quadTreeRef = useRef<QuadTree | null>(null);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(
      nodesRef.current
        .filter(n => n.id.toLowerCase().includes(q) || n.user?.name?.toLowerCase().includes(q))
        .map(n => n.id)
    );
  }, [searchQuery, structureVersion]);

  useEffect(() => {
    onSelectionChange?.(selectedNodes);
  }, [selectedNodes, onSelectionChange]);

  useEffect(() => {
    const semKey = semanticUsers?.map(u => u.username).join(',') || '';
    const dataKey = `${seed}:${users.map(u => u.username).join(',')}:${semKey}`;
    if (initializedForRef.current === dataKey) return;
    initializedForRef.current = dataKey;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const existingIds = new Set<string>();

    nodes.push({
      id: seed, x: cx, y: cy, vx: 0, vy: 0,
      radius: getNodeRadius(0, true), color: PALETTE.seed, isSeed: true,
      isExpanded: true, isLoading: false,
      avatar: `https://github.com/${seed}.png?size=128`,
      user: null, hidden: false,
    });
    existingIds.add(seed);

    const angleStep = (2 * Math.PI) / Math.max(users.length, 1);
    const spread = Math.min(dimensions.width, dimensions.height) * 0.38;

    users.forEach((u, i) => {
      const angle = angleStep * i - Math.PI / 2;
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
      existingIds.add(u.username);
      const dir: EdgeDirection = u.isMutual ? 'mutual' : u.isFollowing ? 'following' : u.isFollower ? 'follower' : null;
      edges.push({ source: seed, target: u.username, type: 'social', direction: dir });
    });

    if (semanticUsers?.length) {
      const semAngleStep = (2 * Math.PI) / Math.max(semanticUsers.length, 1);
      const semSpread = spread * 1.6;

      semanticUsers.forEach((u, i) => {
        if (existingIds.has(u.username)) {
          edges.push({ source: seed, target: u.username, type: 'semantic', similarity: u.similarity });
          return;
        }
        const angle = semAngleStep * i - Math.PI / 4;
        const r = getNodeRadius(u.followers, false);
        const jitter = (Math.random() - 0.5) * 30;
        nodes.push({
          id: u.username,
          x: cx + Math.cos(angle) * (semSpread + jitter),
          y: cy + Math.sin(angle) * (semSpread + jitter),
          vx: 0, vy: 0, radius: r,
          color: PALETTE.ggProfile,
          isSeed: false, isExpanded: false, isLoading: false,
          avatar: u.avatar, user: u, hidden: false,
        });
        existingIds.add(u.username);
        edges.push({ source: seed, target: u.username, type: 'semantic', similarity: u.similarity });
      });
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterationRef.current = 0;
    viewBoxRef.current = { x: 0, y: 0, w: dimensions.width, h: dimensions.height };
    setStructureVersion(v => v + 1);
  }, [users, seed, semanticUsers, dimensions]);

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
          edges.push({ source: parentId, target: u.username, type: 'social' });
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
      edges.push({ source: parentId, target: u.username, type: 'social' });
      added++;
    });

    parent.isExpanded = true;
    parent.isLoading = false;

    if (added > 0) {
      iterationRef.current = Math.max(0, iterationRef.current - 100);
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
  }, [dimensions]);

  const panToNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    const vb = viewBoxRef.current;
    viewBoxRef.current = {
      x: node.x - vb.w / 2,
      y: node.y - vb.h / 2,
      w: vb.w,
      h: vb.h,
    };
    autoFitEnabledRef.current = false;
  }, []);

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
  }, [hideLeaves, structureVersion]);

  const nodeDepths = useMemo(() => {
    const depths = new Map<string, number>();
    depths.set(seed, 0);
    const queue = [seed];
    const adj = new Map<string, string[]>();
    for (const e of edgesRef.current) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source);
    }
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const d = depths.get(cur)!;
      for (const neighbor of adj.get(cur) || []) {
        if (!depths.has(neighbor)) {
          depths.set(neighbor, d + 1);
          queue.push(neighbor);
        }
      }
    }
    return depths;
  }, [edgesRef.current, seed, structureVersion]);

  const currentMaxDepth = useMemo(() => {
    let max = 0;
    for (const d of nodeDepths.values()) if (d !== Infinity) max = Math.max(max, d);
    return max;
  }, [nodeDepths]);

  const nodesWithVisibleEdges = useMemo(() => {
    const set = new Set<string>();
    for (const edge of edgesRef.current) {
      let visible = true;
      if (edgeFilter) {
        const dir = edge.direction;
        if (edge.type === 'semantic' && !edgeFilter.semantic) visible = false;
        if (edge.type === 'social') {
          if (dir === 'following' && !edgeFilter.following) visible = false;
          if (dir === 'follower' && !edgeFilter.followers) visible = false;
          if (dir === 'mutual' && !edgeFilter.following && !edgeFilter.followers) visible = false;
        }
      }
      if (visible) {
        set.add(edge.source);
        set.add(edge.target);
      }
    }
    return set;
  }, [edgesRef.current, edgeFilter, structureVersion]);

  const isNodeFilteredOut = useCallback((node: GraphNode): boolean => {
    if (node.isSeed) return false;
    const depth = nodeDepths.get(node.id) ?? Infinity;
    if (depth > maxDepth) return true;
    if (edgeFilter && !nodesWithVisibleEdges.has(node.id)) return true;
    return false;
  }, [nodeDepths, maxDepth, edgeFilter, nodesWithVisibleEdges]);

  const simulate = useCallback(() => {
    const allNodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodes = allNodes.filter(n => !n.hidden && !isNodeFilteredOut(n));
    if (nodes.length === 0) return;

    const iteration = iterationRef.current;
    const n = nodes.length;
    const alpha = Math.max(0.02, 1 - iteration * 0.005);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x > maxX) maxX = node.x;
      if (node.y > maxY) maxY = node.y;
    }
    const pad = 100;
    const qt = new QuadTree({ x: minX - pad, y: minY - pad, w: (maxX - minX) + pad * 2, h: (maxY - minY) + pad * 2 });
    for (const node of nodes) qt.insert(node);
    quadTreeRef.current = qt;

    const repulsion = (4000 + n * 100) * alpha;
    const springK = 0.01;
    const springLen = 160 + Math.sqrt(n) * 14;
    const damping = 0.82;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    for (const node of nodes) {
      applyBarnesHut(node, qt, 0.9, repulsion);
    }

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

    const visibleIds = new Set(nodes.map(n => n.id));
    const nMap = new Map(nodes.map(n => [n.id, n]));
    for (const edge of edges) {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
      const src = nMap.get(edge.source);
      const tgt = nMap.get(edge.target);
      if (!src || !tgt) continue;

      let edgeSpringLen = springLen;
      let edgeSpringK = springK;
      if (edge.type === 'semantic') {
        const sim = (edge.similarity ?? 50) / 100;
        edgeSpringLen = springLen * (1 - sim * 0.6);
        edgeSpringK = springK * 0.6;
      }

      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const disp = dist - edgeSpringLen;
      const f = edgeSpringK * disp;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      src.vx += fx; src.vy += fy;
      tgt.vx -= fx; tgt.vy -= fy;
    }

    for (const node of nodes) {
      node.vx += (cx - node.x) * 0.0004 * alpha;
      node.vy += (cy - node.y) * 0.0004 * alpha;
    }

    for (const node of nodes) {
      if (node.id === dragNode) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }

    const seedNode = allNodes[0];
    if (seedNode?.isSeed && seedNode.id !== dragNode) {
      seedNode.x += (cx - seedNode.x) * 0.015;
      seedNode.y += (cy - seedNode.y) * 0.015;
    }

    if (autoFitEnabledRef.current && iteration % 3 === 0 && !isPanningRef.current && !dragNode) {
      let fMinX = Infinity, fMinY = Infinity, fMaxX = -Infinity, fMaxY = -Infinity;
      for (const node of nodes) {
        const pad = node.radius + 70;
        fMinX = Math.min(fMinX, node.x - pad);
        fMinY = Math.min(fMinY, node.y - pad);
        fMaxX = Math.max(fMaxX, node.x + pad);
        fMaxY = Math.max(fMaxY, node.y + pad);
      }
      const cW = fMaxX - fMinX, cH = fMaxY - fMinY;
      const aspect = dimensions.width / dimensions.height;
      let fitW = cW, fitH = cH;
      if (fitW / fitH > aspect) fitH = fitW / aspect;
      else fitW = fitH * aspect;
      const tW = Math.max(fitW, dimensions.width * 0.6);
      const tH = Math.max(fitH, dimensions.height * 0.6);
      const tX = (fMinX + fMaxX) / 2 - tW / 2;
      const tY = (fMinY + fMaxY) / 2 - tH / 2;
      const vb = viewBoxRef.current;
      const t = iteration < 60 ? 0.15 : 0.05;
      viewBoxRef.current = {
        x: vb.x + (tX - vb.x) * t,
        y: vb.y + (tY - vb.y) * t,
        w: vb.w + (tW - vb.w) * t,
        h: vb.h + (tH - vb.h) * t,
      };

      if (iteration >= 120) {
        autoFitEnabledRef.current = false;
      }
    }

    iterationRef.current++;
  }, [dimensions, dragNode, isNodeFilteredOut]);

  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, 4);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const vb = viewBoxRef.current;
    const scaleX = width / vb.w;
    const scaleY = height / vb.h;
    const scale = Math.min(scaleX, scaleY);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-vb.x, -vb.y);

    const isFar = vb.w > 5000;
    const isMedium = vb.w > 1000 && vb.w <= 5000;
    const isClose = vb.w <= 1000;

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const degrees = getDegreeCounts(edges);
    const nMap = new Map(nodes.map(n => [n.id, n]));

    // Draw Edges
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const edge of edges) {
      const src = nMap.get(edge.source);
      const tgt = nMap.get(edge.target);
      if (!src || !tgt || src.hidden || tgt.hidden || isNodeFilteredOut(src) || isNodeFilteredOut(tgt)) continue;

      if (edgeFilter) {
        const dir = edge.direction;
        if (edge.type === 'semantic' && !edgeFilter.semantic) continue;
        if (edge.type === 'social') {
          if (dir === 'following' && !edgeFilter.following) continue;
          if (dir === 'follower' && !edgeFilter.followers) continue;
          if (dir === 'mutual' && !edgeFilter.following && !edgeFilter.followers) continue;
        }
      }

      const hovered = hoveredNode === edge.source || hoveredNode === edge.target;
      const srcDeg = degrees.get(edge.source) || 0;
      const tgtDeg = degrees.get(edge.target) || 0;
      const isMutual = edge.direction === 'mutual' || (srcDeg >= 2 && tgtDeg >= 2);
      const isSemantic = edge.type === 'semantic';
      const dist = Math.sqrt((tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2);
      const opacity = hovered ? 0.7 : isSemantic ? 0.35 : isMutual ? 0.4 : clamp(1 - dist / 1200, 0.15, 0.6);

      const strokeColor = hovered
        ? (isSemantic ? PALETTE.edgeSemanticActive : PALETTE.edgeActive)
        : isSemantic ? PALETTE.edgeSemantic
        : isMutual ? PALETTE.edgeMutual
        : PALETTE.edge;

      ctx.beginPath();
      const curvature = isSemantic ? 0.15 : isMutual ? 0.12 : 0.06;
      const pad = 6;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const startX = src.x + nx * (src.radius + pad);
      const startY = src.y + ny * (src.radius + pad);
      const endX = tgt.x - nx * (tgt.radius + pad);
      const endY = tgt.y - ny * (tgt.radius + pad);
      const mx = (startX + endX) / 2;
      const my = (startY + endY) / 2;
      const edx = endX - startX;
      const edy = endY - startY;
      const cx = mx - edy * curvature;
      const cy = my + edx * curvature;

      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cx, cy, endX, endY);
      
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = hovered ? 1.5 : isSemantic ? 1 : isMutual ? 1.2 : 0.8;
      ctx.globalAlpha = opacity;
      if (isSemantic) ctx.setLineDash([4, 3]);
      else ctx.setLineDash([]);
      ctx.stroke();

      if (!isFar) {
        const drawArr = (x: number, y: number, angle: number) => drawArrow(ctx, x, y, angle, strokeColor);
        if (edge.direction === 'following' || edge.direction === 'mutual' || edge.type === 'social') {
          const t = 1;
          const tx = 2 * (1 - t) * (cx - startX) + 2 * t * (endX - cx);
          const ty = 2 * (1 - t) * (cy - startY) + 2 * t * (endY - cy);
          drawArr(endX, endY, Math.atan2(ty, tx));
        }
        if (edge.direction === 'follower' || edge.direction === 'mutual') {
          const t = 0;
          const tx = 2 * (1 - t) * (cx - startX) + 2 * t * (endX - cx);
          const ty = 2 * (1 - t) * (cy - startY) + 2 * t * (endY - cy);
          drawArr(startX, startY, Math.atan2(ty, tx) + Math.PI);
        }
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw Nodes
    for (const node of nodes) {
      if (node.hidden || isNodeFilteredOut(node)) continue;
      const hovered = hoveredNode === node.id;
      const selected = selectedNodes.has(node.id);
      const deg = degrees.get(node.id) || 0;
      const isMutual = !node.isSeed && deg >= 2;
      const isSearchHit = searchMatches.has(node.id);

      ctx.save();
      ctx.translate(node.x, node.y);

      if (isSearchHit) {
        ctx.beginPath();
        ctx.arc(0, 0, node.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.searchHit;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (selected) {
        ctx.beginPath();
        ctx.arc(0, 0, node.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.ringSelected;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (isFar) {
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        if (isClose || hovered || node.isSeed) {
          if (node.isSeed && node.id.includes('.')) {
            ctx.fillStyle = '#111';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = `800 ${node.radius * 0.7}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GG', 0, 0);
          } else {
            const img = getCachedImage(node.avatar);
            if (img) {
              ctx.save();
              ctx.clip();
              ctx.drawImage(img, -node.radius, -node.radius, node.radius * 2, node.radius * 2);
              ctx.restore();
            }
          }
        }

        let ringColor = PALETTE.ring;
        if (isSearchHit) ringColor = PALETTE.searchHit;
        else if (selected) ringColor = PALETTE.ringSelected;
        else if (node.isSeed) ringColor = PALETTE.seed;
        else if (hovered) ringColor = '#111';
        else if (deg >= 2) ringColor = PALETTE.ringMutual;
        else if (node.isExpanded) ringColor = PALETTE.ringExpanded;
        else if (node.color === PALETTE.ggProfile) ringColor = PALETTE.ggProfile;

        let ringWidth = 1.5;
        if (isSearchHit || selected) ringWidth = 3;
        else if (hovered || node.isSeed) ringWidth = 2.5;
        else if (deg >= 2 || node.isExpanded) ringWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, node.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = ringWidth;
        ctx.stroke();

        if (node.isLoading) {
          ctx.beginPath();
          ctx.arc(0, 0, node.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = PALETTE.ringLoading;
          ctx.lineWidth = 2;
          ctx.setLineDash([node.radius * 2, node.radius * 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isMutual && !hovered) {
          const bx = node.radius * 0.7;
          const by = -node.radius * 0.7;
          ctx.beginPath();
          ctx.arc(bx, by, 7, 0, Math.PI * 2);
          ctx.fillStyle = PALETTE.ringMutual;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.font = '700 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(deg.toString(), bx, by + 1);
        }

        if (node.isExpanded && !node.isSeed && !isMutual) {
          const bx = node.radius * 0.7;
          const by = -node.radius * 0.7;
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = PALETTE.ringExpanded;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (isClose || isMedium && (isMutual || hovered || node.isSeed)) {
          ctx.fillStyle = hovered ? PALETTE.label : PALETTE.labelMuted;
          ctx.font = `${node.isSeed || hovered || isMutual ? 600 : 400} ${node.isSeed ? 11 : 9}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = node.id.length > 14 ? node.id.slice(0, 12) + '…' : node.id;
          ctx.fillText(label, 0, node.radius + 14);

          if ((isMutual || hovered) && !node.isSeed && node.user) {
            ctx.fillStyle = PALETTE.labelMuted;
            ctx.font = '8px sans-serif';
            ctx.fillText(`${node.user.followers.toLocaleString()} followers`, 0, node.radius + 24);
          }
        }
      }
      ctx.restore();
    }

    // Draw Tooltips
    if (hoveredNode) {
      const node = nMap.get(hoveredNode);
      if (node && !node.isSeed && node.user) {
        ctx.save();
        const isMutual = (degrees.get(node.id) || 0) >= 2;
        ctx.translate(node.x, node.y + node.radius + (isMutual ? 32 : 20));

        const hasSimilarity = node.user.similarity != null;
        const hasArchetype = !!node.user.archetype;
        const hasSkills = node.user.topSkills && node.user.topSkills.length > 0;
        const bioText = node.user.bio || (hasSimilarity ? node.user.archetype : null);
        const extraLines = (hasArchetype && hasSimilarity ? 1 : 0) + (hasSkills ? 1 : 0);
        const cardHeight = (bioText ? 58 : 38) + extraLines * 12;

        ctx.fillStyle = PALETTE.labelBg;
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(-90, 0, 180, cardHeight, 6);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = PALETTE.label;
        ctx.font = '600 10px sans-serif';
        ctx.fillText(node.user.name || node.id, 0, 14);

        ctx.fillStyle = PALETTE.labelMuted;
        ctx.font = '8.5px sans-serif';
        const deg = degrees.get(node.id) || 0;
        ctx.fillText(`${node.user.followers.toLocaleString()} followers · ${node.user.publicRepos} repos${hasSimilarity ? ` · ${node.user.similarity}% match` : ` · ${deg} links`}`, 0, 26);

        if (bioText) {
          ctx.fillStyle = '#aaa';
          ctx.font = '8px sans-serif';
          ctx.fillText(bioText.length > 40 ? bioText.slice(0, 38) + '…' : bioText, 0, 40);
        }

        if (hasSkills) {
          ctx.fillStyle = PALETTE.edgeSemantic;
          ctx.font = '7.5px sans-serif';
          ctx.fillText(node.user.topSkills!.slice(0, 3).join(' · '), 0, bioText ? 52 : 40);
        }

        if (!node.isExpanded && !node.isLoading) {
          ctx.fillStyle = '#bbb';
          ctx.font = 'italic 7.5px sans-serif';
          ctx.fillText('click to explore network', 0, cardHeight - 4);
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }, [dimensions, hoveredNode, selectedNodes, searchMatches, edgeFilter, isNodeFilteredOut]);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      simulate();
      render();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [simulate, render]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheelCapture = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener('wheel', handleWheelCapture, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelCapture);
  }, []);

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

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const vb = viewBoxRef.current;
    const scaleX = vb.w / dimensions.width;
    const scaleY = vb.h / dimensions.height;
    return { x: vb.x + x * scaleX, y: vb.y + y * scaleY };
  }, [dimensions]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;
    
    if (quadTreeRef.current) {
      const hit = hitTestQuadTree(quadTreeRef.current, pt.x, pt.y, 6);
      if (hit && !hit.hidden && !isNodeFilteredOut(hit)) {
        setDragNode(hit.id);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        hit.vx = 0; hit.vy = 0;
        return;
      }
    }

    setIsPanning(true);
    isPanningRef.current = true;
    const vb = viewBoxRef.current;
    panStart.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
  }, [getCanvasPoint, isNodeFilteredOut]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNode) {
      const pt = getCanvasPoint(e);
      if (!pt) return;
      const node = nodesRef.current.find(n => n.id === dragNode);
      if (node) { node.x = pt.x; node.y = pt.y; node.vx = 0; node.vy = 0; }
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
    const pt = getCanvasPoint(e);
    if (!pt) return;
    
    if (quadTreeRef.current) {
      const hit = hitTestQuadTree(quadTreeRef.current, pt.x, pt.y, 6);
      setHoveredNode(hit && !hit.hidden && !isNodeFilteredOut(hit) ? hit.id : null);
    } else {
      setHoveredNode(null);
    }
  }, [dragNode, isPanning, dimensions, getCanvasPoint, isNodeFilteredOut]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
  }, [dragNode, handleExpand, toggleSelection, router]);

  const handleMouseLeave = useCallback(() => {
    setDragNode(null); setIsPanning(false); isPanningRef.current = false;
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    lastClickNodeRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCanvasPoint(e);
    if (!pt) return;
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    const vb = viewBoxRef.current;
    const newW = clamp(vb.w * factor, 200, dimensions.width * 12);
    const newH = clamp(vb.h * factor, 140, dimensions.height * 12);
    const rx = (pt.x - vb.x) / vb.w;
    const ry = (pt.y - vb.y) / vb.h;
    viewBoxRef.current = { x: pt.x - rx * newW, y: pt.y - ry * newH, w: newW, h: newH };
    autoFitEnabledRef.current = false;
  }, [dimensions, getCanvasPoint]);

  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  const degrees = getDegreeCounts(edges);

  const totalVisible = nodes.filter(n => !n.hidden && !isNodeFilteredOut(n)).length;
  const totalEdges = edges.length;
  const routerCount = nodes.filter(n => !n.isSeed && !n.hidden && !isNodeFilteredOut(n) && (degrees.get(n.id) || 0) >= 2).length;

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
      className={isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-hidden select-none' : 'w-full rounded-lg bg-white relative overflow-hidden select-none'}
      style={isFullscreen ? { touchAction: 'none' } : { height: '70vh', minHeight: 600, border: '1px solid #eee', touchAction: 'none' }}
    >
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
            {semanticUsers && semanticUsers.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#8b5cf6] rounded" style={{ borderTop: '1px dashed #8b5cf6' }} /> Similar
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#bbb] font-mono">{totalVisible} nodes · {totalEdges} edges · {routerCount} routers</span>
        </div>
        <div className="flex gap-1.5 items-center pointer-events-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="w-32 px-2 py-1 text-[11px] border border-[#e0e0e0] rounded bg-white/90 text-[#333] placeholder:text-[#ccc] focus:outline-none focus:border-[#111] focus:text-[#000] focus:placeholder:text-[#888] transition-colors"
            />
            {searchQuery && searchMatches.size > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#e0e0e0] rounded shadow-lg max-h-48 overflow-y-auto z-20">
                {[...searchMatches].map(id => (
                  <button
                    key={id}
                    onClick={() => { panToNode(id); setSearchQuery(''); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors"
                  >
                    @{id}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          {currentMaxDepth > 1 && (
            <div className="flex items-center gap-0.5 bg-white/90 border border-[#e0e0e0] rounded overflow-hidden">
              <button
                onClick={() => setMaxDepth(d => {
                  const cur = d === Infinity ? currentMaxDepth : d;
                  return Math.max(1, cur - 1);
                })}
                disabled={maxDepth !== Infinity && maxDepth <= 1}
                className="px-1.5 py-0.5 text-[11px] font-bold text-[#888] hover:text-[#111] disabled:opacity-30 transition-colors"
              >
                &minus;
              </button>
              <span className="px-1 text-[10px] font-mono text-[#666] min-w-[28px] text-center">
                {maxDepth === Infinity ? 'all' : `${maxDepth}d`}
              </span>
              <button
                onClick={() => setMaxDepth(d => {
                  if (d === Infinity) return Infinity;
                  return d + 1 > currentMaxDepth ? Infinity : d + 1;
                })}
                disabled={maxDepth === Infinity}
                className="px-1.5 py-0.5 text-[11px] font-bold text-[#888] hover:text-[#111] disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>
          )}
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

      <div className="absolute bottom-2 right-3 text-[10px] text-[#c0c0c0] z-10 select-none">
        click expand · double-click profile · cmd+click new tab · shift select · scroll zoom{isFullscreen ? ' · esc exit' : ''}
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: dragNode ? 'grabbing' : isPanning ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
}
