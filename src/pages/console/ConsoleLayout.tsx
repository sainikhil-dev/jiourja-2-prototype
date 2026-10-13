import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Calculator, ClipboardCheck, Home, LayoutDashboard, LogOut, Menu, Settings as SettingsIcon, SunMedium, Users, Wrench, X } from 'lucide-react';
import { Logo, Select } from '@/components/ui';
import { store, useAppState } from '@/store/store';
import { STAFF_USERS } from '@/data/seed';
import { cx } from '@/lib/format';
import type { Customer } from '@/types';
import { stageLabel } from '@/store/actions';

const NAV = [
  { to: '/console', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/console/pipeline', label: 'Customer Pipeline', icon: Users },
  { to: '/console/roof', label: 'Rooftop Assessment', icon: SunMedium },
  { to: '/console/studio', label: 'Energy Studio', icon: Calculator },
  { to: '/console/commercial', label: 'Commercial Assessment', icon: ClipboardCheck },
  { to: '/console/operations', label: 'Installation & Maintenance', icon: Wrench },
  { to: '/console/portfolio', label: 'Portfolio Monitoring', icon: Activity },
  { to: '/console/settings', label: 'Assumptions & Demo', icon: SettingsIcon },
];

export function useStaff() {
  const s = useAppState();
  return STAFF_USERS.find((u) => u.id === s.staffUserId) ?? STAFF_USERS[0];
}

export function ConsoleLayout() {
  const s = useAppState();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  if (!s.staffUserId) return <Navigate to="/partner" replace />;
  const user = STAFF_USERS.find((u) => u.id === s.staffUserId)!;
  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-3 px-2 pt-1">
        <Logo light />
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Partner console</div>
      </div>
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={() => setMenu(false)}
          className={({ isActive }) => cx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </NavLink>
      ))}
      <div className="mt-auto space-y-2 border-t border-white/10 pt-3">
        <Link to="/my" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
          <Home className="h-4 w-4" /> Customer portal
        </Link>
        <button
          onClick={() => {
            store.set((st) => ({ ...st, staffUserId: null }));
            nav('/partner');
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </nav>
  );
  return (
    <div className="min-h-screen bg-surface lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-navy lg:block">{sidebar}</aside>
      {menu && (
        <div className="fixed inset-0 z-50 bg-navy/50 lg:hidden" onClick={() => setMenu(false)}>
          <aside className="h-full w-64 bg-navy" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-1.5 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="hidden text-sm text-slate-500 sm:inline">JioUrja Partner Console · demo environment (fictional data)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="hidden h-4 w-4 text-slate-400 sm:block" />
            <Select aria-label="Signed-in role" className="h-9 w-auto text-sm" value={user.id} onChange={(e) => store.set((st) => ({ ...st, staffUserId: e.target.value }))}>
              {STAFF_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.title}
                </option>
              ))}
            </Select>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 pb-28 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Role-based permissions for staff actions (demo). */
export function can(role: string, action: 'verify_roof' | 'commercial_decision' | 'approve_proposal' | 'edit_assumptions' | 'operations'): boolean {
  if (role === 'solutions_manager') return true;
  const map: Record<string, string[]> = {
    sales: ['commercial_decision'],
    technical: ['verify_roof', 'edit_assumptions'],
    operations: ['operations'],
  };
  return map[role]?.includes(action) ?? false;
}

export function PermissionNote({ action }: { action: Parameters<typeof can>[1] }) {
  const role = {
    verify_roof: 'Technical or Solutions Manager',
    commercial_decision: 'Sales or Solutions Manager',
    approve_proposal: 'Solutions Manager',
    edit_assumptions: 'Technical or Solutions Manager',
    operations: 'Operations or Solutions Manager',
  }[action];
  return <p className="text-xs text-amber-700">Your current role cannot do this. Switch role (top right) to {role}.</p>;
}

export function CustomerSelect({ value, onChange, filter }: { value?: string; onChange: (id: string) => void; filter?: (c: Customer) => boolean }) {
  const s = useAppState();
  const list = s.customers.filter(filter ?? (() => true));
  return (
    <Select aria-label="Select customer" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="h-10 max-w-sm text-sm">
      <option value="" disabled>
        Select a customer…
      </option>
      {list.map((c) => (
        <option key={c.id} value={c.id}>
          {c.business.name} — {stageLabel(c.stage)}
        </option>
      ))}
    </Select>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
