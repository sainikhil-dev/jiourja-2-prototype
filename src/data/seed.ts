import type {
  AppState,
  Business,
  Customer,
  EligibilityCheckKey,
  EligibilityReview,
  LoadProfile,
  OnboardingDraft,
  RoofAssessment,
  ServiceTicket,
  ShadeObstacle,
  SiteSurvey,
  StageId,
  StaffUser,
} from '@/types';
import { STAGES } from '@/types';
import { DEFAULT_ASSUMPTIONS, ILLUSTRATIVE_PUNE_LT_INDUSTRIAL } from '@/engine/assumptions';
import { DEFAULT_MONTHLY_FACTOR, scaleProfile } from '@/engine/loadProfile';
import { rectPolygon } from '@/engine/roof';

/**
 * ALL CUSTOMERS, PEOPLE AND NUMBERS IN THIS FILE ARE FICTIONAL SAMPLE DATA.
 * Interval profiles are synthetic; they are not smart-meter measurements.
 */

export const STATE_VERSION = 3;
export const DEMO_TODAY = '2026-10-13';

export const STAFF_USERS: StaffUser[] = [
  { id: 'stf_priya', name: 'Priya Deshmukh', role: 'solutions_manager', title: 'Solutions Manager (all permissions)' },
  { id: 'stf_rahul', name: 'Rahul Joshi', role: 'sales', title: 'MSME Sales Representative' },
  { id: 'stf_anita', name: 'Anita Rao', role: 'technical', title: 'Solar Design Engineer' },
  { id: 'stf_vikram', name: 'Vikram Shinde', role: 'operations', title: 'Operations & Maintenance Lead' },
];

export const FIELD_ENGINEERS = ['Sameer Patwardhan', 'Kavita Nair', 'Imran Shaikh'];

export const DEFAULT_PANEL = { lengthM: 2.28, widthM: 1.13, watt: 550, rowGapM: 0.6 };

export function makeRoof(partial: Partial<RoofAssessment> = {}): RoofAssessment {
  return {
    method: 'unknown',
    polygon: [],
    obstacles: [],
    photos: [],
    setbackM: 1.0,
    walkwayM: 0.6,
    panel: { ...DEFAULT_PANEL },
    excludeHeavilyShaded: true,
    verified: false,
    status: 'not_provided',
    ...partial,
  };
}

let obsCounter = 0;
export function obstacle(kind: ShadeObstacle['kind'], label: string, x: number, y: number, w: number, h: number, heightM: number, severity = 1, onRoof = true): ShadeObstacle {
  obsCounter++;
  return { id: `obs_${kind}_${obsCounter}`, kind, label, x, y, w, h, heightM, severity, onRoof };
}

/** Build a 24-h shape from operating segments; level is relative (1 = full production). */
export function shape(base: number, segments: [number, number, number][]): number[] {
  return Array.from({ length: 24 }, (_, h) => {
    let v = base;
    for (const [from, to, level] of segments) if (h >= from && h < to) v = level;
    return v;
  });
}

export function syntheticProfile(workday: number[], holidayLevel: number, workingDaysPerWeek: number, monthlyUnits: number, label: string): LoadProfile {
  return scaleProfile(
    {
      kind: 'synthetic_sample',
      label,
      workdayKw: workday,
      holidayKw: workday.map(() => holidayLevel),
      workingDaysPerWeek,
      monthlyFactor: DEFAULT_MONTHLY_FACTOR,
    },
    monthlyUnits,
  );
}

const allChecks = (v: boolean): Record<EligibilityCheckKey, boolean> => ({
  identity: v,
  registration: v,
  payment_history: v,
  premises: v,
  tenure: v,
  financials: v,
  bureau: v,
  financier: v,
  security: v,
});

export function emptyEligibility(): EligibilityReview {
  return { checks: allChecks(false), decision: 'pending_review', riskFlags: [], notes: '', isSampleOutcome: false };
}

function stageHistoryTo(stage: StageId, start: string): Customer['stageHistory'] {
  const idx = STAGES.indexOf(stage);
  const t0 = new Date(start).getTime();
  return STAGES.slice(0, idx + 1).map((s, i) => ({ stage: s, at: new Date(t0 + i * 9 * 86400000).toISOString(), by: i === 0 ? 'Customer portal' : 'Priya Deshmukh' }));
}

