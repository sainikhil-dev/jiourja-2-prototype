/**
 * CHARACTER B — "Vicky", the clever friend (35).
 * Teal overshirt with pushed-up sleeves over an off-white tee, beige chinos,
 * white sneakers. Styled quiff, trimmed beard, very mobile eyebrows and a
 * default lopsided, mischievous half-smile.
 */
import React, { useId } from 'react';
import { Brow, Eye, Mouth, Sweat } from './parts';
import { Human, type HeadProps, type HumanDesign, type HumanPose } from './Human';
import { INK, LINE, SKIN, safeId } from './style';
import type { Viseme } from '../audio/visemes';
import { breathe } from '../rig/keyframes';

const sk = SKIN.friend;
const HAIR = '#1C1716';
const TEAL = '#1F807B';
const TEAL_SHADE = '#165D59';

const FACE = 'M -50 -96 C -52 -136 -30 -156 0 -156 C 30 -156 52 -136 50 -96 C 50 -60 38 -26 14 -18 C 6 -15 -6 -15 -14 -18 C -38 -26 -50 -60 -50 -96 Z';

export const FriendHead: React.FC<HeadProps> = ({ p, viseme, open, frame }) => {
  const id = safeId(useId());
  const fx = p.turn * 14;
  const eyeOpen = Math.min(open, 1 - p.lid);
  return (
    <g>
      <rect x={-20} y={-40} width={40} height={46} fill={sk.base} stroke={INK} strokeWidth={LINE} />
      <rect x={4} y={-38} width={14} height={42} fill={sk.shade} opacity={0.6} />
      <ellipse cx={-50 + fx * 0.25} cy={-90} rx={10 * (1 - Math.max(0, -p.turn) * 0.5)} ry={16} fill={sk.base} stroke={INK} strokeWidth={LINE} />
      <ellipse cx={50 + fx * 0.25} cy={-90} rx={10 * (1 - Math.max(0, p.turn) * 0.5)} ry={16} fill={sk.base} stroke={INK} strokeWidth={LINE} />
      <defs>
        <clipPath id={`f${id}`}>
          <path d={FACE} />
        </clipPath>
      </defs>
      <path d={FACE} fill={sk.base} />
      <g clipPath={`url(#f${id})`}>
        <ellipse cx={44 + fx * 0.6} cy={-80} rx={28} ry={100} fill={sk.shade} opacity={0.5} />
        {/* trimmed beard */}
        <path
          d={`M -52 -84 C -50 -54 -40 -32 -16 -24 C -8 -20 8 -20 16 -24 C 40 -32 50 -54 52 -84 L 60 -10 L -60 -10 Z`}
          fill="#3B2A24"
          opacity={0.42}
          transform={`translate(${fx * 0.3} 0)`}
        />
      </g>
      <path d={FACE} fill="none" stroke={INK} strokeWidth={LINE} />
      {/* quiff */}
      <g transform={`translate(${fx * 0.3} 0)`}>
        <path
          d="M -54 -102 C -60 -140 -44 -170 -10 -178 C 10 -190 44 -186 56 -166 C 66 -150 58 -128 52 -112 C 48 -128 40 -140 26 -144 C 10 -136 -14 -138 -30 -146 C -40 -132 -46 -118 -48 -100 Z"
          fill={HAIR}
          stroke={INK}
          strokeWidth={LINE}
          strokeLinejoin="round"
        />
        <path d="M -6 -172 C 14 -180 36 -176 46 -164 M 0 -160 C 16 -166 32 -164 40 -156" stroke="#4A403D" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
      <Eye cx={-20 + fx} cy={-98} rx={11} ry={13} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={sk.base} lidAngle={p.browAng * 8} pupil={0.46} />
      <Eye cx={20 + fx} cy={-98} rx={11} ry={13} lookX={p.lookX} lookY={p.lookY} open={eyeOpen} squint={p.squint} lidColor={sk.base} lidAngle={-p.browAng * 8} pupil={0.46} />
      {/* expressive, highly arched brows */}
      <Brow cx={-21 + fx} cy={-121} w={30} t={6.5} side={-1} raise={p.browL} angle={p.browAng} arch={0.5} color={HAIR} />
      <Brow cx={21 + fx} cy={-121} w={30} t={6.5} side={1} raise={p.browR} angle={p.browAng} arch={0.5} color={HAIR} />
      {/* nose */}
      <path d={`M ${2 + fx * 1.25} -96 C ${fx * 1.25 + 6} -86 ${fx * 1.25 + 12} -76 ${fx * 1.25 + 8} -70 C ${fx * 1.25 + 4} -66 ${fx * 1.25 - 4} -66 ${fx * 1.25 - 8} -70`} fill="none" stroke={INK} strokeWidth={LINE * 0.9} strokeLinecap="round" />
      {/* moustache */}
      <path d={`M ${-22 + fx * 1.15} -54 C ${-12 + fx * 1.15} -62 ${-4 + fx * 1.15} -60 ${fx * 1.15} -57 C ${4 + fx * 1.15} -60 ${12 + fx * 1.15} -62 ${22 + fx * 1.15} -54 C ${12 + fx * 1.15} -56 ${4 + fx * 1.15} -54 ${fx * 1.15} -54 C ${-4 + fx * 1.15} -54 ${-12 + fx * 1.15} -56 ${-22 + fx * 1.15} -54 Z`} fill={HAIR} stroke={HAIR} strokeWidth={3} strokeLinejoin="round" />
      <Mouth x={fx * 1.1} y={-43} w={18} h={26} viseme={viseme} smile={p.smile} asym={p.asym} jaw={p.jaw} />
      {p.blush > 0 && (
        <g fill={sk.blush} opacity={p.blush * 0.5}>
          <ellipse cx={-32 + fx} cy={-66} rx={10} ry={6} />
          <ellipse cx={32 + fx} cy={-66} rx={10} ry={6} />
        </g>
      )}
      <Sweat x={-36 + fx} y={-140} amount={p.sweat} frame={frame} seed={5} />
    </g>
  );
};

