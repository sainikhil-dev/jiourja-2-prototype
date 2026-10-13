import { Battery, Check, Factory, Sun, Zap } from 'lucide-react';
import type { Customer, StageId } from '@/types';
import { STAGES } from '@/types';
import { stageLabel } from '@/store/actions';
import { useI18n } from '@/i18n/i18n';
import { cx, dateLabel } from '@/lib/format';
import { Badge } from './ui';

export function StageTracker({ customer, compact }: { customer: Customer; compact?: boolean }) {
  const { t } = useI18n();
  const idx = STAGES.indexOf(customer.stage);
  const when = (s: StageId) => [...customer.stageHistory].reverse().find((h) => h.stage === s)?.at;
  return (
    <ol className={cx('relative', compact ? 'space-y-2' : 'space-y-0')}>
      {STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
            {i < STAGES.length - 1 && <span className={cx('absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5', done ? 'bg-teal' : 'bg-slate-200')} aria-hidden />}
            <span
              className={cx(
                'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                done ? 'bg-teal text-white' : current ? 'bg-electric text-white ring-4 ring-electric-100' : 'bg-slate-200 text-slate-500',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <div className="pt-0.5">
              <div className={cx('text-sm font-semibold', current ? 'text-electric-700' : done ? 'text-navy' : 'text-slate-400')}>
                {t(stageLabel(s))} {current && <Badge tone="blue">Current</Badge>}
              </div>
              {(done || current) && when(s) && <div className="text-xs text-slate-500">{dateLabel(when(s))}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Simple animated-free energy flow picture: solar → factory ← grid, optional battery. */
export function EnergyFlow({ solarKw, loadKw, gridKw, batteryKw, socPct, hasBattery }: { solarKw: number; loadKw: number; gridKw: number; batteryKw: number; socPct: number | null; hasBattery: boolean }) {
  const node = (icon: React.ReactNode, label: string, value: string, tone: string) => (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className={cx('flex h-14 w-14 items-center justify-center rounded-2xl', tone)}>{icon}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm font-bold tabular-nums text-navy">{value}</div>
    </div>
  );
  const arrow = (active: boolean, label: string) => (
    <div className="flex flex-1 flex-col items-center px-1">
      <div className={cx('h-1 w-full rounded-full', active ? 'bg-teal' : 'bg-slate-200')} />
      <span className="mt-1 text-[10px] text-slate-400">{label}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        {node(<Sun className="h-7 w-7 text-amber-700" />, 'Solar', `${solarKw.toFixed(1)} kW`, 'bg-amber-50')}
        {arrow(solarKw > 0.1, solarKw > 0.1 ? 'supplying' : 'idle')}
        {node(<Factory className="h-7 w-7 text-navy" />, 'Factory', `${loadKw.toFixed(1)} kW`, 'bg-slate-100')}
        {arrow(Math.abs(gridKw) > 0.1, gridKw > 0.1 ? 'buying' : gridKw < -0.1 ? 'exporting' : 'idle')}
        {node(<Zap className="h-7 w-7 text-electric" />, 'Grid', `${Math.abs(gridKw).toFixed(1)} kW`, 'bg-electric-50')}
      </div>
      {hasBattery && (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-teal-50/60 p-3">
          <Battery className="h-6 w-6 text-teal-700" />
          <div className="text-sm">
            <span className="font-semibold">Battery {socPct != null ? `${Math.round(socPct)}% charged` : ''}</span>
            <span className="ml-2 text-slate-600">{batteryKw > 0.1 ? `supplying ${batteryKw.toFixed(1)} kW` : batteryKw < -0.1 ? `charging ${Math.abs(batteryKw).toFixed(1)} kW` : 'standing by'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function screeningLabel(s: Customer['screening']['status']): { text: string; tone: 'blue' | 'amber' | 'teal' | 'slate' } {
  return {
    initial_details_received: { text: 'Initial details received', tone: 'blue' as const },
    additional_documents_required: { text: 'Additional documents required', tone: 'amber' as const },
    eligibility_under_review: { text: 'Eligibility under review', tone: 'blue' as const },
    ready_for_commercial_assessment: { text: 'Ready for commercial assessment', tone: 'teal' as const },
  }[s];
}

export function roofStatusLabel(s: Customer['roof']['status']): { text: string; tone: 'blue' | 'amber' | 'teal' | 'slate' | 'red' } {
  return {
    not_provided: { text: 'Engineer will check your roof', tone: 'slate' as const },
    customer_provided: { text: 'Roof details received — to be checked', tone: 'blue' as const },
    under_review: { text: 'Roof under review by our engineer', tone: 'blue' as const },
    engineer_verification_required: { text: 'Engineer verification required on site', tone: 'amber' as const },
    verified: { text: 'Roof checked and verified', tone: 'teal' as const },
    not_suitable: { text: 'Roof not suitable as currently assessed', tone: 'red' as const },
  }[s];
}
