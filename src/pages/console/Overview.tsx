import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, CalendarClock } from 'lucide-react';
import { Badge, Card, SimLabel } from '@/components/ui';
import { getTelemetry, useAppState } from '@/store/store';
import { stageLabel } from '@/store/actions';
import { STAGES } from '@/types';
import type { AppState } from '@/types';
import { dateLabel, dateTimeLabel, inrShort, num } from '@/lib/format';
import { PageHeader, useStaff } from './ConsoleLayout';

export function portfolioMetrics(s: AppState) {
  const active = s.customers.filter((c) => c.stage === 'system_active');
  const tels = active.map((c) => ({ c, t: getTelemetry(c, s) }));
  return {
    leads: s.customers.length,
    awaitingScreening: s.customers.filter((c) => c.stage !== 'system_active' && c.screening.status !== 'ready_for_commercial_assessment').length,
    surveysPending: s.surveys.filter((v) => ['requested', 'confirmed', 'rescheduled'].includes(v.status)).length,
    approvedProposals: s.customers.filter((c) => c.proposals.some((p) => p.status === 'approved' || p.status === 'customer_accepted')).length,
    activeInstallations: active.length,
    inProgressInstallations: s.customers.filter((c) => c.stage === 'installation_scheduled' || c.stage === 'installation_complete').length,
    solarKw: active.reduce((x, c) => x + (c.installation.solarKw ?? 0), 0),
    batteryKwh: active.reduce((x, c) => x + (c.installation.batteryKwh ?? 0), 0),
    energyKwh: tels.reduce((x, { t }) => x + (t?.months.reduce((y, m) => y + m.solarKwh, 0) ?? 0), 0),
    savingsInr: tels.reduce((x, { t }) => x + (t?.months.reduce((y, m) => y + m.netSavingsInr, 0) ?? 0), 0),
    paymentExceptions: tels.filter(({ t }) => (t?.outstandingInr ?? 0) > 0).length,
    outstandingInr: tels.reduce((x, { t }) => x + (t?.outstandingInr ?? 0), 0),
    maintenanceAlerts: s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status) && (t.category === 'system_alert' || t.category === 'problem' || t.category === 'engineer_visit')).length,
    openTickets: s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length,
    tels,
  };
}

export default function Overview() {
  const s = useAppState();
  const staff = useStaff();
  const m = portfolioMetrics(s);
  const byStage = STAGES.map((st) => ({ stage: stageLabel(st).replace('Rooftop and document verification', 'Roof & docs'), count: s.customers.filter((c) => c.stage === st).length }));
  const activity = s.customers
    .flatMap((c) => c.activity.map((a) => ({ ...a, c })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
  const requested = s.surveys.filter((v) => v.status === 'requested');
  const openTickets = s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
  const tiles: [string, string, string?][] = [
    ['Leads received', num(m.leads)],
    ['Awaiting screening', num(m.awaitingScreening)],
    ['Roof surveys pending', num(m.surveysPending)],
    ['Approved proposals', num(m.approvedProposals)],
    ['Active installations', num(m.activeInstallations), `${m.inProgressInstallations} in progress`],
    ['Installed solar', `${num(m.solarKw, 1)} kW`],
    ['Installed battery', `${num(m.batteryKwh)} kWh`],
    ['Energy generated', `${num(m.energyKwh / 1000, 1)} MWh`, 'simulated, last 12 months'],
    ['Payment exceptions', num(m.paymentExceptions), m.outstandingInr ? `${inrShort(m.outstandingInr)} overdue` : undefined],
    ['Maintenance alerts', num(m.maintenanceAlerts)],
  ];
  return (
    <div>
      <PageHeader title={`Good day, ${staff.name.split(' ')[0]}`} subtitle="Portfolio metrics are computed from the records in this demo — seeded fictional customers plus any enquiries created in this browser." actions={<SimLabel>Illustrative portfolio</SimLabel>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([k, v, h]) => (
          <div key={k} className="rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-200/60">
            <div className="text-xs font-medium text-slate-500">{k}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{v}</div>
            {h && <div className="text-[11px] text-slate-400">{h}</div>}
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Pipeline by stage" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byStage} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="stage" width={130} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#087AD1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Needs attention">
          <ul className="space-y-2 text-sm">
            {requested.map((v) => {
              const c = s.customers.find((x) => x.id === v.customerId);
              return (
                <li key={v.id}>
                  <Link to="/console/operations" className="flex items-start gap-2 rounded-lg p-2 hover:bg-slate-50">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-electric" />
                    <span>
                      <span className="font-semibold">Confirm site visit</span> — {c?.business.name}
                      <span className="block text-xs text-slate-500">Requested for {dateLabel(v.preferredDate)} ({v.timeWindow})</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {openTickets.map((t) => {
              const c = s.customers.find((x) => x.id === t.customerId);
              return (
                <li key={t.id}>
                  <Link to="/console/operations?tab=tickets" className="flex items-start gap-2 rounded-lg p-2 hover:bg-slate-50">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <span>
                      <span className="font-semibold">{t.subject}</span>
                      <span className="block text-xs text-slate-500">
                        {c?.business.name} · {t.status.replace('_', ' ')}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {requested.length + openTickets.length === 0 && <li className="text-slate-500">Nothing pending.</li>}
          </ul>
        </Card>
      </div>
      <Card title="Recent activity" className="mt-5" action={<Link to="/console/pipeline" className="inline-flex items-center gap-1 text-sm font-semibold text-electric">Pipeline <ArrowRight className="h-4 w-4" /></Link>}>
        <ul className="divide-y divide-slate-100 text-sm">
          {activity.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <Link to={`/console/customers/${a.c.id}`} className="font-semibold text-electric hover:underline">
                  {a.c.business.name}
                </Link>{' '}
                — {a.text}
              </span>
              <span className="text-xs text-slate-500">
                {a.by} · {dateTimeLabel(a.at)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-xs text-slate-400">
        <Badge>Note</Badge> Energy and savings figures for installed systems are simulated by the calculation engine; there is no live telemetry in this prototype.
      </p>
    </div>
  );
}
