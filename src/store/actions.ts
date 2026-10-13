import type {
  AppState,
  Assumptions,
  CommercialProposal,
  Customer,
  CustomerScreening,
  EligibilityReview,
  LoadProfile,
  OnboardingDraft,
  PlanType,
  RoofAssessment,
  ServiceTicket,
  SiteSurvey,
  StageId,
  TicketCategory,
  TicketStatus,
} from '@/types';
import { STAGES } from '@/types';
import { ILLUSTRATIVE_PUNE_LT_INDUSTRIAL, hashAssumptions } from '@/engine/assumptions';
import { estimateProfileFromBill } from '@/engine/loadProfile';
import { estimateUnitsFromBill, estimateDemandKva } from '@/engine/tariff';
import { assessCustomer } from '@/engine/recommend';
import { emptyEligibility, makeRoof, sampleFactoryProfile } from '@/data/seed';

/**
 * Pure state transitions. Every screen (customer portal and partner console)
 * goes through these functions, so both views always read the same records.
 */

export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function mapCustomer(state: AppState, id: string, fn: (c: Customer) => Customer): AppState {
  return { ...state, customers: state.customers.map((c) => (c.id === id ? { ...fn(c), updatedAt: nowIso() } : c)) };
}

function log(c: Customer, by: string, text: string): Customer {
  return { ...c, activity: [...c.activity, { at: nowIso(), by, text }] };
}

export function emptyDraft(): OnboardingDraft {
  return {
    step: 0,
    usedSample: false,
    bill: { monthlyBillInr: null, source: 'customer_entered' },
    business: {
      name: '',
      industry: 'manufacturing',
      city: 'Pune',
      pinCode: '',
      operatingStartHour: 9,
      operatingEndHour: 18,
      workingDaysPerWeek: 6,
      premises: 'owned',
      businessAgeYears: null,
      contactName: '',
      phone: '',
      email: '',
    },
    roof: makeRoof(),
    screening: { premises: 'owned', businessAgeYears: null, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null },
  };
}

export function screeningStatus(s: Omit<CustomerScreening, 'status'>): CustomerScreening['status'] {
  if (s.canProvideRegistration !== 'yes') return 'additional_documents_required';
  if (s.premises === 'rented' && s.roofPermission !== 'landlord_granted') return 'additional_documents_required';
  return 'initial_details_received';
}

/** Create a customer record from a completed onboarding draft. */
export function submitEnquiry(state: AppState, draft: OnboardingDraft, id = newId('cus')): { state: AppState; id: string } {
  const t = nowIso();
  const tariff = { ...ILLUSTRATIVE_PUNE_LT_INDUSTRIAL };
  const opHours = ((draft.business.operatingEndHour - draft.business.operatingStartHour + 24) % 24) || 24;
  const billAmount = draft.bill.monthlyBillInr ?? 0;
  const demandGuess = draft.bill.sanctionedLoadKva || estimateDemandKva(Math.max(500, billAmount / 12), opHours, draft.business.workingDaysPerWeek);
  const units = draft.bill.monthlyUnitsKwh && draft.bill.monthlyUnitsKwh > 0 ? draft.bill.monthlyUnitsKwh : estimateUnitsFromBill(tariff, billAmount, demandGuess);
  const loadProfile: LoadProfile = draft.usedSample ? sampleFactoryProfile(units) : estimateProfileFromBill(draft.business, units);
  const roofProvided = draft.roof.polygon.length >= 3;
  const roof: RoofAssessment = {
    ...draft.roof,
    status: roofProvided ? 'customer_provided' : 'not_provided',
    method: draft.roof.method === 'unknown' && roofProvided ? 'manual' : draft.roof.method,
  };
  const screening: CustomerScreening = { ...draft.screening, premises: draft.business.premises, businessAgeYears: draft.business.businessAgeYears ?? null, status: screeningStatus({ ...draft.screening, premises: draft.business.premises }) };
  const customer: Customer = {
    id,
    createdAt: t,
    updatedAt: t,
    isFictional: true,
    origin: 'portal_enquiry',
    sampleTag: draft.usedSample ? 'Demo enquiry created from the sample Pune factory template' : undefined,
    business: { ...draft.business },
    facility: { address: `${draft.business.city} ${draft.business.pinCode}`.trim() },
    bill: { ...draft.bill, monthlyUnitsKwh: draft.bill.monthlyUnitsKwh ?? null, sanctionedLoadKva: draft.bill.sanctionedLoadKva ?? null },
    roof,
    loadProfile,
    tariff,
    screening,
    eligibility: emptyEligibility(),
    assumptionOverrides: {},
    design: { solarKwOverride: null, batteryKwhOverride: null },
    preferredPlan: null,
    proposals: [],
    stage: 'enquiry_received',
    stageHistory: [{ stage: 'enquiry_received', at: t, by: 'Customer portal' }],
    energyAssessmentStatus: 'preliminary',
    installation: { documents: [] },
    assignedRep: 'Rahul Joshi',
    activity: [
      { at: t, by: 'Customer portal', text: `Enquiry submitted${draft.usedSample ? ' using the sample Pune factory data' : ''}.` },
      ...(draft.bill.uploadedFile ? [{ at: t, by: 'Customer portal', text: `Bill file uploaded: ${draft.bill.uploadedFile.name} (values typed by customer; not auto-extracted).` }] : []),
      ...(roofProvided ? [{ at: t, by: 'Customer portal', text: `Roof details provided (${roof.method}).` }] : [{ at: t, by: 'Customer portal', text: 'Roof details not provided — engineer to check.' }]),
    ],
  };
  return { state: { ...state, customers: [customer, ...state.customers], portalCustomerId: id, onboardingDraft: null }, id };
}

