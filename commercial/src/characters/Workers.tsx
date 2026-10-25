/**
 * Supporting cast: two factory workers.
 *  RAJU  — lanky, big ears, navy uniform and cap. The one who whispers.
 *  PAPPU — stout, yellow hard hat, grey uniform, stubble.
 */
import React, { useId } from 'react';
import { Brow, Eye, Mouth, Sweat } from './parts';
import { Human, type HeadProps, type HumanDesign, type HumanPose } from './Human';
import { INK, LINE, SKIN, safeId } from './style';
import type { Viseme } from '../audio/visemes';
import { breathe } from '../rig/keyframes';

// ------------------------------------------------------------------ RAJU
const rs = SKIN.raju;
const NAVY = '#2D4C80';
const NAVY_SHADE = '#1F375E';
const RAJU_FACE = 'M -42 -90 C -44 -132 -24 -152 0 -152 C 24 -152 44 -132 42 -90 C 42 -52 30 -14 0 -10 C -30 -14 -42 -52 -42 -90 Z';

const RajuHead: React.FC<HeadProps> = ({ p, viseme, open, frame }) => {
  const id = safeId(useId());
  const fx = p.turn * 12;
  const eyeOpen = Math.min(open, 1 - p.lid);
  return (
    <g>
      <rect x={-15} y={-36} width={30} height={42} fill={rs.base} stroke={INK} strokeWidth={LINE} />
      {/* big ears */}
      <ellipse cx={-44 + fx * 0.25} cy={-88} rx={15} ry={22} fill={rs.base} stroke={INK} strokeWidth={LINE} />
      <ellipse cx={44 + fx * 0.25} cy={-88} rx={15} ry={22} fill={rs.base} stroke={INK} strokeWidth={LINE} />
      <path d={`M ${-46 + fx * 0.25} -96 q 6 6 0 14 M ${46 + fx * 0.25} -96 q -6 6 0 14`} stroke={rs.shade} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <defs>
        <clipPath id={`f${id}`}>
          <path d={RAJU_FACE} />
        </clipPath>
      </defs>
      <path d={RAJU_FACE} fill={rs.base} />
      <g clipPath={`url(#f${id})`}>
        <ellipse cx={36 + fx * 0.5} cy={-80} rx={22} ry={90} fill={rs.shade} opacity={0.5} />
      </g>
      <path d={RAJU_FACE} fill="none" stroke={INK} strokeWidth={LINE} />
      {/* cap */}
      <g transform={`translate(${fx * 0.3} 0)`}>
        <path d="M -46 -116 C -46 -150 -24 -164 0 -164 C 24 -164 46 -150 46 -116 Z" fill={NAVY} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        <path d={`M -48 -116 L 48 -116 C ${60 + p.turn * 20} -114 ${64 + p.turn * 20} -106 ${56 + p.turn * 20} -102 L -40 -104 Z`} fill={NAVY_SHADE} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        <circle cx={0} cy={-163} r={5} fill={NAVY_SHADE} stroke={INK} strokeWidth={2.5} />
        <rect x={-10} y={-146} width={20} height={14} rx={3} fill="#F2B632" stroke={INK} strokeWidth={2.5} />
      </g>
      <Eye cx={-17 + fx} cy={-86} rx={13} ry={16} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={rs.base} lidAngle={p.browAng * 8} pupil={0.36} />
      <Eye cx={17 + fx} cy={-86} rx={13} ry={16} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={rs.base} lidAngle={-p.browAng * 8} pupil={0.36} />
      <Brow cx={-18 + fx} cy={-109} w={24} t={5.5} side={-1} raise={p.browL} angle={p.browAng} arch={0.2} />
      <Brow cx={18 + fx} cy={-109} w={24} t={5.5} side={1} raise={p.browR} angle={p.browAng} arch={0.2} />
      <path d={`M ${fx * 1.3} -84 C ${fx * 1.3 + 4} -74 ${fx * 1.3 + 12} -64 ${fx * 1.3 + 4} -60 C ${fx * 1.3} -58 ${fx * 1.3 - 6} -60 ${fx * 1.3 - 6} -62`} fill="none" stroke={INK} strokeWidth={LINE * 0.85} strokeLinecap="round" />
      <path d={`M ${-14 + fx * 1.1} -50 Q ${fx * 1.1} -56 ${14 + fx * 1.1} -50`} stroke="#2A1A14" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Mouth x={fx * 1.1} y={-38} w={15} h={24} viseme={viseme} smile={p.smile} asym={p.asym} jaw={p.jaw} />
      <Sweat x={-30 + fx} y={-106} amount={p.sweat} frame={frame} seed={8} />
    </g>
  );
};

