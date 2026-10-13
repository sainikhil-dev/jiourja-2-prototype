import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge, Card, EmptyState, Input, Select, useToast } from '@/components/ui';
import { roofStatusLabel } from '@/components/customerBits';
import { store, useAppState } from '@/store/store';
import { setStage, stageLabel } from '@/store/actions';
import { STAGES, type EligibilityDecision, type StageId } from '@/types';
import { dateLabel, inr } from '@/lib/format';
import { PageHeader, useStaff } from './ConsoleLayout';

export const DECISION_LABEL: Record<EligibilityDecision, { text: string; tone: 'slate' | 'amber' | 'teal' | 'blue' | 'red' }> = {
  pending_review: { text: 'Pending review', tone: 'slate' },
  more_info_required: { text: 'More information required', tone: 'amber' },
  suitable_for_ppa: { text: 'Preliminarily suitable for PPA', tone: 'teal' },
  consider_financed: { text: 'Consider financed ownership', tone: 'blue' },
  not_currently_suitable: { text: 'Not currently suitable', tone: 'red' },
};

export default function Pipeline() {
  const s = useAppState();
  const staff = useStaff();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [stage, setStageF] = useState<'' | StageId>('');
  const [elig, setElig] = useState<'' | EligibilityDecision>('');
  const rows = useMemo(
    () =>
      s.customers
        .filter((c) => !q || `${c.business.name} ${c.business.city} ${c.business.pinCode} ${c.assignedRep}`.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => !stage || c.stage === stage)
        .filter((c) => !elig || c.eligibility.decision === elig)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [s.customers, q, stage, elig],
  );
  return (
    <div>
      <PageHeader title="Customer pipeline" subtitle={`${rows.length} of ${s.customers.length} customers`} />
      <Card>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-10 pl-9 text-sm" placeholder="Search name, location, PIN, rep" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
          </div>
          <Select className="h-10 text-sm" value={stage} onChange={(e) => setStageF(e.target.value as StageId | '')} aria-label="Filter by stage">
            <option value="">All stages</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {stageLabel(st)}
              </option>
            ))}
          </Select>
          <Select className="h-10 text-sm" value={elig} onChange={(e) => setElig(e.target.value as EligibilityDecision | '')} aria-label="Filter by eligibility">
            <option value="">All eligibility outcomes</option>
            {Object.entries(DECISION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v.text}
              </option>
            ))}
          </Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No customers match these filters" />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {['Customer', 'Location', 'Monthly spend', 'Enquiry date', 'Technical assessment', 'Commercial eligibility', 'Current stage', 'Rep'].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => {
                  const roof = roofStatusLabel(c.roof.status);
                  const d = DECISION_LABEL[c.eligibility.decision];
                  return (
                    <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => nav(`/console/customers/${c.id}`)}>
                      <td className="px-4 py-3">
                        <Link to={`/console/customers/${c.id}`} className="font-semibold text-electric hover:underline" onClick={(e) => e.stopPropagation()}>
                          {c.business.name}
                        </Link>
                        <div className="text-xs text-slate-500">{c.origin === 'portal_enquiry' ? 'New portal enquiry' : 'Sample record'}</div>
                      </td>
                      <td className="px-4 py-3">{c.business.city}</td>
                      <td className="px-4 py-3 tabular-nums">{inr(c.bill.monthlyBillInr)}</td>
                      <td className="px-4 py-3">{dateLabel(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={roof.tone === 'red' ? 'red' : roof.tone}>{roof.text}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={d.tone}>{d.text}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          aria-label={`Stage for ${c.business.name}`}
                          className="h-9 min-w-[12rem] text-xs"
                          value={c.stage}
                          onChange={(e) => {
                            store.set((st) => setStage(st, c.id, e.target.value as StageId, staff.name));
                            toast(`${c.business.name}: stage updated`);
                          }}
                        >
                          {STAGES.map((st) => (
                            <option key={st} value={st}>
                              {stageLabel(st)}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">{c.assignedRep}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