export function setStage(state: AppState, customerId: string, stage: StageId, by: string): AppState {
  return mapCustomer(state, customerId, (c) =>
    c.stage === stage ? c : log({ ...c, stage, stageHistory: [...c.stageHistory, { stage, at: nowIso(), by }] }, by, `Stage updated to "${stageLabel(stage)}".`),
  );
}

/** Advance to `stage` only if the customer is currently at an earlier stage. */
export function advanceTo(state: AppState, customerId: string, stage: StageId, by: string): AppState {
  const c = state.customers.find((x) => x.id === customerId);
  if (!c || STAGES.indexOf(c.stage) >= STAGES.indexOf(stage)) return state;
  return setStage(state, customerId, stage, by);
}

export function stageLabel(s: StageId): string {
  return {
    enquiry_received: 'Enquiry received',
    electricity_assessment: 'Electricity assessment',
    roof_doc_verification: 'Rooftop and document verification',
    final_proposal: 'Final proposal',
    customer_acceptance: 'Customer acceptance',
    installation_scheduled: 'Installation scheduled',
    installation_complete: 'Installation complete',
    system_active: 'System active',
  }[s];
}

export function updateRoof(state: AppState, customerId: string, roof: RoofAssessment, by: string, note?: string): AppState {
  return mapCustomer(state, customerId, (c) => {
    const changedGeometry = JSON.stringify([c.roof.polygon, c.roof.obstacles, c.roof.setbackM]) !== JSON.stringify([roof.polygon, roof.obstacles, roof.setbackM]);
    const next: RoofAssessment = changedGeometry && c.roof.verified ? { ...roof, verified: false, status: 'under_review' } : roof;
    return note ? log({ ...c, roof: next }, by, note) : { ...c, roof: next };
  });
}

export function verifyRoof(state: AppState, customerId: string, by: string): AppState {
  let s = mapCustomer(state, customerId, (c) =>
    log({ ...c, roof: { ...c.roof, verified: true, verifiedBy: by, verifiedAt: nowIso(), status: 'verified' } }, by, 'Roof assessment marked verified.'),
  );
  s = advanceTo(s, customerId, 'roof_doc_verification', by);
  return s;
}

export function setRoofStatus(state: AppState, customerId: string, status: RoofAssessment['status'], by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, roof: { ...c.roof, status, verified: status === 'verified' ? c.roof.verified : false } }, by, `Roof status set to "${status.replace(/_/g, ' ')}".`));
}

