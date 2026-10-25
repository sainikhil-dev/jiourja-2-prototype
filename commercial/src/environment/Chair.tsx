/**
 * THE CHAIR — the owner's maroon executive chair, the prize in this story.
 * Split into back (behind the sitter) and front (seat edge, armrests, base)
 * so a character can sit "in" it. `spin` turns the chair (one unit = one
 * revolution, faked in 2D with a horizontal squash), `squash` compresses
 * the cushion when someone plops down.
 */
import React from 'react';
import { INK, LINE } from '../characters/style';
import { FLOOR } from './Factory';

export type ChairState = { x: number; spin: number; squash: number; recline: number; tilt: number; roll: number };
export const BASE_CHAIR: ChairState = { x: 2000, spin: 0, squash: 0, recline: 0, tilt: 0, roll: 0 };

const LEATHER = '#8E2430';
const LEATHER_LIGHT = '#B23A45';
const LEATHER_DARK = '#5E1520';
/** The chair is a high-back "throne", a little too grand for a small factory. */
export const CHAIR_SCALE = 1.35;
export const SEAT_Y = FLOOR - 220 * CHAIR_SCALE;
const place = (x: number) => `translate(${x} ${FLOOR}) scale(${CHAIR_SCALE}) translate(0 -220)`;

const facingScale = (spin: number) => Math.cos(spin * Math.PI * 2);

export const ChairBack: React.FC<{ c: ChairState }> = ({ c }) => {
  const k = facingScale(c.spin);
  const back = k < 0;
  return (
    <g transform={`${place(c.x)} rotate(${c.tilt}) scale(${Math.max(0.08, Math.abs(k))} 1) rotate(${c.recline} 0 0)`}>
      <path
        d="M -120 -10 C -136 -120 -130 -260 -96 -330 C -60 -370 60 -370 96 -330 C 130 -260 136 -120 120 -10 Z"
        fill={back ? LEATHER_DARK : LEATHER}
        stroke={INK}
        strokeWidth={LINE * 1.3}
        strokeLinejoin="round"
      />
      {!back && (
        <>
          {/* tufted panels */}
          <path d="M -80 -40 C -90 -130 -86 -230 -64 -296 C -30 -320 30 -320 64 -296 C 86 -230 90 -130 80 -40 Z" fill={LEATHER_LIGHT} stroke={INK} strokeWidth={LINE * 0.8} />
          {[-230, -160, -90].map((y) => [-36, 0, 36].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r={5} fill={LEATHER_DARK} />))}
          <path d="M -60 -290 Q -20 -310 10 -300" stroke="#E8737D" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
        </>
      )}
    </g>
  );
};

export const ChairFront: React.FC<{ c: ChairState }> = ({ c }) => {
  const k = facingScale(c.spin);
  const squash = c.squash;
  return (
    <g transform={place(c.x)}>
      {/* gas lift + star base */}
      <rect x={-12} y={20} width={24} height={150 - squash * 20} fill="#6B6F74" stroke={INK} strokeWidth={LINE} />
      <path d="M -130 186 L 130 186 L 116 170 L -116 170 Z" fill="#3A3D42" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      {[-120, -40, 40, 120].map((x, i) => (
        <g key={x} transform={`translate(${x} 200) rotate(${c.roll * 40 + i * 30})`}>
          <circle r={18} fill="#222" stroke={INK} strokeWidth={LINE} />
          <line x1={-10} y1={0} x2={10} y2={0} stroke="#666" strokeWidth={4} />
        </g>
      ))}
      <g transform={`scale(${Math.max(0.25, Math.abs(k))} ${1 - squash * 0.35})`}>
        {/* seat cushion */}
        <path d="M -140 -14 C -146 -30 -130 -40 -110 -40 L 110 -40 C 130 -40 146 -30 140 -14 L 132 30 C 80 44 -80 44 -132 30 Z" fill={LEATHER} stroke={INK} strokeWidth={LINE * 1.3} strokeLinejoin="round" />
        <path d="M -110 -26 L 110 -26" stroke={LEATHER_LIGHT} strokeWidth={8} strokeLinecap="round" />
        {/* armrests */}
        {[-1, 1].map((s) => (
          <g key={s} transform={`scale(${s} 1)`}>
            <path d="M 120 -10 L 132 -110 L 172 -116 C 184 -116 186 -104 178 -96 L 150 30 Z" fill={LEATHER_DARK} stroke={INK} strokeWidth={LINE * 1.2} strokeLinejoin="round" />
          </g>
        ))}
      </g>
    </g>
  );
};
