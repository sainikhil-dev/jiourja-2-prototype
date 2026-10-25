#!/usr/bin/env node
/**
 * Voice-over import & lip-sync analysis.
 *
 *   npm run analyze-audio
 *
 * 1. If public/audio/source/full_take.(mp3|wav) exists, it is force-aligned
 *    against ALL lines in src/timeline/lines.json (in order) and cut into one
 *    file per line at the real pauses → public/audio/dialogue/<id>.wav.
 *    (Separate files already in public/audio/dialogue/ are used as-is.)
 * 2. Each line file is force-aligned against its exact Hindi text with
 *    Echogarden (eSpeak-NG reference + DTW on MFCCs). This yields measured
 *    start/end times for every word and every phone in the audio.
 * 3. Phones → mouth shapes (visemes). The audio's own loudness then has the
 *    final say: any silent stretch ≥ 3 frames is forced to a closed mouth,
 *    and voiced sound with no words in it (laughs) gets an energy-driven
 *    laugh mouth, so no mouth ever moves over silence.
 * 4. Optional cross-check: if out/align/whisper.json exists (Whisper word
 *    timestamps of the full take), aligned word onsets are compared to it.
 * 5. Writes src/timeline/audio-manifest.json and AUDIO_REPORT.md.
 *
 * No network needed. The eSpeak-NG engine comes from the npm package
 * @echogarden/espeak-ng-emscripten.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const DIALOGUE = path.join(PUB, 'audio', 'dialogue');
const FPS = 30;
const LINES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/timeline/lines.json'), 'utf8'));

// --- make Echogarden use the eSpeak-NG build installed from npm (no download)
{
  const pkgDir = path.join(os.homedir(), '.local', 'share', 'echogarden', 'packages');
  fs.mkdirSync(pkgDir, { recursive: true });
  const link = path.join(pkgDir, 'espeak-ng-emscripten-20260722');
  if (!fs.existsSync(link)) fs.symlinkSync(path.join(ROOT, 'node_modules/@echogarden/espeak-ng-emscripten'), link);
}
const Echogarden = await import('echogarden');

const quiet = () => {
  const log = console.log;
  console.log = () => {};
  return () => (console.log = log);
};

async function align(file, text) {
  const restore = quiet();
  try {
    return await Echogarden.align(file, text, { engine: 'dtw', language: 'hi' });
  } finally {
    restore();
  }
}

function decode(file, sr = 16000) {
  const buf = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(sr), '-'], {
    maxBuffer: 1 << 30,
  });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

function parseSilences(file, db, d) {
  // ffmpeg writes filter logs to stderr
  const r = execFileSync('bash', ['-c', `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=${db}dB:d=${d} -f null - 2>&1`], { encoding: 'utf8' });
  const starts = [...r.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => +m[1]);
  const ends = [...r.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => ({ s, e: ends[i] ?? Infinity }));
}

const durationOf = (file) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });

// ------------------------------------------------------------------ 1. split
const source = ['full_take.wav', 'full_take.mp3'].map((f) => path.join(PUB, 'audio', 'source', f)).find((f) => fs.existsSync(f));
const report = [];
let splitInfo = null;
fs.mkdirSync(DIALOGUE, { recursive: true });
if (source) {
  console.log(`Aligning the full take against all ${LINES.length} lines…`);
  const full = await align(source, LINES.map((l) => l.lip).join('\n\n'));
  const segs = full.timeline.filter((t) => t.type === 'segment');
  if (segs.length !== LINES.length) throw new Error(`Expected ${LINES.length} segments, got ${segs.length}`);
  // Line boundaries must sit in REAL pauses. Candidate pauses come from the
  // audio; the aligner's (approximate) boundaries only decide which pauses.
  // Order-preserving DP: pick one pause per boundary, minimising distance to
  // the aligner's boundary. (DTW can smear a laugh into the neighbouring
  // line; snapping to pauses puts it back with the line it belongs to.)
  const sil = parseSilences(source, -35, 0.28).filter((x) => x.e < Infinity);
  const total = durationOf(source);
  const expected = segs.slice(0, -1).map((sg, i) => (sg.endTime + segs[i + 1].startTime) / 2);
  const mids = sil.map((x) => (x.s + x.e) / 2);
  const B = expected.length;
  const C = mids.length;
  if (C < B) throw new Error(`Only ${C} pauses found for ${B} line boundaries`);
  const INF = 1e9;
  const dp = Array.from({ length: B }, () => new Array(C).fill(INF));
  const from = Array.from({ length: B }, () => new Array(C).fill(-1));
  for (let j = 0; j < C; j++) dp[0][j] = Math.abs(mids[j] - expected[0]);
  for (let i = 1; i < B; i++)
    for (let j = i; j < C; j++)
      for (let k = i - 1; k < j; k++) {
        const v = dp[i - 1][k] + Math.abs(mids[j] - expected[i]);
        if (v < dp[i][j]) {
          dp[i][j] = v;
          from[i][j] = k;
        }
      }
  let j = dp[B - 1].indexOf(Math.min(...dp[B - 1]));
  const pick = [];
  for (let i = B - 1; i >= 0; i--) {
    pick[i] = j;
    j = from[i][j];
  }
  const cuts = [Math.max(0, segs[0].startTime - 0.25), ...pick.map((k) => mids[k])];
  cuts.push(total);
  splitInfo = LINES.map((l, i) => ({ id: l.id, from: cuts[i], to: cuts[i + 1] }));
  for (const s of splitInfo) {
    const out = path.join(DIALOGUE, `${s.id}.wav`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', source, '-ss', s.from.toFixed(3), '-to', s.to.toFixed(3), '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', out]);
  }
  console.log('Cut into', splitInfo.length, 'files.');
}

// -------------------------------------------------- phone → viseme mapping
function phoneViseme(ph) {
  const p = ph.normalize('NFD').replace(/[ˈˌːˑ̃ʰ̪̥̩ʱ̤̃]/g, '');
  if (!p) return null;
  const c = p[0];
  if ('pbm'.includes(c)) return 'A';
  if ('fv'.includes(c)) return 'G';
  if ('ʋw'.includes(c)) return 'F';
  if ('lɭ'.includes(c)) return 'H';
  if ('aɑɐ'.includes(c)) return 'D';
  if ('əʌ'.includes(c)) return 'C';
  if ('eɛæ'.includes(c)) return 'C';
  if ('iɪy'.includes(c)) return 'B';
  if ('oɔ'.includes(c)) return 'E';
  if ('uʊ'.includes(c)) return 'F';
  return 'B'; // other consonants: teeth together, lips relaxed
}

function collect(timeline, type, acc = []) {
  for (const t of timeline ?? []) {
    if (t.type === type) acc.push(t);
    if (t.timeline) collect(t.timeline, type, acc);
  }
  return acc;
}

// ---------------------------------------------------------- 2–4. per line
let whisperWords = null;
// Whisper word timestamps of the full take (scripts/whisper-transcribe.py): used to
// place phrase boundaries that have no pause, the end of opening laughs, and as a QA check.
const whisperPath = path.join(PUB, 'audio/source/full_take.whisper.json');
if (fs.existsSync(whisperPath) && splitInfo) {
  whisperWords = JSON.parse(fs.readFileSync(whisperPath, 'utf8')).flatMap((s) => s.words.map((w) => ({ t: w.w.trim(), s: w.s, e: w.e })));
}


// ------------------------------------------------- phrase-level alignment
const NONVERBAL_TAG = /^\s*\[(laughs|laughing|sighs|chuckles|giggles|gasps)\]/i;
const skeleton = (w) =>
  w
    .replace(/[^ऀ-ॿ]/g, '')
    .replace(/[आ]/g, 'अ')
    .replace(/[ई]/g, 'इ')
    .replace(/[ऊ]/g, 'उ')
    .replace(/[ा-्ँ-ः़]/g, '');

function splitPhrases(lip) {
  return lip.split(/(?<=[.…!?।,])\s+/).map((x) => x.trim()).filter(Boolean);
}

/**
 * Speech chunks between pauses. The pause threshold is relative to the line's
 * own loudness (28 dB under its peak), so a breathy dramatic pause counts
 * even when it isn't digital silence.
 */
