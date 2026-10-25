/**
 * SCENE 2 — THE SOLAR PROBLEM
 *
 *  A  wide 3-shot  Vicky strolls in waving: "अरे भाई! तो सोलर लगवा लो ना!" (points up — the sun)
 *  B  two-shot     Owner: "लाखों रुपये कहाँ से लाऊँ?" — palms up, then hands on his head
 *  C  wider        "ये बिल तो मेरी कुर्सी भी ले गया!" — points; the Bill waves back, smug
 *  —  silence      the Bill reclines, the throne creaks; Vicky smiles knowingly
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { camAt, type CamKey } from '../camera/Camera';
import { BASE_CHAIR } from '../environment/Chair';
import { type BillPose } from '../characters/Bill';
import { walkPose, type HumanPose } from '../characters/Human';
import { animatePose, blink, kf, type Key } from '../rig/keyframes';
import { mouthFor, resolveBeats, wordAt } from '../timeline/beats';
import { SCENE2_BEATS } from '../timeline/scenes2to5';
import { Soundtrack, type Sfx } from '../audio/Soundtrack';
import { ScratchOverlay } from './ScratchOverlay';
import { Stage } from './Stage';
import { BILL_BIG, CAST_S1_END, CHAIR_X, POS, applyTalk, billSeated } from './common';
import { BASE_HUMAN } from '../characters/Human';
import { FLOOR } from '../environment/Factory';

export const S2 = resolveBeats(SCENE2_BEATS);

export const Scene2Problem: React.FC<{ scratchOverlay?: boolean }> = ({ scratchOverlay = false }) => {
  const f = useCurrentFrame();
  const B = S2;
  const L4 = B.l4.line!;
  const L5 = B.l5.line!;
  const SM = B.smug.start;
  const END = B.__total.end;
  const w4 = (n: number) => wordAt(B.l4, n);
  const w5 = (n: number) => wordAt(B.l5, n);

  const cam = camAt(f, [
    { f: 0, x: 2330, y: 440, zoom: 0.86 },
    { f: L5.speechStart - 5, x: 2360, y: 440, zoom: 0.9, e: 'linear' },
    { f: L5.speechStart - 4, x: 2470, y: 470, zoom: 1.35, e: 'hold' }, // CUT → owner + Vicky
    { f: w5(5) - 3, x: 2480, y: 470, zoom: 1.4, e: 'linear' },
    { f: w5(5) - 2, x: 2140, y: 400, zoom: 1.0, e: 'hold' }, // CUT → owner + the Bill
    { f: SM, x: 2120, y: 400, zoom: 1.02, e: 'linear' },
    { f: END, x: 2060, y: 380, zoom: 1.1, e: 'inOut' },
  ] as CamKey[]);

  // -------------------------------------------------------------- Vicky
  const WALK_END = 40;
  const fKeys: Key<HumanPose>[] = [
    { f: 0, facing: -1, x: 3000, smile: 0.6, asym: 0.6, turn: 0.2, aLs: 10, aRs: 10 },
    // "अरे भाई!" — a big friendly wave while still walking in
    { f: w4(0) - 4, aRs: 10, aRe: -8, hR: 'relax' },
    { f: w4(0) + 2, aRs: 150, aRe: -24, hR: 'open', browL: 0.8, smile: 0.9, e: 'back' },
    { f: WALK_END, x: POS.friend, e: 'linear' },
    // "तो सोलर…" — stops, points up at the sun
    { f: w4(2) - 3, aRs: 150, aRe: -24, facing: -1, turn: 0.2 },
    { f: w4(3) + 2, facing: 1, turn: -0.4, lookX: -0.6, aRs: 165, aRe: 4, hR: 'point', aLs: 40, aLe: 30, hL: 'open', tilt: 6, browR: 0.8, browL: 0.2, e: 'back' },
    // "लगवा लो ना!" — "simple!" palms out
    { f: w4(4), aRs: 165, aLs: 40, tilt: 6 },
    { f: w4(4) + 6, aRs: 42, aRe: 32, hR: 'open', aLs: 42, aLe: 32, hL: 'open', tilt: -3, smile: 0.8, e: 'back' },
    { f: L4.speechEnd + 6, aRs: 12, aRe: -8, hR: 'relax', aLs: 30, aLe: -110, hL: 'fist', tilt: 0, e: 'inOut' }, // hand on hip
    // owner's rant: listens, amused
    { f: w5(2), turn: -0.5, lookX: -1, smile: 0.5 },
    { f: w5(5) + 4, turn: -0.8, lookX: -1, browL: 0.5, browR: 0.1 },
    // the silence: a knowing half-smile, one brow up
    { f: SM + 4, turn: -0.8, browR: 0.1, smile: 0.5, asym: 0.6 },
    { f: SM + 14, turn: 0.1, lookX: 0.3, browR: 1, browL: 0, smile: 0.7, asym: 1, squint: 0.3, e: 'back' },
  ];
  const friend = animatePose(f, { ...BASE_HUMAN, x: POS.friend, y: FLOOR }, fKeys);
  if (f < WALK_END) {
    const wp = walkPose(f / 7, 24, 7);
    Object.assign(friend, { lLh: wp.lLh, lRh: wp.lRh, lLk: wp.lLk, lRk: wp.lRk, crouch: wp.crouch, aLs: wp.aLs });
    if (f < w4(0)) friend.aRs = wp.aRs ?? friend.aRs;
  } else if (f < WALK_END + 6) {
    friend.crouch = kf(f, [[WALK_END, 6], [WALK_END + 6, 0, 'out']]); // settle into the stop
  }
  if (f >= w4(0) && f < w4(2)) friend.aRw = Math.sin(f * 0.9) * 22; // the wave

  // -------------------------------------------------------------- Owner
  const oKeys: Key<HumanPose>[] = [
    { f: 0, ...CAST_S1_END.owner },
    { f: w4(0) + 3, turn: 0.7, lookX: 1, browL: 0.8, browR: 0.8, browAng: 0, aLs: 8, aLe: -6, hL: 'relax', lean: 0, e: 'back' },
    { f: w4(4) + 2, turn: 0.7, browAng: 0, smile: 0 },
    { f: L4.speechEnd + 2, smile: -0.4, browAng: -0.6, tilt: 4, e: 'inOut' }, // "easy for you to say"
    // [sighs] … "लाखों रुपये" — palms up, pleading
    { f: L5.speechStart - 6, sy: 1, crouch: 0, aLs: 8, aRs: 38, aRe: -112 },
    { f: L5.speechStart - 1, sy: 0.96, crouch: 8, e: 'inOut' }, // the sigh
    { f: w5(0) + 3, sy: 1, crouch: 2, aLs: 50, aLe: 40, aLw: -20, hL: 'open', aRs: 50, aRe: 40, aRw: -20, hR: 'open', browAng: -1, browL: 0.8, browR: 0.8, smile: -0.6, turn: 0.6, e: 'back' },
    // "कहाँ से लाऊँ?" — hands on his head
    { f: w5(2) - 2, aLs: 50, aLe: 40, aRs: 50, aRe: 40, lean: 0 },
    { f: w5(2) + 5, aLs: 152, aLe: -138, aRs: 152, aRe: -138, hL: 'open', hR: 'open', lean: 3, tilt: 6, lid: 0.45, sweat: 1, e: 'back' },
    // "ये बिल" — points at the Bill
    { f: w5(5) - 3, aLs: 152, aLe: -138, aRs: 152, aRe: -138, lid: 0, tilt: 6, turn: 0.6 },
    { f: w5(5) + 3, aLs: 140, aLe: 2, aLw: -8, hL: 'point', aRs: 38, aRe: -112, hR: 'fist', turn: -0.7, lookX: -1, tilt: 0, lean: -5, browAng: 0.3, e: 'back' },
    // "मेरी कुर्सी भी ले गया!" — and deflates
    { f: w5(9), aLs: 140, crouch: 0, sy: 1 },
    { f: w5(11) + 4, aLs: 6, aLe: -4, hL: 'relax', aRs: 6, aRe: -4, hR: 'relax', crouch: 10, sy: 0.96, lean: 0, smile: -0.9, browAng: -1, tilt: -5, e: 'inOut' },
    { f: SM + 8, turn: 0.6, lookX: 1, tilt: -3 }, // looks to Vicky for help
  ];
  const owner = animatePose(f, { ...CAST_S1_END.owner }, oKeys);

  // -------------------------------------------------------------- Raju & Pappu (idle fear)
  const raju = animatePose(f, { ...CAST_S1_END.raju }, [
    { f: 0, crouch: 10 },
    { f: w4(1), turn: 0.6, lookX: 1, crouch: 6, lean: 4, e: 'inOut' },
    { f: w5(5), turn: -0.8, lookX: -1, e: 'inOut' },
  ]);
  raju.x += Math.sin(f * 1.6) * 1;
  const pappu = { ...CAST_S1_END.pappu };

  // -------------------------------------------------------------- the Bill
  const bKeys: Key<BillPose>[] = [
    { f: 0, turn: 0.4, lookX: 0.6 },
    { f: w4(0) + 4, turn: 0.7, lookX: 1, browR: 0.6, e: 'inOut' }, // who's this?
    { f: w4(3) + 2, browAng: 0.8, smile: 0.4, asym: 0.4 }, // "solar"?! a flicker of worry
    { f: L4.speechEnd + 4, browAng: 0.4, smile: 0.7, asym: 0.9 }, // …nah
    // owner points at him → a smug little wave
    { f: w5(5) + 2, aRa: 30, aRb: 0.4, hR: 'relax', turn: 0.5 },
    { f: w5(5) + 8, aRa: 150, aRb: -0.2, aRl: 175, hR: 'open', smile: 0.9, turn: 0.6, lookX: 0.8, e: 'back' },
    { f: w5(11) + 4, aRa: 150 },
    // the silence: reclines, arms behind the head, the throne creaks
    { f: SM, aLa: 30, aRa: 150, lean: -4 },
    { f: SM + 10, aLa: 205, aRa: 205, aLb: -1.6, aRb: -1.6, aLl: 190, aRl: 190, hL: 'flat', hR: 'flat', lean: -9, smile: 0.8, asym: 1, turn: 0.3, e: 'inOut' },
    { f: SM + 16, glint: 0 },
    { f: SM + 19, glint: 1, e: 'back' },
    { f: SM + 26, glint: 0, e: 'out' },
  ];
  const bill = animatePose(f, billSeated(BILL_BIG), bKeys);
  if (f >= w5(5) + 8 && f < SM) bill.aRw = Math.sin(f * 0.8) * 25;
  bill.stache = Math.sin(f / 7) * 0.3;
  const rock = f >= SM ? Math.sin((f - SM) / 4) * 2.2 : 0;
  bill.lean += rock;

  const mouths = { owner: mouthFor('owner', f, B), friend: mouthFor('friend', f, B), bill: mouthFor('bill', f, B) };
  applyTalk(owner, mouths.owner);
  applyTalk(friend, mouths.friend);

  return (
    <AbsoluteFill style={{ background: '#1a1410' }}>
      <Stage
        s={{
          frame: f,
          cam,
          lit: 0.8,
          running: 0,
          meterSpeed: 9,
          doorOpen: 1,
          doorRattle: 0,
          doorLight: 0,
          villainTint: 1,
          sunlight: 0,
          chair: { ...BASE_CHAIR, x: CHAIR_X, tilt: rock * 0.6 },
          people: { pappu, raju, owner, friend },
          bill: { p: bill, mode: 'seated', armsBehind: f >= SM + 5 },
          mouths,
          eyes: { owner: blink(f, 13, [L5.speechStart]), friend: blink(f, 5, [WALK_END + 2]), raju: blink(f, 7), pappu: blink(f, 21), bill: blink(f, 9) },
          crate: { x: POS.raju - 62, y: FLOOR - 70, r: 4 },
        }}
      />
      <Soundtrack beats={B} sfx={scene2Sfx()} music={[]} />
      {scratchOverlay && <ScratchOverlay beats={B} />}
    </AbsoluteFill>
  );
};

export function scene2Sfx(): Sfx[] {
  const B = S2;
  const SM = B.smug.start;
  const steps = [0, 7, 14, 21, 28, 35].map((t) => ({ src: 'snap_attention.wav', at: t, vol: 0.12 }));
  return [
    ...steps,
    { src: 'chair_squeak.wav', at: SM + 6, vol: 0.45, rate: 0.9 },
    { src: 'chair_squeak.wav', at: SM + 18, vol: 0.4, rate: 0.8 },
    { src: 'glint.wav', at: SM + 19, vol: 0.4 },
  ];
}
