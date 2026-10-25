/**
 * Cut-out style human skeleton shared by the Owner, the Friend and the workers.
 *
 *   root (x, y, scale, facing, squash about the feet)
 *    ├─ legs: hip → knee → shoe        (2-segment, scissor walk)
 *    └─ upper body (lean about hips, crouch)
 *         ├─ torso drawing (per character)
 *         ├─ arms: shoulder → elbow → wrist → hand shape
 *         └─ head pivot (tilt, nod) → head drawing (per character)
 *
 * All angles are degrees. Arms: shoulder 0 = hanging, + = raised outward.
 * Elbow + = forearm swings outward/up, − = folds across the body.
 * Legs are in walking frame: hip + = foot forward, knee + = shin bends back.
 */
import React from 'react';
import { Hand, type HandShape } from './parts';
import { INK, LINE } from './style';
import type { Viseme } from '../audio/visemes';

export type FacePose = {
  turn: number; // -1..1 feature shift (head turn)
  tilt: number; // head roll, deg
  nod: number; // head y offset
  lookX: number;
  lookY: number;
  lid: number; // 0 open .. 1 closed (expression, combined with blinks)
  squint: number;
  browL: number;
  browR: number;
  browAng: number; // -1 worried .. +1 angry
  smile: number;
  asym: number;
  jaw: number; // shock jaw when silent
  sweat: number;
  blush: number;
};

export type BodyPose = {
  x: number;
  y: number;
  scale: number;
  facing: number; // 1 right, -1 left (flip)
  sx: number;
  sy: number;
  lean: number;
  crouch: number;
  aLs: number; // left (screen-left) arm shoulder
  aLe: number;
  aLw: number;
  aRs: number;
  aRe: number;
  aRw: number;
  hL: HandShape;
  hR: HandShape;
  lLh: number; // back/left leg hip
  lLk: number;
  lRh: number;
  lRk: number;
};

export type HumanPose = FacePose & BodyPose;

export const BASE_FACE: FacePose = {
  turn: 0, tilt: 0, nod: 0, lookX: 0, lookY: 0, lid: 0, squint: 0,
  browL: 0, browR: 0, browAng: 0, smile: 0, asym: 0, jaw: 0, sweat: 0, blush: 0,
};

export const BASE_HUMAN: HumanPose = {
  ...BASE_FACE,
  x: 0, y: 0, scale: 1, facing: 1, sx: 1, sy: 1, lean: 0, crouch: 0,
  aLs: 12, aLe: -8, aLw: 0, aRs: 12, aRe: -8, aRw: 0, hL: 'relax', hR: 'relax',
  lLh: 0, lLk: 0, lRh: 0, lRk: 0,
};

export type HeadProps = { p: HumanPose; viseme: Viseme; open: number; frame: number };

export type HumanDesign = {
  hipY: number;
  hipX: number;
  thigh: number;
  shin: number;
  legW: number;
  shoulderY: number; // from hips
  shoulderX: number;
  neckY: number; // from hips
  headScale?: number;
  upper: number;
  fore: number;
  armW: number;
  foreW: number;
  sleeve: string;
  sleeveShade: string;
  /** how far the sleeve runs down the forearm (0 = rolled at elbow) */
  sleeveFore: number;
  cuff?: string;
  skin: string;
  skinShade: string;
  trouser: string;
  trouserShade: string;
  shoe: string;
  sole: string;
  watch?: boolean;
  Torso: React.FC<{ p: HumanPose; frame: number }>;
  Head: React.FC<HeadProps>;
};

const Shoe: React.FC<{ d: HumanDesign }> = ({ d }) => (
  <g>
    <path
      d="M -16 -8 C -18 6 -16 14 -12 16 L 36 16 C 42 16 44 8 38 2 C 30 -4 14 -6 8 -10 Z"
      fill={d.shoe}
      stroke={INK}
      strokeWidth={LINE}
      strokeLinejoin="round"
    />
    <path d="M -14 13 L 40 13" stroke={d.sole} strokeWidth={5} strokeLinecap="round" />
  </g>
);

const Leg: React.FC<{ d: HumanDesign; hip: number; knee: number; x: number }> = ({ d, hip, knee, x }) => (
  <g transform={`translate(${x} ${-d.hipY}) rotate(${-hip})`}>
    <rect x={-d.legW / 2} y={-d.legW / 2} width={d.legW} height={d.thigh + d.legW} rx={d.legW / 2} fill={d.trouser} stroke={INK} strokeWidth={LINE} />
    <g transform={`translate(0 ${d.thigh}) rotate(${knee})`}>
      <rect x={-d.legW / 2} y={-d.legW / 2} width={d.legW} height={d.shin + d.legW * 0.5} rx={d.legW / 2.4} fill={d.trouser} stroke={INK} strokeWidth={LINE} />
      {/* crease shading on the inner edge */}
      <rect x={d.legW * 0.12} y={0} width={d.legW * 0.3} height={d.shin - 6} rx={4} fill={d.trouserShade} opacity={0.7} />
      <g transform={`translate(0 ${d.shin}) rotate(${hip - knee})`}>
        <Shoe d={d} />
      </g>
    </g>
  </g>
);