const RajuTorso: React.FC<{ p: HumanPose; frame: number }> = ({ frame }) => {
  const b = 1 + breathe(frame, 3) * 0.01;
  return (
    <g transform={`translate(0 -90) scale(${b}) translate(0 90)`}>
      <path d="M -44 -14 L 44 -14 L 46 24 C 24 32 -24 32 -46 24 Z" fill="#B59C6B" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M -56 -182 C -60 -140 -56 -70 -48 -12 L 48 -12 C 56 -70 60 -140 56 -182 C 30 -192 -30 -192 -56 -182 Z" fill={NAVY} stroke={INK} strokeWidth={LINE} />
      <path d="M 30 -182 C 40 -140 42 -70 40 -12 L 48 -12 C 56 -70 60 -140 56 -182 Z" fill={NAVY_SHADE} />
      <path d="M -20 -188 L 0 -160 L 20 -188" fill="none" stroke={INK} strokeWidth={3.5} />
      <path d="M 0 -160 L 0 -16" stroke={NAVY_SHADE} strokeWidth={3} />
      {/* name badge */}
      <rect x={-46} y={-150} width={30} height={14} rx={2} fill="#F7F1E1" stroke={INK} strokeWidth={2} />
      <path d="M -42 -143 L -20 -143" stroke="#C0392B" strokeWidth={3} />
      <rect x={-52} y={-12} width={104} height={12} rx={4} fill="#3A2A1E" stroke={INK} strokeWidth={3.5} />
    </g>
  );
};

export const RAJU: HumanDesign = {
  hipY: 178, hipX: 22, thigh: 88, shin: 74, legW: 28,
  shoulderY: 178, shoulderX: 54, neckY: 186, headScale: 1.25,
  upper: 80, fore: 72, armW: 28, foreW: 21,
  sleeve: NAVY, sleeveShade: NAVY_SHADE, sleeveFore: 0, cuff: '#36598F',
  skin: rs.base, skinShade: rs.shade,
  trouser: '#B59C6B', trouserShade: '#97804F', shoe: '#2B2B2B', sole: '#111',
  Torso: RajuTorso, Head: RajuHead,
};

// ----------------------------------------------------------------- PAPPU
const ps = SKIN.pappu;
const GREY = '#8396AD';
const GREY_SHADE = '#677A92';
const PAPPU_FACE = 'M -56 -80 C -58 -120 -34 -140 0 -140 C 34 -140 58 -120 56 -80 C 58 -40 36 -12 0 -10 C -36 -12 -58 -40 -56 -80 Z';

