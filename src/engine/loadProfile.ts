import type { Business, LoadProfile } from '@/types';

export const DEFAULT_MONTHLY_FACTOR = [0.97, 0.98, 1.03, 1.06, 1.06, 1.0, 0.97, 0.97, 0.98, 1.0, 0.99, 0.99];

export function workingDaysPerMonth(daysPerWeek: number): number {
  return (daysPerWeek * 52) / 12;
}

export function holidaysPerMonth(daysPerWeek: number): number {
  return ((7 - daysPerWeek) * 52) / 12;
}

/** Average monthly energy (kWh) implied by a profile. */
export function monthlyUnitsOfProfile(p: LoadProfile): number {
  const w = p.workdayKw.reduce((a, b) => a + b, 0);
  const h = p.holidayKw.reduce((a, b) => a + b, 0);
  const mf = p.monthlyFactor.reduce((a, b) => a + b, 0) / 12;
  return (w * workingDaysPerMonth(p.workingDaysPerWeek) + h * holidaysPerMonth(p.workingDaysPerWeek)) * mf;
}

/** Scale a profile so that its average monthly energy equals `units`. */
export function scaleProfile(p: LoadProfile, units: number): LoadProfile {
  const cur = monthlyUnitsOfProfile(p);
  if (cur <= 0) return p;
  const k = units / cur;
  return { ...p, workdayKw: p.workdayKw.map((v) => v * k), holidayKw: p.holidayKw.map((v) => v * k) };
}

function inOperating(h: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

/**
 * Build an ESTIMATED hourly shape from the customer's stated operating hours.
 * A monthly bill does not reveal the real interval profile — this is clearly labelled.
 */
export function estimateProfileFromBill(business: Pick<Business, 'operatingStartHour' | 'operatingEndHour' | 'workingDaysPerWeek' | 'industry'>, monthlyUnits: number): LoadProfile {
  const base = business.industry === 'food_processing' || business.industry === 'plastics' ? 0.15 : 0.07;
  const shape = Array.from({ length: 24 }, (_, h) => {
    if (!inOperating(h, business.operatingStartHour, business.operatingEndHour)) return base;
    let v = 1;
    if (h === business.operatingStartHour) v = 0.7; // ramp-up
    if (h === 13) v *= 0.85; // lunch dip
    return v;
  });
  const p: LoadProfile = {
    kind: 'estimated_from_bill',
    label: 'Estimated from monthly bill and stated working hours (not measured)',
    workdayKw: shape,
    holidayKw: shape.map(() => base),
    workingDaysPerWeek: business.workingDaysPerWeek,
    monthlyFactor: DEFAULT_MONTHLY_FACTOR,
  };
  return scaleProfile(p, monthlyUnits);
}

export interface CsvParseResult {
  ok: boolean;
  workdayKw: number[];
  holidayKw: number[];
  rows: number;
  intervalMinutes: number | null;
  days: number;
  warnings: string[];
  error?: string;
}

function parseTime(s: string): { hour: number; minute: number; dow: number | null } | null {
  const t = s.trim().replace(/"/g, '');
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return { hour: Number(iso[4]), minute: Number(iso[5]), dow: d.getDay() };
  }
  const dmy = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[ T](\d{1,2}):(\d{2})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return { hour: Number(dmy[4]), minute: Number(dmy[5]), dow: d.getDay() };
  }
  const hm = t.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return { hour: Number(hm[1]), minute: Number(hm[2]), dow: null };
  if (/^\d{1,2}$/.test(t)) return { hour: Number(t), minute: 0, dow: null };
  return null;
}

/**
 * Parse interval consumption data. Accepted formats (header row required):
 *   time,kW              (24 hourly or 96 quarter-hourly rows for a typical day)
 *   timestamp,kW         (many days, e.g. 2025-03-01 09:15,42.1)
 *   timestamp,kWh        (energy per interval — converted to average kW)
 * Rows on Sundays are treated as non-working days.
 */
