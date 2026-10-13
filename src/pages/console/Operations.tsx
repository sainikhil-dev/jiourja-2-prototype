import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, SimLabel, Tabs, Textarea, useToast } from '@/components/ui';
import { getTelemetry, store, useAppState } from '@/store/store';
import { createTicket, stageLabel, updateSurvey, updateTicket } from '@/store/actions';
import { FIELD_ENGINEERS } from '@/data/seed';
import { dateLabel, dateTimeLabel, num } from '@/lib/format';
import type { ServiceTicket, SiteSurvey, TicketStatus } from '@/types';
import { ticketTone } from '@/pages/customer/Portal';
import { can, PageHeader, PermissionNote, useStaff } from './ConsoleLayout';

type Tab = 'surveys' | 'installs' | 'active' | 'tickets';

export default function Operations() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'surveys';
  const s = useAppState();
  const openT = s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length;
  const pendingS = s.surveys.filter((v) => v.status === 'requested').length;
  return (
    <div>
      <PageHeader title="Installation & maintenance" subtitle="Site survey appointments, installations, active systems, fault alerts and service tickets." />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={(t) => setSp({ tab: t })}
        tabs={[
          { id: 'surveys', label: `Site surveys${pendingS ? ` (${pendingS})` : ''}` },
          { id: 'installs', label: 'Installations' },
          { id: 'active', label: 'Active systems' },
          { id: 'tickets', label: `Service tickets${openT ? ` (${openT})` : ''}` },
        ]}
      />
      {tab === 'surveys' && <Surveys />}
      {tab === 'installs' && <Installs />}
      {tab === 'active' && <ActiveSystems />}
      {tab === 'tickets' && <Tickets />}
    </div>
  );
}