interface SeedSpec {
  id: string;
  business: Business;
  monthlyBill: number;
  monthlyUnits: number;
  sanctionedKva: number;
  profile: LoadProfile;
  roof: RoofAssessment;
  stage: StageId;
  createdAt: string;
  rep: string;
  sampleTag: string;
  screening: Customer['screening'];
  eligibility: EligibilityReview;
  preferredPlan: Customer['preferredPlan'];
  design?: Customer['design'];
  installation?: Partial<Customer['installation']>;
  activity: string[];
  energyReviewed?: boolean;
  telemetrySeed?: number;
  tariff?: Partial<Customer['tariff']>;
  assumptionOverrides?: Customer['assumptionOverrides'];
}

function build(s: SeedSpec): Customer {
  return {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
    isFictional: true,
    origin: 'seed',
    sampleTag: s.sampleTag,
    business: s.business,
    facility: { address: `${s.business.city} ${s.business.pinCode}` },
    bill: {
      monthlyBillInr: s.monthlyBill,
      monthlyUnitsKwh: s.monthlyUnits,
      sanctionedLoadKva: s.sanctionedKva,
      tariffCategory: 'LT Industrial (illustrative)',
      provider: 'State DISCOM (illustrative)',
      source: 'sample_dataset',
    },
    roof: s.roof,
    loadProfile: s.profile,
    tariff: { ...ILLUSTRATIVE_PUNE_LT_INDUSTRIAL, ...s.tariff },
    screening: s.screening,
    eligibility: s.eligibility,
    assumptionOverrides: s.assumptionOverrides ?? {},
    design: s.design ?? { solarKwOverride: null, batteryKwhOverride: null },
    preferredPlan: s.preferredPlan,
    proposals: [],
    stage: s.stage,
    stageHistory: stageHistoryTo(s.stage, s.createdAt),
    energyAssessmentStatus: s.energyReviewed ? 'reviewed_by_staff' : 'preliminary',
    installation: { documents: [], paymentHistory: [], ...s.installation },
    assignedRep: s.rep,
    activity: s.activity.map((text, i) => ({ at: new Date(new Date(s.createdAt).getTime() + i * 5 * 86400000).toISOString(), by: i === 0 ? 'Customer portal' : s.rep, text })),
    telemetrySeed: s.telemetrySeed,
  };
}

const INSTALL_DOCS = [
  { name: 'Commissioning report (sample)', kind: 'commissioning' },
  { name: 'Single-line diagram (sample)', kind: 'sld' },
  { name: 'Net-billing approval letter (sample placeholder)', kind: 'discom' },
  { name: 'Equipment warranty summary (sample)', kind: 'warranty' },
];

/** The template used by "Try Sample Pune Factory" in onboarding (Customer 1 archetype). */
export function samplePuneFactoryDraft(): OnboardingDraft {
  return {
    step: 0,
    usedSample: true,
    bill: {
      monthlyBillInr: 118000,
      monthlyUnitsKwh: 10000,
      sanctionedLoadKva: 40,
      tariffCategory: 'LT Industrial (illustrative)',
      provider: 'State DISCOM (illustrative)',
      demandChargesInr: null,
      source: 'sample_dataset',
    },
    business: {
      name: 'Shree Ganesh Industries',
      industry: 'manufacturing',
      city: 'Pune',
      pinCode: '411026',
      operatingStartHour: 9,
      operatingEndHour: 21,
      workingDaysPerWeek: 6,
      premises: 'owned',
      businessAgeYears: 11,
      contactName: 'Mahesh Patil (fictional)',
      phone: '9800000001',
      email: 'demo.shreeganesh@example.com',
    },
    roof: makeRoof({
      method: 'sample',
      polygon: rectPolygon(22, 11.4),
      lengthM: 22,
      widthM: 11.4,
      hasWaterTank: true,
      hasTallNeighbours: true,
      status: 'customer_provided',
      obstacles: [
        obstacle('water_tank', 'Water tank', 2, 7.4, 2.5, 2.5, 2.2),
        obstacle('neighbour_building', 'Neighbouring structure (west)', -9, 1, 8, 9, 6, 1, false),
      ],
    }),
    screening: { premises: 'owned', businessAgeYears: 11, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null },
  };
}

