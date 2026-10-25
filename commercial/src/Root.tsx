import React from 'react';
import { Composition } from 'remotion';
import { CharacterSheet } from './scenes/CharacterSheet';
import { Scene1Boss, S1 } from './scenes/Scene1Boss';
import { FPS } from './timeline/beats';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Stage 1 deliverable: the opening scene as a ~10 s playable preview */}
    <Composition
      id="Preview10s"
      component={Scene1Boss}
      durationInFrames={S1.__total.end}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ scratchOverlay: true }}
    />
    <Composition id="CharacterSheet" component={CharacterSheet} durationInFrames={240} fps={FPS} width={1920} height={1080} />
  </>
);
