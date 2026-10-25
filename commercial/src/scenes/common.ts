/** Shared staging constants & helpers, so every scene places the cast identically. */
import { FLOOR } from '../environment/Factory';
import { SEAT_Y, CHAIR_SCALE } from '../environment/Chair';
import type { Viseme } from '../audio/visemes';
import type { HumanPose } from '../characters/Human';

export const CHAIR_X = 1880;
export const POS = { door: 310, pappu: 1010, raju: 2190, owner: 2330, friend: 2610 };
export const BILL_SCALE = 1.08; // on entry; he grows on "…कमाई मेरी!" then shrinks with solar
export const BILL_BIG = 1.3;

/** Cushion top in world space. */
export const SEAT_TOP = SEAT_Y - 40 * CHAIR_SCALE;
/** Bill origin y so that his paper bottom rests on the cushion at a given scale. */
export const billSeatY = (scale: number) => SEAT_TOP + 150 * scale;
/** Leg length (in Bill units) from hips on the cushion to feet on the floor. */
export const seatedLeg = (scale: number) => (FLOOR - SEAT_TOP) / scale;

/** Speech emphasis: open vowels give a small head nod — the voice drives the head too. */
export const talkNod = (v: Viseme) => (v === 'D' ? 3 : v === 'C' ? 2 : v === 'E' ? 1.5 : 0);

export function applyTalk(p: HumanPose, v: Viseme) {
  p.nod += talkNod(v);
}

export function lightsOn(f: number, PD: number, BU: number) {
  if (f < PD) return 1;
  if (f >= BU) return 0.8;
  const pattern = [0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0];
  return pattern[Math.min(pattern.length - 1, f - PD)] ?? 0;
}