/** Synthetic profile for the Shree Ganesh template: daytime-heavy single shift, lighter evening packing. */
export function sampleFactoryProfile(units: number): LoadProfile {
  return syntheticProfile(shape(0.08, [[8, 9, 0.5], [9, 13, 1], [13, 14, 0.85], [14, 18, 1], [18, 21, 0.45]]), 0.06, 6, units, 'Synthetic sample interval data — daytime manufacturer (not measured)');
}

export function seedCustomers(): Customer[] {
  return [
    build({
      id: 'cus_mahalaxmi',
      sampleTag: 'Customer 1 archetype — Pune daytime manufacturer (active, solar only, PPA)',
      business: { name: 'Mahalaxmi Food Products', industry: 'food_processing', city: 'Chakan, Pune', pinCode: '410501', operatingStartHour: 8, operatingEndHour: 18, workingDaysPerWeek: 6, premises: 'owned', businessAgeYears: 14, contactName: 'Sunita Kale (fictional)', phone: '9800000011', email: 'demo.mahalaxmi@example.com' },
      monthlyBill: 92000,
      monthlyUnits: 7600,
      sanctionedKva: 35,
      profile: syntheticProfile(shape(0.18, [[8, 13, 1], [13, 14, 0.9], [14, 18, 1]]), 0.16, 6, 7600, 'Synthetic sample interval data — food processing with cold-room base load (not measured)'),
      roof: makeRoof({ method: 'staff_drawn', polygon: rectPolygon(20, 10.5), verified: true, verifiedBy: 'Anita Rao', verifiedAt: '2026-02-02T10:00:00.000Z', status: 'verified', obstacles: [obstacle('ac_unit', 'Cold-room condenser', 15.5, 1.5, 2, 1.2, 1.2)] }),
      stage: 'system_active',
      createdAt: '2025-12-01T09:00:00.000Z',
      rep: 'Rahul Joshi',
      screening: { premises: 'owned', businessAgeYears: 14, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null, status: 'ready_for_commercial_assessment' },
      eligibility: { checks: allChecks(true), decision: 'suitable_for_ppa', riskFlags: [], notes: 'Sample outcome: 6 years of on-time electricity payments in sample documents.', reviewedBy: 'Priya Deshmukh', updatedAt: '2026-01-10T10:00:00.000Z', isSampleOutcome: true },
      preferredPlan: 'ppa',
      installation: { engineer: 'Kavita Nair', scheduledDate: '2026-03-02', completedDate: '2026-03-12', commissionedDate: '2026-03-20', planType: 'ppa', contractStart: '2026-04-01', documents: INSTALL_DOCS },
      activity: ['Enquiry submitted via portal', 'Roof verified on site', 'PPA proposal accepted', 'System commissioned (sample)'],
      energyReviewed: true,
      telemetrySeed: 11,
    }),
    build({
      id: 'cus_om',
      sampleTag: 'Active installation — evening-shift packaging unit with battery (financed ownership)',
      business: { name: 'Om Packaging Solutions', industry: 'printing_packaging', city: 'Bhosari, Pune', pinCode: '411026', operatingStartHour: 10, operatingEndHour: 22, workingDaysPerWeek: 6, premises: 'owned', businessAgeYears: 9, contactName: 'Ajay Pawar (fictional)', phone: '9800000012', email: 'demo.om@example.com' },
      monthlyBill: 128000,
      monthlyUnits: 10500,
      sanctionedKva: 45,
      profile: syntheticProfile(shape(0.07, [[10, 13, 0.75], [13, 14, 0.6], [14, 18, 0.8], [18, 22, 1]]), 0.06, 6, 10500, 'Synthetic sample interval data — two-shift packaging (not measured)'),
      roof: makeRoof({ method: 'staff_drawn', polygon: rectPolygon(26, 13), verified: true, verifiedBy: 'Anita Rao', verifiedAt: '2025-11-20T10:00:00.000Z', status: 'verified', obstacles: [obstacle('water_tank', 'Water tank', 21, 1.5, 2.5, 2.5, 2.4), obstacle('skylight', 'Skylight strip', 4, 9.5, 6, 1.2, 0, 0)] }),
      stage: 'system_active',
      createdAt: '2025-09-15T09:00:00.000Z',
      rep: 'Rahul Joshi',
      screening: { premises: 'owned', businessAgeYears: 9, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null, status: 'ready_for_commercial_assessment' },
      eligibility: { checks: allChecks(true), decision: 'consider_financed', riskFlags: ['Customer preferred ownership; lender sanction (sample) received'], notes: 'Sample outcome: customer chose financed ownership with a partner lender.', reviewedBy: 'Priya Deshmukh', updatedAt: '2025-10-20T10:00:00.000Z', isSampleOutcome: true },
      preferredPlan: 'loan',
      design: { solarKwOverride: null, batteryKwhOverride: 20 },
      assumptionOverrides: { loanTenureMonths: 84, loanInterestPct: 9.75 },
      installation: { engineer: 'Imran Shaikh', scheduledDate: '2025-12-08', completedDate: '2025-12-19', commissionedDate: '2026-01-05', planType: 'loan', contractStart: '2026-01-05', documents: INSTALL_DOCS },
      activity: ['Enquiry submitted via portal', 'Customer requested battery for evening use and outage support (hybrid inverter)', 'Loan sanctioned by partner lender (sample)', 'System commissioned (sample)'],
      energyReviewed: true,
      telemetrySeed: 23,
    }),
    build({
      id: 'cus_deccan',
      sampleTag: 'Active installation — daytime machining unit (PPA, payment overdue in sample)',
      business: { name: 'Deccan Precision Tools', industry: 'engineering_workshop', city: 'Talegaon, Pune', pinCode: '410507', operatingStartHour: 8, operatingEndHour: 17, workingDaysPerWeek: 6, premises: 'owned', businessAgeYears: 7, contactName: 'Farhan Mulla (fictional)', phone: '9800000013' },
      monthlyBill: 64000,
      monthlyUnits: 5200,
      sanctionedKva: 30,
      profile: syntheticProfile(shape(0.06, [[8, 12, 1], [12, 13, 0.7], [13, 17, 1]]), 0.05, 6, 5200, 'Synthetic sample interval data — single-shift machining (not measured)'),
      roof: makeRoof({ method: 'staff_drawn', polygon: rectPolygon(16, 9), verified: true, verifiedBy: 'Anita Rao', verifiedAt: '2026-04-02T10:00:00.000Z', status: 'verified', obstacles: [] }),
      stage: 'system_active',
      createdAt: '2026-02-11T09:00:00.000Z',
      rep: 'Rahul Joshi',
      screening: { premises: 'owned', businessAgeYears: 7, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null, status: 'ready_for_commercial_assessment' },
      eligibility: { checks: allChecks(true), decision: 'suitable_for_ppa', riskFlags: ['Security deposit of 3 months collected (sample)'], notes: 'Sample outcome.', reviewedBy: 'Priya Deshmukh', updatedAt: '2026-03-01T10:00:00.000Z', isSampleOutcome: true },
      preferredPlan: 'ppa',
      installation: { engineer: 'Sameer Patwardhan', scheduledDate: '2026-04-20', completedDate: '2026-04-28', commissionedDate: '2026-05-06', planType: 'ppa', contractStart: '2026-05-06', documents: INSTALL_DOCS, outstandingMonths: 1 },
      activity: ['Enquiry submitted via portal', 'PPA accepted', 'System commissioned (sample)', 'September invoice overdue (sample)'],
      energyReviewed: true,
      telemetrySeed: 37,
    }),
    build({
      id: 'cus_kulkarni',
      sampleTag: 'Customer 2 — Pune evening-shift factory (battery evaluated economically)',
      business: { name: 'Kulkarni Polymers', industry: 'plastics', city: 'Bhosari MIDC, Pune', pinCode: '411026', operatingStartHour: 13, operatingEndHour: 23, workingDaysPerWeek: 6, premises: 'owned', businessAgeYears: 16, contactName: 'Neha Kulkarni (fictional)', phone: '9800000014', email: 'demo.kulkarni@example.com' },
      monthlyBill: 172000,
      monthlyUnits: 14000,
      sanctionedKva: 60,
      profile: syntheticProfile(shape(0.1, [[8, 13, 0.3], [13, 17, 0.85], [17, 23, 1]]), 0.08, 6, 14000, 'Synthetic sample interval data — evening-shift moulding (not measured)'),
      roof: makeRoof({ method: 'staff_drawn', polygon: [{ x: 0, y: 0 }, { x: 34, y: 0 }, { x: 34, y: 14 }, { x: 20, y: 14 }, { x: 20, y: 20 }, { x: 0, y: 20 }], status: 'under_review', photos: [], obstacles: [obstacle('water_tank', 'Water tank', 3, 3, 3, 3, 2.5), obstacle('ac_unit', 'Chiller unit', 28, 9, 3, 2, 1.8), obstacle('access_path', 'Roof access pathway', 10, 0, 1.2, 20, 0, 0)] }),
      stage: 'roof_doc_verification',
      createdAt: '2026-09-02T09:00:00.000Z',
      tariff: { exportLimitKw: 10, name: 'Illustrative LT Industrial (Pune) — export capped at 10 kW (sample)' },
      rep: 'Rahul Joshi',
      screening: { premises: 'owned', businessAgeYears: 16, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null, status: 'eligibility_under_review' },
      eligibility: { checks: { ...allChecks(false), identity: true, registration: true, payment_history: true, premises: true }, decision: 'pending_review', riskFlags: [], notes: 'Sample: awaiting audited financials.', reviewedBy: 'Priya Deshmukh', updatedAt: '2026-09-20T10:00:00.000Z', isSampleOutcome: true },
      preferredPlan: 'ppa',
      activity: ['Enquiry submitted via portal', 'Electricity assessment completed', 'DISCOM feasibility (sample): local transformer constrained — export not permitted, zero-export controller required', 'Roof outline drawn from customer photos'],
      energyReviewed: true,
    }),
    build({
      id: 'cus_sai',
      sampleTag: 'Customer 3 — rented industrial workshop (landlord consent pending)',
      business: { name: 'Sai Fabrication Works', industry: 'engineering_workshop', city: 'Hadapsar, Pune', pinCode: '411028', operatingStartHour: 9, operatingEndHour: 18, workingDaysPerWeek: 6, premises: 'rented', businessAgeYears: 4, contactName: 'Ramesh Gaikwad (fictional)', phone: '9800000015' },
      monthlyBill: 28000,
      monthlyUnits: 2200,
      sanctionedKva: 15,
      profile: syntheticProfile(shape(0.05, [[9, 13, 1], [13, 14, 0.6], [14, 18, 0.9]]), 0.04, 6, 2200, 'Synthetic sample interval data — small welding/fabrication shop (not measured)'),
      roof: makeRoof({ method: 'manual', polygon: rectPolygon(12, 8), lengthM: 12, widthM: 8, hasTallNeighbours: true, status: 'customer_provided' }),
      stage: 'electricity_assessment',
      createdAt: '2026-10-01T09:00:00.000Z',
      rep: 'Rahul Joshi',
      screening: { premises: 'rented', businessAgeYears: 4, canProvideRegistration: 'unsure', roofPermission: 'landlord_pending', expectedOccupancyYears: 3, status: 'additional_documents_required' },
      eligibility: { checks: { ...allChecks(false), identity: true }, decision: 'more_info_required', riskFlags: ['Rented premises — landlord NOC pending', 'Lease remaining (3 yrs) shorter than PPA term', 'Small system size'], notes: 'Sample: request landlord NOC and lease copy. Consider financed ownership or shorter-term structure.', reviewedBy: 'Priya Deshmukh', updatedAt: '2026-10-05T10:00:00.000Z', isSampleOutcome: true },
      preferredPlan: null,
      activity: ['Enquiry submitted via portal', 'Requested landlord NOC and lease copy'],
    }),
    build({
      id: 'cus_patil',
      sampleTag: 'Installation scheduled — daytime engineering workshop (PPA)',
      business: { name: 'Patil Engineering Works', industry: 'engineering_workshop', city: 'Pimpri, Pune', pinCode: '411018', operatingStartHour: 9, operatingEndHour: 19, workingDaysPerWeek: 6, premises: 'owned', businessAgeYears: 21, contactName: 'Sachin Patil (fictional)', phone: '9800000016' },
      monthlyBill: 81000,
      monthlyUnits: 6700,
      sanctionedKva: 35,
      profile: syntheticProfile(shape(0.06, [[9, 13, 1], [13, 14, 0.8], [14, 19, 0.95]]), 0.05, 6, 6700, 'Synthetic sample interval data — engineering workshop (not measured)'),
      roof: makeRoof({ method: 'staff_drawn', polygon: rectPolygon(18, 11), verified: true, verifiedBy: 'Anita Rao', verifiedAt: '2026-09-10T10:00:00.000Z', status: 'verified', obstacles: [obstacle('water_tank', 'Water tank', 14, 7, 2.5, 2.5, 2)] }),
      stage: 'installation_scheduled',
      createdAt: '2026-07-20T09:00:00.000Z',
      rep: 'Rahul Joshi',
      screening: { premises: 'owned', businessAgeYears: 21, canProvideRegistration: 'yes', roofPermission: 'owner', expectedOccupancyYears: null, status: 'ready_for_commercial_assessment' },
      eligibility: { checks: allChecks(true), decision: 'suitable_for_ppa', riskFlags: [], notes: 'Sample outcome.', reviewedBy: 'Priya Deshmukh', updatedAt: '2026-08-25T10:00:00.000Z', isSampleOutcome: true },
      preferredPlan: 'ppa',
      installation: { engineer: 'Sameer Patwardhan', scheduledDate: '2026-10-27', planType: 'ppa', documents: [] },
      activity: ['Enquiry submitted via portal', 'Site survey completed', 'PPA accepted', 'Installation scheduled'],
      energyReviewed: true,
    }),
  ];
}

