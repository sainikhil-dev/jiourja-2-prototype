/** SCENE 1 — "THE ELECTRICITY BILL ENTERS". Lines take their length from the recorded voice. */
import type { Beat } from './beats';

export const SCENE1_BEATS: Beat[] = [
  { id: 'establish', frames: 30 }, // factory humming, everyone content
  { id: 'powerDown', frames: 14 }, // lights flicker, machines die, heads turn
  { id: 'rattle', frames: 10 }, // the shutter shakes
  { id: 'burst', frames: 33 }, // shutter flies up → silhouette → glint (sting hits at +0, +15, +33)
  { id: 'steps', frames: 28 }, // BOOM… BOOM… everyone snaps to attention
  { id: 'sit', frames: 52 }, // the Bill takes THE chair, spins, crosses his legs
  { id: 'l1', line: 's1_owner_kaun', lead: 2, tail: 4 }, // "अरे! मेरी कुर्सी पर ये कौन बैठ गया?"
  { id: 'l2', line: 's1_bill_kamai', lead: 5, tail: 8 }, // "[laughs] मैं हूँ... बिजली का बिल! …"
  { id: 'l3', line: 's1_owner_vasooli', lead: 5, tail: 14 }, // "ये बिजली का बिल है... या वसूली गैंग?"
];

/** Hit offsets inside public/audio/music/villain_sting.wav (seconds). */
export const STING_HITS = [0, 0.5, 1.1];
