/**
 * SCENE 1 — THE REAL BOSS (≈10 s)
 *
 *  A  wide      factory hums; Raju carries a crate; Pappu on the lathe; Khurana ji content
 *  —            lights flicker, machines die, every head turns to the shutter
 *  B  door      shutter rattles… SLAMS up (DUN!) → silhouette → sunglasses glint (DUN!)
 *  C  wide/low  BOOM — the Bill steps in (DUNNN!); everyone snaps to attention, crate drops
 *  D  two-shot  his shadow climbs the wall. Raju: "सर... ये कौन है?"
 *               Owner (gulp): "हमारी फैक्टरी का... असली मालिक!"
 *  E  the chair the Bill strolls to THE chair, hops, plops, spins, crosses his legs. Glint.
 *
 * Every key below is relative to a beat, so real voice takes re-time it.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { World, Layer, camAt, type CamKey } from '../camera/Camera';
import { BackWall, Crates, DoorLight, DoorOutside, Drill, Desk, Floor, Lathe, Press, Roof, RollerDoor, FLOOR } from '../environment/Factory';
import { ChairBack, ChairFront, BASE_CHAIR, SEAT_Y, CHAIR_SCALE, type ChairState } from '../environment/Chair';
import { Owner } from '../characters/Owner';
import { Raju, Pappu } from '../characters/Workers';
import { Bill, BASE_BILL, billWalk, type BillPose } from '../characters/Bill';
import { BASE_HUMAN, walkPose, type HumanPose } from '../characters/Human';
import { animatePose, blink, kf, type Key } from '../rig/keyframes';
import { mouthFor, resolveBeats, type Resolved } from '../timeline/beats';
import { SCENE1_BEATS } from '../timeline/scene1';
import { Soundtrack, type Sfx, type MusicCue } from '../audio/Soundtrack';
import { ScratchOverlay } from './ScratchOverlay';
import type { Viseme } from '../audio/visemes';
import { loadFonts } from '../fonts';

loadFonts();

export const S1 = resolveBeats(SCENE1_BEATS);
const BILL_SCALE = 1.08;
const STEP = 14; // frames per Bill footstep
const STRIDE = 46;
const BILL_SPEED = (2 * STRIDE * BILL_SCALE) / STEP;
const CHAIR_X = 1880;
const POS = { pappu: 1010, raju: 2120, owner: 2330, door: 310 };

const talk = (v: Viseme) => (v === 'D' || v === 'C' ? 2.5 : v === 'E' ? 1.5 : 0);

export function scene1Timing(B: Resolved) {
  return {
    PD: B.powerDown.start,
    RT: B.rattle.start,
    BU: B.burst.start,
    ST: B.steps.start,
    QS: B.raju_q.start,
    Q: B.raju_q.line!.speechStart,
    QE: B.raju_q.line!.speechEnd,
    A: B.owner_a.line!.speechStart,
    AE: B.owner_a.line!.speechEnd,
    SIT: B.sit.start,
    END: B.__total.end,
  };
}

function lightsOn(f: number, PD: number, BU: number) {
  if (f < PD) return 1;
  if (f >= BU) return 0.8;
  const pattern = [0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0];
  return pattern[Math.min(pattern.length - 1, f - PD)] ?? 0;
}

export const Scene1Boss: React.FC<{ scratchOverlay?: boolean }> = ({ scratchOverlay = true }) => {
  const f = useCurrentFrame();
  const B = S1;
  const { PD, RT, BU, ST, QS, Q, QE, A, AE, SIT, END } = scene1Timing(B);
  const booms = [ST, ST + STEP, ST + 2 * STEP, SIT + 6, SIT + 18];

  // -------------------------------------------------------------- camera
  const camKeys: CamKey[] = [
    { f: 0, x: 1360, y: 500, zoom: 0.8 },
    { f: RT - 1, x: 1400, y: 500, zoom: 0.84, e: 'linear' },
    { f: RT, x: 340, y: 460, zoom: 1.0, e: 'hold' }, // CUT → door
    { f: ST - 1, x: 330, y: 470, zoom: 1.12, e: 'inOut' },
    { f: ST, x: 1150, y: 500, zoom: 0.78, e: 'hold' }, // CUT → wide low
    { f: QS - 1, x: 1230, y: 500, zoom: 0.8, e: 'linear' },
    { f: QS, x: 2200, y: 560, zoom: 1.72, e: 'hold' }, // CUT → two-shot
    { f: A, x: 2215, y: 560, zoom: 1.76, e: 'linear' },
    { f: AE + 4, x: 2270, y: 555, zoom: 1.95, e: 'inOut' },
    { f: SIT, x: 2030, y: 440, zoom: 0.84, e: 'hold' }, // CUT → the chair
    { f: SIT + 30, x: 2020, y: 440, zoom: 0.87, e: 'inOut' },
    { f: END, x: 1990, y: 450, zoom: 0.93, e: 'inOut' },
  ];
  const cam = camAt(
    f,
    camKeys,
    booms.map((b, i) => ({ f: b, s: i === 0 ? 26 : i < 3 ? 16 : 10, d: 16 })).concat([{ f: BU, s: 12, d: 10 }, { f: SIT + 34, s: 9, d: 10 }]),
  );

  const lit = lightsOn(f, PD, BU);
  const running = f < PD + 4 ? 1 : 0;

  // -------------------------------------------------------------- Bill
  let billX = POS.door;
  let walkPh: number | null = null;
  if (f >= ST && f < QS) {
    walkPh = (f - ST) / STEP;
    billX = POS.door + (f - ST) * BILL_SPEED;
  } else if (f >= QS && f < SIT) {
    billX = POS.door + (QS - ST) * BILL_SPEED;
  } else if (f >= SIT) {
    const t = Math.min(f - SIT, 18);
    walkPh = f - SIT < 18 ? 0.5 + t / (STEP * 0.857) : null;
    billX = CHAIR_X - 150 + Math.min(1, t / 18) * 150;
  }
  const seatY = SEAT_Y - 40 * CHAIR_SCALE + 150 * BILL_SCALE;
  const SEATED_LEG = (FLOOR - (seatY - 150 * BILL_SCALE)) / BILL_SCALE;
  const billKeys: Key<BillPose>[] = [
    // in the doorway: arms akimbo, chest out
    { f: 0, aLa: 12, aLl: 125, aLb: -0.95, aRa: 12, aRl: 125, aRb: -0.95, hL: 'fist', hR: 'fist', lean: -2, smile: 0.35, asym: 0.6, browAng: 0.5, turn: 0.1 },
    { f: BU + 13, turn: 0.1, browR: 0, glint: 0 },
    { f: BU + 15, turn: 0.35, browR: 0.8, glint: 1, smile: 0.55, e: 'back' }, // DUN #2: the glint
    { f: BU + 24, glint: 0, e: 'out' },
    { f: ST - 2, aLa: 12, aLl: 125, aLb: -0.95, aRa: 12, aRl: 125, aRb: -0.95, browR: 0.5 },
    // walk: let the swagger drive the arms
    { f: ST, aLl: 185, aRl: 185, hL: 'relax', hR: 'relax', turn: 0.45, smile: 0.5, asym: 0.8, e: 'out' },
    { f: QS - 1, turn: 0.45 },
    // the chair
    { f: SIT, turn: 0.6, smile: 0.45, asym: 0.7, browAng: 0.5, y: FLOOR, sy: 1, bodyY: 0 },
    { f: SIT + 18, turn: 0.6, aLa: 22, aRa: 22, aLb: 0.3, aRb: 0.3 },
    { f: SIT + 22, turn: 0, lookX: 0, browR: 0.9, e: 'back' }, // turns to camera, "watch this"
    { f: SIT + 27, sy: 0.86, sx: 1.06, bodyY: -12, aLa: 50, aRa: 50, aLb: -0.4, aRb: -0.4, lLx: -20, lLy: 140, lRx: 20, lRy: 140, e: 'out' }, // anticipation
    { f: SIT + 33, y: seatY - 70, sy: 1.1, sx: 0.94, bodyY: 0, aLa: 95, aRa: 95, lLx: 30, lLy: 120, lRx: 40, lRy: 110, lLk: 0.5, lRk: 0.5, e: 'out' }, // hop
    { f: SIT + 36, y: seatY, sy: 0.8, sx: 1.14, aLa: 40, aRa: 40, lLx: -40, lLy: SEATED_LEG, lRx: 40, lRy: SEATED_LEG, lLk: -0.25, lRk: 0.25, e: 'in' }, // PLOP
    { f: SIT + 44, sy: 1, sx: 1, e: 'elastic' },
    // spin, then settle into the boss pose: legs crossed, arms behind head
    { f: SIT + 46, aLa: 40, aRa: 40, aLb: 0.3, aRb: 0.3, lRx: 40, lRy: SEATED_LEG, lRk: 0.25, lean: 0 },
    { f: SIT + 54, aLa: 205, aRa: 205, aLb: -1.6, aRb: -1.6, aLl: 190, aRl: 190, hL: 'flat', hR: 'flat', lRx: -170, lRy: SEATED_LEG * 0.42, lRk: 0.7, lean: -5, smile: 0.7, asym: 0.9, browAng: 0.35, e: 'back' },
    { f: SIT + 55, glint: 0 },
    { f: SIT + 57, glint: 1, e: 'back' },
    { f: END, glint: 0, e: 'out' },
  ];
  let billP = animatePose(f, { ...BASE_BILL, x: billX, y: FLOOR, scale: BILL_SCALE }, billKeys);
  if (walkPh !== null) {
    const w = billWalk(walkPh, STRIDE);
    billP = { ...billP, ...w, aLa: (w.aLa ?? 0) + 4, aRa: (w.aRa ?? 0) + 4 };
  }
  billP.x = billX;
  billP.stache = Math.sin(f / 7) * 0.3;
  const billSil = f < ST ? 1 : kf(f, [[ST, 1], [ST + 14, 0, 'out']]);
  const spinT = kf(f, [[SIT + 44, 0], [SIT + 54, 1, 'inOut']]);
  const spinK = Math.cos(spinT * Math.PI * 2);
  const chair: ChairState = {
    ...BASE_CHAIR,
    x: CHAIR_X,
    spin: spinT,
    squash: kf(f, [[SIT + 34, 0], [SIT + 36, 1, 'in'], [SIT + 46, 0, 'elastic']]),
    roll: spinT * 3,
    recline: 0,
    tilt: 0,
  };
  const billSeated = f >= SIT + 34;
  const billVis = billVisible(f, BU, QS, SIT);

  // -------------------------------------------------------------- Pappu (lathe)
  const pKeys: Key<HumanPose>[] = [
    { f: 0, facing: -1, turn: 0.5, lookX: 0.4, lookY: 0.4, aLs: 30, aLe: -60, aRs: 34, aRe: -70, smile: 0.3 },
    { f: PD, lookY: 0.4, turn: 0.5 },
    { f: PD + 3, lookY: -1, lookX: 0, turn: 0, browL: 0.7, browR: 0.7, smile: -0.1, e: 'out' }, // lights?
    { f: PD + 9, turn: 0.9, lookX: 1, lookY: 0, browAng: -0.4, e: 'back' }, // the door
    { f: ST - 1, sy: 1, crouch: 0, aRs: 34, aRe: -70, hR: 'relax', jaw: 0 },
    { f: ST + 2, sy: 0.9, crouch: 10, e: 'out' }, // flinch
    { f: ST + 6, sy: 1.08, crouch: -4, aRs: 112, aRe: -128, hR: 'flat', aLs: 5, aLe: 0, hL: 'flat', lean: -3, jaw: 0.35, sweat: 0.7, browL: 1, browR: 1, e: 'back' }, // SALUTE
    { f: ST + 12, sy: 1.02, crouch: 0, e: 'out' },
  ];
  const pappu = animatePose(f, { ...BASE_HUMAN, x: POS.pappu, y: FLOOR }, pKeys);
  if (f < PD) pappu.aRe = -70 + Math.sin(f / 4) * 14; // cranking the carriage wheel
  if (f > ST + 12) pappu.x += Math.sin(f * 1.7) * 1.2; // trembling at attention

  // -------------------------------------------------------------- Raju
  const crateDrop = ST + 3;
  const rKeys: Key<HumanPose>[] = [
    { f: 0, x: POS.raju - 230, aLs: 22, aLe: -84, aRs: 22, aRe: -84, hL: 'hold', hR: 'hold', smile: 0.3, turn: 0.3, lean: 3 },
    { f: PD, x: POS.raju, e: 'linear' },
    { f: PD + 3, lookY: -1, turn: 0, browL: 0.6, browR: 0.6, smile: 0, e: 'out' },
    { f: PD + 11, turn: -1, lookX: -1, lookY: 0, browAng: -0.5, e: 'back' },
    { f: crateDrop - 1, aLs: 22, aLe: -84, aRs: 22, aRe: -84, sy: 1, crouch: 0 },
    { f: crateDrop + 1, sy: 0.9, crouch: 10, e: 'out' },
    { f: crateDrop + 5, aLs: 3, aLe: 0, aRs: 3, aRe: 0, hL: 'flat', hR: 'flat', sy: 1.1, crouch: -6, lean: 0, turn: -0.2, lookX: -0.4, jaw: 0.2, browL: 1, browR: 1, browAng: -0.6, e: 'back' },
    { f: crateDrop + 12, sy: 1.03, crouch: 0, e: 'out' },
    // whisper to the boss
    { f: Q - 9, lean: 0, tilt: 0, aRs: 3, aRe: 0, turn: -0.2, jaw: 0.2 },
    { f: Q - 2, lean: 5, tilt: 6, aRs: 22, aRe: -172, hR: 'flat', turn: 0.6, lookX: 1, jaw: 0, crouch: 6, sy: 1, e: 'back' },
    { f: Q + Math.round((QE - Q) * 0.35), lookX: -1, turn: 0.3 }, // eyes dart to the Bill
    { f: Q + Math.round((QE - Q) * 0.6), lookX: 1, turn: 0.6 },
    { f: QE + 3, aRs: 22, aRe: -172, lean: 5, tilt: 6 },
    { f: QE + 9, aRs: 6, aRe: -4, hR: 'relax', lean: 3, tilt: 3, crouch: 2, e: 'out' },
    // reacts to the answer
    { f: A + Math.round((AE - A) * 0.55), jaw: 0, browL: 0.6, browR: 0.6, lean: 3 },
    { f: A + Math.round((AE - A) * 0.7), jaw: 0.55, browL: 1.2, browR: 1.2, lean: -6, sy: 1.04, sweat: 0.6, e: 'back' },
    { f: AE + 6, turn: -0.7, lookX: -1, jaw: 0.3, e: 'inOut' },
    // the Bill arrives: scoot away
    { f: SIT, x: POS.raju, lean: -6, turn: -0.7, tilt: 3, crouch: 2, aLs: 3, aLe: 0, aRs: 6, aRe: -4, hL: 'flat', hR: 'relax' },
    { f: SIT + 14, x: POS.raju + 70, lean: 10, tilt: 6, aLs: 55, aLe: -95, aRs: 60, aRe: -100, hL: 'open', hR: 'open', crouch: 8, e: 'back' },
    { f: SIT + 34, sy: 1.0 },
    { f: SIT + 36, sy: 0.9, e: 'out' },
    { f: SIT + 42, sy: 1.0, e: 'elastic' },
  ];
  const raju = animatePose(f, { ...BASE_HUMAN, x: POS.raju, y: FLOOR }, rKeys);
  if (f < PD) Object.assign(raju, walkPose(f / 8, 22, 6), { aLs: 22, aLe: -84, aRs: 22, aRe: -84, lean: 3 });
  const crate = {
    x: kf(f, [[0, POS.raju - 230], [PD, POS.raju, 'linear']]) + 8,
    y: f < crateDrop ? FLOOR - 215 + raju.crouch : kf(f, [[crateDrop, FLOOR - 215], [crateDrop + 7, FLOOR - 70, 'in'], [crateDrop + 11, FLOOR - 105, 'out'], [crateDrop + 15, FLOOR - 70, 'in']]),
    r: f < crateDrop ? 0 : kf(f, [[crateDrop, 0], [crateDrop + 7, 14, 'in'], [crateDrop + 15, 4, 'out']]),
  };
  if (f >= SIT) raju.turn = -0.7 + (f >= SIT + 44 ? -Math.sin(spinT * Math.PI * 2) * 0.6 : 0); // eyes follow the spin

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
    { f: ST + 30, sweat: 0.6, jaw: 0.1 },
    // during Raju's question: frozen, eyes on the intruder
    { f: Q, turn: -0.8, lookX: -1, sweat: 0.8, browAng: -0.8, jaw: 0, smile: -0.3 },
    { f: QE + 2, nod: 0, lid: 0 },
    { f: QE + 5, nod: 7, lid: 0.3, e: 'in' }, // gulp
    { f: QE + 9, nod: 0, lid: 0, e: 'out' },
    // "हमारी फैक्टरी का... असली मालिक!"
    { f: A - 4, sy: 1.0, aLs: 5, aLe: 0, crouch: 0, turn: -0.8 },
    { f: A - 1, sy: 1.03, aLs: 10, e: 'out' }, // breath in
    { f: A + 5, sy: 1, crouch: 7, lean: -2, turn: -0.35, lookX: -0.7, browAng: -1, browL: 0.8, browR: 0.8, smile: -0.5, e: 'inOut' },
    { f: A + Math.round((AE - A) * 0.42), aLs: 10, aLe: 0, hL: 'flat', tilt: 0 },
    { f: A + Math.round((AE - A) * 0.58), aLs: 72, aLe: 14, aLw: -24, hL: 'open', tilt: -6, lookX: -1, turn: -0.6, e: 'back' }, // presents "the real owner"
    { f: AE, aLs: 66, aLe: 10, aRs: 14, tilt: -8, sy: 1 },
    { f: AE + 5, aLs: 8, aLe: -4, hL: 'relax', aRs: 8, nod: 7, lid: 0.45, sy: 0.97, crouch: 10, e: 'inOut' }, // sigh
    // the Bill comes for the chair
    { f: SIT, nod: 0, lid: 0, crouch: 6, turn: -0.8, lookX: -1, sweat: 1, sy: 1 },
    { f: SIT + 34, sy: 1 },
    { f: SIT + 36, sy: 0.92, lid: 0.8, e: 'out' },
    { f: SIT + 42, sy: 1, lid: 0, e: 'elastic' },
    { f: SIT + 56, jaw: 0.25, browAng: -0.9 },
  ];
  const owner = animatePose(f, { ...BASE_HUMAN, x: POS.owner, y: FLOOR }, oKeys);
  if (f < PD) owner.nod = Math.max(0, Math.sin(((f - 9) / 36) * Math.PI * 2)) * 4; // nods along with the press
  if (f >= SIT + 44) owner.turn = -0.8 - Math.sin(spinT * Math.PI * 2) * 0.5;

  // -------------------------------------------------------------- mouths
  const vOwner = mouthFor('owner', f, B);
  const vRaju = mouthFor('raju', f, B);
  const vBill = mouthFor('bill', f, B);
  owner.nod += talk(vOwner);
  raju.nod += talk(vRaju);

  return (
    <AbsoluteFill style={{ background: '#1a1410' }}>
      <World cam={cam}>
        <defs>
          <filter id="silhouette" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0 0.06  0 0 0 1 0" />
          </filter>
          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <Layer p={0.8}>
          <BackWall frame={f} meterSpeed={f < PD ? 1 : f < ST ? 0.2 : 4} />
          {f >= QS - 6 && f < SIT && (
            // the Bill's giant shadow climbing the wall behind them
            <g opacity={kf(f, [[QS - 6, 0], [QS + 4, 0.42]])} filter="url(#silhouette)">
              <Bill
                p={{ ...BASE_BILL, x: kf(f, [[QS - 6, 1900], [Q + 6, 2120, 'out']]), y: FLOOR + 120, scale: 1.75, turn: 0.5, aLa: 12, aLl: 125, aLb: -0.95, aRa: 12, aRl: 125, aRb: -0.95 }}
                viseme="X"
                open={1}
                frame={f}
              />
            </g>
          )}
        </Layer>
        <Layer p={0.88}>
          <Roof frame={f} lightsOn={lit} />
        </Layer>
        <Layer p={1}>
          <Floor />
          <DoorOutside />
          {billVis === 'door' && (
            <g>
              <Bill p={billP} viseme={vBill} open={blink(f, 9)} frame={f} />
              <g opacity={billSil} filter="url(#silhouette)">
                <Bill p={{ ...billP, glint: 0 }} viseme={vBill} open={1} frame={f} />
              </g>
              {billP.glint > 0.01 && (
                <g transform={`translate(${billP.x + (-80 + billP.turn * 22) * BILL_SCALE} ${FLOOR - 554 * BILL_SCALE}) scale(${billP.glint * 2.8}) rotate(${f * 6})`}>
                  <path d="M 0 -26 L 5 -5 L 26 0 L 5 5 L 0 26 L -5 5 L -26 0 L -5 -5 Z" fill="#fff" stroke="#FFF3B0" strokeWidth={2} />
                </g>
              )}
            </g>
          )}
          <RollerDoor open={kf(f, [[BU, 0], [BU + 7, 1, 'in']])} frame={f} rattle={f >= RT && f < BU ? 1 : 0} />
          <DoorLight amount={f >= BU && f < QS ? kf(f, [[BU, 0], [BU + 6, 1]]) : 0} />
          <Lathe frame={f} running={running} x={850} />
          <Press frame={f} running={running} x={1230} />
          <Desk x={2300} frame={f} />
          <Crates x={2660} />
          <Drill x={2950} frame={f} running={running} />
          <ChairBack c={chair} />
          {!billSeated && <ChairFront c={chair} />}
          <Pappu p={pappu} viseme={mouthFor('pappu', f, B)} open={blink(f, 21)} frame={f} />
          <Raju p={raju} viseme={vRaju} open={Math.min(blink(f, 7, [PD + 10, QE + 4]), 1 - raju.lid)} frame={f} />
          <g transform={`translate(${crate.x} ${crate.y}) rotate(${crate.r})`}>
            <rect x={-70} y={-55} width={140} height={110} fill="#C9954F" stroke="#2A1A14" strokeWidth={5} />
            <path d="M -70 -55 L 70 55 M 70 -55 L -70 55" stroke="#A0733A" strokeWidth={7} />
          </g>
          <Owner p={owner} viseme={vOwner} open={blink(f, 3, [PD + 12, QE + 5])} frame={f} />
          {billVis === 'walk' && <Bill p={billP} viseme={vBill} open={blink(f, 9)} frame={f} spinK={spinK} armsBehind={f >= SIT + 49} part={billSeated ? 'body' : 'all'} />}
          {billSeated && <ChairFront c={chair} />}
          {billSeated && <Bill p={billP} viseme={vBill} open={1} frame={f} spinK={spinK} part="legs" shadow={false} />}
        </Layer>
        {/* lighting */}
        <rect x={0} y={0} width={1920} height={1080} fill="#0B0710" opacity={(1 - lit) * 0.62} />
        {f >= BU && <rect x={0} y={0} width={1920} height={1080} fill="#5A1030" opacity={0.08} style={{ mixBlendMode: 'multiply' }} />}
        <rect x={0} y={0} width={1920} height={1080} fill="url(#vignette)" />
      </World>
      <Soundtrack beats={B} sfx={scene1Sfx(B, booms)} music={scene1Music(B)} />
      {scratchOverlay && <ScratchOverlay beats={B} />}
    </AbsoluteFill>
  );
};

