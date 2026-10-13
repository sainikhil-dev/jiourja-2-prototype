import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Card, Field, NumberInput, Select, Toggle } from '@/components/ui';
import type { Assumptions, TariffSchedule } from '@/types';
import { ILLUSTRATIVE_PUNE_LT_INDUSTRIAL } from '@/engine/assumptions';

type NumKey = { [K in keyof Assumptions]: Assumptions[K] extends number ? K : never }[keyof Assumptions];
type TNumKey = { [K in keyof TariffSchedule]: TariffSchedule[K] extends number ? K : never }[keyof TariffSchedule];

const GROUPS: { title: string; fields: [NumKey, string, number?][] }[] = [
  {
    title: 'Solar',
    fields: [
      ['performanceRatio', 'Performance ratio', 0.01],
      ['solarDegradationPctYr', 'Degradation %/yr', 0.1],
      ['solarCapexInrPerKw', 'Solar CAPEX ₹/kW', 500],
      ['solarOmInrPerKwYr', 'Solar O&M ₹/kW/yr', 50],
      ['maxSolarToSanctionedLoadRatio', 'Max solar ÷ sanctioned load', 0.1],
      ['solarSizingStepKw', 'Sizing step (kW)', 1],
    ],
  },
  {
    title: 'Battery',
    fields: [
      ['batteryCapexInrPerKwh', 'Battery CAPEX ₹/kWh', 500],
      ['batteryCRate', 'Power per kWh (C-rate)', 0.05],
      ['roundTripEfficiency', 'Round-trip efficiency', 0.01],
      ['socMinPct', 'Min state of charge %', 1],
      ['socMaxPct', 'Max state of charge %', 1],
      ['batteryCycleLife', 'Cycle life', 100],
      ['batteryCalendarLifeYrs', 'Calendar life (yrs)', 1],
      ['batteryFadePctYr', 'Capacity fade %/yr', 0.1],
      ['batteryReplacementCostPct', 'Replacement cost % of today', 5],
      ['batteryOmPctCapexYr', 'Battery O&M % CAPEX/yr', 0.1],
      ['minBatteryBenefitCostRatio', 'Min benefit/cost to recommend', 0.05],
    ],
  },
  {
    title: 'Commercial',
    fields: [
      ['analysisYears', 'Analysis period (yrs)', 1],
      ['discountRatePct', 'Customer discount rate %', 0.5],
      ['providerHurdleRatePct', 'Provider target return %', 0.5],
      ['ppaTermYears', 'PPA term (yrs)', 1],
      ['ppaManualRateInrPerKwh', 'Manual PPA rate ₹/unit', 0.05],
      ['ppaEscalationPct', 'PPA escalation %/yr', 0.5],
      ['ppaSecurityDepositMonths', 'Security deposit (months)', 1],
      ['omEscalationPct', 'O&M escalation %/yr', 0.5],
      ['insurancePctCapex', 'Insurance % CAPEX/yr', 0.05],
      ['loanInterestPct', 'Loan interest %', 0.25],
      ['loanTenureMonths', 'Loan tenure (months)', 12],
      ['downPaymentPct', 'Down payment %', 5],
    ],
  },
];

const TARIFF_FIELDS: [TNumKey, string, number][] = [
  ['energyChargeInrPerKwh', 'Energy charge ₹/unit', 0.05],
  ['wheelingChargeInrPerKwh', 'Wheeling charge ₹/unit', 0.05],
  ['fuelAdjustmentInrPerKwh', 'Fuel adjustment ₹/unit', 0.05],
  ['fixedDemandChargeInrPerKvaMonth', 'Fixed/demand ₹/kVA/month', 10],
  ['electricityDutyPct', 'Electricity duty %', 0.5],
  ['exportCompensationInrPerKwh', 'Export compensation ₹/unit', 0.05],
  ['annualEscalationPct', 'Tariff escalation %/yr', 0.5],
];

