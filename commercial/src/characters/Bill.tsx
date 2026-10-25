/**
 * CHARACTER C — "BILL BHAI", the electricity bill who thinks he owns the factory.
 *
 * A flexible paper body (bends, squashes, dog-eared corner, torn perforated
 * bottom), red "बिजली बिल" header worn like a forehead band, black
 * wayfarers that can slide down to reveal small nervous eyes, a curled
 * villain moustache, a gold tooth, a gold ₹ chain, rubber-hose limbs with
 * white gloves and shiny pointed shoes.
 *
 * The paper stays front-facing (so its printed text never mirrors); facing
 * only turns the face and points the shoes.
 */
import React, { useId } from 'react';
import { Brow, Eye, Hand, Mouth, Sweat, type HandShape } from './parts';
import { GOLD, GOLD_SHADE, INK, LINE, safeId } from './style';
import { FONT } from '../fonts';
import type { Viseme } from '../audio/visemes';

export type BillPose = {
  x: number;
  y: number;
  scale: number;
  facing: number;
  sx: number;
  sy: number;
  lean: number; // paper rotation about its bottom edge
  bodyY: number; // paper lift above the hips (walk bob)
  bend: number; // -1..1 paper flex
  turn: number;
  // arms: angle (0 = down, + = outward), bend (curvature), length, wrist
  aLa: number;
  aLb: number;
  aLl: number;
  aLw: number;
  aRa: number;
  aRb: number;
  aRl: number;
  aRw: number;
  hL: HandShape;
  hR: HandShape;
  // legs: foot position relative to hip (x forward in facing direction), knee bend
  lLx: number;
  lLy: number;
  lLk: number;
  lRx: number;
  lRy: number;
  lRk: number;
  // face
  browL: number;
  browR: number;
  browAng: number;
  smile: number;
  asym: number;
  jaw: number;
  lookX: number;
  lookY: number;
  glasses: number; // 0 on .. 1 slid down the nose (eyes visible)
  glint: number; // 0..1 lens sparkle
  sweat: number;
  stache: number; // moustache curl/twitch -1..1
};

export const BASE_BILL: BillPose = {
  x: 0, y: 0, scale: 1, facing: 1, sx: 1, sy: 1, lean: 0, bodyY: 0, bend: 0, turn: 0,
  aLa: 16, aLb: 0.25, aLl: 190, aLw: 0, aRa: 16, aRb: 0.25, aRl: 190, aRw: 0, hL: 'relax', hR: 'relax',
  lLx: -8, lLy: 150, lLk: 0.1, lRx: 8, lRy: 150, lRk: 0.1,
  browL: 0, browR: 0, browAng: 0.55, smile: 0.35, asym: 0.6, jaw: 0, lookX: 0, lookY: 0,
  glasses: 0, glint: 0, sweat: 0, stache: 0,
};

const PAPER = '#FFF9EA';
const PAPER_SHADE = '#EADDBD';
const RED = '#D6332A';
const W = 180; // half width
const TOP = -680;
const BOT = -150;
const HIP_Y = -150;

function paperPath(bend: number) {
  const b = bend * 34;
  const teeth = 16;
  let bottom = '';
  for (let i = 0; i <= teeth; i++) {
    const x = W - (i * 2 * W) / teeth;
    const y = BOT + (i % 2 === 0 ? 0 : 11);
    bottom += ` L ${x} ${y}`;
  }
  return `M ${-W} ${TOP} L ${W - 52} ${TOP} L ${W} ${TOP + 52} Q ${W + b} ${(TOP + BOT) / 2} ${W} ${BOT}${bottom} Q ${-W + b} ${(TOP + BOT) / 2} ${-W} ${TOP} Z`;
}

