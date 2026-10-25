/** The delivered film: live-action intro, a short bridge, then the cartoon commercial. */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { DISSOLVE, Intro, IntroBridgeAudio, INTRO_FRAMES } from './Intro';
import { Commercial, TOTAL_FRAMES } from './Commercial';

/** The cartoon starts under the intro's dissolve. */
export const COMMERCIAL_AT = INTRO_FRAMES - DISSOLVE;
export const FILM_FRAMES = COMMERCIAL_AT + TOTAL_FRAMES;

export const Film: React.FC<{ subtitles?: boolean }> = ({ subtitles = false }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Sequence from={COMMERCIAL_AT} durationInFrames={TOTAL_FRAMES} name="Commercial">
      <Commercial subtitles={subtitles} />
    </Sequence>
    {/* intro on top, dissolving away over the factory's first frames */}
    <Sequence from={0} durationInFrames={INTRO_FRAMES} name="Intro">
      <Intro />
    </Sequence>
    <IntroBridgeAudio />
  </AbsoluteFill>
);
