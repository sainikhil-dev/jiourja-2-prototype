/**
 * SCENE 5 — THE PUNCHLINE + BRAND
 *
 *  A  low      the tiny Bill, glasses slipped, wringing his gloves: "तो... मेरी कुर्सी?"
 *  B  same     Owner laughs, bends down, wags a finger: "अब अपनी कुर्सी ढूँढ!"
 *  —  roll     he shoves THE chair — it rolls away, spinning; the Bill reaches after it. Ba-dum-tss.
 *  C  group    Vicky to camera: "जियोऊर्जा टू पॉइंट ज़ीरो! छोटे कारोबारों की बड़ी ऊर्जा!"
 *              (the Bill tiptoes out of frame)
 *  D  end card JioUrja 2.0 — छोटे कारोबारों की बड़ी ऊर्जा! (after all dialogue)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { camAt, type CamKey } from '../camera/Camera';
import { BASE_CHAIR } from '../environment/Chair';
import { BASE_BILL, billWalk, type BillPose } from '../characters/Bill';
import { BASE_HUMAN, walkPose, type HumanPose } from '../characters/Human';
import { animatePose, blink, ease, type Key } from '../rig/keyframes';
import { isLaughing, mouthFor, resolveBeats, wordAt } from '../timeline/beats';
import { SCENE5_BEATS } from '../timeline/scenes2to5';
import { Soundtrack, type Sfx } from '../audio/Soundtrack';
import { ScratchOverlay } from './ScratchOverlay';
import { Stage } from './Stage';
import { CAST_S1_END, CHAIR_X, POS, applyTalk } from './common';
import { FLOOR } from '../environment/Factory';
import { BILL_SMALL, BILL_STAND_X } from './Scene4App';
import { SunEmblem, Wordmark } from '../brand/Logo';
import { FONT } from '../fonts';

export const S5 = resolveBeats(SCENE5_BEATS);

export function scene5Timing() {
  const B = S5;
  return { B, ROLL: B.roll.start, TAG: B.l13.line!, CARD: B.endcard.start, END: B.__total.end };
}

export const Scene5Punchline: React.FC<{ scratchOverlay?: boolean }> = ({ scratchOverlay = false }) => {
  const f = useCurrentFrame();
  const { B, ROLL, TAG, CARD } = scene5Timing();
  const w11 = (n: number) => wordAt(B.l11, n);
  const w12 = (n: number) => wordAt(B.l12, n);
  const w13 = (n: number) => wordAt(B.l13, n);
  const L12 = B.l12.line!;
  const OWNER_X = 2250;

  const cam = camAt(f, [
    { f: 0, x: 2040, y: 560, zoom: 1.25 },
    { f: L12.speechStart - 4, x: 2060, y: 550, zoom: 1.3, e: 'linear' },
    { f: ROLL + 4, x: 2040, y: 540, zoom: 1.2, e: 'inOut' },
    { f: B.l13.start, x: 1980, y: 540, zoom: 1.15, e: 'linear' },
    { f: B.l13.start + 1, x: 2330, y: 440, zoom: 0.98, e: 'hold' }, // CUT → group shot
    { f: CARD, x: 2340, y: 430, zoom: 1.04, e: 'linear' },
  ] as CamKey[]);

  // -------------------------------------------------------------- the tiny Bill
  const bKeys: Key<BillPose>[] = [
    { f: 0, glasses: 0.85, browAng: -0.9, browL: 0.5, browR: 0.5, smile: -0.4, sweat: 1, aLa: -35, aRa: -35, aLl: 150, aRl: 150, aLb: 0.5, aRb: 0.5, hL: 'fist', hR: 'fist', turn: 0.3, lookX: 0.6, lookY: -0.5 },
    // "तो..." — a hopeful look up at the boss
    { f: w11(0) - 2, turn: 0.3, lookY: -0.5 },
    { f: w11(0) + 4, turn: 0.6, lookX: 1, lookY: -0.8, smile: 0.2, browAng: -1, browL: 0.9, browR: 0.9, e: 'inOut' },
    // "मेरी कुर्सी?" — a timid point at the chair
    { f: w11(1) - 2, aLa: -35, hL: 'fist' },
    { f: w11(1) + 5, aLa: 80, aLb: 0.1, aLl: 175, hL: 'point', turn: -0.2, lookX: -0.8, lookY: 0, e: 'back' },
    { f: w11(2) + 6, turn: 0.6, lookX: 1, lookY: -0.8, smile: 0.4 },
    // the owner laughs at him: deflates
    { f: L12.speechStart, aLa: 80, smile: 0.4 },
    { f: L12.speechStart + 8, aLa: -35, hL: 'fist', smile: -0.6, browAng: -1, e: 'inOut' },
    // the chair rolls away — reaches after it
    { f: ROLL + 6, aLa: -35, aRa: -35 },
    { f: ROLL + 12, aLa: 95, aRa: 70, aLb: 0, aRb: 0.2, aLl: 185, aRl: 185, hL: 'open', hR: 'open', turn: -0.8, lookX: -1, jaw: 0.6, lean: 6, e: 'back' },
    { f: ROLL + 26, aLa: 8, aRa: 8, hL: 'relax', hR: 'relax', jaw: 0, lean: 0, turn: 0, lookX: 0, lookY: 0.2, smile: -0.9, e: 'inOut' }, // to camera, defeated
  ];
  const bill = animatePose(f, { ...BASE_BILL, x: BILL_STAND_X, y: FLOOR, scale: BILL_SMALL }, bKeys);
  bill.stache = -0.7 + Math.sin(f / 3) * 0.15;
  if (f < ROLL) bill.aLw = f < w11(1) ? Math.sin(f * 1.1) * 18 : 0; // wringing his gloves
  // during the tagline he tiptoes out of frame (left)
  const tiptoe = B.l13.start + 10;
  if (f >= tiptoe) {
    const t = (f - tiptoe) / 9;
    Object.assign(bill, billWalk(t, 30, 30));
    bill.facing = -1;
    bill.x = BILL_STAND_X - (f - tiptoe) * 6.5;
    bill.turn = -0.6;
    bill.lookX = 0.6; // glancing back at camera
    bill.aLa = 150;
    bill.aRa = 150;
    bill.hL = 'flat';
    bill.hR = 'flat';
  }

  // -------------------------------------------------------------- Owner
  const oBase = { ...CAST_S1_END.owner, x: POS.owner, aLs: 30, aLe: -112, hL: 'fist' as const, aRs: 60, aRe: -110, hR: 'thumb' as const, smile: 0.6, squint: 0.2, sweat: 0, browAng: 0, turn: -0.7, lookX: -1, lookY: 0.4, lean: 0, crouch: 0 };
  const oKeys: Key<HumanPose>[] = [
    { f: 0, ...oBase },
    { f: 8, aRs: 30, aRe: -112, hR: 'fist', e: 'inOut' },
    { f: w11(1) + 2, browR: 0.9, browL: 0.1, smile: 0.4 }, // "your chair?" one brow up
    // [laughs] then leans down and wags a finger: "अब अपनी कुर्सी ढूँढ!"
    { f: L12.speechStart, lean: 0, crouch: 0, smile: 0.5 },
    { f: L12.speechStart + 6, lean: 3, smile: 1, squint: 0.7, e: 'out' },
    { f: w12(0) - 3, lean: 3, crouch: 0, x: POS.owner, aRs: 30, aRe: -112 },
    { f: w12(0) + 6, x: OWNER_X, lean: -10, crouch: 10, aRs: 30, aRe: -112, aLs: 70, aLe: -40, aLw: 0, hL: 'point', squint: 0.3, smile: 0.8, asym: 0.5, browR: 0.8, lookY: 0.7, e: 'inOut' },
    { f: L12.speechEnd + 2, aLs: 70, lean: -10 },
    // the shove
    { f: ROLL + 2, aLs: 70, aLe: -40, hL: 'point', lean: -10, crouch: 10, turn: -0.7 },
    { f: ROLL + 6, aLs: 20, aLe: -60, hL: 'open', lean: 4, crouch: 6, turn: -0.9, lookX: -1, lookY: 0, e: 'anticipate' },
    { f: ROLL + 10, aLs: 100, aLe: 0, aLw: -30, hL: 'open', lean: -8, crouch: 2, e: 'back' }, // PUSH
    { f: ROLL + 24, aLs: 30, aLe: -112, hL: 'fist', aRs: 30, aRe: -112, hR: 'fist', lean: 0, crouch: 0, turn: -0.3, lookX: -0.4, smile: 1, squint: 0.5, e: 'inOut' }, // hands on hips, pleased
    // tagline: thumbs up to camera
    { f: B.l13.start, x: OWNER_X, turn: 0, lookX: 0, lookY: 0 },
    { f: w13(0) + 4, aRs: 60, aRe: -110, hR: 'thumb', turn: 0.1, lookX: 0.1, smile: 1, e: 'back' },
  ];
  const owner = animatePose(f, oBase, oKeys);
  const ownerLaugh = isLaughing('owner', f, B);
  if (ownerLaugh) {
    owner.nod += Math.abs(Math.sin(f * 0.95)) * 7;
    owner.tilt += Math.sin(f * 0.95) * 3;
    owner.squint = 0.8;
  }
  if (f >= w12(3) && f < L12.speechEnd + 2) owner.aLw = Math.sin(f * 1.3) * 25; // the wagging finger

  // -------------------------------------------------------------- the chair rolls away
  const push = ROLL + 10;
  const rollT = Math.max(0, f - push);
  const chairX = f < push ? CHAIR_X : CHAIR_X - (1 - Math.exp(-rollT / 18)) * 1100;
  const chair = { ...BASE_CHAIR, x: chairX, spin: f < push ? 0 : rollT / 16, roll: rollT * 0.6, tilt: f < push ? 0 : Math.sin(rollT / 3) * 3 };

  // -------------------------------------------------------------- Vicky + Raju
  const fBase = { ...BASE_HUMAN, x: POS.friend, y: FLOOR, smile: 0.9, squint: 0.3, turn: -0.6, lookX: -1, aLs: 12, aLe: -8, aRs: 12, aRe: -8 };
  const fKeys: Key<HumanPose>[] = [
    { f: 0, ...fBase },
    { f: w12(3), smile: 0.9 },
    { f: ROLL + 12, turn: -0.9, lookX: -1, smile: 1, jaw: 0.3, e: 'out' },
    // "जियोऊर्जा टू पॉइंट ज़ीरो!" — to camera, thumbs up
    { f: TAG.speechStart - 4, jaw: 0, turn: 0, lookX: 0, aRs: 12, aRe: -8, hR: 'relax', aLs: 12 },
    { f: w13(0) + 4, aRs: 62, aRe: -112, hR: 'thumb', smile: 1, browL: 0.8, browR: 0.8, e: 'back' },
    // "छोटे कारोबारों की बड़ी ऊर्जा!" — arms wide
    { f: w13(4) - 2, aRs: 62, aRe: -112, aLs: 12 },
    { f: w13(4) + 6, aRs: 135, aRe: 10, hR: 'open', aLs: 135, aLe: 10, hL: 'open', sy: 1.04, e: 'back' },
    { f: w13(7), sy: 1 },
  ];
  const friend = animatePose(f, fBase, fKeys);

  const rKeys: Key<HumanPose>[] = [
    { f: 0, smile: 0.8, aLs: 8, aLe: -6, aRs: 8, aRe: -6, hL: 'relax', hR: 'relax', turn: -0.7, lookX: -1, crouch: 0, lean: 0, tilt: 0 },
    { f: ROLL + 12, smile: 1, jaw: 0.5, squint: 0.4 },
    // he scoots into the group shot and cheers on the tagline
    { f: B.l13.start, x: POS.raju, jaw: 0 },
    { f: B.l13.start + 16, x: 2470, turn: 0, lookX: 0, e: 'inOut' },
    { f: w13(4) + 4, aLs: 150, aLe: -20, aRs: 150, aRe: -20, hL: 'fist', hR: 'fist', sy: 1.06, smile: 1, squint: 0.4, e: 'back' },
  ];
  const raju = animatePose(f, { ...CAST_S1_END.raju, sweat: 0, browAng: 0 }, rKeys);
  if (f >= B.l13.start && f < B.l13.start + 16) Object.assign(raju, walkPose((f - B.l13.start) / 6, 20, 5));

  const mouths = { owner: mouthFor('owner', f, B), friend: mouthFor('friend', f, B), bill: mouthFor('bill', f, B) };
  applyTalk(owner, mouths.owner);
  applyTalk(friend, mouths.friend);

  if (f >= CARD) return <EndCard t={f - CARD} />;

  return (
    <AbsoluteFill style={{ background: '#1a1410' }}>
      <Stage
        s={{
          frame: f,
          cam,
          lit: 1,
          running: f >= B.l13.start ? 1 : 0, // the factory hums again
          meterSpeed: 0.6,
          doorOpen: 1,
          doorRattle: 0,
          doorLight: 0,
          villainTint: 0,
          sunlight: 1,
          chair,
          people: { owner, friend, raju, pappu: { ...CAST_S1_END.pappu, sweat: 0, browAng: 0, smile: 0.8 } },
          bill: { p: bill, mode: 'standing' },
          mouths,
          eyes: { owner: blink(f, 13), friend: blink(f, 5), raju: blink(f, 7), pappu: blink(f, 21), bill: blink(f, 9, [ROLL + 26]) },
          crate: { x: POS.raju - 62, y: FLOOR - 70, r: 4 },
        }}
      />
      <Soundtrack beats={B} sfx={scene5Sfx()} music={[]} />
      {scratchOverlay && <ScratchOverlay beats={B} />}
    </AbsoluteFill>
  );
};

/** Brand reveal. Starts only after every spoken line has finished. */
export const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const k = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const pop = ease('back', k(0, 14));
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 42%, #FFE9A8 0%, #FFC14A 38%, #F08A24 100%)' }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <g transform={`translate(960 330) scale(${pop})`}>
          <SunEmblem r={150} spin={t * 0.8} />
        </g>
        <g transform={`translate(960 ${650 + (1 - ease('out', k(6, 18))) * 40})`} opacity={k(6, 14)}>
          <Wordmark size={150} />
        </g>
        <text x={960} y={775} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={74} fill="#5A1A1D" opacity={k(16, 26)}>
          छोटे कारोबारों की बड़ी ऊर्जा!
        </text>
        <text x={960} y={850} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={38} fill="#2A1A14" opacity={k(26, 36)}>
          Intelligent Energy-as-a-Service for India's MSMEs
        </text>
        <text x={960} y={1040} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={22} fill="#2A1A14" opacity={0.8 * k(30, 40)}>
          Proposed concept. Eligibility and savings depend on customer and site economics. The shrinking bill is a metaphor for lower costs, not a zero DISCOM bill.
        </text>
      </svg>
    </AbsoluteFill>
  );
};

export function scene5Sfx(): Sfx[] {
  const { ROLL, CARD, B } = scene5Timing();
  const tiptoe = B.l13.start + 10;
  return [
    { src: 'chair_roll.wav', at: ROLL + 10, vol: 0.7, dur: 50 },
    { src: 'whoosh.wav', at: ROLL + 8, vol: 0.5 },
    { src: 'comic_sting.wav', at: ROLL + 24, vol: 0.7, dur: 48 },
    ...[0, 9, 18, 27].map((d) => ({ src: 'phone_tap.wav', at: tiptoe + d, vol: 0.25, rate: 0.7 })), // tiptoes
    { src: 'sparkle.wav', at: CARD, vol: 0.5 },
  ];
}
