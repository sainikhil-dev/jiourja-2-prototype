/**
 * JioUrja 2.0 — original concept wordmark for this proposal film (not an
 * official Reliance/Jio mark): a smiling rooftop-sun emblem over a panel
 * grid, with the bilingual name.
 */
import React from 'react';
import { INK } from '../characters/style';
import { FONT } from '../fonts';

export const SunEmblem: React.FC<{ r?: number; spin?: number }> = ({ r = 100, spin = 0 }) => (
  <g>
    <g transform={`rotate(${spin})`}>
      {Array.from({ length: 16 }).map((_, i) => (
        <path key={i} d={`M ${-r * 0.09} ${-r * 1.05} L 0 ${-r * 1.42} L ${r * 0.09} ${-r * 1.05} Z`} fill={i % 2 ? '#FFB020' : '#FFD84A'} transform={`rotate(${i * 22.5})`} />
      ))}
    </g>
    <circle r={r} fill="#FFC72C" stroke={INK} strokeWidth={r * 0.06} />
    {/* a tiny solar panel tucked into the sun */}
    <g transform={`translate(0 ${r * 0.34})`}>
      <path d={`M ${-r * 0.62} ${r * 0.3} L ${-r * 0.44} ${-r * 0.14} L ${r * 0.44} ${-r * 0.14} L ${r * 0.62} ${r * 0.3} Z`} fill="#1F3E7A" stroke={INK} strokeWidth={r * 0.04} strokeLinejoin="round" />
      <path d={`M ${-r * 0.15} ${-r * 0.14} L ${-r * 0.2} ${r * 0.3} M ${r * 0.15} ${-r * 0.14} L ${r * 0.2} ${r * 0.3} M ${-r * 0.53} ${r * 0.08} L ${r * 0.53} ${r * 0.08}`} stroke="#5D86C9" strokeWidth={r * 0.03} />
    </g>
    <circle cx={-r * 0.3} cy={-r * 0.22} r={r * 0.08} fill={INK} />
    <circle cx={r * 0.3} cy={-r * 0.22} r={r * 0.08} fill={INK} />
    <path d={`M ${-r * 0.26} ${-r * 0.02} Q 0 ${r * 0.16} ${r * 0.26} ${-r * 0.02}`} fill="none" stroke={INK} strokeWidth={r * 0.06} strokeLinecap="round" />
  </g>
);

export const Wordmark: React.FC<{ size?: number; light?: boolean }> = ({ size = 120, light = false }) => (
  <g>
    <text textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={size} fill={light ? '#FFFFFF' : '#1B3A8A'} stroke={light ? '#1B3A8A' : '#FFFFFF'} strokeWidth={size * 0.08} paintOrder="stroke">
      JioUrja{' '}
      <tspan fill="#FFB020">2.0</tspan>
    </text>
  </g>
);
