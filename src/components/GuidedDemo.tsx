import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, PlayCircle, X } from 'lucide-react';
import type { AppState, Customer } from '@/types';
import { store, useAppState } from '@/store/store';
import { emptyDraft } from '@/store/actions';
import { cx } from '@/lib/format';
import { Button } from './ui';

export function startDemo() {
  store.set((s) => ({ ...s, onboardingDraft: emptyDraft(), demo: { active: true, step: 0, startedAt: new Date().toISOString() } }));
}

export function demoCustomer(s: AppState): Customer | undefined {
  if (!s.demo.startedAt) return undefined;
  return s.customers.filter((c) => c.origin === 'portal_enquiry' && c.createdAt >= s.demo.startedAt!).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

interface Step {
  side: 'Customer' | 'Partner console';
  title: string;
  body: string;
  to: (s: AppState) => string;
  done?: (s: AppState, path: string) => boolean;
  login?: boolean;
  setPortal?: 'demo';
}

const activeTicket = (s: AppState) =>
  s.tickets.find((t) => t.source === 'customer' && s.demo.startedAt && t.createdAt >= s.demo.startedAt && s.customers.find((c) => c.id === t.customerId)?.stage === 'system_active');

const STEPS: Step[] = [
  { side: 'Customer', title: 'Try the sample Pune factory', body: 'On the bill step, tap “Try Sample Pune Factory”. The bill and business details fill in with fictional data.', to: () => '/start', done: (s) => !!s.onboardingDraft?.usedSample || !!demoCustomer(s) },
  { side: 'Customer', title: 'Check details and confirm the rooftop', body: 'Press Continue through the bill and business steps, then tap “Yes, this is my factory rooftop”.', to: () => '/start', done: (s) => !!s.onboardingDraft?.roof.customerConfirmed || !!demoCustomer(s) },
  { side: 'Customer', title: 'Submit the preliminary assessment', body: 'Continue to the review step and press “See my estimate”. This creates a real enquiry record.', to: () => '/start', done: (s) => !!demoCustomer(s) },
  { side: 'Customer', title: 'Read the simple recommendation', body: 'The plan shows the recommended system, a savings range and confidence — calculated by the engine, not hard-coded.', to: () => '/my/plan', done: (_s, p) => p === '/my/plan' },
  { side: 'Customer', title: 'Compare payment pathways', body: 'Open “Compare payment options” and choose a plan. This sends a request for commercial review (not an approval).', to: () => '/my/payment', done: (s) => !!demoCustomer(s)?.preferredPlan },
  { side: 'Customer', title: 'Request an engineer visit', body: 'Pick a date and time window and press “Request visit”.', to: () => '/my/book', done: (s) => s.surveys.some((v) => v.customerId === demoCustomer(s)?.id) },
  { side: 'Partner console', title: 'Open the new enquiry in the console', body: 'The same record now appears in the partner pipeline with its site-visit request.', to: (s) => `/console/customers/${demoCustomer(s)?.id ?? ''}`, login: true, done: (s, p) => !!s.staffUserId && p.startsWith('/console/customers/') },
  { side: 'Partner console', title: 'Check rooftop suitability and shade', body: 'Move the time-of-day slider to see shadows; adjust the water tank height. Then press “Mark Roof Assessment Verified”.', to: (s) => `/console/roof/${demoCustomer(s)?.id ?? ''}`, login: true, done: (s) => !!demoCustomer(s)?.roof.verified },
  { side: 'Partner console', title: 'Review commercial eligibility', body: 'Tick checklist items and choose a decision such as “Preliminarily suitable for PPA”.', to: (s) => `/console/commercial/${demoCustomer(s)?.id ?? ''}`, login: true, done: (s) => { const c = demoCustomer(s); return !!c && c.eligibility.decision !== 'pending_review'; } },
  { side: 'Partner console', title: 'Energy Studio: solar-only vs solar + battery', body: 'Inspect the load curve and the battery comparison, and customer vs provider economics. Then press “Mark electricity assessment reviewed”.', to: (s) => `/console/studio/${demoCustomer(s)?.id ?? ''}`, login: true, done: (s) => demoCustomer(s)?.energyAssessmentStatus === 'reviewed_by_staff' },
  { side: 'Partner console', title: 'Confirm the requested site visit', body: 'In Installation & Maintenance, confirm the visit and assign an engineer.', to: () => '/console/operations', login: true, done: (s) => s.surveys.some((v) => v.customerId === demoCustomer(s)?.id && v.status === 'confirmed') },
  { side: 'Customer', title: 'See the update in the customer portal', body: 'The site visit is now confirmed and the roof shows as verified.', to: () => '/my', setPortal: 'demo', done: (s, p) => p === '/my' && s.portalCustomerId === demoCustomer(s)?.id },
  { side: 'Customer', title: 'Switch to an active installation', body: 'Choose “Mahalaxmi Food Products” (or Om Packaging, which has a battery) to see monitoring, savings and payments.', to: () => '/my/accounts', done: (s) => s.customers.find((c) => c.id === s.portalCustomerId)?.stage === 'system_active' },
  { side: 'Customer', title: 'Submit a maintenance request', body: 'Open the Help tab and use “Report a problem” or “Request an engineer”.', to: () => '/my', done: (s) => !!activeTicket(s) },
  { side: 'Partner console', title: 'Resolve the ticket', body: 'In Installation & Maintenance → Service tickets, open the new ticket and mark it Resolved.', to: () => '/console/operations?tab=tickets', login: true, done: (s) => activeTicket(s)?.status === 'resolved' },
  { side: 'Customer', title: 'Customer sees the resolved ticket', body: 'Back in the customer Help tab, the request now shows “resolved”. Demo complete!', to: () => '/my', done: (s, p) => p === '/my' && activeTicket(s)?.status === 'resolved' && s.portalCustomerId === activeTicket(s)?.customerId },
];

export function GuidedDemo() {
  const s = useAppState();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const demo = s.demo;
  useEffect(() => {
    if (!demo.active || !demo.startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(demo.startedAt!).getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [demo.active, demo.startedAt]);
  if (!demo.active || loc.pathname.startsWith('/proposal')) return null;
  const idx = Math.min(demo.step, STEPS.length - 1);
  const step = STEPS[idx];
  const done = step.done?.(s, loc.pathname) ?? false;
  const setStep = (n: number) => store.set((st) => ({ ...st, demo: { ...st.demo, step: Math.max(0, Math.min(STEPS.length - 1, n)) } }));
  const go = () => {
    const dc = demoCustomer(store.get());
    store.set((st) => ({
      ...st,
      staffUserId: step.login && !st.staffUserId ? 'stf_priya' : st.staffUserId,
      portalCustomerId: step.setPortal === 'demo' && dc ? dc.id : st.portalCustomerId,
    }));
    nav(step.to(store.get()));
  };
  const end = () => store.set((st) => ({ ...st, demo: { active: false, step: 0 } }));
  const last = idx === STEPS.length - 1;
  return (
    <div className="no-print fixed bottom-20 left-3 right-3 z-40 sm:bottom-4 sm:left-4 sm:right-auto sm:w-[22rem]">
      <div className="overflow-hidden rounded-2xl bg-navy text-white shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <button className="flex items-center gap-2 text-sm font-semibold" onClick={() => setOpen(!open)} aria-expanded={open}>
            <PlayCircle className="h-4 w-4 text-amber" />
            Guided demo · {idx + 1}/{STEPS.length}
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-slate-300">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
            <button onClick={end} aria-label="End guided demo" className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <div className="h-full bg-teal transition-all" style={{ width: `${((idx + (done ? 1 : 0)) / STEPS.length) * 100}%` }} />
        </div>
        {open && (
          <div className="space-y-3 px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-teal-100">{step.side}</div>
              <div className="flex items-start gap-2">
                {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
                <div className="font-semibold">{step.title}</div>
              </div>
              <p className="mt-1 text-sm text-slate-300">{step.body}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={go}>
                Take me there
              </Button>
              {last && done ? (
                <Button size="sm" variant="teal" onClick={end}>
                  Finish
                </Button>
              ) : (
                <Button size="sm" variant={done ? 'teal' : 'ghost'} className={cx(!done && 'text-slate-300 hover:bg-white/10')} onClick={() => setStep(idx + 1)}>
                  {done ? 'Next step' : 'Skip'}
                </Button>
              )}
              {idx > 0 && (
                <button className="text-xs text-slate-400 hover:text-white" onClick={() => setStep(idx - 1)}>
                  Previous
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
