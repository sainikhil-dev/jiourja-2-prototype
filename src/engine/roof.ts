import type { Confidence, Point, RoofAnalysis, RoofAssessment, ShadeObstacle } from '@/types';
import { DAYS_IN_MONTH, hourlyShape, midMonthDoy, PUNE_LATITUDE, sunPosition } from './solar';

/**
 * Simplified geometric roof & shade model.
 * - Roof outline and obstacles are in metres on a flat plane (x east, y south).
 * - Shadows are the convex hull of an obstacle's footprint and the footprint
 *   translated by (height / tan(sun elevation)) away from the sun.
 * - Panels are modelled flat for layout; shading loss is the fraction of panel
 *   sample points in shadow weighted by obstacle severity.
 * This is a transparent screening model, not a substitute for an engineer's
 * on-site shading measurement.
 */

export const OBSTACLE_CLEARANCE_M = 0.6;
export const HEAVY_SHADE_THRESHOLD = 0.25;

export function polygonArea(pts: Point[]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 1e-12) + a.x) inside = !inside;
  }
  return inside;
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

export function distToPolygonEdge(p: Point, poly: Point[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, distToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  return d;
}

export function rectPolygon(lengthM: number, widthM: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: lengthM, y: 0 },
    { x: lengthM, y: widthM },
    { x: 0, y: widthM },
  ];
}

export function convexHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function obstacleCorners(o: ShadeObstacle): Point[] {
  return [
    { x: o.x, y: o.y },
    { x: o.x + o.w, y: o.y },
    { x: o.x + o.w, y: o.y + o.h },
    { x: o.x, y: o.y + o.h },
  ];
}

/** Shadow polygon cast by an obstacle for a sun position; null when no shadow. */
export function shadowPolygon(o: ShadeObstacle, elevationDeg: number, azimuthDeg: number, maxLenM = 60): Point[] | null {
  if (o.heightM <= 0 || o.severity <= 0 || elevationDeg <= 1) return null;
  const len = Math.min(maxLenM, o.heightM / Math.tan((elevationDeg * Math.PI) / 180));
  const az = (azimuthDeg * Math.PI) / 180;
  // Shadow points away from the sun. Sun east component = sin(az), north = cos(az); y axis points south.
  const dx = -Math.sin(az) * len;
  const dy = Math.cos(az) * len;
  const base = obstacleCorners(o);
  return convexHull([...base, ...base.map((p) => ({ x: p.x + dx, y: p.y + dy }))]);
}

export function shadowsAt(roof: RoofAssessment, doy: number, clockHour: number, lat = PUNE_LATITUDE) {
  const sun = sunPosition(lat, doy, clockHour);
  const polys = roof.obstacles
    .map((o) => ({ o, poly: shadowPolygon(o, sun.elevationDeg, sun.azimuthDeg) }))
    .filter((s): s is { o: ShadeObstacle; poly: Point[] } => s.poly !== null);
  return { sun, polys };
}

function inObstacle(p: Point, obstacles: ShadeObstacle[], clearance: number): boolean {
  for (const o of obstacles) {
    if (!o.onRoof) continue;
    const c = o.kind === 'access_path' ? 0 : clearance;
    if (p.x >= o.x - c && p.x <= o.x + o.w + c && p.y >= o.y - c && p.y <= o.y + o.h + c) return true;
  }
  return false;
}

export function isUsablePoint(p: Point, roof: RoofAssessment): boolean {
  return (
    pointInPolygon(p, roof.polygon) &&
    distToPolygonEdge(p, roof.polygon) >= roof.setbackM &&
    !inObstacle(p, roof.obstacles, Math.max(OBSTACLE_CLEARANCE_M, roof.walkwayM))
  );
}

function bbox(poly: Point[]) {
  return {
    minX: Math.min(...poly.map((p) => p.x)),
    maxX: Math.max(...poly.map((p) => p.x)),
    minY: Math.min(...poly.map((p) => p.y)),
    maxY: Math.max(...poly.map((p) => p.y)),
  };
}

type PanelRect = { x: number; y: number; w: number; h: number };

function panelFits(r: PanelRect, roof: RoofAssessment): boolean {
  const e = 0.01;
  const xs = [r.x + e, r.x + r.w / 2, r.x + r.w - e];
  const ys = [r.y + e, r.y + r.h / 2, r.y + r.h - e];
  for (const x of xs) for (const y of ys) if (!isUsablePoint({ x, y }, roof)) return false;
  return true;
}

export function layoutPanels(roof: RoofAssessment): PanelRect[] {
  if (roof.polygon.length < 3) return [];
  const b = bbox(roof.polygon);
  const tryLayout = (pw: number, ph: number): PanelRect[] => {
    const out: PanelRect[] = [];
    const startX = b.minX + roof.setbackM;
    const startY = b.minY + roof.setbackM;
    for (let y = startY; y + ph <= b.maxY - roof.setbackM + 1e-9; y += ph + roof.panel.rowGapM) {
      for (let x = startX; x + pw <= b.maxX - roof.setbackM + 1e-9; x += pw + 0.02) {
        const r = { x, y, w: pw, h: ph };
        if (panelFits(r, roof)) out.push(r);
      }
    }
    return out;
  };
  const portrait = tryLayout(roof.panel.widthM, roof.panel.lengthM);
  const landscape = tryLayout(roof.panel.lengthM, roof.panel.widthM);
  return landscape.length > portrait.length ? landscape : portrait;
}

