import { describe, expect, it } from 'vitest';
import {
  analyzeRoof,
  assessCustomer,
  computeBill,
  DEFAULT_ASSUMPTIONS,
  economics,
  emi,
  estimateUnitsFromBill,
  ILLUSTRATIVE_PUNE_LT_INDUSTRIAL,
  irr,
  npv,
  parseIntervalCsv,
  polygonArea,
  rectPolygon,
  simulate,
  solarPotentialSeries,
} from '@/engine';
import { makeRoof, obstacle, sampleFactoryProfile, samplePuneFactoryDraft, seedCustomers, shape, syntheticProfile } from '@/data/seed';
import type { Assumptions, BatterySystem, Customer, EnergySimulation } from '@/types';

const A = DEFAULT_ASSUMPTIONS;
const T = ILLUSTRATIVE_PUNE_LT_INDUSTRIAL;
const EPS = 1e-6;

/** Evening-heavy profile with midday surplus so a battery actually cycles. */
const eveningLoad = syntheticProfile(shape(0.1, [[8, 13, 0.3], [13, 17, 0.85], [17, 23, 1]]), 0.08, 6, 14000, 'test');
const daytimeLoad = sampleFactoryProfile(10000);

function run(opts: { solarKw?: number; battery?: BatterySystem | null; a?: Partial<Assumptions>; shade?: number[][]; load?: typeof eveningLoad; tariff?: typeof T } = {}): EnergySimulation {
  return simulate({
    load: opts.load ?? eveningLoad,
    solarKw: opts.solarKw ?? 60,
    battery: opts.battery === undefined ? { capacityKwh: 40, powerKw: 20 } : opts.battery,
    tariff: opts.tariff ?? T,
    assumptions: { ...A, ...opts.a },
    demandKva: 60,
    shadeLoss: opts.shade,
  });
}

function sampleCustomer(): Customer {
  const base = seedCustomers()[0];
  const d = samplePuneFactoryDraft();
  return { ...base, id: 'sg', business: d.business, bill: d.bill, roof: d.roof, loadProfile: daytimeLoad, design: { solarKwOverride: null, batteryKwhOverride: null }, assumptionOverrides: {} };
}

describe('solar production', () => {
  it('1. modelled solar generation never exceeds the production input', () => {
    const sim = run();
    const potential = solarPotentialSeries(60, A);
    const total = potential.reduce((a, b) => a + b, 0);
    expect(sim.annual.solarKwh).toBeLessThanOrEqual(total + EPS);
    expect(sim.annual.solarPotentialKwh).toBeCloseTo(total, 6);
    for (const day of sim.sampleDays) for (const iv of day) expect(iv.solar).toBeGreaterThanOrEqual(0);
    // every unit of solar is accounted for
    const a = sim.annual;
    expect(a.selfConsumedKwh + a.solarToBatteryKwh + a.gridExportKwh + a.curtailedKwh).toBeCloseTo(a.solarKwh, 4);
  });

  it('annual specific yield is in a plausible range for Pune (1,300–1,600 kWh/kWp)', () => {
    const y = solarPotentialSeries(1, A).reduce((a, b) => a + b, 0);
    expect(y).toBeGreaterThan(1300);
    expect(y).toBeLessThan(1600);
  });
});

