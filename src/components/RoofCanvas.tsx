import { useMemo, useRef, useState } from 'react';
import type { Point, RoofAnalysis, RoofAssessment, ShadeObstacle } from '@/types';
import { pointInPolygon, shadowsAt } from '@/engine/roof';
import { midMonthDoy } from '@/engine/solar';
import { cx } from '@/lib/format';

export type CanvasMode = 'select' | 'draw';

const OB_COLORS: Record<ShadeObstacle['kind'], string> = {
  water_tank: '#2563eb',
  ac_unit: '#64748b',
  skylight: '#bae6fd',
  access_path: '#cbd5e1',
  neighbour_building: '#475569',
  tree: '#16a34a',
  other: '#a16207',
};

/**
 * Top-down roof planning canvas (metres). Supports drawing a polygon outline,
 * dragging vertices and obstacles, and visualising panel layout and the
 * simplified geometric shadows for a chosen month and time of day.
 */
export function RoofCanvas({
  roof,
  analysis,
  onChange,
  mode,
  onModeDone,
  selectedId,
  onSelect,
  month,
  hour,
  heatmap,
}: {
  roof: RoofAssessment;
  analysis: RoofAnalysis;
  onChange: (r: RoofAssessment) => void;
  mode: CanvasMode;
  onModeDone: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  month: number;
  hour: number;
  heatmap: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ type: 'vertex' | 'obstacle'; idx?: number; id?: string; dx: number; dy: number } | null>(null);
  const [drawPts, setDrawPts] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);

  const box = useMemo(() => {
    const pts: Point[] = [...roof.polygon, ...drawPts, ...roof.obstacles.flatMap((o) => [{ x: o.x, y: o.y }, { x: o.x + o.w, y: o.y + o.h }])];
    if (pts.length === 0) return { x: -2, y: -2, w: 34, h: 24 };
    const minX = Math.min(...pts.map((p) => p.x), 0) - 3;
    const minY = Math.min(...pts.map((p) => p.y), 0) - 3;
    const maxX = Math.max(...pts.map((p) => p.x), 20) + 3;
    const maxY = Math.max(...pts.map((p) => p.y), 12) + 3;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    // Only re-fit when geometry count changes, so dragging does not rescale the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roof.polygon.length, roof.obstacles.length, drawPts.length, mode]);

  const shadows = useMemo(() => shadowsAt(roof, midMonthDoy(month), hour), [roof, month, hour]);
  const panelShade = useMemo(
    () =>
      analysis.panels.map((p) => {
        const c = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
        let sev = 0;
        for (const sh of shadows.polys) if (sh.o.severity > sev && pointInPolygon(c, sh.poly)) sev = sh.o.severity;
        return sev;
      }),
    [analysis.panels, shadows],
  );

  const toLocal = (e: React.PointerEvent | React.MouseEvent): Point => {
    const el = svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = el.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  };

  const finishDraw = () => {
    if (drawPts.length >= 3) onChange({ ...roof, polygon: drawPts, method: 'staff_drawn' });
    setDrawPts([]);
    onModeDone();
  };

  const onBgClick = (e: React.MouseEvent) => {
    if (mode === 'draw') {
      const p = toLocal(e);
      if (drawPts.length >= 3 && Math.hypot(p.x - drawPts[0].x, p.y - drawPts[0].y) < Math.max(0.8, box.w / 60)) return finishDraw();
      setDrawPts([...drawPts, p]);
    } else onSelect(null);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = toLocal(e);
    if (mode === 'draw') setHover(p);
    if (!drag) return;
    if (drag.type === 'vertex' && drag.idx != null) {
      const poly = roof.polygon.map((v, i) => (i === drag.idx ? p : v));
      onChange({ ...roof, polygon: poly, method: roof.method === 'manual' || roof.method === 'map' ? 'staff_drawn' : roof.method });
    } else if (drag.type === 'obstacle' && drag.id) {
      onChange({ ...roof, obstacles: roof.obstacles.map((o) => (o.id === drag.id ? { ...o, x: Math.round((p.x - drag.dx) * 10) / 10, y: Math.round((p.y - drag.dy) * 10) / 10 } : o)) });
    }
  };

  const sun = shadows.sun;
  const sunUp = sun.elevationDeg > 0;
  const fs = Math.max(0.6, box.w / 45);
  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        className={cx('h-[340px] w-full touch-none select-none rounded-xl bg-slate-50 ring-1 ring-slate-200 sm:h-[460px]', mode === 'draw' && 'cursor-crosshair')}
        onClick={onBgClick}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
        onDoubleClick={() => mode === 'draw' && finishDraw()}
        role="img"
        aria-label="Roof planning canvas"
      >
        <defs>
          <pattern id="grid1" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#e2e8f0" strokeWidth={0.03} />
          </pattern>
          <pattern id="grid5" width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="url(#grid1)" />
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#cbd5e1" strokeWidth={0.05} />
          </pattern>
        </defs>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#grid5)" />
        {roof.polygon.length >= 3 && <polygon points={roof.polygon.map((p) => `${p.x},${p.y}`).join(' ')} fill="#e6edf6" stroke="#092348" strokeWidth={0.12} />}
        {/* panels */}
        {analysis.panels.map((p, i) => {
          const f = heatmap ? p.annualShadeFraction : panelShade[i];
          const fill = f > 0.5 ? '#334155' : f > 0.15 ? '#64748b' : f > 0 ? '#1e5aa8' : '#087AD1';
          return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={heatmap ? `rgba(220,38,38,${Math.min(0.9, 0.1 + f * 2.5)})` : fill} stroke="#ffffff" strokeWidth={0.04} opacity={0.9} />;
        })}
        {/* shadows */}
        {!heatmap &&
          shadows.polys.map((s, i) => <polygon key={i} points={s.poly.map((p) => `${p.x},${p.y}`).join(' ')} fill="#0f172a" opacity={0.28 * s.o.severity} pointerEvents="none" />)}
        {/* obstacles */}
        {roof.obstacles.map((o) => (
          <g key={o.id}>
            <rect
              x={o.x}
              y={o.y}
              width={o.w}
              height={o.h}
              fill={OB_COLORS[o.kind]}
              opacity={o.kind === 'skylight' || o.kind === 'access_path' ? 0.85 : 0.9}
              stroke={selectedId === o.id ? '#F1B650' : '#0f172a'}
              strokeWidth={selectedId === o.id ? 0.2 : 0.05}
              strokeDasharray={o.onRoof ? undefined : '0.3 0.2'}
              className={mode === 'select' ? 'cursor-move' : ''}
              onPointerDown={(e) => {
                if (mode !== 'select') return;
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const p = toLocal(e);
                onSelect(o.id);
                setDrag({ type: 'obstacle', id: o.id, dx: p.x - o.x, dy: p.y - o.y });
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <text x={o.x + o.w / 2} y={o.y + o.h / 2} fontSize={fs * 0.8} textAnchor="middle" dominantBaseline="middle" fill={o.kind === 'skylight' || o.kind === 'access_path' ? '#0f172a' : '#fff'} pointerEvents="none">
              {o.label.split(' ')[0]}
              {o.heightM > 0 ? ` ${o.heightM}m` : ''}
            </text>
          </g>
        ))}
        {/* vertices */}
        {mode === 'select' &&
          roof.polygon.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={Math.max(0.3, box.w / 90)}
              fill="#fff"
              stroke="#12B8A6"
              strokeWidth={0.12}
              className="cursor-grab"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDrag({ type: 'vertex', idx: i, dx: 0, dy: 0 });
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ))}
        {/* drawing */}
        {mode === 'draw' && drawPts.length > 0 && (
          <>
            <polyline points={[...drawPts, ...(hover ? [hover] : [])].map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(18,184,166,0.15)" stroke="#12B8A6" strokeWidth={0.12} />
            {drawPts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 0.45 : 0.3} fill={i === 0 ? '#F1B650' : '#12B8A6'} />
            ))}
          </>
        )}
        {/* compass + sun */}
        <g transform={`translate(${box.x + box.w - fs * 2.2}, ${box.y + fs * 2.2})`}>
          <circle r={fs * 1.6} fill="white" stroke="#cbd5e1" strokeWidth={0.05} />
          <text y={-fs * 0.6} fontSize={fs * 0.9} textAnchor="middle" fill="#092348" fontWeight="bold">
            N
          </text>
          <path d={`M 0 ${-fs * 0.3} L ${fs * 0.35} ${fs * 0.8} L 0 ${fs * 0.5} L ${-fs * 0.35} ${fs * 0.8} Z`} fill="#092348" />
          {sunUp && (
            <circle cx={Math.sin((sun.azimuthDeg * Math.PI) / 180) * fs * 1.6} cy={-Math.cos((sun.azimuthDeg * Math.PI) / 180) * fs * 1.6} r={fs * 0.4} fill="#F1B650" stroke="#c98d24" strokeWidth={0.05} />
          )}
        </g>
        {/* scale bar */}
        <g transform={`translate(${box.x + 1}, ${box.y + box.h - 1})`}>
          <line x1={0} x2={5} y1={0} y2={0} stroke="#092348" strokeWidth={0.12} />
          <text x={2.5} y={-0.4} fontSize={fs * 0.8} textAnchor="middle" fill="#092348">
            5 m
          </text>
        </g>
      </svg>
      {mode === 'draw' && (
        <div className="absolute left-2 top-2 rounded-lg bg-navy/90 px-3 py-2 text-xs text-white">
          Click to add corners ({drawPts.length}). Click the first (amber) point or double-click to finish.
          <button className="ml-2 font-semibold text-amber underline" onClick={(e) => (e.stopPropagation(), finishDraw())}>
            Finish
          </button>
          <button className="ml-2 underline" onClick={(e) => (e.stopPropagation(), setDrawPts([]), onModeDone())}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
