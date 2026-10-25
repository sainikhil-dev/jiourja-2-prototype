/**
 * Reusable facial parts and hands. Every character is assembled from these,
 * so eyes, brows, mouths and hands move the same way across the whole film.
 */
import React, { useId } from 'react';
import { EYE_WHITE, INK, LINE, MOUTH_DARK, TEETH, TONGUE, safeId } from './style';
import { VISEME_SHAPES, type Viseme } from '../audio/visemes';

// ---------------------------------------------------------------- Eye
export const Eye: React.FC<{
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lookX?: number; // -1..1
  lookY?: number;
  open?: number; // 1 open .. 0 closed
  squint?: number; // 0..1 lower lid up (smiling eyes)
  pupil?: number; // pupil radius factor
  lidColor: string;
  lidAngle?: number; // tilt of the upper lid edge (worried/angry), deg
}> = ({ cx, cy, rx, ry, lookX = 0, lookY = 0, open = 1, squint = 0, pupil = 0.42, lidColor, lidAngle = 0 }) => {
  const id = safeId(useId());
  const pr = Math.min(rx, ry) * pupil * 2;
  const px = cx + lookX * (rx - pr * 0.75);
  const py = cy + lookY * (ry - pr * 0.75) * 0.85;
  const closed = 1 - Math.max(0, Math.min(1, open));
  // upper lid comes down from the top; lower lid rises for squint
  const lidBottom = cy - ry + closed * ry * 2 + 1;
  const lowTop = cy + ry - squint * ry * 1.1;
  if (closed > 0.94) {
    // fully closed: a single lash curve reads better than a covered white
    return (
      <path
        d={`M ${cx - rx} ${cy + ry * 0.15} Q ${cx} ${cy + ry * (0.55 - squint * 0.9)} ${cx + rx} ${cy + ry * 0.15}`}
        fill="none"
        stroke={INK}
        strokeWidth={LINE}
        strokeLinecap="round"
      />
    );
  }
  return (
    <g>
      <defs>
        <clipPath id={`e${id}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={EYE_WHITE} />
      <g clipPath={`url(#e${id})`}>
        <circle cx={px} cy={py} r={pr} fill={INK} />
        <circle cx={px + pr * 0.35} cy={py - pr * 0.4} r={pr * 0.32} fill="#fff" />
        {/* upper lid */}
        <g transform={`rotate(${lidAngle} ${cx} ${cy})`}>
          <rect x={cx - rx * 1.6} y={cy - ry * 2.2} width={rx * 3.2} height={lidBottom - (cy - ry * 2.2)} fill={lidColor} />
          <line x1={cx - rx * 1.6} x2={cx + rx * 1.6} y1={lidBottom} y2={lidBottom} stroke={INK} strokeWidth={LINE * 0.9} />
        </g>
        {squint > 0 && (
          <>
            <path d={`M ${cx - rx * 1.4} ${cy + ry * 2} L ${cx - rx * 1.4} ${lowTop + ry * 0.3} Q ${cx} ${lowTop - ry * 0.25} ${cx + rx * 1.4} ${lowTop + ry * 0.3} L ${cx + rx * 1.4} ${cy + ry * 2} Z`} fill={lidColor} />
            <path d={`M ${cx - rx * 1.4} ${lowTop + ry * 0.3} Q ${cx} ${lowTop - ry * 0.25} ${cx + rx * 1.4} ${lowTop + ry * 0.3}`} fill="none" stroke={INK} strokeWidth={LINE * 0.8} />
          </>
        )}
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={LINE * 0.9} />
    </g>
  );
};

// ---------------------------------------------------------------- Brow
/** A tapered brush-stroke brow. side -1 = screen-left brow, +1 = screen-right. */
export const Brow: React.FC<{
  cx: number;
  cy: number;
  w: number;
  t: number;
  side: -1 | 1;
  raise?: number; // -1..1
  angle?: number; // -1 worried (inner end up) .. +1 angry (inner end down)
  arch?: number;
  color?: string;
}> = ({ cx, cy, w, t, side, raise = 0, angle = 0, arch = 0.25, color = INK }) => {
  const y = cy - raise * t * 2.2;
  // inner end is toward the face centre: for the left brow that is +x
  const rot = side === -1 ? angle * 18 : -angle * 18;
  const hw = w / 2;
  const inner = side === -1 ? hw : -hw;
  const outer = -inner;
  const d = `M ${outer} ${t * 0.15}
    Q 0 ${-t * (1.2 + arch * 3)} ${inner} ${-t * 0.2}
    L ${inner} ${t * 0.75}
    Q 0 ${-t * (arch * 3) + t * 0.3} ${outer} ${t * 0.55} Z`;
  return (
    <g transform={`translate(${cx} ${y}) rotate(${rot})`}>
      <path d={d} fill={color} stroke={color} strokeWidth={LINE * 0.5} strokeLinejoin="round" />
    </g>
  );
};

// ---------------------------------------------------------------- Mouth
/**
 * Parametric cartoon mouth. Shapes snap between visemes (as in classic 2D
 * lip-sync) while `smile`/`asym` carry the emotion underneath.
 */
export const Mouth: React.FC<{
  x: number;
  y: number;
  w: number; // half width
  h: number; // max open height
  viseme: Viseme;
  smile?: number; // -1 frown .. 1 grin (corners)
  asym?: number; // smirk: >0 lifts screen-right corner
  jaw?: number; // shock: forces the mouth open when not speaking (0..1)
  lip?: string;
  gold?: boolean; // a gold tooth (the Bill)
  stroke?: number;
}> = ({ x, y, w, h, viseme, smile = 0, asym = 0, jaw = 0, lip, gold = false, stroke = LINE }) => {
  const id = safeId(useId());
  let s = VISEME_SHAPES[viseme];
  if (viseme === 'X' && jaw > 0.05) s = { open: jaw, wide: 0.75 + jaw * 0.1, round: 0.55 * jaw, teeth: 'top', tongue: 0.4 };
  const hw = w * s.wide;
  const cornerLift = smile * w * 0.22;
  const cyL = -cornerLift + asym * w * 0.1;
  const cyR = -cornerLift - asym * w * 0.24;
  const leftY = s.round > 0 ? cyL * (1 - s.round) : cyL;
  const rightY = s.round > 0 ? cyR * (1 - s.round) : cyR;

  if (s.open <= 0.02) {
    // closed mouth: a line whose curve carries the emotion
    const mid = smile * w * 0.16;
    return (
      <g transform={`translate(${x} ${y})`}>
        {s.press && (
          <path d={`M ${-hw * 0.7} ${4} Q 0 ${mid + 13} ${hw * 0.7} ${4}`} fill="none" stroke={INK} strokeWidth={stroke * 0.6} strokeLinecap="round" />
        )}
        <path
          d={`M ${-hw} ${cyL} Q 0 ${mid * 2 + (s.press ? -1 : 0)} ${hw} ${cyR}`}
          fill="none"
          stroke={INK}
          strokeWidth={stroke * (s.press ? 1.25 : 1)}
          strokeLinecap="round"
        />
        {Math.abs(smile) > 0.35 && (
          <>
            <path d={`M ${-hw - 3} ${cyL - 6 * Math.sign(smile)} q 4 ${4 * Math.sign(smile)} 0 ${10 * Math.sign(smile)}`} fill="none" stroke={INK} strokeWidth={stroke * 0.6} strokeLinecap="round" />
            <path d={`M ${hw + 3} ${cyR - 6 * Math.sign(smile)} q -4 ${4 * Math.sign(smile)} 0 ${10 * Math.sign(smile)}`} fill="none" stroke={INK} strokeWidth={stroke * 0.6} strokeLinecap="round" />
          </>
        )}
      </g>
    );
  }

  const open = s.open * h;
  const up = open * (0.16 + s.round * 0.3) + Math.max(0, smile) * 2;
  const down = open * (0.84 - s.round * 0.12);
  const k = 0.55 + s.round * 0.42;
  const path = `M ${-hw} ${leftY}
    C ${-hw * k} ${-up * 1.25} ${hw * k} ${-up * 1.25} ${hw} ${rightY}
    C ${hw * (k + 0.05)} ${down * 1.3 + smile * 2} ${-hw * (k + 0.05)} ${down * 1.3 + smile * 2} ${-hw} ${leftY} Z`;
  const teethH = Math.min(h * 0.2, open * 0.42);
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={`m${id}`}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill={MOUTH_DARK} />
      <g clipPath={`url(#m${id})`}>
        {s.tongue > 0 && (
          <ellipse
            cx={hw * 0.12}
            cy={s.tongueUp ? -up * 0.2 + open * 0.25 : down * 1.0}
            rx={hw * 0.62}
            ry={open * (s.tongueUp ? 0.32 : 0.42) * s.tongue + 2}
            fill={TONGUE}
          />
        )}
        {(s.teeth === 'top' || s.teeth === 'both') && (
          <rect x={-hw * 1.1} y={-up * 1.3 - 4} width={hw * 2.2} height={teethH + up + 4} fill={TEETH} />
        )}
        {s.teeth === 'both' && <rect x={-hw * 1.1} y={down * 1.0 - teethH * 0.7} width={hw * 2.2} height={teethH * 2} fill={TEETH} />}
        {gold && (s.teeth === 'top' || s.teeth === 'both') && (
          <rect x={hw * 0.25} y={-up * 1.3 - 4} width={hw * 0.28} height={teethH + up + 4} fill="#F4C02E" stroke="#B9850F" strokeWidth={1.5} />
        )}
      </g>
      <path d={path} fill="none" stroke={INK} strokeWidth={stroke} strokeLinejoin="round" />
      {lip && <path d={`M ${-hw * 0.6} ${down * 1.1 + 6} Q 0 ${down * 1.1 + 12} ${hw * 0.6} ${down * 1.1 + 6}`} fill="none" stroke={lip} strokeWidth={stroke * 0.8} strokeLinecap="round" />}
    </g>
  );
};

// ---------------------------------------------------------------- Hand
export type HandShape = 'relax' | 'open' | 'fist' | 'point' | 'flat' | 'thumb' | 'hold';

/**
 * Hands are drawn with the wrist at (0,0) pointing down (+y). They are
 * cartoon four-finger hands. `glove` adds a white cuff (the Bill).
 */
export const Hand: React.FC<{ shape: HandShape; fill: string; size?: number; glove?: boolean }> = ({
  shape,
  fill,
  size = 1,
  glove = false,
}) => {
  const sw = LINE * 0.9;
  const common = { fill, stroke: INK, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  let body: React.ReactNode;
  switch (shape) {
    case 'open':
      body = (
        <>
          {/* spread fingers, palm toward camera */}
          <path {...common} d="M -16 4 C -24 14 -24 30 -12 36 L 14 36 C 24 30 22 12 16 4 Z" />
          <path {...common} d="M -14 30 C -26 40 -28 56 -20 58 C -14 60 -10 50 -6 36" />
          <path {...common} d="M -6 34 C -10 52 -8 66 0 66 C 7 66 7 52 4 35" />
          <path {...common} d="M 4 34 C 4 52 8 64 15 62 C 21 60 19 46 12 33" />
          <path {...common} d="M 13 28 C 22 38 30 48 34 44 C 38 40 30 26 18 18" />
          <path {...common} d="M -16 10 C -30 8 -38 18 -34 22 C -30 26 -22 22 -16 22" />
        </>
      );
      break;
    case 'flat':
      body = (
        <>
          <path {...common} d="M -15 2 C -19 20 -18 48 -10 60 C -4 68 8 68 13 58 C 18 46 18 18 15 2 Z" />
          <path d="M -4 40 L -4 60 M 4 42 L 4 62" stroke={INK} strokeWidth={sw * 0.6} strokeLinecap="round" />
          <path {...common} d="M -15 14 C -26 18 -28 30 -20 34 C -15 36 -13 30 -13 26" />
        </>
      );
      break;
    case 'fist':
      body = (
        <>
          <path {...common} d="M -17 2 C -22 12 -22 32 -14 38 C -6 44 10 44 16 36 C 22 28 21 10 16 2 Z" />
          <path d="M -12 30 Q -6 34 0 30 Q 6 34 12 30" fill="none" stroke={INK} strokeWidth={sw * 0.7} strokeLinecap="round" />
          <path {...common} d="M -17 12 C -26 18 -22 30 -12 26" />
        </>
      );
      break;
    case 'point':
      body = (
        <>
          <path {...common} d="M -17 2 C -22 12 -22 30 -14 36 C -6 42 10 42 16 34 C 22 26 21 10 16 2 Z" />
          <path {...common} d="M 4 30 C 5 50 4 66 9 70 C 15 74 19 66 17 50 L 15 28" />
          <path d="M -12 30 Q -6 34 0 30" fill="none" stroke={INK} strokeWidth={sw * 0.7} strokeLinecap="round" />
          <path {...common} d="M -17 12 C -26 18 -22 30 -12 26" />
        </>
      );
      break;
    case 'thumb':
      body = (
        <>
          <path {...common} d="M -17 2 C -22 12 -22 32 -14 38 C -6 44 10 44 16 36 C 22 28 21 10 16 2 Z" />
          <path {...common} d="M -16 18 C -30 14 -40 4 -36 -4 C -32 -10 -24 -2 -16 6" />
          <path d="M -10 22 Q 2 26 14 22 M -10 30 Q 2 34 14 30" fill="none" stroke={INK} strokeWidth={sw * 0.6} strokeLinecap="round" />
        </>
      );
      break;
    case 'hold':
      body = (
        <>
          <path {...common} d="M -16 2 C -22 12 -22 34 -12 40 C -2 46 12 44 17 34 C 22 24 20 10 16 2 Z" />
          <path {...common} d="M -16 14 C -28 20 -30 34 -20 34 C -14 34 -14 26 -12 22" />
        </>
      );
      break;
    default:
      // relax: soft mitten, thumb forward
      body = (
        <>
          <path {...common} d="M -15 2 C -20 14 -20 34 -11 42 C -4 48 8 48 13 40 C 18 30 18 12 15 2 Z" />
          <path {...common} d="M -14 10 C -24 16 -24 30 -16 32 C -11 33 -10 26 -10 22" />
          <path d="M -2 36 L -2 46 M 6 34 L 6 44" stroke={INK} strokeWidth={sw * 0.6} strokeLinecap="round" />
        </>
      );
  }
  return (
    <g transform={`scale(${size})`}>
      {body}
      {glove && <rect x={-20} y={-10} width={40} height={16} rx={7} fill="#fff" stroke={INK} strokeWidth={sw} />}
    </g>
  );
};

// ---------------------------------------------------------------- Sweat
export const Sweat: React.FC<{ x: number; y: number; amount: number; frame: number; seed?: number }> = ({ x, y, amount, frame, seed = 0 }) => {
  if (amount <= 0.02) return null;
  const drops = [0, 1].map((i) => {
    const cycle = 26 + i * 9;
    const p = ((frame + seed * 7 + i * 13) % cycle) / cycle;
    return { dx: i * 26 - 6, dy: p * 34, o: Math.min(1, amount * 1.4) * (p < 0.85 ? 1 : (1 - p) / 0.15), s: 0.7 + 0.3 * amount };
  });
  return (
    <g>
      {drops.map((d, i) => (
        <path
          key={i}
          transform={`translate(${x + d.dx} ${y + d.dy}) scale(${d.s})`}
          d="M 0 -12 C 6 -2 9 4 9 8 C 9 14 4 17 0 17 C -4 17 -9 14 -9 8 C -9 4 -6 -2 0 -12 Z"
          fill="#9FD8F5"
          stroke={INK}
          strokeWidth={3}
          opacity={d.o}
        />
      ))}
    </g>
  );
};
