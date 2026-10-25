import React from 'react';
import { Composition } from 'remotion';
import { CharacterSheet } from './scenes/CharacterSheet';
import { Scene1Boss, S1 } from './scenes/Scene1Boss';
import { Scene2Problem, S2 } from './scenes/Scene2Problem';
import { Scene3Reveal, S3 } from './scenes/Scene3Reveal';
import { Scene4App, S4 } from './scenes/Scene4App';
import { Scene5Punchline, S5 } from './scenes/Scene5Punchline';
import { Commercial, TOTAL_FRAMES } from './Commercial';
import { FPS } from './timeline/beats';

const HD = { fps: FPS, width: 1920, height: 1080 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    {/* The finished spot */}
    <Composition id="Commercial" component={Commercial} durationInFrames={TOTAL_FRAMES} {...HD} defaultProps={{ scratchOverlay: false }} />
    {/* Same cut with a QA overlay: who is speaking, the line text and how its lip-sync was timed */}
    <Composition id="DialogueStem" component={Commercial} durationInFrames={TOTAL_FRAMES} {...HD} defaultProps={{ scratchOverlay: false, stem: "dialogue" as const }} />
    <Composition id="CommercialQA" component={Commercial} durationInFrames={TOTAL_FRAMES} {...HD} defaultProps={{ scratchOverlay: true }} />
    {/* Individual scenes for review */}
    <Composition id="Scene1" component={Scene1Boss} durationInFrames={S1.__total.end} {...HD} defaultProps={{ scratchOverlay: false, withMusic: true }} />
    <Composition id="Scene2" component={Scene2Problem} durationInFrames={S2.__total.end} {...HD} />
    <Composition id="Scene3" component={Scene3Reveal} durationInFrames={S3.__total.end} {...HD} />
    <Composition id="Scene4" component={Scene4App} durationInFrames={S4.__total.end} {...HD} />
    <Composition id="Scene5" component={Scene5Punchline} durationInFrames={S5.__total.end} {...HD} />
    <Composition id="CharacterSheet" component={CharacterSheet} durationInFrames={240} {...HD} />
  </>
);
