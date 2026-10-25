/**
 * Live-action intro (Team Miles Ahead, FMS Delhi), played before the cartoon.
 *
 * Picture: public/intro/intro_source.mp4 (phone video, 1024×576, 30 fps), muted.
 * Sound:   public/intro/intro_voice_denoised.wav — the clean recording of the same
 *          take (intro_voice_clean.mp3) with outdoor noise removed: RNNoise
 *          (neural speech denoiser, scripts/denoise-rnnoise.mjs) everywhere, a
 *          gentler FFT denoise on her name so its "Kr" onset stays crisp, and
 *          a 70 Hz high-pass. Pause noise drops ~20 dB; speech level and
 *          recognisability are unchanged (Whisper confidence 0.77 → 0.75). It starts 1.30 s into the video (measured by cross-correlating
 *          the two soundtracks, r = 0.77), which keeps her lip-sync exact.
 *
 * The take ends "…energy as a service, and now Rajni sir will elaborate the
 * idea further." The film ends her part on the complete sentence "…solar
 * rooftop energy as a service." (cut 11.37 s into the clean audio; Whisper
 * confirms the kept part ends on "service." and the rest starts "And now…").
 * Instead of a hard cut, a short bridge follows: her last frame freezes and
 * pushes in, goes warm and soft, the JioUrja emblem pops, music lifts, and the
 * picture dissolves into the factory.
 */
import React from 'react';
import { AbsoluteFill, Audio, Easing, Freeze, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SunEmblem, Wordmark } from './brand/Logo';

const FPS = 30;
export const INTRO_TRIM_HEAD = 0.5; // s of video skipped (she's already in frame)
const CLEAN_IN_VIDEO = 1.3; // s: where the clean audio sits on the video's clock
export const INTRO_CUT = 11.37; // s into the clean audio: right after "…as a service."
const AUDIO_AT = Math.round((CLEAN_IN_VIDEO - INTRO_TRIM_HEAD) * FPS);
export const INTRO_SPEECH_END = AUDIO_AT + Math.round(INTRO_CUT * FPS); // her last spoken frame
export const BRIDGE = 32; // frames of freeze + emblem after she finishes
export const DISSOLVE = 15; // frames the intro dissolves over the start of the cartoon
export const INTRO_FRAMES = INTRO_SPEECH_END + BRIDGE;
const VOICE_GAIN = 1.45; // match the cartoon's dialogue level (the denoised take is ~6 dB quieter)

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const E = INTRO_SPEECH_END;
  const push = interpolate(f, [E - 60, INTRO_FRAMES], [1, 1.1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const warm = interpolate(f, [E - 4, E + 18], [0, 0.5], clamp);
  const soft = interpolate(f, [E, E + 20], [0, 5], clamp);
  const pop = interpolate(f, [E + 4, E + 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const fadeOut = interpolate(f, [INTRO_FRAMES - DISSOLVE, INTRO_FRAMES], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: '#000', opacity: fadeOut }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, filter: `blur(${soft}px)` }}>
        {/* freeze on her last word so her lips never move without sound */}
        <Freeze frame={E - 1} active={f >= E}>
          <OffthreadVideo
            src={staticFile('intro/intro_source.mp4')}
            startFrom={Math.round(INTRO_TRIM_HEAD * FPS)}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 45%, #FFF3C8 0%, #FFC14A 60%, #F08A24 100%)', opacity: warm, mixBlendMode: 'soft-light' }} />
      <AbsoluteFill style={{ background: '#FFE7A6', opacity: warm * 0.45 }} />
      {pop > 0.01 && (
        <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <g transform={`translate(960 440) scale(${pop})`}>
            <circle r={230} fill="#FFF6D0" opacity={0.55} />
            <SunEmblem r={120} spin={f * 1.5} />
          </g>
          <g transform="translate(960 720)" opacity={interpolate(f, [E + 10, E + 18], [0, 1], clamp)}>
            <Wordmark size={110} />
          </g>
        </svg>
      )}
      <Sequence from={AUDIO_AT} durationInFrames={E - AUDIO_AT} name="Intro voice (clean)">
        <Audio src={staticFile('intro/intro_voice_denoised.wav')} volume={(t) => VOICE_GAIN * interpolate(t, [E - AUDIO_AT - 2, E - AUDIO_AT], [1, 0], clamp)} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Music + sparkle under the bridge (lives outside the fading intro so it can ride over the dissolve). */
export const IntroBridgeAudio: React.FC = () => {
  const E = INTRO_SPEECH_END;
  const from = E - 75; // creeps in under her last phrase
  return (
    <>
      <Sequence from={from} durationInFrames={INTRO_FRAMES + 24 - from} name="Bridge music">
        <Audio
          src={staticFile('audio/music/uplift_bed.wav')}
          volume={(t) => {
            const g = t + from;
            return interpolate(g, [from, E - 2, E + 8, INTRO_FRAMES - 4, INTRO_FRAMES + 24], [0, 0.07, 0.3, 0.3, 0], clamp);
          }}
        />
      </Sequence>
      <Sequence from={E + 3} durationInFrames={40} name="Bridge sparkle">
        <Audio src={staticFile('audio/sfx/sparkle.wav')} volume={0.4} />
      </Sequence>
    </>
  );
};
