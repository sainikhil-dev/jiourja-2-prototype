import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, ClipboardCheck, ExternalLink, FileText, SunMedium, Wrench } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, Select, SimLabel, Stat, useToast } from '@/components/ui';
import { roofStatusLabel, screeningLabel, StageTracker } from '@/components/customerBits';
import { getAssessment, store, useAppState } from '@/store/store';
import { activateSystem, approveProposal, completeInstallation, generateProposal, scheduleInstallation, setAssignedRep, setStage, stageLabel } from '@/store/actions';
import { STAGES, type StageId } from '@/types';
import { FIELD_ENGINEERS, STAFF_USERS } from '@/data/seed';
import { dateLabel, dateTimeLabel, hourLabel, inr, num } from '@/lib/format';
import { openStoredFile } from '@/lib/fileStore';
import { INDUSTRIES } from '@/pages/customer/Onboarding';
import { nextWorkingDay } from '@/pages/customer/BookSurvey';
import { can, PageHeader, PermissionNote, useStaff } from './ConsoleLayout';
import { DECISION_LABEL } from './Pipeline';

export default function CustomerDetail() {
  const { id } = useParams();
  const s = useAppState();
  const staff = useStaff();
  const nav = useNavigate();
  const toast = useToast();
  const [schedOpen, setSchedOpen] = useState(false);
  const [instDate, setInstDate] = useState(nextWorkingDay(new Date(), 10));
  const [instEng, setInstEng] = useState(FIELD_ENGINEERS[0]);
  const c = s.customers.find((x) => x.id === id);
  if (!c) return <EmptyState title="Customer not found" action={<Link to="/console/pipeline">Back to pipeline</Link>} />;
  const a = getAssessment(c, s);
  const r = a.recommendation;
  const ch = r.chosen;
  const surveys = s.surveys.filter((v) => v.customerId === c.id);
  const tickets = s.tickets.filter((t) => t.customerId === c.id);
  const roof = roofStatusLabel(c.roof.status);
  const scr = screeningLabel(c.screening.status);
  const dec = DECISION_LABEL[c.eligibility.decision];
  const stageIdx = STAGES.indexOf(c.stage);
  const openFile = async (ref: Parameters<typeof openStoredFile>[0]) => {
    const ok = await openStoredFile(ref);
    if (!ok) toast('This file is not available in this browser (files are stored locally per browser).', 'error');
  };
  return (
    <div>
      <button onClick={() => nav('/console/pipeline')} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-electric">
        <ArrowLeft className="h-4 w-4" /> Pipeline
      </button>
      <PageHeader
        title={c.business.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {INDUSTRIES.find((i) => i.id === c.business.industry)?.label} · {c.business.city} {c.business.pinCode} · {c.business.contactName} · {c.business.phone}
            <SimLabel>Fictional</SimLabel>
          </span>
        }
        actions={
          <>
            <Select aria-label="Stage" className="h-10 text-sm" value={c.stage} onChange={(e) => (store.set((st) => setStage(st, c.id, e.target.value as StageId, staff.name)), toast('Stage updated — visible in the customer tracker'))}>
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {stageLabel(st)}
                </option>
              ))}
            </Select>
            <Select aria-label="Assigned representative" className="h-10 text-sm" value={c.assignedRep} onChange={(e) => store.set((st) => setAssignedRep(st, c.id, e.target.value, staff.name))}>
              {STAFF_USERS.map((u) => (
                <option key={u.id}>{u.name}</option>
              ))}
            </Select>
          </>
        }
      />
      {c.sampleTag && <Notice tone="sim" className="mb-4">{c.sampleTag}</Notice>}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Stated monthly bill" value={inr(c.bill.monthlyBillInr)} hint={c.bill.source.replace(/_/g, ' ')} />
            <Stat label="Modelled monthly bill" value={inr(r.baselineMonthlyBillInr)} hint={`${num((r.chosen?.sim.annual.loadKwh ?? 0) / 12)} units/mo`} />
            <Stat label="Effective rate" value={`₹${r.effectiveRateInrPerKwh.toFixed(2)}`} hint="total bill ÷ units" />
            <Stat label="Avoidable per solar unit" value={`₹${r.avoidableSolarRateInrPerKwh.toFixed(2)}`} hint="excl. fixed charges" tone="blue" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Rooftop" action={<Link to={`/console/roof/${c.id}`} className="text-electric"><SunMedium className="h-5 w-5" /></Link>}>
              <Badge tone={roof.tone === 'red' ? 'red' : roof.tone}>{roof.text}</Badge>
              <div className="mt-2 space-y-1 text-sm">
                <div>Gross {num(a.roof.grossAreaM2)} m² · usable {num(a.roof.usableAreaM2)} m²</div>
                <div>
                  {a.roof.panelCount} panels · {num(a.roof.capacityKw, 1)} kW · shade loss {a.roof.annualShadeLossPct.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500">Method: {c.roof.method.replace('_', ' ')} · confidence {a.roof.confidence}</div>
              </div>
              <Link to={`/console/roof/${c.id}`} className="mt-3 inline-block text-sm font-semibold text-electric">
                Open roof tool →
              </Link>
            </Card>
            <Card title="Energy" action={<Link to={`/console/studio/${c.id}`} className="text-electric"><Calculator className="h-5 w-5" /></Link>}>
              <Badge tone={r.type === 'solar_battery' ? 'teal' : r.type === 'solar_only' ? 'blue' : 'amber'}>{r.type.replace('_', ' ')}</Badge>
              {ch && (
                <div className="mt-2 space-y-1 text-sm">
                  <div>
                    {num(ch.solarKw, 1)} kW{ch.batteryKwh ? ` + ${ch.batteryKwh} kWh` : ''} · CAPEX {inr(ch.capexInr)}
                  </div>
                  <div>PPA ₹{ch.ppaRateInrPerKwh.toFixed(2)}/unit · net {inr(ch.customerPpa.monthlyNetSavingsInr)}/mo</div>
                  <div className="text-xs text-slate-500">
                    {c.loadProfile.kind.replace(/_/g, ' ')} · {c.energyAssessmentStatus === 'reviewed_by_staff' ? 'reviewed' : 'preliminary'}
                  </div>
                </div>
              )}
              <Link to={`/console/studio/${c.id}`} className="mt-3 inline-block text-sm font-semibold text-electric">
                Open Energy Studio →
              </Link>
            </Card>
            <Card title="Commercial" action={<Link to={`/console/commercial/${c.id}`} className="text-electric"><ClipboardCheck className="h-5 w-5" /></Link>}>
              <div className="flex flex-wrap gap-1">
                <Badge tone={scr.tone}>{scr.text}</Badge>
                <Badge tone={dec.tone}>{dec.text}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div>Premises: {c.business.premises}</div>
                <div>Preferred plan: {c.preferredPlan ?? '—'}</div>
                <div>{Object.values(c.eligibility.checks).filter(Boolean).length}/9 checks complete</div>
              </div>
              <Link to={`/console/commercial/${c.id}`} className="mt-3 inline-block text-sm font-semibold text-electric">
                Open commercial review →
              </Link>
            </Card>
          </div>

          <Card title="Business & bill details">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ['Working hours', `${hourLabel(c.business.operatingStartHour)} – ${hourLabel(c.business.operatingEndHour)}, ${c.business.workingDaysPerWeek} days/week`],
                ['Business age', c.business.businessAgeYears != null ? `${c.business.businessAgeYears} years` : '—'],
                ['Monthly units (stated)', c.bill.monthlyUnitsKwh ? num(c.bill.monthlyUnitsKwh) : 'Not provided (estimated)'],
                ['Sanctioned load', c.bill.sanctionedLoadKva ? `${c.bill.sanctionedLoadKva} kVA` : `${a.demandKva} kVA (estimated)`],
                ['Tariff category', c.bill.tariffCategory || '—'],
                ['Provider', c.bill.provider || '—'],
                ['Roof permission', c.screening.roofPermission.replace('_', ' ')],
                ['Registration documents', c.screening.canProvideRegistration],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {(c.bill.uploadedFile || c.roof.photos.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {c.bill.uploadedFile && (
                  <Button size="sm" variant="outline" icon={<ExternalLink className="h-4 w-4" />} onClick={() => openFile(c.bill.uploadedFile!)}>
                    Bill: {c.bill.uploadedFile.name}
                  </Button>
                )}
                {c.roof.photos.map((p) => (
                  <Button key={p.id} size="sm" variant="outline" icon={<ExternalLink className="h-4 w-4" />} onClick={() => openFile(p)}>
                    Photo: {p.name}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Proposals"
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => (store.set((st) => generateProposal(st, c.id, staff.name, 'draft')), toast('Proposal draft generated from the current calculation'))} disabled={!ch}>
                  Generate draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => (store.set((st) => approveProposal(st, c.id, staff.name)), toast('Final proposal approved and shared with the customer'))}
                  disabled={!ch || !can(staff.role, 'approve_proposal') || stageIdx < STAGES.indexOf('roof_doc_verification')}
                >
                  Approve final proposal
                </Button>
              </div>
            }
          >
            {!can(staff.role, 'approve_proposal') && <PermissionNote action="approve_proposal" />}
            {stageIdx < STAGES.indexOf('roof_doc_verification') && <p className="mb-2 text-xs text-slate-500">Final approval is available once the customer reaches rooftop & document verification.</p>}
            {c.proposals.length === 0 ? (
              <p className="text-sm text-slate-500">No proposals yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-1">Ver.</th>
                      <th>Generated</th>
                      <th>System</th>
                      <th>Plan</th>
                      <th>Net / month</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...c.proposals].reverse().map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">v{p.version}</td>
                        <td>
                          {dateTimeLabel(p.generatedAt)}
                          <div className="text-xs text-slate-400">{p.generatedBy}</div>
                        </td>
                        <td>
                          {num(p.solarKw, 1)} kW{p.batteryKwh ? ` + ${p.batteryKwh} kWh` : ''}
                        </td>
                        <td>{p.planType ?? '—'}</td>
                        <td className="tabular-nums">{inr(p.planType === 'loan' ? p.loanMonthlyNetInr : p.ppaMonthlyNetSavingsInr)}</td>
                        <td>
                          <Badge tone={p.status === 'approved' || p.status === 'customer_accepted' ? 'teal' : p.status === 'pending_commercial_review' ? 'amber' : 'slate'}>{p.status.replace(/_/g, ' ')}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button size="sm" variant="ghost" className="mt-2" icon={<FileText className="h-4 w-4" />} onClick={() => nav(`/proposal/${c.id}`)}>
              View printable proposal
            </Button>
          </Card>

          <Card title="Installation" action={<Wrench className="h-5 w-5 text-slate-400" />}>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div>Scheduled: {dateLabel(c.installation.scheduledDate)}</div>
              <div>Completed: {dateLabel(c.installation.completedDate)}</div>
              <div>Commissioned: {dateLabel(c.installation.commissionedDate)}</div>
              <div>Engineer: {c.installation.engineer ?? '—'}</div>
              {c.installation.solarKw != null && (
                <div>
                  Installed: {num(c.installation.solarKw, 1)} kW{c.installation.batteryKwh ? ` + ${c.installation.batteryKwh} kWh` : ''}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!can(staff.role, 'operations') || stageIdx >= STAGES.indexOf('installation_complete')} onClick={() => setSchedOpen(true)}>
                Schedule installation
              </Button>
              <Button size="sm" variant="outline" disabled={!can(staff.role, 'operations') || c.stage !== 'installation_scheduled'} onClick={() => (store.set((st) => completeInstallation(st, c.id, staff.name)), toast('Installation marked complete'))}>
                Mark installation complete
              </Button>
              <Button size="sm" variant="teal" disabled={!can(staff.role, 'operations') || c.stage !== 'installation_complete'} onClick={() => (store.set((st) => activateSystem(st, c.id, staff.name)), toast('System activated — monitoring (simulated) enabled'))}>
                Commission & activate
              </Button>
            </div>
            {!can(staff.role, 'operations') && <PermissionNote action="operations" />}
            {stageIdx < STAGES.indexOf('customer_acceptance') && <p className="mt-2 text-xs text-slate-500">Installation is normally scheduled after the customer accepts the final proposal and signs the contract.</p>}
          </Card>

          <Card title="Site visits & service tickets">
            {surveys.length + tickets.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
            <ul className="space-y-2 text-sm">
              {surveys.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-2.5">
                  <span>
                    Site visit · {dateLabel(v.confirmedDate ?? v.preferredDate)} ({v.timeWindow}) {v.engineer ? `· ${v.engineer}` : ''}
                  </span>
                  <Badge tone={v.status === 'confirmed' || v.status === 'completed' ? 'teal' : 'amber'}>{v.status}</Badge>
                </li>
              ))}
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-2.5">
                  <span>{t.subject}</span>
                  <Badge tone={t.status === 'resolved' || t.status === 'closed' ? 'teal' : 'amber'}>{t.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
            <Link to="/console/operations" className="mt-3 inline-block text-sm font-semibold text-electric">
              Manage in Installation & Maintenance →
            </Link>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Customer tracker (as the customer sees it)">
            <StageTracker customer={c} />
          </Card>
          <Card title="Activity log">
            <ol className="max-h-[28rem] space-y-3 overflow-y-auto text-sm">
              {[...c.activity].reverse().map((a, i) => (
                <li key={i} className="border-l-2 border-slate-200 pl-3">
                  <div className="text-xs text-slate-500">
                    {dateTimeLabel(a.at)} · {a.by}
                  </div>
                  <div>{a.text}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
      <Modal
        open={schedOpen}
        onClose={() => setSchedOpen(false)}
        title="Schedule installation"
        footer={
          <>
            <Button variant="outline" onClick={() => setSchedOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                store.set((st) => scheduleInstallation(st, c.id, instDate, instEng, staff.name));
                setSchedOpen(false);
                toast('Installation scheduled — visible to the customer');
              }}
            >
              Schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Installation date">
            <Input type="date" value={instDate} onChange={(e) => setInstDate(e.target.value)} />
          </Field>
          <Field label="Lead engineer">
            <Select value={instEng} onChange={(e) => setInstEng(e.target.value)}>
              {FIELD_ENGINEERS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Select>
          </Field>
          <Notice tone="info">This records the schedule in the demo. No external dispatch system is connected.</Notice>
        </div>
      </Modal>
    </div>
  );
}
