'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { NetworkUser, GraphNode, GraphEdge, EdgeFilter, EdgeDirection, ViewBox } from './types';
import { PALETTE, clamp, getNodeRadius, getDegreeCounts } from './types';
import { QuadTree, hitTestQuadTree } from './quadtree';
import { simulateTick, autoFitViewBox } from './simulation';
import { renderGraph } from './renderer';

export interface NetworkGraphProps {
  users: NetworkUser[];
  seed: string;
  seedAvatar?: string;
  semanticUsers?: NetworkUser[];
  edgeFilter?: EdgeFilter;
  onExpandNode?: (username: string) => Promise<NetworkUser[] | null>;
  onSelectionChange?: (selected: Set<string>) => void;
}

export function NetworkGraph({ users, seed, seedAvatar, semanticUsers, edgeFilter, onExpandNode, onSelectionChange }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number>(0);

  // P0 FIX: interaction state lives in refs, NOT useState.
  // useState caused the RAF loop to tear down + restart on every hover/drag.
  const hoveredNodeRef = useRef<string | null>(null);
  const dragNodeRef = useRef<string | null>(null);
  const selectedNodesRef = useRef<Set<string>>(new Set());
  const isPanningRef = useRef(false);

  // React state only for things that affect the DOM (toolbar, etc.)
  const [dimensions, setDimensions] = useState({ width: 900, height: 800 });
  const [selectedCount, setSelectedCount] = useState(0); // just for toolbar badge
  const [hideLeaves, setHideLeaves] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDepth, setMaxDepth] = useState<number>(Infinity);
  const [expandAllProgress, setExpandAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [springScale, setSpringScale] = useState(1.0);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const iterationRef = useRef(0);
  const initializedForRef = useRef<string>('');
  const dragStartPos = useRef({ x: 0, y: 0 });
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickNodeRef = useRef<string | null>(null);
  const viewBoxRef = useRef<ViewBox>({ x: 0, y: 0, w: 900, h: 800 });
  const autoFitEnabledRef = useRef(true);
  const [structureVersion, setStructureVersion] = useState(0);
  const quadTreeRef = useRef<QuadTree | null>(null);

  // Pre-computed degrees — only recalculated when structure changes, not per-frame
  const degreesRef = useRef<Map<string, number>>(new Map());

  // Refs for values the RAF loop reads (avoids stale closures without restarting the loop)
  const edgeFilterRef = useRef(edgeFilter);
  edgeFilterRef.current = edgeFilter;
  const springScaleRef = useRef(springScale);
  springScaleRef.current = springScale;
  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;

  // --- Search ---
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(
      nodesRef.current
        .filter(n => n.id.toLowerCase().includes(q) || n.user?.name?.toLowerCase().includes(q))
        .map(n => n.id)
    );
  }, [searchQuery, structureVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchMatchesRef = useRef(searchMatches);
  searchMatchesRef.current = searchMatches;

  useEffect(() => {
    onSelectionChange?.(selectedNodesRef.current);
  }, [selectedCount, onSelectionChange]);

  // --- Build graph data ---
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
      avatar: seedAvatar || `https://avatars.githubusercontent.com/${seed}`,
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
      edges.push({ source: seed, target: u.username, type: 'social', direction: dir, rand: Math.random() });
    });

    if (semanticUsers?.length) {
      const semAngleStep = (2 * Math.PI) / Math.max(semanticUsers.length, 1);
      const semSpread = spread * 1.6;
      semanticUsers.forEach((u, i) => {
        if (existingIds.has(u.username)) {
          edges.push({ source: seed, target: u.username, type: 'semantic', similarity: u.similarity, rand: Math.random() });
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
        edges.push({ source: seed, target: u.username, type: 'semantic', similarity: u.similarity, rand: Math.random() });
      });
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    degreesRef.current = getDegreeCounts(edges);
    iterationRef.current = 0;
    const isFirstBuild = viewBoxRef.current.w === dimensions.width && viewBoxRef.current.x === 0;
    if (isFirstBuild) {
      viewBoxRef.current = { x: 0, y: 0, w: dimensions.width, h: dimensions.height };
    }
    autoFitEnabledRef.current = true;
    setStructureVersion(v => v + 1);
  }, [users, seed, seedAvatar, semanticUsers, dimensions]);

  // --- Patch nodes when enrichment arrives (same users, but with real follower counts) ---
  useEffect(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;
    const userMap = new Map(users.map(u => [u.username, u]));
    let patched = 0;
    for (const node of nodes) {
      if (node.isSeed) continue;
      const u = userMap.get(node.id);
      if (!u) continue;
      // Only patch if data actually changed (enrichment arrived)
      if (u.followers > 0 && node.user?.followers !== u.followers) {
        node.radius = getNodeRadius(u.followers, false);
        node.user = u;
        node.color = u.hasGGProfile ? PALETTE.ggProfile : PALETTE.noProfile;
        patched++;
      } else if (u.name && !node.user?.name) {
        node.user = u;
        patched++;
      }
    }
    if (patched > 0) console.log(`[graph] patched ${patched} nodes with enrichment data`);
  }, [users]);

  // --- Node expansion ---
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
        if (!edges.some(e => (e.source === parentId && e.target === u.username) || (e.source === u.username && e.target === parentId))) {
          edges.push({ source: parentId, target: u.username, type: 'social', rand: Math.random() });
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
        vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
        radius: r, color: u.hasGGProfile ? PALETTE.ggProfile : PALETTE.noProfile,
        isSeed: false, isExpanded: false, isLoading: false,
        avatar: u.avatar, user: u, hidden: false,
      });
      edges.push({ source: parentId, target: u.username, type: 'social', rand: Math.random() });
      added++;
    });
    parent.isExpanded = true;
    parent.isLoading = false;
    degreesRef.current = getDegreeCounts(edges);
    if (added > 0) iterationRef.current = Math.max(0, iterationRef.current - 100);
    setStructureVersion(v => v + 1);
  }, []);

  const handleExpand = useCallback(async (username: string) => {
    if (!onExpandNode) return;
    const node = nodesRef.current.find(n => n.id === username);
    if (!node || node.isExpanded || node.isLoading) return;
    node.isLoading = true;
    try {
      const newUsers = await onExpandNode(username);
      if (newUsers) addNodes(username, newUsers);
      else { node.isLoading = false; node.isExpanded = true; }
    } catch { node.isLoading = false; }
  }, [onExpandNode, addNodes]);

  const toggleSelection = useCallback((nodeId: string) => {
    const s = selectedNodesRef.current;
    const next = new Set(s);
    if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
    selectedNodesRef.current = next;
    setSelectedCount(next.size);
  }, []);

  // --- View helpers ---
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
    const contentW = maxX - minX, contentH = maxY - minY;
    const aspect = dimensions.width / dimensions.height;
    let fitW = contentW, fitH = contentH;
    if (fitW / fitH > aspect) fitH = fitW / aspect; else fitW = fitH * aspect;
    viewBoxRef.current = { x: (minX + maxX) / 2 - fitW / 2, y: (minY + maxY) / 2 - fitH / 2, w: fitW, h: fitH };
  }, [dimensions]);

  const panToNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    const vb = viewBoxRef.current;
    viewBoxRef.current = { x: node.x - vb.w / 2, y: node.y - vb.h / 2, w: vb.w, h: vb.h };
    autoFitEnabledRef.current = false;
  }, []);

  // --- Leaf hiding (P0 FIX: removed structureVersion from deps to prevent infinite loop) ---
  useEffect(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!hideLeaves) { for (const n of nodes) n.hidden = false; return; }
    const degrees = getDegreeCounts(edges);
    for (const n of nodes) n.hidden = !n.isSeed && (degrees.get(n.id) || 0) < 2;
  }, [hideLeaves]);

  // --- Depth + filtering ---
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
        if (!depths.has(neighbor)) { depths.set(neighbor, d + 1); queue.push(neighbor); }
      }
    }
    return depths;
  }, [seed, structureVersion]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (visible) { set.add(edge.source); set.add(edge.target); }
    }
    return set;
  }, [edgeFilter, structureVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNodeFilteredOut = useCallback((node: GraphNode): boolean => {
    if (node.isSeed) return false;
    const depth = nodeDepths.get(node.id) ?? Infinity;
    if (depth > maxDepth) return true;
    if (edgeFilter && !nodesWithVisibleEdges.has(node.id)) return true;
    return false;
  }, [nodeDepths, maxDepth, edgeFilter, nodesWithVisibleEdges]);
  const isNodeFilteredOutRef = useRef(isNodeFilteredOut);
  isNodeFilteredOutRef.current = isNodeFilteredOut;

  // --- Expand All ---
  const expandAllRef = useRef(false);

  const handleExpandAll = useCallback(async () => {
    if (!onExpandNode || expandAllRef.current) return;
    expandAllRef.current = true;

    const expandable = nodesRef.current.filter(
      n => !n.isSeed && !n.isExpanded && !n.isLoading && !n.hidden && !isNodeFilteredOut(n)
    );
    if (expandable.length === 0) { expandAllRef.current = false; return; }

    let completed = 0;
    let idx = 0;
    setExpandAllProgress({ current: 0, total: expandable.length });

    // AIMD adaptive batching — persisted across sessions via localStorage
    const storedBatch = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('gg:expand-batch') || '') : NaN;
    let batchSize = isNaN(storedBatch) ? 3 : storedBatch;
    const MIN_BATCH = 1;
    const MAX_BATCH = 50;
    const FAST_THRESHOLD_MS = 2000;
    const SLOW_THRESHOLD_MS = 5000;

    while (idx < expandable.length && expandAllRef.current) {
      const batch = expandable.slice(idx, idx + batchSize).filter(n => !n.isExpanded && !n.isLoading);
      idx += batchSize;
      if (batch.length === 0) continue;
      for (const node of batch) { node.isLoading = true; }

      const t0 = performance.now();
      let batchErrors = 0;

      await Promise.all(batch.map(async (node) => {
        try {
          const newUsers = await onExpandNode(node.id);
          if (newUsers) addNodes(node.id, newUsers);
          else { node.isLoading = false; node.isExpanded = true; }
        } catch {
          node.isLoading = false;
          batchErrors++;
        }
        completed++;
        setExpandAllProgress({ current: completed, total: expandable.length });
      }));

      const elapsed = performance.now() - t0;
      const prevSize = batchSize;

      // Adapt: fast + no errors → grow, slow or errors → shrink
      if (batchErrors > 0 || elapsed > SLOW_THRESHOLD_MS) {
        batchSize = Math.max(MIN_BATCH, Math.floor(batchSize / 2));
      } else if (elapsed < FAST_THRESHOLD_MS) {
        batchSize = Math.min(MAX_BATCH, batchSize + 2);
      }

      console.log(`[expand] batch ${batch.length} nodes in ${Math.round(elapsed)}ms | errors: ${batchErrors} | batch size: ${prevSize} → ${batchSize} | progress: ${completed}/${expandable.length}`);
    }

    // Persist learned batch size for next session
    try { localStorage.setItem('gg:expand-batch', String(batchSize)); } catch {}
    console.log(`[expand] done — final batch size: ${batchSize}`);

    setExpandAllProgress(null);
    expandAllRef.current = false;
  }, [onExpandNode, addNodes, isNodeFilteredOut]);

  const cancelExpandAll = useCallback(() => {
    expandAllRef.current = false;
    setExpandAllProgress(null);
  }, []);

  // --- Simulation + render loop (P0 FIX: no rapidly-changing state in deps) ---
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const dims = dimensionsRef.current;
      const filterFn = isNodeFilteredOutRef.current;

      const { quadTree, nextIteration } = simulateTick({
        nodes: nodesRef.current,
        edges: edgesRef.current,
        dimensions: dims,
        dragNode: dragNodeRef.current,
        iteration: iterationRef.current,
        isNodeFilteredOut: filterFn,
        springScale: springScaleRef.current,
      });
      quadTreeRef.current = quadTree;
      iterationRef.current = nextIteration;

      // Auto-fit during settling
      if (autoFitEnabledRef.current && iterationRef.current % 3 === 0 && !isPanningRef.current && !dragNodeRef.current) {
        viewBoxRef.current = autoFitViewBox(nodesRef.current, dims, viewBoxRef.current, iterationRef.current, filterFn);
        if (iterationRef.current >= 120) autoFitEnabledRef.current = false;
      }

      if (canvasRef.current) {
        renderGraph({
          canvas: canvasRef.current,
          nodes: nodesRef.current,
          edges: edgesRef.current,
          viewBox: viewBoxRef.current,
          dimensions: dims,
          hoveredNode: hoveredNodeRef.current,
          selectedNodes: selectedNodesRef.current,
          searchMatches: searchMatchesRef.current,
          edgeFilter: edgeFilterRef.current,
          isNodeFilteredOut: filterFn,
          degrees: degreesRef.current,
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, []); // P0 FIX: empty deps — loop never restarts. Reads from refs.

  // Re-kick simulation when these change
  useEffect(() => {
    iterationRef.current = Math.max(0, iterationRef.current - 80);
    autoFitEnabledRef.current = true;
  }, [springScale, isFullscreen]);

  // --- Wheel zoom (native listener, NOT React — React registers as passive) ---
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const vb = viewBoxRef.current;
      const dims = dimensionsRef.current;
      const ptX = vb.x + x * (vb.w / dims.width);
      const ptY = vb.y + y * (vb.h / dims.height);
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      const newW = clamp(vb.w * factor, 200, dims.width * 12);
      const newH = clamp(vb.h * factor, 140, dims.height * 12);
      const rx = (ptX - vb.x) / vb.w;
      const ry = (ptY - vb.y) / vb.h;
      viewBoxRef.current = { x: ptX - rx * newW, y: ptY - ry * newH, w: newW, h: newH };
      autoFitEnabledRef.current = false;
    };
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
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
    const dims = dimensionsRef.current;
    return { x: vb.x + x * (vb.w / dims.width), y: vb.y + y * (vb.h / dims.height) };
  }, []);

  const updateCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = dragNodeRef.current ? 'grabbing' : isPanningRef.current ? 'grabbing' : hoveredNodeRef.current ? 'pointer' : 'grab';
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;
    if (quadTreeRef.current) {
      const hit = hitTestQuadTree(quadTreeRef.current, pt.x, pt.y, 6);
      if (hit && !hit.hidden && !isNodeFilteredOutRef.current(hit)) {
        dragNodeRef.current = hit.id;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        hit.vx = 0; hit.vy = 0;
        updateCursor();
        return;
      }
    }
    isPanningRef.current = true;
    const vb = viewBoxRef.current;
    panStart.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
    updateCursor();
  }, [getCanvasPoint, updateCursor]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNodeRef.current) {
      const pt = getCanvasPoint(e);
      if (!pt) return;
      const node = nodesRef.current.find(n => n.id === dragNodeRef.current);
      if (node) { node.x = pt.x; node.y = pt.y; node.vx = 0; node.vy = 0; }
      iterationRef.current = Math.min(iterationRef.current, 120);
      return;
    }
    if (isPanningRef.current) {
      const vb = viewBoxRef.current;
      const dims = dimensionsRef.current;
      const scale = vb.w / dims.width;
      viewBoxRef.current = { ...vb, x: panStart.current.vx - (e.clientX - panStart.current.x) * scale, y: panStart.current.vy - (e.clientY - panStart.current.y) * scale };
      return;
    }
    const pt = getCanvasPoint(e);
    if (!pt) return;
    if (quadTreeRef.current) {
      const hit = hitTestQuadTree(quadTreeRef.current, pt.x, pt.y, 6);
      hoveredNodeRef.current = hit && !hit.hidden && !isNodeFilteredOutRef.current(hit) ? hit.id : null;
    } else hoveredNodeRef.current = null;
    updateCursor();
  }, [getCanvasPoint, updateCursor]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNodeRef.current) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        const nodeId = dragNodeRef.current;
        if (e.metaKey || e.ctrlKey) { window.open(`/${nodeId}`, '_blank'); dragNodeRef.current = null; isPanningRef.current = false; updateCursor(); return; }
        if (clickTimerRef.current && lastClickNodeRef.current === nodeId) {
          clearTimeout(clickTimerRef.current); clickTimerRef.current = null; lastClickNodeRef.current = null;
          handleExpand(nodeId);
        } else {
          if (e.shiftKey) {
            toggleSelection(nodeId);
          } else {
            selectedNodesRef.current = new Set([nodeId]);
            setSelectedCount(1);
          }
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
          lastClickNodeRef.current = nodeId;
          clickTimerRef.current = setTimeout(() => { clickTimerRef.current = null; lastClickNodeRef.current = null; }, 300);
        }
      }
    }
    dragNodeRef.current = null; isPanningRef.current = false;
    updateCursor();
  }, [handleExpand, toggleSelection, updateCursor]);

  const handleMouseLeave = useCallback(() => {
    dragNodeRef.current = null; isPanningRef.current = false;
    hoveredNodeRef.current = null;
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    lastClickNodeRef.current = null;
    updateCursor();
  }, [updateCursor]);


  // --- Computed stats (for toolbar only, not hot path) ---
  const degrees = degreesRef.current;
  const totalVisible = nodesRef.current.filter(n => !n.hidden && !isNodeFilteredOut(n)).length;
  const totalEdges = edgesRef.current.length;
  const routerCount = nodesRef.current.filter(n => !n.isSeed && !n.hidden && !isNodeFilteredOut(n) && (degrees.get(n.id) || 0) >= 2).length;

  // --- Fullscreen ---
  useEffect(() => {
    if (!isFullscreen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isFullscreen]);

  // --- Render ---
  return (
    <div
      ref={containerRef}
      className={isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-hidden select-none' : 'w-full rounded-lg bg-white relative overflow-hidden select-none'}
      style={isFullscreen ? { touchAction: 'none' } : { height: '70vh', minHeight: 600, border: '1px solid #eee', touchAction: 'none' }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between z-10 px-4 py-3 bg-gradient-to-b from-white via-white/95 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex gap-3 text-[11px] text-[#888] font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#111]" /> Seed</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border-[1.5px] border-[#3b82f6] bg-white" /> Router</span>
            <span className="flex items-center gap-1.5"><span className="text-[#22863a] font-semibold">aa</span> GG</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#94a3b8]" /> New</span>
            {semanticUsers && semanticUsers.length > 0 && (
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#8b5cf6] rounded" style={{ borderTop: '1px dashed #8b5cf6' }} /> Similar</span>
            )}
          </div>
          <span className="text-[11px] text-[#bbb] font-mono">{totalVisible} nodes · {totalEdges} edges · {routerCount} routers</span>
        </div>
        <div className="flex gap-1.5 items-center pointer-events-auto">
          <div className="relative">
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="w-32 px-2 py-1 text-[11px] border border-[#e0e0e0] rounded bg-white/90 text-[#333] placeholder:text-[#ccc] focus:outline-none focus:border-[#111] focus:text-[#000] focus:placeholder:text-[#888] transition-colors"
            />
            {searchQuery && searchMatches.size > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#e0e0e0] rounded shadow-lg max-h-48 overflow-y-auto z-20">
                {[...searchMatches].map(id => (
                  <button key={id} onClick={() => { panToNode(id); setSearchQuery(''); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors">@{id}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={fitToView} className="px-2 py-1 text-[11px] font-medium rounded bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999] transition-colors" title="Fit all nodes in view">Fit</button>
          <button onClick={() => setIsFullscreen(f => !f)} className="px-2 py-1 text-[11px] font-medium rounded bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999] transition-colors">{isFullscreen ? 'Exit' : 'Full'}</button>
          <button onClick={() => setHideLeaves(!hideLeaves)} className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${hideLeaves ? 'bg-[#111] text-white border border-[#111]' : 'bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999]'}`}>{hideLeaves ? 'All' : 'Routers'}</button>
          {currentMaxDepth > 1 && (
            <div className="flex items-center gap-0.5 bg-white/90 border border-[#e0e0e0] rounded overflow-hidden">
              <button onClick={() => setMaxDepth(d => { const cur = d === Infinity ? currentMaxDepth : d; return Math.max(1, cur - 1); })} disabled={maxDepth !== Infinity && maxDepth <= 1} className="px-1.5 py-0.5 text-[11px] font-bold text-[#888] hover:text-[#111] disabled:opacity-30 transition-colors">&minus;</button>
              <span className="px-1 text-[10px] font-mono text-[#666] min-w-[28px] text-center">{maxDepth === Infinity ? 'all' : `${maxDepth}d`}</span>
              <button onClick={() => setMaxDepth(d => { if (d === Infinity) return Infinity; return d + 1 > currentMaxDepth ? Infinity : d + 1; })} disabled={maxDepth === Infinity} className="px-1.5 py-0.5 text-[11px] font-bold text-[#888] hover:text-[#111] disabled:opacity-30 transition-colors">+</button>
            </div>
          )}
          <div className="flex items-center gap-0.5 bg-white/90 border border-[#e0e0e0] rounded overflow-hidden" title="Link distance">
            <button onClick={() => setSpringScale(s => Math.max(0.3, +(s - 0.2).toFixed(1)))} disabled={springScale <= 0.3} className="px-1.5 py-0.5 text-[11px] font-bold text-[#888] hover:text-[#111] disabled:opacity-30 transition-colors">&minus;</button>
            <span className="px-1 text-[10px] font-mono text-[#666] min-w-[28px] text-center">{springScale === 1.0 ? '1x' : `${springScale.toFixed(1)}x`}</span>
            <button onClick={() => setSpringScale(s => Math.min(10.0, +(s + 0.2).toFixed(1)))} disabled={springScale >= 10.0} className="px-1.5 py-0.5 text-[11px] font-bold text-[#888] hover:text-[#111] disabled:opacity-30 transition-colors">+</button>
          </div>
          {expandAllProgress ? (
            <button onClick={cancelExpandAll} className="px-2 py-1 text-[11px] font-medium rounded bg-[#111] text-white border border-[#111] hover:bg-[#333] transition-colors">
              {expandAllProgress.current}/{expandAllProgress.total} &times;
            </button>
          ) : (
            <button onClick={handleExpandAll} className="px-2 py-1 text-[11px] font-medium rounded bg-white/90 text-[#888] border border-[#e0e0e0] hover:text-[#111] hover:border-[#999] transition-colors" title="Expand all visible nodes">Expand All</button>
          )}
          {selectedCount > 0 && (
            <button onClick={() => { selectedNodesRef.current = new Set(); setSelectedCount(0); }} className="px-2 py-1 text-[11px] font-medium text-[#3b82f6] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">{selectedCount} selected &times;</button>
          )}
        </div>
      </div>

      {/* Bottom hints */}
      <div className="absolute bottom-2 right-3 text-[10px] text-[#c0c0c0] z-10 select-none">
        click select · double-click expand · shift multi-select · cmd+click new tab · scroll zoom{isFullscreen ? ' · esc exit' : ''}
      </div>

      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