function billVisible(f: number, BU: number, QS: number, SIT: number): 'none' | 'door' | 'walk' {
  if (f < BU) return 'none';
  if (f < QS) return f < BU + 33 ? 'door' : 'walk';
  if (f < SIT) return 'none';
  return 'walk';
}

export function scene1Sfx(B: Resolved, booms: number[]): Sfx[] {
  const { PD, RT, BU, ST, QE, SIT } = scene1Timing(B);
  return [
    { src: 'flicker.wav', at: PD, vol: 0.7 },
    { src: 'power_down.wav', at: PD + 2, vol: 0.8 },
    { src: 'flicker.wav', at: PD + 9, vol: 0.5 },
    { src: 'shutter_rattle.wav', at: RT, vol: 0.8 },
    { src: 'shutter_slam.wav', at: BU, vol: 0.6 },
    { src: 'glint.wav', at: BU + 15, vol: 0.45 },
    ...booms.map((b, i) => ({ src: 'boom_step.wav', at: b, vol: i === 0 ? 0.62 : i < 3 ? 0.5 : 0.4 })),
    { src: 'snap_attention.wav', at: ST + 5, vol: 0.8 },
    { src: 'crate_drop.wav', at: ST + 10, vol: 0.8 },
    { src: 'gulp.wav', at: QE + 4, vol: 0.9 },
    { src: 'whoosh.wav', at: SIT + 27, vol: 0.5 },
    { src: 'cushion_plop.wav', at: SIT + 35, vol: 0.7 },
    { src: 'chair_squeak.wav', at: SIT + 36, vol: 0.6 },
    { src: 'chair_squeak.wav', at: SIT + 46, vol: 0.5, rate: 1.15 },
    { src: 'whoosh.wav', at: SIT + 45, vol: 0.5 },
    { src: 'glint.wav', at: SIT + 56, vol: 0.55 },
  ];
}

export function scene1Music(B: Resolved): MusicCue[] {
  const { PD, BU, ST, END } = scene1Timing(B);
  return [
    { src: 'sfx/factory_ambience.wav', from: 0, to: PD + 8, vol: 0.55, fadeOut: 8, duck: 1 },
    { src: 'music/villain_sting.wav', from: BU, to: BU + 120, vol: 0.55, duck: 0.5, fadeOut: 20 },
    { src: 'music/villain_bed.wav', from: ST + 24, to: END, vol: 0.38, duck: 0.3, fadeIn: 14, loop: true },
  ];
}
