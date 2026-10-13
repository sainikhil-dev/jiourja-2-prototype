import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileDown, Landmark, Wrench, Zap } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, LinkButton, Notice, Select, useToast } from '@/components/ui';
import { screeningLabel } from '@/components/customerBits';
import { useI18n } from '@/i18n/i18n';
import { getAssessment, store, useAppState } from '@/store/store';
import { generateProposal, selectPlan, setAssumptionOverrides } from '@/store/actions';
import { cx, inr, num, roundFriendly } from '@/lib/format';
import type { PlanType } from '@/types';

export default function PaymentOptions() {
  const { t } = useI18n();
  const s = useAppState();
  const nav = useNavigate();
  const toast = useToast();
  const c = s.customers.find((x) => x.id === s.portalCustomerId);
  if (!c) return <EmptyState title="No enquiry yet" action={<LinkButton to="/start">{t('Check My Savings')}</LinkButton>} />;
  const a = getAssessment(c, s);
  const ch = a.recommendation.chosen;
  if (!ch)
    return (
      <EmptyState title="Payment options will be available after our engineer's visit" action={<LinkButton to="/my/book">{t('Book My Free Site Assessment')}</LinkButton>}>
        We could not size a system from the information so far.
      </EmptyState>
    );
  const ppa = ch.customerPpa;
  const loan = ch.customerLoan;
  const scr = screeningLabel(c.screening.status);
  const setLoan = (patch: { downPaymentPct?: number; loanTenureMonths?: number }) =>
    store.set((st) => setAssumptionOverrides(st, c.id, { ...c.assumptionOverrides, ...patch }, 'Customer portal (loan illustration)'));
  const choose = (p: PlanType) => {
    store.set((st) => selectPlan(st, c.id, p));
    toast('Your choice was sent to JioUrja for commercial review. This is not an approval yet.');
  };

  const PlanCard = ({ plan, children, title, icon }: { plan: PlanType; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <Card className={cx('flex flex-col', c.preferredPlan === plan && 'ring-2 ring-teal')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-electric-50 p-2 text-electric">{icon}</span>
          <h2 className="font-bold">{title}</h2>
        </div>
        {c.preferredPlan === plan && (
          <Badge tone="teal">
            <CheckCircle2 className="h-3 w-3" /> Selected
          </Badge>
        )}
      </div>
      <div className="flex-1 space-y-3">{children}</div>
      <Button className="mt-4" block variant={c.preferredPlan === plan ? 'outline' : 'primary'} onClick={() => choose(plan)}>
        {c.preferredPlan === plan ? 'Selected — send again for review' : t('Choose this plan')}
      </Button>
    </Card>
  );
  const Row = ({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className={cx('text-right tabular-nums', strong ? 'text-base font-bold text-teal-700' : 'font-semibold')}>{v}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <button onClick={() => nav('/my/plan')} className="inline-flex items-center gap-1 text-sm font-semibold text-electric">
        <ArrowLeft className="h-4 w-4" /> {t('Back')}
      </button>
      <div>
        <h1 className="text-2xl font-bold">{t('Choose how you want to pay')}</h1>
        <p className="text-slate-500">
          For about {num(ch.solarKw, 1)} kW solar{ch.batteryKwh > 0 ? ` + ${ch.batteryKwh} kWh battery` : ''}. All amounts are estimates for the first year.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard plan="ppa" title={t('Plan A: JioUrja Energy-as-a-Service')} icon={<Zap className="h-5 w-5" />}>
          <p className="text-sm text-slate-600">JioUrja owns, installs and maintains the system. You pay only for the solar electricity you get, at a fixed price per unit.</p>
          <Row k="Installation cost" v="₹0" />
          <Row k="Refundable security deposit" v={`about ${inr(roundFriendly(ppa.upfrontDepositInr))}`} />
          <Row k="Contract length" v={`${a.assumptions.ppaTermYears} years`} />
          <Row k="Price per solar unit (illustrative)" v={`₹${ch.ppaRateInrPerKwh.toFixed(2)}`} />
          <Row k="Your monthly payment to JioUrja" v={`about ${inr(roundFriendly(ppa.monthlyPaymentInr))}`} />
          <Row k="Electricity bill you avoid" v={`about ${inr(roundFriendly(ppa.year1AvoidedInr / 12))}`} />
          <Row k="Your net savings per month" v={inr(roundFriendly(ppa.monthlyNetSavingsInr))} strong />
          <div className="flex items-start gap-2 rounded-xl bg-surface p-3 text-sm">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            Cleaning schedule, repairs, monitoring and insurance included.
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Eligibility review</span>
            <Badge tone={scr.tone}>{scr.text}</Badge>
          </div>
        </PlanCard>

        <PlanCard plan="loan" title={t('Plan B: Own the system with a loan')} icon={<Landmark className="h-5 w-5" />}>
          <p className="text-sm text-slate-600">You own the system. A partner lender may finance it, subject to their approval. You keep all the savings once the loan ends.</p>
          <Row k="Estimated installation cost" v={inr(roundFriendly(loan.installationCostInr))} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Down payment">
              <Select value={a.assumptions.downPaymentPct} onChange={(e) => setLoan({ downPaymentPct: Number(e.target.value) })}>
                {[10, 20, 30, 40].map((p) => (
                  <option key={p} value={p}>
                    {p}%
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Loan tenure">
              <Select value={a.assumptions.loanTenureMonths} onChange={(e) => setLoan({ loanTenureMonths: Number(e.target.value) })}>
                {[36, 60, 84].map((m) => (
                  <option key={m} value={m}>
                    {m / 12} years
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Row k="Down payment" v={inr(roundFriendly(loan.downPaymentInr))} />
          <Row k="Loan amount" v={inr(roundFriendly(loan.loanAmountInr))} />
          <Row k="Interest rate (indicative)" v={`${loan.interestPct}% a year`} />
          <Row k="Monthly EMI" v={inr(Math.round(loan.emiInr))} />
          <Row k="Maintenance (your cost)" v={`about ${inr(roundFriendly(loan.year1OmInr / 12))}/month`} />
          <Row k="Net savings during the loan" v={`${inr(roundFriendly(loan.monthlyNetDuringLoanInr))}/month`} strong />
          <Row k="Net savings after the loan" v={`${inr(roundFriendly(loan.monthlyNetAfterLoanInr))}/month`} />
          {loan.monthlyNetDuringLoanInr < 0 && <Notice tone="warn">During the loan, the EMI is higher than the estimated savings. A longer tenure or larger down payment lowers the EMI.</Notice>}
        </PlanCard>
      </div>
      <Notice tone="info">
        Choosing a plan sends a request for commercial review. It is not an approved agreement. Approval depends on document checks, eligibility review by JioUrja and, for loans, the lender’s own decision. Not every business will qualify
        for the zero-installation-cost plan.
      </Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          size="lg"
          icon={<FileDown className="h-5 w-5" />}
          onClick={() => {
            store.set((st) => generateProposal(st, c.id, 'Customer portal', 'draft'));
            nav(`/proposal/${c.id}`);
          }}
        >
          {t('Download Preliminary Proposal')}
        </Button>
        <Button size="lg" variant="teal" onClick={() => nav('/my/book')}>
          {t('Book My Free Site Assessment')}
        </Button>
      </div>
    </div>
  );
}
