import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Camera, ExternalLink, PencilRuler, RotateCcw, Save, Square, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Notice, NumberInput, Select, SimLabel, Stat, Toggle, useToast } from '@/components/ui';
import { RoofCanvas, type CanvasMode } from '@/components/RoofCanvas';
import { roofStatusLabel } from '@/components/customerBits';
import { store, useAppState } from '@/store/store';
import { addRoofPhoto, setRoofStatus, updateRoof, verifyRoof } from '@/store/actions';
import { analyzeRoof, OBSTACLE_PRESETS, rectPolygon, shadeLabel, shadowsAt } from '@/engine/roof';
import { MONTH_NAMES, midMonthDoy } from '@/engine/solar';
import { hourLabel, num } from '@/lib/format';
import { openStoredFile, saveFile } from '@/lib/fileStore';
import type { RoofAssessment, ShadeObstacle } from '@/types';
import { can, CustomerSelect, PageHeader, PermissionNote, useStaff } from './ConsoleLayout';

export default function RoofAssessmentPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useAppState();
  const c = s.customers.find((x) => x.id === id);
  if (!c)
    return (
      <div>
        <PageHeader title="Rooftop assessment" subtitle="Outline the roof, mark obstacles and shade sources, and estimate installable capacity." />
        <Card>
          <div className="mb-3 text-sm text-slate-600">Choose a customer:</div>
          <CustomerSelect onChange={(cid) => nav(`/console/roof/${cid}`)} />
        </Card>
      </div>
    );
  return <RoofEditor key={c.id} customerId={c.id} />;
}

