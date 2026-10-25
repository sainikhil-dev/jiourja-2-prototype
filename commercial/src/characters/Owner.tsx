/**
 * CHARACTER A — "Khurana ji", the factory owner (42).
 * Pale-blue rolled-sleeve shirt, dark trousers, belly, bald dome with side
 * hair and a hopeful comb-over, bushy moustache, tired under-eye bags.
 */
import React, { useId } from 'react';
import { Brow, Eye, Mouth, Sweat } from './parts';
import { Human, type HeadProps, type HumanDesign, type HumanPose } from './Human';
import { INK, LINE, SKIN, safeId } from './style';
import { VISEME_SHAPES, type Viseme } from '../audio/visemes';
import { breathe } from '../rig/keyframes';

const sk = SKIN.owner;
const SHIRT = '#D7E7F3';
const SHIRT_SHADE = '#A9C4DA';
const HAIR = '#2B2421';

const FACE = 'M -60 -88 C -62 -130 -36 -154 0 -154 C 36 -154 62 -130 60 -88 C 60 -50 42 -18 0 -16 C -42 -18 -60 -50 -60 -88 Z';

export const OwnerHead: React.FC<HeadProps> = ({ p, viseme, open, frame }) => {
  const id = safeId(useId());
  const fx = p.turn * 16;
  const eyeOpen = Math.min(open, 1 - p.lid);
  const mOpen = viseme === 'X' ? p.jaw : VISEME_SHAPES[viseme].open;
  const droop = -p.smile * 7 + mOpen * 2;
  const worry = Math.max(0, -p.browAng);
  return (
    <g>
      <rect x={-25} y={-42} width={50} height={48} fill={sk.base} stroke={INK} strokeWidth={LINE} />
      <rect x={4} y={-40} width={18} height={44} fill={sk.shade} opacity={0.6} />
      {/* ears */}
      <ellipse cx={-60 + fx * 0.25} cy={-86} rx={11 * (1 - Math.max(0, -p.turn) * 0.5)} ry={18} fill={sk.base} stroke={INK} strokeWidth={LINE} />
      <ellipse cx={60 + fx * 0.25} cy={-86} rx={11 * (1 - Math.max(0, p.turn) * 0.5)} ry={18} fill={sk.base} stroke={INK} strokeWidth={LINE} />
      <defs>
        <clipPath id={`f${id}`}>
          <path d={FACE} />
        </clipPath>
      </defs>
      <path d={FACE} fill={sk.base} />
      <g clipPath={`url(#f${id})`}>
        <ellipse cx={52 + fx * 0.6} cy={-70} rx={34} ry={100} fill={sk.shade} opacity={0.55} />
        <ellipse cx={fx} cy={-6} rx={70} ry={22} fill={sk.shade} opacity={0.4} />
        {/* side hair */}
        <path d={`M -62 -78 C -70 -108 -62 -130 -46 -140 C -42 -128 -46 -112 -50 -98 C -52 -90 -53 -84 -54 -76 Z`} fill={HAIR} transform={`translate(${fx * 0.2} 0)`} />
        <path d={`M 62 -78 C 70 -108 62 -130 46 -140 C 42 -128 46 -112 50 -98 C 52 -90 53 -84 54 -76 Z`} fill={HAIR} transform={`translate(${fx * 0.2} 0)`} />
      </g>
      <path d={FACE} fill="none" stroke={INK} strokeWidth={LINE} />
      {/* grey temples + comb-over strands */}
      <path d={`M ${-56 + fx * 0.2} -110 q 4 -10 10 -16 M ${56 + fx * 0.2} -110 q -4 -10 -10 -16`} stroke="#8D8682" strokeWidth={3} fill="none" strokeLinecap="round" />
      <g transform={`translate(${fx * 0.35} 0)`} fill="none" stroke={HAIR} strokeWidth={3.2} strokeLinecap="round">
        <path d="M -34 -146 C -14 -160 14 -160 34 -146" />
        <path d="M -26 -152 C -8 -162 12 -161 28 -151" />
      </g>
      <ellipse cx={-20 + fx * 0.3} cy={-136} rx={15} ry={6} fill="#fff" opacity={0.5} transform={`rotate(-16 ${-20 + fx * 0.3} -136)`} />
      {/* forehead worry lines */}
      {worry > 0.1 && (
        <g opacity={Math.min(1, worry * 1.3)} stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round">
          <path d={`M ${-20 + fx} -134 Q ${fx} -138 ${20 + fx} -134`} />
          <path d={`M ${-14 + fx} -142 Q ${fx} -145 ${14 + fx} -142`} />
        </g>
      )}
      {/* eyes */}
      <Eye cx={-23 + fx} cy={-96} rx={13} ry={16} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={sk.base} lidAngle={p.browAng * 8} />
      <Eye cx={23 + fx} cy={-96} rx={13} ry={16} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={sk.base} lidAngle={-p.browAng * 8} />
      {/* tired bags */}
      <path d={`M ${-33 + fx} -76 q 10 6 20 0 M ${13 + fx} -76 q 10 6 20 0`} fill="none" stroke={sk.shade} strokeWidth={3} strokeLinecap="round" />
      <Brow cx={-24 + fx} cy={-121} w={34} t={8.5} side={-1} raise={p.browL} angle={p.browAng} arch={0.3} />
      <Brow cx={24 + fx} cy={-121} w={34} t={8.5} side={1} raise={p.browR} angle={p.browAng} arch={0.3} />
      {/* cheeks */}
      {p.blush > 0 && (
        <g fill={sk.blush} opacity={p.blush * 0.5}>
          <ellipse cx={-38 + fx} cy={-58} rx={12} ry={7} />
          <ellipse cx={38 + fx} cy={-58} rx={12} ry={7} />
        </g>
      )}
      <Mouth x={fx * 1.1} y={-40} w={19} h={30} viseme={viseme} smile={p.smile} asym={p.asym} jaw={p.jaw} />
      {/* bulbous nose */}
      <g transform={`translate(${fx * 1.3} 0)`}>
        <path d="M -7 -100 C -11 -90 -24 -84 -24 -70 C -24 -57 -11 -53 0 -56 C 11 -53 24 -57 24 -70 C 24 -84 11 -90 7 -100 Z" fill={sk.base} />
        <path d="M -11 -88 C -24 -82 -24 -70 -22 -64 C -18 -55 -8 -54 0 -57 C 8 -54 18 -55 22 -64 C 24 -70 24 -82 11 -88" fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
        <path d="M 6 -66 C 12 -66 14 -72 12 -78" fill="none" stroke={sk.shade} strokeWidth={4} strokeLinecap="round" />
        <path d="M -8 -64 q 3 2 5 0 M 3 -64 q 3 2 5 0" stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </g>
      {/* the moustache: lifts with an open mouth, droops with a frown */}
      <g transform={`translate(${fx * 1.15} ${-52 - mOpen * 5})`}>
        <path
          d={`M -46 ${-2 + droop} C -42 -14 -22 -19 -8 -14 C -4 -16 4 -16 8 -14 C 22 -19 42 -14 46 ${-2 + droop}
             C 47 ${6 + droop} 40 ${9 + droop} 34 ${4 + droop} C 26 0 14 2 0 -1 C -14 2 -26 0 -34 ${4 + droop} C -40 ${9 + droop} -47 ${6 + droop} -46 ${-2 + droop} Z`}
          fill={HAIR}
          stroke={INK}
          strokeWidth={LINE * 0.8}
          strokeLinejoin="round"
        />
        <path d="M -30 -8 q 6 -3 12 0 M 18 -8 q 6 -3 12 0" stroke="#5A4E49" strokeWidth={2} fill="none" strokeLinecap="round" />
      </g>
      {/* chin */}
      <path d={`M ${-24 + fx * 0.6} -20 Q ${fx * 0.6} -10 ${24 + fx * 0.6} -20`} fill="none" stroke={sk.shade} strokeWidth={3.2} strokeLinecap="round" />
      <Sweat x={-44 + fx} y={-138} amount={p.sweat} frame={frame} seed={3} />
    </g>
  );
};

