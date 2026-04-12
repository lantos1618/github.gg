import type { GraphNode, GraphEdge, ViewBox, EdgeFilter } from './types';
import { PALETTE, clamp, getDegreeCounts } from './types';
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
}

/**
 * Full Canvas2D render pass. Called every frame via requestAnimationFrame.
 */
export function renderGraph(opts: RenderOptions) {
  const { canvas, nodes, edges, viewBox: vb, dimensions, hoveredNode, selectedNodes, searchMatches, edgeFilter, isNodeFilteredOut } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const { width, height } = dimensions;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const scaleX = width / vb.w;
  const scaleY = height / vb.h;
  const scale = Math.min(scaleX, scaleY);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-vb.x, -vb.y);

  // LOD thresholds
  const isFar = vb.w > 5000;
  const isMedium = vb.w > 1000 && vb.w <= 5000;
  const isClose = vb.w <= 1000;

  const degrees = getDegreeCounts(edges);
  const nMap = new Map(nodes.map(n => [n.id, n]));

  // --- Draw Edges ---
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
    const isMutualEdge = edge.direction === 'mutual' || ((degrees.get(edge.source) || 0) >= 2 && (degrees.get(edge.target) || 0) >= 2);
    const isSemantic = edge.type === 'semantic';
    const dist = Math.sqrt((tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2);
    const opacity = hovered ? 0.7 : isSemantic ? 0.35 : isMutualEdge ? 0.4 : clamp(1 - dist / 1200, 0.15, 0.6);

    const strokeColor = hovered
      ? (isSemantic ? PALETTE.edgeSemanticActive : PALETTE.edgeActive)
      : isSemantic ? PALETTE.edgeSemantic
      : isMutualEdge ? PALETTE.edgeMutual
      : PALETTE.edge;

    // Compute shortened curved path (stops at node radius so arrows are visible)
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

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpx, cpy, endX, endY);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = hovered ? 1.5 : isSemantic ? 1 : isMutualEdge ? 1.2 : 0.8;
    ctx.globalAlpha = opacity;
    if (isSemantic) ctx.setLineDash([4, 3]);
    else ctx.setLineDash([]);
    ctx.stroke();

    // Arrowheads (skip at far zoom)
    if (!isFar) {
      const arrowColor = hovered ? PALETTE.edgeActive : isMutualEdge ? PALETTE.edgeMutual : '#bbb';
      if (edge.direction === 'following' || edge.direction === 'mutual' || edge.type === 'social') {
        const t = 1;
        const tx = 2 * (1 - t) * (cpx - startX) + 2 * t * (endX - cpx);
        const ty = 2 * (1 - t) * (cpy - startY) + 2 * t * (endY - cpy);
        drawArrow(ctx, endX, endY, Math.atan2(ty, tx), arrowColor);
      }
      if (edge.direction === 'follower' || edge.direction === 'mutual') {
        const t = 0;
        const tx = 2 * (1 - t) * (cpx - startX) + 2 * t * (endX - cpx);
        const ty = 2 * (1 - t) * (cpy - startY) + 2 * t * (endY - cpy);
        drawArrow(ctx, startX, startY, Math.atan2(ty, tx) + Math.PI, arrowColor);
      }
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // --- Draw Nodes ---
  for (const node of nodes) {
    if (node.hidden || isNodeFilteredOut(node)) continue;
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

    if (isFar) {
      // LOD: far zoom — just a dot
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
    } else {
      // Filled circle
      ctx.beginPath();
      ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Avatar (close zoom or hovered/seed)
      if (isClose || hovered || node.isSeed) {
        if (node.isSeed && node.id.includes('.')) {
          // GG label for non-GitHub seeds
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
            ctx.beginPath();
            ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, -node.radius, -node.radius, node.radius * 2, node.radius * 2);
            ctx.restore();
          }
        }
      }

      // Border ring
      let ringColor: string = PALETTE.ring;
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
      if (isMutualNode && !hovered) {
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
      if (node.isExpanded && !node.isSeed && !isMutualNode) {
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

      // Labels (close zoom, or medium zoom for important nodes)
      if (isClose || (isMedium && (isMutualNode || hovered || node.isSeed))) {
        ctx.fillStyle = hovered ? PALETTE.label : PALETTE.labelMuted;
        ctx.font = `${node.isSeed || hovered || isMutualNode ? 600 : 400} ${node.isSeed ? 11 : 9}px sans-serif`;
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
        ctx.fillText('click to explore network', 0, cardHeight - 4);
      }

      ctx.restore();
    }
  }

  ctx.restore();
}
