/**
 * SCENE 1 — THE ELECTRICITY BILL ENTERS
 *
 *  A  wide      factory hums; Raju carries a crate; Pappu on the lathe; Khurana ji content
 *  —            lights flicker, machines die, every head turns to the shutter
 *  B  door      shutter rattles… SLAMS up (DUN!) → silhouette → sunglasses glint (DUN!)
 *  C  wide/low  BOOM — the Bill steps in (DUNNN!); everyone snaps to attention, crate drops
 *  D  chair     he strolls to THE chair, hops, plops, spins, crosses his legs. Glint.
 *  E  two-shot  Owner: "अरे! मेरी कुर्सी पर ये कौन बैठ गया?"
 *  F  close     Bill: [laughs] "मैं हूँ... बिजली का बिल! मशीनें तुम्हारी... मेहनत तुम्हारी...
 *               लेकिन कमाई मेरी!" — and on "मेरी!" he GROWS. ₹8–14/unit slams in.
 *  G  wide      Owner: "ये बिजली का बिल है... या वसूली गैंग?" Workers swap terrified looks.
 *
 * Gestures are keyed to measured word times (wordAt), mouths to the aligned
 * phones (mouthFor), so the acting follows the recorded voice.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { camAt, type CamKey } from '../camera/Camera';
import { FLOOR } from '../environment/Factory';
import { BASE_CHAIR, type ChairState } from '../environment/Chair';
import { BASE_BILL, billWalk, type BillPose } from '../characters/Bill';
import { BASE_HUMAN, walkPose, type HumanPose } from '../characters/Human';
import { animatePose, blink, kf, type Key } from '../rig/keyframes';
import { isLaughing, mouthFor, resolveBeats, wordAt, type Resolved } from '../timeline/beats';
import { SCENE1_BEATS } from '../timeline/scene1';
import { Soundtrack, type Sfx, type MusicCue } from '../audio/Soundtrack';
import { ScratchOverlay } from './ScratchOverlay';
import { Stage } from './Stage';
import { BILL_BIG, BILL_SCALE, CHAIR_X, POS, applyTalk, billSeatY, lightsOn, seatedLeg } from './common';
import { FONT } from '../fonts';
import { loadFonts } from '../fonts';

loadFonts();

export const S1 = resolveBeats(SCENE1_BEATS);
const STEP = 14; // frames per Bill footstep
const STRIDE = 46;
const BILL_SPEED = (2 * STRIDE * BILL_SCALE) / STEP;

export function scene1Timing(B: Resolved) {
  const L2 = B.l2;
  return {
    PD: B.powerDown.start,
    RT: B.rattle.start,
    BU: B.burst.start,
    ST: B.steps.start,
    SIT: B.sit.start,
    L1: B.l1.line!,
    L2: L2.line!,
    L3: B.l3.line!,
    GROW: wordAt(L2, 11), // "मेरी!"
    END: B.__total.end,
  };
}

/** Bill's scale through the scene (he grows on "…कमाई मेरी!"). */
export const billScaleS1 = (f: number, B: Resolved) => {
  const { GROW } = scene1Timing(B);
  return kf(f, [[GROW - 2, BILL_SCALE], [GROW + 9, BILL_BIG, 'back']]);
};

/** Final state of the scene, handed to Scene 2 for continuity. */
export const S1_END = { billScale: BILL_BIG };

export const TariffStamp: React.FC<{ t: number }> = ({ t }) => {
  // t: frames since it slammed in
  if (t < 0 || t > 36) return null;
  const s = t < 5 ? 1.8 - (t / 5) * 0.8 : 1;
  const o = t > 28 ? (36 - t) / 8 : 1;
  return (
    <g transform={`translate(1430 300) rotate(-9) scale(${s})`} opacity={o}>
      <rect x={-250} y={-92} width={500} height={184} rx={18} fill="#FFF7E6" stroke="#C62828" strokeWidth={12} />
      <text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={96} fill="#C62828">
        ₹8–14
      </text>
      <text x={0} y={72} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={36} fill="#C62828">
        प्रति यूनिट
      </text>
      <text x={0} y={128} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill="#FFF7E6" stroke="#2A1A14" strokeWidth={5} paintOrder="stroke">
        illustrative commercial tariff range
      </text>
    </g>
  );
};

