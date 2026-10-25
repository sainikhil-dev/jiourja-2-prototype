/**
 * English subtitle QA + SRT export.
 *
 *   npm run qa:sync            (renders out/dialogue.wav — the audio the viewer hears)
 *   npx tsx scripts/qa-subtitles.tsx out/dialogue.wav
 *
 * Writes deliverables/final/JioUrja2_English.srt and SUBTITLE_QA.md. Checks every cue against the
 * RENDERED dialogue audio: it must not appear before its words are audible,
 * it must stay up while they are spoken, cues never overlap, ≤ 2 lines,
 * reading speed ≤ 20 characters per second, and no subtitle on the end card.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SUBTITLES, toSrt } from '../src/subtitles/Subtitles';
import { MASTER, TOTAL_FRAMES } from '../src/timeline/master';
import { lineBeats } from '../src/timeline/beats';

const FPS = 30;
const wav = process.argv[2] ?? 'out/dialogue.wav';
const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const hop = 48000 / FPS;
const nF = Math.floor(x.length / hop);
const db: number[] = [];
for (let f = 0; f < nF; f++) {
  let e = 0;
  for (let i = f * hop; i < (f + 1) * hop; i++) e += x[i] * x[i];
  db.push(10 * Math.log10(e / hop + 1e-12));
}
const peak = [...db].sort((a, b) => b - a)[Math.floor(db.length * 0.02)];
const voiced = db.map((v) => v > peak - 30);

const card = MASTER['S5.endcard'].start;
const t = (f: number) => (f / FPS).toFixed(2);
const problems: string[] = [];
const rows = SUBTITLES.map((c, k) => {
  // first audible frame of this cue's words
  let onset = -1;
  for (let f = Math.floor(c.wordStart) - 6; f <= Math.ceil(c.wordEnd); f++) if (voiced[f]) { onset = f; break; }
  const lines = c.text.split('\n');
  const chars = c.text.replace(/\n/g, ' ').length;
  const dur = (c.end - c.start) / FPS;
  const cps = chars / dur;
  const early = onset >= 0 && c.start < onset;
  const laughLead = onset >= 0 && c.start - onset > 6; // the audible onset is a laugh before the first word
  const cutsVoice = Math.ceil(c.wordEnd) > c.end;
  if (early) problems.push(`#${k + 1} appears ${onset - c.start} frame(s) before its voice`);
  if (cutsVoice) problems.push(`#${k + 1} ends ${Math.ceil(c.wordEnd) - c.end} frame(s) before its last word`);
  if (lines.length > 2) problems.push(`#${k + 1} has ${lines.length} lines`);
  if (Math.max(...lines.map((l) => l.length)) > 42) problems.push(`#${k + 1} has a line over 42 characters`);
  if (cps > 20) problems.push(`#${k + 1} reads at ${cps.toFixed(1)} cps`);
  if (c.end > card) problems.push(`#${k + 1} runs into the end card`);
  if (k > 0 && c.start < SUBTITLES[k - 1].end) problems.push(`#${k + 1} overlaps #${k}`);
  return `| ${k + 1} | ${c.speaker} | ${t(onset)} | ${t(c.start)} | ${c.start - onset >= 0 ? '+' : ''}${c.start - onset} | ${t(c.wordEnd)} | ${t(c.end)} | ${dur.toFixed(2)} | ${cps.toFixed(1)} | ${c.text.replace(/\n/g, ' / ')}${laughLead ? ' *(onset = laugh; IN is on the first word)*' : ''} |`;
});

// coverage: spoken (voiced, inside a line's speech, not a laugh) frames that have a subtitle on screen
let spoken = 0;
let covered = 0;
for (const b of lineBeats(MASTER)) {
  const l = b.line;
  for (let f = l.speechStart; f < l.speechEnd && f < nF; f++) {
    if (!voiced[f]) continue;
    if (l.nonverbal.some(([a, z]) => f >= l.fileZero + a * FPS && f < l.fileZero + z * FPS)) continue;
    spoken++;
    if (SUBTITLES.some((c) => f >= c.start && f < c.end)) covered++;
  }
}

fs.mkdirSync('deliverables/final', { recursive: true });
fs.writeFileSync('deliverables/final/JioUrja2_English.srt', toSrt());
const md = `# English subtitle QA

Checked against the **rendered dialogue stem** (\`${wav}\`), the audio the viewer hears, at 30 fps. "Voice onset" is the first audible frame of the cue's words. A subtitle must never appear before it (Δ ≥ 0).

- Cues: **${SUBTITLES.length}**, film ${t(TOTAL_FRAMES)} s, end card from ${t(card)} s.
- Spoken frames with a subtitle on screen: **${covered} / ${spoken}** (${((covered / spoken) * 100).toFixed(1)} %). Laughs aren't subtitled; the gaps are the pauses between phrases.
- Problems found: **${problems.length ? problems.join('; ') : 'none'}**.

| # | Speaker | Voice onset (s) | IN (s) | Δ frames | Last word ends (s) | OUT (s) | On screen (s) | Chars/s | Text |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync('SUBTITLE_QA.md', md);
console.log(md);
