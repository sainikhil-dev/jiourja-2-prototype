import type { Assumptions, Confidence, Customer, LoadProfile, Recommendation, RoofAnalysis, ScenarioEconomics, TariffSchedule } from '@/types';
import { simulate } from './dispatch';
import { economics } from './finance';
import { usageSplit, monthlyUnitsOfProfile } from './loadProfile';
import { analyzeRoof } from './roof';
import { annualSpecificYield, hourlyShape } from './solar';
import { avoidableRate, estimateDemandKva } from './tariff';
import { resolveAssumptions } from './assumptions';

export interface RecommendInput {
  load: LoadProfile;
  tariff: TariffSchedule;
  assumptions: Assumptions;
  roof: RoofAnalysis;
  roofKnown: boolean;
  demandKva: number;
  solarKwOverride?: number | null;
  batteryKwhOverride?: number | null;
}

function runScenario(inp: RecommendInput, solarKw: number, batteryKwh: number, solarOnlyRef?: ScenarioEconomics): ScenarioEconomics {
  const a = inp.assumptions;
  const battery = batteryKwh > 0 ? { capacityKwh: batteryKwh, powerKw: batteryKwh * a.batteryCRate } : null;
  const sim = simulate({ load: inp.load, solarKw, shadeLoss: inp.roof.shadeLossByMonthHour, battery, tariff: inp.tariff, assumptions: a, demandKva: inp.demandKva });
  const ref = solarOnlyRef?.sim ?? sim;
  return economics({
    key: battery ? `solar${solarKw}_bess${batteryKwh}` : `solar${solarKw}`,
    label: battery ? `Solar ${round1(solarKw)} kW + ${batteryKwh} kWh battery` : `Solar only ${round1(solarKw)} kW`,
    sim,
    solarOnlyAvoidedInr: ref.avoidedCostInr,
    solarOnlySelfPlusExportKwh: ref.annual.selfConsumedKwh + ref.annual.gridExportKwh,
    battery,
    a,
    tariffEscalationPct: inp.tariff.annualEscalationPct,
  });
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Present value of incremental benefits vs. incremental costs of a storage design
 * relative to the best solar-only design (includes any extra solar CAPEX).
 */
export function batteryBenefitCostRatio(withBattery: ScenarioEconomics, solarOnly: ScenarioEconomics, a: Assumptions): number {
  const r = a.discountRatePct / 100;
  let pvBenefit = 0;
  let pvCost = withBattery.capexInr - solarOnly.capexInr;
  withBattery.cashFlows.forEach((c, i) => {
    const s = solarOnly.cashFlows[i];
    const d = Math.pow(1 + r, i + 1);
    pvBenefit += (c.avoidedCostInr - s.avoidedCostInr) / d;
    pvCost += (c.omInr - s.omInr + c.insuranceInr - s.insuranceInr + c.replacementInr - s.replacementInr) / d;
  });
  return pvCost > 0 ? pvBenefit / pvCost : 0;
}

export function recommend(inp: RecommendInput): Recommendation {
  const a = inp.assumptions;
  const warnings: string[] = [];
  const reasons: string[] = [];
  const customerMessages: string[] = [];
  const annualLoad = monthlyUnitsOfProfile(inp.load) * 12;

  // ---- Solar capacity limit ----
  const sanctionedCap = inp.demandKva * a.maxSolarToSanctionedLoadRatio;
  const yieldKwp = annualSpecificYield(a) * (1 - inp.roof.annualShadeLossPct / 100);
  // Without a measured roof, size against consumption only (needs survey).
  const consumptionCap = yieldKwp > 0 ? annualLoad / yieldKwp : 0;
  let maxSolarKw: number;
  let solarLimitReason: string;
  if (inp.roofKnown) {
    maxSolarKw = Math.min(inp.roof.capacityKw, sanctionedCap);
    solarLimitReason = inp.roof.capacityKw <= sanctionedCap ? 'Limited by usable roof area' : 'Limited by sanctioned load (illustrative regulatory cap)';
  } else {
    maxSolarKw = Math.min(consumptionCap, sanctionedCap);
    solarLimitReason = 'Roof not yet measured — sized against consumption and sanctioned load';
    warnings.push('Roof size unknown: capacity is a placeholder until an engineer measures the roof.');
  }
  maxSolarKw = Math.max(0, Math.floor(maxSolarKw * 10) / 10);

  // ---- Solar sizing (maximise lifecycle NPV, never above the cap) ----
  const step = Math.max(1, a.solarSizingStepKw);
  const sizes = new Set<number>();
  for (let k = step; k < maxSolarKw; k += step) sizes.add(k);
  if (maxSolarKw >= 1) sizes.add(maxSolarKw);
  const sizing: { kw: number; npv: number; econ: ScenarioEconomics }[] = [];
  if (inp.solarKwOverride && inp.solarKwOverride > 0) {
    const e = runScenario(inp, inp.solarKwOverride, 0);
    sizing.push({ kw: inp.solarKwOverride, npv: e.customerPpaNpvInr, econ: e });
    reasons.push(`Solar capacity fixed by staff at ${inp.solarKwOverride} kW.`);
    if (inp.roofKnown && inp.solarKwOverride > inp.roof.capacityKw + 0.01) warnings.push(`Selected solar capacity exceeds the modelled roof capacity of ${round1(inp.roof.capacityKw)} kW.`);
  } else {
    for (const kw of [...sizes].sort((x, y) => x - y)) {
      const e = runScenario(inp, kw, 0);
      sizing.push({ kw, npv: e.customerPpaNpvInr, econ: e });
    }
  }
  const usage = usageSplit(inp.load);
  const usagePattern: Recommendation['usagePattern'] = usage.day >= 0.55 ? 'daytime' : usage.evening >= 0.3 ? 'evening' : 'mixed';

  const baseline = sizing[0]?.econ.sim.baselineBill.totalInr ?? 0;
  const effectiveRate = annualLoad > 0 ? baseline / annualLoad : 0;
  let wsum = 0;
  let wr = 0;
  for (let m = 0; m < 12; m++) hourlyShape(m).forEach((f, h) => {
    wsum += f;
    wr += f * avoidableRate(inp.tariff, h);
  });
  const avoidableSolarRate = wsum > 0 ? wr / wsum : 0;

  const roofConf = inp.roof.confidence;
  const loadConf: Confidence = inp.load.kind === 'uploaded_interval' ? 'high' : inp.load.kind === 'synthetic_sample' ? 'medium' : 'medium';
  const order: Confidence[] = ['low', 'medium', 'high'];
  const confidence: Confidence = order[Math.min(order.indexOf(roofConf), order.indexOf(loadConf))];

  const base: Omit<Recommendation, 'type' | 'chosen' | 'solarOnly' | 'batteryOptions' | 'savingsRangeMonthlyInr'> = {
    solarSizing: sizing.map(({ kw, npv }) => ({ kw, npv })),
    maxSolarKw,
    solarLimitReason,
    reasons,
    customerMessages,
    usagePattern,
    baselineMonthlyBillInr: baseline / 12,
    effectiveRateInrPerKwh: effectiveRate,
    avoidableSolarRateInrPerKwh: avoidableSolarRate,
    confidence,
    warnings,
  };

  if (sizing.length === 0 || maxSolarKw < 1 && !inp.solarKwOverride) {
    customerMessages.push('We could not identify enough usable roof space for a rooftop solar system. Our engineer can check other options on site.');
    reasons.push('No viable solar capacity under current roof / sanctioned-load limits.');
    return { ...base, type: inp.roofKnown ? 'not_viable' : 'needs_survey', chosen: null, solarOnly: null, batteryOptions: [], savingsRangeMonthlyInr: [0, 0] };
  }

  const best = sizing.reduce((x, y) => (y.npv > x.npv ? y : x));
  const solarOnly = best.econ;
  if (!inp.solarKwOverride) reasons.push(`Solar sized at ${round1(best.kw)} kW (max ${round1(maxSolarKw)} kW): highest customer net benefit (PV, under a cost-reflective PPA) among ${sizing.length} sizes evaluated. ${solarLimitReason}.`);
  const so = solarOnly.sim.annual;
  const pct = (v: number) => (so.solarKwh > 0 ? Math.round((v / so.solarKwh) * 100) : 0);
  reasons.push(
    `Solar-only: ${pct(so.selfConsumedKwh)}% of solar used on site, ${pct(so.gridExportKwh)}% exported at ₹${inp.tariff.exportCompensationInrPerKwh}/unit` +
      (so.curtailedKwh > 0 ? `, ${pct(so.curtailedKwh)}% curtailed (export limit ${inp.tariff.exportLimitKw} kW).` : '.'),
  );

  // ---- Battery comparison ----
  // Each battery size is co-optimised with the solar size (a battery can make extra
  // solar worthwhile), then compared against the best solar-only design.
  const candidates = inp.batteryKwhOverride != null ? [inp.batteryKwhOverride].filter((k) => k > 0) : a.batteryCandidatesKwh.filter((k) => k > 0);
  const forced = inp.batteryKwhOverride != null && inp.batteryKwhOverride > 0;
  const solarSizes = sizing.map((x) => x);
  const batteryOptions = candidates.map((k) => {
    let bestOpt: ScenarioEconomics | null = null;
    for (const sz of solarSizes) {
      const opt = runScenario(inp, sz.kw, k, sz.econ);
      if (!bestOpt || opt.customerPpaNpvInr > bestOpt.customerPpaNpvInr) bestOpt = opt;
    }
    return bestOpt as ScenarioEconomics;
  });
  let chosen: ScenarioEconomics = solarOnly;
  let bestDelta = 0;
  for (const opt of batteryOptions) {
    const delta = opt.customerPpaNpvInr - solarOnly.customerPpaNpvInr;
    const bcr = batteryBenefitCostRatio(opt, solarOnly, a);
    reasons.push(
      `${opt.batteryKwh} kWh / ${round1(opt.batteryKw)} kW battery (with ${round1(opt.solarKw)} kW solar): incremental customer NPV ₹${Math.round(delta).toLocaleString('en-IN')}, incremental lifecycle benefit/cost ${bcr.toFixed(2)}, ${Math.round(opt.sim.annual.batteryCycles)} cycles/yr.`,
    );
    if (forced || (delta > bestDelta && bcr >= a.minBatteryBenefitCostRatio)) {
      chosen = opt;
      bestDelta = delta;
      if (forced) reasons.push(`Battery size fixed by staff at ${opt.batteryKwh} kWh.`);
    }
  }

  const hasBattery = chosen.batteryKwh > 0;
  if (!hasBattery) {
    reasons.push(
      batteryOptions.length
        ? `Recommend solar-only: no battery size both improved the customer's net benefit and met the lifecycle benefit/cost threshold of ${a.minBatteryBenefitCostRatio.toFixed(2)}.`
        : 'Battery not evaluated.',
    );
  } else {
    reasons.push(`Recommend ${chosen.batteryKwh} kWh battery: largest improvement in customer net benefit among sizes meeting the benefit/cost threshold (not simply the largest battery).`);
  }

  // ---- Plain-language messages ----
  if (usagePattern === 'daytime') customerMessages.push('Your business uses most of its electricity during the day. Rooftop solar may help reduce grid purchases.');
  else if (usagePattern === 'evening') customerMessages.push('Your business uses considerable electricity in the evening. We checked whether battery storage would save additional money.');
  else customerMessages.push('Your business uses electricity both during the day and in the evening. Solar can cover part of your daytime use.');
  customerMessages.push('We recommend rooftop solar because it can supply part of the electricity your factory uses during daylight hours.');
  if (hasBattery) customerMessages.push('Battery storage may help reduce electricity purchases during expensive evening hours.');
  else customerMessages.push('Battery storage is not currently recommended because the additional cost may exceed the estimated savings.');
  if (!inp.roofKnown) customerMessages.push('We do not yet know your roof size, so our engineer will confirm how much solar can fit.');

  const netMonthly = chosen.customerPpa.monthlyNetSavingsInr;
  const band = confidence === 'high' ? 0.08 : confidence === 'medium' ? 0.15 : 0.25;
  const savingsRange: [number, number] = [Math.max(0, netMonthly * (1 - band)), Math.max(0, netMonthly * (1 + band * 0.6))];

  let type: Recommendation['type'] = hasBattery ? 'solar_battery' : 'solar_only';
  if (!inp.roofKnown) type = 'needs_survey';
  if (chosen.customerPpaNpvInr <= 0 && chosen.lifecycleNpvInr <= 0) {
    type = 'not_viable';
    warnings.push('Estimated savings do not cover system costs under current assumptions.');
  }
  if (chosen.customerPpa.monthlyNetSavingsInr <= 0) warnings.push('PPA payments exceed avoided electricity cost under current assumptions — review PPA rate.');

  return { ...base, type, chosen, solarOnly, batteryOptions, savingsRangeMonthlyInr: savingsRange };
}

export interface CustomerAssessment {
  assumptions: Assumptions;
  roof: RoofAnalysis;
  recommendation: Recommendation;
  demandKva: number;
  modelMonthlyBillInr: number;
  statedMonthlyBillInr: number | null;
}

export function customerDemandKva(c: Customer): number {
  if (c.bill.sanctionedLoadKva && c.bill.sanctionedLoadKva > 0) return c.bill.sanctionedLoadKva;
  const units = monthlyUnitsOfProfile(c.loadProfile);
  const hours = (c.business.operatingEndHour - c.business.operatingStartHour + 24) % 24 || 24;
  return estimateDemandKva(units, hours, c.business.workingDaysPerWeek);
}

/** Full assessment for a customer record — the single source of truth used by every screen. */
export function assessCustomer(c: Customer, global: Assumptions): CustomerAssessment {
  const assumptions = resolveAssumptions(global, c.assumptionOverrides);
  const roof = analyzeRoof(c.roof);
  const demandKva = customerDemandKva(c);
  const recommendation = recommend({
    load: c.loadProfile,
    tariff: c.tariff,
    assumptions,
    roof,
    roofKnown: c.roof.polygon.length >= 3,
    demandKva,
    solarKwOverride: c.design.solarKwOverride,
    batteryKwhOverride: c.design.batteryKwhOverride,
  });
  return {
    assumptions,
    roof,
    recommendation,
    demandKva,
    modelMonthlyBillInr: recommendation.baselineMonthlyBillInr,
    statedMonthlyBillInr: c.bill.monthlyBillInr,
  };
}
