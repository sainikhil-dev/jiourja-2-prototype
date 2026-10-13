import type { Assumptions, BatterySystem, EnergySimulation, ScenarioEconomics, YearCashFlow } from '@/types';

/** Standard reducing-balance EMI. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** NPV where flows[0] occurs today and flows[i] at the end of year i. */
export function npv(ratePct: number, flows: number[]): number {
  const r = ratePct / 100;
  return flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i), 0);
}

/** IRR by bisection; returns null when flows do not change sign or no root in range. */
export function irr(flows: number[]): number | null {
  const hasNeg = flows.some((f) => f < 0);
  const hasPos = flows.some((f) => f > 0);
  if (!hasNeg || !hasPos) return null;
  const f = (r: number) => flows.reduce((s, v, i) => s + v / Math.pow(1 + r, i), 0);
  let lo = -0.99;
  let hi = 1.5;
  let flo = f(lo);
  const fhi = f(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-6) return mid * 100;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return ((lo + hi) / 2) * 100;
}

export interface EconomicsInput {
  key: string;
  label: string;
  sim: EnergySimulation;
  /** Year-1 avoided cost of the same solar size without battery (to separate battery value). */
  solarOnlyAvoidedInr: number;
  solarOnlySelfPlusExportKwh: number;
  battery: BatterySystem | null;
  a: Assumptions;
  tariffEscalationPct: number;
}

export function batteryReplacementYear(a: Assumptions, annualCycles: number): number | null {
  if (annualCycles <= 0) return a.batteryCalendarLifeYrs;
  return Math.max(1, Math.min(a.batteryCalendarLifeYrs, Math.floor(a.batteryCycleLife / annualCycles)));
}

/**
 * Builds year-by-year cash flows and separates:
 *  - lifecycle (owner) economics of the system,
 *  - provider economics under a PPA (revenue is NOT profit),
 *  - customer economics under PPA and under financed ownership.
 */