/** Staff-only panel: edit the assumptions that drive the calculation, then recalculate. */
export function AssumptionsPanel({
  assumptions,
  tariff,
  onApply,
  onReset,
  disabled,
  scopeLabel,
}: {
  assumptions: Assumptions;
  tariff?: TariffSchedule;
  onApply: (a: Assumptions, t?: TariffSchedule) => void;
  onReset: () => void;
  disabled?: boolean;
  scopeLabel: string;
}) {
  const [a, setA] = useState(assumptions);
  const [t, setT] = useState(tariff);
  useEffect(() => setA(assumptions), [assumptions]);
  useEffect(() => setT(tariff), [tariff]);
  const dirty = JSON.stringify(a) !== JSON.stringify(assumptions) || JSON.stringify(t) !== JSON.stringify(tariff);
  return (
    <Card
      title="Calculation Assumptions"
      subtitle={`${scopeLabel}. Illustrative values — not tariff orders or vendor quotes.`}
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={onReset} disabled={disabled}>
            Reset to defaults
          </Button>
          <Button size="sm" disabled={!dirty || disabled} onClick={() => onApply(a, t)}>
            Apply & recalculate
          </Button>
        </div>
      }
    >
      {t && (
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-semibold">Tariff (customer-specific)</h3>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TARIFF_FIELDS.map(([k, label, step]) => (
              <Field key={k} label={label}>
                <NumberInput className="h-9 text-sm" step={step} value={t[k]} disabled={disabled} onChange={(v) => setT({ ...t, [k]: v ?? 0 })} />
              </Field>
            ))}
            <Field label="Export limit (kW, blank = none)">
              <NumberInput className="h-9 text-sm" value={t.exportLimitKw} disabled={disabled} onChange={(v) => setT({ ...t, exportLimitKw: v })} />
            </Field>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-semibold text-slate-500">Time-of-day adders (₹/unit; negative = rebate)</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {t.touPeriods.map((p, i) => (
                <div key={i} className="rounded-lg bg-surface p-2 text-xs">
                  <div className="font-semibold">{p.label}</div>
                  <div className="mt-1 flex items-center gap-1">
                    <NumberInput aria-label={`${p.label} start`} className="h-8 w-14 px-2 text-xs" value={p.startHour} disabled={disabled} onChange={(v) => setT({ ...t, touPeriods: t.touPeriods.map((q, j) => (j === i ? { ...q, startHour: Math.min(23, Math.max(0, v ?? 0)) } : q)) })} />
                    –
                    <NumberInput aria-label={`${p.label} end`} className="h-8 w-14 px-2 text-xs" value={p.endHour} disabled={disabled} onChange={(v) => setT({ ...t, touPeriods: t.touPeriods.map((q, j) => (j === i ? { ...q, endHour: Math.min(24, Math.max(0, v ?? 0)) } : q)) })} />
                    h
                    <NumberInput aria-label={`${p.label} adder`} className="h-8 w-20 px-2 text-xs" step={0.1} value={p.adderInrPerKwh} disabled={disabled} onChange={(v) => setT({ ...t, touPeriods: t.touPeriods.map((q, j) => (j === i ? { ...q, adderInrPerKwh: v ?? 0 } : q)) })} />
                  </div>
                </div>
              ))}
            </div>
            <button className="text-xs font-semibold text-electric" disabled={disabled} onClick={() => setT({ ...ILLUSTRATIVE_PUNE_LT_INDUSTRIAL, exportLimitKw: t.exportLimitKw, name: t.name })}>
              Restore illustrative tariff values
            </button>
          </div>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {g.fields.map(([k, label, step]) => (
                <Field key={k} label={<span className="text-xs">{label}</span>}>
                  <NumberInput className="h-9 text-sm" step={step} value={a[k] as number} disabled={disabled} onChange={(v) => setA({ ...a, [k]: v ?? 0 })} />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="PPA pricing mode">
          <Select className="h-9 text-sm" value={a.ppaRateMode} disabled={disabled} onChange={(e) => setA({ ...a, ppaRateMode: e.target.value as Assumptions['ppaRateMode'] })}>
            <option value="cost_reflective">Cost-reflective (solve for target return)</option>
            <option value="manual">Manual rate</option>
          </Select>
        </Field>
        <Field label="Battery candidates (kWh, comma-separated)">
          <input
            className="h-9 w-full rounded-xl border border-slate-300 px-3 text-sm"
            defaultValue={a.batteryCandidatesKwh.join(', ')}
            key={a.batteryCandidatesKwh.join(',')}
            disabled={disabled}
            onBlur={(e) => {
              const v = e.target.value.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x >= 0);
              setA({ ...a, batteryCandidatesKwh: v.length ? v : [0] });
            }}
          />
        </Field>
        <div className="flex items-end pb-2">
          <Toggle checked={a.allowGridCharging} onChange={(v) => setA({ ...a, allowGridCharging: v })} label="Allow battery charging from grid (off-peak)" />
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Discharge windows: {a.dischargeWindows.map((w) => `${w.startHour}:00–${w.endHour}:00`).join(', ')} · Monthly solar yield (kWh/kWp/day, before PR): {a.specificYieldKwhPerKwpDay.join(', ')}
      </div>
    </Card>
  );
}
