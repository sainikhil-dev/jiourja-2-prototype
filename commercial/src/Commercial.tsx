/**
 * The full spot: five scenes in sequence, one continuous score on top.
 * Scene lengths come from the recorded voice (via their beat sheets), so the
 * whole film re-times itself when a line is re-recorded.
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Scene1Boss, S1, scene1Music } from './scenes/Scene1Boss';
import { Scene2Problem, S2 } from './scenes/Scene2Problem';
import { Scene3Reveal, S3, scene3Timing } from './scenes/Scene3Reveal';
import { Scene4App, S4 } from './scenes/Scene4App';
import { Scene5Punchline, S5, scene5Timing } from './scenes/Scene5Punchline';
import { MixContext, Soundtrack, type MusicCue } from './audio/Soundtrack';
import { offsetBeats, type Resolved } from './timeline/beats';
import { ScratchOverlay } from './scenes/ScratchOverlay';

const SCENES = [
  { id: 'S1', C: Scene1Boss, B: S1 },
  { id: 'S2', C: Scene2Problem, B: S2 },
  { id: 'S3', C: Scene3Reveal, B: S3 },
  { id: 'S4', C: Scene4App, B: S4 },
  { id: 'S5', C: Scene5Punchline, B: S5 },
] as const;

export const SCENE_OFFSETS: number[] = [];
{
  let o = 0;
  for (const s of SCENES) {
    SCENE_OFFSETS.push(o);
    o += s.B.__total.end;
  }
  SCENE_OFFSETS.push(o);
}
export const TOTAL_FRAMES = SCENE_OFFSETS[SCENE_OFFSETS.length - 1];

/** Every line of the film on the master timeline (for ducking and QA). */
export const MASTER: Resolved = (() => {
  const all: Record<string, Resolved[string]> = {};
  SCENES.forEach((s, i) => {
    const ob = offsetBeats(s.B, SCENE_OFFSETS[i]);
    for (const [k, v] of Object.entries(ob)) if (k !== '__total') all[`${s.id}.${k}`] = v;
  });
  all.__total = { id: '__total', start: 0, end: TOTAL_FRAMES };
  return all as Resolved;
})();

function score(): MusicCue[] {
  const o3 = SCENE_OFFSETS[2];
  const o5 = SCENE_OFFSETS[4];
  const reveal = o3 + scene3Timing().REVEAL;
  const card = o5 + scene5Timing().CARD;
  const s1 = scene1Music(S1).map((m) => (m.src === 'music/villain_bed.wav' ? { ...m, to: reveal - 2, fadeOut: 10 } : m));
  return [
    ...s1,
    { src: 'music/hero_lift.wav', from: reveal - 3, to: reveal + 120, vol: 0.6, duck: 0.6, fadeOut: 30 },
    { src: 'music/uplift_bed.wav', from: reveal + 36, to: card + 6, vol: 0.34, duck: 0.62, fadeIn: 30, fadeOut: 14, loop: true },
    { src: 'music/end_sting.wav', from: card, to: TOTAL_FRAMES, vol: 0.8, duck: 1, fadeOut: 20 },
  ];
}

export const Commercial: React.FC<{ scratchOverlay?: boolean; stem?: 'mix' | 'dialogue' }> = ({ scratchOverlay = false, stem = 'mix' }) => (
  <MixContext.Provider value={stem === 'dialogue' ? { dialogue: true, sfx: false, music: false } : { dialogue: true, sfx: true, music: true }}>
  <AbsoluteFill style={{ background: '#000' }}>
    {SCENES.map((s, i) => {
      const C = s.C as React.FC<{ scratchOverlay?: boolean; withMusic?: boolean }>;
      return (
        <Sequence key={s.id} from={SCENE_OFFSETS[i]} durationInFrames={s.B.__total.end} name={s.id}>
          <C scratchOverlay={false} withMusic={false} />
        </Sequence>
      );
    })}
    <Soundtrack beats={MASTER} sfx={[]} music={score()} dialogue={false} />
    {scratchOverlay && <ScratchOverlay beats={MASTER} />}
  </AbsoluteFill>
  </MixContext.Provider>
);