export function seedSurveys(): SiteSurvey[] {
  return [
    { id: 'srv_kulkarni', customerId: 'cus_kulkarni', preferredDate: '2026-10-16', timeWindow: 'morning', contactName: 'Neha Kulkarni (fictional)', phone: '9800000014', notes: 'Roof access via staircase near gate 2.', status: 'confirmed', confirmedDate: '2026-10-16', engineer: 'Kavita Nair', createdAt: '2026-09-25T10:00:00.000Z', updatedAt: '2026-09-27T10:00:00.000Z' },
    { id: 'srv_sai', customerId: 'cus_sai', preferredDate: '2026-10-19', timeWindow: 'afternoon', contactName: 'Ramesh Gaikwad (fictional)', phone: '9800000015', notes: 'Landlord may attend.', status: 'requested', createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z' },
    { id: 'srv_patil', customerId: 'cus_patil', preferredDate: '2026-08-05', timeWindow: 'morning', contactName: 'Sachin Patil (fictional)', phone: '9800000016', notes: '', status: 'completed', confirmedDate: '2026-08-05', engineer: 'Sameer Patwardhan', createdAt: '2026-07-25T10:00:00.000Z', updatedAt: '2026-08-05T16:00:00.000Z' },
  ];
}

export function seedTickets(): ServiceTicket[] {
  return [
    {
      id: 'tkt_om_1',
      customerId: 'cus_om',
      category: 'system_alert',
      subject: 'Lower than expected output on inverter string 2 (simulated alert)',
      description: 'Simulated monitoring rule: string 2 output 18% below peer strings for 3 consecutive days. Possible soiling or connector issue.',
      status: 'assigned',
      priority: 'medium',
      engineer: 'Imran Shaikh',
      createdAt: '2026-10-09T08:00:00.000Z',
      updatedAt: '2026-10-10T08:00:00.000Z',
      history: [
        { at: '2026-10-09T08:00:00.000Z', by: 'Monitoring (simulated)', text: 'Alert raised automatically from simulated data.', status: 'open' },
        { at: '2026-10-10T08:00:00.000Z', by: 'Vikram Shinde', text: 'Assigned to Imran Shaikh for panel cleaning and connector check.', status: 'assigned' },
      ],
      source: 'monitoring_simulated',
    },
    {
      id: 'tkt_mahalaxmi_1',
      customerId: 'cus_mahalaxmi',
      category: 'payment',
      subject: 'Request for GST invoice copy for August',
      description: 'Please share a copy of the August energy invoice for our accountant.',
      status: 'resolved',
      priority: 'low',
      createdAt: '2026-09-04T08:00:00.000Z',
      updatedAt: '2026-09-05T08:00:00.000Z',
      history: [
        { at: '2026-09-04T08:00:00.000Z', by: 'Customer', text: 'Ticket submitted from customer portal.', status: 'open' },
        { at: '2026-09-05T08:00:00.000Z', by: 'Vikram Shinde', text: 'Invoice copy shared by email (sample).', status: 'resolved' },
      ],
      source: 'customer',
    },
  ];
}

export function createInitialState(): AppState {
  return {
    version: STATE_VERSION,
    customers: seedCustomers(),
    surveys: seedSurveys(),
    tickets: seedTickets(),
    portalCustomerId: null,
    staffUserId: null,
    onboardingDraft: null,
    demo: { active: false, step: 0 },
    globalAssumptions: { ...DEFAULT_ASSUMPTIONS },
  };
}