export function updateEligibility(state: AppState, customerId: string, patch: Partial<EligibilityReview>, by: string): AppState {
  return mapCustomer(state, customerId, (c) => {
    const eligibility: EligibilityReview = { ...c.eligibility, ...patch, reviewedBy: by, updatedAt: nowIso(), isSampleOutcome: c.eligibility.isSampleOutcome && !patch.decision };
    const status: CustomerScreening['status'] =
      eligibility.decision === 'suitable_for_ppa' || eligibility.decision === 'consider_financed'
        ? 'ready_for_commercial_assessment'
        : eligibility.decision === 'more_info_required'
          ? 'additional_documents_required'
          : eligibility.decision === 'not_currently_suitable'
            ? 'eligibility_under_review'
            : c.screening.status === 'initial_details_received'
              ? 'eligibility_under_review'
              : c.screening.status;
    const next = { ...c, eligibility, screening: { ...c.screening, status } };
    return patch.decision && patch.decision !== c.eligibility.decision ? log(next, by, `Commercial review decision: ${patch.decision.replace(/_/g, ' ')}.`) : next;
  });
}

export function setAssumptionOverrides(state: AppState, customerId: string, overrides: Partial<Assumptions>, by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, assumptionOverrides: overrides }, by, 'Calculation assumptions updated.'));
}

export function setTariff(state: AppState, customerId: string, tariff: Customer['tariff'], by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, tariff }, by, 'Tariff assumptions updated.'));
}

export function setDesign(state: AppState, customerId: string, design: Customer['design'], by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, design }, by, `System sizing ${design.solarKwOverride || design.batteryKwhOverride != null ? 'override set' : 'returned to automatic'}.`));
}

export function setLoadProfile(state: AppState, customerId: string, profile: LoadProfile, by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, loadProfile: profile }, by, `Load profile updated (${profile.kind.replace(/_/g, ' ')}).`));
}

export function markEnergyReviewed(state: AppState, customerId: string, by: string): AppState {
  const s = mapCustomer(state, customerId, (c) => log({ ...c, energyAssessmentStatus: 'reviewed_by_staff' }, by, 'Electricity assessment reviewed by staff.'));
  return advanceTo(s, customerId, 'electricity_assessment', by);
}

/** Snapshot the current calculation into a versioned proposal (values always come from the engine). */
export function buildProposal(c: Customer, global: Assumptions, by: string, status: CommercialProposal['status']): CommercialProposal | null {
  const a = assessCustomer(c, global);
  const ch = a.recommendation.chosen;
  if (!ch) return null;
  return {
    id: newId('prop'),
    version: c.proposals.length + 1,
    generatedAt: nowIso(),
    generatedBy: by,
    planType: c.preferredPlan,
    recommendationType: a.recommendation.type,
    solarKw: ch.solarKw,
    batteryKwh: ch.batteryKwh,
    batteryKw: ch.batteryKw,
    capexInr: ch.capexInr,
    ppaRateInrPerKwh: ch.ppaRateInrPerKwh,
    ppaMonthlyPaymentInr: ch.customerPpa.monthlyPaymentInr,
    ppaMonthlyNetSavingsInr: ch.customerPpa.monthlyNetSavingsInr,
    ppaDepositInr: ch.customerPpa.upfrontDepositInr,
    emiInr: ch.customerLoan.emiInr,
    loanMonthlyNetInr: ch.customerLoan.monthlyNetDuringLoanInr,
    baselineMonthlyBillInr: a.recommendation.baselineMonthlyBillInr,
    status,
    assumptionsHash: hashAssumptions(a.assumptions, c.tariff, JSON.stringify([c.design, c.roof.polygon, c.roof.obstacles, c.loadProfile.workdayKw])),
  };
}

