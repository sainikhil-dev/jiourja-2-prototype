import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { Button, Card, Notice, useToast } from '@/components/ui';
import { store, useAppState } from '@/store/store';
import { DEFAULT_ASSUMPTIONS } from '@/engine/assumptions';
import { clearFiles } from '@/lib/fileStore';
import { AssumptionsPanel } from './AssumptionsPanel';
import { can, PageHeader, PermissionNote, useStaff } from './ConsoleLayout';

export default function Settings() {
  const s = useAppState();
  const staff = useStaff();
  const toast = useToast();
  const nav = useNavigate();
  const editable = can(staff.role, 'edit_assumptions');
  return (
    <div className="space-y-5">
      <PageHeader title="Assumptions & demo settings" />
      {!editable && <PermissionNote action="edit_assumptions" />}
      <AssumptionsPanel
        assumptions={s.globalAssumptions}
        disabled={!editable}
        scopeLabel="Global defaults for all customers (customer-specific overrides are set in Energy Studio)"
        onApply={(a) => {
          store.set((st) => ({ ...st, globalAssumptions: a }));
          toast('Global assumptions updated — all customers recalculated');
        }}
        onReset={() => {
          store.set((st) => ({ ...st, globalAssumptions: { ...DEFAULT_ASSUMPTIONS } }));
          toast('Global assumptions reset');
        }}
      />
      <Card title="Reset demo data">
        <p className="text-sm text-slate-600">Restores the original fictional customers, surveys and tickets, and removes enquiries and files created in this browser.</p>
        <Notice tone="warn" className="mt-3">
          Installed systems keep the design and contract terms recorded at commissioning; changing global assumptions recalculates proposals but not signed contract rates.
        </Notice>
        <Button
          className="mt-3"
          variant="danger"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={async () => {
            if (!confirm('Reset all demo data?')) return;
            await clearFiles();
            store.reset();
            store.set((st) => ({ ...st, staffUserId: staff.id }));
            toast('Demo data reset');
            nav('/console');
          }}
        >
          Reset Demo Data
        </Button>
      </Card>
    </div>
  );
}
