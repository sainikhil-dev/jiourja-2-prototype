import type { Assumptions, BatterySystem, BillBreakdown, EnergySimulation, IntervalResult, LoadProfile, MonthlyEnergy, TariffSchedule } from '@/types';
import { DAYS_IN_MONTH, solarProfilePerKw } from './solar';
import { addBills, avoidableRate, computeBill, emptyBill, inPeriod, touAdder } from './tariff';

/** Deterministic PRNG so simulations are reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Day-to-day weather factors (365), normalised so each month's mean is exactly 1.
 * Monsoon months are more variable. Deterministic for a given seed.
 */
export function dailyWeatherFactors(seed = 7): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  for (let m = 0; m < 12; m++) {
    const amp = m >= 5 && m <= 8 ? 0.55 : 0.2;
    const days = Array.from({ length: DAYS_IN_MONTH[m] }, () => Math.max(0.05, 1 + amp * (rnd() * 2 - 1)));
    const mean = days.reduce((a, b) => a + b, 0) / days.length;
    out.push(...days.map((d) => d / mean));
  }
  return out;
}

const WEATHER = dailyWeatherFactors();

export function monthOfDay(day: number): number {
  let d = day;
  for (let m = 0; m < 12; m++) {
    if (d < DAYS_IN_MONTH[m]) return m;
    d -= DAYS_IN_MONTH[m];
  }
  return 11;
}

export interface SimInput {
  load: LoadProfile;
  solarKw: number;
  /** 12 x 24 shade loss fractions from the roof model (0 = no shade). */
  shadeLoss?: number[][];
  battery: BatterySystem | null;
  tariff: TariffSchedule;
  assumptions: Assumptions;
  demandKva: number;
  /** Capacity multiplier for battery fade studies (default 1). */
  batteryHealth?: number;
}

/** Minimum avoided ₹/kWh at which discharging is worthwhile (export value lost + wear cost). */
export function dischargeThreshold(a: Assumptions, t: TariffSchedule): number {
  return t.exportCompensationInrPerKwh / a.roundTripEfficiency + batteryWearCost(a);
}

/** Lifecycle wear cost per kWh delivered (CAPEX spread over rated cycle throughput). */
export function batteryWearCost(a: Assumptions): number {
  const usable = (a.socMaxPct - a.socMinPct) / 100;
  return a.batteryCapexInrPerKwh / (a.batteryCycleLife * usable * Math.sqrt(a.roundTripEfficiency));
}

/** Potential (unshaded) solar output for each hour of the simulated year, kWh. */
export function solarPotentialSeries(solarKw: number, a: Assumptions): number[] {
  const prof = solarProfilePerKw(a);
  const out: number[] = [];
  for (let day = 0; day < 365; day++) {
    const m = monthOfDay(day);
    for (let h = 0; h < 24; h++) out.push(solarKw * prof[m][h] * WEATHER[day]);
  }
  return out;
}

/**
 * Hourly rule-based dispatch over a 365-day year.
 * Order each hour: solar → load; surplus solar → battery (limits) → export;
 * deficit → battery (only in discharge windows, when economic) → grid.
 * The battery never charges and discharges in the same hour, and charges from
 * the grid only if `allowGridCharging` is set (off-peak, no solar).
 */
