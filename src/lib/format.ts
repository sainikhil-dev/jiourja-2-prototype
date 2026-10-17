const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const numFmt1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

/** ₹1,18,000 — Indian digit grouping. */
export function inr(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}₹${inrFmt.format(Math.abs(Math.round(v)))}`;
}

/** ₹1.18 lakh / ₹2.4 crore for large numbers. */
export function inrShort(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e7) return `${sign}₹${numFmt1.format(a / 1e7)} crore`;
  if (a >= 1e5) return `${sign}₹${numFmt1.format(a / 1e5)} lakh`;
  return inr(v);
}

/** Round to a friendly figure for customer-facing ranges (nearest ₹500 / ₹1,000). */
export function roundFriendly(v: number): number {
  const step = Math.abs(v) >= 20000 ? 1000 : 500;
  return Math.round(v / step) * step;
}

export function num(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
}

export function units(v: number | null | undefined): string {
  return `${num(v)} units`;
}

export function pct(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

export function dateLabel(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTimeLabel(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

/** True when an ISO timestamp falls in the same calendar month/year as `ref` (default: today). */
export function sameMonth(iso: string | undefined, ref: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function hourLabel(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  const suffix = hh < 12 ? 'AM' : 'PM';
  const v = hh % 12 === 0 ? 12 : hh % 12;
  return `${v} ${suffix}`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
