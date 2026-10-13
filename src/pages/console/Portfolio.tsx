import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, Select, SimLabel, Stat } from '@/components/ui';
import { useAppState } from '@/store/store';
import { inr, inrShort, monthLabel, num } from '@/lib/format';
import { PageHeader } from './ConsoleLayout';
import { portfolioMetrics } from './Overview';

export default function Portfolio() {
  const s = useAppState();
  const m = portfolioMetrics(s);
  const active = m.tels.filter((x) => x.t);
  const [selId, setSelId] = useState(active[0]?.c.id ?? '');
  const months = Array.from(new Set(active.flatMap((x) => x.t!.months.map((mm) => mm.month)))).sort().slice(-12);
  const agg = months.map((mo) => {
    const row: Record<string, number | string> = { month: monthLabel(mo) };
    active.forEach(({ c, t }) => {
      const r = t!.months.find((x) => x.month === mo);
      row[c.business.name] = Math.round(r?.solarKwh ?? 0);
    });
    return row;
  });
  const savings = months.map((mo) => ({
    month: monthLabel(mo),
    'Customer net savings': Math.round(active.reduce((x, { t }) => x + (t!.months.find((r) => r.month === mo)?.netSavingsInr ?? 0), 0)),
    'Bill avoided': Math.round(active.reduce((x, { t }) => x + (t!.months.find((r) => r.month === mo)?.avoidedCostInr ?? 0), 0)),
  }));
  const avail = active.length ? active.reduce((x, { t }) => x + t!.months.reduce((y, r) => y + r.availabilityPct, 0) / Math.max(1, t!.months.length), 0) / active.length : 0;
  const sel = active.find((x) => x.c.id === selId);
  const colors = ['#087AD1', '#12B8A6', '#F1B650', '#092348', '#94a3b8'];
  const alerts = s.tickets.filter((t) => t.category === 'system_alert' && !['resolved', 'closed'].includes(t.status));
  return (
    <div>
      <PageHeader title="Portfolio monitoring" subtitle="Aggregate view of operating assets. All operating data is simulated by the calculation engine (no live telemetry)." actions={<SimLabel>Simulated monitoring</SimLabel>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Operating systems" value={num(m.activeInstallations)} />
        <Stat label="Installed capacity" value={`${num(m.solarKw, 1)} kWp`} hint={`${num(m.batteryKwh)} kWh storage`} />
        <Stat label="Generation (12 mo)" value={`${num(m.energyKwh / 1000, 1)} MWh`} />
        <Stat label="Customer net savings" value={inrShort(m.savingsInr)} tone="teal" hint="after payments, 12 mo" />
        <Stat label="Avg availability" value={`${avail.toFixed(1)}%`} />
        <Stat label="Outstanding payments" value={inr(m.outstandingInr)} tone={m.outstandingInr ? 'amber' : undefined} hint={`${m.paymentExceptions} customer(s)`} />
        <Stat label="Open equipment alerts" value={num(alerts.length)} tone={alerts.length ? 'amber' : undefined} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Monthly generation by site (units)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={agg}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {active.map(({ c }, i) => (
                  <Bar key={c.id} dataKey={c.business.name} stackId="a" fill={colors[i % colors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Customer energy savings (₹)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={savings}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Bill avoided" stroke="#087AD1" strokeWidth={2} />
                <Line type="monotone" dataKey="Customer net savings" stroke="#12B8A6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="System drill-down" className="mt-5" action={<Select className="h-9 w-auto text-sm" value={selId} onChange={(e) => setSelId(e.target.value)}>{active.map(({ c }) => <option key={c.id} value={c.id}>{c.business.name}</option>)}</Select>}>
        {sel?.t ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link to={`/console/customers/${sel.c.id}`} className="font-semibold text-electric hover:underline">
                {sel.c.business.name}
              </Link>
              <Badge tone={sel.t.status === 'ok' ? 'teal' : 'amber'}>{sel.t.status === 'ok' ? 'Normal' : 'Alert open'}</Badge>
              <span className="text-slate-500">
                {num(sel.c.installation.solarKw, 1)} kW{sel.c.installation.batteryKwh ? ` + ${sel.c.installation.batteryKwh} kWh` : ''} · {sel.c.installation.planType === 'ppa' ? 'PPA' : 'Financed'}
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={sel.t.today.map((d) => ({ hour: `${d.hour}:00`, Solar: +d.solarKw.toFixed(1), Load: +d.loadKw.toFixed(1), Grid: +d.gridKw.toFixed(1), ...(sel.c.installation.batteryKwh ? { Battery: +d.batteryKw.toFixed(1) } : {}) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" fontSize={11} interval={2} />
                  <YAxis fontSize={11} unit=" kW" width={55} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="Solar" stroke="#F1B650" strokeWidth={2} dot={false} />
                  <Line dataKey="Load" stroke="#092348" strokeWidth={2} dot={false} />
                  <Line dataKey="Grid" stroke="#087AD1" strokeWidth={2} dot={false} />
                  {sel.c.installation.batteryKwh ? <Line dataKey="Battery" stroke="#12B8A6" strokeWidth={2} dot={false} /> : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    {['Month', 'Solar units', 'Consumption', 'Grid import', 'Battery', 'Avoided', 'Payment', 'Net', 'Avail.'].map((h) => (
                      <th key={h} className="py-1 pr-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {sel.t.months.map((r) => (
                    <tr key={r.month}>
                      <td className="py-1">{monthLabel(r.month)}</td>
                      <td>{num(r.solarKwh)}</td>
                      <td>{num(r.consumptionKwh)}</td>
                      <td>{num(r.gridImportKwh)}</td>
                      <td>{num(r.batteryDeliveredKwh)}</td>
                      <td>{inr(r.avoidedCostInr)}</td>
                      <td>{inr(r.paymentInr)}</td>
                      <td>{inr(r.netSavingsInr)}</td>
                      <td>{r.availabilityPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No active systems.</p>
        )}
      </Card>
    </div>
  );
}
