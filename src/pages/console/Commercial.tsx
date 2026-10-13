import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, Checkbox, Field, Notice, Select, SimLabel, Textarea, useToast } from '@/components/ui';
import { screeningLabel } from '@/components/customerBits';
import { getAssessment, store, useAppState } from '@/store/store';
import { approveProposal, updateEligibility } from '@/store/actions';
import { ELIGIBILITY_CHECKS, type Customer, type EligibilityDecision } from '@/types';
import { inr, num } from '@/lib/format';
import { can, CustomerSelect, PageHeader, PermissionNote, useStaff } from './ConsoleLayout';
import { DECISION_LABEL } from './Pipeline';

/** Automatically derived commercial risk flags (informational; not a credit score). */
export function riskFlags(c: Customer, ppaTermYears: number, monthlyNet: number): string[] {
  const f: string[] = [];
  if (c.business.premises === 'rented') f.push('Rented premises — landlord NOC and lease review required.');
  if (c.business.premises === 'rented' && c.screening.roofPermission !== 'landlord_granted') f.push('Roof-use permission not yet granted by landlord.');
  if (c.screening.expectedOccupancyYears != null && c.screening.expectedOccupancyYears < ppaTermYears) f.push(`Expected occupancy (${c.screening.expectedOccupancyYears} yrs) is shorter than the ${ppaTermYears}-yr PPA term.`);
  if (c.business.businessAgeYears != null && c.business.businessAgeYears < 3) f.push('Business younger than 3 years — limited operating history.');
  if (c.screening.canProvideRegistration !== 'yes') f.push('Registration documents (GSTIN / Udyam) not confirmed.');
  if ((c.bill.monthlyBillInr ?? 0) < 40000) f.push('Small bill — project may be below efficient PPA ticket size; consider financed ownership.');
  if (monthlyNet <= 0) f.push('Estimated PPA net savings not positive under current assumptions.');
  if (!c.roof.verified) f.push('Roof not yet verified on site.');
  return f;
}

export default function Commercial() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useAppState();
  const c = s.customers.find((x) => x.id === id);
  if (!c)
    return (
      <div>
        <PageHeader title="Commercial assessment" subtitle="Document checklist, roof ownership, financing eligibility and PPA suitability." />
        <Card>
          <div className="mb-3 text-sm text-slate-600">Choose a customer:</div>
          <CustomerSelect onChange={(cid) => nav(`/console/commercial/${cid}`)} />
        </Card>
        <QueueTable />
      </div>
    );
  return <Review key={c.id} c={c} />;
}

