/**
 * A 2D multiplane camera. The world is authored in "set units" where the
 * main acting plane is parallax 1. A camera names the world point that sits
 * at the centre of the frame plus a zoom. Layers with parallax < 1 (back
 * wall, roof) move less; > 1 (foreground clutter) move more — the classic
 * Disney multiplane trick that gives flat art real depth during pans.
 */
import React, { createContext, useContext } from 'react';
import { kf, shake, type EaseName } from '../rig/keyframes';

export type Cam = { x: number; y: number; zoom: number; rot: number };

/** Set centre used to line up the parallax layers (they agree at this point). */
export const REF = { x: 1400, y: 560 };

const CamCtx = createContext<Cam>({ x: REF.x, y: REF.y, zoom: 1, rot: 0 });

export const World: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => (
  <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
    <CamCtx.Provider value={cam}>{children}</CamCtx.Provider>
  </svg>
);

export const Layer: React.FC<{ p?: number; children: React.ReactNode; blur?: number }> = ({ p = 1, children, blur }) => {
  const cam = useContext(CamCtx);
  const z = cam.zoom ** p;
  const tx = REF.x + (cam.x - REF.x) * p;
  const ty = REF.y + (cam.y - REF.y) * p;
  return (
    <g
      transform={`translate(960 540) rotate(${cam.rot}) scale(${z}) translate(${-tx} ${-ty})`}
      style={blur ? { filter: `blur(${blur}px)` } : undefined}
    >
      {children}
    </g>
  );
};

export type CamKey = { f: number; x: number; y: number; zoom: number; rot?: number; e?: EaseName };

/** Evaluate a camera track; use e:'hold' on a key for a hard cut. */
export function camAt(frame: number, keys: CamKey[], shakes: Array<{ f: number; s?: number; d?: number }> = []): Cam {
  const tr = (sel: (k: CamKey) => number) => kf(frame, keys.map((k) => [k.f, sel(k), k.e]));
  let sx = 0;
  let sy = 0;
  for (const s of shakes) {
    const o = shake(frame, s.f, s.s ?? 14, s.d ?? 14);
    sx += o.x;
    sy += o.y;
  }
  const zoom = tr((k) => k.zoom);
  return { x: tr((k) => k.x) + sx / zoom, y: tr((k) => k.y) + sy / zoom, zoom, rot: tr((k) => k.rot ?? 0) };
}
