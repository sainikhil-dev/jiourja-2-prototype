/**
 * Lip-sync QA on the finished cut.
 *
 *   npx remotion render src/index.ts DialogueStem out/dialogue.wav --codec=wav
 *   npx tsx scripts/qa-sync.tsx out/dialogue.wav
 *
 * Compares the RENDERED dialogue audio (what the viewer hears) with the mouth
 * shapes the timeline drives, frame by frame, and writes SYNC_QA.md:
 *  - mouth open while the voice is silent (must be ~0)
 *  - mouth still moving after a line's audio ends (must be 0)
 *  - two characters' mouths moving at once (must be 0)
 *  - per-line onset / offset difference between voice and mouth
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MASTER, TOTAL_FRAMES, SCENE_OFFSETS } from '../src/Commercial';
import { lineBeats, mouthFor } from '../src/timeline/beats';
import type { Speaker } from '../src/timeline/script';

const FPS = 30;
const wav = process.argv[2] ?? 'out/dialogue.wav';
const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const hop = 48000 / FPS;
const nF = Math.min(TOTAL_FRAMES, Math.floor(x.length / hop));
const db: number[] = [];
for (let f = 0; f < nF; f++) {
  let e = 0;
  for (let i = f * hop; i < (f + 1) * hop; i++) e += x[i] * x[i];
  db.push(10 * Math.log10(e / hop + 1e-12));
}
const peak = [...db].sort((a, b) => b - a)[Math.floor(db.length * 0.02)];
const thr = peak - 30;
const voiced = db.map((v) => v > thr);

const speakers: Speaker[] = ['owner', 'friend', 'bill', 'raju', 'pappu'];
const lines = lineBeats(MASTER);
let openSilent = 0;
let overlap = 0;
const openSilentRuns: Array<[number, number]> = [];
let run: number | null = null;
for (let f = 0; f < nF; f++) {
  const active = speakers.filter((s) => mouthFor(s, f, MASTER) !== 'X');
  if (active.length > 1) overlap++;
  // allow 1 frame of slack either side (mouth shapes lead the sound by up to a frame by design)
  const nearVoice = voiced[f] || voiced[f - 1] || voiced[f + 1];
  const bad = active.length > 0 && !nearVoice;
  if (bad) {
    openSilent++;
    if (run === null) run = f;
  } else if (run !== null) {
    openSilentRuns.push([run, f]);
    run = null;
  }
}

const rows: string[] = [];
let afterEnd = 0;
for (const b of lines) {
  const l = b.line;
  let firstV = -1;
  let lastV = -1;
  for (let f = l.playFrom; f < l.playTo && f < nF; f++) if (voiced[f]) {
    if (firstV < 0) firstV = f;
    lastV = f;
  }
  let firstM = -1;
  let lastM = -1;
  for (let f = l.speechStart - 5; f < l.speechEnd + 30 && f < nF; f++) {
    if (mouthFor(l.speaker, f, MASTER) !== 'X') {
      if (firstM < 0) firstM = f;
      lastM = f;
    }
  }
  if (lastM > lastV + 1) afterEnd += lastM - lastV - 1;
  let openFrames = 0;
  let voicedFrames = 0;
  for (let f = l.speechStart; f < l.speechEnd; f++) {
    if (voiced[f]) voicedFrames++;
    if (mouthFor(l.speaker, f, MASTER) !== 'X') openFrames++;
  }
  const t = (f: number) => (f / FPS).toFixed(2);
  rows.push(
    `| \`${l.id}\` | ${l.speaker} | ${t(firstV)}–${t(lastV + 1)} | ${t(firstM)}–${t(lastM + 1)} | ${firstM - firstV >= 0 ? '+' : ''}${firstM - firstV} | ${lastM - lastV >= 0 ? '+' : ''}${lastM - lastV} | ${voicedFrames} / ${openFrames} | ${l.source} |`,
  );
}

const md = `# Lip-sync QA — finished cut

Measured on the **rendered dialogue stem** (\`${path.basename(wav)}\`): the exact audio the viewer hears, compared frame by frame (30 fps) with the mouth shapes the timeline drives. Voice counts as audible above ${thr.toFixed(1)} dBFS (30 dB under the dialogue peak).

**Film length:** ${(TOTAL_FRAMES / FPS).toFixed(2)} s (${TOTAL_FRAMES} frames). Scene starts: ${SCENE_OFFSETS.slice(0, -1).map((o, i) => `S${i + 1} ${(o / FPS).toFixed(2)} s`).join(' · ')}.

| Check | Result |
|---|---|
| Frames where a mouth is open but no voice is audible (±1 frame) | **${openSilent}** ${openSilentRuns.length ? `(runs: ${openSilentRuns.map(([a, b]) => `${(a / FPS).toFixed(2)}–${(b / FPS).toFixed(2)} s`).join(', ')})` : ''} |
| Frames where a mouth keeps moving after its line's audio ends | **${afterEnd}** |
| Frames where two characters' mouths move at once | **${overlap}** |
| Last line ends before the end card | ${(lines.at(-1)!.line.speechEnd / FPS).toFixed(2)} s vs card at ${(MASTER['S5.endcard'].start / FPS).toFixed(2)} s |

Per line: voice span vs mouth span on the master timeline. Δ is in frames (+ means the mouth is later than the voice). "Voiced / open" counts the frames inside the line's speech where the voice is audible vs where the mouth is open. Brief closures for म/ब/प and stop consonants keep "open" a little below "voiced".

| Line | Speaker | Voice audible (s) | Mouth moving (s) | Onset Δ | Offset Δ | Voiced / open frames | Timing source |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync('SYNC_QA.md', md);
console.log(md);