describe('battery dispatch', () => {
  const battery = { capacityKwh: 40, powerKw: 20 };
  const sim = run({ battery });

  it('2. state of charge stays within min/max limits', () => {
    expect(sim.maxSocObservedKwh).toBeLessThanOrEqual((40 * A.socMaxPct) / 100 + EPS);
    expect(sim.minSocObservedKwh).toBeGreaterThanOrEqual((40 * A.socMinPct) / 100 - EPS);
    for (const day of sim.sampleDays)
      for (const iv of day) {
        expect(iv.socKwh).toBeLessThanOrEqual(40 * 0.95 + EPS);
        expect(iv.socKwh).toBeGreaterThanOrEqual(40 * 0.1 - EPS);
      }
  });

  it('3. charge/discharge respect the power limit and never happen in the same interval', () => {
    expect(sim.maxBatteryPowerObservedKw).toBeLessThanOrEqual(battery.powerKw + EPS);
    for (const day of sim.sampleDays)
      for (const iv of day) {
        const charging = iv.solarToBattery + iv.gridToBattery;
        expect(charging * iv.batteryToLoad).toBe(0);
        expect(charging).toBeLessThanOrEqual(battery.powerKw + EPS);
        expect(iv.batteryToLoad).toBeLessThanOrEqual(battery.powerKw + EPS);
      }
    expect(sim.annual.batteryDeliveredKwh).toBeGreaterThan(0);
    // energy constraint: cannot deliver more than was stored, after losses
    expect(sim.annual.batteryDeliveredKwh).toBeLessThanOrEqual((sim.annual.solarToBatteryKwh + sim.annual.gridToBatteryKwh) * A.roundTripEfficiency + 40 + EPS);
  });

  it('3b. without grid charging enabled the battery only charges from surplus solar', () => {
    expect(sim.annual.gridToBatteryKwh).toBe(0);
    // grid charging only happens when economic (cheap off-peak energy + wear < peak value)
    const withGrid = run({ battery, a: { allowGridCharging: true, batteryCapexInrPerKwh: 4000 } });
    expect(withGrid.annual.gridToBatteryKwh).toBeGreaterThan(0);
  });

  it('4. interval and annual energy balance are preserved', () => {
    for (const day of sim.sampleDays)
      for (const iv of day) {
        expect(iv.solarToLoad + iv.batteryToLoad + iv.gridImport - iv.gridToBattery).toBeCloseTo(iv.load, 9);
        expect(iv.solarToLoad + iv.solarToBattery + iv.gridExport + iv.curtailed).toBeCloseTo(iv.solar, 9);
      }
    const a = sim.annual;
    expect(a.selfConsumedKwh + a.batteryDeliveredKwh + a.gridImportKwh - a.gridToBatteryKwh).toBeCloseTo(a.loadKwh, 3);
    // battery: energy in = delivered + losses + net change of stored energy (bounded by capacity)
    const residual = a.solarToBatteryKwh + a.gridToBatteryKwh - a.batteryDeliveredKwh - a.batteryLossesKwh;
    expect(Math.abs(residual)).toBeLessThan(1e-6);
    expect(a.batteryLossesKwh).toBeGreaterThan(0);
  });

  it('5. no battery means no battery discharge, cycles or battery costs', () => {
    const s0 = run({ battery: null });
    expect(s0.annual.batteryDeliveredKwh).toBe(0);
    expect(s0.annual.solarToBatteryKwh).toBe(0);
    expect(s0.annual.batteryCycles).toBe(0);
    const e = economics({ key: 'x', label: 'x', sim: s0, solarOnlyAvoidedInr: s0.avoidedCostInr, solarOnlySelfPlusExportKwh: s0.annual.selfConsumedKwh + s0.annual.gridExportKwh, battery: null, a: A, tariffEscalationPct: 3 });
    expect(e.batteryCapexInr).toBe(0);
    expect(e.batteryReplacementYear).toBeNull();
    expect(e.cashFlows.every((c) => c.replacementInr === 0)).toBe(true);
    expect(e.annualOmInr).toBeCloseTo(60 * A.solarOmInrPerKwYr, 6);
  });
});

describe('shade', () => {
  const roofWith = (heightM: number) =>
    makeRoof({ polygon: rectPolygon(22, 11.4), excludeHeavilyShaded: false, obstacles: [obstacle('neighbour_building', 'Neighbour', -9, 1, 8, 9, heightM, 1, false), obstacle('water_tank', 'Tank', 2, 7.4, 2.5, 2.5, 2.2)] });

  it('6. increasing obstacle height increases shade loss and reduces modelled production', () => {
    const low = analyzeRoof(roofWith(2));
    const high = analyzeRoof(roofWith(10));
    expect(high.panelCount).toBe(low.panelCount);
    expect(high.annualShadeLossPct).toBeGreaterThan(low.annualShadeLossPct);
    const sLow = run({ load: daytimeLoad, solarKw: low.capacityKw, battery: null, shade: low.shadeLossByMonthHour });
    const sHigh = run({ load: daytimeLoad, solarKw: high.capacityKw, battery: null, shade: high.shadeLossByMonthHour });
    expect(sHigh.annual.solarKwh).toBeLessThan(sLow.annual.solarKwh);
  });

  it('7. lower solar generation never increases avoided cost', () => {
    const results = [0, 2, 5, 10].map((h) => {
      const r = analyzeRoof(roofWith(h));
      return run({ load: daytimeLoad, solarKw: r.capacityKw, battery: null, shade: r.shadeLossByMonthHour });
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].annual.solarKwh).toBeLessThanOrEqual(results[i - 1].annual.solarKwh + EPS);
      expect(results[i].avoidedCostInr).toBeLessThanOrEqual(results[i - 1].avoidedCostInr + EPS);
    }
  });

  it('roof area and usable area are computed from the outline', () => {
    expect(polygonArea(rectPolygon(20, 10))).toBeCloseTo(200, 9);
    const r = analyzeRoof(makeRoof({ polygon: rectPolygon(20, 10) }));
    expect(r.grossAreaM2).toBeCloseTo(200, 6);
    // 1 m setback all round leaves 18 x 8 = 144 m²
    expect(r.usableAreaM2).toBeGreaterThan(140);
    expect(r.usableAreaM2).toBeLessThan(148);
    expect(r.capacityKw).toBeGreaterThan(0);
  });
});

