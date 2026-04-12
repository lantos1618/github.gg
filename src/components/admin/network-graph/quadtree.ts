import type { GraphNode } from './types';

/**
 * QuadTree for Barnes-Hut O(n log n) force approximation and O(log n) hit testing.
 * Stores mass/center-of-mass for gravitational approximation.
 */
export class QuadTree {
  bounds: { x: number; y: number; w: number; h: number };
  mass = 0;
  cx = 0;
  cy = 0;
  node: GraphNode | null = null;
  children: QuadTree[] | null = null;

  constructor(bounds: { x: number; y: number; w: number; h: number }) {
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

  private subdivide() {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    this.children = [
      new QuadTree({ x, y, w: hw, h: hh }),
      new QuadTree({ x: x + hw, y, w: hw, h: hh }),
      new QuadTree({ x, y: y + hh, w: hw, h: hh }),
      new QuadTree({ x: x + hw, y: y + hh, w: hw, h: hh }),
    ];
  }

  private insertIntoChildren(node: GraphNode) {
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

/**
 * Barnes-Hut repulsion: approximates distant node clusters as single mass.
 * theta controls accuracy (0.9 = fast, 0.5 = precise).
 */
export function applyBarnesHut(node: GraphNode, qt: QuadTree, theta: number, repulsion: number) {
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

/**
 * O(log n) point query: find node under (x, y) within padding radius.
 */
export function hitTestQuadTree(qt: QuadTree, x: number, y: number, padding: number): GraphNode | null {
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

/**
 * Build a quadtree from an array of visible nodes.
 */
export function buildQuadTree(nodes: GraphNode[]): QuadTree {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  }
  const pad = 100;
  const qt = new QuadTree({
    x: minX - pad,
    y: minY - pad,
    w: (maxX - minX) + pad * 2,
    h: (maxY - minY) + pad * 2,
  });
  for (const node of nodes) qt.insert(node);
  return qt;
}
