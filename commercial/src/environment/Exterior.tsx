/**
 * Exterior of Khurana Engineering Works — a saw-tooth roof industrial shed in
 * a small industrial estate. Used for the rooftop-solar transformation.
 *
 *  `panels`  0..N: how many panels have popped in (fractional = popping)
 *  `cable`   0..1: the cable run from the array down to the inverter
 *  `clean`   0..1: a cleaning brush sweeping the array (maintenance)
 *  `flow`    0..1: energy pulses flowing into the building
 */
import React from 'react';
import { INK, LINE } from '../characters/style';
import { FONT } from '../fonts';
import { ease } from '../rig/keyframes';

const ROWS = 2;
const COLS = 9;
export const PANEL_COUNT = ROWS * COLS * 2; // two roof slopes

const Panel: React.FC<{ x: number; y: number; w: number; h: number; t: number; shine: number }> = ({ x, y, w, h, t, shine }) => {
  if (t <= 0) return null;
  // pop: drop in from above with squash-and-stretch, then settle
  const k = Math.min(1, t);
  const drop = (1 - ease('back', k)) * -60;
  const sy = k < 0.6 ? 1.25 : k < 0.8 ? 0.8 : 1;
  return (
    <g transform={`translate(${x + w / 2} ${y + h + drop}) scale(${2 - sy} ${sy}) translate(${-w / 2} ${-h})`} opacity={Math.min(1, k * 3)}>
      <rect width={w} height={h} rx={3} fill="#1F3E7A" stroke={INK} strokeWidth={3} />
      {[1, 2].map((i) => (
        <line key={i} x1={(w / 3) * i} x2={(w / 3) * i} y1={0} y2={h} stroke="#5D86C9" strokeWidth={1.5} />
      ))}
      <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="#5D86C9" strokeWidth={1.5} />
      <path d={`M ${w * (shine - 0.25)} 0 L ${w * (shine + 0.05)} 0 L ${w * (shine - 0.15)} ${h} L ${w * (shine - 0.45)} ${h} Z`} fill="#fff" opacity={0.35} />
    </g>
  );
};

