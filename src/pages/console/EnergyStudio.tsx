import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Download, FileDown, Upload } from 'lucide-react';
import { Badge, Button, Card, Field, Notice, NumberInput, Select, SimLabel, Stat, Tabs, useToast } from '@/components/ui';
import { getAssessment, store, useAppState } from '@/store/store';
import { generateProposal, markEnergyReviewed, setAssumptionOverrides, setDesign, setLoadProfile, setTariff } from '@/store/actions';
import { batteryBenefitCostRatio } from '@/engine/recommend';
import { avoidableRate } from '@/engine/tariff';
import { estimateProfileFromBill, monthlyUnitsOfProfile, parseIntervalCsv, type CsvParseResult } from '@/engine/loadProfile';
import { MONTH_NAMES } from '@/engine/solar';
import { ILLUSTRATIVE_PUNE_LT_INDUSTRIAL } from '@/engine/assumptions';
import { inr, inrShort, num } from '@/lib/format';
import type { Assumptions, Customer, ScenarioEconomics } from '@/types';
import { AssumptionsPanel } from './AssumptionsPanel';
import { can, CustomerSelect, PageHeader, PermissionNote, useStaff } from './ConsoleLayout';

export default function EnergyStudio() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useAppState();
  const c = s.customers.find((x) => x.id === id);
  if (!c)
    return (
      <div>
        <PageHeader title="Energy Studio" subtitle="Load analysis, tariff model, solar vs solar + storage comparison and financial model." />
        <Card>
          <div className="mb-3 text-sm text-slate-600">Choose a customer:</div>
          <CustomerSelect onChange={(cid) => nav(`/console/studio/${cid}`)} />
        </Card>
      </div>
    );
  return <Studio c={c} />;
}

function diffOverrides(a: Assumptions, g: Assumptions): Partial<Assumptions> {
  const out: Partial<Assumptions> = {};
  (Object.keys(a) as (keyof Assumptions)[]).forEach((k) => {
    if (JSON.stringify(a[k]) !== JSON.stringify(g[k])) (out as Record<string, unknown>)[k] = a[k];
  });
  return out;
}

