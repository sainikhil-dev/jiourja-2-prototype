import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge, Card, SimLabel } from '@/components/ui';
import { store, useAppState } from '@/store/store';
import { stageLabel } from '@/store/actions';
import { useI18n } from '@/i18n/i18n';

/** Demo-only account switcher: there is no real customer login in this prototype. */
export default function ChooseAccount() {
  const s = useAppState();
  const nav = useNavigate();
  const { t } = useI18n();
  const open = (id: string) => {
    store.set((st) => ({ ...st, portalCustomerId: id }));
    nav('/my');
  };
  const active = s.customers.filter((c) => c.stage === 'system_active');
  const others = s.customers.filter((c) => c.stage !== 'system_active');
  const Item = ({ id }: { id: string }) => {
    const c = s.customers.find((x) => x.id === id)!;
    return (
      <button onClick={() => open(c.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-electric">
        <span className="min-w-0">
          <span className="block font-semibold">{c.business.name}</span>
          <span className="block truncate text-xs text-slate-500">{c.sampleTag ?? `${c.business.city} · enquiry created in this browser`}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            <Badge tone={c.stage === 'system_active' ? 'teal' : 'blue'}>{t(stageLabel(c.stage))}</Badge>
            {s.portalCustomerId === c.id && <Badge tone="navy">Currently viewing</Badge>}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </button>
    );
  };
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Choose a sample customer</h1>
        <p className="text-slate-500">This prototype has no customer login. Pick a fictional business to see their portal.</p>
        <SimLabel className="mt-2">All businesses are fictional</SimLabel>
      </div>
      <Card title="Installed systems (monitoring demo)">
        <div className="space-y-2">{active.map((c) => <Item key={c.id} id={c.id} />)}</div>
      </Card>
      <Card title="Enquiries in progress">
        <div className="space-y-2">{others.map((c) => <Item key={c.id} id={c.id} />)}</div>
      </Card>
    </div>
  );
}