export const OwnerTorso: React.FC<{ p: HumanPose; frame: number }> = ({ frame }) => {
  const id = safeId(useId());
  const b = 1 + breathe(frame, 1) * 0.012;
  // pear-shaped: the belly bulges past the shoulders and hangs over the belt
  const torso =
    'M -74 -186 C -84 -160 -92 -132 -98 -98 C -106 -58 -100 -24 -82 -10 C -50 8 50 8 82 -10 C 100 -24 106 -58 98 -98 C 92 -132 84 -160 74 -186 C 40 -198 -40 -198 -74 -186 Z';
  return (
    <g>
      {/* trouser seat */}
      <path d="M -66 -14 L 66 -14 L 70 28 C 40 40 -40 40 -70 28 Z" fill="#3A4157" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      {/* belt: mostly hidden under the belly */}
      <rect x={-80} y={-22} width={160} height={16} rx={5} fill="#5B3A22" stroke={INK} strokeWidth={LINE} />
      <g transform={`translate(0 -90) scale(${b} ${1 + (b - 1) * 0.5}) translate(0 90)`}>
        <defs>
          <clipPath id={`t${id}`}>
            <path d={torso} />
          </clipPath>
        </defs>
        <path d={torso} fill={SHIRT} />
        <g clipPath={`url(#t${id})`}>
          {[-60, -40, -20, 20, 40, 60].map((x) => (
            <line key={x} x1={x} x2={x * 1.08} y1={-200} y2={0} stroke="#C2D6E7" strokeWidth={3} />
          ))}
          <ellipse cx={74} cy={-90} rx={34} ry={110} fill={SHIRT_SHADE} opacity={0.7} />
          <path d="M -104 -44 Q 0 -4 104 -44 L 104 10 L -104 10 Z" fill={SHIRT_SHADE} opacity={0.45} />
          <path d="M -60 -40 Q 0 -16 60 -40" fill="none" stroke={SHIRT_SHADE} strokeWidth={3} />
        </g>
        <path d={torso} fill="none" stroke={INK} strokeWidth={LINE} />
        {/* placket and buttons over the belly curve */}
        <path d="M 0 -184 C 4 -120 8 -60 4 2" fill="none" stroke="#9DB7CC" strokeWidth={3} />
        {[-160, -124, -88, -52, -18].map((y, i) => (
          <circle key={y} cx={2 + (i > 1 ? 4 : 0)} cy={y} r={3.6} fill="#fff" stroke={INK} strokeWidth={2} />
        ))}
        {/* pocket with pen */}
        <rect x={-58} y={-154} width={11} height={30} rx={3} fill="#1F5FAF" stroke={INK} strokeWidth={2.5} />
        <path d="M -66 -140 L -34 -140 L -34 -112 Q -50 -106 -66 -112 Z" fill={SHIRT} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        {/* collar */}
        <path d="M -30 -194 L -6 -170 L -2 -188 Z M 30 -194 L 6 -170 L 2 -188 Z" fill="#EEF5FB" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      </g>
    </g>
  );
};

export const OWNER: HumanDesign = {
  hipY: 165,
  hipX: 36,
  thigh: 80,
  shin: 70,
  legW: 42,
  shoulderY: 178,
  shoulderX: 76,
  headScale: 1.3,
  neckY: 190,
  upper: 76,
  fore: 68,
  armW: 38,
  foreW: 28,
  sleeve: SHIRT,
  sleeveShade: SHIRT_SHADE,
  sleeveFore: 0,
  cuff: '#C7DAEA',
  skin: sk.base,
  skinShade: sk.shade,
  trouser: '#3A4157',
  trouserShade: '#2A3043',
  shoe: '#4A2E1E',
  sole: '#2A1A12',
  watch: true,
  Torso: OwnerTorso,
  Head: OwnerHead,
};

export const Owner: React.FC<{ p: HumanPose; viseme: Viseme; open: number; frame: number }> = (props) => <Human d={OWNER} {...props} />;