export const FriendTorso: React.FC<{ p: HumanPose; frame: number }> = ({ frame }) => {
  const id = safeId(useId());
  const b = 1 + breathe(frame, 2) * 0.01;
  const torso = 'M -66 -192 C -74 -150 -70 -90 -58 -40 C -54 -20 -52 -8 -50 -2 L 50 -2 C 52 -8 54 -20 58 -40 C 70 -90 74 -150 66 -192 C 34 -202 -34 -202 -66 -192 Z';
  return (
    <g>
      <path d="M -52 -14 L 52 -14 L 56 26 C 30 36 -30 36 -56 26 Z" fill="#CDAE7C" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <rect x={-54} y={-20} width={108} height={14} rx={5} fill="#6B4528" stroke={INK} strokeWidth={LINE} />
      <g transform={`translate(0 -96) scale(${b}) translate(0 96)`}>
        <defs>
          <clipPath id={`t${id}`}>
            <path d={torso} />
          </clipPath>
        </defs>
        <path d={torso} fill={TEAL} />
        <g clipPath={`url(#t${id})`}>
          {/* tee inside the open overshirt */}
          <path d="M -30 -200 L 30 -200 L 26 0 L -26 0 Z" fill="#F3EEE2" />
          <path d="M -26 -112 L 26 -112" stroke="#E86C2C" strokeWidth={7} />
          <ellipse cx={60} cy={-90} rx={26} ry={120} fill={TEAL_SHADE} opacity={0.8} />
          <path d="M -30 -200 L 30 -200 L 26 0 L -26 0 Z" fill="none" stroke={INK} strokeWidth={3.5} />
        </g>
        <path d={torso} fill="none" stroke={INK} strokeWidth={LINE} />
        {/* lapels */}
        <path d="M -34 -196 L -10 -150 L -30 -120 Z M 34 -196 L 10 -150 L 30 -120 Z" fill={TEAL_SHADE} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <path d="M -22 -198 Q 0 -178 22 -198" fill="none" stroke={INK} strokeWidth={3.5} />
        {/* phone in the chest pocket */}
        <rect x={34} y={-150} width={18} height={28} rx={3} fill="#222" stroke={INK} strokeWidth={2.5} />
        <path d="M 28 -138 L 58 -138 L 56 -112 L 30 -112 Z" fill={TEAL} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </g>
  );
};

export const FRIEND: HumanDesign = {
  hipY: 182,
  hipX: 28,
  thigh: 88,
  shin: 78,
  legW: 34,
  shoulderY: 186,
  shoulderX: 66,
  neckY: 196,
  headScale: 1.28,
  upper: 82,
  fore: 72,
  armW: 32,
  foreW: 24,
  sleeve: TEAL,
  sleeveShade: TEAL_SHADE,
  sleeveFore: 0.42,
  cuff: '#249089',
  skin: sk.base,
  skinShade: sk.shade,
  trouser: '#CDAE7C',
  trouserShade: '#AE8F5E',
  shoe: '#F5F2EA',
  sole: '#E8692C',
  Torso: FriendTorso,
  Head: FriendHead,
};

export const Friend: React.FC<{ p: HumanPose; viseme: Viseme; open: number; frame: number }> = (props) => <Human d={FRIEND} {...props} />;
