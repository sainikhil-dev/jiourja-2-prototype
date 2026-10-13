import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarCheck, CheckCircle2, ClipboardList, CreditCard, FileDown, FileText, Headphones, Home, LifeBuoy, PiggyBank, Repeat, Sun, Wrench } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, LinkButton, Modal, Notice, Select, SimLabel, Stat, Tabs, Textarea, useToast } from '@/components/ui';
import { EnergyFlow, roofStatusLabel, screeningLabel, StageTracker } from '@/components/customerBits';
import { useI18n } from '@/i18n/i18n';
import { getAssessment, getTelemetry, store, useAppState } from '@/store/store';
import { acceptProposal, createTicket, generateProposal, stageLabel } from '@/store/actions';
import { dateLabel, dateTimeLabel, inr, monthLabel, num, roundFriendly } from '@/lib/format';
import type { Customer, ServiceTicket, TicketCategory } from '@/types';

export default function Portal() {
  const s = useAppState();
  const { t } = useI18n();
  const c = s.customers.find((x) => x.id === s.portalCustomerId);
  if (!c)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <EmptyState title="You have not started an enquiry yet" action={<LinkButton to="/start">{t('Check My Savings')}</LinkButton>}>
          Or open a fictional sample customer to explore the customer portal.
        </EmptyState>
        <LinkButton to="/my/accounts" variant="outline" block>
          {t('View Sample Customer')}
        </LinkButton>
      </div>
    );
  return c.stage === 'system_active' ? <ActiveDashboard c={c} /> : <EnquiryHome c={c} />;
}

function SwitchAccountLink() {
  const { t } = useI18n();
  return (
    <LinkButton to="/my/accounts" variant="ghost" size="sm" icon={<Repeat className="h-4 w-4" />}>
      {t('Switch demo customer')}
    </LinkButton>
  );
}