/** Fraction of a panel in shadow (0..1) weighted by the darkest overlapping obstacle. */
function panelShadeFraction(r: PanelRect, shadows: { o: ShadeObstacle; poly: Point[] }[]): number {
  if (shadows.length === 0) return 0;
  const pts: Point[] = [
    { x: r.x + r.w * 0.15, y: r.y + r.h * 0.15 },
    { x: r.x + r.w * 0.85, y: r.y + r.h * 0.15 },
    { x: r.x + r.w * 0.5, y: r.y + r.h * 0.5 },
    { x: r.x + r.w * 0.15, y: r.y + r.h * 0.85 },
    { x: r.x + r.w * 0.85, y: r.y + r.h * 0.85 },
  ];
  let s = 0;
  for (const p of pts) {
    let sev = 0;
    for (const sh of shadows) if (sev < sh.o.severity && pointInPolygon(p, sh.poly)) sev = sh.o.severity;
    s += sev;
  }
  // A partially shaded crystalline module loses more than its shaded area (bypass diodes); use a 1.5x penalty, capped.
  return Math.min(1, (s / pts.length) * 1.5);
}

export interface ShadeMatrix {
  perPanel: number[][][]; // panel -> month -> hour fraction
  weights: number[][]; // month -> hour generation weight (days * shape)
}

function shadeMatrix(roof: RoofAssessment, panels: PanelRect[], lat: number): ShadeMatrix {
  const weights: number[][] = [];
  const perPanel: number[][][] = panels.map(() => []);
  for (let m = 0; m < 12; m++) {
    const shape = hourlyShape(m, lat);
    weights.push(shape.map((f) => f * DAYS_IN_MONTH[m]));
    const doy = midMonthDoy(m);
    const hourShadows = shape.map((f, h) => (f > 0 ? shadowsAt(roof, doy, h + 0.5, lat).polys : []));
    panels.forEach((p, i) => {
      perPanel[i].push(hourShadows.map((sh, h) => (shape[h] > 0 ? panelShadeFraction(p, sh) : 0)));
    });
  }
  return { perPanel, weights };
}

export function roofConfidence(roof: RoofAssessment): { confidence: Confidence; reasons: string[] } {
  const reasons: string[] = [];
  if (roof.verified) {
    reasons.push('Roof assessment verified by JioUrja staff.');
    return { confidence: 'high', reasons };
  }
  if (roof.polygon.length < 3) {
    reasons.push('Roof size not yet provided — an engineer will measure it.');
    return { confidence: 'low', reasons };
  }
  let score = 1;
  if (roof.method === 'map') reasons.push('Roof outline marked on map imagery by the customer (approximate).');
  if (roof.method === 'manual') reasons.push('Roof size entered as approximate length × width.');
  if (roof.method === 'staff_drawn' || roof.method === 'sample') {
    score += 0.5;
    reasons.push('Roof outline drawn on planning canvas by staff.');
  }
  if (roof.photos.length > 0) {
    score += 0.5;
    reasons.push(`${roof.photos.length} rooftop photo(s) uploaded.`);
  }
  const modelledShade = roof.obstacles.some((o) => o.heightM > 0);
  if ((roof.hasTallNeighbours || roof.hasWaterTank) && !modelledShade) {
    score -= 1;
    reasons.push('Customer reported possible shading objects that are not yet modelled.');
  }
  reasons.push('Structural load, roof condition and electrical feasibility not yet verified on site.');
  return { confidence: score >= 2 ? 'high' : score >= 1 ? 'medium' : 'low', reasons };
}

