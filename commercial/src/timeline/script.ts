/**
 * The dialogue for "FACTORY KA ASLI MAALIK!", one entry per speaking turn,
 * exactly as recorded in ElevenLabs. Source of truth: lines.json (also read
 * by scripts/analyze-audio.mjs).
 *
 * `tts`     — the text that was given to ElevenLabs (with audio tags).
 * `lip`     — the words actually spoken, used for forced alignment.
 * `scratch` — fallback seconds, used ONLY if a line has no audio.
 */
import linesJson from './lines.json';

export type Speaker = 'owner' | 'friend' | 'bill' | 'raju' | 'pappu' | 'announcer';

export type Line = {
  id: string;
  scene: number;
  speaker: Speaker;
  tts: string;
  lip: string;
  direction: string;
  scratch: number;
  note?: string;
};

export const LINES = linesJson as Line[];
export const LINE = Object.fromEntries(LINES.map((l) => [l.id, l])) as Record<string, Line>;
