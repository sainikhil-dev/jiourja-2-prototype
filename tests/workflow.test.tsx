import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { createInitialState, samplePuneFactoryDraft } from '@/data/seed';
import { assessCustomer } from '@/engine';
import { store, hydrateInstalledSystems } from '@/store/store';
import { bookSurvey, createTicket, generateProposal, selectPlan, submitEnquiry, updateEligibility, updateSurvey, updateTicket, verifyRoof } from '@/store/actions';
import type { AppState } from '@/types';

// Recharts' ResponsiveContainer needs ResizeObserver in jsdom.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

function fresh(): AppState {
  return hydrateInstalledSystems(createInitialState());
}

function withEnquiry() {
  const s0 = fresh();
  const draft = { ...samplePuneFactoryDraft(), roof: { ...samplePuneFactoryDraft().roof, customerConfirmed: true } };
  return submitEnquiry(s0, draft, 'cus_test');
}

describe('shared customer record', () => {
  it('12. portal enquiry, staff updates and proposals stay synchronised on one record', () => {
    let { state: s, id } = withEnquiry();
    const c = s.customers.find((x) => x.id === id)!;
    expect(c.business.name).toBe('Shree Ganesh Industries');
    expect(c.roof.status).toBe('customer_provided');
    expect(s.portalCustomerId).toBe(id);

    // staff verifies the roof -> customer sees the new roof status and stage
    s = verifyRoof(s, id, 'Anita Rao');
    const v = s.customers.find((x) => x.id === id)!;
    expect(v.roof.status).toBe('verified');
    expect(v.stage).toBe('roof_doc_verification');

    // staff commercial decision -> customer screening status
    s = updateEligibility(s, id, { decision: 'suitable_for_ppa' }, 'Priya Deshmukh');
    expect(s.customers.find((x) => x.id === id)!.screening.status).toBe('ready_for_commercial_assessment');

    // customer selects a plan -> pending-review proposal created from the engine
    s = selectPlan(s, id, 'ppa');
    let cust = s.customers.find((x) => x.id === id)!;
    expect(cust.preferredPlan).toBe('ppa');
    const p = cust.proposals.at(-1)!;
    expect(p.status).toBe('pending_commercial_review');
    const engine = assessCustomer(cust, s.globalAssumptions).recommendation.chosen!;
    expect(p.solarKw).toBeCloseTo(engine.solarKw, 9);
    expect(p.ppaMonthlyNetSavingsInr).toBeCloseTo(engine.customerPpa.monthlyNetSavingsInr, 6);

    // staff changes assumptions and regenerates: proposal matches the new engine result
    s = { ...s, customers: s.customers.map((x) => (x.id === id ? { ...x, assumptionOverrides: { solarCapexInrPerKw: 50000 } } : x)) };
    s = generateProposal(s, id, 'Priya Deshmukh');
    cust = s.customers.find((x) => x.id === id)!;
    const p2 = cust.proposals.at(-1)!;
    const engine2 = assessCustomer(cust, s.globalAssumptions).recommendation.chosen!;
    expect(p2.version).toBe(2);
    expect(p2.capexInr).toBeCloseTo(engine2.capexInr, 6);
    expect(p2.ppaRateInrPerKwh).toBeGreaterThan(p.ppaRateInrPerKwh);
  });

  it('13. a submitted site survey appears in the employee queue', async () => {
    const { state, id } = withEnquiry();
    const r = bookSurvey(state, id, { preferredDate: '2030-01-08', timeWindow: 'morning', contactName: 'Test', phone: '9800000001', notes: 'Gate 2' });
    expect(r.state.surveys[0]).toMatchObject({ customerId: id, status: 'requested' });
    store.set({ ...r.state, staffUserId: 'stf_priya' });
    render(
      <MemoryRouter initialEntries={['/console/operations']}>
        <App />
      </MemoryRouter>,
    );
    const row = (await screen.findAllByText('Shree Ganesh Industries'))[0].closest('tr')!;
    expect(within(row).getByText('requested')).toBeInTheDocument();
    // staff confirms it; the customer's record reflects the confirmation
    const s2 = updateSurvey(store.get(), r.id, { status: 'confirmed', confirmedDate: '2030-01-08', engineer: 'Kavita Nair' }, 'Priya Deshmukh');
    expect(s2.surveys.find((x) => x.id === r.id)!.status).toBe('confirmed');
    expect(s2.customers.find((x) => x.id === id)!.activity.at(-1)!.text).toMatch(/confirmed/);
  });
});

describe('service tickets', () => {
  beforeEach(() => store.set(fresh()));

  it('14. a ticket updated by staff shows the new status in the customer dashboard', async () => {
    const s0 = store.get();
    const t = createTicket(s0, 'cus_mahalaxmi', { category: 'problem', subject: 'Inverter beeping', description: 'It beeps at noon' });
    expect(t.state.tickets[0]).toMatchObject({ customerId: 'cus_mahalaxmi', status: 'open', source: 'customer' });
    const resolved = updateTicket(t.state, t.id, { status: 'resolved', note: 'Fan cleaned' }, 'Vikram Shinde');
    store.set({ ...resolved, portalCustomerId: 'cus_mahalaxmi' });
    render(
      <MemoryRouter initialEntries={['/my']}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('tab', { name: /Help/ }));
    const item = (await screen.findByText('Inverter beeping')).closest('button')!;
    expect(within(item).getByText('resolved')).toBeInTheDocument();
  });

  it('active installation dashboard shows simulated monitoring and no battery UI for solar-only systems', async () => {
    store.set({ ...store.get(), portalCustomerId: 'cus_mahalaxmi' });
    render(
      <MemoryRouter initialEntries={['/my']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Your solar system is working well/)).toBeInTheDocument();
    expect(screen.getAllByText(/Simulated monitoring/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Battery .*charged/)).not.toBeInTheDocument();
  });
});

describe('customer onboarding UI', () => {
  it('sample factory flow creates an enquiry and shows a recommendation', async () => {
    store.set(fresh());
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/start']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(await screen.findByText('Try Sample Pune Factory'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(await screen.findByDisplayValue('Shree Ganesh Industries')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(await screen.findByRole('button', { name: /Yes, this is my factory rooftop/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(await screen.findByRole('button', { name: /See my estimate/ }));
    expect(await screen.findByText('Your JioUrja Energy Plan', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getAllByText('Solar only').length).toBeGreaterThan(0);
    const s = store.get();
    expect(s.customers[0].origin).toBe('portal_enquiry');
    expect(s.portalCustomerId).toBe(s.customers[0].id);
  });

  it('validates the bill amount before continuing', async () => {
    store.set(fresh());
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/start']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: /Continue/ }));
    expect(await screen.findByText('Please enter your approximate monthly bill.')).toBeInTheDocument();
  });
});
