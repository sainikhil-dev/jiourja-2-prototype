/** SCENE 1 — "THE REAL BOSS". Beat sheet; lines take their length from the real audio. */
import type { Beat } from './beats';

export const SCENE1_BEATS: Beat[] = [
  { id: 'establish', frames: 34 }, // factory humming, everyone content
  { id: 'powerDown', frames: 14 }, // lights flicker, machines die, heads turn
  { id: 'rattle', frames: 12 }, // the shutter shakes
  { id: 'burst', frames: 33 }, // shutter flies up → silhouette → glint (sting hits at +0, +15, +33)
  { id: 'steps', frames: 40 }, // BOOM… BOOM… everyone snaps to attention
  { id: 'raju_q', line: 's1_raju_kaun', lead: 4, tail: 5 },
  { id: 'owner_a', line: 's1_owner_maalik', lead: 7, tail: 6 },
  { id: 'sit', frames: 60 }, // the Bill takes THE chair, spins, glints
];

/** Hit offsets inside public/audio/music/villain_sting.wav (seconds). */
export const STING_HITS = [0, 0.5, 1.1];
