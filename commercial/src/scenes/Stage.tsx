/**
 * The factory stage: renders the one continuous set and the whole cast from
 * per-frame state. Every interior shot of the film goes through here, so
 * geography, lighting and character designs stay identical across scenes.
 */
import React from 'react';
import { World, Layer, type Cam } from '../camera/Camera';
import { BackWall, Crates, DoorLight, DoorOutside, Drill, Desk, Floor, Lathe, Press, Roof, RollerDoor, FLOOR } from '../environment/Factory';
import { ChairBack, ChairFront, type ChairState } from '../environment/Chair';
import { Owner } from '../characters/Owner';
import { Friend } from '../characters/Friend';
import { Raju, Pappu } from '../characters/Workers';
import { Bill, BASE_BILL, type BillPose } from '../characters/Bill';
import type { HumanPose } from '../characters/Human';
import type { Viseme } from '../audio/visemes';

export type Who = 'owner' | 'friend' | 'raju' | 'pappu' | 'bill';

export type BillState = {
  p: BillPose;
  mode: 'door' | 'standing' | 'seated';
  silhouette?: number;
  spinK?: number;
  armsBehind?: boolean;
};

export type StageState = {
  frame: number;
  cam: Cam;
  lit: number; // 1 normal … 0 dark
  running: number; // machines on/off
  meterSpeed: number;
  doorOpen: number;
  doorRattle: number;
  doorLight: number;
  villainTint: number; // 0..1 reddish grade while the Bill rules
  sunlight: number; // 0..1 warm solar light through the windows
  chair: ChairState;
  people: Partial<Record<Exclude<Who, 'bill'>, HumanPose>>;
  bill?: BillState;
  mouths: Partial<Record<Who, Viseme>>;
  eyes: Partial<Record<Who, number>>;
  crate?: { x: number; y: number; r: number };
  wallShadow?: { x: number; opacity: number };
  /** world-space extras drawn above the cast (props in hands, graphics in the set) */
  world?: React.ReactNode;
  /** screen-space extras drawn above the lighting (UI, graphics) */
  screen?: React.ReactNode;
};