export const Exterior: React.FC<{ frame: number; panels: number; cable: number; clean: number; flow: number; sun: number }> = ({
  frame,
  panels,
  cable,
  clean,
  flow,
  sun,
}) => {
  // roof geometry: two saw-tooth bays
  const bays = [
    { x0: 420, x1: 1000, top: 360, eave: 470 },
    { x0: 1000, x1: 1580, top: 360, eave: 470 },
  ];
  let idx = 0;
  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5FB7E8" />
          <stop offset="1" stopColor="#CDEFFB" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF6B0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFF6B0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-200} y={-200} width={2400} height={1500} fill="url(#sky)" />
      {/* sun */}
      <g transform="translate(1620 170)">
        <circle r={260 * (0.8 + sun * 0.3)} fill="url(#sunGlow)" />
        <g transform={`rotate(${frame * 0.6})`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={-8} y={-150} width={16} height={46} rx={8} fill="#FFC93C" transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r={86} fill="#FFC93C" stroke={INK} strokeWidth={LINE * 1.2} />
        <path d="M -30 10 Q 0 34 30 10" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <circle cx={-28} cy={-16} r={8} fill={INK} />
        <circle cx={28} cy={-16} r={8} fill={INK} />
      </g>
      {/* clouds */}
      {[[260, 140, 1], [820, 90, 0.8], [1240, 230, 0.7]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x + ((frame * (0.4 + i * 0.15)) % 400) - 100} ${y}) scale(${s})`}>
          <ellipse cx={0} cy={0} rx={90} ry={40} fill="#fff" />
          <ellipse cx={60} cy={-20} rx={70} ry={46} fill="#fff" />
          <ellipse cx={-60} cy={-10} rx={60} ry={34} fill="#fff" />
        </g>
      ))}
      {/* distant estate */}
      <g fill="#9FC0CF">
        <rect x={-100} y={560} width={300} height={200} />
        <rect x={1650} y={520} width={420} height={240} />
        <rect x={1760} y={430} width={40} height={100} />
      </g>
      {/* ground & road */}
      <rect x={-200} y={760} width={2400} height={600} fill="#9CC46B" />
      <rect x={-200} y={880} width={2400} height={130} fill="#6E6E72" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={i} x={-150 + i * 170} y={940} width={90} height={12} rx={6} fill="#F2E7C9" />
      ))}
      {/* trees */}
      {[180, 1760, 1900].map((x, i) => (
        <g key={i} transform={`translate(${x} 770)`}>
          <rect x={-12} y={-90} width={24} height={90} fill="#7A5230" stroke={INK} strokeWidth={4} />
          <circle cx={0} cy={-140} r={74} fill="#4E9A4A" stroke={INK} strokeWidth={LINE} />
          <circle cx={-30} cy={-160} r={26} fill="#69B562" />
        </g>
      ))}
      {/* the shed */}
      <rect x={420} y={470} width={1160} height={300} fill="#E7D3A9" stroke={INK} strokeWidth={LINE * 1.3} />
      <rect x={420} y={680} width={1160} height={90} fill="#C8B184" />
      {/* roller door + sign */}
      <rect x={560} y={560} width={220} height={210} fill="#A6B1B9" stroke={INK} strokeWidth={LINE} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={560} x2={780} y1={585 + i * 28} y2={585 + i * 28} stroke="#66727B" strokeWidth={3} />
      ))}
      <rect x={860} y={500} width={560} height={74} rx={10} fill="#1E5AA8" stroke={INK} strokeWidth={6} />
      <text x={1140} y={550} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={40} fill="#FFF7DE">
        खुराना इंजीनियरिंग वर्क्स
      </text>
      {[900, 1060, 1220, 1380].map((x) => (
        <rect key={x} x={x} y={610} width={110} height={60} rx={4} fill="#BFE3F2" stroke={INK} strokeWidth={4} />
      ))}
      {/* saw-tooth roof bays */}
      {bays.map((b, bi) => (
        <g key={bi}>
          <path d={`M ${b.x0} ${b.eave} L ${b.x0 + 40} ${b.top} L ${b.x1} ${b.top - 20} L ${b.x1} ${b.eave} Z`} fill="#B9BEC3" stroke={INK} strokeWidth={LINE * 1.2} strokeLinejoin="round" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1={b.x0 + 50 + i * 45} y1={b.top - (i * 45 * 20) / (b.x1 - b.x0)} x2={b.x0 + 30 + i * 45} y2={b.eave} stroke="#9BA1A7" strokeWidth={3} />
          ))}
        </g>
      ))}
      {/* panels: drawn bay by bay, row by row */}
      {bays.map((b) =>
        Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((__, c) => {
            const i = idx++;
            const w = 52;
            const h = 36;
            const px = b.x0 + 62 + c * 56 + r * -10;
            const py = b.top - 4 - (c * 56 * 20) / (b.x1 - b.x0) + r * 44 + 6;
            return <Panel key={i} x={px} y={py} w={w} h={h} t={panels - i} shine={(frame / 40 + i * 0.07) % 1.4} />;
          }),
        ),
      )}
      {/* cleaning brush sweeping the array (maintenance) */}
      {clean > 0 && clean < 1 && (
        <g transform={`translate(${440 + clean * 1120} ${340 - clean * 40})`}>
          <rect x={-10} y={-10} width={20} height={130} rx={6} fill="#F2B632" stroke={INK} strokeWidth={4} />
          <rect x={-22} y={110} width={44} height={20} rx={6} fill="#3E7CB1" stroke={INK} strokeWidth={4} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={-30 - i * 16} cy={70 + Math.sin(frame + i) * 10} r={6} fill="#BFE3F2" opacity={0.8} />
          ))}
        </g>
      )}
      {/* cable + inverter */}
      {cable > 0 && (
        <g>
          <path
            d="M 1560 380 L 1600 380 L 1600 700 L 1520 700"
            fill="none"
            stroke="#2A2A2A"
            strokeWidth={10}
            strokeDasharray={760}
            strokeDashoffset={760 * (1 - cable)}
            strokeLinecap="round"
          />
          <g opacity={Math.min(1, cable * 3)}>
            <rect x={1460} y={660} width={70} height={90} rx={8} fill="#EEF2F5" stroke={INK} strokeWidth={4} />
            <circle cx={1495} cy={690} r={10} fill={flow > 0 ? '#3ECF6A' : '#999'} />
          </g>
          {flow > 0 &&
            [0, 1, 2, 3].map((i) => {
              const t = ((frame / 20 + i / 4) % 1) * flow;
              const pts = t < 0.45 ? [1560 + t * 88, 380] : t < 0.85 ? [1600, 380 + ((t - 0.45) / 0.4) * 320] : [1600 - ((t - 0.85) / 0.15) * 80, 700];
              return <circle key={i} cx={pts[0]} cy={pts[1]} r={11} fill="#FFE14D" stroke="#F2A31B" strokeWidth={3} />;
            })}
        </g>
      )}
    </g>
  );
};
