/**
 * The JioUrja 2.0 app, illustrated — shown as a magnified screen next to the
 * phone in Vicky's hand (characters stay on screen; no full-screen infographic).
 *
 * `step` 0..4 = Upload bill → AI system → Site & credit checks → Install → Monitor
 * `t`    frames since the current step began (drives the micro-animations)
 */
import React from 'react';
import { INK } from '../characters/style';
import { FONT } from '../fonts';
import { ease } from '../rig/keyframes';
import { SunEmblem } from './Logo';

const W = 380;
const H = 760;
const BLUE = '#1B3A8A';
const STEPS = ['बिल', 'AI', 'जाँच', 'सोलर', 'मॉनिटर'];

const Check: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) =>
  k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${ease('back', Math.min(1, k))})`}>
      <circle r={20} fill="#2FB86A" stroke={INK} strokeWidth={3} />
      <path d="M -9 1 L -2 8 L 10 -7" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );

const Title: React.FC<{ hi: string; en: string }> = ({ hi, en }) => (
  <g>
    <text x={W / 2} y={150} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={38} fill={BLUE}>
      {hi}
    </text>
    <text x={W / 2} y={182} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={20} fill="#6B7A99">
      {en}
    </text>
  </g>
);

function Screen({ step, t }: { step: number; t: number }) {
  const p = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  switch (step) {
    case 0: // upload the bill
      return (
        <g>
          <Title hi="बिल अपलोड करें" en="Upload your electricity bill" />
          <g transform={`translate(${W / 2} 380) scale(${0.9 + 0.1 * ease('back', p(0, 10))})`}>
            <rect x={-110} y={-140} width={220} height={280} rx={10} fill="#FFF9EA" stroke={INK} strokeWidth={4} />
            <rect x={-110} y={-140} width={220} height={44} rx={10} fill="#D6332A" />
            <text x={0} y={-108} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={24} fill="#fff">
              बिजली बिल
            </text>
            {[-60, -36, -12].map((y) => (
              <rect key={y} x={-86} y={y} width={150} height={10} rx={5} fill="#D9CFB8" />
            ))}
            <text x={-86} y={56} fontFamily={FONT} fontWeight={800} fontSize={34} fill={INK}>
              ₹ 4,87,650
            </text>
            {/* scanner line */}
            <rect x={-118} y={-140 + 280 * p(4, 30)} width={236} height={6} fill="#2FB86A" opacity={p(4, 8) * (1 - p(30, 34))} />
            {/* viewfinder corners */}
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
              <path key={i} d={`M ${sx * 130} ${sy * 130} l 0 ${-sy * 30} M ${sx * 130} ${sy * 130} l ${-sx * 30} 0`} transform={`translate(0 ${sy * 30})`} stroke={BLUE} strokeWidth={6} strokeLinecap="round" />
            ))}
          </g>
          <rect x={50} y={590} width={W - 100} height={18} rx={9} fill="#E3E8F2" />
          <rect x={50} y={590} width={(W - 100) * p(6, 34)} height={18} rx={9} fill="#2FB86A" />
          <Check x={W / 2} y={660} k={p(34, 40)} />
        </g>
      );
    case 1: // AI picks the right system
      return (
        <g>
          <Title hi="AI से सही सिस्टम" en="AI-assisted system sizing" />
          <g transform="translate(40 230)">
            <path d="M 10 30 L 250 0 L 290 210 L 40 250 Z" fill="#CFD6DD" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
            {Array.from({ length: 12 }).map((_, i) => {
              const r = Math.floor(i / 4);
              const c = i % 4;
              const k = p(4 + i * 1.6, 8 + i * 1.6);
              return (
                <rect key={i} x={46 + c * 52 + r * 6} y={44 + r * 58 - c * 6} width={44} height={48} rx={3} fill="#1F3E7A" stroke="#5D86C9" strokeWidth={2} opacity={k} transform={`translate(0 ${(1 - k) * -14})`} />
              );
            })}
            {/* AI sparkle */}
            <g transform={`translate(280 10) rotate(${t * 4}) scale(${0.6 + 0.2 * Math.sin(t / 3)})`}>
              <path d="M 0 -22 L 5 -5 L 22 0 L 5 5 L 0 22 L -5 5 L -22 0 L -5 -5 Z" fill="#FFB020" stroke={INK} strokeWidth={2} />
            </g>
          </g>
          <g opacity={p(22, 28)} transform={`translate(0 ${(1 - p(22, 28)) * 20})`}>
            <rect x={40} y={520} width={W - 80} height={110} rx={16} fill="#EEF3FF" stroke={BLUE} strokeWidth={3} />
            <text x={W / 2} y={562} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill="#6B7A99">
              सुझाया गया सिस्टम
            </text>
            <text x={W / 2} y={608} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={42} fill={BLUE}>
              40 kW रूफटॉप
            </text>
          </g>
        </g>
      );
    case 2: // site & credit checks
      return (
        <g>
          <Title hi="साइट और क्रेडिट जाँच" en="Site & credit review" />
          {[
            ['साइट सर्वे', 'Site survey'],
            ['क्रेडिट चेक', 'Credit check'],
            ['पात्रता', 'Eligibility'],
          ].map(([hi, en], i) => {
            const k = p(4 + i * 12, 10 + i * 12);
            return (
              <g key={i} transform={`translate(0 ${250 + i * 120})`} opacity={Math.max(0.35, k)}>
                <rect x={36} y={-44} width={W - 72} height={92} rx={16} fill={k > 0.5 ? '#EAF8F0' : '#F3F5F9'} stroke={k > 0.5 ? '#2FB86A' : '#C9D1DE'} strokeWidth={3} />
                <text x={64} y={2} fontFamily={FONT} fontWeight={800} fontSize={30} fill={INK}>
                  {hi}
                </text>
                <text x={64} y={30} fontFamily={FONT} fontWeight={600} fontSize={18} fill="#6B7A99">
                  {en}
                </text>
                <Check x={W - 80} y={0} k={p(6 + i * 12, 12 + i * 12)} />
              </g>
            );
          })}
        </g>
      );
    case 3: // install
      return (
        <g>
          <Title hi="सोलर इंस्टॉलेशन" en="Installation by JioUrja" />
          <g transform="translate(40 250)">
            <path d="M 0 210 L 0 120 L 150 30 L 300 120 L 300 210 Z" fill="#E7D3A9" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
            <path d="M -10 126 L 150 26 L 310 126" fill="none" stroke="#8E2430" strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
            {Array.from({ length: 6 }).map((_, i) => {
              const k = p(2 + i * 3, 6 + i * 3);
              const side = i < 3 ? -1 : 1;
              const j = i % 3;
              return (
                <rect key={i} x={side < 0 ? 26 + j * 40 : 160 + j * 40} y={side < 0 ? 88 - j * 22 : 46 + j * 22} width={34} height={26} rx={2} fill="#1F3E7A" stroke="#5D86C9" strokeWidth={2} transform={`translate(0 ${(1 - ease('back', k)) * -30})`} opacity={k} />
              );
            })}
          </g>
          <g opacity={p(16, 22)}>
            <rect x={70} y={540} width={W - 140} height={64} rx={32} fill={BLUE} />
            <text x={W / 2} y={582} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={28} fill="#fff">
              इंस्टॉल शेड्यूल ✓
            </text>
          </g>
        </g>
      );
    default: {
      // live monitoring
      const kwh = Math.round(120 + t * 7.3);
      return (
        <g>
          <Title hi="लाइव मॉनिटरिंग" en="Energy monitoring" />
          <g transform="translate(110 290)">
            <SunEmblem r={48} spin={t * 3} />
          </g>
          <text x={190} y={276} fontFamily={FONT} fontWeight={800} fontSize={54} fill={BLUE}>
            {kwh} kWh
          </text>
          <text x={190} y={308} fontFamily={FONT} fontWeight={600} fontSize={20} fill="#6B7A99">
            आज की सोलर बिजली
          </text>
          {[0.45, 0.6, 0.52, 0.75, 0.68, 0.88, 0.95].map((v, i) => {
            const k = p(i * 2, 8 + i * 2);
            return <rect key={i} x={50 + i * 42} y={620 - 220 * v * k} width={30} height={220 * v * k} rx={6} fill={i === 6 ? '#FFB020' : '#5D86C9'} />;
          })}
          <line x1={40} x2={W - 40} y1={622} y2={622} stroke="#C9D1DE" strokeWidth={3} />
        </g>
      );
    }
  }
}

export const PhoneApp: React.FC<{ step: number; t: number; x: number; y: number; scale?: number; opacity?: number }> = ({ step, t, x, y, scale = 1, opacity = 1 }) => {
  const slide = 1 - ease('out', Math.min(1, t / 7));
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect x={-18} y={-18} width={W + 36} height={H + 36} rx={56} fill="#15171C" stroke={INK} strokeWidth={6} />
      <defs>
        <clipPath id="phoneScreen">
          <rect width={W} height={H} rx={40} />
        </clipPath>
      </defs>
      <g clipPath="url(#phoneScreen)">
        <rect width={W} height={H} fill="#FFFFFF" />
        {/* app bar */}
        <rect width={W} height={96} fill={BLUE} />
        <g transform="translate(52 52)">
          <SunEmblem r={22} />
        </g>
        <text x={88} y={64} fontFamily={FONT} fontWeight={800} fontSize={32} fill="#fff">
          JioUrja <tspan fill="#FFB020">2.0</tspan>
        </text>
        <g transform={`translate(${slide * 60} 0)`} opacity={1 - slide}>
          <Screen step={step} t={t} />
        </g>
        {/* journey dots */}
        <g transform={`translate(0 ${H - 70})`}>
          <line x1={50} x2={W - 50} y1={0} y2={0} stroke="#C9D1DE" strokeWidth={4} />
          {STEPS.map((s, i) => (
            <g key={s} transform={`translate(${50 + (i * (W - 100)) / 4} 0)`}>
              <circle r={i === step ? 14 : 10} fill={i <= step ? '#2FB86A' : '#C9D1DE'} stroke={i === step ? INK : 'none'} strokeWidth={3} />
              <text y={36} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={17} fill={i === step ? BLUE : '#8A95AC'}>
                {s}
              </text>
            </g>
          ))}
        </g>
      </g>
      <rect x={W / 2 - 50} y={8} width={100} height={18} rx={9} fill="#15171C" />
    </g>
  );
};

/** The physical phone in a character's hand (world space). */
export const PhoneProp: React.FC<{ x: number; y: number; angle: number; s?: number }> = ({ x, y, angle, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`}>
    <rect x={-26} y={-48} width={52} height={96} rx={10} fill="#15171C" stroke={INK} strokeWidth={4} />
    <rect x={-20} y={-40} width={40} height={78} rx={5} fill="#3E6FD8" />
    <rect x={-20} y={-40} width={40} height={14} fill="#1B3A8A" />
  </g>
);
