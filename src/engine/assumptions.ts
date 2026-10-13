import type { Assumptions, TariffSchedule } from '@/types';

/**
 * Illustrative default assumptions. None of these values are official tariff
 * orders or vendor quotations — they are clearly-labelled inputs that staff can
 * change in the Calculation Assumptions panel.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  // Typical daily irradiation profile for Pune (kWh/kWp/day before system losses), illustrative.
  specificYieldKwhPerKwpDay: [5.0, 5.6, 5.9, 5.9, 5.7, 4.2, 3.3, 3.5, 4.2, 4.8, 4.8, 4.7],
  performanceRatio: 0.78,
  solarDegradationPctYr: 0.5,
  solarCapexInrPerKw: 42000,
  solarOmInrPerKwYr: 600,
  batteryCandidatesKwh: [0, 20, 40, 60],
  batteryCRate: 0.5,
  roundTripEfficiency: 0.88,
  socMinPct: 10,
  socMaxPct: 95,
  batteryCapexInrPerKwh: 16000,
  batteryOmPctCapexYr: 1.5,
  batteryCycleLife: 6000,
  batteryCalendarLifeYrs: 15,
  batteryFadePctYr: 2,
  batteryReplacementCostPct: 50,
  allowGridCharging: false,
  dischargeWindows: [
    { startHour: 17, endHour: 24 },
    { startHour: 6, endHour: 9 },
  ],
  minBatteryBenefitCostRatio: 1.1,
  analysisYears: 25,
  omEscalationPct: 5,
  insurancePctCapex: 0.3,
  discountRatePct: 10,
  providerHurdleRatePct: 12,
  ppaTermYears: 15,
  ppaRateMode: 'cost_reflective',
  ppaManualRateInrPerKwh: 5.5,
  ppaEscalationPct: 0,
  ppaSecurityDepositMonths: 3,
  loanInterestPct: 10.5,
  loanTenureMonths: 60,
  downPaymentPct: 20,
  maxSolarToSanctionedLoadRatio: 1.0,
  solarSizingStepKw: 5,
};

/**
 * Illustrative LT industrial tariff structure loosely shaped like a Maharashtra
 * DISCOM bill. Values are NOT taken from a tariff order and must be replaced
 * with the customer's actual tariff during the commercial assessment.
 */
export const ILLUSTRATIVE_PUNE_LT_INDUSTRIAL: TariffSchedule = {
  name: 'Illustrative LT Industrial (Pune) — not an official tariff',
  isIllustrative: true,
  energyChargeInrPerKwh: 7.6,
  wheelingChargeInrPerKwh: 1.17,
  fuelAdjustmentInrPerKwh: 0.35,
  fixedDemandChargeInrPerKvaMonth: 530,
  electricityDutyPct: 7.5,
  touPeriods: [
    { label: 'Solar-hours rebate', startHour: 9, endHour: 17, adderInrPerKwh: -0.8 },
    { label: 'Evening peak', startHour: 17, endHour: 24, adderInrPerKwh: 1.3 },
    { label: 'Night off-peak', startHour: 0, endHour: 6, adderInrPerKwh: -1.0 },
  ],
  exportCompensationInrPerKwh: 2.7,
  exportLimitKw: null,
  annualEscalationPct: 3,
};

export function resolveAssumptions(global: Assumptions, overrides: Partial<Assumptions> = {}): Assumptions {
  return { ...global, ...overrides };
}

/** Short stable hash so proposals can show which assumption set produced them. */
export function hashAssumptions(a: Assumptions, t: TariffSchedule, extra = ''): string {
  const s = JSON.stringify([a, t, extra]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