/** Rubber-hose limb from (0,0) to (ex,ey) with curvature `bend`. */
function hose(ex: number, ey: number, bend: number) {
  const mx = ex / 2;
  const my = ey / 2;
  const len = Math.hypot(ex, ey) || 1;
  const nx = -ey / len;
  const ny = ex / len;
  const cx = mx + nx * bend * len * 0.45;
  const cy = my + ny * bend * len * 0.45;
  return { d: `M 0 0 Q ${cx} ${cy} ${ex} ${ey}`, endAngle: (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI };
}

const BillArm: React.FC<{ side: -1 | 1; a: number; b: number; l: number; w: number; hand: HandShape }> = ({ side, a, b, l, w, hand }) => {
  // mirrored: positive angle swings outward for both sides
  const rad = (a * Math.PI) / 180;
  const ex = Math.sin(rad) * l;
  const ey = Math.cos(rad) * l;
  const { d, endAngle } = hose(ex, ey, b);
  return (
    <g transform={`translate(${side * (W - 6)} -440) scale(${side} 1)`}>
      <path d={d} fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#3A3A44" strokeWidth={11} strokeLinecap="round" />
      <g transform={`translate(${ex} ${ey}) rotate(${endAngle - 90 + w})`}>
        <Hand shape={hand} fill="#FFFFFF" glove size={1.25} />
      </g>
    </g>
  );
};

const BillLeg: React.FC<{ hipX: number; fx: number; fy: number; k: number }> = ({ hipX, fx, fy, k }) => {
  const { d } = hose(fx, fy, -k);
  return (
    <g transform={`translate(${hipX} ${HIP_Y})`}>
      <path d={d} fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#3A3A44" strokeWidth={13} strokeLinecap="round" />
      <g transform={`translate(${fx} ${fy})`}>
        {/* pointed, polished villain shoe */}
        <path d="M -24 -14 C -30 4 -26 12 -18 14 L 50 14 C 66 12 68 4 56 -2 C 40 -8 22 -12 10 -18 Z" fill="#151518" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        <path d="M 14 -8 C 26 -6 38 -4 46 0" stroke="#8A8A9A" strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d="M -22 12 L 54 12" stroke="#5A1D1D" strokeWidth={4} />
      </g>
    </g>
  );
};

export const Bill: React.FC<{
  p: BillPose;
  viseme: Viseme;
  open: number;
  frame: number;
  amount?: string;
  /** cos of a spin angle: 1 front, 0 edge-on, <0 showing the paper's back */
  spinK?: number;
  /** draw both arms behind the sheet (hands behind the head, etc.) */
  armsBehind?: boolean;
  /** draw only part of the rig, for layering with props (sitting in a chair) */
  part?: 'all' | 'legs' | 'body';
  shadow?: boolean;
}> = ({ p, viseme, open, frame, amount = '₹ 4,87,650', spinK = 1, armsBehind = false, part = 'all', shadow = true }) => {
  const showBack = spinK < 0;
  const kx = Math.max(0.06, Math.abs(spinK));
  const id = safeId(useId());
  const fx = p.turn * 22;
  const paper = paperPath(p.bend);
  const eyeOpen = Math.min(open, 1);
  const gDrop = p.glasses * 46;
  const chainSwing = Math.sin(frame / 9) * 2 + p.lean * 0.6;
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${p.scale * p.sx * kx} ${p.scale * p.sy})`}>
      {shadow && part !== 'body' && <ellipse cx={0} cy={6} rx={200} ry={22} fill="#000" opacity={0.2} />}
      {/* legs behind the sheet, flipped for facing */}
      {part !== 'body' && (
        <g transform={`scale(${p.facing} 1)`}>
          <BillLeg hipX={-62} fx={p.lLx} fy={p.lLy} k={p.lLk} />
          <BillLeg hipX={62} fx={p.lRx} fy={p.lRy} k={p.lRk} />
        </g>
      )}
      <g transform={`translate(0 ${-p.bodyY}) rotate(${p.lean} 0 ${BOT})`} display={part === 'legs' ? 'none' : undefined}>
        <BillArm side={-1} a={p.aLa} b={p.aLb} l={p.aLl} w={p.aLw} hand={p.hL} />
        {armsBehind && <BillArm side={1} a={p.aRa} b={p.aRb} l={p.aRl} w={p.aRw} hand={p.hR} />}
        {/* paper */}
        <defs>
          <clipPath id={`p${id}`}>
            <path d={paper} />
          </clipPath>
          <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#5A5A66" />
            <stop offset="0.5" stopColor="#111116" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
        </defs>
        <path d={paper} fill={showBack ? '#F1E8D2' : PAPER} />
        {showBack ? (
          <g clipPath={`url(#p${id})`}>
            <rect x={-W - 10} y={TOP} width={2 * W + 20} height={70} fill="#E9A39C" />
            <rect x={-W + 40} y={-300} width={260} height={14} rx={7} fill="#E3D8BE" />
          </g>
        ) : null}
        <g clipPath={`url(#p${id})`} display={showBack ? 'none' : undefined}>
          <path d={`M ${W - 40} ${TOP} L ${W + 40} ${TOP} L ${W + 40} ${BOT + 20} L ${W - 30} ${BOT + 20} Z`} fill={PAPER_SHADE} opacity={0.65} />
          {/* header band = forehead */}
          <rect x={-W - 10} y={TOP} width={2 * W + 20} height={70} fill={RED} />
          <path d={`M ${-W + 22} ${TOP + 12} l -14 26 h 12 l -8 22 l 24 -32 h -12 l 10 -16 Z`} fill="#FFD23F" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <text x={-W + 46} y={TOP + 46} fontFamily={FONT} fontWeight={800} fontSize={40} fill="#fff">
            बिजली बिल
          </text>
          {/* printed details below the face */}
          <g opacity={0.9}>
            <text x={-W + 26} y={-330} fontFamily={FONT} fontWeight={700} fontSize={16} fill="#6E6656">
              CONSUMER: KHURANA ENGG. WORKS
            </text>
            {[-318, -305].map((y, i) => (
              <rect key={y} x={-W + 26} y={y} width={[250, 190][i]} height={6} rx={3} fill="#CFC6B2" />
            ))}
            <rect x={-W + 26} y={-292} width={2 * W - 52} height={2.5} fill="#CFC6B2" />
            <text x={-W + 26} y={-270} fontFamily={FONT} fontWeight={700} fontSize={17} fill="#8A8170">
              TOTAL DUE
            </text>
            <text x={-W + 24} y={-222} fontFamily={FONT} fontWeight={800} fontSize={52} fill={INK}>
              {amount}
            </text>
          </g>
          {/* barcode */}
          <g transform="translate(-150 -204)">
            {Array.from({ length: 34 }).map((_, i) => (
              <rect key={i} x={i * 6.4} y={0} width={[2, 3, 1.5, 4, 2][i % 5]} height={26} fill="#3A342C" />
            ))}
          </g>
        </g>
        <path d={paper} fill="none" stroke={INK} strokeWidth={LINE * 1.2} strokeLinejoin="round" />
        {!showBack && (<>
        {/* dog-ear */}
        <path d={`M ${W - 52} ${TOP} L ${W - 52} ${TOP + 52} L ${W} ${TOP + 52} Z`} fill={PAPER_SHADE} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        {/* DUE stamp */}
        <g transform="translate(110 -206) rotate(-16)" opacity={0.85}>
          <rect x={-50} y={-24} width={100} height={44} rx={6} fill="none" stroke={RED} strokeWidth={5} />
          <text x={0} y={12} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={32} fill={RED}>
            DUE
          </text>
        </g>

        {/* ---------------- face ---------------- */}
        <g transform={`translate(${fx} 0)`}>
          {/* eyes behind the glasses */}
          <Eye cx={-60} cy={-544} rx={15} ry={17} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} lidColor={PAPER} pupil={0.3} lidAngle={p.browAng * 10} />
          <Eye cx={60} cy={-544} rx={15} ry={17} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} lidColor={PAPER} pupil={0.3} lidAngle={-p.browAng * 10} />
          <Brow cx={-60} cy={-590 + gDrop * 0.1} w={78} t={14} side={-1} raise={p.browL} angle={p.browAng} arch={0.35} />
          <Brow cx={60} cy={-590 + gDrop * 0.1} w={78} t={14} side={1} raise={p.browR} angle={p.browAng} arch={0.35} />
          {/* wayfarers */}
          <g transform={`translate(0 ${gDrop}) rotate(${p.glasses * -4})`}>
            <path d="M -116 -558 L -6 -562 L 6 -562 L 116 -558" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
            {[-1, 1].map((s) => (
              <g key={s} transform={`translate(${s * 60} -540)`}>
                <path d="M -54 -22 L 54 -22 C 56 0 48 26 22 28 L -22 28 C -48 26 -56 0 -54 -22 Z" fill={`url(#g${id})`} stroke={INK} strokeWidth={LINE * 1.3} strokeLinejoin="round" />
                <path d="M -34 -14 L -12 -14 L -38 18 L -48 18 Z" fill="#fff" opacity={0.28} />
              </g>
            ))}
            {p.glint > 0.01 && (
              <g transform={`translate(${-80} ${-554}) scale(${p.glint}) rotate(${frame * 6})`}>
                <path d="M 0 -26 L 5 -5 L 26 0 L 5 5 L 0 26 L -5 5 L -26 0 L -5 -5 Z" fill="#fff" stroke="#FFF3B0" strokeWidth={2} />
              </g>
            )}
          </g>
          {/* curled villain moustache */}
          <g transform={`translate(0 -486) rotate(${p.stache * 4})`}>
            <path
              d={`M 0 -6 C -16 -14 -40 -12 -56 -2 C -66 4 -72 ${-10 - p.stache * 6} -64 ${-20 - p.stache * 8} C -60 -24 -54 -22 -56 -16 C -48 -14 -24 2 0 4
                 C 24 2 48 -14 56 -16 C 54 -22 60 -24 64 ${-20 - p.stache * 8} C 72 ${-10 - p.stache * 6} 66 4 56 -2 C 40 -12 16 -14 0 -6 Z`}
              fill={INK}
              stroke={INK}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </g>
          <Mouth x={0} y={-452} w={46} h={54} viseme={viseme} smile={p.smile} asym={p.asym} jaw={p.jaw} gold stroke={LINE * 1.15} />
          <Sweat x={-130} y={-606} amount={p.sweat} frame={frame} seed={2} />
        </g>
        {/* gold ₹ chain */}
        <g>
          <path d={`M ${-W + 6} -432 C -110 ${-352 + chainSwing} 110 ${-352 + chainSwing} ${W - 6} -432`} fill="none" stroke={GOLD_SHADE} strokeWidth={9} strokeDasharray="10 4" strokeLinecap="round" />
          <path d={`M ${-W + 6} -432 C -110 ${-352 + chainSwing} 110 ${-352 + chainSwing} ${W - 6} -432`} fill="none" stroke={GOLD} strokeWidth={5} strokeDasharray="10 4" strokeLinecap="round" />
          <g transform={`translate(${chainSwing * 0.8} -372)`}>
            <circle r={24} fill={GOLD} stroke={INK} strokeWidth={LINE} />
            <text y={11} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={32} fill={GOLD_SHADE}>
              ₹
            </text>
          </g>
        </g>
        </>)}
        {!armsBehind && <BillArm side={1} a={p.aRa} b={p.aRb} l={p.aRl} w={p.aRw} hand={p.hR} />}
      </g>
    </g>
  );
};

/**
 * Swagger walk: big lifted steps, chest out (leaning back), arms swinging
 * wide. Footfalls land on integer phases — use them to fire BOOMs and shakes.
 */
export function billWalk(phase: number, stride = 46, lift = 48): Partial<BillPose> {
  const leg = (ph: number) => {
    const t = ((ph % 2) + 2) % 2;
    if (t < 1) return { x: stride - t * 2 * stride, y: 150, k: 0.12 };
    const u = t - 1;
    return { x: -stride + u * 2 * stride, y: 150 - Math.sin(u * Math.PI) * lift, k: 0.35 };
  };
  const L = leg(phase);
  const R = leg(phase + 1);
  const s = Math.sin(phase * Math.PI);
  return {
    lLx: L.x, lLy: L.y, lLk: L.k,
    lRx: R.x, lRy: R.y, lRk: R.k,
    bodyY: Math.abs(s) * 14,
    lean: -3 + s * 3,
    bend: s * 0.25,
    aLa: 22 + s * 22,
    aRa: 22 - s * 22,
    aLb: 0.3 - s * 0.2,
    aRb: 0.3 + s * 0.2,
  };
}