function speechChunks(file, dur) {
  const SR = 16000;
  const x = decode(file, SR);
  const hop = SR / 100; // 10 ms
  const db = [];
  for (let i = 0; i + hop <= x.length; i += hop) {
    let e = 0;
    for (let k = i; k < i + hop; k++) e += x[k] * x[k];
    db.push(10 * Math.log10(e / hop + 1e-12));
  }
  const peak = [...db].sort((p, q) => q - p)[Math.floor(db.length * 0.02)] ?? -20;
  const thr = Math.max(peak - 28, -48);
  const loud = db.map((v) => v > thr);
  const chunks = [];
  let i = 0;
  while (i < loud.length) {
    if (!loud[i]) {
      i++;
      continue;
    }
    let j = i;
    let quiet = 0;
    while (j < loud.length) {
      if (loud[j]) quiet = 0;
      else if (++quiet >= 16) break; // ≥160 ms below threshold = a pause
      j++;
    }
    const end = j - quiet + 1;
    if (end - i >= 6) chunks.push({ s: i / 100, e: Math.min(dur, end / 100) });
    i = j + 1;
  }
  return chunks;
}

/** Whisper's onset for `word` near time `near` (fuzzy consonant match), if any. */
function whisperAnchor(ww, word, near, win = 0.7) {
  const k = skeleton(word);
  const best = ww
    .filter((w) => skeleton(w.t)[0] && skeleton(w.t)[0] === k[0])
    .map((w) => ({ w, d: Math.abs(w.s - near) }))
    .filter((x) => x.d <= win)
    .sort((a, b) => a.d - b.d)[0];
  return best?.w.s;
}