function QueueTable() {
  const s = useAppState();
  const rows = s.customers.filter((c) => c.stage !== 'system_active');
  return (
    <Card title="Review queue" className="mt-5">
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((c) => {
          const scr = screeningLabel(c.screening.status);
          const d = DECISION_LABEL[c.eligibility.decision];
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <Link to={`/console/commercial/${c.id}`} className="font-semibold text-electric hover:underline">
                {c.business.name}
              </Link>
              <span className="flex gap-1">
                <Badge tone={scr.tone}>{scr.text}</Badge>
                <Badge tone={d.tone}>{d.text}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Review({ c }: { c: Customer }) {
  const s = useAppState();
  const staff = useStaff();
  const nav = useNavigate();
  const toast = useToast();
  const a = getAssessment(c, s);
  const ch = a.recommendation.chosen;
  const [notes, setNotes] = useState(c.eligibility.notes);
  const editable = can(staff.role, 'commercial_decision');
  const flags = riskFlags(c, a.assumptions.ppaTermYears, ch?.customerPpa.monthlyNetSavingsInr ?? 0);
  const done = Object.values(c.eligibility.checks).filter(Boolean).length;
  const scr = screeningLabel(c.screening.status);
  const lastProposal = c.proposals[c.proposals.length - 1];
  const paymentToBill = ch && c.bill.monthlyBillInr ? (ch.customerPpa.monthlyPaymentInr / c.bill.monthlyBillInr) * 100 : null;
  return (
    <div>
      <PageHeader
        title="Commercial assessment"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/console/customers/${c.id}`} className="font-semibold text-electric hover:underline">
              {c.business.name}
            </Link>
            <Badge tone={scr.tone}>Customer sees: {scr.text}</Badge>
            {c.eligibility.isSampleOutcome && <SimLabel>Sample review outcome</SimLabel>}
          </span>
        }
        actions={<CustomerSelect value={c.id} onChange={(cid) => nav(`/console/commercial/${cid}`)} />}
      />
      <Notice tone="info" className="mb-5">
        Internal demo workflow only. These are not credit approvals. No credit bureau, bank or regulated database is accessed. Final credit approval is subject to authorised institutions, the customer’s consent and applicable law. Do
        not enter real PAN, bank or financial details in this demo.
      </Notice>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title={`Document & review checklist (${done}/9)`} className="lg:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {ELIGIBILITY_CHECKS.map(([k, label]) => (
              <Checkbox
                key={k}
                label={label}
                disabled={!editable}
                checked={c.eligibility.checks[k]}
                onChange={(v) => store.set((st) => updateEligibility(st, c.id, { checks: { ...c.eligibility.checks, [k]: v } }, staff.name))}
              />
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Commercial approval status">
              <Select
                value={c.eligibility.decision}
                disabled={!editable}
                onChange={(e) => {
                  store.set((st) => updateEligibility(st, c.id, { decision: e.target.value as EligibilityDecision, riskFlags: flags }, staff.name));
                  toast('Decision recorded — customer eligibility status updated');
                }}
              >
                {Object.entries(DECISION_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.text}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Review notes">
              <Textarea value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== c.eligibility.notes && store.set((st) => updateEligibility(st, c.id, { notes }, staff.name))} placeholder="Internal notes (saved when you leave the field)" />
            </Field>
          </div>
          {!editable && <PermissionNote action="commercial_decision" />}
          {c.eligibility.reviewedBy && (
            <p className="mt-2 text-xs text-slate-500">
              Last updated by {c.eligibility.reviewedBy}
              {c.eligibility.updatedAt ? ` on ${new Date(c.eligibility.updatedAt).toLocaleString('en-IN')}` : ''}.
            </p>
          )}
        </Card>
        <div className="space-y-5">
          <Card title="Commercial risk flags" action={<AlertTriangle className="h-5 w-5 text-amber-500" />}>
            {flags.length === 0 ? (
              <p className="text-sm text-slate-500">No automatic flags.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {flags.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">Rule-based prompts for the reviewer — not a credit score.</p>
          </Card>
          <Card title="Roof ownership & occupancy">
            <ul className="space-y-1 text-sm">
              <li>Premises: {c.business.premises}</li>
              <li>Roof permission: {c.screening.roofPermission.replace('_', ' ')}</li>
              <li>Expected occupancy: {c.screening.expectedOccupancyYears != null ? `${c.screening.expectedOccupancyYears} yrs` : 'n/a (owned) / not given'}</li>
              <li>Business age: {c.business.businessAgeYears != null ? `${c.business.businessAgeYears} yrs` : 'not given'}</li>
              <li>Registration docs available: {c.screening.canProvideRegistration}</li>
            </ul>
          </Card>
          <Card title="PPA suitability & financing" action={<ShieldCheck className="h-5 w-5 text-teal" />}>
            {ch ? (
              <ul className="space-y-1 text-sm">
                <li>Preferred plan: {c.preferredPlan ?? 'not chosen'}</li>
                <li>
                  PPA payment ≈ {inr(ch.customerPpa.monthlyPaymentInr)}/mo{paymentToBill != null ? ` (${num(paymentToBill)}% of current bill)` : ''}
                </li>
                <li>Suggested security deposit: {inr(ch.customerPpa.upfrontDepositInr)}</li>
                <li>Contract value over term ≈ {inr(ch.cashFlows.slice(0, a.assumptions.ppaTermYears).reduce((x, f) => x + f.ppaPaymentInr, 0))}</li>
                <li>
                  Loan illustration: {inr(ch.customerLoan.loanAmountInr)} @ {ch.customerLoan.interestPct}% → EMI {inr(ch.customerLoan.emiInr)}
                </li>
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No design yet.</p>
            )}
          </Card>
          <Card title="Proposal approval status">
            <p className="text-sm">
              {lastProposal ? (
                <>
                  Latest: v{lastProposal.version} — <Badge tone={lastProposal.status === 'approved' || lastProposal.status === 'customer_accepted' ? 'teal' : 'amber'}>{lastProposal.status.replace(/_/g, ' ')}</Badge>
                </>
              ) : (
                'No proposal generated yet.'
              )}
            </p>
            <Button
              className="mt-3"
              size="sm"
              disabled={!ch || !can(staff.role, 'approve_proposal') || !['suitable_for_ppa', 'consider_financed'].includes(c.eligibility.decision)}
              onClick={() => (store.set((st) => approveProposal(st, c.id, staff.name)), toast('Final proposal approved and shared with the customer'))}
            >
              Approve final proposal
            </Button>
            {!['suitable_for_ppa', 'consider_financed'].includes(c.eligibility.decision) && <p className="mt-2 text-xs text-slate-500">Requires a positive commercial decision first.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
