/**
 * Mouth shapes and the data that drives them.
 *
 * The viseme alphabet follows the Preston Blair / Rhubarb Lip Sync set so
 * cue files from Rhubarb (`--recognizer phonetic`, language-independent)
 * can be dropped in unchanged:
 *
 *   X rest (closed, relaxed)       A closed, pressed  (m b p)
 *   B slightly open, teeth (k s t ee / इ ई)   C open (e / ए, schwa अ)
 *   D wide open (aa / आ)           E rounded (o / ओ औ)
 *   F puckered (oo u w / उ ऊ व)    G upper teeth on lower lip (f v / फ़)
 *   H tongue up (l / ल)
 */
export type Viseme = 'X' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export type MouthCue = { start: number; end: number; value: Viseme }; // seconds, relative to the line's audio file

export type MouthShape = {
  open: number;
  wide: number;
  round: number;
  teeth: 'none' | 'top' | 'both';
  tongue: number;
  tongueUp?: boolean;
  press?: boolean;
};

export const VISEME_SHAPES: Record<Viseme, MouthShape> = {
  X: { open: 0, wide: 1, round: 0, teeth: 'none', tongue: 0 },
  A: { open: 0, wide: 0.9, round: 0, teeth: 'none', tongue: 0, press: true },
  B: { open: 0.3, wide: 1.0, round: 0, teeth: 'both', tongue: 0 },
  C: { open: 0.58, wide: 1.0, round: 0.08, teeth: 'top', tongue: 0.35 },
  D: { open: 1.0, wide: 1.06, round: 0.12, teeth: 'top', tongue: 0.55 },
  E: { open: 0.66, wide: 0.72, round: 0.62, teeth: 'none', tongue: 0.3 },
  F: { open: 0.34, wide: 0.46, round: 1, teeth: 'none', tongue: 0 },
  G: { open: 0.2, wide: 0.92, round: 0, teeth: 'top', tongue: 0 },
  H: { open: 0.52, wide: 0.96, round: 0.08, teeth: 'top', tongue: 0.9, tongueUp: true },
};

/** Viseme at `t` seconds into a line, or 'X' outside any cue. */
export function visemeAt(cues: MouthCue[], t: number): Viseme {
  for (const c of cues) if (t >= c.start && t < c.end) return c.value;
  return 'X';
}

// ---------------------------------------------------------------------------
// Devanagari → viseme mapping.
//
// Used two ways:
//  1. With real per-character timestamps (ElevenLabs "with-timestamps"
//     alignment) — accurate, text-and-time aligned mouth shapes.
//  2. With NO audio (scratch animatic only): aksharas are spread across a
//     guessed duration. This is an approximation for blocking the acting and
//     is labelled SCRATCH in the preview. It is never used for the final cut.
// ---------------------------------------------------------------------------

const LABIAL = new Set(['प', 'फ', 'ब', 'भ', 'म']);
const LABIODENTAL = new Set(['व']);
const LATERAL = new Set(['ल', 'ळ']);
const VIRAMA = '्';
const NUKTA = '़';
const NASAL = new Set(['ं', 'ँ']);

const VOWEL_VISEME: Record<string, Viseme> = {
  // independent vowels
  अ: 'C', आ: 'D', इ: 'B', ई: 'B', उ: 'F', ऊ: 'F', ए: 'C', ऐ: 'C', ओ: 'E', औ: 'E', ऋ: 'B', ऑ: 'E',
  // matras
  'ा': 'D', 'ि': 'B', 'ी': 'B', 'ु': 'F', 'ू': 'F', 'े': 'C', 'ै': 'C', 'ो': 'E', 'ौ': 'E', 'ृ': 'B', 'ॉ': 'E',
};
const LONG = new Set(['आ', 'ई', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'ा', 'ी', 'ू', 'े', 'ै', 'ो', 'ौ']);

const isConsonant = (ch: string) => ch >= 'क' && ch <= 'ह';
const isIndepVowel = (ch: string) => (ch >= 'अ' && ch <= 'औ') || ch === 'ऑ';

export type Akshara = {
  /** index range in the source string, for mapping per-character timestamps */
  from: number;
  to: number;
  onset?: Viseme; // brief consonant shape before the vowel (lips closing for म, teeth for फ़…)
  vowel: Viseme;
  weight: number; // relative duration for scratch timing
  pauseAfter: number; // relative pause weight after this akshara
  final: boolean; // last akshara of a word with no vowel sign (Hindi schwa deletion)
};

