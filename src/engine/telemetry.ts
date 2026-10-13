import type { Assumptions, Customer, ServiceTicket, Telemetry, TelemetryMonth } from '@/types';
import { mulberry32, simulate } from './dispatch';
import { resolveAssumptions } from './assumptions';
import { customerDemandKva } from './recommend';
import { analyzeRoof } from './roof';

/**
 * SIMULATED monitoring data for active installations.
 * There is no live hardware telemetry in this prototype: these values are the
 * engine's simulation of the installed system with deterministic noise, and
 * every screen that shows them labels them as simulated.
 */

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function telemetryFor(c: Customer, global: Assumptions, tickets: ServiceTicket[], today = new Date()): Telemetry | null {
  const inst = c.installation;
  if (c.stage !== 'system_active' || !inst.commissionedDate || !inst.solarKw) return null;
  const a = resolveAssumptions(global, c.assumptionOverrides);
  const roof = analyzeRoof(c.roof);
  const battery = inst.batteryKwh && inst.batteryKwh > 0 ? { capacityKwh: inst.batteryKwh, powerKw: inst.batteryKw ?? inst.batteryKwh * a.batteryCRate } : null;
  const sim = simulate({ load: c.loadProfile, solarKw: inst.solarKw, shadeLoss: roof.shadeLossByMonthHour, battery, tariff: c.tariff, assumptions: a, demandKva: customerDemandKva(c) });
  const rnd = mulberry32(c.telemetrySeed ?? 1);
  const start = new Date(inst.commissionedDate);
  const months: TelemetryMonth[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1); // first full month after commissioning
  const end = new Date(today.getFullYear(), today.getMonth(), 1);
  const openAlert = tickets.some((t) => t.customerId === c.id && t.category === 'system_alert' && !['resolved', 'closed'].includes(t.status));
  const ppa = inst.planType === 'ppa';
  const emiVal = inst.emiInr ?? 0;
  const amc = (inst.solarKw * a.solarOmInrPerKwYr + (battery ? battery.capacityKwh * a.batteryCapexInrPerKwh * a.batteryOmPctCapexYr / 100 : 0)) / 12;
  while (cursor < end) {
    const m = cursor.getMonth();
    const mm = sim.monthly[m];
    const weather = 0.9 + rnd() * 0.15;
    const availability = 97 + rnd() * 3;
    const f = weather * (availability / 100);
    const solarKwh = mm.solarKwh * f;
    const self = mm.selfConsumedKwh * f;
    const batt = mm.batteryDeliveredKwh * f;
    const exp = mm.gridExportKwh * f;
    const avoided = (mm.baselineBillInr - mm.postBillInr) * f;
    const payment = ppa ? (inst.ppaRateInrPerKwh ?? 0) * (self + batt + exp) : emiVal + amc;
    months.push({
      month: monthKey(cursor),
      solarKwh,
      consumptionKwh: mm.loadKwh * (0.97 + rnd() * 0.06),
      gridImportKwh: Math.max(0, mm.loadKwh - self - batt),
      batteryDeliveredKwh: batt,
      avoidedCostInr: avoided,
      paymentInr: payment,
      netSavingsInr: avoided - payment,
      availabilityPct: availability,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const recent = months.slice(-12);
  // A representative day for the current month, scaled by today's simulated weather.
  const day = sim.sampleDays[today.getMonth()] ?? sim.sampleDays[0] ?? [];
  const todayWeather = 0.85 + rnd() * 0.2;
  const usable = battery ? battery.capacityKwh : 0;
  const todaySeries = day.map((iv, hour) => {
    const solarKw = iv.solar * todayWeather * (openAlert ? 0.9 : 1);
    const charge = Math.min(iv.solarToBattery, solarKw) + iv.gridToBattery;
    const batteryKw = iv.batteryToLoad - charge;
    // Keep the displayed flows balanced: load = solar + battery + grid (grid negative = export).
    return { hour, solarKw, loadKw: iv.load, gridKw: iv.load - solarKw - batteryKw, batteryKw, socPct: battery && usable > 0 ? (iv.socKwh / usable) * 100 : null };
  });
  const last = recent[recent.length - 1];
  const nextPay = new Date(today.getFullYear(), today.getMonth() + 1, 5);
  const outstanding = (inst.outstandingMonths ?? 0) * (last?.paymentInr ?? 0);
  return {
    isSimulated: true,
    months: recent,
    today: todaySeries,
    status: openAlert ? 'attention' : 'ok',
    outstandingInr: ppa ? outstanding : 0,
    lastPaymentDate: last ? `${last.month}-05` : undefined,
    nextPaymentDate: nextPay.toISOString().slice(0, 10),
    nextPaymentInr: last?.paymentInr ?? (ppa ? 0 : emiVal + amc),
  };
}
