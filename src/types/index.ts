// Shared domain model for JioUrja 2.0.
// One data model is used by both the customer portal and the partner console.

export type ISODate = string;

export type IndustryCategory =
  | 'manufacturing'
  | 'engineering_workshop'
  | 'printing_packaging'
  | 'food_processing'
  | 'plastics'
  | 'commercial'
  | 'other';

export type Premises = 'owned' | 'rented';

/** Where a number came from — used to keep simulated data clearly labelled. */
export type DataSource = 'customer_entered' | 'sample_dataset' | 'estimated' | 'staff_entered' | 'uploaded';

export interface StoredFileRef {
  id: string; // key in IndexedDB file store
  name: string;
  type: string;
  size: number;
  uploadedAt: ISODate;
}

export interface ElectricityBill {
  monthlyBillInr: number | null;
  monthlyUnitsKwh?: number | null;
  tariffCategory?: string;
  sanctionedLoadKva?: number | null;
  provider?: string;
  demandChargesInr?: number | null;
  source: DataSource;
  uploadedFile?: StoredFileRef;
}

export interface Business {
  name: string;
  industry: IndustryCategory;
  city: string;
  pinCode: string;
  operatingStartHour: number; // 0-23
  operatingEndHour: number; // 1-24
  workingDaysPerWeek: number; // 5-7
  premises: Premises;
  businessAgeYears?: number | null;
  contactName: string;
  phone: string;
  email?: string;
}

export interface Facility {
  address?: string;
  lat?: number;
  lng?: number;
}

// ---------- Tariffs ----------

export interface TouPeriod {
  label: string;
  startHour: number; // inclusive
  endHour: number; // exclusive, may wrap past 24 when start > end
  adderInrPerKwh: number; // positive surcharge or negative rebate
}

export interface TariffSchedule {
  name: string;
  isIllustrative: boolean;
  energyChargeInrPerKwh: number;
  wheelingChargeInrPerKwh: number;
  fuelAdjustmentInrPerKwh: number;
  fixedDemandChargeInrPerKvaMonth: number;
  electricityDutyPct: number; // applied to energy + wheeling + FAC + ToD + fixed
  touPeriods: TouPeriod[];
  exportCompensationInrPerKwh: number;
  /** Maximum export (kW) allowed by the connection; null = no limit, 0 = zero-export site. */
  exportLimitKw: number | null;
  annualEscalationPct: number;
}

// ---------- Load ----------

export type LoadProfileKind = 'synthetic_sample' | 'estimated_from_bill' | 'uploaded_interval';

export interface LoadProfile {
  kind: LoadProfileKind;
  label: string;
  /** 24 hourly average kW values for a working day. */
  workdayKw: number[];
  /** 24 hourly average kW values for a non-working day. */
  holidayKw: number[];
  workingDaysPerWeek: number;
  /** Monthly multipliers (12) applied to the daily shape. */
  monthlyFactor: number[];
  sourceFile?: StoredFileRef;
  uploadedRows?: number;
}

// ---------- Roof ----------

export interface Point {
  x: number; // metres, east
  y: number; // metres, south (screen down)
}

export type ObstacleKind = 'water_tank' | 'ac_unit' | 'skylight' | 'access_path' | 'neighbour_building' | 'tree' | 'other';

export interface ShadeObstacle {
  id: string;
  kind: ObstacleKind;
  label: string;
  x: number; // top-left, metres
  y: number;
  w: number;
  h: number;
  heightM: number; // height above roof surface (0 for skylight / walkway)
  /** 0..1 — fraction of light blocked within the shadow (1 = solid). */
  severity: number;
  /** Whether the obstacle footprint is on the roof (excluded from panels). */
  onRoof: boolean;
}

export type RoofMethod = 'map' | 'manual' | 'unknown' | 'staff_drawn' | 'sample';

export interface RoofAssessment {
  method: RoofMethod;
  polygon: Point[]; // empty when unknown
  lengthM?: number | null;
  widthM?: number | null;
  obstacles: ShadeObstacle[];
  hasWaterTank?: boolean;
  hasTallNeighbours?: boolean;
  hasOtherObstructions?: boolean;
  photos: StoredFileRef[];
  setbackM: number;
  walkwayM: number;
  panel: { lengthM: number; widthM: number; watt: number; rowGapM: number };
  excludeHeavilyShaded: boolean;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: ISODate;
  status: RoofStatus;
  notes?: string;
  mapCenter?: { lat: number; lng: number };
  /** Corner points clicked by the customer on map imagery (approximate). */
  mapOutline?: { lat: number; lng: number }[];
  /** Customer confirmed a pre-filled sample roof. */
  customerConfirmed?: boolean;
}

