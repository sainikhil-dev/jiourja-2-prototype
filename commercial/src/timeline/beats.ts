/**
 * Audio-first timeline.
 *
 * A scene is a list of beats. An action beat has a fixed length in frames;
 * a line beat takes its length from the REAL recorded line (via
 * audio-manifest.json, written by `npm run analyze-audio`) and only falls
 * back to the script's scratch guess when no file has been imported.
 *
 * For a recorded line the beat is laid out around where the VOICE is, not
 * where the file starts: `lead` frames of breathing room, the voice, then
 * `tail` frames. Room tone at the file edges is skipped; the voice itself
 * is never trimmed, stretched or sped up.
 *
 * All acting is keyed relative to beat boundaries and word times, so a
 * re-recorded take re-times every gesture, cut and mouth shape with it.
 */
import manifestJson from './audio-manifest.json';
import { LINE, type Speaker } from './script';
import { scratchCues, visemeAt, type MouthCue, type Viseme } from '../audio/visemes';

export const FPS = 30;
const PREROLL = 3; // frames of the file played before the voice (keeps breaths/attacks)

export type ManifestWord = { text: string; start: number; end: number };
export type ManifestEntry = {
  file: string; // path under public/
  duration: number; // seconds, whole file
  speechStart: number; // seconds: first voiced frame
  speechEnd: number; // seconds: last voiced frame
  cues: MouthCue[]; // seconds from file start
  cueSource: 'forced-alignment' | 'elevenlabs-alignment' | 'rhubarb' | 'text+energy-approx';
  alignMethod?: string;
  nonverbal?: Array<[number, number]>; // laughs etc. (seconds from file start)
  words?: ManifestWord[];
};
export const MANIFEST = manifestJson as unknown as Record<string, ManifestEntry>;

export type Beat =
  | { id: string; frames: number }
  | { id: string; line: string; lead?: number; tail?: number };

export type ResolvedLine = {
  id: string;
  speaker: Speaker;
  fileZero: number; // frame at which file time 0 would play
  playFrom: number; // first frame of audio actually played
  playTo: number; // frame audio playback stops
  speechStart: number; // frame the voice starts
  speechEnd: number; // frame the voice ends
  cues: MouthCue[]; // seconds from file start
  words: ManifestWord[]; // seconds from file start
  nonverbal: Array<[number, number]>;
  file?: string;
  scratch: boolean;
  source: string;
};

export type ResolvedBeat = { id: string; start: number; end: number; line?: ResolvedLine };
export type Resolved = Record<string, ResolvedBeat> & { __total: ResolvedBeat };

export function resolveBeats(beats: Beat[], offset = 0): Resolved {
  const out: Record<string, ResolvedBeat> = {};
  let f = offset;
  for (const b of beats) {
    if ('frames' in b) {
      out[b.id] = { id: b.id, start: f, end: f + b.frames };
      f += b.frames;
      continue;
    }
    const meta = LINE[b.line];
    if (!meta) throw new Error(`Unknown line ${b.line}`);
    const m = MANIFEST[b.line];
    const lead = b.lead ?? 4;
    const tail = b.tail ?? 6;
    const speechStart = f + lead;
    let line: ResolvedLine;
    if (m) {
      const s0 = Math.round(m.speechStart * FPS);
      const s1 = Math.round(m.speechEnd * FPS);
      const fileZero = speechStart - s0;
      const speechEnd = fileZero + s1;
      line = {
        id: b.line,
        speaker: meta.speaker,
        fileZero,
        playFrom: Math.max(fileZero, speechStart - PREROLL),
        playTo: Math.min(fileZero + Math.floor(m.duration * FPS), speechEnd + tail),
        speechStart,
        speechEnd,
        cues: m.cues,
        words: m.words ?? [],
        nonverbal: m.nonverbal ?? [],
        file: m.file,
        scratch: false,
        source: `${m.cueSource}${m.alignMethod ? ` (${m.alignMethod})` : ''}`,
      };
    } else {
      const speechEnd = speechStart + Math.round(meta.scratch * FPS);
      line = {
        id: b.line,
        speaker: meta.speaker,
        fileZero: speechStart,
        playFrom: speechStart,
        playTo: speechEnd,
        speechStart,
        speechEnd,
        cues: meta.lip ? scratchCues(meta.lip, meta.scratch) : [],
        words: [],
        nonverbal: [],
        scratch: true,
        source: 'scratch (no audio)',
      };
    }
    const end = line.speechEnd + tail;
    out[b.id] = { id: b.id, start: f, end, line };
    f = end;
  }
  out.__total = { id: '__total', start: offset, end: f };
  return out as Resolved;
}

/** Which mouth shape `speaker` makes at `frame`, from every line beat. */
export function mouthFor(speaker: Speaker, frame: number, beats: Resolved): Viseme {
  for (const b of Object.values(beats)) {
    const l = b.line;
    if (!l || l.speaker !== speaker) continue;
    if (frame < l.speechStart || frame >= l.speechEnd) continue;
    return visemeAt(l.cues, (frame - l.fileZero) / FPS);
  }
  return 'X';
}

/** True while `speaker`'s voice is actually sounding (for gesture beats / ducking). */
export function isSpeaking(speaker: Speaker | 'any', frame: number, beats: Resolved) {
  return Object.values(beats).some(
    (b) => b.line && (speaker === 'any' || b.line.speaker === speaker) && frame >= b.line.speechStart && frame < b.line.speechEnd,
  );
}

/** True while `speaker` is laughing (a non-verbal span of one of their lines). */
export function isLaughing(speaker: Speaker, frame: number, beats: Resolved) {
  return Object.values(beats).some(
    (b) => b.line && b.line.speaker === speaker && b.line.nonverbal.some(([a, z]) => frame >= b.line!.fileZero + a * FPS && frame < b.line!.fileZero + z * FPS),
  );
}

/**
 * Frame at which the n-th word (0-based) of a line starts — key gestures on
 * the words that carry them. Falls back to a proportional guess for scratch lines.
 */
export function wordAt(b: ResolvedBeat, n: number, which: 'start' | 'end' = 'start'): number {
  const l = b.line!;
  const w = l.words[n];
  if (w) return Math.round(l.fileZero + (which === 'start' ? w.start : w.end) * FPS);
  const count = Math.max(1, LINE[l.id].lip.split(/\s+/).length);
  return Math.round(l.speechStart + ((l.speechEnd - l.speechStart) * (n + (which === 'end' ? 1 : 0))) / count);
}

export function lineBeats(beats: Resolved) {
  return Object.values(beats).filter((b) => b.line) as Array<Required<ResolvedBeat>>;
}

/** Shift a scene's resolved beats onto the master timeline. */
export function offsetBeats(beats: Resolved, by: number): Resolved {
  const out: Record<string, ResolvedBeat> = {};
  for (const [k, b] of Object.entries(beats)) {
    out[k] = {
      ...b,
      start: b.start + by,
      end: b.end + by,
      line: b.line && {
        ...b.line,
        fileZero: b.line.fileZero + by,
        playFrom: b.line.playFrom + by,
        playTo: b.line.playTo + by,
        speechStart: b.line.speechStart + by,
        speechEnd: b.line.speechEnd + by,
      },
    };
  }
  return out as Resolved;
}
