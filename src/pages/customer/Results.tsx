import { useNavigate } from 'react-router-dom';
import { Battery, CalendarCheck, ChevronDown, FileDown, Home, IndianRupee, ShieldCheck, Sun, Wallet } from 'lucide-react';
import { Badge, Button, Card, EmptyState, LinkButton, Notice, SimLabel } from '@/components/ui';
import { roofStatusLabel } from '@/components/customerBits';
import { useI18n } from '@/i18n/i18n';
import { getAssessment, store, useAppState } from '@/store/store';
import { generateProposal } from '@/store/actions';
import { inr, num, roundFriendly } from '@/lib/format';
import { shadeLabel } from '@/engine/roof';

export function confidenceText(c: 'low' | 'medium' | 'high') {
  return {
    low: { label: 'Low', tone: 'amber' as const, help: 'Based mostly on your bill. Our engineer needs to check your roof and usage.' },
    medium: { label: 'Medium', tone: 'blue' as const, help: 'Based on your bill and roof details. A site visit will confirm the design.' },
    high: { label: 'High', tone: 'teal' as const, help: 'Based on verified roof details and detailed usage data.' },
  }[c];
}

export default function Results() {
  const { t } = useI18n();
  const s = useAppState();
  const nav = useNavigate();
  const c = s.customers.find((x) => x.id === s.portalCustomerId);
  if (!c)
    return (
      <EmptyState title="No enquiry yet" action={<LinkButton to="/start">{t('Check My Savings')}</LinkButton>}>
        Start a quick savings check to see your preliminary energy plan.
      </EmptyState>
    );
  const a = getAssessment(c, s);
  const r = a.recommendation;
  const ch = r.chosen;
  const conf = confidenceText(r.confidence);
  const roofLbl = roofStatusLabel(c.roof.status);
  const units = a.recommendation.chosen?.sim.annual.loadKwh ?? 0;

  const downloadProposal = () => {
    store.set((st) => generateProposal(st, c.id, 'Customer portal', 'draft'));
    nav(`/proposal/${c.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">{t('Preliminary estimate')}</Badge>
          {c.origin === 'seed' || c.sampleTag ? <SimLabel>Fictional customer</SimLabel> : null}
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t('Your JioUrja Energy Plan')}</h1>
        <p className="text-slate-500">{c.business.name}</p>
      </div>

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your electricity today</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <div className="text-2xl font-bold">{inr(c.bill.monthlyBillInr ?? r.baselineMonthlyBillInr)}</div>
            <div className="text-xs text-slate-500">monthly bill {c.bill.source === 'customer_entered' ? '(as you told us)' : '(sample)'}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">about {num(units / 12)}</div>
            <div className="text-xs text-slate-500">electricity units a month {c.bill.monthlyUnitsKwh ? '' : '(estimated from your bill)'}</div>
          </div>
        </div>
        {r.customerMessages.slice(0, 1).map((m) => (
          <p key={m} className="rounded-xl bg-surface p-3 text-[15px]">
            {m}
          </p>
        ))}
        <p className="text-xs text-slate-500">We cannot see exactly when you use electricity from a monthly bill. We used your working hours to estimate it; our team can use detailed meter data later.</p>
      </Card>

      {!ch ? (
        <Card>
          <Notice tone="warn" title="We need an engineer to look at your site">
            {r.customerMessages.join(' ')}
          </Notice>
        </Card>
      ) : (
        <Card className="space-y-5 ring-2 ring-teal/30">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">{ch.batteryKwh > 0 ? <Battery className="h-6 w-6" /> : <Sun className="h-6 w-6" />}</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Recommended system')}</div>
              <div className="text-xl font-bold">{ch.batteryKwh > 0 ? t('Solar + Battery storage') : t('Solar only')}</div>
              <div className="text-sm text-slate-600">
                About {num(ch.solarKw, 1)} kW of rooftop solar{ch.batteryKwh > 0 ? ` with a ${ch.batteryKwh} kWh battery` : ''}
                {a.roof.panelCount > 0 && !c.design.solarKwOverride ? ` (around ${a.roof.panelCount} panels)` : ''}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-teal-50 p-4">
            <div className="text-sm font-medium text-teal-800">{t('Approximate monthly savings')}</div>
            <div className="text-3xl font-bold text-teal-800">
              {inr(roundFriendly(r.savingsRangeMonthlyInr[0]))} – {inr(roundFriendly(r.savingsRangeMonthlyInr[1]))}
            </div>
            <div className="text-sm text-teal-800/80">{t('per month')}, after paying JioUrja for the solar electricity (Energy-as-a-Service plan)</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <IndianRupee className="h-3.5 w-3.5" /> {t('Do you need to pay anything upfront?')}
              </div>
              <div className="mt-1 font-semibold">No installation cost on the service plan*</div>
              <div className="text-xs text-slate-500">*A refundable security deposit of about {inr(roundFriendly(ch.customerPpa.upfrontDepositInr))} may apply, subject to approval.</div>
            </div>
            <div className="rounded-xl bg-surface p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Home className="h-3.5 w-3.5" /> {t('Is your roof suitable?')}
              </div>
              <div className="mt-1 font-semibold">{c.roof.polygon.length >= 3 ? `Looks promising — ${shadeLabel(a.roof).toLowerCase()}` : 'Not checked yet'}</div>
              <div className="text-xs text-slate-500">{roofLbl.text}</div>
            </div>
            <div className="rounded-xl bg-surface p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" /> {t('Assessment confidence')}
              </div>
              <div className="mt-1">
                <Badge tone={conf.tone}>{conf.label}</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-500">{conf.help}</div>
            </div>
            <div className="rounded-xl bg-surface p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarCheck className="h-3.5 w-3.5" /> {t('Next step')}
              </div>
              <div className="mt-1 font-semibold">Free engineer visit to check your roof and wiring</div>
            </div>
          </div>

          <ul className="space-y-2 text-[15px]">
            {r.customerMessages.slice(1).map((m) => (
              <li key={m} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {m}
              </li>
            ))}
          </ul>

          <details className="group rounded-xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm font-semibold">
              How did we work this out?
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-1.5 border-t border-slate-100 p-3 text-sm text-slate-600">
              <p>• Solar could produce about {num(ch.sim.annual.solarKwh / 12)} units a month on your roof (averaged over the year).</p>
              <p>• You would buy about {num((ch.sim.annual.selfConsumedKwh + ch.sim.annual.batteryDeliveredKwh) / 12)} fewer units a month from the grid.</p>
              <p>• That avoids about {inr(roundFriendly(ch.customerPpa.year1AvoidedInr / 12))} of your monthly bill. Fixed charges on your bill stay the same.</p>
              <p>• On the service plan you pay JioUrja about {inr(roundFriendly(ch.customerPpa.monthlyPaymentInr))} a month for the solar electricity, so you keep the difference.</p>
            </div>
          </details>
        </Card>
      )}

      <Notice tone="info">{t('Final pricing and system design are subject to an engineering survey and commercial approval.')}</Notice>

      <div className="space-y-3">
        <Button size="lg" block variant="teal" onClick={() => nav('/my/book')} icon={<CalendarCheck className="h-5 w-5" />}>
          {t('Book My Free Site Assessment')}
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" size="lg" onClick={() => nav('/my/payment')} icon={<Wallet className="h-5 w-5" />} disabled={!ch}>
            {t('Compare payment options')}
          </Button>
          <Button variant="outline" size="lg" onClick={downloadProposal} icon={<FileDown className="h-5 w-5" />} disabled={!ch}>
            {t('Download Preliminary Proposal')}
          </Button>
        </div>
      </div>
    </div>
  );
}