export const Scene1Boss: React.FC<{ scratchOverlay?: boolean; withMusic?: boolean }> = ({ scratchOverlay = false, withMusic = true }) => {
  const f = useCurrentFrame();
  const B = S1;
  const { PD, RT, BU, ST, SIT, L1, L2, L3, GROW, END } = scene1Timing(B);
  const w1 = (n: number) => wordAt(B.l1, n);
  const w2 = (n: number) => wordAt(B.l2, n);
  const w3 = (n: number) => wordAt(B.l3, n);
  const booms = [ST, ST + STEP, SIT + 6];

  // -------------------------------------------------------------- camera
  const camKeys: CamKey[] = [
    { f: 0, x: 1360, y: 500, zoom: 0.8 },
    { f: RT - 1, x: 1400, y: 500, zoom: 0.84, e: 'linear' },
    { f: RT, x: 340, y: 460, zoom: 1.0, e: 'hold' }, // CUT → door
    { f: ST - 1, x: 330, y: 470, zoom: 1.12, e: 'inOut' },
    { f: ST, x: 1150, y: 500, zoom: 0.78, e: 'hold' }, // CUT → wide low
    { f: SIT - 1, x: 1220, y: 500, zoom: 0.8, e: 'linear' },
    { f: SIT, x: 2030, y: 440, zoom: 0.84, e: 'hold' }, // CUT → the chair
    { f: L1.speechStart - 3, x: 2010, y: 450, zoom: 0.9, e: 'inOut' },
    { f: L1.speechStart - 2, x: 2120, y: 400, zoom: 1.04, e: 'hold' }, // CUT → two-shot (owner + Bill)
    { f: L1.speechEnd, x: 2140, y: 400, zoom: 1.08, e: 'linear' },
    { f: L1.speechEnd + 1, x: 1880, y: 290, zoom: 1.42, e: 'hold' }, // CUT → Bill close-up
    { f: GROW - 5, x: 1890, y: 300, zoom: 1.5, e: 'linear' },
    { f: GROW - 4, x: 2060, y: 350, zoom: 0.88, e: 'hold' }, // CUT → medium wide: watch him grow
    { f: L3.speechStart - 4, x: 2070, y: 400, zoom: 0.95, e: 'out' },
    { f: L3.speechStart - 3, x: 1650, y: 470, zoom: 0.8, e: 'hold' }, // CUT → wide reaction
    { f: END, x: 1700, y: 470, zoom: 0.86, e: 'inOut' },
  ];
  const cam = camAt(
    f,
    camKeys,
    booms.map((b, i) => ({ f: b, s: i === 0 ? 26 : 14, d: 16 })).concat([{ f: BU, s: 12, d: 10 }, { f: SIT + 27, s: 9, d: 10 }, { f: GROW, s: 16, d: 16 }]),
  );

  // -------------------------------------------------------------- Bill
  let billX = POS.door;
  let walkPh: number | null = null;
  if (f >= ST && f < SIT) {
    walkPh = (f - ST) / STEP;
    billX = POS.door + (f - ST) * BILL_SPEED;
  } else if (f >= SIT) {
    const t = Math.min(f - SIT, 12);
    walkPh = f - SIT < 12 ? 0.5 + t / 12 : null;
    billX = CHAIR_X - 110 + (t / 12) * 110;
  }
  const scale = billScaleS1(f, B);
  const seatY = billSeatY(scale);
  const LEG = seatedLeg(scale);
  const laughing = isLaughing('bill', f, B);
  const billKeys: Key<BillPose>[] = [
    // in the doorway: arms akimbo, chest out
    { f: 0, aLa: 12, aLl: 125, aLb: -0.95, aRa: 12, aRl: 125, aRb: -0.95, hL: 'fist', hR: 'fist', lean: -2, smile: 0.35, asym: 0.6, browAng: 0.5, turn: 0.1 },
    { f: BU + 13, turn: 0.1, browR: 0, glint: 0 },
    { f: BU + 15, turn: 0.35, browR: 0.8, glint: 1, smile: 0.55, e: 'back' }, // DUN #2: the glint
    { f: BU + 24, glint: 0, e: 'out' },
    { f: ST - 2, aLa: 12, aLl: 125, aLb: -0.95, aRa: 12, aRl: 125, aRb: -0.95, browR: 0.5 },
    { f: ST, aLl: 185, aRl: 185, hL: 'relax', hR: 'relax', turn: 0.45, smile: 0.5, asym: 0.8, e: 'out' },
    // the chair
    { f: SIT, turn: 0.6, smile: 0.45, asym: 0.7, browAng: 0.5, y: FLOOR, sy: 1, bodyY: 0, aLa: 22, aRa: 22, aLb: 0.3, aRb: 0.3 },
    { f: SIT + 16, turn: 0, lookX: 0, browR: 0.9, e: 'back' }, // turns to camera, "watch this"
    { f: SIT + 20, sy: 0.86, sx: 1.06, bodyY: -12, aLa: 50, aRa: 50, aLb: -0.4, aRb: -0.4, lLx: -20, lLy: 140, lRx: 20, lRy: 140, e: 'out' }, // anticipation
    { f: SIT + 26, y: seatY - 70, sy: 1.1, sx: 0.94, bodyY: 0, aLa: 95, aRa: 95, lLx: 30, lLy: 120, lRx: 40, lRy: 110, lLk: 0.5, lRk: 0.5, e: 'out' }, // hop
    { f: SIT + 29, y: seatY, sy: 0.8, sx: 1.14, aLa: 40, aRa: 40, lLx: -40, lLy: LEG, lRx: 40, lRy: LEG, lLk: -0.25, lRk: 0.25, e: 'in' }, // PLOP
    { f: SIT + 37, sy: 1, sx: 1, e: 'elastic' },
    // spin, then the boss pose: legs crossed, arms behind the head
    { f: SIT + 38, aLa: 40, aRa: 40, aLb: 0.3, aRb: 0.3, lRx: 40, lRy: LEG, lRk: 0.25, lean: 0 },
    { f: SIT + 46, aLa: 205, aRa: 205, aLb: -1.6, aRb: -1.6, aLl: 190, aRl: 190, hL: 'flat', hR: 'flat', lRx: -170, lRy: LEG * 0.42, lRk: 0.7, lean: -5, smile: 0.7, asym: 0.9, browAng: 0.35, e: 'back' },
    { f: SIT + 47, glint: 0 },
    { f: SIT + 49, glint: 1, e: 'back' },
    { f: SIT + 58, glint: 0, e: 'out' },
    // owner asks who he is: smug side-eye, one brow up
    { f: L1.speechStart, turn: 0, lookX: 0, browR: 0.9, browL: 0 },
    { f: L1.speechStart + 8, turn: 0.5, lookX: 0.8, browR: 1, browL: -0.2, smile: 0.8, e: 'inOut' },
    { f: L2.speechStart - 1, aLa: 205, aRa: 205, aLb: -1.6, aRb: -1.6, aLl: 190, aRl: 190, lean: -5, turn: 0.5 },
    // [laughs]: head back, arms swing out from behind the head
    { f: L2.speechStart + 6, aLa: 70, aRa: 70, aLb: -0.6, aRb: -0.6, aLl: 185, aRl: 185, hL: 'open', hR: 'open', lean: -9, turn: 0.1, lookX: 0, lookY: -0.6, e: 'out' },
    // "मैं हूँ..." — thumb to his own chest
    { f: w2(0) - 3, aRa: 70, aRb: -0.6, hR: 'open', lean: -9, lookY: -0.6 },
    { f: w2(0) + 2, aRa: -48, aRl: 150, aRb: 0.6, aRw: 10, hR: 'thumb', lean: -3, lookY: 0, smile: 0.6, browAng: 0.6, e: 'back' },
    // "बिजली का बिल!" — presents himself, arms wide, glint on "बिल"
    { f: w2(2) - 2, aLa: 70, aRa: -48, aRl: 150 },
    { f: w2(2) + 4, aLa: 120, aRa: 120, aLb: -0.2, aRb: -0.2, aRl: 185, aRw: 0, hL: 'open', hR: 'open', lean: -6, turn: 0, smile: 0.9, e: 'back' },
    { f: w2(4) - 1, glint: 0 },
    { f: w2(4) + 2, glint: 1, e: 'back' },
    { f: w2(4) + 12, glint: 0, e: 'out' },
    // "मशीनें तुम्हारी..." — points at the machines (screen-left)
    { f: w2(5) - 3, aLa: 120, aRa: 120, turn: 0, lookX: 0 },
    { f: w2(5) + 3, aLa: 96, aLb: 0.05, aLw: 0, hL: 'point', aRa: 30, aRb: 0.3, hR: 'relax', turn: -0.6, lookX: -1, lean: -2, e: 'back' },
    // "मेहनत तुम्हारी..." — points at the owner (screen-right)
    { f: w2(7) - 3, aLa: 96, aRa: 30, turn: -0.6, lookX: -1 },
    { f: w2(7) + 3, aRa: 96, aRb: 0.05, hR: 'point', aLa: 30, aLb: 0.3, hL: 'relax', turn: 0.6, lookX: 1, e: 'back' },
    // "लेकिन कमाई..." — rubs his fingers, money gesture, leaning in
    { f: w2(9) - 3, aRa: 96, aLa: 30, turn: 0.6, lean: -2 },
    { f: w2(9) + 4, aLa: -30, aRa: -30, aLl: 150, aRl: 150, aLb: 0.5, aRb: 0.5, hL: 'fist', hR: 'fist', turn: 0, lookX: 0, lean: 4, browAng: 0.9, smile: 0.5, e: 'out' },
    // "मेरी!" — thumbs to chest, and he GROWS
    { f: GROW - 2, aLa: -30, aRa: -30, lean: 4 },
    { f: GROW + 4, aLa: -50, aRa: -50, aLl: 150, aRl: 150, aLb: 0.6, aRb: 0.6, hL: 'thumb', hR: 'thumb', lean: -7, smile: 1, asym: 1, browAng: 0.3, browL: 0.8, browR: 0.8, e: 'back' },
    { f: GROW + 9, glint: 0 },
    { f: GROW + 12, glint: 1, e: 'back' },
    { f: GROW + 22, glint: 0, e: 'out' },
    // owner's outburst: smug, arms back behind the head is not needed — arms folded on the paper
    { f: L3.speechStart - 4, aLa: -50, aRa: -50, lean: -7, turn: 0 },
    { f: L3.speechStart + 6, aLa: 30, aRa: 30, aLl: 185, aRl: 185, aLb: 0.4, aRb: 0.4, hL: 'relax', hR: 'relax', lean: -4, turn: 0.4, lookX: 0.6, smile: 0.7, e: 'inOut' },
    { f: w3(6), browR: 1, glint: 0 },
    { f: w3(6) + 3, glint: 0.9, e: 'back' },
    { f: w3(6) + 14, glint: 0, e: 'out' },
  ];
  let billP = animatePose(f, { ...BASE_BILL, x: billX, y: FLOOR, scale: BILL_SCALE }, billKeys);
  if (walkPh !== null) {
    const w = billWalk(walkPh, STRIDE);
    billP = { ...billP, ...w, aLa: (w.aLa ?? 0) + 4, aRa: (w.aRa ?? 0) + 4 };
  }
  billP.x = billX;
  billP.scale = scale;
  if (f >= SIT + 29) {
    billP.y = seatY;
    if (billP.lLy > 200) billP.lLy = LEG;
  }
  billP.stache = Math.sin(f / 7) * 0.3;
  if (laughing) {
    // laugh: shoulders bounce, head tips back on each "ha"
    billP.bodyY += Math.abs(Math.sin(f * 0.9)) * 10;
    billP.lean += Math.sin(f * 0.9) * 2;
    billP.smile = 1;
  }
  if (f >= L2.speechStart && f < GROW) billP.bend = Math.sin(f / 6) * 0.15;
  const spinT = kf(f, [[SIT + 37, 0], [SIT + 47, 1, 'inOut']]);
  const chair: ChairState = {
    ...BASE_CHAIR,
    x: CHAIR_X,
    spin: spinT,
    squash: kf(f, [[SIT + 27, 0], [SIT + 29, 1, 'in'], [SIT + 39, 0, 'elastic'], [GROW, 0], [GROW + 4, 0.7, 'in'], [GROW + 14, 0.25, 'elastic']]),
    roll: spinT * 3,
  };
  const billMode = f < BU ? null : f < ST ? 'door' : f >= SIT + 29 ? 'seated' : 'standing';
  const armsBehind = (f >= SIT + 42 && f < L2.speechStart + 3) || false;

  // -------------------------------------------------------------- Pappu (lathe)
  const pKeys: Key<HumanPose>[] = [
    { f: 0, facing: -1, turn: 0.5, lookX: 0.4, lookY: 0.4, aLs: 30, aLe: -60, aRs: 34, aRe: -70, smile: 0.3 },
    { f: PD, lookY: 0.4, turn: 0.5 },
    { f: PD + 3, lookY: -1, lookX: 0, turn: 0, browL: 0.7, browR: 0.7, smile: -0.1, e: 'out' },
    { f: PD + 9, turn: 0.9, lookX: 1, lookY: 0, browAng: -0.4, e: 'back' },
    { f: ST - 1, sy: 1, crouch: 0, aRs: 34, aRe: -70, hR: 'relax', jaw: 0 },
    { f: ST + 2, sy: 0.9, crouch: 10, e: 'out' },
    { f: ST + 6, sy: 1.08, crouch: -4, aRs: 112, aRe: -128, hR: 'flat', aLs: 5, aLe: 0, hL: 'flat', lean: -3, jaw: 0.35, sweat: 0.7, browL: 1, browR: 1, e: 'back' }, // SALUTE
    { f: ST + 12, sy: 1.02, crouch: 0, e: 'out' },
    // the owner complains → Pappu and Raju swap terrified looks
    { f: w3(4), turn: 0.9, lookX: 1, jaw: 0.35, aRs: 112, aRe: -128, sweat: 0.7 },
    { f: w3(5) + 2, turn: -0.9, lookX: -1, jaw: 0.6, aRs: 6, aRe: -4, hR: 'relax', sweat: 1, browAng: -0.8, e: 'back' },
    { f: w3(7) + 4, nod: 0, lid: 0 },
    { f: w3(7) + 8, nod: 8, lid: 0.4, e: 'in' }, // gulp
    { f: w3(7) + 12, nod: 0, lid: 0, e: 'out' },
  ];
  const pappu = animatePose(f, { ...BASE_HUMAN, x: POS.pappu, y: FLOOR }, pKeys);
  if (f < PD) pappu.aRe = -70 + Math.sin(f / 4) * 14; // cranking the carriage wheel
  if (f > ST + 12) pappu.x += Math.sin(f * 1.7) * 1.2; // trembling at attention

  // -------------------------------------------------------------- Raju
  const crateDrop = ST + 3;
  const rKeys: Key<HumanPose>[] = [
    { f: 0, x: POS.raju - 300, aLs: 22, aLe: -84, aRs: 22, aRe: -84, hL: 'hold', hR: 'hold', smile: 0.3, turn: 0.3, lean: 3 },
    { f: PD, x: POS.raju - 70, e: 'linear' },
    { f: PD + 3, lookY: -1, turn: 0, browL: 0.6, browR: 0.6, smile: 0, e: 'out' },
    { f: PD + 11, turn: -1, lookX: -1, lookY: 0, browAng: -0.5, e: 'back' },
    { f: crateDrop - 1, aLs: 22, aLe: -84, aRs: 22, aRe: -84, sy: 1, crouch: 0 },
    { f: crateDrop + 1, sy: 0.9, crouch: 10, e: 'out' },
    { f: crateDrop + 5, aLs: 3, aLe: 0, aRs: 3, aRe: 0, hL: 'flat', hR: 'flat', sy: 1.1, crouch: -6, lean: 0, turn: -0.2, lookX: -0.4, jaw: 0.2, browL: 1, browR: 1, browAng: -0.6, e: 'back' },
    { f: crateDrop + 12, sy: 1.03, crouch: 0, e: 'out' },
    // the Bill comes for the chair: Raju scoots behind the boss
    { f: SIT, x: POS.raju - 70, lean: -6, turn: -0.7, lookX: -1, tilt: 3, crouch: 2, aLs: 3, aLe: 0, aRs: 6, aRe: -4, hL: 'flat', hR: 'relax' },
    { f: SIT + 12, x: POS.raju, lean: 10, tilt: 6, aLs: 55, aLe: -95, aRs: 60, aRe: -100, hL: 'open', hR: 'open', crouch: 8, e: 'back' },
    { f: SIT + 27, sy: 1.0 },
    { f: SIT + 29, sy: 0.9, e: 'out' },
    { f: SIT + 35, sy: 1.0, e: 'elastic' },
    { f: GROW, sweat: 0.4, jaw: 0, crouch: 8 },
    { f: GROW + 6, sweat: 1, jaw: 0.5, crouch: 14, sy: 0.95, e: 'back' },
    // swaps terrified looks with Pappu
    { f: w3(4), turn: -0.7, lookX: -1 },
    { f: w3(5) + 4, turn: -1, lookX: -1, jaw: 0.6, browAng: -0.8, e: 'back' },
    { f: w3(7) + 6, nod: 0, lid: 0 },
    { f: w3(7) + 10, nod: 8, lid: 0.4, e: 'in' },
    { f: w3(7) + 14, nod: 0, lid: 0, e: 'out' },
  ];
  const raju = animatePose(f, { ...BASE_HUMAN, x: POS.raju, y: FLOOR }, rKeys);
  if (f < PD) Object.assign(raju, walkPose(f / 8, 22, 6), { aLs: 22, aLe: -84, aRs: 22, aRe: -84, lean: 3 });
  const crateX = POS.raju - 62;
  const crate = {
    x: kf(f, [[0, POS.raju - 292], [PD, crateX, 'linear']]),
    y: f < crateDrop ? FLOOR - 215 + raju.crouch : kf(f, [[crateDrop, FLOOR - 215], [crateDrop + 7, FLOOR - 70, 'in'], [crateDrop + 11, FLOOR - 105, 'out'], [crateDrop + 15, FLOOR - 70, 'in']]),
    r: f < crateDrop ? 0 : kf(f, [[crateDrop, 0], [crateDrop + 7, 14, 'in'], [crateDrop + 15, 4, 'out']]),
  };
  if (f >= SIT + 37 && f < SIT + 50) raju.turn = -0.7 - Math.sin(spinT * Math.PI * 2) * 0.6; // eyes follow the spin

  // -------------------------------------------------------------- Owner
  const oKeys: Key<HumanPose>[] = [
    { f: 0, aLs: 38, aLe: -112, aRs: 38, aRe: -112, hL: 'fist', hR: 'fist', smile: 0.55, squint: 0.25, turn: -0.4, lookX: -0.6 },
    { f: PD, smile: 0.55, squint: 0.25, lookY: 0 },
    { f: PD + 4, smile: 0, squint: 0, lookY: -1, turn: -0.1, browL: 0.6, browR: 0.6, e: 'out' },
    { f: PD + 12, turn: -0.8, lookX: -1, lookY: 0, browAng: -0.4, smile: -0.2, e: 'back' },
    { f: ST - 1, aLs: 38, aLe: -112, aRs: 38, aRe: -112, sy: 1, hL: 'fist', hR: 'fist' },
    { f: ST + 3, sy: 0.92, crouch: 6, e: 'out' },
    { f: ST + 8, sy: 1.06, crouch: -3, aLs: 5, aLe: 0, aRs: 5, aRe: 0, hL: 'flat', hR: 'flat', jaw: 0.4, browL: 1, browR: 1, browAng: -0.7, e: 'back' }, // attention!
    { f: ST + 14, sy: 1.02, crouch: 0, e: 'out' },
    { f: SIT, turn: -0.8, lookX: -1, sweat: 0.6, jaw: 0.2 },
    { f: SIT + 27, sy: 1 },
    { f: SIT + 29, sy: 0.92, lid: 0.8, e: 'out' },
    { f: SIT + 35, sy: 1, lid: 0, e: 'elastic' },
    // "अरे!" — jolts upright
    { f: w1(0) - 3, sy: 1, crouch: 0, aLs: 5, aLe: 0, aRs: 5, aRe: 0, jaw: 0.2, browAng: -0.6 },
    { f: w1(0) + 2, sy: 1.08, crouch: -8, aLs: 118, aLe: -74, aRs: 118, aRe: -74, hL: 'open', hR: 'open', browL: 1.2, browR: 1.2, browAng: -0.3, turn: -0.6, lookX: -1, e: 'back' },
    // "मेरी कुर्सी पर..." — points at the intruder, indignant
    { f: w1(1) - 2, aLs: 118, aLe: -74, aRs: 118, aRe: -74, sy: 1.03 },
    { f: w1(1) + 4, aLs: 142, aLe: 2, aLw: -8, hL: 'point', aRs: 38, aRe: -112, hR: 'fist', sy: 1, crouch: 0, lean: -4, browAng: 0.55, browL: 0.4, browR: 0.4, e: 'back' },
    { f: w1(5), lean: -4, tilt: 0 },
    { f: w1(5) + 4, lean: -7, tilt: -5, e: 'out' }, // "कौन" — leans in
    { f: L1.speechEnd + 2, lean: -7, aLs: 142 },
    // Bill laughs: owner recoils
    { f: L2.speechStart + 2, lean: 2, tilt: 0, aLs: 40, aLe: -60, hL: 'open', browAng: -0.6, jaw: 0.2, e: 'out' },
    { f: w2(5) + 2, turn: -0.9, lookX: -1 },
    { f: w2(7) + 2, turn: -0.5, lookX: -0.6, browAng: -0.8, sweat: 0.8 },
    { f: GROW, crouch: 0, sweat: 0.8, jaw: 0.1 },
    { f: GROW + 6, crouch: 10, sy: 0.95, sweat: 1, jaw: 0.5, browL: 1, browR: 1, aLs: 30, aLe: -110, aRs: 30, aRe: -110, hL: 'fist', hR: 'fist', e: 'back' },
    // "ये बिजली का बिल है..." — palms up, appealing to everyone
    { f: L3.speechStart - 3, crouch: 10, sy: 0.95, jaw: 0.5, aLs: 30, aRs: 30 },
    { f: L3.speechStart + 4, crouch: 0, sy: 1, jaw: 0, aLs: 46, aLe: 34, aRs: 46, aRe: 34, aLw: -20, aRw: -20, hL: 'open', hR: 'open', turn: -0.15, lookX: -0.2, browAng: -0.9, browL: 0.9, browR: 0.9, smile: -0.4, lean: 2, e: 'back' },
    { f: w3(4), tilt: 0, aLs: 46, aLe: 34 },
    { f: w3(4) + 5, tilt: -6, e: 'out' },
    // "या वसूली गैंग?" — jabs a finger at the Bill
    { f: w3(5) - 2, aLs: 46, aLe: 34, aRs: 46, aRe: 34, turn: -0.15 },
    { f: w3(5) + 4, aLs: 138, aLe: 2, aLw: -8, hL: 'point', aRs: 38, aRe: -112, hR: 'fist', turn: -0.7, lookX: -1, browAng: 0.7, browL: 0.2, browR: 0.2, lean: -5, tilt: 0, smile: -0.6, e: 'back' },
    { f: w3(7), lean: -5 },
    { f: w3(7) + 4, lean: -8, e: 'out' },
  ];
  const owner = animatePose(f, { ...BASE_HUMAN, x: POS.owner, y: FLOOR }, oKeys);
  if (f < PD) owner.nod = Math.max(0, Math.sin(((f - 9) / 36) * Math.PI * 2)) * 4; // nods along with the press
  if (f >= SIT + 37 && f < SIT + 50) owner.turn = -0.8 - Math.sin(spinT * Math.PI * 2) * 0.5;
  if (f >= w1(5) && f < L1.speechEnd) owner.aLs += Math.sin(f * 1.4) * 3; // the accusing finger shakes

  // -------------------------------------------------------------- mouths
  const mouths = { owner: mouthFor('owner', f, B), raju: mouthFor('raju', f, B), pappu: mouthFor('pappu', f, B), bill: mouthFor('bill', f, B) };
  applyTalk(owner, mouths.owner);

  return (
    <AbsoluteFill style={{ background: '#1a1410' }}>
      <Stage
        s={{
          frame: f,
          cam,
          lit: lightsOn(f, PD, BU),
          running: f < PD + 4 ? 1 : 0,
          meterSpeed: f < PD ? 1 : f < ST ? 0.2 : f < GROW ? 4 : 9,
          doorOpen: kf(f, [[BU, 0], [BU + 7, 1, 'in']]),
          doorRattle: f >= RT && f < BU ? 1 : 0,
          doorLight: f >= BU && f < SIT ? kf(f, [[BU, 0], [BU + 6, 1]]) : 0,
          villainTint: f >= BU ? 1 : 0,
          sunlight: 0,
          chair,
          people: { pappu, raju, owner },
          bill: billMode ? { p: billP, mode: billMode, silhouette: f < ST ? 1 : kf(f, [[ST, 1], [ST + 14, 0, 'out']]), spinK: Math.cos(spinT * Math.PI * 2), armsBehind } : undefined,
          mouths,
          eyes: {
            owner: blink(f, 3, [PD + 12, L2.speechStart]),
            raju: blink(f, 7, [PD + 10]),
            pappu: blink(f, 21),
            bill: blink(f, 9),
          },
          crate,
          screen: <TariffStamp t={f - GROW - 2} />,
        }}
      />
      <Soundtrack beats={B} sfx={scene1Sfx(B, booms)} music={withMusic ? scene1Music(B) : []} />
      {scratchOverlay && <ScratchOverlay beats={B} />}
    </AbsoluteFill>
  );
};

