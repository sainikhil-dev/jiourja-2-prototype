/**
 * English subtitles, timed from the aligned Hindi audio.
 *
 * Timing rules (one source for the burned-in captions AND the .srt):
 *  - IN:  the frame the cue's first word is heard, snapped forward to the first
 *         voiced frame. A subtitle never appears before the voice.
 *  - OUT: the last word's end + a short hold, extended to a comfortable reading
 *         time (≤ 17 characters/second, never under 0.7 s) but always clear
 *         of the next cue by 2 frames.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EN_CUES } from './en';
import { MASTER } from '../timeline/master';
import { lineBeats } from '../timeline/beats';
import { visemeAt } from '../audio/visemes';
import { FONT } from '../fonts';

const FPS = 30;
const HOLD = 9; // frames after the last word
const MIN = 21; // 0.7 s
const CPS = 17;
const GAP = 2;

export type TimedCue = { i: number; start: number; end: number; text: string; line: string; speaker: string; wordStart: number; wordEnd: number };

function build(): TimedCue[] {
  const byLine = new Map(lineBeats(MASTER).map((b) => [b.line.id, b.line]));
  const raw = EN_CUES.map((c, i) => {
    const l = byLine.get(c.line);
    if (!l) throw new Error(`Subtitle for unknown line ${c.line}`);
    const w0 = l.words[c.words[0]];
    const w1 = l.words[c.words[1]];
    if (!w0 || !w1) throw new Error(`Subtitle ${i} (${c.line}) word range ${c.words} out of range (${l.words.length} words)`);
    const wordStart = l.fileZero + w0.start * FPS;
    const wordEnd = l.fileZero + w1.end * FPS;
    let start = Math.ceil(wordStart);
    // snap forward to the first frame where the voice is actually sounding
    for (let k = 0; k < 8; k++) {
      if (visemeAt(l.cues, (start - l.fileZero) / FPS) !== 'X') break;
      start++;
    }
    const chars = c.text.replace(/\n/g, ' ').length;
    const end = Math.max(Math.round(wordEnd) + HOLD, start + Math.max(MIN, Math.ceil((chars / CPS) * FPS)));
    return { i, start, end, text: c.text, line: c.line, speaker: l.speaker, wordStart, wordEnd };
  });
  raw.sort((a, b) => a.start - b.start);
  for (let k = 0; k < raw.length - 1; k++) raw[k].end = Math.min(raw[k].end, raw[k + 1].start - GAP);
  // no subtitle on the brand end card
  const card = MASTER['S5.endcard'].start;
  for (const c of raw) c.end = Math.min(c.end, card - GAP);
  return raw;
}

export const SUBTITLES = build();

export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const cue = SUBTITLES.find((c) => f >= c.start && f < c.end);
  if (!cue) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div
        style={{
          marginBottom: 46,
          maxWidth: 1500,
          textAlign: 'center',
          whiteSpace: 'pre',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: 1.12,
          color: '#FFFFFF',
          WebkitTextStroke: '7px #000000',
          paintOrder: 'stroke fill',
          textShadow: '0 3px 6px rgba(0,0,0,0.45)',
          letterSpacing: 0.3,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

const tc = (frame: number) => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

export function toSrt(cues = SUBTITLES) {
  return cues.map((c, k) => `${k + 1}\n${tc(c.start)} --> ${tc(c.end)}\n${c.text}\n`).join('\n');
}