describe('tariff & bills', () => {
  it('8. fixed/demand charges are not eliminated by solar', () => {
    const big = run({ solarKw: 500, battery: { capacityKwh: 200, powerKw: 100 } });
    expect(big.postBill.fixedInr).toBeCloseTo(big.baselineBill.fixedInr, 6);
    expect(big.postBill.fixedInr).toBeGreaterThan(0);
    expect(big.postBill.totalInr).toBeGreaterThan(0 - big.postBill.exportCreditInr - 1);
  });

  it('effective bill rate differs from the avoidable rate per solar unit', () => {
    const r = assessCustomer(sampleCustomer(), A).recommendation;
    expect(r.effectiveRateInrPerKwh).toBeGreaterThan(r.avoidableSolarRateInrPerKwh + 1);
  });

  it('bill computation applies ToD adders, duty and export credit', () => {
    const imports = new Array(24).fill(0);
    imports[18] = 100; // evening peak hour
    const b = computeBill(T, imports, 10, 1, 50);
    const variable = 100 * (T.energyChargeInrPerKwh + T.wheelingChargeInrPerKwh + T.fuelAdjustmentInrPerKwh + 1.3);
    const fixed = 10 * T.fixedDemandChargeInrPerKvaMonth;
    expect(b.totalInr).toBeCloseTo((variable + fixed) * (1 + T.electricityDutyPct / 100) - 50 * T.exportCompensationInrPerKwh, 6);
  });

  it('units estimated from a bill reproduce the bill', () => {
    const units = estimateUnitsFromBill(T, 118000, 40);
    expect(units).toBeGreaterThan(8000);
    expect(units).toBeLessThan(12000);
  });
});

describe('finance', () => {
  it('9. PPA payments are deducted before reporting customer net savings', () => {
    const r = assessCustomer(sampleCustomer(), A).recommendation;
    const p = r.chosen!.customerPpa;
    expect(p.year1PaymentsInr).toBeGreaterThan(0);
    expect(p.year1NetSavingsInr).toBeCloseTo(p.year1AvoidedInr - p.year1PaymentsInr, 6);
    expect(p.monthlyNetSavingsInr * 12).toBeCloseTo(p.year1NetSavingsInr, 6);
    expect(p.year1NetSavingsInr).toBeLessThan(p.year1AvoidedInr);
    // the customer savings range shown in the portal is based on net (not gross) savings
    expect(r.savingsRangeMonthlyInr[1]).toBeLessThan(p.year1AvoidedInr / 12);
  });

  it('10. EMI is mathematically correct', () => {
    expect(emi(100000, 12, 12)).toBeCloseTo(8884.88, 2);
    expect(emi(793000, 10.5, 60)).toBeCloseTo(17044.4, 0);
    expect(emi(120000, 0, 12)).toBeCloseTo(10000, 9);
    expect(emi(0, 10, 12)).toBe(0);
    // amortisation check: balance reaches zero
    let bal = 500000;
    const m = emi(bal, 9.75, 84);
    for (let i = 0; i < 84; i++) bal = bal * (1 + 9.75 / 1200) - m;
    expect(Math.abs(bal)).toBeLessThan(1e-4);
  });

  it('IRR and NPV are consistent', () => {
    const flows = [-1000, 300, 300, 300, 300, 300];
    const r = irr(flows)!;
    expect(npv(r, flows)).toBeCloseTo(0, 4);
    expect(irr([100, 100])).toBeNull();
  });

  it('cost-reflective PPA rate gives the provider exactly its target return', () => {
    const ch = assessCustomer(sampleCustomer(), A).recommendation.chosen!;
    expect(ch.provider.irrPct!).toBeCloseTo(A.providerHurdleRatePct, 1);
    expect(Math.abs(ch.provider.npvAtHurdleInr)).toBeLessThan(1);
  });

  it('manual PPA rate changes payments proportionally', () => {
    const c = sampleCustomer();
    const r1 = assessCustomer({ ...c, assumptionOverrides: { ppaRateMode: 'manual', ppaManualRateInrPerKwh: 5 } }, A).recommendation.chosen!;
    const r2 = assessCustomer({ ...c, assumptionOverrides: { ppaRateMode: 'manual', ppaManualRateInrPerKwh: 6 } }, A).recommendation.chosen!;
    expect(r2.customerPpa.year1PaymentsInr / r1.customerPpa.year1PaymentsInr).toBeCloseTo(1.2, 6);
  });
});

