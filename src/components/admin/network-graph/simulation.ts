import type { GraphNode, GraphEdge, ViewBox } from './types';
import { QuadTree, applyBarnesHut, buildQuadTree } from './quadtree';

interface SimulationOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  dimensions: { width: number; height: number };
  dragNode: string | null;
  iteration: number;
  isNodeFilteredOut: (node: GraphNode) => boolean;
  springScale?: number;
}

/**
 * Run one tick of the force simulation.
 * Uses Barnes-Hut quadtree for O(n log n) repulsion.
 * Returns the quadtree for use in hit testing.
 */
export function simulateTick(opts: SimulationOptions): { quadTree: QuadTree; nextIteration: number } {
  const { nodes: allNodes, edges, dimensions, dragNode, iteration, isNodeFilteredOut, springScale = 1.0 } = opts;
  const nodes = allNodes.filter(n => !n.hidden && !isNodeFilteredOut(n));
  if (nodes.length === 0) {
    return { quadTree: new QuadTree({ x: 0, y: 0, w: 1, h: 1 }), nextIteration: iteration + 1 };
  }

  const n = nodes.length;
  const alpha = Math.max(0.02, 1 - iteration * 0.005);

  // Build quadtree for Barnes-Hut
  const qt = buildQuadTree(nodes);

  const repulsion = (4000 + n * 100) * alpha;
  const springK = 0.01;
  const springLen = (160 + Math.sqrt(n) * 14) * springScale;
  const damping = 0.82;
  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  // Barnes-Hut repulsion (O(n log n))
  for (const node of nodes) {
    applyBarnesHut(node, qt, 0.9, repulsion);
  }

  // Hard collision resolution (only during settling)
  if (alpha > 0.03) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const minD = nodes[i].radius + nodes[j].radius + 10;
        if (dist < minD) {
          const overlap = (minD - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
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

  return { quadTree: qt, nextIteration: iteration + 1 };
}

/**
 * Auto-fit the viewBox to content during initial settling.
 */
export function autoFitViewBox(
  nodes: GraphNode[],
  dimensions: { width: number; height: number },
  viewBox: ViewBox,
  iteration: number,
  isNodeFilteredOut: (node: GraphNode) => boolean,
): ViewBox {
  const visible = nodes.filter(n => !n.hidden && !isNodeFilteredOut(n));
  if (visible.length === 0) return viewBox;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of visible) {
    const pad = node.radius + 70;
    minX = Math.min(minX, node.x - pad);
    minY = Math.min(minY, node.y - pad);
    maxX = Math.max(maxX, node.x + pad);
    maxY = Math.max(maxY, node.y + pad);
  }
  const cW = maxX - minX;
  const cH = maxY - minY;
  const aspect = dimensions.width / dimensions.height;
  let fitW = cW, fitH = cH;
  if (fitW / fitH > aspect) fitH = fitW / aspect;
  else fitW = fitH * aspect;
  const tW = Math.max(fitW, dimensions.width * 0.6);
  const tH = Math.max(fitH, dimensions.height * 0.6);
  const tX = (minX + maxX) / 2 - tW / 2;
  const tY = (minY + maxY) / 2 - tH / 2;
  const t = iteration < 60 ? 0.15 : 0.05;

  return {
    x: viewBox.x + (tX - viewBox.x) * t,
    y: viewBox.y + (tY - viewBox.y) * t,
    w: viewBox.w + (tW - viewBox.w) * t,
    h: viewBox.h + (tH - viewBox.h) * t,
  };
}