const PappuHead: React.FC<HeadProps> = ({ p, viseme, open, frame }) => {
  const id = safeId(useId());
  const fx = p.turn * 14;
  const eyeOpen = Math.min(open, 1 - p.lid);
  return (
    <g>
      <rect x={-24} y={-32} width={48} height={38} fill={ps.base} stroke={INK} strokeWidth={LINE} />
      <ellipse cx={-56 + fx * 0.25} cy={-78} rx={10} ry={15} fill={ps.base} stroke={INK} strokeWidth={LINE} />
      <ellipse cx={56 + fx * 0.25} cy={-78} rx={10} ry={15} fill={ps.base} stroke={INK} strokeWidth={LINE} />
      <defs>
        <clipPath id={`f${id}`}>
          <path d={PAPPU_FACE} />
        </clipPath>
      </defs>
      <path d={PAPPU_FACE} fill={ps.base} />
      <g clipPath={`url(#f${id})`}>
        <ellipse cx={48 + fx * 0.5} cy={-70} rx={28} ry={90} fill={ps.shade} opacity={0.5} />
        <path d="M -60 -66 C -54 -30 -30 -14 0 -14 C 30 -14 54 -30 60 -66 L 60 0 L -60 0 Z" fill="#5B4436" opacity={0.35} transform={`translate(${fx * 0.3} 0)`} />
      </g>
      <path d={PAPPU_FACE} fill="none" stroke={INK} strokeWidth={LINE} />
      {/* hard hat */}
      <g transform={`translate(${fx * 0.3} 0)`}>
        <path d="M -54 -104 C -56 -146 -28 -162 0 -162 C 28 -162 56 -146 54 -104 Z" fill="#F5C518" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        <path d="M -8 -160 L -6 -106 L 6 -106 L 8 -160" fill="#E2AE0A" stroke={INK} strokeWidth={3} />
        <rect x={-66} y={-110} width={132} height={14} rx={7} fill="#F5C518" stroke={INK} strokeWidth={LINE} />
        <path d="M -40 -140 C -30 -150 -18 -154 -8 -154" stroke="#FFF3B0" strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
      <Eye cx={-20 + fx} cy={-78} rx={10} ry={12} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={ps.base} lidAngle={p.browAng * 8} pupil={0.5} />
      <Eye cx={20 + fx} cy={-78} rx={10} ry={12} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={ps.base} lidAngle={-p.browAng * 8} pupil={0.5} />
      <Brow cx={-21 + fx} cy={-96} w={26} t={7} side={-1} raise={p.browL} angle={p.browAng} arch={0.15} />
      <Brow cx={21 + fx} cy={-96} w={26} t={7} side={1} raise={p.browR} angle={p.browAng} arch={0.15} />
      <ellipse cx={-34 + fx} cy={-56} rx={11} ry={7} fill={ps.blush} opacity={0.35} />
      <ellipse cx={34 + fx} cy={-56} rx={11} ry={7} fill={ps.blush} opacity={0.35} />
      <ellipse cx={fx * 1.3} cy={-62} rx={11} ry={9} fill={ps.base} stroke={INK} strokeWidth={LINE * 0.85} />
      <Mouth x={fx * 1.1} y={-36} w={16} h={24} viseme={viseme} smile={p.smile} asym={p.asym} jaw={p.jaw} />
      <Sweat x={-40 + fx} y={-100} amount={p.sweat} frame={frame} seed={11} />
    </g>
  );
};

const PappuTorso: React.FC<{ p: HumanPose; frame: number }> = ({ frame }) => {
  const b = 1 + breathe(frame, 4) * 0.014;
  return (
    <g transform={`translate(0 -80) scale(${b}) translate(0 80)`}>
      <path d="M -62 -14 L 62 -14 L 66 22 C 36 32 -36 32 -66 22 Z" fill="#2F3A52" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M -76 -172 C -92 -130 -100 -60 -76 -10 C -40 4 40 4 76 -10 C 100 -60 92 -130 76 -172 C 40 -184 -40 -184 -76 -172 Z" fill={GREY} stroke={INK} strokeWidth={LINE} />
      <path d="M 50 -170 C 70 -120 74 -50 60 -6 C 70 -8 76 -10 76 -10 C 100 -60 92 -130 76 -172 Z" fill={GREY_SHADE} />
      <path d="M -24 -178 L 0 -150 L 24 -178" fill="none" stroke={INK} strokeWidth={3.5} />
      <path d="M 0 -150 L 2 -6" stroke={GREY_SHADE} strokeWidth={3} />
      <rect x={24} y={-140} width={34} height={28} rx={4} fill={GREY} stroke={INK} strokeWidth={3} />
      <rect x={-50} y={-120} width={20} height={6} rx={2} fill="#F2B632" />
    </g>
  );
};

export const PAPPU: HumanDesign = {
  hipY: 148, hipX: 34, thigh: 70, shin: 62, legW: 40,
  shoulderY: 168, shoulderX: 80, neckY: 176, headScale: 1.25,
  upper: 72, fore: 64, armW: 40, foreW: 30,
  sleeve: GREY, sleeveShade: GREY_SHADE, sleeveFore: 0, cuff: '#90A3BA',
  skin: ps.base, skinShade: ps.shade,
  trouser: '#2F3A52', trouserShade: '#222B3E', shoe: '#5A3A24', sole: '#2A1A12',
  Torso: PappuTorso, Head: PappuHead,
};

export const Raju: React.FC<{ p: HumanPose; viseme: Viseme; open: number; frame: number }> = (props) => <Human d={RAJU} {...props} />;
export const Pappu: React.FC<{ p: HumanPose; viseme: Viseme; open: number; frame: number }> = (props) => <Human d={PAPPU} {...props} />;