describe('recommendation', () => {
  it('11. solar-only is recommended when storage adds too little value (daytime factory)', () => {
    const r = assessCustomer(sampleCustomer(), A).recommendation;
    expect(r.type).toBe('solar_only');
    expect(r.chosen!.batteryKwh).toBe(0);
    expect(r.batteryOptions.length).toBe(3);
    expect(r.usagePattern).toBe('daytime');
  });

  it('evening-shift factory gets a battery, but not automatically the largest one', () => {
    const kul = seedCustomers().find((c) => c.id === 'cus_kulkarni')!;
    const r = assessCustomer(kul, A).recommendation;
    expect(r.type).toBe('solar_battery');
    expect(r.chosen!.batteryKwh).toBeGreaterThan(0);
    expect(r.chosen!.batteryKwh).toBeLessThan(Math.max(...A.batteryCandidatesKwh));
  });

  it('the recommendation flips to solar-only if battery prices rise', () => {
    const kul = seedCustomers().find((c) => c.id === 'cus_kulkarni')!;
    const r = assessCustomer({ ...kul, assumptionOverrides: { batteryCapexInrPerKwh: 30000 } }, A).recommendation;
    expect(r.type).toBe('solar_only');
  });

  it('three seeded MSME cases produce distinct recommendations', () => {
    const cs = seedCustomers();
    const types = ['cus_mahalaxmi', 'cus_kulkarni', 'cus_sai'].map((id) => assessCustomer(cs.find((c) => c.id === id)!, A));
    expect(types[0].recommendation.type).toBe('solar_only');
    expect(types[1].recommendation.type).toBe('solar_battery');
    expect(types[2].roof.confidence).toBe('low'); // rented workshop, unmodelled shade, unverified
  });

  it('unknown roof yields a needs-survey recommendation with low confidence', () => {
    const c = { ...sampleCustomer(), roof: makeRoof() };
    const r = assessCustomer(c, A).recommendation;
    expect(r.type).toBe('needs_survey');
    expect(r.confidence).toBe('low');
  });

  it('solar capacity never exceeds the usable roof capacity', () => {
    const a = assessCustomer(sampleCustomer(), A);
    expect(a.recommendation.chosen!.solarKw).toBeLessThanOrEqual(a.roof.capacityKw + EPS);
  });
});

describe('interval CSV import', () => {
  it('parses a 24-row hourly profile', () => {
    const csv = ['time,kW', ...Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00,${h >= 9 && h < 18 ? 30 : 5}`)].join('\n');
    const r = parseIntervalCsv(csv);
    expect(r.ok).toBe(true);
    expect(r.workdayKw[10]).toBe(30);
    expect(r.workdayKw[2]).toBe(5);
  });

  it('parses 15-minute kWh data and converts to kW', () => {
    const rows = ['timestamp,kWh'];
    for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) rows.push(`2025-03-03 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')},2.5`);
    const r = parseIntervalCsv(rows.join('\n'));
    expect(r.ok).toBe(true);
    expect(r.intervalMinutes).toBe(15);
    expect(r.workdayKw[12]).toBeCloseTo(10, 6);
  });

  it('rejects files without usable columns', () => {
    expect(parseIntervalCsv('foo,bar\n1,2').ok).toBe(false);
  });
});
