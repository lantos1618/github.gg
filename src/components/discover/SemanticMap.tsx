'use client';

import { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { OrthographicView } from '@deck.gl/core';
import type { PickingInfo } from '@deck.gl/core';

export type SemanticMapPoint = {
  username: string;
  x: number;
  y: number;
  archetype: string | null;
  confidence: number | null;
  topSkills: string[];
  avatar?: string | null;
};

interface SemanticMapProps {
  points: SemanticMapPoint[];
  height?: number | string;
  onClickNode?: (username: string) => void;
  showLegend?: boolean;
  /** If set, after the user clicks this many unique nodes, onBudgetExceeded is called instead of onClickNode. */
  clickBudget?: number;
  onBudgetExceeded?: () => void;
}

const ARCHETYPE_COLORS: Record<string, [number, number, number]> = {
  'Production Builder': [59, 130, 246],
  'Full-Stack Generalist': [16, 185, 129],
  'Domain Specialist': [168, 85, 247],
  'Research & Innovation': [236, 72, 153],
  'Open Source Contributor': [245, 158, 11],
  'Early Career Explorer': [14, 165, 233],
};
const UNKNOWN_COLOR: [number, number, number] = [148, 163, 184];

function colorFor(archetype: string | null): [number, number, number, number] {
  const rgb = (archetype && ARCHETYPE_COLORS[archetype]) || UNKNOWN_COLOR;
  return [rgb[0], rgb[1], rgb[2], 200];
}

function radiusFor(confidence: number | null): number {
  const c = confidence ?? 40;
  return 4 + (c / 100) * 8;
}

export function SemanticMap({
  points,
  height = 500,
  onClickNode,
  showLegend = true,
  clickBudget,
  onBudgetExceeded,
}: SemanticMapProps) {
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(Object.keys(ARCHETYPE_COLORS).concat('Unknown'))
  );
  const [hovered, setHovered] = useState<{ point: SemanticMapPoint; x: number; y: number } | null>(null);
  const [clicked, setClicked] = useState<Set<string>>(() => new Set());

  const visible = useMemo(
    () => points.filter(p => enabled.has(p.archetype ?? 'Unknown')),
    [points, enabled]
  );

  const bounds = useMemo(() => {
    if (points.length === 0) return { cx: 0, cy: 0, zoom: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const extent = Math.max(maxX - minX, maxY - minY, 1);
    const zoom = Math.log2(800 / (extent * 1.2));
    return { cx, cy, zoom };
  }, [points]);

  const layer = new ScatterplotLayer<SemanticMapPoint>({
    id: 'semantic-map',
    data: visible,
    pickable: true,
    getPosition: (p: SemanticMapPoint) => [p.x, p.y],
    getRadius: (p: SemanticMapPoint) => radiusFor(p.confidence),
    radiusUnits: 'pixels',
    radiusMinPixels: 3,
    radiusMaxPixels: 20,
    getFillColor: (p: SemanticMapPoint) => colorFor(p.archetype),
    getLineColor: [15, 23, 42, 120],
    lineWidthUnits: 'pixels',
    getLineWidth: 1,
    stroked: true,
    onHover: (info: PickingInfo<SemanticMapPoint>) => {
      setHovered(info.object ? { point: info.object, x: info.x, y: info.y } : null);
    },
    updateTriggers: { getFillColor: enabled },
  });

  const toggle = (name: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleClick = (info: PickingInfo<SemanticMapPoint>) => {
    if (!info.object) return;
    const username = info.object.username;
    if (clickBudget != null) {
      const nextClicked = new Set(clicked);
      nextClicked.add(username);
      if (nextClicked.size > clickBudget) {
        onBudgetExceeded?.();
        return;
      }
      setClicked(nextClicked);
    }
    onClickNode?.(username);
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    background: '#f8fafc',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  };

  if (points.length === 0) {
    return (
      <div style={containerStyle} className="flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-sm text-slate-600 mb-1">No projections yet.</p>
          <p className="text-xs text-slate-500">
            Run <code className="px-1 bg-slate-100 rounded">bun run umap:compute</code> to generate the semantic map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {showLegend && (
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur p-3 rounded-md shadow-sm border text-xs space-y-1.5 max-w-xs">
          <div className="font-medium text-slate-700 mb-1.5">Archetypes</div>
          {Object.entries(ARCHETYPE_COLORS).map(([name, [r, g, b]]) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabled.has(name)}
                onChange={() => toggle(name)}
                className="w-3.5 h-3.5"
              />
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
              <span className="text-slate-700">{name}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t mt-1.5">
            <input
              type="checkbox"
              checked={enabled.has('Unknown')}
              onChange={() => toggle('Unknown')}
              className="w-3.5 h-3.5"
            />
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${UNKNOWN_COLOR.join(',')})` }} />
            <span className="text-slate-500">Unclassified</span>
          </label>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10 text-[11px] text-slate-500 bg-white/80 backdrop-blur px-2 py-1 rounded border">
        {visible.length.toLocaleString()} / {points.length.toLocaleString()} developers · dot size = confidence
      </div>

      <DeckGL
        views={new OrthographicView({ id: 'ortho' })}
        initialViewState={{ target: [bounds.cx, bounds.cy, 0], zoom: bounds.zoom }}
        controller={true}
        layers={[layer]}
        onClick={handleClick}
        style={{ position: 'absolute', inset: '0' }}
      />

      {hovered && (
        <div
          className="pointer-events-none absolute z-20 bg-white border rounded-md shadow-lg px-3 py-2 text-xs"
          style={{ left: hovered.x + 12, top: hovered.y + 12, maxWidth: 260 }}
        >
          <div className="flex items-center gap-2">
            <img
              src={hovered.point.avatar ?? `https://github.com/${hovered.point.username}.png?size=40`}
              alt=""
              className="w-7 h-7 rounded-full"
            />
            <div>
              <div className="font-semibold text-slate-900">{hovered.point.username}</div>
              {hovered.point.archetype && (
                <div className="text-slate-600">{hovered.point.archetype}</div>
              )}
            </div>
          </div>
          {hovered.point.topSkills.length > 0 && (
            <div className="mt-1.5 text-slate-600">{hovered.point.topSkills.join(' · ')}</div>
          )}
          {hovered.point.confidence !== null && (
            <div className="mt-1 text-slate-500 text-[11px]">Confidence: {hovered.point.confidence}</div>
          )}
        </div>
      )}
    </div>
  );
}