export function scene1Sfx(B: Resolved, booms = [B.steps.start, B.steps.start + STEP, B.sit.start + 6]): Sfx[] {
  const { PD, RT, BU, ST, SIT, GROW } = scene1Timing(B);
  return [
    { src: 'flicker.wav', at: PD, vol: 0.7 },
    { src: 'power_down.wav', at: PD + 2, vol: 0.8 },
    { src: 'flicker.wav', at: PD + 9, vol: 0.5 },
    { src: 'shutter_rattle.wav', at: RT, vol: 0.8 },
    { src: 'shutter_slam.wav', at: BU, vol: 0.6 },
    { src: 'glint.wav', at: BU + 15, vol: 0.45 },
    ...booms.map((b, i) => ({ src: 'boom_step.wav', at: b, vol: i === 0 ? 0.62 : 0.5 })),
    { src: 'snap_attention.wav', at: ST + 5, vol: 0.8 },
    { src: 'crate_drop.wav', at: ST + 10, vol: 0.8 },
    { src: 'whoosh.wav', at: SIT + 20, vol: 0.5 },
    { src: 'cushion_plop.wav', at: SIT + 28, vol: 0.7 },
    { src: 'chair_squeak.wav', at: SIT + 29, vol: 0.6 },
    { src: 'chair_squeak.wav', at: SIT + 38, vol: 0.5, rate: 1.15 },
    { src: 'whoosh.wav', at: SIT + 37, vol: 0.45 },
    { src: 'glint.wav', at: SIT + 49, vol: 0.5 },
    { src: 'glint.wav', at: wordAt(B.l2, 4) + 2, vol: 0.35 },
    { src: 'grow.wav', at: GROW - 1, vol: 0.55, dur: 40 },
    { src: 'stamp.wav', at: GROW + 2, vol: 0.6 },
    { src: 'chair_squeak.wav', at: GROW + 4, vol: 0.5, rate: 0.8 },
    { src: 'gulp.wav', at: wordAt(B.l3, 7) + 8, vol: 0.7 },
    { src: 'gulp.wav', at: wordAt(B.l3, 7) + 10, vol: 0.6, rate: 1.2 },
  ];
}

export function scene1Music(B: Resolved): MusicCue[] {
  const { PD, BU, ST, END } = scene1Timing(B);
  return [
    { src: 'sfx/factory_ambience.wav', from: 0, to: PD + 8, vol: 0.55, fadeOut: 8, duck: 1 },
    { src: 'music/villain_sting.wav', from: BU, to: BU + 120, vol: 0.55, duck: 0.5, fadeOut: 20 },
    { src: 'music/villain_bed.wav', from: ST + 24, to: END, vol: 0.38, duck: 0.28, fadeIn: 14, loop: true },
  ];
}
