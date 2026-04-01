'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface NetworkUser {
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
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function NetworkGraph({ users, seed }: NetworkGraphProps) {
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
  // Track whether simulation has been initialized for this dataset
  const initializedForRef = useRef<string>('');

  // Build graph data when users/seed change
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
      radius: 20,
      color: COLORS.seed,
      isSeed: true,
      user: null,
    });

    // User nodes arranged in a circle initially
    const angleStep = (2 * Math.PI) / Math.max(users.length, 1);
    const spreadRadius = Math.min(dimensions.width, dimensions.height) * 0.35;

    users.forEach((u, i) => {
      const angle = angleStep * i;
      const r = Math.max(6, Math.log(u.followers + 1) * 4);
      nodes.push({
        id: u.username,
        x: cx + Math.cos(angle) * spreadRadius + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * spreadRadius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: r,
        color: u.hasGGProfile ? COLORS.ggProfile : COLORS.noProfile,
        isSeed: false,
        user: u,
      });

      edges.push({ source: seed, target: u.username });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
    iterationRef.current = 0;

    // Reset view
    setViewBox({ x: 0, y: 0, w: dimensions.width, h: dimensions.height });
  }, [users, seed, dimensions]);

  // Force simulation
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    const iteration = iterationRef.current;
    // Cooling: reduce forces over time
    const alpha = Math.max(0.01, 1 - iteration * 0.005);
    const repulsionStrength = 2000 * alpha;
    const springStrength = 0.02;
    const springLength = 120;
    const damping = 0.85;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
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
      if (node.id === dragNode) continue; // Don't move dragged node
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
      // Keep within bounds (soft)
      node.x = clamp(node.x, -200, dimensions.width + 200);
      node.y = clamp(node.y, -200, dimensions.height + 200);
    }

    // Pin seed node to center (softly)
    const seedNode = nodes[0];
    if (seedNode && seedNode.isSeed && seedNode.id !== dragNode) {
      seedNode.x += (cx - seedNode.x) * 0.05;
      seedNode.y += (cy - seedNode.y) * 0.05;
    }

    iterationRef.current++;
  }, [dimensions, dragNode]);

  // Animation loop
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      simulate();

      // Force re-render by triggering SVG update
      if (svgRef.current) {
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        // Update edges
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

        // Update nodes
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

  // Mouse handlers for drag and pan
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());

    // Check if clicking on a node
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = svgPt.x - node.x;
      const dy = svgPt.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.radius + 4) {
        setDragNode(node.id);
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

  const handleMouseUp = useCallback(() => {
    setDragNode(null);
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    // Get mouse position in SVG coordinates
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());

    setViewBox(prev => {
      const newW = clamp(prev.w * zoomFactor, 200, dimensions.width * 4);
      const newH = clamp(prev.h * zoomFactor, 125, dimensions.height * 4);
      // Zoom towards mouse position
      const mouseRatioX = (svgPt.x - prev.x) / prev.w;
      const mouseRatioY = (svgPt.y - prev.y) / prev.h;
      const newX = svgPt.x - mouseRatioX * newW;
      const newY = svgPt.y - mouseRatioY * newH;
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [dimensions]);

  const handleNodeClick = useCallback((username: string) => {
    window.open(`/${username}`, '_blank');
  }, []);

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
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#111]" />
          Seed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#34a853]" />
          GG Profile
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ddd] border border-[#ccc]" />
          No Profile
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-[#bbb] z-10">
        Scroll to zoom · Drag to pan · Click node to open profile
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: dragNode ? 'grabbing' : isPanning ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
      >
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
        {nodes.map((node, i) => {
          const isHovered = hoveredNode === node.id;
          return (
            <g
              key={node.id}
              className="graph-node"
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragNode(node.id);
                node.vx = 0;
                node.vy = 0;
              }}
              onMouseUp={() => {
                // If we didn't move much, treat as click
                if (dragNode === node.id) {
                  handleNodeClick(node.id);
                }
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => { if (!dragNode) setHoveredNode(null); }}
            >
              {/* Circle */}
              <circle
                r={node.radius}
                fill={node.color}
                stroke={isHovered ? '#111' : node.isSeed ? '#111' : node.color === COLORS.noProfile ? '#ccc' : node.color}
                strokeWidth={isHovered ? 2 : node.isSeed ? 2 : 1}
                opacity={node.color === COLORS.noProfile ? 0.7 : 1}
              />
              {/* Seed label always visible */}
              {node.isSeed && (
                <text
                  y={node.radius + 14}
                  textAnchor="middle"
                  fill={COLORS.label}
                  fontSize={11}
                  fontWeight={600}
                >
                  @{node.id}
                </text>
              )}
              {/* Hover label for non-seed */}
              {isHovered && !node.isSeed && node.user && (
                <>
                  <rect
                    x={-50}
                    y={node.radius + 4}
                    width={100}
                    height={32}
                    rx={4}
                    fill={COLORS.labelBg}
                    stroke="#eee"
                    strokeWidth={0.5}
                  />
                  <text
                    y={node.radius + 18}
                    textAnchor="middle"
                    fill={COLORS.label}
                    fontSize={10}
                    fontWeight={600}
                  >
                    @{node.user.username}
                  </text>
                  <text
                    y={node.radius + 30}
                    textAnchor="middle"
                    fill="#888"
                    fontSize={9}
                  >
                    {node.user.followers.toLocaleString()} followers
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