let tmpN = 0;
async function alignSpan(file, text, s, e) {
  const tmp = path.join(os.tmpdir(), `jiourja-span-${process.pid}-${tmpN++}.wav`);
  const a = Math.max(0, s - 0.04);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-ss', a.toFixed(3), '-to', (e + 0.04).toFixed(3), '-ac', '1', '-ar', '16000', tmp]);
  const r = await align(tmp, text);
  fs.rmSync(tmp, { force: true });
  const shift = (x) => ({ ...x, startTime: x.startTime + a, endTime: x.endTime + a });
  return {
    words: collect(r.timeline, 'word').map(shift),
    phones: collect(r.timeline, 'phone').map(shift),
  };
}

async function alignLine(line, file, dur, ww) {
  const phrases = splitPhrases(line.lip);
  const chunks = speechChunks(file, dur);
  const nonverbalSpans = [];
  // 1. phrase spans: real pauses first, then Whisper anchors, then whole-line DTW
  let spans;
  let method;
  let speech = chunks;
  if (NONVERBAL_TAG.test(line.tts) && chunks.length === phrases.length + 1) {
    // tagged opening laugh/sigh that the voice separated with a pause
    nonverbalSpans.push([chunks[0].s, chunks[0].e]);
    speech = chunks.slice(1);
  }
  if (speech.length === phrases.length) {
    spans = speech.map((c) => [c.s, c.e]);
    method = nonverbalSpans.length ? 'phrase-by-pause+laugh-chunk' : 'phrase-by-pause';
  } else {
    const whole = await alignSpan(file, line.lip, 0, dur);
    const wordsW = whole.words;
    let wi = 0;
    const starts = phrases.map((ph) => {
      const first = wordsW[wi];
      wi += ph.split(/\s+/).length;
      return first?.startTime ?? 0;
    });
    const bounds = starts.map((t, i) => {
      if (i === 0) return chunks[0]?.s ?? 0;
      const pause = chunks.slice(1).find((c) => Math.abs(c.s - t) < 0.5); // an internal pause, not the line start
      if (pause) return pause.s;
      const firstWord = phrases[i].split(/\s+/)[0];
      return whisperAnchor(ww, firstWord, t) ?? t;
    });
    spans = bounds.map((b, i) => [b, i + 1 < bounds.length ? bounds[i + 1] - 0.02 : chunks.at(-1)?.e ?? dur]);
    method = ww.length ? 'phrase-by-pause+whisper-anchor' : 'phrase-by-dtw';
  }
  // 2. an opening laugh/sigh is not words: give it to the laugh mouth
  if (NONVERBAL_TAG.test(line.tts) && ww.length && !nonverbalSpans.length) {
    const firstWord = phrases[0].split(/\s+/)[0];
    const t = whisperAnchor(ww, firstWord, spans[0][0] + 0.4, 1.2);
    if (t !== undefined && t - spans[0][0] > 0.2 && t < spans[0][1] - 0.15) {
      nonverbalSpans.push([spans[0][0], t - 0.03]);
      spans[0][0] = t - 0.03;
      method += '+laugh-split';
    }
  }
  // 3. align each phrase inside its own span
  const words = [];
  const phones = [];
  for (let i = 0; i < phrases.length; i++) {
    const r = await alignSpan(file, phrases[i], spans[i][0], spans[i][1]);
    words.push(...r.words.map((w) => ({ text: w.text, start: w.startTime, end: w.endTime })));
    phones.push(...r.phones.filter((p) => p.endTime - p.startTime > 0.004));
  }
  return { words, phones, nonverbalSpans, method };
}