export type RoofStatus = 'not_provided' | 'customer_provided' | 'under_review' | 'engineer_verification_required' | 'verified' | 'not_suitable';

export interface RoofAnalysis {
  grossAreaM2: number;
  usableAreaM2: number;
  obstacleAreaM2: number;
  setbackAreaM2: number;
  panels: { x: number; y: number; w: number; h: number; annualShadeFraction: number }[];
  panelCount: number;
  capacityKw: number;
  /** 12 x 24 effective shade loss fraction per month/hour (0..1). */
  shadeLossByMonthHour: number[][];
  annualShadeLossPct: number;
  shadeRisk: 'low' | 'moderate' | 'high';
  confidence: Confidence;
  confidenceReasons: string[];
}

export type Confidence = 'low' | 'medium' | 'high';

// ---------- Systems ----------

export interface SolarSystem {
  capacityKw: number;
  panelCount?: number;
}

export interface BatterySystem {
  capacityKwh: number;
  powerKw: number;
}

// ---------- Assumptions ----------

export interface Assumptions {
  // Solar
  specificYieldKwhPerKwpDay: number[]; // 12 values, before performance ratio
  performanceRatio: number;
  solarDegradationPctYr: number;
  solarCapexInrPerKw: number;
  solarOmInrPerKwYr: number;
  // Battery
  batteryCandidatesKwh: number[];
  batteryCRate: number; // power (kW) per kWh
  roundTripEfficiency: number;
  socMinPct: number;
  socMaxPct: number;
  batteryCapexInrPerKwh: number;
  batteryOmPctCapexYr: number;
  batteryCycleLife: number;
  batteryCalendarLifeYrs: number;
  batteryFadePctYr: number;
  batteryReplacementCostPct: number; // future replacement cost as % of today's battery CAPEX
  allowGridCharging: boolean;
  dischargeWindows: { startHour: number; endHour: number }[];
  minBatteryBenefitCostRatio: number;
  // Commercial
  analysisYears: number;
  omEscalationPct: number;
  insurancePctCapex: number;
  discountRatePct: number; // customer/project discount rate for NPV
  providerHurdleRatePct: number; // provider target return for cost-reflective PPA
  ppaTermYears: number;
  ppaRateMode: 'cost_reflective' | 'manual';
  ppaManualRateInrPerKwh: number;
  ppaEscalationPct: number;
  ppaSecurityDepositMonths: number;
  loanInterestPct: number;
  loanTenureMonths: number;
  downPaymentPct: number;
  maxSolarToSanctionedLoadRatio: number;
  solarSizingStepKw: number;
}

// ---------- Simulation ----------

export interface IntervalResult {
  load: number;
  solar: number;
  solarToLoad: number;
  solarToBattery: number;
  gridToBattery: number;
  batteryToLoad: number;
  gridImport: number;
  gridExport: number;
  curtailed: number;
  socKwh: number;
}

export interface MonthlyEnergy {
  month: number;
  loadKwh: number;
  solarKwh: number;
  selfConsumedKwh: number;
  batteryDeliveredKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  baselineBillInr: number;
  postBillInr: number;
}

export interface BillBreakdown {
  energyInr: number;
  wheelingInr: number;
  fuelAdjustmentInr: number;
  touInr: number;
  fixedInr: number;
  dutyInr: number;
  exportCreditInr: number;
  totalInr: number;
}

export interface EnergySimulation {
  solarKw: number;
  battery: BatterySystem | null;
  annual: {
    loadKwh: number;
    solarKwh: number;
    solarPotentialKwh: number;
    selfConsumedKwh: number;
    solarToBatteryKwh: number;
    gridToBatteryKwh: number;
    batteryDeliveredKwh: number;
    gridImportKwh: number;
    gridExportKwh: number;
    curtailedKwh: number;
    batteryCycles: number;
    batteryLossesKwh: number;
  };
  baselineBill: BillBreakdown;
  postBill: BillBreakdown;
  avoidedCostInr: number; // year 1 gross avoided
  monthly: MonthlyEnergy[];
  /** One representative working day (hourly intervals) per month, taken from the simulated year. */
  sampleDays: IntervalResult[][];
  maxSocObservedKwh: number;
  minSocObservedKwh: number;
  maxBatteryPowerObservedKw: number;
}

export interface YearCashFlow {
  year: number;
  avoidedCostInr: number;
  ppaPaymentInr: number;
  omInr: number;
  insuranceInr: number;
  replacementInr: number;
  capexInr: number;
  providerNetInr: number; // provider (asset owner) pre-tax unlevered
  customerNetPpaInr: number;
  customerNetLoanInr: number;
}

