/**
 * The full spot: five scenes in sequence, one continuous score on top.
 * Scene lengths come from the recorded voice (via their beat sheets), so the
 * whole film re-times itself when a line is re-recorded.
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { S1, scene1Music } from './scenes/Scene1Boss';
import { scene3Timing } from './scenes/Scene3Reveal';
import { scene5Timing } from './scenes/Scene5Punchline';
import { MixContext, Soundtrack, type MusicCue } from './audio/Soundtrack';
import { ScratchOverlay } from './scenes/ScratchOverlay';
import { Subtitles } from './subtitles/Subtitles';

import { SCENES, SCENE_OFFSETS, TOTAL_FRAMES, MASTER } from './timeline/master';
export { SCENE_OFFSETS, TOTAL_FRAMES, MASTER };

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

export const Commercial: React.FC<{ scratchOverlay?: boolean; stem?: 'mix' | 'dialogue'; subtitles?: boolean }> = ({ scratchOverlay = false, stem = 'mix', subtitles = false }) => (
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
    {subtitles && <Subtitles />}
    {scratchOverlay && <ScratchOverlay beats={MASTER} />}
  </AbsoluteFill>
  </MixContext.Provider>
);