const Glint: React.FC<{ x: number; y: number; s: number; frame: number }> = ({ x, y, s, frame }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${frame * 6})`}>
    <path d="M 0 -26 L 5 -5 L 26 0 L 5 5 L 0 26 L -5 5 L -26 0 L -5 -5 Z" fill="#fff" stroke="#FFF3B0" strokeWidth={2} />
  </g>
);

export const Stage: React.FC<{ s: StageState }> = ({ s }) => {
  const f = s.frame;
  const b = s.bill;
  const bv = s.mouths.bill ?? 'X';
  const be = s.eyes.bill ?? 1;
  const P = s.people;
  const billAt = (mode: BillState['mode']) => b && b.mode === mode;
  const people = (
    <>
      {P.pappu && <Pappu p={P.pappu} viseme={s.mouths.pappu ?? 'X'} open={s.eyes.pappu ?? 1} frame={f} />}
      {P.raju && <Raju p={P.raju} viseme={s.mouths.raju ?? 'X'} open={s.eyes.raju ?? 1} frame={f} />}
      {s.crate && (
          <g transform={`translate(${s.crate.x} ${s.crate.y}) rotate(${s.crate.r})`}>
            <rect x={-70} y={-55} width={140} height={110} fill="#C9954F" stroke="#2A1A14" strokeWidth={5} />
            <path d="M -70 -55 L 70 55 M 70 -55 L -70 55" stroke="#A0733A" strokeWidth={7} />
          </g>
        )}
      {P.owner && <Owner p={P.owner} viseme={s.mouths.owner ?? 'X'} open={s.eyes.owner ?? 1} frame={f} />}
      {P.friend && <Friend p={P.friend} viseme={s.mouths.friend ?? 'X'} open={s.eyes.friend ?? 1} frame={f} />}
    </>
  );
  return (
    <World cam={s.cam}>
      <defs>
        <filter id="silhouette" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0 0.06  0 0 0 1 0" />
        </filter>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id="sunGrade" x1="0" x2="0.4" y1="0" y2="1">
          <stop offset="0" stopColor="#FFE7A0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFB347" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Layer p={0.8}>
        <BackWall frame={f} meterSpeed={s.meterSpeed} />
        {s.wallShadow && s.wallShadow.opacity > 0.01 && (
          <g opacity={s.wallShadow.opacity} filter="url(#silhouette)">
            <Bill
              p={{ ...BASE_BILL, x: s.wallShadow.x, y: FLOOR + 120, scale: 1.75, turn: 0.5, aLa: 12, aLl: 125, aLb: -0.95, aRa: 12, aRl: 125, aRb: -0.95 }}
              viseme="X"
              open={1}
              frame={f}
            />
          </g>
        )}
        {s.sunlight > 0.01 &&
          // god-rays from the clerestory windows
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <path
              key={i}
              d={`M ${-300 + i * 460} -160 l 300 0 l ${520} 1200 l -300 0 Z`}
              fill="#FFF1B8"
              opacity={0.16 * s.sunlight}
              style={{ mixBlendMode: 'screen' }}
            />
          ))}
      </Layer>
      <Layer p={0.88}>
        <Roof frame={f} lightsOn={s.lit} />
      </Layer>
      <Layer p={1}>
        <Floor />
        <DoorOutside />
        {billAt('door') && (
          <g>
            <Bill p={b!.p} viseme={bv} open={be} frame={f} />
            <g opacity={b!.silhouette ?? 0} filter="url(#silhouette)">
              <Bill p={{ ...b!.p, glint: 0 }} viseme={bv} open={1} frame={f} />
            </g>
            {b!.p.glint > 0.01 && <Glint x={b!.p.x + (-80 + b!.p.turn * 22) * b!.p.scale} y={b!.p.y - 554 * b!.p.scale} s={b!.p.glint * 2.8} frame={f} />}
          </g>
        )}
        <RollerDoor open={s.doorOpen} frame={f} rattle={s.doorRattle} />
        <DoorLight amount={s.doorLight} />
        <Lathe frame={f} running={s.running} x={850} />
        <Press frame={f} running={s.running} x={1230} />
        <Desk x={2300} frame={f} />
        <Crates x={2660} />
        <Drill x={2950} frame={f} running={s.running} />
        <ChairBack c={s.chair} />
        {!billAt('seated') && <ChairFront c={s.chair} />}
        {!billAt('seated') && people}
        {billAt('standing') && <Bill p={b!.p} viseme={bv} open={be} frame={f} spinK={b!.spinK} armsBehind={b!.armsBehind} />}
        {billAt('seated') && (
          <>
            <Bill p={b!.p} viseme={bv} open={be} frame={f} spinK={b!.spinK} armsBehind={b!.armsBehind} part="body" />
            <ChairFront c={s.chair} />
            <Bill p={b!.p} viseme={bv} open={1} frame={f} spinK={b!.spinK} part="legs" shadow={false} />
            {/* the cast stands beside (and in front of) the throne */}
            {people}
          </>
        )}
        {s.world}
      </Layer>
      {/* lighting & grade */}
      <rect x={0} y={0} width={1920} height={1080} fill="#0B0710" opacity={(1 - s.lit) * 0.62} />
      {s.villainTint > 0.01 && <rect x={0} y={0} width={1920} height={1080} fill="#5A1030" opacity={0.08 * s.villainTint} style={{ mixBlendMode: 'multiply' }} />}
      {s.sunlight > 0.01 && <rect x={0} y={0} width={1920} height={1080} fill="url(#sunGrade)" opacity={s.sunlight} style={{ mixBlendMode: 'screen' }} />}
      <rect x={0} y={0} width={1920} height={1080} fill="url(#vignette)" />
      {s.screen}
    </World>
  );
};
