/**
 * SCENE 3 — THE JIOURJA REVEAL
 *
 *  A  Vicky       "इसीलिए तो आया है..." (finger up, knowing) → "जियोऊर्जा टू पॉइंट ज़ीरो!"
 *                 — arms up, light bursts, the emblem pops, the villain grade lifts (music turns heroic)
 *  B  two-shot    Owner: "अच्छा! ये करेगा क्या?" — jolt, then hand-on-chin curiosity
 *  C  exterior    (Vicky, voice-over) "सोलर में निवेश करेगा रिलायंस!" — panels pop onto the roof;
 *                 "इंस्टॉलेशन और मेंटेनेंस भी वही संभालेगा!" — cable runs, a brush sweeps the array
 *  D  interior    "और योग्य कारखाने सिर्फ इस्तेमाल की हुई सोलर बिजली का भुगतान करेंगे!"
 *                 — sunlight floods in, the meter slows, and the Bill SHRINKS on the key words
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { World, Layer, camAt, type CamKey } from '../camera/Camera';
import { BASE_CHAIR } from '../environment/Chair';
import { Exterior, PANEL_COUNT } from '../environment/Exterior';
import { type BillPose } from '../characters/Bill';
import { BASE_HUMAN, type HumanPose } from '../characters/Human';
import { animatePose, blink, kf, type Key } from '../rig/keyframes';
import { mouthFor, resolveBeats, wordAt } from '../timeline/beats';
import { SCENE3_BEATS } from '../timeline/scenes2to5';
import { Soundtrack, type Sfx } from '../audio/Soundtrack';
import { ScratchOverlay } from './ScratchOverlay';
import { Stage } from './Stage';
import { BILL_BIG, CAST_S1_END, CHAIR_X, POS, applyTalk, billSeated, billSeatY, seatedLeg } from './common';
import { FLOOR } from '../environment/Factory';
import { SunEmblem, Wordmark } from '../brand/Logo';

export const S3 = resolveBeats(SCENE3_BEATS);
export const BILL_S3_END = 0.75;

export function scene3Timing() {
  const B = S3;
  const w6 = (n: number) => wordAt(B.l6, n);
  const w8 = (n: number) => wordAt(B.l8, n);
  return {
    B,
    REVEAL: w6(4), // "जियोऊर्जा"
    EXT: B.l8.line!.speechStart - 4, // cut outside
    INT: w8(11) - 3, // back inside for "और योग्य कारखाने…"
    SHRINKS: [w8(14), w8(15), w8(21)], // "सिर्फ" "इस्तेमाल" "भुगतान"
    w6,
    w8,
  };
}

/** Bill scale through Scene 3: big until the payment line, then deflating in steps. */
export function billScaleS3(f: number) {
  const { SHRINKS } = scene3Timing();
  return kf(f, [
    [SHRINKS[0] - 1, BILL_BIG],
    [SHRINKS[0] + 8, 1.12, 'back'],
    [SHRINKS[1] - 1, 1.12],
    [SHRINKS[1] + 8, 0.95, 'back'],
    [SHRINKS[2] - 1, 0.95],
    [SHRINKS[2] + 8, BILL_S3_END, 'back'],
  ]);
}

