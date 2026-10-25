/**
 * Animated model sheet: the whole cast on one page, all alive (breathing,
 * blinking), cycling through their key expressions and the shared mouth
 * chart. This is the reference that keeps every shot on-model.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Owner } from '../characters/Owner';
import { Friend } from '../characters/Friend';
import { Raju, Pappu } from '../characters/Workers';
import { Bill, BASE_BILL, type BillPose } from '../characters/Bill';
import { BASE_HUMAN, type HumanPose } from '../characters/Human';
import { Mouth } from '../characters/parts';
import { blink } from '../rig/keyframes';
import { loadFonts } from '../fonts';
import { FONT } from '../fonts';
import type { Viseme } from '../audio/visemes';

loadFonts();

const VISEMES: Viseme[] = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const VLABEL: Record<Viseme, string> = {
  X: 'rest', A: 'म ब प', B: 'इ ई / s t k', C: 'अ ए', D: 'आ', E: 'ओ औ', F: 'उ ऊ व', G: 'फ़ (f v)', H: 'ल',
};

const ownerX: Array<Partial<HumanPose>> = [
  { smile: 0.5, squint: 0.25, aLs: 38, aLe: -112, aRs: 38, aRe: -112, hL: 'fist', hR: 'fist' },
  { browAng: -0.9, browL: 0.8, browR: 0.8, smile: -0.5, sweat: 1, turn: -0.4 },
  { jaw: 0.6, browL: 1, browR: 1, aLs: 70, aLe: 14, hL: 'open', turn: -0.5 },
  { smile: 0.9, squint: 0.5, asym: 0.4, aRs: 30, aRe: -120, hR: 'thumb', turn: 0.3 },
];
const friendX: Array<Partial<HumanPose>> = [
  { smile: 0.45, asym: 0.7, browR: 0.7 },
  { smile: 0.6, asym: 0.4, browL: 0.8, aRs: 140, aRe: 10, hR: 'point', turn: 0.3 },
  { smile: 0.3, browL: 1, browR: 0.2, aLs: 30, aLe: -120, hL: 'thumb' },
  { smile: 0.8, squint: 0.4, aLs: 20, aLe: -140, hL: 'hold', turn: -0.2 },
];
const billX: Array<Partial<BillPose>> = [
  { glint: 0.8 },
  { aRa: 120, aRb: -0.3, hR: 'point', browAng: 0.9, smile: 0.2 },
  { aLa: 205, aRa: 205, aLb: -1.6, aRb: -1.6, smile: 0.8, asym: 0.9 },
  { glasses: 1, browAng: -0.8, browL: 0.8, browR: 0.8, smile: -0.4, asym: 0, sweat: 1, scale: 0.72 },
];

const Label: React.FC<{ x: number; y: number; t: string; s: string }> = ({ x, y, t, s }) => (
  <g>
    <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#2A1A14">
      {t}
    </text>
    <text x={x} y={y + 28} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={19} fill="#6E5A4A">
      {s}
    </text>
  </g>
);

export const CharacterSheet: React.FC = () => {
  const f = useCurrentFrame();
  const phase = Math.floor(f / 60) % 4;
  const v = VISEMES[Math.floor(f / 8) % VISEMES.length];
  return (
    <AbsoluteFill style={{ background: '#F3E9D2' }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <rect x={0} y={0} width={1920} height={70} fill="#2A1A14" />
        <text x={40} y={47} fontFamily={FONT} fontWeight={800} fontSize={32} fill="#F2B632">
          FACTORY KA ASLI MAALIK! — model sheet
        </text>
        <text x={1880} y={47} textAnchor="end" fontFamily={FONT} fontWeight={500} fontSize={22} fill="#F6EBD9">
          expressions cycle every 2 s · mouth chart below
        </text>
        <g transform="translate(0 -40)">
          <Raju p={{ ...BASE_HUMAN, x: 170, y: 860, ...(phase === 2 ? { jaw: 0.5, browL: 1, browR: 1, sweat: 0.7 } : {}) }} viseme={phase === 1 ? v : 'X'} open={blink(f, 4)} frame={f} />
          <Owner p={{ ...BASE_HUMAN, x: 520, y: 860, ...ownerX[phase] }} viseme={phase === 1 ? 'X' : v} open={blink(f, 1)} frame={f} />
          <Bill p={{ ...BASE_BILL, x: 990, y: 860, scale: 0.9, ...billX[phase], ...(phase === 3 ? { scale: 0.62 } : {}) }} viseme={v} open={blink(f, 9)} frame={f} armsBehind={phase === 2} />
          <Friend p={{ ...BASE_HUMAN, x: 1460, y: 860, ...friendX[phase] }} viseme={v} open={blink(f, 5)} frame={f} />
          <Pappu p={{ ...BASE_HUMAN, x: 1770, y: 860, ...(phase === 2 ? { aRs: 112, aRe: -128, hR: 'flat', sweat: 0.7 } : {}) }} viseme="X" open={blink(f, 21)} frame={f} />
          <Label x={170} y={905} t="RAJU" s="worker · the whisperer" />
          <Label x={520} y={905} t="KHURANA JI" s="factory owner, 42" />
          <Label x={990} y={905} t="BILL BHAI" s="the electricity bill" />
          <Label x={1460} y={905} t="VICKY" s="the clever friend, 35" />
          <Label x={1770} y={905} t="PAPPU" s="worker" />
        </g>
        {/* mouth chart */}
        <rect x={0} y={930} width={1920} height={150} fill="#E8DABB" />
        {VISEMES.map((vv, i) => (
          <g key={vv} transform={`translate(${150 + i * 205} 990)`}>
            <circle r={44} fill={vv === v ? '#F2B632' : '#F6EEDB'} stroke="#2A1A14" strokeWidth={3} />
            <Mouth x={0} y={-6} w={22} h={30} viseme={vv} smile={0.1} />
            <text y={70} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={19} fill="#2A1A14">
              {vv} · {VLABEL[vv]}
            </text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
