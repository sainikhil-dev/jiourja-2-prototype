/**
 * Audio-first timeline.
 *
 * A scene is a list of beats. An action beat has a fixed length in frames;
 * a line beat takes its length from the REAL audio file for that line
 * (via audio-manifest.json, written by `npm run analyze-audio`) and only
 * falls back to the script's scratch guess when no file has been imported.
 *
 * All acting is keyed relative to beat boundaries (e.g. "3 frames after the
 * owner starts speaking"), so when a real take is longer or shorter the
 * gestures, cuts and mouth shapes move with it. Nothing is ever stretched.
 */
import manifestJson from './audio-manifest.json';
import { LINE, type Speaker } from './script';
import { scratchCues, visemeAt, type MouthCue, type Viseme } from '../audio/visemes';

export const FPS = 30;

export type ManifestEntry = {
  file: string; // path under public/
  duration: number; // seconds, whole file
  speechStart: number; // seconds of leading silence trimmed by analysis
  speechEnd: number; // seconds where the voice ends
  cues: MouthCue[]; // relative to file start
  cueSource: 'elevenlabs-alignment' | 'rhubarb' | 'text+energy-approx';
};
export const MANIFEST = manifestJson as Record<string, ManifestEntry>;

export type Beat =
  | { id: string; frames: number }
  | { id: string; line: string; lead?: number; tail?: number };

export type ResolvedBeat = {
  id: string;
  start: number; // frame the beat starts (scene-relative)
  end: number;
  line?: {
    id: string;
    speaker: Speaker;
    audioFrom: number; // frame the audio file starts playing
    speechStart: number; // frame the voice actually starts
    speechEnd: number; // frame the voice actually ends
    cues: MouthCue[]; // seconds relative to audioFrom
    file?: string;
    scratch: boolean;
    source: string;
  };
};

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
    const lead = b.lead ?? 0;
    const tail = b.tail ?? 6;
    const audioFrom = f + lead;
    let speechStart: number;
    let speechEnd: number;
    let audioEnd: number;
    let cues: MouthCue[];
    if (m) {
      // play the file from its first sample so breaths are kept; but the beat
      // is laid out around where the voice really is.
      speechStart = audioFrom + Math.round(m.speechStart * FPS);
      speechEnd = audioFrom + Math.round(m.speechEnd * FPS);
      audioEnd = audioFrom + Math.ceil(m.duration * FPS);
      cues = m.cues;
    } else {
      speechStart = audioFrom;
      speechEnd = audioFrom + Math.round(meta.scratch * FPS);
      audioEnd = speechEnd;
      cues = meta.lip ? scratchCues(meta.lip, meta.scratch) : [];
    }
    const end = Math.max(speechEnd + tail, audioEnd);
    out[b.id] = {
      id: b.id,
      start: f,
      end,
      line: {
        id: b.line,
        speaker: meta.speaker,
        audioFrom,
        speechStart,
        speechEnd,
        cues,
        file: m?.file,
        scratch: !m,
        source: m ? m.cueSource : 'scratch (no audio)',
      },
    };
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
    return visemeAt(l.cues, (frame - l.audioFrom) / FPS);
  }
  return 'X';
}

/** True while `speaker`'s voice is actually sounding (for gesture beats / ducking). */
export function isSpeaking(speaker: Speaker | 'any', frame: number, beats: Resolved) {
  return Object.values(beats).some(
    (b) => b.line && (speaker === 'any' || b.line.speaker === speaker) && frame >= b.line.speechStart && frame < b.line.speechEnd,
  );
}

export function lineBeats(beats: Resolved) {
  return Object.values(beats).filter((b) => b.line) as Array<Required<ResolvedBeat>>;
}