export function parseIntervalCsv(text: string): CsvParseResult {
  const fail = (error: string): CsvParseResult => ({ ok: false, workdayKw: [], holidayKw: [], rows: 0, intervalMinutes: null, days: 0, warnings: [], error });
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return fail('The file has no data rows.');
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
  const tIdx = header.findIndex((h) => /time|hour|date|interval/.test(h));
  const kwIdx = header.findIndex((h) => /^kw$|kw\b|demand|power/.test(h) && !/kwh/.test(h));
  const kwhIdx = header.findIndex((h) => /kwh|energy|units/.test(h));
  if (tIdx < 0) return fail('Could not find a time/timestamp column in the header.');
  if (kwIdx < 0 && kwhIdx < 0) return fail('Could not find a kW or kWh column in the header.');
  const recs: { hour: number; minute: number; dow: number | null; v: number }[] = [];
  const warnings: string[] = [];
  let bad = 0;
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const t = parseTime(cols[tIdx] ?? '');
    const raw = Number((cols[kwIdx >= 0 ? kwIdx : kwhIdx] ?? '').replace(/"/g, ''));
    if (!t || !Number.isFinite(raw) || raw < 0 || t.hour > 23) {
      bad++;
      continue;
    }
    recs.push({ ...t, v: raw });
  }
  if (recs.length === 0) return fail('No valid rows could be read.');
  if (bad > 0) warnings.push(`${bad} row(s) were skipped because they could not be read.`);
  // Detect interval length from distinct minutes.
  const minutes = new Set(recs.map((r) => r.minute));
  const intervalMinutes = minutes.size >= 4 ? 15 : minutes.size === 2 ? 30 : 60;
  const toKw = (v: number) => (kwIdx >= 0 ? v : v * (60 / intervalMinutes));
  const sum = { w: new Array(24).fill(0), h: new Array(24).fill(0) };
  const cnt = { w: new Array(24).fill(0), h: new Array(24).fill(0) };
  for (const r of recs) {
    const key = r.dow === 0 ? 'h' : 'w';
    sum[key][r.hour] += toKw(r.v);
    cnt[key][r.hour] += 1;
  }
  const workdayKw = sum.w.map((s, h) => (cnt.w[h] ? s / cnt.w[h] : NaN));
  const missing = workdayKw.filter((v) => Number.isNaN(v)).length;
  if (missing > 0) {
    if (missing > 6) return fail(`Working-day data is missing for ${missing} hours of the day.`);
    warnings.push(`${missing} hour(s) had no data and were filled from neighbouring hours.`);
    for (let h = 0; h < 24; h++) if (Number.isNaN(workdayKw[h])) workdayKw[h] = workdayKw[(h + 23) % 24] || workdayKw[(h + 1) % 24] || 0;
  }
  const hasHoliday = cnt.h.some((c) => c > 0);
  const holidayKw = hasHoliday ? sum.h.map((s, h) => (cnt.h[h] ? s / cnt.h[h] : workdayKw[h] * 0.1)) : workdayKw.map((v) => Math.min(...workdayKw) || v * 0.1);
  if (!hasHoliday) warnings.push('No Sunday data found — non-working days assumed to run at base load.');
  const days = new Set(recs.filter((r) => r.dow !== null).map((r, i) => `${r.dow}-${Math.floor(i / (1440 / intervalMinutes))}`)).size || 1;
  return { ok: true, workdayKw, holidayKw, rows: recs.length, intervalMinutes, days, warnings };
}

/** Fraction of working-day energy in daytime (9–17) and evening (17–24) hours. */
export function usageSplit(p: LoadProfile): { day: number; evening: number; night: number } {
  const total = p.workdayKw.reduce((a, b) => a + b, 0) || 1;
  const sum = (a: number, b: number) => p.workdayKw.slice(a, b).reduce((x, y) => x + y, 0);
  return { day: sum(9, 17) / total, evening: sum(17, 24) / total, night: (sum(0, 9)) / total };
}
