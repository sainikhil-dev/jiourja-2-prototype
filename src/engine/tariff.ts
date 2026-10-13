import type { BillBreakdown, TariffSchedule } from '@/types';

export function inPeriod(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // wraps midnight
}

/** Time-of-day adder (₹/kWh) applicable to an hour of day. */
export function touAdder(t: TariffSchedule, hour: number): number {
  let a = 0;
  for (const p of t.touPeriods) if (inPeriod(hour, p.startHour, p.endHour)) a += p.adderInrPerKwh;
  return a;
}

/** Variable ₹/kWh before duty at an hour (energy + wheeling + FAC + ToD). */
export function variableRate(t: TariffSchedule, hour: number): number {
  return t.energyChargeInrPerKwh + t.wheelingChargeInrPerKwh + t.fuelAdjustmentInrPerKwh + touAdder(t, hour);
}

/**
 * Marginal avoidable cost of one grid unit at a given hour, including duty.
 * Fixed / demand charges are deliberately excluded: rooftop solar does not
 * reliably reduce the billed maximum demand.
 */
export function avoidableRate(t: TariffSchedule, hour: number): number {
  return variableRate(t, hour) * (1 + t.electricityDutyPct / 100);
}

/**
 * Compute a bill from hourly grid imports.
 * @param importsByHour total kWh imported in each hour-of-day over the billing period (24 values)
 * @param demandKva billed demand (kVA) — unchanged by solar
 * @param months number of months in the billing period (fixed charges)
 * @param exportKwh energy exported, credited at the export compensation rate
 */
export function computeBill(
  t: TariffSchedule,
  importsByHour: number[],
  demandKva: number,
  months: number,
  exportKwh = 0,
): BillBreakdown {
  let units = 0;
  let tou = 0;
  for (let h = 0; h < 24; h++) {
    const kwh = importsByHour[h] ?? 0;
    units += kwh;
    tou += kwh * touAdder(t, h);
  }
  const energyInr = units * t.energyChargeInrPerKwh;
  const wheelingInr = units * t.wheelingChargeInrPerKwh;
  const fuelAdjustmentInr = units * t.fuelAdjustmentInrPerKwh;
  const fixedInr = demandKva * t.fixedDemandChargeInrPerKvaMonth * months;
  const dutyBase = energyInr + wheelingInr + fuelAdjustmentInr + tou + fixedInr;
  const dutyInr = (dutyBase * t.electricityDutyPct) / 100;
  const exportCreditInr = exportKwh * t.exportCompensationInrPerKwh;
  const totalInr = dutyBase + dutyInr - exportCreditInr;
  return { energyInr, wheelingInr, fuelAdjustmentInr, touInr: tou, fixedInr, dutyInr, exportCreditInr, totalInr };
}

export function addBills(a: BillBreakdown, b: BillBreakdown): BillBreakdown {
  return {
    energyInr: a.energyInr + b.energyInr,
    wheelingInr: a.wheelingInr + b.wheelingInr,
    fuelAdjustmentInr: a.fuelAdjustmentInr + b.fuelAdjustmentInr,
    touInr: a.touInr + b.touInr,
    fixedInr: a.fixedInr + b.fixedInr,
    dutyInr: a.dutyInr + b.dutyInr,
    exportCreditInr: a.exportCreditInr + b.exportCreditInr,
    totalInr: a.totalInr + b.totalInr,
  };
}

export const emptyBill = (): BillBreakdown => ({
  energyInr: 0,
  wheelingInr: 0,
  fuelAdjustmentInr: 0,
  touInr: 0,
  fixedInr: 0,
  dutyInr: 0,
  exportCreditInr: 0,
  totalInr: 0,
});

/**
 * Estimate monthly units from a monthly bill amount when the customer does not know
 * their units. Assumes a flat (non-ToD) average and the given demand.
 */
export function estimateUnitsFromBill(t: TariffSchedule, monthlyBillInr: number, demandKva: number): number {
  const fixedWithDuty = demandKva * t.fixedDemandChargeInrPerKvaMonth * (1 + t.electricityDutyPct / 100);
  // Average variable rate assuming a typical daytime-weighted spread of hours (8am-8pm).
  let r = 0;
  for (let h = 8; h < 20; h++) r += avoidableRate(t, h);
  r /= 12;
  return Math.max(0, (monthlyBillInr - fixedWithDuty) / r);
}

/** Rough sanctioned demand guess from monthly units when the customer does not know it. */
export function estimateDemandKva(monthlyUnits: number, operatingHoursPerDay: number, workingDays: number): number {
  const avgKw = monthlyUnits / Math.max(1, (workingDays * 52) / 12) / Math.max(4, operatingHoursPerDay);
  return Math.max(5, Math.round((avgKw * 1.35) / 0.9 / 5) * 5);
}