export function analyzeRoof(roof: RoofAssessment, lat = PUNE_LATITUDE): RoofAnalysis {
  const grossAreaM2 = polygonArea(roof.polygon);
  const { confidence, reasons } = roofConfidence(roof);
  const empty: RoofAnalysis = {
    grossAreaM2,
    usableAreaM2: 0,
    obstacleAreaM2: 0,
    setbackAreaM2: 0,
    panels: [],
    panelCount: 0,
    capacityKw: 0,
    shadeLossByMonthHour: Array.from({ length: 12 }, () => new Array(24).fill(0)),
    annualShadeLossPct: 0,
    shadeRisk: 'low',
    confidence,
    confidenceReasons: reasons,
  };
  if (roof.polygon.length < 3 || grossAreaM2 <= 0) return empty;

  // Sample the roof on a 0.25 m grid to measure setback and obstacle exclusions.
  const b = bbox(roof.polygon);
  const step = grossAreaM2 > 3000 ? 0.5 : 0.25;
  let inside = 0;
  let afterSetback = 0;
  let usable = 0;
  for (let x = b.minX + step / 2; x < b.maxX; x += step) {
    for (let y = b.minY + step / 2; y < b.maxY; y += step) {
      const p = { x, y };
      if (!pointInPolygon(p, roof.polygon)) continue;
      inside++;
      if (distToPolygonEdge(p, roof.polygon) < roof.setbackM) continue;
      afterSetback++;
      if (!inObstacle(p, roof.obstacles, Math.max(OBSTACLE_CLEARANCE_M, roof.walkwayM))) usable++;
    }
  }
  const cell = step * step;
  const sampledGross = inside * cell;
  const scale = sampledGross > 0 ? grossAreaM2 / sampledGross : 1;
  const setbackAreaM2 = (inside - afterSetback) * cell * scale;
  const obstacleAreaM2 = (afterSetback - usable) * cell * scale;
  const usableAreaM2 = usable * cell * scale;

  let panels = layoutPanels(roof);
  let matrix = shadeMatrix(roof, panels, lat);
  const annualFraction = (i: number) => {
    let num = 0;
    let den = 0;
    for (let m = 0; m < 12; m++)
      for (let h = 0; h < 24; h++) {
        num += matrix.weights[m][h] * matrix.perPanel[i][m][h];
        den += matrix.weights[m][h];
      }
    return den > 0 ? num / den : 0;
  };
  let withShade = panels.map((p, i) => ({ ...p, annualShadeFraction: annualFraction(i) }));
  if (roof.excludeHeavilyShaded) {
    const keep = withShade.map((p) => p.annualShadeFraction <= HEAVY_SHADE_THRESHOLD);
    panels = panels.filter((_, i) => keep[i]);
    matrix = { weights: matrix.weights, perPanel: matrix.perPanel.filter((_, i) => keep[i]) };
    withShade = withShade.filter((_, i) => keep[i]);
  }
  const n = panels.length;
  const shadeLossByMonthHour = Array.from({ length: 12 }, (_, m) =>
    Array.from({ length: 24 }, (_, h) => (n > 0 ? matrix.perPanel.reduce((s, pp) => s + pp[m][h], 0) / n : 0)),
  );
  let num = 0;
  let den = 0;
  for (let m = 0; m < 12; m++)
    for (let h = 0; h < 24; h++) {
      num += matrix.weights[m][h] * shadeLossByMonthHour[m][h];
      den += matrix.weights[m][h];
    }
  const annualShadeLossPct = den > 0 ? (num / den) * 100 : 0;
  return {
    grossAreaM2,
    usableAreaM2,
    obstacleAreaM2,
    setbackAreaM2,
    panels: withShade,
    panelCount: n,
    capacityKw: (n * roof.panel.watt) / 1000,
    shadeLossByMonthHour,
    annualShadeLossPct,
    shadeRisk: annualShadeLossPct < 3 ? 'low' : annualShadeLossPct < 8 ? 'moderate' : 'high',
    confidence,
    confidenceReasons: reasons,
  };
}

/** Plain-language shade label for the selected time of day. */
export function shadeLabel(analysis: RoofAnalysis): string {
  if (analysis.panelCount === 0) return 'Engineer verification required';
  const afternoon = analysis.shadeLossByMonthHour.reduce((s, row) => s + row.slice(14, 18).reduce((a, b) => a + b, 0), 0);
  const morning = analysis.shadeLossByMonthHour.reduce((s, row) => s + row.slice(7, 11).reduce((a, b) => a + b, 0), 0);
  if (analysis.shadeRisk === 'low') return 'Low shade risk';
  const when = afternoon > morning ? 'afternoon' : 'morning';
  if (analysis.shadeRisk === 'moderate') return `Some ${when} shade identified`;
  return `Significant ${when} shade — engineer verification required`;
}

/** Convert lat/lng outline from a map into local metres (equirectangular, fine for a single roof). */
export function latLngToLocalMetres(pts: { lat: number; lng: number }[]): Point[] {
  if (pts.length === 0) return [];
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const minLng = Math.min(...pts.map((p) => p.lng));
  const maxLat = Math.max(...pts.map((p) => p.lat));
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return pts.map((p) => ({ x: (p.lng - minLng) * mPerDegLng, y: (maxLat - p.lat) * mPerDegLat }));
}

export const OBSTACLE_PRESETS: Record<ShadeObstacle['kind'], { label: string; w: number; h: number; heightM: number; severity: number; onRoof: boolean }> = {
  water_tank: { label: 'Water tank', w: 2.5, h: 2.5, heightM: 2.2, severity: 1, onRoof: true },
  ac_unit: { label: 'AC equipment', w: 1.5, h: 1, heightM: 1.0, severity: 1, onRoof: true },
  skylight: { label: 'Skylight', w: 3, h: 1.5, heightM: 0, severity: 0, onRoof: true },
  access_path: { label: 'Roof access pathway', w: 1.2, h: 6, heightM: 0, severity: 0, onRoof: true },
  neighbour_building: { label: 'Neighbouring structure', w: 8, h: 3, heightM: 6, severity: 1, onRoof: false },
  tree: { label: 'Tree', w: 4, h: 4, heightM: 7, severity: 0.6, onRoof: false },
  other: { label: 'Other roof structure', w: 2, h: 2, heightM: 1.5, severity: 1, onRoof: true },
};