function EnquiryHome({ c }: { c: Customer }) {
  const s = useAppState();
  const { t } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const a = getAssessment(c, s);
  const ch = a.recommendation.chosen;
  const survey = s.surveys.filter((v) => v.customerId === c.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
  const scr = screeningLabel(c.screening.status);
  const roof = roofStatusLabel(c.roof.status);
  const lastProposal = c.proposals[c.proposals.length - 1];
  const tickets = s.tickets.filter((x) => x.customerId === c.id);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{t('My enquiry')}</p>
          <h1 className="text-2xl font-bold">{c.business.name}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone="blue">{t(stageLabel(c.stage))}</Badge>
            {(c.origin === 'seed' || c.sampleTag) && <SimLabel>Fictional customer</SimLabel>}
          </div>
        </div>
        <SwitchAccountLink />
      </div>

      {lastProposal?.status === 'approved' && (
        <Card className="ring-2 ring-teal">
          <h2 className="text-lg font-bold">Your final proposal is ready</h2>
          <p className="mt-1 text-sm text-slate-600">
            {num(lastProposal.solarKw, 1)} kW solar{lastProposal.batteryKwh > 0 ? ` + ${lastProposal.batteryKwh} kWh battery` : ''} on the {lastProposal.planType === 'loan' ? 'financed ownership' : 'Energy-as-a-Service'} plan. Estimated net
            savings {inr(roundFriendly(lastProposal.planType === 'loan' ? lastProposal.loanMonthlyNetInr : lastProposal.ppaMonthlyNetSavingsInr))} a month.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="teal"
              onClick={() => {
                store.set((st) => acceptProposal(st, c.id));
                toast('Thank you. Our team will send the contract for signing.');
              }}
            >
              Accept proposal
            </Button>
            <Button variant="outline" onClick={() => nav(`/proposal/${c.id}`)} icon={<FileText className="h-4 w-4" />}>
              View proposal
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Accepting signals your intent; the agreement is formed only when the contract is signed by both parties.</p>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-5">
        <div className="space-y-5 md:col-span-3">
          <Card title="What is happening now">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-electric" /> Site visit
                </span>
                {survey ? (
                  <span className="text-right">
                    <Badge tone={survey.status === 'confirmed' ? 'teal' : survey.status === 'completed' ? 'green' : 'amber'}>{survey.status === 'requested' ? 'Waiting for confirmation' : survey.status}</Badge>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {dateLabel(survey.confirmedDate ?? survey.preferredDate)} · {survey.timeWindow}
                      {survey.engineer ? ` · ${survey.engineer}` : ''}
                    </div>
                  </span>
                ) : (
                  <Button size="sm" onClick={() => nav('/my/book')}>
                    Book visit
                  </Button>
                )}
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-600" /> Electricity assessment
                </span>
                <Badge tone={c.energyAssessmentStatus === 'reviewed_by_staff' ? 'teal' : 'blue'}>{c.energyAssessmentStatus === 'reviewed_by_staff' ? 'Reviewed by our team' : 'Preliminary estimate'}</Badge>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-teal-700" /> Roof
                </span>
                <Badge tone={roof.tone === 'red' ? 'red' : roof.tone}>{roof.text}</Badge>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-navy" /> Eligibility
                </span>
                <Badge tone={scr.tone}>{scr.text}</Badge>
              </li>
              {c.installation.scheduledDate && (
                <li className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-navy" /> Installation
                  </span>
                  <span className="text-right text-sm font-semibold">{dateLabel(c.installation.scheduledDate)}</span>
                </li>
              )}
            </ul>
            {c.screening.status === 'additional_documents_required' && (
              <Notice tone="warn" className="mt-4">
                {c.business.premises === 'rented' ? 'We will need a letter of permission (NOC) from your landlord and a copy of your lease. ' : ''}Our team will tell you exactly which documents are needed. Please do not upload ID or
                financial documents in this demo.
              </Notice>
            )}
          </Card>
          {ch && (
            <Card title="Your preliminary plan" action={<LinkButton to="/my/plan" variant="ghost" size="sm">View</LinkButton>}>
              <div className="grid grid-cols-2 gap-3">
                <Stat label={t('Recommended system')} value={ch.batteryKwh > 0 ? `${num(ch.solarKw, 1)} kW + ${ch.batteryKwh} kWh` : `${num(ch.solarKw, 1)} kW solar`} />
                <Stat label={t('Approximate monthly savings')} tone="teal" value={`${inr(roundFriendly(a.recommendation.savingsRangeMonthlyInr[0]))}+`} />
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Payment plan: <strong>{c.preferredPlan === 'ppa' ? 'Energy-as-a-Service (under review)' : c.preferredPlan === 'loan' ? 'Financed ownership (under review)' : 'Not chosen yet'}</strong>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => nav('/my/payment')}>
                  {t('Compare payment options')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<FileDown className="h-4 w-4" />}
                  onClick={() => {
                    store.set((st) => generateProposal(st, c.id, 'Customer portal', 'draft'));
                    nav(`/proposal/${c.id}`);
                  }}
                >
                  Proposal
                </Button>
              </div>
            </Card>
          )}
          <HelpPanel c={c} tickets={tickets} />
        </div>
        <Card title={t('Your progress')} className="md:col-span-2">
          <StageTracker customer={c} />
        </Card>
      </div>
    </div>
  );
}

function ActiveDashboard({ c }: { c: Customer }) {
  const s = useAppState();
  const { t } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState<'home' | 'savings' | 'plan' | 'help'>('home');
  const tel = getTelemetry(c, s);
  const tickets = s.tickets.filter((x) => x.customerId === c.id);
  const inst = c.installation;
  const hasBattery = (inst.batteryKwh ?? 0) > 0;
  if (!tel) return <EmptyState title="Monitoring data will appear after the first full month of operation." />;
  const last = tel.months[tel.months.length - 1];
  const nowHour = Math.min(23, new Date().getHours());
  const now = tel.today[nowHour] ?? tel.today[12];
  const six = tel.months.slice(-6).map((m) => ({ month: monthLabel(m.month), 'Bill avoided': Math.round(m.avoidedCostInr), [inst.planType === 'ppa' ? 'JioUrja payment' : 'EMI + maintenance']: Math.round(m.paymentInr), 'Net savings': Math.round(m.netSavingsInr) }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{c.business.name}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone="teal">{t('System active')}</Badge>
            <SimLabel>Simulated monitoring — not live hardware data</SimLabel>
          </div>
        </div>
        <SwitchAccountLink />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'home', label: t('Home'), icon: <Home className="h-4 w-4" /> },
          { id: 'savings', label: t('Savings'), icon: <PiggyBank className="h-4 w-4" /> },
          { id: 'plan', label: t('My Plan'), icon: <FileText className="h-4 w-4" /> },
          { id: 'help', label: t('Help'), icon: <LifeBuoy className="h-4 w-4" /> },
        ]}
      />
      {tab === 'home' && (
        <div className="space-y-5">
          {tel.status === 'ok' ? (
            <div className="flex items-center gap-3 rounded-2xl bg-teal-50 p-5 ring-1 ring-teal-100">
              <CheckCircle2 className="h-9 w-9 shrink-0 text-teal" />
              <div>
                <div className="text-xl font-bold text-teal-800">{t('Your solar system is working well.')}</div>
                <div className="text-sm text-teal-800/80">Last checked from simulated monitoring data.</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
              <AlertTriangle className="h-9 w-9 shrink-0 text-amber-600" />
              <div className="flex-1">
                <div className="text-xl font-bold text-amber-900">{t('Your system needs attention. Request an engineer.')}</div>
                <div className="text-sm text-amber-900/80">Our team has been alerted. You can track it under Help.</div>
              </div>
              <Button variant="secondary" onClick={() => setTab('help')}>
                {t('Request an engineer')}
              </Button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={`${t('Estimated savings this month')} (${last ? monthLabel(last.month) : '—'})`} tone="teal" value={inr(roundFriendly(last?.netSavingsInr ?? 0))} hint={inst.planType === 'ppa' ? 'after JioUrja payments' : 'after EMI and maintenance'} />
            <Stat label={t('Solar units generated')} value={`${num(last?.solarKwh)} units`} hint={last ? monthLabel(last.month) : ''} />
            <Stat label={t('System status')} value={tel.status === 'ok' ? 'Working' : 'Needs attention'} hint={`${num(last?.availabilityPct, 1)}% available`} tone={tel.status === 'ok' ? 'teal' : 'amber'} />
          </div>
          <Card title="Right now (simulated)" subtitle={`Typical ${monthLabel(new Date().toISOString().slice(0, 7))} day at ${nowHour}:00`}>
            <EnergyFlow solarKw={now?.solarKw ?? 0} loadKw={now?.loadKw ?? 0} gridKw={now?.gridKw ?? 0} batteryKw={now?.batteryKw ?? 0} socPct={now?.socPct ?? null} hasBattery={hasBattery} />
            {!hasBattery && <p className="mt-3 text-xs text-slate-500">Solar panels do not provide power during a grid outage unless a hybrid system with backup is installed.</p>}
          </Card>
        </div>
      )}
      {tab === 'savings' && (
        <div className="space-y-5">
          {last && (
            <Card title={`${monthLabel(last.month)} at a glance`}>
              <div className="space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <span>{t('Electricity cost avoided')}</span>
                  <strong className="tabular-nums">{inr(last.avoidedCostInr)}</strong>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>{inst.planType === 'ppa' ? 'Minus: JioUrja solar electricity payment' : 'Minus: loan EMI and maintenance plan'}</span>
                  <strong className="tabular-nums">−{inr(last.paymentInr)}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg">
                  <span className="font-semibold">{t('Net estimated savings')}</span>
                  <strong className="tabular-nums text-teal-700">{inr(last.netSavingsInr)}</strong>
                </div>
              </div>
            </Card>
          )}
          <Card title="Last six months" action={<SimLabel />}>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={six} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={11} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={48} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar isAnimationActive={false} dataKey="Bill avoided" fill="#087AD1" radius={[4, 4, 0, 0]} />
                  <Bar isAnimationActive={false} dataKey={inst.planType === 'ppa' ? 'JioUrja payment' : 'EMI + maintenance'} fill="#F1B650" radius={[4, 4, 0, 0]} />
                  <Bar isAnimationActive={false} dataKey="Net savings" fill="#12B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-500">Bill avoided is estimated by comparing with what your bill would have been without solar. Fixed charges on your electricity bill are not avoided.</p>
          </Card>
        </div>
      )}
      {tab === 'plan' && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Your plan">
            <dl className="space-y-2 text-sm">
              {[
                ['Plan type', inst.planType === 'ppa' ? 'JioUrja Energy-as-a-Service' : 'Financed ownership'],
                ['Installed solar', `${num(inst.solarKw, 1)} kW`],
                ...(hasBattery ? [['Battery', `${inst.batteryKwh} kWh / ${num(inst.batteryKw, 1)} kW`]] : []),
                ...(inst.planType === 'ppa' ? [['Price per solar unit', `₹${(inst.ppaRateInrPerKwh ?? 0).toFixed(2)}`], ['Contract', `${inst.contractYears ?? 15} years from ${dateLabel(inst.contractStart)}`]] : [['Loan EMI', inr(inst.emiInr)], ['Loan provided by', 'Partner lender (sample)']]),
                ['Commissioned', dateLabel(inst.commissionedDate)],
                ['Next payment', `${inr(tel.nextPaymentInr)} (est.) on ${dateLabel(tel.nextPaymentDate)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {tel.outstandingInr > 0 && (
              <Notice tone="warn" className="mt-3">
                One invoice of about {inr(tel.outstandingInr)} is overdue (sample). Use “Payment enquiry” under Help if you have questions.
              </Notice>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<FileDown className="h-4 w-4" />} onClick={() => nav(`/proposal/${c.id}?mode=statement`)}>
                Download statement / plan
              </Button>
            </div>
          </Card>
          <Card title="Installation documents">
            {inst.documents.length ? (
              <ul className="space-y-2 text-sm">
                {inst.documents.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2 rounded-xl bg-surface p-3">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" /> {d.name}
                    </span>
                    <Badge>Sample placeholder</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No documents yet.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">Documents are placeholders in this prototype; real documents would be issued after commissioning.</p>
          </Card>
        </div>
      )}
      {tab === 'help' && <HelpPanel c={c} tickets={tickets} />}
    </div>
  );
}

const CATS: { id: TicketCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'problem', label: 'Report a problem', icon: <AlertTriangle className="h-5 w-5" /> },
  { id: 'engineer_visit', label: 'Request an engineer', icon: <Wrench className="h-5 w-5" /> },
  { id: 'payment', label: 'Payment enquiry', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'general', label: 'Contact support', icon: <Headphones className="h-5 w-5" /> },
];

export function ticketTone(st: ServiceTicket['status']) {
  return ({ open: 'amber', assigned: 'blue', in_progress: 'blue', resolved: 'teal', closed: 'slate' } as const)[st];
}

export function HelpPanel({ c, tickets }: { c: Customer; tickets: ServiceTicket[] }) {
  const { t } = useI18n();
  const toast = useToast();
  const [cat, setCat] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<ServiceTicket | null>(null);
  const submit = () => {
    if (!cat) return;
    if (desc.trim().length < 5) return setError('Please describe the issue in a few words.');
    const label = CATS.find((x) => x.id === cat)!.label;
    const r = createTicket(store.get(), c.id, { category: cat, subject: subject.trim() || label, description: desc.trim() });
    store.set(r.state);
    setCat(null);
    setSubject('');
    setDesc('');
    setError('');
    toast('Request submitted. You can track it below.');
  };
  const live = view ? tickets.find((x) => x.id === view.id) ?? view : null;
  return (
    <Card title={t('Help')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CATS.map((x) => (
          <button key={x.id} onClick={() => setCat(x.id)} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold hover:border-electric hover:bg-electric-50/40">
            <span className="text-electric">{x.icon}</span>
            {t(x.label)}
          </button>
        ))}
      </div>
      <h3 className="mb-2 mt-5 text-sm font-semibold">{t('Track a service request')}</h3>
      {tickets.length === 0 ? (
        <p className="text-sm text-slate-500">No requests yet.</p>
      ) : (
        <ul className="space-y-2">
          {tickets.map((x) => (
            <li key={x.id}>
              <button onClick={() => setView(x)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface p-3 text-left hover:bg-slate-100">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{x.subject}</span>
                  <span className="text-xs text-slate-500">Updated {dateTimeLabel(x.updatedAt)}</span>
                </span>
                <Badge tone={ticketTone(x.status)}>{x.status.replace('_', ' ')}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!cat}
        onClose={() => setCat(null)}
        title={cat ? t(CATS.find((x) => x.id === cat)!.label) : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setCat(null)}>
              Cancel
            </Button>
            <Button onClick={submit}>{t('Submit request')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Topic">
            <Select value={cat ?? 'general'} onChange={(e) => setCat(e.target.value as TicketCategory)}>
              {CATS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Short title" optional>
            <input className="h-11 w-full rounded-xl border border-slate-300 px-3.5" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Inverter shows a red light" />
          </Field>
          <Field label="Tell us what happened" error={error}>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the issue" />
          </Field>
        </div>
      </Modal>
      <Modal open={!!live} onClose={() => setView(null)} title={live?.subject ?? ''}>
        {live && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone={ticketTone(live.status)}>{live.status.replace('_', ' ')}</Badge>
              {live.engineer && <Badge tone="blue">Engineer: {live.engineer}</Badge>}
              {live.source === 'monitoring_simulated' && <SimLabel>Simulated alert</SimLabel>}
            </div>
            <p className="text-slate-600">{live.description}</p>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-3">
              {live.history.map((h, i) => (
                <li key={i}>
                  <div className="text-xs text-slate-500">
                    {dateTimeLabel(h.at)} · {h.by}
                  </div>
                  <div>{h.text}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>
    </Card>
  );
}