const manifest = {};
for (const line of LINES) {
  const file = ['wav', 'mp3'].map((x) => path.join(DIALOGUE, `${line.id}.${x}`)).find((f) => fs.existsSync(f));
  if (!file) {
    report.push({ id: line.id, missing: true });
    continue;
  }
  const dur = durationOf(file);
  const cut = splitInfo?.find((s) => s.id === line.id);
  const localWhisper = whisperWords && cut ? whisperWords.filter((w) => w.s >= cut.from - 0.1 && w.s < cut.to).map((w) => ({ ...w, s: w.s - cut.from, e: w.e - cut.from })) : [];
  const { words, phones, nonverbalSpans, method } = await alignLine(line, file, dur, localWhisper);

  // loudness per video frame
  const SR = 16000;
  const x = decode(file, SR);
  const hop = SR / FPS;
  const nF = Math.ceil(x.length / hop);
  const rms = new Float32Array(nF);
  for (let f = 0; f < nF; f++) {
    let s = 0;
    let n = 0;
    for (let i = Math.floor(f * hop); i < Math.min(x.length, Math.floor((f + 1) * hop)); i++) {
      s += x[i] * x[i];
      n++;
    }
    rms[f] = Math.sqrt(s / Math.max(1, n));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0.1;
  const thr = Math.max(0.008, p95 * 0.07);
  const voiced = [...rms].map((v) => v > thr);
  // close single-frame dropouts so consonant dips don't read as pauses
  for (let f = 1; f < nF - 1; f++) if (!voiced[f] && voiced[f - 1] && voiced[f + 1]) voiced[f] = true;

  // phone visemes per frame
  const frameVis = new Array(nF).fill(null);
  for (const p of phones) {
    const v = phoneViseme(p.text);
    if (!v) continue;
    const f0 = Math.floor(p.startTime * FPS);
    const f1 = Math.max(f0 + 1, Math.round(p.endTime * FPS));
    for (let f = f0; f < f1 && f < nF; f++) {
      // vowels win over consonants when phones share a frame
      if (!frameVis[f] || 'DCE'.includes(v)) frameVis[f] = v;
    }
  }
  // audio has the final say
  let nonverbal = 0;
  let silencedPhoneFrames = 0;
  const vis = new Array(nF).fill('X');
  for (let f = 0; f < nF; f++) {
    if (!voiced[f]) continue;
    const forcedNV = nonverbalSpans.some(([a, b]) => f / FPS >= a && f / FPS < b);
    if (frameVis[f] && !forcedNV) vis[f] = frameVis[f];
    else {
      // voiced but no words here: a laugh, a sigh, a gasp → energy-driven open mouth
      const k = rms[f] / p95;
      vis[f] = k > 0.55 ? 'D' : k > 0.28 ? 'C' : 'B';
      nonverbal++;
    }
  }
  for (let f = 0; f < nF; ) {
    if (!voiced[f]) {
      let g = f;
      while (g < nF && !voiced[g]) g++;
      if (g - f >= 3) for (let k = f; k < g; k++) if (frameVis[k]) silencedPhoneFrames++;
      // short unvoiced gaps (< 3 frames, e.g. a stop consonant) keep the phone's shape
      if (g - f < 3) for (let k = f; k < g; k++) vis[k] = frameVis[k] ?? 'B';
      f = g;
    } else f++;
  }
  // frames → cues (min 2 frames, merge repeats)
  const cues = [];
  for (let f = 0; f < nF; f++) {
    const v = vis[f];
    const last = cues[cues.length - 1];
    if (last && last.value === v) last.endF = f + 1;
    else cues.push({ value: v, startF: f, endF: f + 1 });
  }
  for (let i = 1; i < cues.length - 1; i++) {
    const c = cues[i];
    if (c.endF - c.startF < 2 && c.value !== 'X') {
      cues[i - 1].endF = c.endF; // absorb 1-frame flickers into the previous shape
      cues.splice(i--, 1);
    }
  }
  const merged = [];
  for (const c of cues) {
    const last = merged[merged.length - 1];
    if (last && last.value === c.value) last.endF = c.endF;
    else merged.push({ ...c });
  }
  const firstVoiced = voiced.indexOf(true);
  const lastVoiced = voiced.lastIndexOf(true);

  // Whisper cross-check (word onsets)
  let agreement = null;
  if (localWhisper.length) {
    const ww = localWhisper;
    const strip = (s) => s.replace(/[^ऀ-ॿ]/g, '').replace(/[ा-्ँ-ः]/g, '');
    const deltas = [];
    for (const w of words) {
      const key = strip(w.text).slice(0, 2);
      const best = ww
        .filter((v) => strip(v.t).slice(0, 1) === key.slice(0, 1))
        .map((v) => ({ v, d: Math.abs(v.s - w.start) }))
        .sort((a, b) => a.d - b.d)[0];
      if (best && best.d < 0.6) deltas.push(best.d);
    }
    deltas.sort((a, b) => a - b);
    agreement = {
      matched: deltas.length,
      of: words.length,
      medianMs: deltas.length ? Math.round(deltas[Math.floor(deltas.length / 2)] * 1000) : null,
      p90Ms: deltas.length ? Math.round(deltas[Math.floor(deltas.length * 0.9)] * 1000) : null,
    };
  }

  manifest[line.id] = {
    file: path.relative(PUB, file).split(path.sep).join('/'),
    duration: +dur.toFixed(3),
    speechStart: +(Math.max(0, firstVoiced) / FPS).toFixed(3),
    speechEnd: +((lastVoiced + 1) / FPS).toFixed(3),
    cues: merged.map((c) => ({ start: +(c.startF / FPS).toFixed(3), end: +(c.endF / FPS).toFixed(3), value: c.value })),
    cueSource: 'forced-alignment',
    alignMethod: method,
    nonverbal: nonverbalSpans.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]),
    words: words.map((w) => ({ text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3) })),
  };
  report.push({
    id: line.id,
    speaker: line.speaker,
    duration: dur,
    speech: [firstVoiced / FPS, (lastVoiced + 1) / FPS],
    words: words.length,
    phones: phones.length,
    cues: merged.length,
    nonverbal,
    silencedPhoneFrames,
    agreement,
    method,
    note: line.note,
  });
  console.log(`✓ ${line.id.padEnd(20)} ${dur.toFixed(2)}s  ${words.length} words  ${phones.length} phones  ${merged.length} mouth cues`);
}