export function aksharas(text: string): Akshara[] {
  const chars = Array.from(text);
  const out: Akshara[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (isIndepVowel(ch)) {
      const from = i;
      i++;
      while (i < chars.length && NASAL.has(chars[i])) i++;
      out.push({ from, to: i, vowel: VOWEL_VISEME[ch] ?? 'C', weight: LONG.has(ch) ? 1.25 : 1, pauseAfter: 0, final: false });
      continue;
    }
    if (isConsonant(ch)) {
      const from = i;
      const first = ch;
      i++;
      if (chars[i] === NUKTA) i++;
      // conjuncts: C ् C ...
      while (chars[i] === VIRAMA && i + 1 < chars.length && isConsonant(chars[i + 1])) {
        i += 2;
        if (chars[i] === NUKTA) i++;
      }
      let vowel: Viseme = 'C';
      let long = false;
      let hasMatra = false;
      if (chars[i] === VIRAMA) i++;
      else if (chars[i] && VOWEL_VISEME[chars[i]] && !isIndepVowel(chars[i])) {
        vowel = VOWEL_VISEME[chars[i]];
        long = LONG.has(chars[i]);
        hasMatra = true;
        i++;
      }
      while (i < chars.length && NASAL.has(chars[i])) i++;
      const nukta = chars[from + 1] === NUKTA;
      let onset: Viseme | undefined;
      if (LABIAL.has(first) && !nukta) onset = 'A';
      else if (LABIAL.has(first) && nukta) onset = 'G'; // फ़ = f
      else if (LABIODENTAL.has(first)) onset = 'F';
      else if (LATERAL.has(first)) onset = 'H';
      const next = chars[i];
      const wordEnd = next === undefined || !(isConsonant(next) || isIndepVowel(next));
      const final = wordEnd && !hasMatra && out.length > 0;
      out.push({
        from,
        to: i,
        onset,
        // a word-final bare consonant is barely voiced: a quick closing shape
        vowel: final ? (onset ?? 'B') : vowel,
        weight: final ? 0.55 : long ? 1.25 : 1,
        pauseAfter: 0,
        final,
      });
      continue;
    }
    // punctuation / spaces → pauses attached to the previous akshara
    const last = out[out.length - 1];
    if (last) {
      if (ch === '.' || ch === '…') last.pauseAfter += 0.9;
      else if (ch === ',' || ch === '!' || ch === '?' || ch === '।') last.pauseAfter += 1.1;
      else if (ch === ' ') last.pauseAfter += 0.18;
    }
    i++;
  }
  return out;
}

/** Build mouth cues for a line from per-akshara [start,end] times (seconds). */
function cuesFromTimedAksharas(aks: Array<Akshara & { t0: number; t1: number }>): MouthCue[] {
  const raw: MouthCue[] = [];
  for (const a of aks) {
    const dur = a.t1 - a.t0;
    if (a.onset && !a.final && dur > 0.09) {
      const split = a.t0 + Math.min(0.07, dur * 0.35);
      raw.push({ start: a.t0, end: split, value: a.onset });
      raw.push({ start: split, end: a.t1, value: a.vowel });
    } else raw.push({ start: a.t0, end: a.t1, value: a.vowel });
  }
  return mergeCues(raw);
}

/** Merge equal neighbours, fill tiny gaps, drop flickers shorter than 2 frames. */
export function mergeCues(raw: MouthCue[], fps = 30): MouthCue[] {
  const minDur = 2 / fps;
  const out: MouthCue[] = [];
  for (const c of raw) {
    const prev = out[out.length - 1];
    if (prev && c.start - prev.end < 0.03) {
      if (prev.value === c.value) {
        prev.end = c.end;
        continue;
      }
      if (c.end - c.start < minDur) {
        prev.end = c.end; // absorb flicker
        continue;
      }
      c.start = prev.end;
    }
    out.push({ ...c });
  }
  return out;
}

/**
 * SCRATCH ONLY: spread aksharas over [0, duration] seconds with natural pauses
 * at punctuation. Gives believable blocking without any audio.
 */
export function scratchCues(text: string, duration: number): MouthCue[] {
  const aks = aksharas(text);
  const total = aks.reduce((s, a) => s + a.weight + a.pauseAfter, 0) - (aks.at(-1)?.pauseAfter ?? 0);
  const unit = duration / Math.max(total, 1e-6);
  let t = 0;
  const timed = aks.map((a, idx) => {
    const t0 = t;
    const t1 = t0 + a.weight * unit;
    t = t1 + (idx < aks.length - 1 ? a.pauseAfter * unit : 0);
    return { ...a, t0, t1 };
  });
  return cuesFromTimedAksharas(timed);
}

/**
 * Accurate path: ElevenLabs `with-timestamps` alignment gives a start/end
 * time for every character of the input text. Map each akshara to the span of
 * its characters. Pauses then come from the real audio, not from guesses.
 */
export function alignedCues(
  text: string,
  alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] },
): MouthCue[] {
  // alignment.characters is the same text split per UTF-16 char; rebuild code-point indices
  const chars = Array.from(text);
  const starts: number[] = [];
  const ends: number[] = [];
  let k = 0;
  for (let i = 0; i < chars.length; i++) {
    // advance alignment pointer past this code point (usually one entry)
    let s = Infinity;
    let e = -Infinity;
    let consumed = '';
    while (k < alignment.characters.length && consumed.length < chars[i].length) {
      consumed += alignment.characters[k];
      s = Math.min(s, alignment.character_start_times_seconds[k]);
      e = Math.max(e, alignment.character_end_times_seconds[k]);
      k++;
    }
    starts.push(Number.isFinite(s) ? s : (ends[i - 1] ?? 0));
    ends.push(Number.isFinite(e) ? e : (ends[i - 1] ?? 0));
  }
  const timed = aksharas(text).map((a) => ({ ...a, t0: starts[a.from], t1: ends[a.to - 1] }));
  return cuesFromTimedAksharas(timed.filter((a) => a.t1 > a.t0));
}