function Surveys() {
  const s = useAppState();
  const staff = useStaff();
  const toast = useToast();
  const [edit, setEdit] = useState<SiteSurvey | null>(null);
  const [date, setDate] = useState('');
  const [eng, setEng] = useState(FIELD_ENGINEERS[0]);
  const allowed = can(staff.role, 'operations') || can(staff.role, 'verify_roof');
  const list = [...s.surveys].sort((a, b) => (a.status === 'requested' ? -1 : 1) - (b.status === 'requested' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt));
  if (!list.length) return <EmptyState title="No site survey requests yet" />;
  return (
    <Card>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {['Customer', 'Requested', 'Preferred', 'Contact', 'Engineer', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((v) => {
              const c = s.customers.find((x) => x.id === v.customerId);
              return (
                <tr key={v.id}>
                  <td className="px-4 py-3">
                    <Link to={`/console/customers/${v.customerId}`} className="font-semibold text-electric hover:underline">
                      {c?.business.name}
                    </Link>
                    {v.notes && <div className="max-w-xs truncate text-xs text-slate-500">“{v.notes}”</div>}
                  </td>
                  <td className="px-4 py-3">{dateTimeLabel(v.createdAt)}</td>
                  <td className="px-4 py-3">
                    {dateLabel(v.confirmedDate ?? v.preferredDate)} · {v.timeWindow}
                  </td>
                  <td className="px-4 py-3">
                    {v.contactName}
                    <div className="text-xs text-slate-500">{v.phone}</div>
                  </td>
                  <td className="px-4 py-3">{v.engineer ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={v.status === 'requested' ? 'amber' : v.status === 'cancelled' ? 'red' : 'teal'}>{v.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {['requested', 'rescheduled'].includes(v.status) && (
                        <Button
                          size="sm"
                          disabled={!allowed}
                          onClick={() => {
                            setEdit(v);
                            setDate(v.preferredDate);
                            setEng(v.engineer ?? FIELD_ENGINEERS[0]);
                          }}
                        >
                          Confirm
                        </Button>
                      )}
                      {v.status === 'confirmed' && (
                        <>
                          <Button size="sm" variant="teal" disabled={!allowed} onClick={() => (store.set((st) => updateSurvey(st, v.id, { status: 'completed' }, staff.name)), toast('Survey marked completed'))}>
                            Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!allowed}
                            onClick={() => {
                              setEdit(v);
                              setDate(v.confirmedDate ?? v.preferredDate);
                              setEng(v.engineer ?? FIELD_ENGINEERS[0]);
                            }}
                          >
                            Reschedule
                          </Button>
                        </>
                      )}
                      {!['completed', 'cancelled'].includes(v.status) && (
                        <Button size="sm" variant="ghost" disabled={!allowed} onClick={() => store.set((st) => updateSurvey(st, v.id, { status: 'cancelled' }, staff.name))}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!allowed && <PermissionNote action="operations" />}
      <p className="mt-3 text-xs text-slate-500">Confirming records the appointment in the shared demo data. No external technician-dispatch system is connected.</p>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Confirm site visit"
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!edit) return;
                store.set((st) => updateSurvey(st, edit.id, { status: 'confirmed', confirmedDate: date, engineer: eng }, staff.name));
                setEdit(null);
                toast('Visit confirmed — customer can now see the date and engineer');
              }}
            >
              Confirm visit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Visit date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Field engineer">
            <Select value={eng} onChange={(e) => setEng(e.target.value)}>
              {FIELD_ENGINEERS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </Card>
  );
}

function Installs() {
  const s = useAppState();
  const list = s.customers.filter((c) => ['customer_acceptance', 'installation_scheduled', 'installation_complete'].includes(c.stage));
  if (!list.length) return <EmptyState title="No installations in progress" />;
  return (
    <Card>
      <ul className="divide-y divide-slate-100 text-sm">
        {list.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>
              <Link to={`/console/customers/${c.id}`} className="font-semibold text-electric hover:underline">
                {c.business.name}
              </Link>
              <span className="ml-2 text-slate-500">
                {c.installation.scheduledDate ? `Scheduled ${dateLabel(c.installation.scheduledDate)} · ${c.installation.engineer}` : 'Not scheduled'}
                {c.installation.solarKw ? ` · ${num(c.installation.solarKw, 1)} kW${c.installation.batteryKwh ? ` + ${c.installation.batteryKwh} kWh` : ''}` : ''}
              </span>
            </span>
            <Badge tone="blue">{stageLabel(c.stage)}</Badge>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Schedule, complete and commission installations from the customer detail page.</p>
    </Card>
  );
}

function ActiveSystems() {
  const s = useAppState();
  const staff = useStaff();
  const toast = useToast();
  const list = s.customers.filter((c) => c.stage === 'system_active');
  return (
    <Card title="Active systems" action={<SimLabel />}>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {['Customer', 'System', 'Plan', 'Last month generation', 'Availability', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((c) => {
              const t = getTelemetry(c, s);
              const last = t?.months[t.months.length - 1];
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <Link to={`/console/customers/${c.id}`} className="font-semibold text-electric hover:underline">
                      {c.business.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {num(c.installation.solarKw, 1)} kW{c.installation.batteryKwh ? ` + ${c.installation.batteryKwh} kWh` : ''}
                  </td>
                  <td className="px-4 py-3">{c.installation.planType === 'ppa' ? 'PPA' : 'Financed'}</td>
                  <td className="px-4 py-3 tabular-nums">{num(last?.solarKwh)} units</td>
                  <td className="px-4 py-3 tabular-nums">{num(last?.availabilityPct, 1)}%</td>
                  <td className="px-4 py-3">
                    <Badge tone={t?.status === 'ok' ? 'teal' : 'amber'}>{t?.status === 'ok' ? 'Normal' : 'Alert open'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const r = createTicket(
                          store.get(),
                          c.id,
                          { category: 'system_alert', subject: 'Low generation vs expected (simulated alert)', description: 'Simulated monitoring rule triggered by staff for demonstration: generation below expected for 2 days.', priority: 'medium' },
                          'monitoring_simulated',
                          staff.name,
                        );
                        store.set(r.state);
                        toast('Simulated fault alert raised — customer dashboard now shows “needs attention”');
                      }}
                    >
                      Simulate fault alert
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Tickets() {
  const s = useAppState();
  const staff = useStaff();
  const toast = useToast();
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [view, setView] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const list = s.tickets.filter((t) => filter === 'all' || !['resolved', 'closed'].includes(t.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const t = s.tickets.find((x) => x.id === view) ?? null;
  const setStatus = (tk: ServiceTicket, status: TicketStatus) => {
    store.set((st) => updateTicket(st, tk.id, { status, note: note || undefined }, staff.name));
    setNote('');
    toast(`Ticket ${status.replace('_', ' ')} — customer view updated`);
  };
  return (
    <Card
      action={
        <Select className="h-9 w-auto text-sm" value={filter} onChange={(e) => setFilter(e.target.value as 'open' | 'all')}>
          <option value="open">Open tickets</option>
          <option value="all">All tickets</option>
        </Select>
      }
      title="Service tickets"
    >
      {list.length === 0 ? (
        <EmptyState title="No tickets" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((tk) => {
            const c = s.customers.find((x) => x.id === tk.customerId);
            return (
              <li key={tk.id}>
                <button onClick={() => setView(tk.id)} className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-slate-50">
                  <span>
                    <span className="font-semibold">{tk.subject}</span>
                    <span className="block text-xs text-slate-500">
                      {c?.business.name} · {tk.category.replace('_', ' ')} · {tk.priority} priority · updated {dateTimeLabel(tk.updatedAt)}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    {tk.source === 'monitoring_simulated' && <SimLabel>Simulated</SimLabel>}
                    <Badge tone={ticketTone(tk.status)}>{tk.status.replace('_', ' ')}</Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={!!t} onClose={() => setView(null)} title={t?.subject ?? ''} wide>
        {t && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone={ticketTone(t.status)}>{t.status.replace('_', ' ')}</Badge>
              <Badge>{t.category.replace('_', ' ')}</Badge>
              <Badge tone={t.priority === 'high' ? 'red' : 'slate'}>{t.priority}</Badge>
            </div>
            <p>{t.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assign engineer">
                <Select value={t.engineer ?? ''} onChange={(e) => (store.set((st) => updateTicket(st, t.id, { engineer: e.target.value, status: t.status === 'open' ? 'assigned' : undefined }, staff.name)), toast('Engineer assigned'))}>
                  <option value="" disabled>
                    Select…
                  </option>
                  {FIELD_ENGINEERS.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Note to add with the status change" optional>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Panels cleaned and connector replaced" />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={t.status === 'in_progress'} onClick={() => setStatus(t, 'in_progress')}>
                In progress
              </Button>
              <Button size="sm" variant="teal" disabled={t.status === 'resolved'} onClick={() => setStatus(t, 'resolved')}>
                Mark resolved
              </Button>
              <Button size="sm" variant="ghost" disabled={t.status === 'closed'} onClick={() => setStatus(t, 'closed')}>
                Close
              </Button>
              <Button size="sm" variant="ghost" disabled={t.status === 'open'} onClick={() => setStatus(t, 'open')}>
                Reopen
              </Button>
            </div>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-3">
              {t.history.map((h, i) => (
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