export function selectPlan(state: AppState, customerId: string, plan: PlanType): AppState {
  let s = mapCustomer(state, customerId, (c) => {
    const withPlan = { ...c, preferredPlan: plan, planRequestedAt: nowIso() };
    const p = buildProposal(withPlan, state.globalAssumptions, 'Customer portal', 'pending_commercial_review');
    return log(
      { ...withPlan, proposals: p ? [...c.proposals, p] : c.proposals, screening: { ...c.screening, status: c.screening.status === 'initial_details_received' ? 'eligibility_under_review' : c.screening.status } },
      'Customer portal',
      `Customer selected ${plan === 'ppa' ? 'JioUrja Energy-as-a-Service (PPA)' : 'Financed ownership'} — sent for commercial review (not an approval).`,
    );
  });
  s = advanceTo(s, customerId, 'electricity_assessment', 'System');
  return s;
}

export function generateProposal(state: AppState, customerId: string, by: string, status: CommercialProposal['status'] = 'draft'): AppState {
  return mapCustomer(state, customerId, (c) => {
    const p = buildProposal(c, state.globalAssumptions, by, status);
    return p ? log({ ...c, proposals: [...c.proposals, p] }, by, `Proposal v${p.version} generated (${status.replace(/_/g, ' ')}).`) : c;
  });
}

export function approveProposal(state: AppState, customerId: string, by: string): AppState {
  let s = mapCustomer(state, customerId, (c) => {
    const p = buildProposal(c, state.globalAssumptions, by, 'approved');
    return p ? log({ ...c, proposals: [...c.proposals, p] }, by, `Final proposal v${p.version} approved and shared with customer.`) : c;
  });
  s = advanceTo(s, customerId, 'final_proposal', by);
  return s;
}

export function acceptProposal(state: AppState, customerId: string): AppState {
  let s = mapCustomer(state, customerId, (c) => {
    const last = c.proposals[c.proposals.length - 1];
    if (!last || last.status !== 'approved') return c;
    const proposals = c.proposals.map((p) => (p.id === last.id ? { ...p, status: 'customer_accepted' as const } : p));
    return log({ ...c, proposals }, 'Customer portal', `Customer accepted proposal v${last.version} (subject to signing the contract).`);
  });
  s = advanceTo(s, customerId, 'customer_acceptance', 'Customer portal');
  return s;
}

export function bookSurvey(state: AppState, customerId: string, data: Pick<SiteSurvey, 'preferredDate' | 'timeWindow' | 'contactName' | 'phone' | 'notes'>): { state: AppState; id: string } {
  const id = newId('srv');
  const t = nowIso();
  const survey: SiteSurvey = { id, customerId, ...data, status: 'requested', createdAt: t, updatedAt: t };
  let s: AppState = { ...state, surveys: [survey, ...state.surveys] };
  s = mapCustomer(s, customerId, (c) => log(c, 'Customer portal', `Site assessment requested for ${data.preferredDate} (${data.timeWindow}).`));
  return { state: s, id };
}

export function updateSurvey(state: AppState, surveyId: string, patch: Partial<SiteSurvey>, by: string): AppState {
  const sv = state.surveys.find((x) => x.id === surveyId);
  if (!sv) return state;
  const next = { ...sv, ...patch, updatedAt: nowIso() };
  let s: AppState = { ...state, surveys: state.surveys.map((x) => (x.id === surveyId ? next : x)) };
  if (patch.status && patch.status !== sv.status) {
    const txt =
      patch.status === 'confirmed'
        ? `Site visit confirmed for ${next.confirmedDate ?? next.preferredDate}${next.engineer ? ` with ${next.engineer}` : ''}.`
        : `Site visit status: ${patch.status}.`;
    s = mapCustomer(s, sv.customerId, (c) => log(c, by, txt));
    if (patch.status === 'completed') s = advanceTo(s, sv.customerId, 'roof_doc_verification', by);
  }
  return s;
}

export function scheduleInstallation(state: AppState, customerId: string, date: string, engineer: string, by: string): AppState {
  let s = mapCustomer(state, customerId, (c) => log({ ...c, installation: { ...c.installation, scheduledDate: date, engineer } }, by, `Installation scheduled for ${date} (${engineer}).`));
  s = advanceTo(s, customerId, 'installation_scheduled', by);
  return s;
}