fs.writeFileSync(path.join(ROOT, 'src/timeline/audio-manifest.json'), JSON.stringify(manifest, null, 1));

// ------------------------------------------------------------------ report
const fmt = (n) => n.toFixed(2);
let md = `# Voice-over analysis report\n\nGenerated by \`npm run analyze-audio\`. Lip-sync method: **forced alignment** of each recorded line against its exact Hindi text (Echogarden: eSpeak-NG reference + DTW). Every mouth shape is timed from the recording. Silence always closes the mouth; voiced sound with no words in it (laughs, sighs) gets an energy-driven open mouth.\n\n`;
if (splitInfo) {
  md += `Source: \`${path.relative(ROOT, source)}\` (${fmt(durationOf(source))} s), cut into ${splitInfo.length} files at the real pauses.\n\n`;
}
md += `| Line | Speaker | Cut from source (s) | File length | Voice from → to | Words | Phones | Mouth cues | Non-verbal frames | Whisper check (word onsets) |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of report) {
  if (r.missing) {
    md += `| ${r.id} | — | MISSING | | | | | | | |\n`;
    continue;
  }
  const cut = splitInfo?.find((s) => s.id === r.id);
  const a = r.agreement;
  md += `| \`${r.id}\` | ${r.speaker} | ${cut ? `${fmt(cut.from)}–${fmt(cut.to)}` : '—'} | ${fmt(r.duration)} s | ${fmt(r.speech[0])}–${fmt(r.speech[1])} s | ${r.words} | ${r.phones} | ${r.cues} | ${r.nonverbal} | ${a ? `${a.matched}/${a.of} words, median Δ ${a.medianMs} ms, 90% ≤ ${a.p90Ms} ms` : 'n/a'} |\n`;
}
const notes = report.filter((r) => r.note);
if (notes.length) md += `\n**Notes**\n\n${notes.map((r) => `- \`${r.id}\`: ${r.note}`).join('\n')}\n`;
fs.writeFileSync(path.join(ROOT, 'AUDIO_REPORT.md'), md);
console.log('\nWrote src/timeline/audio-manifest.json and AUDIO_REPORT.md');
