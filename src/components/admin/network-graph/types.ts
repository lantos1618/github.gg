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
export type EdgeDirection = 'following' | 'follower' | 'mutual' | null;

export interface EdgeFilter {
  following: boolean;
  followers: boolean;
  semantic: boolean;
}

export interface GraphNode {
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

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  similarity?: number;
  direction?: EdgeDirection;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PALETTE = {
  seed: '#111',
  ggProfile: '#22863a',
  noProfile: '#94a3b8',
  edge: '#e2e8f0',
  edgeActive: '#64748b',
  edgeMutual: '#3b82f6',
  edgeSemantic: '#8b5cf6',
  edgeSemanticActive: '#7c3aed',
  label: '#333',
  labelMuted: '#999',
  labelBg: 'rgba(255,255,255,0.96)',
  ring: '#cbd5e1',
  ringExpanded: '#111',
  ringMutual: '#3b82f6',
  ringSemantic: '#8b5cf6',
  ringSelected: '#2563eb',
  ringLoading: '#3b82f6',
  searchHit: '#ef4444',
  bg: '#fafafa',
} as const satisfies Record<string, string>;

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function getNodeRadius(followers: number, isSeed: boolean): number {
  if (isSeed) return 35;
  const MIN = 8;
  const MAX = 32;
  if (followers <= 0) return MIN;
  const scale = Math.log10(followers + 1) / Math.log10(1_000_000);
  return MIN + (MAX - MIN) * Math.min(scale, 1);
}

export function getDegreeCounts(edges: GraphEdge[]): Map<string, number> {
  const c = new Map<string, number>();
  for (const e of edges) {
    c.set(e.source, (c.get(e.source) || 0) + 1);
    c.set(e.target, (c.get(e.target) || 0) + 1);
  }
  return c;
}