export const Scene3Reveal: React.FC<{ scratchOverlay?: boolean }> = ({ scratchOverlay = false }) => {
  const f = useCurrentFrame();
  const { B, REVEAL, EXT, INT, SHRINKS, w8 } = scene3Timing();
  const w6 = (n: number) => wordAt(B.l6, n);
  const w7 = (n: number) => wordAt(B.l7, n);
  const L6 = B.l6.line!;
  const L7 = B.l7.line!;
  const END = B.__total.end;

  // -------------------------------------------------------------- lighting turns
  const grade = kf(f, [[REVEAL - 1, 1], [REVEAL + 10, 0, 'out']]); // villain grade lifts
  const lit = kf(f, [[REVEAL - 1, 0.8], [REVEAL + 8, 1, 'out']]);
  const sun = kf(f, [[REVEAL, 0], [REVEAL + 6, 0.35, 'out'], [INT, 0.35], [INT + 20, 1, 'inOut']]);

  const cam = camAt(f, [
    { f: 0, x: 2600, y: 420, zoom: 1.45 },
    { f: REVEAL - 2, x: 2600, y: 410, zoom: 1.5, e: 'linear' },
    { f: REVEAL + 5, x: 2610, y: 380, zoom: 1.68, e: 'back' }, // punch-in on the name
    { f: L7.speechStart - 4, x: 2600, y: 385, zoom: 1.7, e: 'linear' },
    { f: L7.speechStart - 3, x: 2470, y: 470, zoom: 1.35, e: 'hold' }, // CUT → owner + Vicky
    { f: EXT - 1, x: 2480, y: 470, zoom: 1.4, e: 'linear' },
    { f: INT, x: 2150, y: 420, zoom: 0.92, e: 'hold' }, // CUT (back inside) → wide
    { f: END, x: 2080, y: 430, zoom: 1.0, e: 'inOut' },
  ] as CamKey[], [{ f: SHRINKS[0], s: 8 }, { f: SHRINKS[1], s: 8 }, { f: SHRINKS[2], s: 10 }]);

  // -------------------------------------------------------------- Vicky
  const fKeys: Key<HumanPose>[] = [
    { f: 0, aRs: 12, aRe: -8, aLs: 30, aLe: -110, hL: 'fist', smile: 0.7, asym: 1, browR: 1, turn: 0.1, lookX: 0.3 },
    // "इसीलिए तो आया है..." — a step in, finger up
    { f: w6(0) - 2, aRs: 12, aRe: -8, hR: 'relax', x: POS.friend },
    { f: w6(0) + 6, aRs: 30, aRe: -150, aRw: 10, hR: 'point', x: POS.friend - 25, lean: -3, tilt: 5, turn: -0.2, lookX: -0.4, e: 'back' },
    { f: w6(3), lean: -3, tilt: 5 },
    // "जियोऊर्जा टू पॉइंट ज़ीरो!" — ta-da!
    { f: REVEAL - 4, aRs: 30, aRe: -150, aLs: 30, aLe: -110, sy: 1, crouch: 0 },
    { f: REVEAL - 1, sy: 0.93, crouch: 8, e: 'out' }, // anticipation
    { f: REVEAL + 4, aRs: 150, aRe: 10, aLs: 62, aLe: 34, aLw: -20, hR: 'open', hL: 'open', sy: 1.06, crouch: -6, lean: 0, tilt: 0, smile: 1, squint: 0.3, turn: 0, lookX: 0, browL: 1, browR: 1, e: 'back' },
    { f: REVEAL + 12, sy: 1, crouch: 0, e: 'out' },
    { f: L6.speechEnd + 6, aRs: 150, aLs: 62 },
    { f: L6.speechEnd + 12, aRs: 12, aRe: -8, hR: 'relax', aLs: 12, aLe: -8, hL: 'relax', squint: 0, e: 'inOut' },
    // owner asks: turns to him with a grin
    { f: w7(0) + 2, turn: -0.7, lookX: -1, smile: 0.7 },
    // explaining (back inside): open palms, then one finger on "सिर्फ"
    { f: INT, turn: -0.5, lookX: -0.8, aLs: 40, aLe: 30, hL: 'open', aRs: 12, aRe: -8 },
    { f: SHRINKS[0] - 2, aRs: 12, aRe: -8, hR: 'relax' },
    { f: SHRINKS[0] + 3, aRs: 40, aRe: -140, hR: 'point', browR: 0.8, e: 'back' },
    { f: SHRINKS[2] - 3, aRs: 40, aRe: -140, aLs: 40, aLe: 30 },
    { f: SHRINKS[2] + 4, aRs: 48, aRe: 32, aRw: -20, hR: 'open', aLs: 48, aLe: 32, aLw: -20, hL: 'open', smile: 0.9, tilt: -4, e: 'back' },
  ];
  const friend = animatePose(f, { ...BASE_HUMAN, x: POS.friend, y: FLOOR, facing: 1 }, fKeys);

  // -------------------------------------------------------------- Owner
  const base = { ...CAST_S1_END.owner, aLs: 6, aLe: -4, hL: 'relax' as const, aRs: 6, aRe: -4, hR: 'relax' as const, crouch: 10, smile: -0.9, browAng: -1, tilt: -3, turn: 0.6, lookX: 1, lean: 0 };
  const oKeys: Key<HumanPose>[] = [
    { f: 0, ...base },
    { f: REVEAL, crouch: 10, jaw: 0, smile: -0.9, browAng: -1 },
    { f: REVEAL + 6, crouch: 0, jaw: 0.4, smile: 0, browAng: 0, browL: 1, browR: 1, sweat: 0.3, tilt: 0, e: 'back' }, // perks up
    // "अच्छा!" — jolt
    { f: w7(0) - 3, sy: 1, jaw: 0.3 },
    { f: w7(0) + 2, sy: 1.07, browL: 1.2, browR: 1.2, aLs: 30, aLe: -30, aRs: 30, aRe: -30, hL: 'open', hR: 'open', e: 'back' },
    // "ये करेगा क्या?" — hand on chin, leaning in
    { f: w7(1) - 2, sy: 1, aRs: 30, aRe: -30 },
    { f: w7(1) + 5, aRs: 28, aRe: -150, aRw: 20, hR: 'fist', aLs: 30, aLe: -112, hL: 'fist', lean: 7, tilt: 7, browL: 0.8, browR: 0.2, smile: 0.2, e: 'inOut' },
    // back inside: amazed as the Bill deflates
    { f: INT, lean: 2, tilt: 0, aRs: 8, aRe: -6, hR: 'relax', aLs: 8, aLe: -6, hL: 'relax', turn: -0.6, lookX: -1, jaw: 0.2, smile: 0.2 },
    { f: SHRINKS[1] + 6, jaw: 0.5, smile: 0.5, browL: 1, browR: 1, sweat: 0 },
    { f: SHRINKS[2] + 8, jaw: 0, smile: 0.9, squint: 0.3, aLs: 30, aLe: -112, hL: 'fist', aRs: 30, aRe: -112, hR: 'fist', e: 'back' }, // hands on hips, grinning
  ];
  const owner = animatePose(f, base, oKeys);

  const raju = animatePose(f, { ...CAST_S1_END.raju, turn: -0.8, crouch: 6 }, [
    { f: 0, crouch: 6, jaw: 0 },
    { f: REVEAL + 4, crouch: 0, turn: 0.6, lookX: 1, browL: 1, browR: 1, jaw: 0.4, sweat: 0.3, e: 'back' },
    { f: SHRINKS[1], turn: -0.8, lookX: -1, jaw: 0.4, smile: 0 },
    { f: SHRINKS[2] + 8, jaw: 0, smile: 0.8, aLs: 8, aLe: -6, aRs: 8, aRe: -6, lean: 0, tilt: 0, e: 'inOut' },
  ]);

  // -------------------------------------------------------------- the Bill
  const scale = billScaleS3(f);
  const LEG = seatedLeg(scale);
  const bKeys: Key<BillPose>[] = [
    { f: 0, aLa: 205, aRa: 205, aLb: -1.6, aRb: -1.6, aLl: 190, aRl: 190, hL: 'flat', hR: 'flat', lean: -9, smile: 0.8, asym: 1, turn: 0.3 },
    // the name lands: he sits up, worried
    { f: REVEAL + 2, lean: -9, smile: 0.8 },
    { f: REVEAL + 10, aLa: 30, aRa: 30, aLb: 0.4, aRb: 0.4, aLl: 185, aRl: 185, hL: 'relax', hR: 'relax', lean: 0, smile: 0, asym: 0.3, browAng: -0.2, turn: 0.6, lookX: 1, e: 'back' },
    { f: INT, browAng: -0.4, smile: -0.1, glasses: 0, sweat: 0.3 },
    { f: SHRINKS[0] + 6, browAng: -0.7, smile: -0.4, asym: 0, glasses: 0.3, sweat: 0.7, aLa: -20, aRa: -20, hL: 'fist', hR: 'fist' }, // clutching himself
    { f: SHRINKS[1] + 6, glasses: 0.55, browL: 0.6, browR: 0.6, smile: -0.6, lookX: 0.6, lookY: 0.4 },
    { f: SHRINKS[2] + 6, glasses: 0.75, browAng: -0.9, smile: -0.8, sweat: 1, lean: 3 },
  ];
  const bill = animatePose(f, billSeated(scale), bKeys);
  bill.scale = scale;
  bill.y = billSeatY(scale);
  bill.lLy = LEG;
  bill.lRy = LEG * 0.42;
  bill.stache = f > INT ? -0.6 + Math.sin(f / 3) * 0.2 : Math.sin(f / 7) * 0.3; // droops & trembles
  if (f > SHRINKS[0]) bill.x = CHAIR_X + Math.sin(f * 1.9) * 1.5; // trembling

  const mouths = { owner: mouthFor('owner', f, B), friend: mouthFor('friend', f, B), bill: mouthFor('bill', f, B) };
  applyTalk(owner, mouths.owner);
  applyTalk(friend, mouths.friend);

  const outside = f >= EXT && f < INT;
  const extCam = camAt(f, [
    { f: EXT, x: 1000, y: 470, zoom: 1.05 },
    { f: INT, x: 1060, y: 470, zoom: 1.18, e: 'linear' },
  ]);
  const panels = kf(f, [[w8(0), 0], [w8(4) + 12, PANEL_COUNT + 1, 'linear']]);

  return (
    <AbsoluteFill style={{ background: '#1a1410' }}>
      {outside ? (
        <World cam={extCam}>
          <Layer p={1}>
            <Exterior
              frame={f}
              panels={panels}
              cable={kf(f, [[w8(5), 0], [w8(7), 1, 'inOut']])}
              clean={kf(f, [[w8(7) - 4, 0], [w8(10) + 14, 1, 'inOut']])}
              flow={kf(f, [[w8(6), 0], [w8(7), 1]])}
              sun={kf(f, [[EXT, 0], [w8(4), 1, 'out']])}
            />
          </Layer>
        </World>
      ) : (
        <Stage
          s={{
            frame: f,
            cam,
            lit,
            running: 0,
            meterSpeed: kf(f, [[INT, 9], [SHRINKS[2] + 10, 0.6, 'out']]),
            doorOpen: 1,
            doorRattle: 0,
            doorLight: 0,
            villainTint: grade,
            sunlight: sun,
            chair: { ...BASE_CHAIR, x: CHAIR_X, squash: kf(f, [[SHRINKS[0], 0], [SHRINKS[0] + 3, -0.1], [SHRINKS[0] + 10, 0, 'elastic']]) },
            people: { owner, friend, raju, pappu: CAST_S1_END.pappu },
            bill: { p: bill, mode: 'seated', armsBehind: f < REVEAL + 6 },
            mouths,
            eyes: { owner: blink(f, 13, [REVEAL + 1]), friend: blink(f, 5), raju: blink(f, 7), pappu: blink(f, 21), bill: blink(f, 9) },
            crate: { x: POS.raju - 62, y: FLOOR - 70, r: 4 },
            world: <RevealBurst f={f - REVEAL} x={POS.friend - 10} y={FLOOR - 765} />,
          }}
        />
      )}
      <Soundtrack beats={B} sfx={scene3Sfx()} music={[]} />
      {scratchOverlay && <ScratchOverlay beats={B} />}
    </AbsoluteFill>
  );
};