function RoofEditor({ customerId }: { customerId: string }) {
  const s = useAppState();
  const staff = useStaff();
  const nav = useNavigate();
  const toast = useToast();
  const c = s.customers.find((x) => x.id === customerId)!;
  const [draft, setDraft] = useState<RoofAssessment>(c.roof);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [sel, setSel] = useState<string | null>(null);
  const [month, setMonth] = useState(2);
  const [hour, setHour] = useState(16);
  const [heat, setHeat] = useState(false);
  const [rectL, setRectL] = useState<number | null>(c.roof.lengthM ?? 20);
  const [rectW, setRectW] = useState<number | null>(c.roof.widthM ?? 12);
  // Pick up saved changes made elsewhere (e.g. verification) without losing local edits of geometry.
  useEffect(() => setDraft((d) => ({ ...d, verified: c.roof.verified, status: c.roof.status, verifiedBy: c.roof.verifiedBy, verifiedAt: c.roof.verifiedAt, photos: c.roof.photos })), [c.roof.verified, c.roof.status, c.roof.photos, c.roof.verifiedBy, c.roof.verifiedAt]);

  const deferred = useDeferredValue(draft);
  const analysis = useMemo(() => analyzeRoof(deferred), [deferred]);
  const saved = useMemo(() => analyzeRoof(c.roof), [c.roof]);
  const dirty = JSON.stringify([draft.polygon, draft.obstacles, draft.setbackM, draft.walkwayM, draft.panel, draft.excludeHeavilyShaded]) !== JSON.stringify([c.roof.polygon, c.roof.obstacles, c.roof.setbackM, c.roof.walkwayM, c.roof.panel, c.roof.excludeHeavilyShaded]);
  const selected = draft.obstacles.find((o) => o.id === sel) ?? null;
  const status = roofStatusLabel(c.roof.status);

  const nowShade = useMemo(() => {
    const sh = shadowsAt(deferred, midMonthDoy(month), hour + 0.5);
    const row = analysis.shadeLossByMonthHour[month]?.[hour] ?? 0;
    return { sun: sh.sun, loss: row };
  }, [deferred, analysis, month, hour]);

  const save = () => {
    store.set((st) => updateRoof(st, c.id, { ...draft, status: draft.status === 'not_provided' || draft.status === 'customer_provided' ? 'under_review' : draft.status }, staff.name, `Roof model updated: ${num(analysis.grossAreaM2)} m² gross, ${analysis.panelCount} panels (${num(analysis.capacityKw, 1)} kW), shade loss ${analysis.annualShadeLossPct.toFixed(1)}%.`));
    toast('Roof model saved — recommendations recalculated');
  };
  const addObstacle = (kind: ShadeObstacle['kind']) => {
    const p = OBSTACLE_PRESETS[kind];
    const xs = draft.polygon.map((q) => q.x);
    const ys = draft.polygon.map((q) => q.y);
    const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 5;
    const cy = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 5;
    const ob: ShadeObstacle = { id: `obs_${Date.now().toString(36)}`, kind, label: p.label, x: Math.round((p.onRoof ? cx - p.w / 2 : (xs.length ? Math.min(...xs) : 0) - p.w - 1) * 10) / 10, y: Math.round((cy - p.h / 2) * 10) / 10, w: p.w, h: p.h, heightM: p.heightM, severity: p.severity, onRoof: p.onRoof };
    setDraft({ ...draft, obstacles: [...draft.obstacles, ob] });
    setSel(ob.id);
  };
  const updSel = (patch: Partial<ShadeObstacle>) => setDraft({ ...draft, obstacles: draft.obstacles.map((o) => (o.id === sel ? { ...o, ...patch } : o)) });

  return (
    <div>
      <PageHeader
        title="Rooftop assessment"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/console/customers/${c.id}`} className="font-semibold text-electric hover:underline">
              {c.business.name}
            </Link>
            <Badge tone={status.tone === 'red' ? 'red' : status.tone}>{status.text}</Badge>
            {c.roof.verified && <Badge tone="teal">Verified by {c.roof.verifiedBy}</Badge>}
          </span>
        }
        actions={<CustomerSelect value={c.id} onChange={(cid) => nav(`/console/roof/${cid}`)} />}
      />
      <Notice tone="sim" className="mb-4">
        Planning canvas, not a satellite image. Shade is a simplified geometric model (obstacle height + sun position for Pune, mid-month), staff-entered — not AI-measured. Final suitability needs structural load, roof condition,
        access, on-site shading verification, electrical feasibility, permits/DISCOM approval and owner/landlord permission.
      </Notice>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant={mode === 'draw' ? 'teal' : 'outline'} icon={<PencilRuler className="h-4 w-4" />} onClick={() => setMode('draw')}>
                Draw outline
              </Button>
              <div className="flex items-center gap-1">
                <NumberInput aria-label="Length (m)" className="h-9 w-20 text-sm" value={rectL} onChange={setRectL} />
                <span className="text-xs text-slate-400">×</span>
                <NumberInput aria-label="Width (m)" className="h-9 w-20 text-sm" value={rectW} onChange={setRectW} />
                <Button size="sm" variant="outline" icon={<Square className="h-4 w-4" />} disabled={!rectL || !rectW} onClick={() => rectL && rectW && setDraft({ ...draft, polygon: rectPolygon(rectL, rectW), method: 'staff_drawn' })}>
                  Rectangle
                </Button>
              </div>
              <Select aria-label="Add obstacle" className="h-9 w-auto text-sm" value="" onChange={(e) => e.target.value && addObstacle(e.target.value as ShadeObstacle['kind'])}>
                <option value="">+ Add obstacle / shade source…</option>
                {Object.entries(OBSTACLE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} disabled={!dirty} onClick={() => setDraft(c.roof)}>
                Undo changes
              </Button>
            </div>
            {draft.polygon.length < 3 && mode !== 'draw' ? (
              <EmptyState title="No roof outline yet" action={<Button onClick={() => setMode('draw')}>Draw outline</Button>}>
                {c.roof.lengthM ? `Customer said about ${c.roof.lengthM} × ${c.roof.widthM} m.` : 'The customer did not provide roof dimensions.'} Draw the outline or use the rectangle tool.
              </EmptyState>
            ) : (
              <RoofCanvas roof={draft} analysis={analysis} onChange={setDraft} mode={mode} onModeDone={() => setMode('select')} selectedId={sel} onSelect={setSel} month={month} hour={hour + 0.5} heatmap={heat} />
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label={`Time of day: ${hourLabel(hour)}–${hourLabel(hour + 1)}`}>
                <input type="range" min={6} max={18} step={1} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="w-full accent-teal-600" aria-label="Time of day" />
              </Field>
              <Field label="Month">
                <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 text-sm">
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i}>
                      {m} (mid-month)
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end pb-2">
                <Toggle checked={heat} onChange={setHeat} label="Show annual shade per panel" />
              </div>
            </div>
            <div className="mt-2 rounded-xl bg-surface p-3 text-sm">
              Sun at {hourLabel(hour)}:30 in {MONTH_NAMES[month]}: elevation {nowShade.sun.elevationDeg.toFixed(0)}°, azimuth {nowShade.sun.azimuthDeg.toFixed(0)}°.{' '}
              <strong>{(nowShade.loss * 100).toFixed(0)}%</strong> of modelled panel output is shaded in this hour (illustrative).
            </div>
          </Card>
          {selected && (
            <Card title={`Selected: ${selected.label}`} action={<Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => (setDraft({ ...draft, obstacles: draft.obstacles.filter((o) => o.id !== sel) }), setSel(null))}>Remove</Button>}>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Label">
                  <Input className="h-10 text-sm" value={selected.label} onChange={(e) => updSel({ label: e.target.value })} />
                </Field>
                <Field label="Width E–W (m)">
                  <NumberInput className="h-10 text-sm" value={selected.w} min={0.2} step={0.1} onChange={(v) => updSel({ w: Math.max(0.2, v ?? 0.2) })} />
                </Field>
                <Field label="Depth N–S (m)">
                  <NumberInput className="h-10 text-sm" value={selected.h} min={0.2} step={0.1} onChange={(v) => updSel({ h: Math.max(0.2, v ?? 0.2) })} />
                </Field>
                <Field label={`Height above roof: ${selected.heightM} m`}>
                  <input type="range" min={0} max={15} step={0.1} value={selected.heightM} onChange={(e) => updSel({ heightM: Number(e.target.value) })} className="w-full accent-teal-600" aria-label="Obstacle height" />
                </Field>
                <Field label={`Shadow severity: ${Math.round(selected.severity * 100)}%`} hint="100% = solid; trees ≈ 50–70%">
                  <input type="range" min={0} max={1} step={0.05} value={selected.severity} onChange={(e) => updSel({ severity: Number(e.target.value) })} className="w-full accent-teal-600" aria-label="Shadow severity" />
                </Field>
                <div className="flex items-end pb-2 sm:col-span-2">
                  <Toggle checked={selected.onRoof} onChange={(v) => updSel({ onRoof: v })} label="Sits on this roof (excluded from panel area)" />
                </div>
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Results" action={dirty ? <Badge tone="amber">Unsaved changes</Badge> : <Badge tone="teal">Saved</Badge>}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Gross roof area" value={`${num(analysis.grossAreaM2)} m²`} />
              <Stat label="Usable area" value={`${num(analysis.usableAreaM2)} m²`} hint={`−${num(analysis.setbackAreaM2)} setback, −${num(analysis.obstacleAreaM2)} obstacles`} />
              <Stat label="Panels (layout)" value={num(analysis.panelCount)} hint={`${draft.panel.watt} W each`} />
              <Stat label="Installable capacity" tone="blue" value={`${num(analysis.capacityKw, 1)} kW`} />
              <Stat label="Annual shade loss" value={`${analysis.annualShadeLossPct.toFixed(1)}%`} hint={shadeLabel(analysis)} tone={analysis.shadeRisk === 'low' ? 'teal' : 'amber'} />
              <Stat label="Confidence" value={analysis.confidence.toUpperCase()} />
            </div>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {analysis.confidenceReasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
            {dirty && (
              <p className="mt-2 text-xs text-slate-500">
                Saved model: {num(saved.capacityKw, 1)} kW, {saved.annualShadeLossPct.toFixed(1)}% shade.
              </p>
            )}
            <div className="mt-4 space-y-2">
              <Button block icon={<Save className="h-4 w-4" />} disabled={!dirty} onClick={save}>
                Save roof model
              </Button>
              <Button
                block
                variant="teal"
                icon={<BadgeCheck className="h-4 w-4" />}
                disabled={dirty || c.roof.verified || c.roof.polygon.length < 3 || !can(staff.role, 'verify_roof')}
                onClick={() => (store.set((st) => verifyRoof(st, c.id, staff.name)), toast('Roof assessment verified — customer status updated'))}
              >
                {c.roof.verified ? 'Roof assessment verified' : 'Mark Roof Assessment Verified'}
              </Button>
              {!can(staff.role, 'verify_roof') && <PermissionNote action="verify_roof" />}
              {dirty && <p className="text-xs text-slate-500">Save the model before verifying.</p>}
              <Field label="Set roof status">
                <Select
                  className="h-10 text-sm"
                  value={c.roof.status}
                  onChange={(e) => (store.set((st) => setRoofStatus(st, c.id, e.target.value as RoofAssessment['status'], staff.name)), toast('Roof status updated'))}
                  disabled={!can(staff.role, 'verify_roof')}
                >
                  <option value="not_provided">Not provided</option>
                  <option value="customer_provided">Customer provided</option>
                  <option value="under_review">Under review</option>
                  <option value="engineer_verification_required">Engineer verification required</option>
                  <option value="verified" disabled={!c.roof.verified}>
                    Verified
                  </option>
                  <option value="not_suitable">Not suitable</option>
                </Select>
              </Field>
            </div>
          </Card>
          <Card title="Layout settings">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Edge setback (m)">
                <NumberInput className="h-10 text-sm" step={0.1} min={0} value={draft.setbackM} onChange={(v) => setDraft({ ...draft, setbackM: Math.max(0, v ?? 0) })} />
              </Field>
              <Field label="Obstacle clearance (m)">
                <NumberInput className="h-10 text-sm" step={0.1} min={0} value={draft.walkwayM} onChange={(v) => setDraft({ ...draft, walkwayM: Math.max(0, v ?? 0) })} />
              </Field>
              <Field label="Panel length (m)">
                <NumberInput className="h-10 text-sm" step={0.01} value={draft.panel.lengthM} onChange={(v) => setDraft({ ...draft, panel: { ...draft.panel, lengthM: Math.max(0.5, v ?? 2.28) } })} />
              </Field>
              <Field label="Panel width (m)">
                <NumberInput className="h-10 text-sm" step={0.01} value={draft.panel.widthM} onChange={(v) => setDraft({ ...draft, panel: { ...draft.panel, widthM: Math.max(0.5, v ?? 1.13) } })} />
              </Field>
              <Field label="Panel rating (W)">
                <NumberInput className="h-10 text-sm" step={5} value={draft.panel.watt} onChange={(v) => setDraft({ ...draft, panel: { ...draft.panel, watt: Math.max(100, v ?? 550) } })} />
              </Field>
              <Field label="Row gap (m)">
                <NumberInput className="h-10 text-sm" step={0.1} value={draft.panel.rowGapM} onChange={(v) => setDraft({ ...draft, panel: { ...draft.panel, rowGapM: Math.max(0, v ?? 0.6) } })} />
              </Field>
            </div>
            <div className="mt-3">
              <Toggle checked={draft.excludeHeavilyShaded} onChange={(v) => setDraft({ ...draft, excludeHeavilyShaded: v })} label="Skip panels with >25% annual shade" />
            </div>
          </Card>
          <Card title="Customer-provided information">
            <ul className="space-y-1 text-sm">
              <li>Method: {c.roof.method.replace('_', ' ')}</li>
              {c.roof.lengthM ? (
                <li>
                  Stated size: {c.roof.lengthM} × {c.roof.widthM} m
                </li>
              ) : null}
              {c.roof.mapOutline?.length ? <li>Map outline: {c.roof.mapOutline.length} corners marked on imagery (approximate)</li> : null}
              <li>Water tank reported: {c.roof.hasWaterTank ? 'yes' : 'no'}</li>
              <li>Tall neighbours reported: {c.roof.hasTallNeighbours ? 'yes' : 'no'}</li>
              <li>Other structures reported: {c.roof.hasOtherObstructions ? 'yes' : 'no'}</li>
            </ul>
            {(c.roof.hasTallNeighbours || c.roof.hasWaterTank) && !draft.obstacles.some((o) => o.heightM > 0) && (
              <Notice tone="warn" className="mt-3">
                Customer reported possible shade sources that are not yet modelled. Add them with “Add obstacle”.
              </Notice>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.roof.photos.map((p) => (
                <Button key={p.id} size="sm" variant="outline" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={async () => !(await openStoredFile(p)) && toast('File not available in this browser', 'error')}>
                  {p.name}
                </Button>
              ))}
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-semibold text-navy hover:bg-slate-50">
                <Camera className="h-4 w-4" /> Add site photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const ref = await saveFile(f);
                      store.set((st) => addRoofPhoto(st, c.id, ref, staff.name));
                      toast('Photo added');
                    } catch (err) {
                      toast((err as Error).message, 'error');
                    }
                  }}
                />
              </label>
            </div>
          </Card>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <SimLabel>Illustrative</SimLabel> Panel layout is a preliminary flat-plane estimate.
          </div>
        </div>
      </div>
    </div>
  );
}
