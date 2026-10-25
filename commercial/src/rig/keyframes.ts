/**
 * Pose-to-pose keyframe engine.
 *
 * A pose track is a list of keys. Each key sets any subset of a character's
 * pose properties at a frame. Every numeric property is interpolated only
 * between the keys that mention it, so an animator can block a scene like a
 * dope sheet: "at f40 raise the right arm", "at f52 snap the head back".
 * Non-numeric properties (hand shape, expression presets) step.
 */
import { Easing } from 'remotion';

export type EaseName =
  | 'linear'
  | 'in'
  | 'out'
  | 'inOut'
  | 'back' // overshoot then settle: snappy cartoon arrivals
  | 'anticipate' // pull back before moving
  | 'elastic'
  | 'bounce'
  | 'hold'; // stay on previous value until this key (a cut in the acting)

const EASE: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  in: Easing.in(Easing.cubic),
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back(1.9)),
  anticipate: Easing.in(Easing.back(1.6)),
  elastic: Easing.out(Easing.elastic(1.2)),
  bounce: Easing.out(Easing.bounce),
  hold: (t) => (t < 1 ? 0 : 1),
};

export type Key<P> = { f: number; e?: EaseName } & Partial<P>;

export function ease(name: EaseName, t: number) {
  return EASE[name](Math.min(1, Math.max(0, t)));
}

/** Interpolate a single numeric track: [[frame, value, ease?], ...] */
export function kf(frame: number, keys: Array<[number, number, EaseName?]>): number {
  if (keys.length === 0) return 0;
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e = 'inOut'] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (frame <= f1) {
      const t = f1 === f0 ? 1 : (frame - f0) / (f1 - f0);
      return v0 + (v1 - v0) * ease(e, t);
    }
  }
  return keys[keys.length - 1][1];
}

/** Evaluate a pose track at a frame, starting from `base`. */
export function animatePose<P extends object>(frame: number, base: P, keys: Key<P>[]): P {
  const out = { ...base } as Record<string, unknown>;
  const sorted = [...keys].sort((a, b) => a.f - b.f);
  const props = new Set<string>();
  for (const k of sorted) for (const p of Object.keys(k)) if (p !== 'f' && p !== 'e') props.add(p);

  for (const p of props) {
    const track = sorted.filter((k) => (k as Record<string, unknown>)[p] !== undefined);
    const first = (track[0] as Record<string, unknown>)[p];
    if (typeof first === 'number') {
      // The base value acts as an implicit key at -infinity, so a property
      // first keyed at f60 is held at its base value until then and the
      // first key just "snaps" in unless the animator adds an earlier key.
      const nums: Array<[number, number, EaseName?]> = track.map((k) => [
        k.f,
        (k as Record<string, unknown>)[p] as number,
        k.e,
      ]);
      out[p] = kf(frame, nums);
    } else {
      // stepped
      let v = (base as Record<string, unknown>)[p];
      for (const k of track) if (k.f <= frame) v = (k as Record<string, unknown>)[p];
      out[p] = v;
    }
  }
  return out as P;
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Natural blink: returns 1 (open) .. 0 (closed). Blinks every ~2.5–4.5 s
 * with a 5-frame close/open, deterministic per `seed`. `extra` lets a scene
 * force a blink (e.g. on a head turn, which is how animators sell thought).
 */
export function blink(frame: number, seed: number, extra: number[] = []) {
  const shape = (d: number) => (d < 0 || d > 5 ? 1 : [1, 0.45, 0, 0.1, 0.55, 1][d]);
  let v = 1;
  for (const b of extra) v = Math.min(v, shape(frame - b));
  let t = Math.floor(rand(seed) * 40);
  let i = 0;
  while (t <= frame + 6) {
    v = Math.min(v, shape(frame - t));
    t += 75 + Math.floor(rand(seed * 31 + i++) * 60);
  }
  return v;
}

/** Small continuous breathing / idle sway, amplitude in arbitrary units. */
export function breathe(frame: number, seed: number, rate = 1) {
  return Math.sin((frame / 30) * Math.PI * 2 * 0.28 * rate + seed);
}

/** Camera / impact shake that decays after `start`. */
export function shake(frame: number, start: number, strength = 14, dur = 14) {
  const d = frame - start;
  if (d < 0 || d > dur) return { x: 0, y: 0 };
  const k = (1 - d / dur) ** 2 * strength;
  return { x: Math.sin(d * 2.7 + start) * k, y: Math.cos(d * 3.9 + start) * k };
}