export function economics(input: EconomicsInput): ScenarioEconomics {
  const { sim, battery, a } = input;
  const solarCapexInr = sim.solarKw * a.solarCapexInrPerKw;
  const batteryCapexInr = battery ? battery.capacityKwh * a.batteryCapexInrPerKwh : 0;
  const capexInr = solarCapexInr + batteryCapexInr;
  const omSolar = sim.solarKw * a.solarOmInrPerKwYr;
  const omBattery = (batteryCapexInr * a.batteryOmPctCapexYr) / 100;
  const annualOmInr = omSolar + omBattery;
  const insurance = (capexInr * a.insurancePctCapex) / 100;

  const replYear = battery && battery.capacityKwh > 0 ? batteryReplacementYear(a, sim.annual.batteryCycles) : null;
  const replCost = battery ? (batteryCapexInr * a.batteryReplacementCostPct) / 100 : 0;

  const batteryAvoided = battery ? sim.avoidedCostInr - input.solarOnlyAvoidedInr : 0;
  const solarAvoided = sim.avoidedCostInr - batteryAvoided;
  const billable1 = sim.annual.selfConsumedKwh + sim.annual.batteryDeliveredKwh + sim.annual.gridExportKwh;
  const batteryBillable = battery ? billable1 - input.solarOnlySelfPlusExportKwh : 0;
  const solarBillable = billable1 - batteryBillable;

  const N = a.analysisYears;
  const T = Math.min(a.ppaTermYears, N);
  const rows: Omit<YearCashFlow, 'ppaPaymentInr' | 'providerNetInr' | 'customerNetPpaInr' | 'customerNetLoanInr'>[] = [];
  const billable: number[] = [];
  for (let y = 1; y <= N; y++) {
    const deg = Math.pow(1 - a.solarDegradationPctYr / 100, y - 1);
    const age = replYear ? (y - 1) % replYear : y - 1;
    const fade = Math.pow(1 - a.batteryFadePctYr / 100, age);
    const esc = Math.pow(1 + input.tariffEscalationPct / 100, y - 1);
    const avoided = (solarAvoided * deg + batteryAvoided * deg * fade) * esc;
    const om = annualOmInr * Math.pow(1 + a.omEscalationPct / 100, y - 1);
    const replacement = replYear && y % replYear === 0 && y < N ? replCost : 0;
    rows.push({ year: y, avoidedCostInr: avoided, omInr: om, insuranceInr: insurance, replacementInr: replacement, capexInr: 0 });
    billable.push(solarBillable * deg + batteryBillable * deg * fade);
  }

  // Lifecycle economics (asset owner pays everything, receives avoided cost).
  const lifeFlows = [-capexInr, ...rows.map((r) => r.avoidedCostInr - r.omInr - r.insuranceInr - r.replacementInr)];
  const lifecycleNpvInr = npv(a.discountRatePct, lifeFlows);
  const projectIrrPct = irr(lifeFlows);
  const net1 = rows[0] ? rows[0].avoidedCostInr - rows[0].omInr - rows[0].insuranceInr : 0;
  const simplePaybackYears = net1 > 0 ? capexInr / net1 : null;

  // PPA: provider owns the asset for the term; customer pays per unit delivered.
  const ppaEsc = (y: number) => Math.pow(1 + a.ppaEscalationPct / 100, y - 1);
  const providerCosts = (y: number) => rows[y - 1].omInr + rows[y - 1].insuranceInr + rows[y - 1].replacementInr;
  const rh = a.providerHurdleRatePct / 100;
  let pvUnits = 0;
  let pvCosts = 0;
  for (let y = 1; y <= T; y++) {
    pvUnits += (billable[y - 1] * ppaEsc(y)) / Math.pow(1 + rh, y);
    pvCosts += providerCosts(y) / Math.pow(1 + rh, y);
  }
  const costReflective = pvUnits > 0 ? (capexInr + pvCosts) / pvUnits : 0;
  const ppaRate = a.ppaRateMode === 'manual' ? a.ppaManualRateInrPerKwh : costReflective;

  const cashFlows: YearCashFlow[] = rows.map((r, i) => {
    const y = i + 1;
    const inTerm = y <= T;
    const ppaPaymentInr = inTerm ? ppaRate * ppaEsc(y) * billable[i] : 0;
    const providerNetInr = inTerm ? ppaPaymentInr - providerCosts(y) : 0;
    // After the PPA term the system is assumed to transfer to the customer, who then bears O&M.
    const customerNetPpaInr = inTerm ? r.avoidedCostInr - ppaPaymentInr : r.avoidedCostInr - r.omInr - r.insuranceInr - r.replacementInr;
    return { ...r, ppaPaymentInr, providerNetInr, customerNetPpaInr, customerNetLoanInr: 0 };
  });
  const providerFlows = [-capexInr, ...cashFlows.slice(0, T).map((c) => c.providerNetInr)];
  const year1Payments = cashFlows[0]?.ppaPaymentInr ?? 0;
  const year1Avoided = rows[0]?.avoidedCostInr ?? 0;

  // Financed ownership.
  const down = (capexInr * a.downPaymentPct) / 100;
  const loan = capexInr - down;
  const emiInr = emi(loan, a.loanInterestPct, a.loanTenureMonths);
  let lifetimeNet = -down;
  cashFlows.forEach((c, i) => {
    const monthsInYear = Math.max(0, Math.min(12, a.loanTenureMonths - i * 12));
    c.customerNetLoanInr = c.avoidedCostInr - c.omInr - c.insuranceInr - c.replacementInr - emiInr * monthsInYear;
    lifetimeNet += c.customerNetLoanInr;
  });
  const om1 = (rows[0]?.omInr ?? 0) + insurance;

  return {
    key: input.key,
    label: input.label,
    solarKw: sim.solarKw,
    batteryKwh: battery?.capacityKwh ?? 0,
    batteryKw: battery?.powerKw ?? 0,
    sim,
    capexInr,
    solarCapexInr,
    batteryCapexInr,
    annualOmInr,
    batteryReplacementYear: replYear && replYear < N ? replYear : null,
    batteryReplacementCostInr: replCost,
    lifecycleNpvInr,
    customerPpaNpvInr: npv(a.discountRatePct, [0, ...cashFlows.map((c) => c.customerNetPpaInr)]),
    simplePaybackYears,
    projectIrrPct,
    ppaRateInrPerKwh: ppaRate,
    ppaBillableKwhYr1: billable[0] ?? 0,
    cashFlows,
    provider: {
      year1RevenueInr: year1Payments,
      year1OperatingCostInr: providerCosts(1),
      npvAtHurdleInr: npv(a.providerHurdleRatePct, providerFlows),
      irrPct: irr(providerFlows),
    },
    customerPpa: {
      upfrontDepositInr: (year1Payments / 12) * a.ppaSecurityDepositMonths,
      year1AvoidedInr: year1Avoided,
      year1PaymentsInr: year1Payments,
      year1NetSavingsInr: year1Avoided - year1Payments,
      monthlyNetSavingsInr: (year1Avoided - year1Payments) / 12,
      monthlyPaymentInr: year1Payments / 12,
      termNetSavingsInr: cashFlows.slice(0, T).reduce((s, c) => s + c.customerNetPpaInr, 0),
    },
    customerLoan: {
      installationCostInr: capexInr,
      downPaymentInr: down,
      loanAmountInr: loan,
      emiInr,
      tenureMonths: a.loanTenureMonths,
      interestPct: a.loanInterestPct,
      year1AvoidedInr: year1Avoided,
      year1OmInr: om1,
      monthlyNetDuringLoanInr: year1Avoided / 12 - emiInr - om1 / 12,
      monthlyNetAfterLoanInr: year1Avoided / 12 - om1 / 12,
      lifetimeNetSavingsInr: lifetimeNet,
    },
  };
}
