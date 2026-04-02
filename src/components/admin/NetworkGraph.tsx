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
  label: '#111',
  labelBg: 'rgba(255,255,255,0.92)',
  expandedRing: '#111',
  loadingRing: '#4285f4',
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function NetworkGraph({ users, seed, onExpandNode }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 500 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const iterationRef = useRef(0);
  const initializedForRef = useRef<string>('');
  // For differentiating click vs drag
  const dragStartPos = useRef({ x: 0, y: 0 });
  // For differentiating single click vs double click
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickNodeRef = useRef<string | null>(null);
  // Force re-render for React-managed elements (clipPaths, etc.)
  const [, forceRender] = useState(0);

  // Build graph data when users/seed change (initial load only)
  useEffect(() => {
    const dataKey = `${seed}:${users.map(u => u.username).join(',')}`;
    if (initializedForRef.current === dataKey) return;
    initializedForRef.current = dataKey;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Seed node
    nodes.push({
      id: seed,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: 24,
      color: COLORS.seed,
      isSeed: true,
      isExpanded: true, // seed is already expanded (we loaded its network)
      isLoading: false,
      avatar: `https://github.com/${seed}.png?size=96`,
      user: null,
    });

    // User nodes arranged in a circle initially
    const angleStep = (2 * Math.PI) / Math.max(users.length, 1);
    const spreadRadius = Math.min(dimensions.width, dimensions.height) * 0.35;

    users.forEach((u, i) => {
      const angle = angleStep * i;
      const r = Math.max(10, Math.log(u.followers + 1) * 4.5);
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
      });

      edges.push({ source: seed, target: u.username });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterationRef.current = 0;

    setViewBox({ x: 0, y: 0, w: dimensions.width, h: dimensions.height });
    forceRender(n => n + 1);
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
        // Just add edge if not already connected
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
      const spread = 100 + Math.random() * 40;
      const r = Math.max(10, Math.log(u.followers + 1) * 4.5);

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
      });

      edges.push({ source: parentId, target: u.username });
      added++;
    });

    // Mark parent as expanded
    parent.isExpanded = true;
    parent.isLoading = false;

    // Reheat simulation
    if (added > 0) {
      iterationRef.current = Math.max(0, iterationRef.current - 80);
    }

    forceRender(n => n + 1);
  }, []);

  // Handle node expand (single click)
  const handleExpand = useCallback(async (username: string) => {
    if (!onExpandNode) return;

    const node = nodesRef.current.find(n => n.id === username);
    if (!node || node.isExpanded || node.isLoading) return;

    node.isLoading = true;
    forceRender(n => n + 1);

    try {
      const newUsers = await onExpandNode(username);
      if (newUsers) {
        addNodes(username, newUsers);
      } else {
        node.isLoading = false;
        node.isExpanded = true;
        forceRender(n => n + 1);
      }
    } catch {
      node.isLoading = false;
      forceRender(n => n + 1);
    }
  }, [onExpandNode, addNodes]);

  // Force simulation
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    const iteration = iterationRef.current;
    const alpha = Math.max(0.01, 1 - iteration * 0.004);
    const repulsionStrength = 2500 * alpha;
    const springStrength = 0.015;
    const springLength = 130;
    const damping = 0.85;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = nodes[i].radius + nodes[j].radius + 10;
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

    // Spring forces along edges
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const edge of edges) {
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
      node.vx += dx * 0.001 * alpha;
      node.vy += dy * 0.001 * alpha;
    }

    // Apply velocity
    for (const node of nodes) {
      if (node.id === dragNode) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
      node.x = clamp(node.x, -400, dimensions.width + 400);
      node.y = clamp(node.y, -400, dimensions.height + 400);
    }

    // Pin seed node to center (softly)
    const seedNode = nodes[0];
    if (seedNode && seedNode.isSeed && seedNode.id !== dragNode) {
      seedNode.x += (cx - seedNode.x) * 0.03;
      seedNode.y += (cy - seedNode.y) * 0.03;
    }

    iterationRef.current++;
  }, [dimensions, dragNode]);

  // Animation loop
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      simulate();

      if (svgRef.current) {
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        const edgeEls = svgRef.current.querySelectorAll('.graph-edge');
        edgeEls.forEach((el, i) => {
          const edge = edges[i];
          if (!edge) return;
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return;
          el.setAttribute('x1', String(src.x));
          el.setAttribute('y1', String(src.y));
          el.setAttribute('x2', String(tgt.x));
          el.setAttribute('y2', String(tgt.y));
        });

        const nodeEls = svgRef.current.querySelectorAll('.graph-node');
        nodeEls.forEach((el, i) => {
          const node = nodes[i];
          if (!node) return;
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
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());

    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = svgPt.x - node.x;
      const dy = svgPt.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.radius + 4) {
        setDragNode(node.id);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        node.vx = 0;
        node.vy = 0;
        e.preventDefault();
        return;
      }
    }

    // Start panning
    setIsPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      vx: viewBox.x,
      vy: viewBox.y,
    };
    e.preventDefault();
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    if (dragNode) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());

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
      const scale = viewBox.w / dimensions.width;
      const dx = (e.clientX - panStart.current.x) * scale;
      const dy = (e.clientY - panStart.current.y) * scale;
      setViewBox(prev => ({
        ...prev,
        x: panStart.current.vx - dx,
        y: panStart.current.vy - dy,
      }));
      return;
    }

    // Hover detection
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());

    let found: string | null = null;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = svgPt.x - node.x;
      const dy = svgPt.y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 4) {
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
  }, [dragNode, isPanning, viewBox, dimensions]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragNode) {
      // Check if it was a click (minimal movement) vs drag
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const moved = Math.sqrt(dx * dx + dy * dy);

      if (moved < 5) {
        // It was a click, not a drag — handle single/double click
        const nodeId = dragNode;

        if (clickTimerRef.current && lastClickNodeRef.current === nodeId) {
          // Double click — open GitHub profile
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
          lastClickNodeRef.current = null;
          window.open(`https://github.com/${nodeId}`, '_blank');
        } else {
          // Potential single click — wait to see if double click follows
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
          lastClickNodeRef.current = nodeId;
          clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            lastClickNodeRef.current = null;
            // Single click — expand node
            handleExpand(nodeId);
          }, 250);
        }
      }
    }

    setDragNode(null);
    setIsPanning(false);
  }, [dragNode, handleExpand]);

  const handleMouseLeave = useCallback(() => {
    setDragNode(null);
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());

    setViewBox(prev => {
      const newW = clamp(prev.w * zoomFactor, 200, dimensions.width * 6);
      const newH = clamp(prev.h * zoomFactor, 125, dimensions.height * 6);
      const mouseRatioX = (svgPt.x - prev.x) / prev.w;
      const mouseRatioY = (svgPt.y - prev.y) / prev.h;
      const newX = svgPt.x - mouseRatioX * newW;
      const newY = svgPt.y - mouseRatioY * newH;
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [dimensions]);

  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="w-full border border-[#eee] rounded bg-white relative"
      style={{ height: 500 }}
    >
      {/* Legend */}
      <div className="absolute top-3 left-3 flex gap-4 text-xs text-[#888] z-10 bg-white/80 px-2 py-1 rounded">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#111] border-2 border-[#111]" />
          Seed
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

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-[#bbb] z-10">
        Click to expand · Double-click for GitHub · Scroll to zoom · Drag to pan
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: dragNode ? 'grabbing' : isPanning ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
      >
        <defs>
          {/* Clip paths for avatar circles */}
          {nodes.map((node) => (
            <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
              <circle r={node.radius} cx={0} cy={0} />
            </clipPath>
          ))}
          {/* Loading animation */}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
            .loading-ring { animation: spin 1.2s linear infinite; transform-origin: center; }
            .loading-pulse { animation: pulse 1.2s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;
          const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
          return (
            <line
              key={`edge-${i}`}
              className="graph-edge"
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={isHovered ? COLORS.edgeHover : COLORS.edge}
              strokeWidth={isHovered ? 1.5 : 0.8}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
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
              {/* Border/ring circle (behind avatar) */}
              <circle
                r={node.radius + 2}
                fill="none"
                stroke={
                  node.isSeed ? COLORS.seed :
                  isHovered ? '#111' :
                  node.isExpanded ? COLORS.expandedRing :
                  node.color === COLORS.ggProfile ? COLORS.ggProfile :
                  '#ccc'
                }
                strokeWidth={isHovered || node.isSeed ? 2.5 : node.isExpanded ? 2 : 1.5}
                opacity={node.color === COLORS.noProfile && !isHovered && !node.isExpanded ? 0.6 : 1}
              />

              {/* Avatar image clipped to circle */}
              <image
                href={node.avatar}
                x={-node.radius}
                y={-node.radius}
                width={node.radius * 2}
                height={node.radius * 2}
                clipPath={`url(#clip-${node.id})`}
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Loading spinner ring */}
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

              {/* Expanded indicator — small dot */}
              {node.isExpanded && !node.isSeed && (
                <circle
                  cx={node.radius * 0.7}
                  cy={-node.radius * 0.7}
                  r={3}
                  fill={COLORS.expandedRing}
                  stroke="white"
                  strokeWidth={1}
                />
              )}

              {/* Seed label always visible */}
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
                    x={-55}
                    y={node.radius + 5}
                    width={110}
                    height={node.isExpanded ? 32 : 44}
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
                    {(node.user?.followers ?? 0).toLocaleString()} followers
                  </text>
                  {!node.isExpanded && !node.isLoading && (
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
