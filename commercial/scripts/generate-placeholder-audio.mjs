#!/usr/bin/env node
/**
 * PLACEHOLDER sound design, synthesised from scratch (no samples, no vocals).
 *
 * These files exist so the animatic has timing-accurate cues to cut to. They
 * are deliberately simple and are meant to be REPLACED by final music/SFX:
 * drop a file with the same name into public/audio/{sfx,music}/ and the
 * composition picks it up unchanged.
 *
 *   node scripts/generate-placeholder-audio.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'audio');

// ----------------------------------------------------------------- helpers
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const TAU = Math.PI * 2;
let seed = 1234;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
function lowpass(x, cutoff) {
  const out = new Float32Array(x.length);
  const rc = 1 / (TAU * cutoff);
  const k = 1 / SR / (rc + 1 / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) out[i] = y += k * (x[i] - y);
  return out;
}
function highpass(x, cutoff) {
  const lp = lowpass(x, cutoff);
  return x.map((v, i) => v - lp[i]);
}
function mix(dst, src, at = 0, gain = 1) {
  const o = Math.floor(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain;
  return dst;
}
function normalize(x, peak = 0.89) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return m ? x.map((v) => (v / m) * peak) : x;
}
function softclip(x, drive = 1.5) {
  return x.map((v) => Math.tanh(v * drive) / Math.tanh(drive));
}
function writeWav(rel, x) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.max(-1, Math.min(1, x[i])) * 32767, i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
  console.log('wrote', rel, (x.length / SR).toFixed(2) + 's');
}
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// band-limited-ish saw via additive partials
function saw(freq, sec, partials = 18) {
  const x = buf(sec);
  for (let k = 1; k <= partials; k++) {
    if (freq * k > SR / 2.2) break;
    const a = 1 / k;
    for (let i = 0; i < x.length; i++) x[i] += Math.sin((TAU * freq * k * i) / SR) * a;
  }
  return x;
}
function brass(note, sec, { attack = 0.03, release = 0.25 } = {}) {
  const f = midi(note);
  const x = buf(sec + release);
  const layers = [saw(f, sec + release), saw(f * 1.004, sec + release), saw(f / 2, sec + release, 10)];
  for (const l of layers) mix(x, l, 0, 0.4);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const e = t < attack ? t / attack : t < sec ? 1 - 0.25 * ((t - attack) / sec) : 0.75 * Math.exp(-(t - sec) / (release / 3));
    x[i] *= e;
  }
  return softclip(lowpass(lowpass(x, 900), 1400), 1.8);
}
function timpani(freq = 55, sec = 2.2) {
  const x = buf(sec);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = freq * (1 + 0.35 * Math.exp(-t / 0.05));
    x[i] = Math.sin(TAU * f * t) * env(t, 0.004, 0.7) + noise() * env(t, 0.001, 0.03) * 0.4;
  }
  return lowpass(x, 1800);
}
function kick(freq = 50, sec = 0.6, punch = 1) {
  const x = buf(sec);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = freq + 120 * punch * Math.exp(-t / 0.03);
    ph += (TAU * f) / SR;
    x[i] = Math.sin(ph) * env(t, 0.002, sec / 3.5);
  }
  return x;
}
function noiseBurst(sec, a, d, lp = 6000, hp = 0) {
  let x = buf(sec);
  for (let i = 0; i < x.length; i++) x[i] = noise() * env(i / SR, a, d);
  x = lowpass(x, lp);
  return hp ? highpass(x, hp) : x;
}
function pluck(freq, sec, damp = 0.996, bright = 0.5) {
  // Karplus–Strong
  const n = Math.round(SR / freq);
  const line = new Float32Array(n).map(() => noise() * bright);
  const x = buf(sec);
  let idx = 0;
  for (let i = 0; i < x.length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % n];
    const v = (a + b) * 0.5 * damp;
    line[idx] = v;
    x[i] = a;
    idx = (idx + 1) % n;
  }
  return lowpass(x, 3000);
}
function tone(freq, sec, a, d, shape = (p) => Math.sin(p)) {
  const x = buf(sec);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (typeof freq === 'function' ? freq(t) : freq)) / SR;
    x[i] = shape(ph) * env(t, a, d);
  }
  return x;
}

// ------------------------------------------------------------------ SFX
// Factory ambience loop: mains hum, lathe whir, press thumps every 1.2 s
// (= the press animation cycle of 36 frames; impact 9 frames into a cycle).
{
  const sec = 12;
  const x = buf(sec);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = 0.05 * Math.sin(TAU * 50 * t) + 0.03 * Math.sin(TAU * 100 * t) + 0.02 * Math.sin(TAU * 150 * t);
  }
  const whir = lowpass(highpass(noiseBurst(sec, 0.01, 1e9, 2500), 600), 2500);
  for (let i = 0; i < whir.length; i++) whir[i] *= 0.18 * (0.8 + 0.2 * Math.sin((TAU * 6 * i) / SR));
  mix(x, whir);
  for (let t = 9 / 30; t < sec; t += 1.2) {
    mix(x, kick(70, 0.35, 0.6), t, 0.35);
    mix(x, noiseBurst(0.2, 0.001, 0.04, 3000, 300), t, 0.25);
  }
  writeWav('sfx/factory_ambience.wav', normalize(x, 0.5));
}
// Power down: machines winding down + relay clunk
{
  const x = mix(buf(1.4), tone((t) => 180 * Math.exp(-t * 1.6) + 30, 1.4, 0.01, 0.6, (p) => (Math.sin(p) > 0 ? 1 : -1) * 0.3), 0);
  mix(x, noiseBurst(0.15, 0.001, 0.02, 4000), 0, 0.6);
  writeWav('sfx/power_down.wav', normalize(lowpass(x, 1500), 0.7));
}
// Light flicker crackles
{
  const x = buf(0.6);
  for (const t of [0, 0.07, 0.16, 0.2, 0.33]) mix(x, highpass(noiseBurst(0.06, 0.001, 0.012, 9000), 1500), t, 0.7);
  for (let i = 0; i < x.length; i++) x[i] += 0.12 * Math.sign(Math.sin((TAU * 120 * i) / SR)) * env(i / SR, 0.01, 0.2);
  writeWav('sfx/flicker.wav', normalize(x, 0.6));
}
// Shutter rattle, rising
{
  const x = buf(0.9);
  for (let t = 0; t < 0.8; t += 0.028 + Math.abs(noise()) * 0.02) {
    const n = highpass(noiseBurst(0.05, 0.001, 0.008, 7000), 900);
    mix(x, n, t, 0.3 + t);
  }
  mix(x, tone(620, 0.9, 0.3, 0.3, (p) => Math.sin(p) * 0.15), 0, 1);
  writeWav('sfx/shutter_rattle.wav', normalize(x, 0.7));
}
// Shutter slam up
{
  const x = mix(buf(1.0), noiseBurst(1, 0.001, 0.15, 5000, 200), 0, 1);
  mix(x, tone(340, 1, 0.001, 0.4, (p) => Math.sin(p) + 0.6 * Math.sin(p * 2.71)), 0, 0.25);
  mix(x, kick(60, 0.6), 0, 0.6);
  writeWav('sfx/shutter_slam.wav', normalize(x, 0.8));
}
// Giant footstep BOOM
{
  const x = mix(buf(0.9), kick(42, 0.9, 1.2), 0, 1);
  mix(x, noiseBurst(0.3, 0.001, 0.05, 900), 0, 0.5);
  // little rattle of tools after the hit
  for (const t of [0.09, 0.15, 0.22]) mix(x, highpass(noiseBurst(0.04, 0.001, 0.01, 8000), 2500), t, 0.12);
  writeWav('sfx/boom_step.wav', normalize(softclip(x, 2), 0.95));
}
// Snap to attention: fwip + heel click
{
  const x = buf(0.35);
  const sweep = noiseBurst(0.18, 0.06, 0.04, 5000, 800);
  mix(x, sweep, 0, 0.6);
  mix(x, highpass(noiseBurst(0.05, 0.001, 0.008, 9000), 1800), 0.16, 1);
  writeWav('sfx/snap_attention.wav', normalize(x, 0.7));
}
// Crate drop: wooden thunk + bounce
{
  const x = buf(0.9);
  for (const [t, g] of [[0, 1], [0.22, 0.45], [0.36, 0.2]]) {
    mix(x, kick(110, 0.25, 0.4), t, g);
    mix(x, lowpass(noiseBurst(0.12, 0.001, 0.03, 2500), 2500), t, g * 0.5);
  }
  writeWav('sfx/crate_drop.wav', normalize(x, 0.7));
}
// Cartoon gulp
{
  const x = tone((t) => (t < 0.12 ? 420 - t * 1800 : 200 + (t - 0.12) * 900), 0.3, 0.01, 0.12, (p) => Math.sin(p) + 0.3 * Math.sin(2 * p));
  writeWav('sfx/gulp.wav', normalize(lowpass(x, 2000), 0.6));
}
// Chair squeak + cushion plop
{
  const x = tone((t) => 950 + 380 * Math.sin(t * 9) + 40 * Math.sin(t * 90), 0.42, 0.02, 0.18, (p) => Math.sin(p) + 0.25 * Math.sin(3 * p));
  writeWav('sfx/chair_squeak.wav', normalize(x, 0.45));
  const y = mix(buf(0.6), kick(80, 0.4, 0.5), 0, 1);
  mix(y, lowpass(noiseBurst(0.5, 0.01, 0.12, 1200), 1200), 0.02, 0.8);
  writeWav('sfx/cushion_plop.wav', normalize(y, 0.8));
}
// Sunglasses glint "ting"
{
  const x = buf(1.2);
  for (const [f, g] of [[2637, 1], [3951, 0.5], [5274, 0.25]]) mix(x, tone(f, 1.2, 0.002, 0.25), 0, g);
  writeWav('sfx/glint.wav', normalize(x, 0.5));
}
// Whoosh (camera whip / cut accent)
{
  const x = buf(0.5);
  for (let i = 0; i < x.length; i++) x[i] = noise() * Math.sin((Math.PI * i) / x.length) ** 2;
  writeWav('sfx/whoosh.wav', normalize(lowpass(highpass(x, 400), 3500), 0.5));
}

// ----------------------------------------------------------------- MUSIC
// Villain entry sting: timpani roll → three brass stabs "DUN… DUN… DUNNN!"
// Hits land at 0.00 s, 0.50 s and 1.10 s (the composition aligns to these).
{
  const x = buf(4);
  // D minor: D2/A2/D3, then Eb (b2) for comic menace, then D held
  const stabs = [
    [0.0, [38, 45, 50], 0.28],
    [0.5, [39, 46, 51], 0.28],
    [1.1, [38, 45, 50, 53], 1.6],
  ];
  for (const [t, notes, len] of stabs) {
    for (const n of notes) mix(x, brass(n, len, { release: len > 1 ? 0.9 : 0.25 }), t, 0.35);
    mix(x, timpani(midi(notes[0]), 1.8), t, 0.9);
  }
  // cymbal swell into the last hit
  const sw = highpass(noiseBurst(1.2, 0.9, 0.25, 12000), 3000);
  mix(x, sw, 0.0, 0.25);
  writeWav('music/villain_sting.wav', normalize(softclip(x, 1.3), 0.9));
}
// Villain swagger bed (loopable, 100 bpm): sneaky plucked bass ostinato,
// dholak-style low "dha" + slap pattern, low brass pads on the bar.
{
  const bpm = 100;
  const beat = 60 / bpm;
  const bars = 4;
  const sec = bars * 4 * beat;
  const x = buf(sec + 1);
  const bass = [38, null, 45, null, 38, 44, 45, null, 38, null, 45, null, 41, 40, 39, null];
  for (let bar = 0; bar < bars; bar++) {
    for (let s = 0; s < 16; s++) {
      const step = bar * 4 * beat + (s * beat) / 4;
      const n = bass[s];
      if (n != null) mix(x, pluck(midi(n + 12), 0.5, 0.993, 0.9), step, 0.55);
    }
    // dholak: dha on 1 & 3 (+ "and of 4"), slaps on 2 & 4
    for (const b of [0, 2, 3.5]) mix(x, kick(75, 0.4, 0.8), bar * 4 * beat + b * beat, 0.5);
    for (const b of [1, 3]) mix(x, highpass(noiseBurst(0.12, 0.001, 0.03, 6000), 700), bar * 4 * beat + b * beat, 0.35);
    for (const b of [1.5, 2.5, 3.75]) mix(x, highpass(noiseBurst(0.06, 0.001, 0.015, 7000), 1500), bar * 4 * beat + b * beat, 0.15);
    // brass pad accent on bar start
    mix(x, brass(bar % 2 ? 39 : 38, beat * 1.5, { release: 0.4 }), bar * 4 * beat, 0.16);
  }
  writeWav('music/villain_bed.wav', normalize(x.subarray(0, Math.ceil(sec * SR)), 0.75));
}
console.log('\nAll placeholder audio written to public/audio/. Replace any file with a final mix of the same name.');
