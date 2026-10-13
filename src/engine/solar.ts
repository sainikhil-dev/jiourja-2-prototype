import type { Assumptions } from '@/types';

export const PUNE_LATITUDE = 18.52;
/** Solar noon in IST for Pune (≈ longitude 73.85°E vs IST meridian 82.5°E). */
export const SOLAR_NOON_IST = 12.55;

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function midMonthDoy(month: number): number {
  let d = 0;
  for (let m = 0; m < month; m++) d += DAYS_IN_MONTH[m];
  return d + 15;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function declinationDeg(doy: number): number {
  return 23.45 * Math.sin(rad((360 / 365) * (284 + doy)));
}

/** Day length in hours for a latitude and day of year. */
export function dayLengthHours(lat: number, doy: number): number {
  const d = rad(declinationDeg(doy));
  const x = -Math.tan(rad(lat)) * Math.tan(d);
  return (2 * deg(Math.acos(Math.max(-1, Math.min(1, x))))) / 15;
}

/**
 * Sun position. Azimuth is degrees clockwise from north.
 * @param clockHour local IST clock time (fractional hours)
 */
export function sunPosition(lat: number, doy: number, clockHour: number): { elevationDeg: number; azimuthDeg: number } {
  const decl = rad(declinationDeg(doy));
  const phi = rad(lat);
  const H = rad(15 * (clockHour - SOLAR_NOON_IST));
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const cosAz = (Math.sin(decl) - Math.sin(el) * Math.sin(phi)) / (Math.cos(el) * Math.cos(phi));
  let az = deg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (H > 0) az = 360 - az;
  return { elevationDeg: deg(el), azimuthDeg: az };
}

/**
 * Fraction of a month's typical daily generation falling in each clock hour.
 * Uses a sine-shaped irradiance between sunrise and sunset, integrated per hour.
 */
export function hourlyShape(month: number, lat = PUNE_LATITUDE): number[] {
  const doy = midMonthDoy(month);
  const len = dayLengthHours(lat, doy);
  const rise = SOLAR_NOON_IST - len / 2;
  const out = new Array(24).fill(0);
  const steps = 12;
  let total = 0;
  for (let h = 0; h < 24; h++) {
    let s = 0;
    for (let k = 0; k < steps; k++) {
      const t = h + (k + 0.5) / steps;
      const x = (t - rise) / len;
      if (x > 0 && x < 1) s += Math.pow(Math.sin(Math.PI * x), 1.3);
    }
    out[h] = s;
    total += s;
  }
  return out.map((v) => (total > 0 ? v / total : 0));
}

/** AC energy per kWp for a typical day of each month, by hour (12 x 24), before shading. */
export function solarProfilePerKw(a: Assumptions, lat = PUNE_LATITUDE): number[][] {
  return Array.from({ length: 12 }, (_, m) => {
    const daily = a.specificYieldKwhPerKwpDay[m] * a.performanceRatio;
    return hourlyShape(m, lat).map((f) => f * daily);
  });
}

/** Annual specific yield (kWh/kWp/yr) before shading. */
export function annualSpecificYield(a: Assumptions): number {
  return a.specificYieldKwhPerKwpDay.reduce((s, v, m) => s + v * a.performanceRatio * DAYS_IN_MONTH[m], 0);
}