export interface ScenarioEconomics {
  key: string;
  label: string;
  solarKw: number;
  batteryKwh: number;
  batteryKw: number;
  sim: EnergySimulation;
  capexInr: number;
  solarCapexInr: number;
  batteryCapexInr: number;
  annualOmInr: number;
  batteryReplacementYear: number | null;
  batteryReplacementCostInr: number;
  lifecycleNpvInr: number; // owner-perspective NPV of avoided cost minus costs
  /** PV of the customer's net savings under a cost-reflective PPA (term + post-transfer years). Design objective. */
  customerPpaNpvInr: number;
  simplePaybackYears: number | null;
  projectIrrPct: number | null;
  ppaRateInrPerKwh: number;
  ppaBillableKwhYr1: number;
  cashFlows: YearCashFlow[];
  provider: {
    year1RevenueInr: number;
    year1OperatingCostInr: number;
    npvAtHurdleInr: number;
    irrPct: number | null;
  };
  customerPpa: {
    upfrontDepositInr: number;
    year1AvoidedInr: number;
    year1PaymentsInr: number;
    year1NetSavingsInr: number;
    monthlyNetSavingsInr: number;
    monthlyPaymentInr: number;
    termNetSavingsInr: number;
  };
  customerLoan: {
    installationCostInr: number;
    downPaymentInr: number;
    loanAmountInr: number;
    emiInr: number;
    tenureMonths: number;
    interestPct: number;
    year1AvoidedInr: number;
    year1OmInr: number;
    monthlyNetDuringLoanInr: number;
    monthlyNetAfterLoanInr: number;
    lifetimeNetSavingsInr: number;
  };
}

export type RecommendationType = 'solar_only' | 'solar_battery' | 'needs_survey' | 'not_viable';

export interface Recommendation {
  type: RecommendationType;
  chosen: ScenarioEconomics | null;
  solarOnly: ScenarioEconomics | null;
  batteryOptions: ScenarioEconomics[];
  solarSizing: { kw: number; npv: number }[];
  maxSolarKw: number;
  solarLimitReason: string;
  reasons: string[]; // staff-facing explanation
  customerMessages: string[]; // plain language
  usagePattern: 'daytime' | 'evening' | 'mixed';
  baselineMonthlyBillInr: number;
  effectiveRateInrPerKwh: number;
  avoidableSolarRateInrPerKwh: number;
  confidence: Confidence;
  savingsRangeMonthlyInr: [number, number];
  warnings: string[];
}

// ---------- Workflow ----------

export const STAGES = [
  'enquiry_received',
  'electricity_assessment',
  'roof_doc_verification',
  'final_proposal',
  'customer_acceptance',
  'installation_scheduled',
  'installation_complete',
  'system_active',
] as const;
export type StageId = (typeof STAGES)[number];

export type ScreeningStatus = 'initial_details_received' | 'additional_documents_required' | 'eligibility_under_review' | 'ready_for_commercial_assessment';

export interface CustomerScreening {
  premises: Premises;
  businessAgeYears: number | null;
  canProvideRegistration: 'yes' | 'no' | 'unsure';
  roofPermission: 'owner' | 'landlord_granted' | 'landlord_pending' | 'unknown';
  expectedOccupancyYears: number | null;
  status: ScreeningStatus;
}

export const ELIGIBILITY_CHECKS = [
  ['identity', 'Business identity verified'],
  ['registration', 'GSTIN / Udyam / applicable registration reviewed'],
  ['payment_history', 'Electricity payment history reviewed'],
  ['premises', 'Premises ownership or landlord NOC checked'],
  ['tenure', 'Lease or occupancy tenure assessed'],
  ['financials', 'Financial documents received'],
  ['bureau', 'Credit bureau assessment requested (where permitted, with consent)'],
  ['financier', 'Financing partner review completed'],
  ['security', 'Payment-security requirements assessed'],
] as const;
export type EligibilityCheckKey = (typeof ELIGIBILITY_CHECKS)[number][0];

export type EligibilityDecision = 'pending_review' | 'more_info_required' | 'suitable_for_ppa' | 'consider_financed' | 'not_currently_suitable';

export interface EligibilityReview {
  checks: Record<EligibilityCheckKey, boolean>;
  decision: EligibilityDecision;
  riskFlags: string[];
  notes: string;
  reviewedBy?: string;
  updatedAt?: ISODate;
  isSampleOutcome: boolean;
}

export type PlanType = 'ppa' | 'loan';