export function completeInstallation(state: AppState, customerId: string, by: string): AppState {
  const today = nowIso().slice(0, 10);
  let s = mapCustomer(state, customerId, (c) => log({ ...c, installation: { ...c.installation, completedDate: today } }, by, 'Installation marked complete (awaiting commissioning).'));
  s = advanceTo(s, customerId, 'installation_complete', by);
  return s;
}

/** Commission: freeze the installed design from the latest calculation. */
export function activateSystem(state: AppState, customerId: string, by: string): AppState {
  const c0 = state.customers.find((c) => c.id === customerId);
  if (!c0) return state;
  const a = assessCustomer(c0, state.globalAssumptions);
  const ch = a.recommendation.chosen;
  const today = nowIso().slice(0, 10);
  let s = mapCustomer(state, customerId, (c) =>
    log(
      {
        ...c,
        installation: {
          ...c.installation,
          completedDate: c.installation.completedDate ?? today,
          commissionedDate: today,
          contractStart: today,
          planType: c.preferredPlan ?? 'ppa',
          solarKw: ch?.solarKw,
          batteryKwh: ch?.batteryKwh,
          batteryKw: ch?.batteryKw,
          ppaRateInrPerKwh: ch?.ppaRateInrPerKwh,
          emiInr: ch?.customerLoan.emiInr,
          contractYears: (c.preferredPlan ?? 'ppa') === 'ppa' ? a.assumptions.ppaTermYears : undefined,
          documents: c.installation.documents.length ? c.installation.documents : [{ name: 'Commissioning report (sample)', kind: 'commissioning' }],
        },
        telemetrySeed: c.telemetrySeed ?? Math.floor(Math.random() * 1000),
      },
      by,
      'System commissioned. Monitoring shows SIMULATED data in this prototype.',
    ),
  );
  s = advanceTo(s, customerId, 'system_active', by);
  return s;
}

export function createTicket(
  state: AppState,
  customerId: string,
  data: { category: TicketCategory; subject: string; description: string; priority?: ServiceTicket['priority'] },
  source: ServiceTicket['source'] = 'customer',
  by = 'Customer',
): { state: AppState; id: string } {
  const id = newId('tkt');
  const t = nowIso();
  const ticket: ServiceTicket = {
    id,
    customerId,
    category: data.category,
    subject: data.subject,
    description: data.description,
    status: 'open',
    priority: data.priority ?? (data.category === 'problem' || data.category === 'engineer_visit' ? 'high' : 'medium'),
    createdAt: t,
    updatedAt: t,
    history: [{ at: t, by, text: source === 'customer' ? 'Ticket submitted from customer portal.' : 'Ticket created.', status: 'open' }],
    source,
  };
  let s: AppState = { ...state, tickets: [ticket, ...state.tickets] };
  s = mapCustomer(s, customerId, (c) => log(c, by, `Service request raised: ${data.subject}`));
  return { state: s, id };
}

export function updateTicket(state: AppState, ticketId: string, patch: { status?: TicketStatus; engineer?: string; note?: string }, by: string): AppState {
  return {
    ...state,
    tickets: state.tickets.map((t) => {
      if (t.id !== ticketId) return t;
      const text = patch.note?.trim() || (patch.status ? `Status changed to ${patch.status.replace('_', ' ')}.` : patch.engineer ? `Assigned to ${patch.engineer}.` : 'Updated.');
      return {
        ...t,
        status: patch.status ?? t.status,
        engineer: patch.engineer ?? t.engineer,
        updatedAt: nowIso(),
        history: [...t.history, { at: nowIso(), by, text, status: patch.status }],
      };
    }),
  };
}

export function setAssignedRep(state: AppState, customerId: string, rep: string, by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, assignedRep: rep }, by, `Assigned to ${rep}.`));
}

export function addRoofPhoto(state: AppState, customerId: string, ref: Customer['roof']['photos'][number], by: string): AppState {
  return mapCustomer(state, customerId, (c) => log({ ...c, roof: { ...c.roof, photos: [...c.roof.photos, ref] } }, by, `Roof photo uploaded: ${ref.name}`));
}
