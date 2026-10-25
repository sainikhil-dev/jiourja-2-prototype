import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player, type PlayerRef } from '@remotion/player';
import { Scene1Boss, S1 } from '../src/scenes/Scene1Boss';
import { CharacterSheet } from '../src/scenes/CharacterSheet';
import { FPS } from '../src/timeline/beats';

const COMPS = {
  Scene1: { component: Scene1Boss, frames: S1.__total.end, label: 'Scene 1 (voiced)' },
  CharacterSheet: { component: CharacterSheet, frames: 240, label: 'Character model sheet' },
} as const;
type CompId = keyof typeof COMPS;

const btn: React.CSSProperties = {
  background: '#F2B632', color: '#2A1A14', border: 'none', borderRadius: 8, padding: '8px 16px',
  fontWeight: 700, fontSize: 15, cursor: 'pointer', minWidth: 84,
};

const tc = (f: number) => `${(f / FPS).toFixed(2)} s · f${f}`;

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  const [comp, setComp] = useState<CompId>('Scene1');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const c = COMPS[comp];

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('ended', onPause);
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('ended', onPause);
    };
  }, [comp]);

  const replay = useCallback(() => {
    ref.current?.seekTo(0);
    ref.current?.play();
  }, []);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16, color: '#F6EBD9', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, margin: '6px 0 12px' }}>FACTORY KA ASLI MAALIK! — JioUrja 2.0 animatic</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {(Object.keys(COMPS) as CompId[]).map((id) => (
          <button key={id} style={{ ...btn, background: id === comp ? '#F2B632' : '#3A2E28', color: id === comp ? '#2A1A14' : '#F6EBD9' }} onClick={() => { setComp(id); setFrame(0); }}>
            {COMPS[id].label}
          </button>
        ))}
      </div>
      <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,.5)' }}>
        <Player
          key={comp}
          ref={ref}
          component={c.component as React.FC<Record<string, unknown>>}
          inputProps={{ scratchOverlay: overlay }}
          durationInFrames={c.frames}
          fps={FPS}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: '100%', aspectRatio: '16 / 9' }}
          numberOfSharedAudioTags={16}
          acknowledgeRemotionLicense
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button style={btn} onClick={() => (playing ? ref.current?.pause() : ref.current?.play())}>{playing ? 'Pause' : 'Play'}</button>
        <button style={btn} onClick={replay}>Replay</button>
        <button style={btn} onClick={() => ref.current?.seekTo(Math.max(0, frame - 1))}>◀ 1f</button>
        <button style={btn} onClick={() => ref.current?.seekTo(Math.min(c.frames - 1, frame + 1))}>1f ▶</button>
        <input
          type="range"
          min={0}
          max={c.frames - 1}
          value={frame}
          onChange={(e) => ref.current?.seekTo(Number(e.target.value))}
          style={{ flex: 1, minWidth: 200, accentColor: '#F2B632' }}
          aria-label="Seek"
        />
        <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 120 }}>{tc(frame)}</span>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> scratch captions
        </label>
      </div>
      <p style={{ opacity: 0.7, fontSize: 13 }}>
        Voices are not in this preview yet. Mouth timing is a scratch guess from the Hindi text, and the music and SFX are synthesised placeholders. The final lip-sync will be built from your ElevenLabs takes.
      </p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
