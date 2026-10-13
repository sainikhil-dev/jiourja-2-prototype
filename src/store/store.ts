import { useSyncExternalStore } from 'react';
import type { AppState } from '@/types';
import { createInitialState, STATE_VERSION } from '@/data/seed';
import { assessCustomer, type CustomerAssessment } from '@/engine/recommend';
import { telemetryFor } from '@/engine/telemetry';
import type { Customer, Telemetry } from '@/types';

const KEY = 'jiourja2.state';

/** Fill installed-system details of seeded installations from the calculation engine. */
export function hydrateInstalledSystems(state: AppState): AppState {
  return {
    ...state,
    customers: state.customers.map((c) => {
      const needs = ['installation_scheduled', 'installation_complete', 'system_active'].includes(c.stage) && !c.installation.solarKw;
      if (!needs) return c;
      const a = assessCustomer(c, state.globalAssumptions);
      const ch = a.recommendation.chosen;
      if (!ch) return c;
      return {
        ...c,
        installation: {
          ...c.installation,
          solarKw: ch.solarKw,
          batteryKwh: ch.batteryKwh,
          batteryKw: ch.batteryKw,
          ppaRateInrPerKwh: ch.ppaRateInrPerKwh,
          emiInr: ch.customerLoan.emiInr,
          contractYears: c.preferredPlan === 'ppa' ? a.assumptions.ppaTermYears : undefined,
        },
      };
    }),
  };
}

function load(): AppState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return hydrateInstalledSystems(createInitialState());
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode); app still works in memory */
  }
}

export const store = {
  get: () => state,
  set(next: AppState | ((s: AppState) => AppState)) {
    state = typeof next === 'function' ? next(state) : next;
    persist();
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset() {
    store.set(hydrateInstalledSystems(createInitialState()));
  },
};

// Keep multiple tabs (e.g. customer portal + partner console side by side) in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        state = JSON.parse(e.newValue);
        listeners.forEach((l) => l());
      } catch {
        /* ignore */
      }
    }
  });
}

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ---- Memoised derived data (engine runs are cached per customer + assumptions) ----
const assessCache = new Map<string, { key: string; value: CustomerAssessment }>();

function assessKey(c: Customer, s: AppState) {
  return JSON.stringify([c.loadProfile, c.tariff, c.roof.polygon, c.roof.obstacles, c.roof.setbackM, c.roof.walkwayM, c.roof.panel, c.roof.excludeHeavilyShaded, c.roof.verified, c.roof.photos.length, c.roof.method, c.assumptionOverrides, c.design, c.bill.sanctionedLoadKva, c.business, s.globalAssumptions]);
}

export function getAssessment(c: Customer, s: AppState = store.get()): CustomerAssessment {
  const key = assessKey(c, s);
  const hit = assessCache.get(c.id);
  if (hit && hit.key === key) return hit.value;
  const value = assessCustomer(c, s.globalAssumptions);
  assessCache.set(c.id, { key, value });
  return value;
}

const telCache = new Map<string, { key: string; value: Telemetry | null }>();
export function getTelemetry(c: Customer, s: AppState = store.get()): Telemetry | null {
  const tickets = s.tickets.filter((t) => t.customerId === c.id && t.category === 'system_alert' && !['resolved', 'closed'].includes(t.status)).length;
  const key = JSON.stringify([c.installation, c.stage, c.loadProfile, c.tariff, c.roof.obstacles, c.assumptionOverrides, s.globalAssumptions, tickets, c.telemetrySeed]);
  const hit = telCache.get(c.id);
  if (hit && hit.key === key) return hit.value;
  const value = telemetryFor(c, s.globalAssumptions, s.tickets);
  telCache.set(c.id, { key, value });
  return value;
}

export function useCustomer(id: string | null | undefined): Customer | undefined {
  const s = useAppState();
  return s.customers.find((c) => c.id === id);
}
