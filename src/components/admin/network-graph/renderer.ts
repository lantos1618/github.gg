import type { GraphNode, GraphEdge, ViewBox, EdgeFilter } from './types';
import { PALETTE, clamp } from './types';
import { getCachedImage } from './images';

/**
 * Draw a small triangle arrowhead at (x, y) pointing in direction `angle`.
 */
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
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
}

interface RenderOptions {
  canvas: HTMLCanvasElement;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewBox: ViewBox;
  dimensions: { width: number; height: number };
  hoveredNode: string | null;
  selectedNodes: Set<string>;
  searchMatches: Set<string>;
  edgeFilter?: EdgeFilter;
  isNodeFilteredOut: (node: GraphNode) => boolean;
  degrees: Map<string, number>; // pre-computed, not per-frame
}

// WeakMap avoids module-level state issues with HMR/SSR
const ctxCache = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();

/**
 * Full Canvas2D render pass — optimized for 3k+ nodes / 20k+ edges.
 */
export function renderGraph(opts: RenderOptions) {
  const { canvas, nodes, edges, viewBox: vb, dimensions, hoveredNode, selectedNodes, searchMatches, edgeFilter, isNodeFilteredOut, degrees } = opts;

  // Cache context per canvas element
  let ctx = ctxCache.get(canvas);
  if (!ctx) {
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;
    ctxCache.set(canvas, ctx);
  }

  const dpr = window.devicePixelRatio || 1;
  const { width, height } = dimensions;

  // Only resize canvas when dimensions actually change (resizing clears + is expensive)
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const scaleX = width / vb.w;
  const scaleY = height / vb.h;
  const scale = Math.min(scaleX, scaleY);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-vb.x, -vb.y);

  // Viewport bounds in world coordinates (for culling)
  const vpLeft = vb.x;
  const vpTop = vb.y;
  const vpRight = vb.x + vb.w;
  const vpBottom = vb.y + vb.h;
  const vpPad = 100;

  // degrees passed in pre-computed; build node map once
  const nMap = new Map<string, GraphNode>();
  for (let i = 0; i < nodes.length; i++) nMap.set(nodes[i].id, nodes[i]);
  const totalEdges = edges.length;

  // --- Draw Edges (batched by style) ---
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // At very high edge counts, skip non-hovered basic edges to maintain fps
  const edgeBudget = 8000;
  const skipBasicEdges = totalEdges > edgeBudget && !hoveredNode;
  // Stable sampling: use edge.rand so the SAME edges are hidden every frame (no flicker)
  const sampleThreshold = skipBasicEdges ? edgeBudget / totalEdges : 1;

  // Collect hovered edges to draw on top
  interface EdgePath { startX: number; startY: number; cpx: number; cpy: number; endX: number; endY: number }
  const hoveredEdges: { edge: GraphEdge; path: EdgePath; isMutual: boolean; isSemantic: boolean }[] = [];

  // Batch: basic edges (one beginPath + stroke)
  ctx.beginPath();
  ctx.strokeStyle = PALETTE.edge;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.25;
  let basicCount = 0;

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

    // Viewport culling — skip if both endpoints are off-screen
    if (src.x < vpLeft - vpPad && tgt.x < vpLeft - vpPad) continue;
    if (src.x > vpRight + vpPad && tgt.x > vpRight + vpPad) continue;
    if (src.y < vpTop - vpPad && tgt.y < vpTop - vpPad) continue;
    if (src.y > vpBottom + vpPad && tgt.y > vpBottom + vpPad) continue;

    const hovered = hoveredNode === edge.source || hoveredNode === edge.target;
    const isMutualEdge = edge.direction === 'mutual' || ((degrees.get(edge.source) || 0) >= 2 && (degrees.get(edge.target) || 0) >= 2);
    const isSemantic = edge.type === 'semantic';

    // Compute path
    const curvature = isSemantic ? 0.15 : isMutualEdge ? 0.12 : 0.06;
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
    const cpx = mx - edy * curvature;
    const cpy = my + edx * curvature;

    // Hovered/mutual/semantic edges drawn separately with unique styles
    if (hovered || isMutualEdge || isSemantic) {
      hoveredEdges.push({ edge, path: { startX, startY, cpx, cpy, endX, endY }, isMutual: isMutualEdge, isSemantic });
      continue;
    }

    // Stable sampling: skip edges with high rand value (same edges hidden every frame)
    if (skipBasicEdges && edge.rand > sampleThreshold) continue;

    // Add to batched basic path
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpx, cpy, endX, endY);
    basicCount++;
  }
  if (basicCount > 0) ctx.stroke();

  // Draw mutual edges batched
  ctx.beginPath();
  ctx.strokeStyle = PALETTE.edgeMutual;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.4;
  let mutualCount = 0;
  for (const { isMutual, isSemantic, path } of hoveredEdges) {
    if (isMutual && !isSemantic) {
      ctx.moveTo(path.startX, path.startY);
      ctx.quadraticCurveTo(path.cpx, path.cpy, path.endX, path.endY);
      mutualCount++;
    }
  }
  if (mutualCount > 0) ctx.stroke();

  // Draw semantic edges batched (dashed)
  ctx.beginPath();
  ctx.strokeStyle = PALETTE.edgeSemantic;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([4, 3]);
  let semanticCount = 0;
  for (const { isSemantic, path } of hoveredEdges) {
    if (isSemantic) {
      ctx.moveTo(path.startX, path.startY);
      ctx.quadraticCurveTo(path.cpx, path.cpy, path.endX, path.endY);
      semanticCount++;
    }
  }
  if (semanticCount > 0) ctx.stroke();
  ctx.setLineDash([]);

  // Draw hovered edges individually (need unique highlight style)
  for (const { edge, path, isSemantic } of hoveredEdges) {
    const hovered = hoveredNode === edge.source || hoveredNode === edge.target;
    if (!hovered) continue;
    ctx.beginPath();
    ctx.moveTo(path.startX, path.startY);
    ctx.quadraticCurveTo(path.cpx, path.cpy, path.endX, path.endY);
    ctx.strokeStyle = isSemantic ? PALETTE.edgeSemanticActive : PALETTE.edgeActive;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    if (isSemantic) ctx.setLineDash([4, 3]);
    else ctx.setLineDash([]);
    ctx.stroke();

    // Arrowheads for hovered edges
    const dist = Math.sqrt((path.endX - path.startX) ** 2 + (path.endY - path.startY) ** 2);
    if (dist * scale > 20) {
      const isMutualEdge = edge.direction === 'mutual';
      const arrowColor = PALETTE.edgeActive;
      ctx.globalAlpha = 1;
      if (edge.direction === 'following' || edge.direction === 'mutual' || edge.type === 'social') {
        const tx = 2 * (path.endX - path.cpx);
        const ty = 2 * (path.endY - path.cpy);
        drawArrow(ctx, path.endX, path.endY, Math.atan2(ty, tx), arrowColor);
      }
      if (edge.direction === 'follower' || isMutualEdge) {
        const tx = 2 * (path.cpx - path.startX);
        const ty = 2 * (path.cpy - path.startY);
        drawArrow(ctx, path.startX, path.startY, Math.atan2(ty, tx) + Math.PI, arrowColor);
      }
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // --- Draw Nodes ---
  ctx.imageSmoothingEnabled = scale > 0.5;
  const MAX_LABELS = 80;
  let labelCount = 0;

  for (const node of nodes) {
    if (node.hidden || isNodeFilteredOut(node)) continue;

    // Viewport culling for nodes
    if (node.x + node.radius < vpLeft - vpPad || node.x - node.radius > vpRight + vpPad ||
        node.y + node.radius < vpTop - vpPad || node.y - node.radius > vpBottom + vpPad) continue;

    const hovered = hoveredNode === node.id;
    const selected = selectedNodes.has(node.id);
    const deg = degrees.get(node.id) || 0;
    const isMutualNode = !node.isSeed && deg >= 2;
    const isSearchHit = searchMatches.has(node.id);

    ctx.save();
    ctx.translate(node.x, node.y);

    // Search pulse ring
    if (isSearchHit) {
      ctx.beginPath();
      ctx.arc(0, 0, node.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.searchHit;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Selection glow
    if (selected) {
      ctx.beginPath();
      ctx.arc(0, 0, node.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.ringSelected;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Screen-space radius determines what details to render per node
    const screenR = node.radius * scale;
    const hasHighFollowers = node.user && node.user.followers >= 500;
    const showAvatar = screenR >= 4 || hovered || node.isSeed || hasHighFollowers;
    const showRing = screenR >= 3 || hasHighFollowers;
    const showLabel = screenR >= 6 || hasHighFollowers || (screenR >= 4 && (isMutualNode || hovered || node.isSeed));
    const showBadge = screenR >= 5;

    if (screenR < 2 && !hovered && !node.isSeed && !hasHighFollowers) {
      // Tiny on screen — just a dot
      const dotR = Math.max(node.radius * 0.4, 2);
      ctx.beginPath();
      ctx.arc(0, 0, dotR, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
    } else {
      // Filled circle
      ctx.beginPath();
      ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Avatar
      if (showAvatar) {
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
            // Image is pre-rendered as circle in images.ts — no ctx.clip() needed
            ctx.drawImage(img, -node.radius, -node.radius, node.radius * 2, node.radius * 2);
          }
        }
      }

      // Border ring
      if (showRing) {
        let ringColor: string = PALETTE.ring;
        if (isSearchHit) ringColor = PALETTE.searchHit;
        else if (selected) ringColor = PALETTE.ringSelected;
        else if (node.isSeed) ringColor = PALETTE.seed;
        else if (hovered) ringColor = '#111';
        else if (deg >= 2) ringColor = PALETTE.ringMutual;
        else if (node.isExpanded) ringColor = PALETTE.ringExpanded;

        let ringWidth = 1.5;
        if (isSearchHit || selected) ringWidth = 3;
        else if (hovered || node.isSeed) ringWidth = 2.5;
        else if (deg >= 2 || node.isExpanded) ringWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, node.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = ringWidth;
        ctx.stroke();
      }

      // Loading spinner
      if (node.isLoading) {
        ctx.beginPath();
        ctx.arc(0, 0, node.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.ringLoading;
        ctx.lineWidth = 2;
        ctx.setLineDash([node.radius * 2, node.radius * 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Connection count badge
      if (showBadge && isMutualNode && !hovered) {
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

      // Expanded dot
      if (showBadge && node.isExpanded && !node.isSeed && !isMutualNode) {
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

      // Labels (capped to prevent fillText bottleneck)
      if (showLabel && labelCount < MAX_LABELS) {
        labelCount++;
        const isGG = node.color === PALETTE.ggProfile;
        ctx.fillStyle = hovered ? PALETTE.label : isGG ? PALETTE.ggProfile : PALETTE.labelMuted;
        ctx.font = `${node.isSeed || hovered || isMutualNode || isGG ? 600 : 400} ${node.isSeed ? 11 : 9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = node.id.length > 14 ? node.id.slice(0, 12) + '\u2026' : node.id;
        ctx.fillText(label, 0, node.radius + 14);

        if ((isMutualNode || hovered) && !node.isSeed && node.user) {
          ctx.fillStyle = PALETTE.labelMuted;
          ctx.font = '8px sans-serif';
          ctx.fillText(`${node.user.followers.toLocaleString()} followers`, 0, node.radius + 24);
        }
      }
    }
    ctx.restore();
  }

  // --- Draw Hover Tooltip ---
  if (hoveredNode) {
    const node = nMap.get(hoveredNode);
    if (node && !node.isSeed && node.user) {
      const deg = degrees.get(node.id) || 0;
      const isMutualNode = deg >= 2;
      ctx.save();
      ctx.translate(node.x, node.y + node.radius + (isMutualNode ? 32 : 20));

      const hasSimilarity = node.user.similarity != null;
      const hasSkills = node.user.topSkills && node.user.topSkills.length > 0;
      const bioText = node.user.bio || (hasSimilarity ? node.user.archetype : null);
      const extraLines = (hasSimilarity ? 1 : 0) + (hasSkills ? 1 : 0);
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
      ctx.fillText(
        `${node.user.followers.toLocaleString()} followers \u00B7 ${node.user.publicRepos} repos${hasSimilarity ? ` \u00B7 ${node.user.similarity}% match` : ` \u00B7 ${deg} links`}`,
        0, 26
      );

      if (bioText) {
        ctx.fillStyle = '#aaa';
        ctx.font = '8px sans-serif';
        ctx.fillText(bioText.length > 40 ? bioText.slice(0, 38) + '\u2026' : bioText, 0, 40);
      }

      if (hasSkills) {
        ctx.fillStyle = PALETTE.edgeSemantic;
        ctx.font = '7.5px sans-serif';
        ctx.fillText(node.user.topSkills!.slice(0, 3).join(' \u00B7 '), 0, bioText ? 52 : 40);
      }

      if (!node.isExpanded && !node.isLoading) {
        ctx.fillStyle = '#bbb';
        ctx.font = 'italic 7.5px sans-serif';
        ctx.fillText('double-click to explore network', 0, cardHeight - 4);
      }

      ctx.restore();
    }
  }

  ctx.restore();
}