const Arm: React.FC<{ d: HumanDesign; side: -1 | 1; s: number; e: number; w: number; hand: HandShape; watch?: boolean }> = ({
  d,
  side,
  s,
  e,
  w,
  hand,
  watch,
}) => {
  const sleeveOnFore = d.sleeveFore * d.fore;
  return (
    <g transform={`translate(${side * d.shoulderX} ${-d.shoulderY}) scale(${side} 1) rotate(${-s})`}>
      <rect x={-d.armW / 2} y={-d.armW / 2} width={d.armW} height={d.upper + d.armW * 0.6} rx={d.armW / 2} fill={d.sleeve} stroke={INK} strokeWidth={LINE} />
      <rect x={d.armW * 0.05} y={4} width={d.armW * 0.32} height={d.upper - 8} rx={6} fill={d.sleeveShade} opacity={0.8} />
      <g transform={`translate(0 ${d.upper}) rotate(${-e})`}>
        <rect x={-d.foreW / 2} y={-d.foreW / 2} width={d.foreW} height={d.fore + d.foreW * 0.5} rx={d.foreW / 2} fill={d.skin} stroke={INK} strokeWidth={LINE} />
        {sleeveOnFore > 0 && (
          <rect x={-d.armW / 2 + 1} y={-d.armW / 2} width={d.armW - 2} height={sleeveOnFore + d.armW / 2} rx={d.armW / 2.2} fill={d.sleeve} stroke={INK} strokeWidth={LINE} />
        )}
        {/* rolled cuff */}
        <rect
          x={-d.armW / 2 - 3}
          y={sleeveOnFore - 9}
          width={d.armW + 6}
          height={17}
          rx={8}
          fill={d.cuff ?? d.sleeve}
          stroke={INK}
          strokeWidth={LINE}
        />
        {watch && (
          <g>
            <rect x={-d.foreW / 2 - 2} y={d.fore - 12} width={d.foreW + 4} height={10} rx={3} fill="#C9A13A" stroke={INK} strokeWidth={3} />
            <circle cx={0} cy={d.fore - 7} r={6} fill="#F7E7B0" stroke={INK} strokeWidth={2.5} />
          </g>
        )}
        <g transform={`translate(0 ${d.fore}) rotate(${-w})`}>
          <Hand shape={hand} fill={d.skin} />
        </g>
      </g>
    </g>
  );
};

export const Human: React.FC<{ d: HumanDesign; p: HumanPose; viseme: Viseme; open: number; frame: number }> = ({
  d,
  p,
  viseme,
  open,
  frame,
}) => {
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${p.scale * p.facing * p.sx} ${p.scale * p.sy})`}>
      {/* contact shadow */}
      <ellipse cx={0} cy={4} rx={95 / Math.max(0.6, p.sy)} ry={14} fill="#000" opacity={0.18} />
      <Leg d={d} hip={p.lLh} knee={p.lLk} x={-d.hipX} />
      <Leg d={d} hip={p.lRh} knee={p.lRk} x={d.hipX} />
      <g transform={`translate(0 ${p.crouch}) translate(0 ${-d.hipY}) rotate(${p.lean}) translate(0 ${d.hipY})`}>
        <g transform={`translate(0 ${-d.hipY})`}>
          <d.Torso p={p} frame={frame} />
          <g transform={`translate(0 ${-d.neckY + p.nod}) rotate(${p.tilt}) scale(${d.headScale ?? 1})`}>
            <d.Head p={p} viseme={viseme} open={open} frame={frame} />
          </g>
          <Arm d={d} side={-1} s={p.aLs} e={p.aLe} w={p.aLw} hand={p.hL} />
          <Arm d={d} side={1} s={p.aRs} e={p.aRe} w={p.aRw} hand={p.hR} watch={d.watch} />
        </g>
      </g>
    </g>
  );
};

/** A generic walk cycle (phase in steps; 1 step = half a stride). */
export function walkPose(phase: number, stride = 26, bounce = 8): Partial<HumanPose> {
  const a = Math.sin(phase * Math.PI);
  const lift = Math.abs(Math.cos(phase * Math.PI));
  return {
    lLh: a * stride,
    lRh: -a * stride,
    lLk: Math.max(0, -a) * stride * 1.3 + 4,
    lRk: Math.max(0, a) * stride * 1.3 + 4,
    crouch: (1 - lift) * bounce,
    aLs: 8 - a * 14,
    aRs: 8 + a * 14,
    aLe: -10,
    aRe: -10,
    lean: 3,
  };
}