/** The name lands: light rays + the emblem pop above Vicky's raised hands. */
const RevealBurst: React.FC<{ f: number; x: number; y: number }> = ({ f, x, y }) => {
  if (f < 0 || f > 60) return null;
  const pop = f < 8 ? 0.3 + (f / 8) * 0.9 : f < 14 ? 1.2 - ((f - 8) / 6) * 0.2 : 1;
  const out = f > 46 ? (60 - f) / 14 : 1;
  return (
    <g transform={`translate(${x} ${y})`} opacity={out}>
      <g transform={`rotate(${f * 1.5})`} opacity={0.55}>
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} d="M -18 0 L 0 -520 L 18 0 Z" fill="#FFE58A" transform={`rotate(${i * (360 / 14)})`} />
        ))}
      </g>
      <g transform={`scale(${pop * 0.75})`}>
        <SunEmblem r={80} spin={f * 2} />
        <g transform="translate(0 150)">
          <Wordmark size={70} />
        </g>
      </g>
    </g>
  );
};

export function scene3Sfx(): Sfx[] {
  const { REVEAL, EXT, INT, SHRINKS, w8 } = scene3Timing();
  const pops: Sfx[] = [];
  for (let i = 0; i < PANEL_COUNT; i += 3) {
    pops.push({ src: 'panel_pop.wav', at: Math.round(w8(0) + ((w8(4) + 12 - w8(0)) * i) / (PANEL_COUNT + 1)), vol: 0.35, rate: 0.9 + (i % 4) * 0.08 });
  }
  return [
    { src: 'sparkle.wav', at: REVEAL, vol: 0.6 },
    { src: 'whoosh.wav', at: REVEAL - 2, vol: 0.5 },
    { src: 'whoosh.wav', at: EXT - 2, vol: 0.4 },
    ...pops,
    { src: 'sparkle.wav', at: w8(7), vol: 0.35 },
    { src: 'whoosh.wav', at: INT - 2, vol: 0.4 },
    ...SHRINKS.map((s, i) => ({ src: 'shrink.wav', at: s, vol: 0.45 - i * 0.05, rate: 1 + i * 0.12 })),
  ];
}
