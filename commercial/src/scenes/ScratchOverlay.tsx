/**
 * Animatic-only overlay. Makes it impossible to mistake the preview for a
 * finished, voiced cut: shows which line is "playing", who says it, and
 * whether its timing is SCRATCH (guessed, no audio) or from a real file.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { lineBeats, type Resolved } from '../timeline/beats';
import { LINE } from '../timeline/script';
import { FONT } from '../fonts';

const NAME: Record<string, string> = {
  owner: 'KHURANA JI (Owner)',
  friend: 'VICKY (Friend)',
  bill: 'BILL BHAI (Electricity Bill)',
  raju: 'RAJU (Worker)',
  pappu: 'PAPPU (Worker)',
  announcer: 'ANNOUNCER',
};

export const ScratchOverlay: React.FC<{ beats: Resolved }> = ({ beats }) => {
  const f = useCurrentFrame();
  const lines = lineBeats(beats);
  const active = lines.find((b) => f >= b.line.speechStart && f < b.line.speechEnd);
  const anyScratch = lines.some((b) => b.line.scratch);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 22,
          padding: '8px 16px',
          borderRadius: 10,
          background: 'rgba(20,16,14,0.72)',
          color: '#FFE9A8',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        ANIMATIC PREVIEW · {anyScratch ? 'scratch lip timing — no voices yet' : 'voiced'} · placeholder SFX/music
      </div>
      {active && (
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 26px 8px',
            borderRadius: 14,
            background: 'rgba(20,16,14,0.78)',
            color: '#fff',
            textAlign: 'center',
            maxWidth: 1500,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: active.line.scratch ? '#FFB86B' : '#8EF0A8' }}>
            {NAME[active.line.speaker]} · {active.line.scratch ? 'SCRATCH TIMING' : active.line.source}
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.25 }}>{LINE[active.line.id].lip}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
