/**
 * SCENE 4 — HOW IT WORKS
 *
 *  A  two-shot   Owner: "वाह! लेकिन शुरू कैसे करूँ?" — claps, then leans in eager
 *  B  3-shot     Vicky pulls out his phone; the magnified app steps with his words:
 *                "बिजली का बिल अपलोड करो!" → upload · "एआई से सही सिस्टम चुनो।" → AI sizing ·
 *                "साइट और क्रेडिट चेक करवाओ..." → checks · "और फिर लगवाओ सोलर!" → install → monitoring
 *                The Bill peeks at the phone and shrinks on every tick.
 *  C  slide      Too small for the throne now, he slips off and lands beside it.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { camAt, type Cam, type CamKey } from '../camera/Camera';
import { BASE_CHAIR } from '../environment/Chair';
import { BASE_BILL, type BillPose } from '../characters/Bill';
import { BASE_HUMAN, handWorld, type HumanPose } from '../characters/Human';
import { FRIEND } from '../characters/Friend';
import { animatePose, blink, kf, type Key } from '../rig/keyframes';
import { mouthFor, resolveBeats, wordAt } from '../timeline/beats';
import { SCENE4_BEATS } from '../timeline/scenes2to5';
import { Soundtrack, type Sfx } from '../audio/Soundtrack';
import { ScratchOverlay } from './ScratchOverlay';
import { Stage } from './Stage';
import { CAST_S1_END, CHAIR_X, POS, applyTalk, billSeated, billSeatY, seatedLeg } from './common';
import { FLOOR } from '../environment/Factory';
import { PhoneApp, PhoneProp } from '../brand/PhoneApp';
import { BILL_S3_END } from './Scene3Reveal';

export const S4 = resolveBeats(SCENE4_BEATS);
export const BILL_SMALL = 0.46;
export const BILL_STAND_X = 2010;

export function scene4Timing() {
  const B = S4;
  const w10 = (n: number) => wordAt(B.l10, n);
  const STEPS = [w10(0) - 2, w10(5) - 2, w10(10) - 2, w10(15) - 2, w10(18) + 14];
  return { B, w10, STEPS, SLIDE: B.slide.start, END: B.__total.end };
}

const toScreen = (cam: Cam, x: number, y: number) => ({ x: 960 + (x - cam.x) * cam.zoom, y: 540 + (y - cam.y) * cam.zoom });

export const Scene4App: React.FC<{ scratchOverlay?: boolean }> = ({ scratchOverlay = false }) => {
  const f = useCurrentFrame();
  const { B, STEPS, SLIDE, END } = scene4Timing();
  const w9 = (n: number) => wordAt(B.l9, n);
  const L9 = B.l9.line!;
  const L10 = B.l10.line!;
  const PHONE_UP = L10.speechStart - 8;

  const cam = camAt(f, [
    { f: 0, x: 2470, y: 470, zoom: 1.35 },
    { f: L9.speechEnd + 2, x: 2480, y: 470, zoom: 1.38, e: 'linear' },
    { f: L9.speechEnd + 3, x: 2250, y: 440, zoom: 1.05, e: 'hold' }, // CUT → phone 3-shot
    { f: SLIDE - 1, x: 2230, y: 440, zoom: 1.08, e: 'linear' },
    { f: SLIDE, x: 2000, y: 540, zoom: 1.2, e: 'hold' }, // CUT → low on the throne
    { f: END, x: 1990, y: 560, zoom: 1.25, e: 'inOut' },
  ] as CamKey[]);

  // -------------------------------------------------------------- Owner
  const base = { ...CAST_S1_END.owner, aLs: 30, aLe: -112, hL: 'fist' as const, aRs: 30, aRe: -112, hR: 'fist' as const, smile: 0.9, squint: 0.3, sweat: 0, browAng: 0, turn: -0.6, lookX: -1, lean: 0, crouch: 0 };
  const oKeys: Key<HumanPose>[] = [
    { f: 0, ...base },
    // "वाह!" — clap
    { f: w9(0) - 4, aLs: 30, aLe: -112, aRs: 30, aRe: -112, turn: -0.6 },
    { f: w9(0) + 2, aLs: 14, aLe: -112, aRs: 14, aRe: -112, hL: 'flat', hR: 'flat', turn: 0.6, lookX: 1, smile: 1, browL: 1, browR: 1, sy: 1.05, e: 'back' },
    // "लेकिन शुरू कैसे करूँ?" — eager, palms open, leaning to Vicky
    { f: w9(1) - 2, sy: 1, aLs: 14, aRs: 14 },
    { f: w9(1) + 5, aLs: 44, aLe: 34, aLw: -20, hL: 'open', aRs: 44, aRe: 34, aRw: -20, hR: 'open', lean: 6, tilt: 6, smile: 0.4, squint: 0, browAng: -0.3, browL: 0.8, browR: 0.8, e: 'inOut' },
    // watching the phone: nods along
    { f: PHONE_UP, aLs: 44, aRs: 44, lean: 6 },
    { f: PHONE_UP + 8, aLs: 30, aLe: -112, hL: 'fist', aRs: 26, aRe: -150, aRw: 20, hR: 'fist', lean: 8, tilt: 4, turn: 0.75, lookX: 1, lookY: 0.4, smile: 0.5, e: 'inOut' }, // hand on chin
    ...STEPS.slice(0, 4).flatMap((s, i) => [
      { f: s + 4, nod: 0 },
      { f: s + 8, nod: 7, smile: 0.5 + i * 0.12, e: 'out' as const },
      { f: s + 14, nod: 0, e: 'inOut' as const },
    ]),
    // the end: thumbs up
    { f: STEPS[4] - 6, aRs: 26, aRe: -150, aRw: 20, hR: 'fist', lean: 8, tilt: 4 },
    { f: STEPS[4], aRs: 60, aRe: -110, aRw: 0, hR: 'thumb', lean: 0, tilt: 0, smile: 1, squint: 0.5, lookY: 0, e: 'back' },
    // the Bill slips off — they both look
    { f: SLIDE + 6, turn: -0.7, lookX: -1, lookY: 0.4, jaw: 0, smile: 0.6 },
  ];
  const owner = animatePose(f, base, oKeys);

  // -------------------------------------------------------------- Vicky (with the phone)
  const fBase = { ...BASE_HUMAN, x: POS.friend, y: FLOOR, aLs: 48, aLe: 32, hL: 'open' as const, aRs: 48, aRe: 32, hR: 'open' as const, smile: 0.9, turn: -0.5, lookX: -0.8 };
  const taps = STEPS.slice(0, 4);
  const fKeys: Key<HumanPose>[] = [
    { f: 0, ...fBase },
    { f: L9.speechStart, aLs: 12, aLe: -8, hL: 'relax', aRs: 12, aRe: -8, hR: 'relax', tilt: 0 },
    { f: w9(1), turn: -0.7, lookX: -1, smile: 0.6, browR: 0.6 },
    // pulls the phone out and holds it up for the owner
    { f: PHONE_UP - 6, aRs: 12, aRe: -8, hR: 'relax', browR: 0.6 },
    { f: PHONE_UP, aRs: 34, aRe: -128, aRw: 0, hR: 'hold', turn: -0.4, lookX: -0.6, lookY: 0.3, smile: 0.8, e: 'back' },
    // a finger tap on each step
    ...taps.flatMap((s) => [
      { f: s - 6, aLs: 12, aLe: -8, hL: 'relax' as const },
      { f: s - 1, aLs: 30, aLe: -118, aLw: 0, hL: 'point' as const, e: 'out' as const },
      { f: s + 6, aLs: 18, aLe: -40, hL: 'relax' as const, e: 'inOut' as const },
    ]),
    { f: STEPS[4], smile: 1, squint: 0.4, turn: -0.2, lookX: 0 },
    { f: SLIDE + 6, turn: -0.7, lookX: -1, lookY: 0.4 },
  ];
  const friend = animatePose(f, fBase, fKeys);
  const hand = handWorld(FRIEND, friend, 1, 30);
  const phoneVisible = f >= PHONE_UP - 2;

  // -------------------------------------------------------------- Raju
  const raju = animatePose(f, { ...CAST_S1_END.raju, crouch: 0, smile: 0.8, aLs: 8, aLe: -6, aRs: 8, aRe: -6, hL: 'relax' as const, hR: 'relax' as const, lean: 0, tilt: 0, sweat: 0, turn: 0.6, lookX: 1 }, [
    { f: PHONE_UP, turn: 0.6, lookX: 1, lean: 0 },
    { f: PHONE_UP + 10, lean: 6, tilt: 5, e: 'inOut' }, // peeks at the phone too
    { f: SLIDE + 6, turn: -0.8, lookX: -1, lean: 0, tilt: 0 },
  ]);

  // -------------------------------------------------------------- the Bill
  const scale = kf(f, [
    [STEPS[2] + 6, BILL_S3_END],
    [STEPS[2] + 14, 0.62, 'back'],
    [STEPS[3] + 6, 0.62],
    [STEPS[3] + 14, 0.52, 'back'],
    [SLIDE + 2, 0.52],
    [SLIDE + 12, BILL_SMALL, 'out'],
  ]);
  const seated = f < SLIDE + 6;
  const bKeys: Key<BillPose>[] = [
    { f: 0, aLa: -20, aRa: -20, hL: 'fist', hR: 'fist', glasses: 0.75, browAng: -0.9, smile: -0.8, sweat: 1, lean: 3, turn: 0.6, lookX: 0.6, lookY: 0.4 },
    { f: PHONE_UP + 6, turn: 0.8, lookX: 1, lookY: 0, browL: 0.8, browR: 0.8, e: 'inOut' }, // peeks at the phone
    { f: STEPS[0] + 6, browL: 1.2, browR: 1.2, smile: -1, jaw: 0.3 }, // "upload the BILL" — that's me!
    { f: STEPS[2] + 10, aLa: -20, aRa: -20 },
    { f: STEPS[2] + 14, aLa: 120, aRa: 120, aLb: -0.2, aRb: -0.2, hL: 'open', hR: 'open', jaw: 0.5, e: 'back' }, // yelp
    { f: STEPS[3] - 2, aLa: -30, aRa: -30, hL: 'fist', hR: 'fist', jaw: 0.1 },
  ];
  let bill = animatePose(f, billSeated(BILL_S3_END, { aLl: 185, aRl: 185, aLb: 0.4, aRb: 0.4 }), bKeys);
  bill.scale = scale;
  if (seated) {
    bill.y = billSeatY(scale);
    bill.lLy = seatedLeg(scale);
    bill.lRy = seatedLeg(scale) * 0.42;
    bill.x = CHAIR_X + Math.sin(f * 1.9) * 1.5;
  } else {
    // slips off the cushion and lands standing beside the chair
    const t = Math.min(1, (f - SLIDE - 6) / 14);
    bill = {
      ...BASE_BILL,
      x: CHAIR_X + (BILL_STAND_X - CHAIR_X) * t,
      y: billSeatY(scale) + (FLOOR - billSeatY(scale)) * Math.min(1, t * t * 1.6),
      scale,
      sy: t > 0.85 ? 0.85 + (1 - t) : 1,
      glasses: 0.85,
      browAng: -0.9,
      browL: 0.5,
      browR: 0.5,
      smile: -0.7,
      sweat: 1,
      aLa: 60 * (1 - t) + 20,
      aRa: 60 * (1 - t) + 20,
      hL: 'open',
      hR: 'open',
      turn: 0.3,
      lookX: 0.5,
      lookY: -0.5,
    };
  }
  bill.stache = -0.6 + Math.sin(f / 3) * 0.2;

  const mouths = { owner: mouthFor('owner', f, B), friend: mouthFor('friend', f, B), bill: mouthFor('bill', f, B) };
  applyTalk(owner, mouths.owner);
  applyTalk(friend, mouths.friend);

  // -------------------------------------------------------------- the app
  let step = -1;
  for (let i = 0; i < STEPS.length; i++) if (f >= STEPS[i]) step = i;
  const appIn = kf(f, [[PHONE_UP + 2, 0], [PHONE_UP + 10, 1, 'back'], [SLIDE - 6, 1], [SLIDE, 0, 'in']]);
  const ph = toScreen(cam, hand.x, hand.y);

  return (
    <AbsoluteFill style={{ background: '#1a1410' }}>
      <Stage
        s={{
          frame: f,
          cam,
          lit: 1,
          running: 0,
          meterSpeed: 0.6,
          doorOpen: 1,
          doorRattle: 0,
          doorLight: 0,
          villainTint: 0,
          sunlight: 1,
          chair: { ...BASE_CHAIR, x: CHAIR_X, squash: kf(f, [[SLIDE + 6, 0], [SLIDE + 9, -0.15], [SLIDE + 18, 0, 'elastic']]) },
          people: { owner, friend, raju, pappu: CAST_S1_END.pappu },
          bill: { p: bill, mode: seated ? 'seated' : 'standing' },
          mouths,
          eyes: { owner: blink(f, 13), friend: blink(f, 5), raju: blink(f, 7), pappu: blink(f, 21), bill: blink(f, 9) },
          crate: { x: POS.raju - 62, y: FLOOR - 70, r: 4 },
          world: phoneVisible ? <PhoneProp x={hand.x} y={hand.y} angle={hand.angle - 180} s={0.95} /> : null,
          screen:
            step >= 0 && appIn > 0.01 ? (
              <g>
                {/* magnifier beam from the phone in his hand to the big screen */}
                <path
                  d={`M ${ph.x - 18} ${ph.y - 40} L 1452 150 L 1452 ${150 + 760 * 0.92} L ${ph.x - 18} ${ph.y + 40} Z`}
                  fill="#FFFFFF"
                  opacity={0.14 * appIn}
                />
                <PhoneApp step={step} t={f - STEPS[step]} x={1470} y={150 + (1 - appIn) * 60} scale={0.92} opacity={appIn} />
              </g>
            ) : null,
        }}
      />
      <Soundtrack beats={B} sfx={scene4Sfx()} music={[]} />
      {scratchOverlay && <ScratchOverlay beats={B} />}
    </AbsoluteFill>
  );
};

export function scene4Sfx(): Sfx[] {
  const { STEPS, SLIDE, B } = scene4Timing();
  const PHONE_UP = B.l10.line!.speechStart - 8;
  return [
    { src: 'whoosh.wav', at: PHONE_UP - 2, vol: 0.35 },
    ...STEPS.slice(0, 4).map((s) => ({ src: 'phone_tap.wav', at: s, vol: 0.6 })),
    { src: 'chime.wav', at: STEPS[0] + 34, vol: 0.4 },
    { src: 'chime.wav', at: STEPS[2] + 12, vol: 0.4 },
    { src: 'shrink.wav', at: STEPS[2] + 6, vol: 0.4, rate: 1.3 },
    { src: 'shrink.wav', at: STEPS[3] + 6, vol: 0.4, rate: 1.45 },
    { src: 'chime.wav', at: STEPS[4], vol: 0.45 },
    { src: 'whoosh.wav', at: SLIDE + 5, vol: 0.4 },
    { src: 'cushion_plop.wav', at: SLIDE + 18, vol: 0.4 },
  ];
}