export interface CommercialProposal {
  id: string;
  version: number;
  generatedAt: ISODate;
  generatedBy: string;
  planType: PlanType | null;
  recommendationType: RecommendationType;
  solarKw: number;
  batteryKwh: number;
  batteryKw: number;
  capexInr: number;
  ppaRateInrPerKwh: number;
  ppaMonthlyPaymentInr: number;
  ppaMonthlyNetSavingsInr: number;
  ppaDepositInr: number;
  emiInr: number;
  loanMonthlyNetInr: number;
  baselineMonthlyBillInr: number;
  status: 'draft' | 'pending_commercial_review' | 'approved' | 'customer_accepted';
  assumptionsHash: string;
}

export type SurveyStatus = 'requested' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled';

export interface SiteSurvey {
  id: string;
  customerId: string;
  preferredDate: string; // yyyy-mm-dd
  timeWindow: 'morning' | 'afternoon' | 'evening';
  contactName: string;
  phone: string;
  notes: string;
  status: SurveyStatus;
  confirmedDate?: string;
  engineer?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking';

export interface PaymentRecord {
  id: string;
  at: ISODate;
  amountInr: number;
  method: PaymentMethod;
  /** Billing month this payment is applied to (yyyy-mm), when known. */
  forMonth?: string;
  reference: string;
  /** True when this payment cleared an overdue invoice rather than the regular upcoming bill. */
  clearedOverdue: boolean;
}

export interface Installation {
  scheduledDate?: string;
  completedDate?: string;
  commissionedDate?: string;
  engineer?: string;
  solarKw?: number;
  batteryKwh?: number;
  batteryKw?: number;
  planType?: PlanType;
  ppaRateInrPerKwh?: number;
  emiInr?: number;
  contractStart?: string;
  contractYears?: number;
  documents: { name: string; kind: string }[];
  /** Number of unpaid monthly invoices (sample payment exception). Cleared by a customer payment. */
  outstandingMonths?: number;
  /** Demo payments made by the customer from the portal (no real payment gateway). */
  paymentHistory: PaymentRecord[];
}

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'problem' | 'engineer_visit' | 'payment' | 'general' | 'system_alert';

export interface ServiceTicket {
  id: string;
  customerId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high';
  engineer?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  history: { at: ISODate; by: string; text: string; status?: TicketStatus }[];
  source: 'customer' | 'monitoring_simulated' | 'staff';
}

export interface TelemetryMonth {
  month: string; // yyyy-mm
  solarKwh: number;
  consumptionKwh: number;
  gridImportKwh: number;
  batteryDeliveredKwh: number;
  avoidedCostInr: number;
  paymentInr: number;
  netSavingsInr: number;
  availabilityPct: number;
}

export interface Telemetry {
  isSimulated: true;
  months: TelemetryMonth[];
  today: { hour: number; solarKw: number; loadKw: number; gridKw: number; batteryKw: number; socPct: number | null }[];
  status: 'ok' | 'attention';
  outstandingInr: number;
  lastPaymentDate?: string;
  nextPaymentDate: string;
  nextPaymentInr: number;
}

export interface ActivityEntry {
  at: ISODate;
  by: string;
  text: string;
}

export interface Customer {
  id: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  isFictional: true;
  origin: 'seed' | 'portal_enquiry';
  sampleTag?: string;
  business: Business;
  facility: Facility;
  bill: ElectricityBill;
  roof: RoofAssessment;
  loadProfile: LoadProfile;
  tariff: TariffSchedule;
  screening: CustomerScreening;
  eligibility: EligibilityReview;
  assumptionOverrides: Partial<Assumptions>;
  design: { solarKwOverride: number | null; batteryKwhOverride: number | null };
  preferredPlan: PlanType | null;
  planRequestedAt?: ISODate;
  proposals: CommercialProposal[];
  stage: StageId;
  stageHistory: { stage: StageId; at: ISODate; by: string }[];
  energyAssessmentStatus: 'preliminary' | 'reviewed_by_staff';
  installation: Installation;
  assignedRep: string;
  activity: ActivityEntry[];
  telemetrySeed?: number;
}

export interface StaffUser {
  id: string;
  name: string;
  role: 'solutions_manager' | 'sales' | 'technical' | 'operations';
  title: string;
}

export interface AppState {
  version: number;
  customers: Customer[];
  surveys: SiteSurvey[];
  tickets: ServiceTicket[];
  portalCustomerId: string | null;
  staffUserId: string | null;
  onboardingDraft: OnboardingDraft | null;
  demo: { active: boolean; step: number; startedAt?: ISODate; customerId?: string };
  globalAssumptions: Assumptions;
}

export interface OnboardingDraft {
  step: number;
  bill: ElectricityBill;
  business: Business;
  roof: RoofAssessment;
  screening: Omit<CustomerScreening, 'status'>;
  usedSample: boolean;
}