export function simulate(input: SimInput): EnergySimulation {
  const { load, solarKw, battery, tariff, assumptions: a, demandKva } = input;
  const shade = input.shadeLoss;
  const health = input.batteryHealth ?? 1;
  const potential = solarPotentialSeries(solarKw, a);
  const cap = battery ? battery.capacityKwh * health : 0;
  const pmax = battery ? battery.powerKw : 0;
  const socMin = (cap * a.socMinPct) / 100;
  const socMax = (cap * a.socMaxPct) / 100;
  const eta = Math.sqrt(a.roundTripEfficiency);
  const threshold = dischargeThreshold(a, tariff);
  const wear = batteryWearCost(a);
  const peakRate = Math.max(...Array.from({ length: 24 }, (_, h) => avoidableRate(tariff, h)));
  let soc = socMin;

  const annual = {
    loadKwh: 0,
    solarKwh: 0,
    solarPotentialKwh: 0,
    selfConsumedKwh: 0,
    solarToBatteryKwh: 0,
    gridToBatteryKwh: 0,
    batteryDeliveredKwh: 0,
    gridImportKwh: 0,
    gridExportKwh: 0,
    curtailedKwh: 0,
    batteryCycles: 0,
    batteryLossesKwh: 0,
  };
  const monthly: MonthlyEnergy[] = [];
  const monthAcc = () => ({ load: 0, solar: 0, self: 0, batt: 0, imp: 0, exp: 0, baseByHour: new Array(24).fill(0), impByHour: new Array(24).fill(0) });
  let acc = monthAcc();
  let baselineBill: BillBreakdown = emptyBill();
  let postBill: BillBreakdown = emptyBill();
  const sampleDays: IntervalResult[][] = [];
  let sampleTaken = -1;
  let maxSoc = soc;
  let minSoc = soc;
  let maxP = 0;
  let dischargedFromCells = 0;

  for (let day = 0; day < 365; day++) {
    const m = monthOfDay(day);
    const working = day % 7 < load.workingDaysPerWeek; // day 0 = Monday
    const shape = working ? load.workdayKw : load.holidayKw;
    const mf = load.monthlyFactor[m] ?? 1;
    const dayOfMonth = day - DAYS_IN_MONTH.slice(0, m).reduce((x, y) => x + y, 0);
    const record = working && sampleTaken !== m && dayOfMonth >= 14;
    const dayLog: IntervalResult[] = [];

    for (let h = 0; h < 24; h++) {
      const L = shape[h] * mf;
      const pot = potential[day * 24 + h];
      const S = pot * (1 - (shade?.[m]?.[h] ?? 0));
      const solarToLoad = Math.min(S, L);
      let surplus = S - solarToLoad;
      let deficit = L - solarToLoad;
      let solarToBattery = 0;
      let batteryToLoad = 0;
      let gridToBattery = 0;

      if (battery && cap > 0) {
        if (surplus > 1e-9) {
          solarToBattery = Math.max(0, Math.min(surplus, pmax, (socMax - soc) / eta));
          soc += solarToBattery * eta;
          surplus -= solarToBattery;
        } else if (deficit > 1e-9) {
          const inWindow = a.dischargeWindows.some((w) => inPeriod(h, w.startHour, w.endHour));
          if (inWindow && avoidableRate(tariff, h) >= threshold) {
            batteryToLoad = Math.max(0, Math.min(deficit, pmax, (soc - socMin) * eta));
            soc -= batteryToLoad / eta;
            dischargedFromCells += batteryToLoad / eta;
            deficit -= batteryToLoad;
          }
        }
        const idle = solarToBattery === 0 && batteryToLoad === 0;
        if (idle && a.allowGridCharging && S <= 0 && touAdder(tariff, h) < 0 && avoidableRate(tariff, h) / a.roundTripEfficiency + wear < peakRate) {
          gridToBattery = Math.max(0, Math.min(pmax, (socMax - soc) / eta));
          soc += gridToBattery * eta;
        }
        soc = Math.min(socMax, Math.max(socMin, soc));
        maxSoc = Math.max(maxSoc, soc);
        minSoc = Math.min(minSoc, soc);
        maxP = Math.max(maxP, solarToBattery, batteryToLoad, gridToBattery);
      }

      const gridImport = deficit + gridToBattery;
      const exportCap = tariff.exportLimitKw ?? Infinity;
      const gridExport = Math.min(surplus, exportCap);
      const curtailed = surplus - gridExport;

      annual.loadKwh += L;
      annual.solarKwh += S;
      annual.solarPotentialKwh += pot;
      annual.selfConsumedKwh += solarToLoad;
      annual.solarToBatteryKwh += solarToBattery;
      annual.gridToBatteryKwh += gridToBattery;
      annual.batteryDeliveredKwh += batteryToLoad;
      annual.gridImportKwh += gridImport;
      annual.gridExportKwh += gridExport;
      annual.curtailedKwh += curtailed;

      acc.load += L;
      acc.solar += S;
      acc.self += solarToLoad;
      acc.batt += batteryToLoad;
      acc.imp += gridImport;
      acc.exp += gridExport;
      acc.baseByHour[h] += L;
      acc.impByHour[h] += gridImport;

      if (record)
        dayLog.push({ load: L, solar: S, solarToLoad, solarToBattery, gridToBattery, batteryToLoad, gridImport, gridExport, curtailed, socKwh: soc });
    }
    if (record) {
      sampleDays.push(dayLog);
      sampleTaken = m;
    }

    const lastDayOfMonth = day === 364 || monthOfDay(day + 1) !== m;
    if (lastDayOfMonth) {
      const base = computeBill(tariff, acc.baseByHour, demandKva, 1, 0);
      const post = computeBill(tariff, acc.impByHour, demandKva, 1, acc.exp);
      baselineBill = addBills(baselineBill, base);
      postBill = addBills(postBill, post);
      monthly.push({
        month: m,
        loadKwh: acc.load,
        solarKwh: acc.solar,
        selfConsumedKwh: acc.self,
        batteryDeliveredKwh: acc.batt,
        gridImportKwh: acc.imp,
        gridExportKwh: acc.exp,
        baselineBillInr: base.totalInr,
        postBillInr: post.totalInr,
      });
      acc = monthAcc();
    }
  }

  const usable = cap * (a.socMaxPct - a.socMinPct) / 100;
  annual.batteryCycles = usable > 0 ? dischargedFromCells / usable : 0;
  annual.batteryLossesKwh = annual.solarToBatteryKwh + annual.gridToBatteryKwh - annual.batteryDeliveredKwh;

  return {
    solarKw,
    battery,
    annual,
    baselineBill,
    postBill,
    avoidedCostInr: baselineBill.totalInr - postBill.totalInr,
    monthly,
    sampleDays,
    maxSocObservedKwh: maxSoc,
    minSocObservedKwh: minSoc,
    maxBatteryPowerObservedKw: maxP,
  };
}