function Studio({ c }: { c: Customer }) {
  const s = useAppState();
  const staff = useStaff();
  const nav = useNavigate();
  const toast = useToast();
  const a = getAssessment(c, s);
  const r = a.recommendation;
  const [tab, setTab] = useState<'load' | 'compare' | 'finance' | 'assumptions'>('load');
  const scenarios = useMemo(() => [r.solarOnly, ...r.batteryOptions].filter(Boolean) as ScenarioEconomics[], [r]);
  const [selKey, setSelKey] = useState<string | null>(null);
  const sel = scenarios.find((x) => x.key === selKey) ?? r.chosen ?? scenarios[0];
  const [month, setMonth] = useState(2);
  const editable = can(staff.role, 'edit_assumptions');

  const dayData = (sel?.sim.sampleDays[month] ?? []).map((iv, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    Load: +iv.load.toFixed(2),
    Solar: +iv.solar.toFixed(2),
    'Grid import': +iv.gridImport.toFixed(2),
    Export: +(-iv.gridExport).toFixed(2),
    'Battery discharge': +iv.batteryToLoad.toFixed(2),
    'Battery charge': +(-(iv.solarToBattery + iv.gridToBattery)).toFixed(2),
    'SOC kWh': +iv.socKwh.toFixed(1),
  }));
  const touData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`, rate: +avoidableRate(c.tariff, h).toFixed(2) }));
  const unitsModel = monthlyUnitsOfProfile(c.loadProfile);

  return (
    <div>
      <PageHeader
        title="Energy Studio"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/console/customers/${c.id}`} className="font-semibold text-electric hover:underline">
              {c.business.name}
            </Link>
            <Badge tone={c.energyAssessmentStatus === 'reviewed_by_staff' ? 'teal' : 'blue'}>{c.energyAssessmentStatus === 'reviewed_by_staff' ? 'Reviewed' : 'Preliminary'}</Badge>
            <SimLabel>{c.loadProfile.kind === 'uploaded_interval' ? 'Uploaded interval data' : c.loadProfile.kind === 'synthetic_sample' ? 'Synthetic interval data' : 'Estimated profile'}</SimLabel>
          </span>
        }
        actions={
          <>
            <CustomerSelect value={c.id} onChange={(cid) => nav(`/console/studio/${cid}`)} />
            <Button size="sm" variant="teal" icon={<CheckCircle2 className="h-4 w-4" />} disabled={c.energyAssessmentStatus === 'reviewed_by_staff'} onClick={() => (store.set((st) => markEnergyReviewed(st, c.id, staff.name)), toast('Electricity assessment marked reviewed'))}>
              {c.energyAssessmentStatus === 'reviewed_by_staff' ? 'Assessment reviewed' : 'Mark electricity assessment reviewed'}
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommendation</div>
            <div className="mt-1 text-lg font-bold">
              {r.chosen ? `${r.chosen.label}` : 'No viable design'} <Badge tone={r.type === 'solar_battery' ? 'teal' : r.type === 'solar_only' ? 'blue' : 'amber'}>{r.type.replace('_', ' ')}</Badge>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {r.reasons.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
            {r.warnings.map((w) => (
              <Notice key={w} tone="warn" className="mt-2">
                {w}
              </Notice>
            ))}
          </div>
          <div className="grid min-w-[16rem] grid-cols-2 gap-2">
            <Stat label="Stated bill / month" value={inr(c.bill.monthlyBillInr)} />
            <Stat label="Modelled bill / month" value={inr(r.baselineMonthlyBillInr)} hint={c.bill.monthlyBillInr ? `${(((r.baselineMonthlyBillInr - c.bill.monthlyBillInr) / c.bill.monthlyBillInr) * 100).toFixed(1)}% vs stated` : undefined} />
            <Stat label="Effective ₹/unit" value={`₹${r.effectiveRateInrPerKwh.toFixed(2)}`} hint="whole bill ÷ units" />
            <Stat label="Avoidable ₹/solar unit" value={`₹${r.avoidableSolarRateInrPerKwh.toFixed(2)}`} hint="variable charges only" tone="blue" />
          </div>
        </div>
      </Card>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'load', label: 'Load & tariff' },
          { id: 'compare', label: 'Solar vs Solar + BESS' },
          { id: 'finance', label: 'Financial model' },
          { id: 'assumptions', label: 'Calculation Assumptions' },
        ]}
      />

      {tab === 'load' && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title="24-hour interval profile (hourly)"
            subtitle={c.loadProfile.label}
            action={
              <div className="flex flex-wrap gap-2">
                <Select aria-label="Month" className="h-9 w-auto text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i}>
                      {m} working day
                    </option>
                  ))}
                </Select>
                <Select aria-label="Scenario" className="h-9 w-auto text-sm" value={sel?.key} onChange={(e) => setSelKey(e.target.value)}>
                  {scenarios.map((x) => (
                    <option key={x.key} value={x.key}>
                      {x.label}
                    </option>
                  ))}
                </Select>
              </div>
            }
          >
            <div className="h-80">
              <ResponsiveContainer>
                <ComposedChart data={dayData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" fontSize={11} interval={2} />
                  <YAxis fontSize={11} unit=" kW" width={60} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Solar" fill="#F1B650" stroke="#c98d24" fillOpacity={0.35} />
                  <Line type="monotone" dataKey="Load" stroke="#092348" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Grid import" stroke="#087AD1" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                  <Bar dataKey="Export" fill="#94a3b8" />
                  {sel && sel.batteryKwh > 0 && <Bar dataKey="Battery discharge" fill="#12B8A6" />}
                  {sel && sel.batteryKwh > 0 && <Bar dataKey="Battery charge" fill="#0e9586" fillOpacity={0.5} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              One working day from the simulated year (mid-{MONTH_NAMES[month]}). Negative bars are exports / battery charging. Interval data shown is {c.loadProfile.kind === 'uploaded_interval' ? 'derived from the uploaded file' : 'synthetic or estimated — not measured smart-meter data'}.
            </p>
            {sel && sel.batteryKwh > 0 && (
              <div className="mt-4 h-40">
                <ResponsiveContainer>
                  <LineChart data={dayData} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" fontSize={11} interval={2} />
                    <YAxis fontSize={11} unit=" kWh" width={60} domain={[0, sel.batteryKwh]} />
                    <Tooltip />
                    <Line type="stepAfter" dataKey="SOC kWh" stroke="#12B8A6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <div className="space-y-5">
            <LoadDataCard c={c} unitsModel={unitsModel} />
            <Card title="Time-of-day avoidable rate" subtitle="₹ per grid unit incl. duty, excl. fixed charges">
              <div className="h-44">
                <ResponsiveContainer>
                  <BarChart data={touData} margin={{ left: -20 }}>
                    <XAxis dataKey="hour" fontSize={10} interval={2} />
                    <YAxis fontSize={10} domain={[0, 'auto']} />
                    <Tooltip formatter={(v: number) => `₹${v}`} labelFormatter={(h) => `${h}:00`} />
                    <Bar dataKey="rate" fill="#087AD1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                {c.tariff.touPeriods.map((p) => (
                  <li key={p.label}>
                    {p.label}: {p.startHour}:00–{p.endHour}:00 {p.adderInrPerKwh >= 0 ? '+' : ''}₹{p.adderInrPerKwh}
                  </li>
                ))}
                <li>{c.tariff.name}</li>
              </ul>
            </Card>
          </div>
          <Card title="Bill analysis (year 1, modelled)" className="xl:col-span-3">
            <BillTable c={c} sel={sel} />
          </Card>
        </div>
      )}

      {tab === 'compare' && (
        <div className="space-y-5">
          <SizingControls c={c} maxKw={r.maxSolarKw} />
          <Card title="Scenario comparison" subtitle="Grid-only baseline vs solar-only vs solar + battery (rule-based dispatch, battery charges only from surplus solar unless grid charging is enabled).">
            <ScenarioTable c={c} scenarios={scenarios} chosenKey={r.chosen?.key} solarOnly={r.solarOnly} a={a.assumptions} />
          </Card>
          {r.solarSizing.length > 1 && (
            <Card title="Solar sizing" subtitle="Customer net benefit (PV, cost-reflective PPA) by solar capacity — the engine does not simply pick the largest system.">
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={r.solarSizing.map((x) => ({ kW: x.kw, 'Customer NPV (₹ lakh)': +(x.npv / 1e5).toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="kW" fontSize={11} unit=" kW" />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Customer NPV (₹ lakh)" stroke="#087AD1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'finance' && sel && <FinanceView c={c} sel={sel} a={a.assumptions} scenarios={scenarios} setSelKey={setSelKey} />}

      {tab === 'assumptions' && (
        <div className="space-y-3">
          {!editable && <PermissionNote action="edit_assumptions" />}
          <AssumptionsPanel
            assumptions={a.assumptions}
            tariff={c.tariff}
            disabled={!editable}
            scopeLabel={`Applies to ${c.business.name} only (global defaults are under Assumptions & Demo)`}
            onApply={(na, nt) => {
              store.set((st) => {
                let x = setAssumptionOverrides(st, c.id, diffOverrides(na, st.globalAssumptions), staff.name);
                if (nt) x = setTariff(x, c.id, nt, staff.name);
                return x;
              });
              toast('Assumptions applied — all results recalculated');
            }}
            onReset={() => {
              store.set((st) => setTariff(setAssumptionOverrides(st, c.id, {}, staff.name), c.id, { ...ILLUSTRATIVE_PUNE_LT_INDUSTRIAL, exportLimitKw: c.tariff.exportLimitKw, name: c.tariff.name }, staff.name));
              toast('Reset to default assumptions');
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<FileDown className="h-4 w-4" />}
              onClick={() => {
                store.set((st) => generateProposal(st, c.id, staff.name, 'draft'));
                nav(`/proposal/${c.id}`);
              }}
            >
              Regenerate proposal with these assumptions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadDataCard({ c, unitsModel }: { c: Customer; unitsModel: number }) {
  const staff = useStaff();
  const toast = useToast();
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [fname, setFname] = useState('');
  const downloadTemplate = () => {
    const rows = ['time,kW', ...c.loadProfile.workdayKw.map((v, h) => `${String(h).padStart(2, '0')}:00,${v.toFixed(2)}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `${c.business.name.replace(/\W+/g, '_')}_profile_template.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card title="Interval data" subtitle={`Profile implies ${num(unitsModel)} units/month${c.bill.monthlyUnitsKwh ? ` (bill: ${num(c.bill.monthlyUnitsKwh)})` : ''}`}>
      <div className="space-y-3 text-sm">
        <Badge tone={c.loadProfile.kind === 'uploaded_interval' ? 'teal' : 'amber'}>{c.loadProfile.kind.replace(/_/g, ' ')}</Badge>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 hover:bg-slate-50">
          <Upload className="h-4 w-4 text-electric" />
          <span className="flex-1">
            <span className="block font-semibold">Upload interval CSV</span>
            <span className="text-xs text-slate-500">time,kW (24 or 96 rows) or timestamp,kW / timestamp,kWh</span>
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFname(f.name);
              setParsed(parseIntervalCsv(await f.text()));
              e.target.value = '';
            }}
          />
        </label>
        {parsed && !parsed.ok && <Notice tone="warn">{parsed.error}</Notice>}
        {parsed?.ok && (
          <div className="space-y-2 rounded-xl bg-surface p-3">
            <div>
              Read {parsed.rows} rows ({parsed.intervalMinutes}-min) from {fname}. Implied working-day energy {num(parsed.workdayKw.reduce((x, y) => x + y, 0))} kWh.
            </div>
            {parsed.warnings.map((w) => (
              <div key={w} className="text-xs text-amber-700">
                {w}
              </div>
            ))}
            <Button
              size="sm"
              onClick={() => {
                store.set((st) =>
                  setLoadProfile(
                    st,
                    c.id,
                    { kind: 'uploaded_interval', label: `Uploaded interval data (${fname}) — averaged to hourly`, workdayKw: parsed.workdayKw, holidayKw: parsed.holidayKw, workingDaysPerWeek: c.business.workingDaysPerWeek, monthlyFactor: c.loadProfile.monthlyFactor, uploadedRows: parsed.rows },
                    staff.name,
                  ),
                );
                setParsed(null);
                toast('Interval data applied — analysis recalculated');
              }}
            >
              Apply and recalculate
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>
            CSV template
          </Button>
          {c.loadProfile.kind !== 'estimated_from_bill' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const units = c.bill.monthlyUnitsKwh || unitsModel;
                store.set((st) => setLoadProfile(st, c.id, estimateProfileFromBill(c.business, units), staff.name));
                toast('Profile reset to bill-based estimate');
              }}
            >
              Use bill-based estimate
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function BillTable({ c, sel }: { c: Customer; sel?: ScenarioEconomics }) {
  if (!sel) return null;
  const b = sel.sim.baselineBill;
  const p = sel.sim.postBill;
  const rows: [string, number, number][] = [
    ['Energy charges', b.energyInr, p.energyInr],
    ['Wheeling charges', b.wheelingInr, p.wheelingInr],
    ['Fuel adjustment', b.fuelAdjustmentInr, p.fuelAdjustmentInr],
    ['Time-of-day adders / rebates', b.touInr, p.touInr],
    ['Fixed / demand charges', b.fixedInr, p.fixedInr],
    ['Electricity duty', b.dutyInr, p.dutyInr],
    ['Export credit', -b.exportCreditInr, -p.exportCreditInr],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2">Component (annual)</th>
            <th className="text-right">Grid-only</th>
            <th className="text-right">{sel.label}</th>
            <th className="text-right">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([k, x, y]) => (
            <tr key={k}>
              <td className="py-1.5">{k}</td>
              <td className="text-right tabular-nums">{inr(x)}</td>
              <td className="text-right tabular-nums">{inr(y)}</td>
              <td className="text-right tabular-nums text-teal-700">{inr(y - x)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-2">Total bill</td>
            <td className="text-right tabular-nums">{inr(b.totalInr)}</td>
            <td className="text-right tabular-nums">{inr(p.totalInr)}</td>
            <td className="text-right tabular-nums text-teal-700">{inr(p.totalInr - b.totalInr)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Fixed/demand charges are held constant: rooftop solar is not assumed to reduce billed demand. Gross avoided cost ({inr(sel.sim.avoidedCostInr)}/yr) is before any PPA payment or EMI. Demand: {c.bill.sanctionedLoadKva ?? 'estimated'} kVA.
      </p>
    </div>
  );
}

function SizingControls({ c, maxKw }: { c: Customer; maxKw: number }) {
  const staff = useStaff();
  const toast = useToast();
  const [kw, setKw] = useState<number | null>(c.design.solarKwOverride);
  const [bk, setBk] = useState<string>(c.design.batteryKwhOverride == null ? 'auto' : String(c.design.batteryKwhOverride));
  const editable = can(staff.role, 'edit_assumptions');
  return (
    <Card title="System sizing controls" subtitle={`Engine maximum solar for this site: ${num(maxKw, 1)} kW. Leave blank / Auto to let the engine optimise.`}>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Solar capacity (kW)" hint="Blank = automatic">
          <NumberInput className="h-10 w-36 text-sm" value={kw} onChange={setKw} min={1} step={0.5} disabled={!editable} />
        </Field>
        <Field label="Battery">
          <Select className="h-10 w-44 text-sm" value={bk} onChange={(e) => setBk(e.target.value)} disabled={!editable}>
            <option value="auto">Auto (compare candidates)</option>
            <option value="0">No battery (force)</option>
            {[10, 20, 30, 40, 60, 80, 100].map((v) => (
              <option key={v} value={v}>
                {v} kWh (force)
              </option>
            ))}
          </Select>
        </Field>
        <Button
          disabled={!editable}
          onClick={() => {
            store.set((st) => setDesign(st, c.id, { solarKwOverride: kw && kw > 0 ? kw : null, batteryKwhOverride: bk === 'auto' ? null : Number(bk) }, staff.name));
            toast('Sizing updated — recalculated');
          }}
        >
          Recalculate
        </Button>
        {(c.design.solarKwOverride || c.design.batteryKwhOverride != null) && (
          <Button
            variant="ghost"
            disabled={!editable}
            onClick={() => {
              setKw(null);
              setBk('auto');
              store.set((st) => setDesign(st, c.id, { solarKwOverride: null, batteryKwhOverride: null }, staff.name));
            }}
          >
            Back to automatic
          </Button>
        )}
      </div>
      {!editable && <PermissionNote action="edit_assumptions" />}
    </Card>
  );
}

function ScenarioTable({ c, scenarios, chosenKey, solarOnly, a }: { c: Customer; scenarios: ScenarioEconomics[]; chosenKey?: string; solarOnly: ScenarioEconomics | null; a: Assumptions }) {
  const base = scenarios[0]?.sim;
  if (!base) return <p className="text-sm text-slate-500">No scenarios available.</p>;
  const cols = [
    { key: 'grid', label: 'Grid only', s: null as ScenarioEconomics | null },
    ...scenarios.map((x) => ({ key: x.key, label: x.label, s: x })),
  ];
  const row = (label: string, f: (x: ScenarioEconomics | null) => string, hint?: string) => (
    <tr>
      <td className="py-1.5 pr-3 text-slate-600">
        {label}
        {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
      </td>
      {cols.map((col) => (
        <td key={col.key} className={`px-2 text-right tabular-nums ${col.key === chosenKey ? 'bg-teal-50 font-semibold' : ''}`}>
          {f(col.s)}
        </td>
      ))}
    </tr>
  );
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-500">
            <th className="py-2 text-left">Metric (year 1 unless noted)</th>
            {cols.map((col) => (
              <th key={col.key} className={`px-2 text-right ${col.key === chosenKey ? 'bg-teal-50 text-teal-700' : ''}`}>
                {col.label}
                {col.key === chosenKey && <div className="normal-case">Recommended</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {row('Consumption (units)', () => num(base.annual.loadKwh))}
          {row('Solar generation', (x) => (x ? num(x.sim.annual.solarKwh) : '—'), 'after modelled shade')}
          {row('Solar used directly', (x) => (x ? num(x.sim.annual.selfConsumedKwh) : '—'))}
          {row('Battery delivered', (x) => (x ? num(x.sim.annual.batteryDeliveredKwh) : '—'))}
          {row('Battery cycles / yr', (x) => (x && x.batteryKwh ? num(x.sim.annual.batteryCycles) : '—'))}
          {row('Grid import', (x) => num(x ? x.sim.annual.gridImportKwh : base.annual.loadKwh))}
          {row('Grid export', (x) => (x ? num(x.sim.annual.gridExportKwh) : '—'))}
          {row('Curtailed', (x) => (x ? num(x.sim.annual.curtailedKwh) : '—'), c.tariff.exportLimitKw != null ? `export limit ${c.tariff.exportLimitKw} kW` : undefined)}
          {row('Annual grid bill', (x) => inr(x ? x.sim.postBill.totalInr : base.baselineBill.totalInr))}
          {row('Gross avoided cost', (x) => (x ? inr(x.sim.avoidedCostInr) : '—'))}
          {row('CAPEX', (x) => (x ? inr(x.capexInr) : '—'))}
          {row('Annual O&M', (x) => (x ? inr(x.annualOmInr) : '—'))}
          {row('Battery replacement', (x) => (x && x.batteryReplacementYear ? `yr ${x.batteryReplacementYear}: ${inrShort(x.batteryReplacementCostInr)}` : '—'))}
          {row('Lifecycle NPV', (x) => (x ? inrShort(x.lifecycleNpvInr) : '—'), `owner view, ${a.discountRatePct}%, ${a.analysisYears} yrs`)}
          {row('Customer NPV (PPA)', (x) => (x ? inrShort(x.customerPpaNpvInr) : '—'), 'design objective')}
          {row('Incremental benefit/cost vs solar-only', (x) => (x && solarOnly && x.batteryKwh > 0 ? batteryBenefitCostRatio(x, solarOnly, a).toFixed(2) : '—'), `threshold ${a.minBatteryBenefitCostRatio}`)}
          {row('Simple payback (owned)', (x) => (x && x.simplePaybackYears ? `${x.simplePaybackYears.toFixed(1)} yrs` : '—'))}
          {row('Project IRR (owned)', (x) => (x && x.projectIrrPct != null ? `${x.projectIrrPct.toFixed(1)}%` : '—'))}
          {row('PPA rate', (x) => (x ? `₹${x.ppaRateInrPerKwh.toFixed(2)}` : '—'))}
          {row('Customer net / month (PPA)', (x) => (x ? inr(x.customerPpa.monthlyNetSavingsInr) : '—'))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceView({ c, sel, a, scenarios, setSelKey }: { c: Customer; sel: ScenarioEconomics; a: Assumptions; scenarios: ScenarioEconomics[]; setSelKey: (k: string) => void }) {
  const flows = sel.cashFlows.map((f) => ({ year: f.year, 'Customer net (PPA)': Math.round(f.customerNetPpaInr), 'Customer net (loan)': Math.round(f.customerNetLoanInr), 'Provider net cash flow': Math.round(f.providerNetInr) }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Scenario:</span>
        <Select className="h-9 w-auto text-sm" value={sel.key} onChange={(e) => setSelKey(e.target.value)}>
          {scenarios.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Customer — Energy-as-a-Service (PPA)">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Gross avoided (yr 1)" value={inr(sel.customerPpa.year1AvoidedInr)} />
            <Stat label="PPA payments (yr 1)" value={inr(sel.customerPpa.year1PaymentsInr)} />
            <Stat label="Net savings (yr 1)" value={inr(sel.customerPpa.year1NetSavingsInr)} tone="teal" />
            <Stat label="Security deposit" value={inr(sel.customerPpa.upfrontDepositInr)} hint={`${a.ppaSecurityDepositMonths} months, refundable`} />
            <Stat label="PPA rate" value={`₹${sel.ppaRateInrPerKwh.toFixed(2)}`} hint={a.ppaRateMode === 'cost_reflective' ? `solved for ${a.providerHurdleRatePct}% provider return` : 'manual'} />
            <Stat label={`Net over ${a.ppaTermYears}-yr term`} value={inrShort(sel.customerPpa.termNetSavingsInr)} hint="nominal" />
          </div>
          <p className="mt-2 text-xs text-slate-500">Billable units yr 1: {num(sel.ppaBillableKwhYr1)} (self-consumed + battery-delivered + exported).</p>
        </Card>
        <Card title="Customer — financed ownership">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Installation cost" value={inr(sel.customerLoan.installationCostInr)} />
            <Stat label="Down payment" value={inr(sel.customerLoan.downPaymentInr)} hint={`${a.downPaymentPct}%`} />
            <Stat label="EMI" value={inr(sel.customerLoan.emiInr)} hint={`${sel.customerLoan.tenureMonths} m @ ${sel.customerLoan.interestPct}%`} />
            <Stat label="Net / month during loan" value={inr(sel.customerLoan.monthlyNetDuringLoanInr)} tone="teal" />
            <Stat label="Net / month after loan" value={inr(sel.customerLoan.monthlyNetAfterLoanInr)} />
            <Stat label="Lifetime net (nominal)" value={inrShort(sel.customerLoan.lifetimeNetSavingsInr)} hint={`${a.analysisYears} yrs`} />
          </div>
        </Card>
        <Card title="Provider (JioUrja) — PPA asset">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="CAPEX" value={inr(sel.capexInr)} />
            <Stat label="Revenue (yr 1)" value={inr(sel.provider.year1RevenueInr)} hint="revenue, not profit" />
            <Stat label="Operating cost (yr 1)" value={inr(sel.provider.year1OperatingCostInr)} hint="O&M + insurance" />
            <Stat label={`NPV @ ${a.providerHurdleRatePct}%`} value={inrShort(sel.provider.npvAtHurdleInr)} />
            <Stat label="Project IRR (pre-tax)" value={sel.provider.irrPct != null ? `${sel.provider.irrPct.toFixed(1)}%` : '—'} hint="unlevered" />
            <Stat label="Term" value={`${a.ppaTermYears} yrs`} hint="asset assumed to transfer after term" />
          </div>
        </Card>
      </div>
      <Card title="Annual cash flows" subtitle="Customer and provider views are kept separate. Pre-tax, unlevered, nominal.">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={flows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1e5).toFixed(1)}L`} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Customer net (PPA)" fill="#12B8A6" />
              <Bar dataKey="Customer net (loan)" fill="#087AD1" />
              <Bar dataKey="Provider net cash flow" fill="#F1B650" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-electric">Show year-by-year table</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="text-left text-slate-500">
                <tr>
                  {['Year', 'Avoided cost', 'PPA payment', 'O&M', 'Insurance', 'Replacement', 'Provider net', 'Customer net (PPA)', 'Customer net (loan)'].map((h) => (
                    <th key={h} className="py-1 pr-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {sel.cashFlows.map((f) => (
                  <tr key={f.year}>
                    <td className="py-1">{f.year}</td>
                    <td>{inr(f.avoidedCostInr)}</td>
                    <td>{inr(f.ppaPaymentInr)}</td>
                    <td>{inr(f.omInr)}</td>
                    <td>{inr(f.insuranceInr)}</td>
                    <td>{inr(f.replacementInr)}</td>
                    <td>{inr(f.providerNetInr)}</td>
                    <td>{inr(f.customerNetPpaInr)}</td>
                    <td>{inr(f.customerNetLoanInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>
      <p className="text-xs text-slate-500">
        {c.business.name}: all values come from the calculation engine with the assumptions shown in the Calculation Assumptions tab. Provider revenue is not profit; customer gross avoided cost is not net savings.
      </p>
    </div>
  );
}
