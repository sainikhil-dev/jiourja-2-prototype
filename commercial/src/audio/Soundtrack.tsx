/**
 * Plays dialogue (from the audio manifest), SFX and music for a scene.
 * Music is automatically ducked under any speech, with short ramps so it
 * never "pumps" or cuts abruptly.
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { lineBeats, type Resolved } from '../timeline/beats';

export type Sfx = { src: string; at: number; vol?: number; dur?: number; rate?: number };
export type MusicCue = {
  src: string; // relative to public/audio/
  from: number;
  to: number;
  vol: number;
  duck?: number; // multiplier while someone speaks (default 0.32)
  fadeIn?: number;
  fadeOut?: number;
  loop?: boolean;
};

const ramp = (x: number) => Math.max(0, Math.min(1, x));

export function duckEnvelope(frame: number, beats: Resolved, duck: number, rampFrames = 8) {
  // distance (in frames) to the nearest speech interval → smooth gain
  let g = 1;
  for (const b of lineBeats(beats)) {
    const s = b.line.speechStart - 3;
    const e = b.line.speechEnd + 3;
    let k: number;
    if (frame >= s && frame <= e) k = 1;
    else if (frame < s) k = ramp(1 - (s - frame) / rampFrames);
    else k = ramp(1 - (frame - e) / (rampFrames * 1.6));
    g = Math.min(g, 1 - (1 - duck) * k);
  }
  return g;
}

export const Soundtrack: React.FC<{ beats: Resolved; sfx: Sfx[]; music: MusicCue[]; dialogueVol?: number }> = ({
  beats,
  sfx,
  music,
  dialogueVol = 1,
}) => (
  <>
    {lineBeats(beats)
      .filter((b) => b.line.file)
      .map((b) => (
        <Sequence key={b.id} from={b.line.audioFrom} name={`VO ${b.line.id}`}>
          <Audio src={staticFile(b.line.file!)} volume={dialogueVol} />
        </Sequence>
      ))}
    {sfx.map((s, i) => (
      <Sequence key={`sfx${i}`} from={Math.round(s.at)} durationInFrames={s.dur ?? 50} name={`SFX ${s.src}`}>
        <Audio src={staticFile(`audio/sfx/${s.src}`)} volume={s.vol ?? 1} playbackRate={s.rate ?? 1} />
      </Sequence>
    ))}
    {music.map((m, i) => (
      <Sequence key={`mus${i}`} from={m.from} durationInFrames={m.to - m.from} name={`MUSIC ${m.src}`}>
        <Audio
          src={staticFile(`audio/${m.src}`)}
          loop={m.loop}
          volume={(f) => {
            const abs = f + m.from;
            const fin = m.fadeIn ? ramp(f / m.fadeIn) : 1;
            const fout = m.fadeOut ? ramp((m.to - abs) / m.fadeOut) : 1;
            return m.vol * fin * fout * duckEnvelope(abs, beats, m.duck ?? 0.32);
          }}
        />
      </Sequence>
    ))}
  </>
);
