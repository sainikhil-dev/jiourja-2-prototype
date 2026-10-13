import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ChevronDown, FileUp, Factory, HelpCircle, Map, Ruler, Sparkles, X } from 'lucide-react';
import { Badge, Button, Card, Checkbox, ChoiceCard, Field, Input, Notice, NumberInput, ProgressBar, Select, SimLabel, useToast } from '@/components/ui';
import { RoofMap } from '@/components/RoofMap';
import { useI18n } from '@/i18n/i18n';
import { store, useAppState } from '@/store/store';
import { emptyDraft, submitEnquiry } from '@/store/actions';
import { samplePuneFactoryDraft } from '@/data/seed';
import type { Business, IndustryCategory, OnboardingDraft, RoofAssessment } from '@/types';
import { latLngToLocalMetres, polygonArea, rectPolygon } from '@/engine/roof';
import { saveFile } from '@/lib/fileStore';
import { cx, hourLabel, num } from '@/lib/format';

export const INDUSTRIES: { id: IndustryCategory; label: string }[] = [
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'engineering_workshop', label: 'Engineering workshop' },
  { id: 'printing_packaging', label: 'Printing / packaging' },
  { id: 'food_processing', label: 'Food processing' },
  { id: 'plastics', label: 'Plastics' },
  { id: 'commercial', label: 'Commercial premises' },
  { id: 'other', label: 'Other' },
];

const STEPS = ['Electricity bill', 'Business details', 'Rooftop', 'Review'];

function InrInput({ value, onChange, id, invalid }: { value: number | null | undefined; onChange: (v: number | null) => void; id?: string; invalid?: boolean }) {
  const display = value == null ? '' : new Intl.NumberFormat('en-IN').format(value);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-400">₹</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cx('h-16 w-full rounded-2xl border-2 bg-white pl-11 pr-4 text-3xl font-bold tabular-nums text-navy focus:border-electric focus:outline-none focus:ring-4 focus:ring-electric/20', invalid ? 'border-rose-400' : 'border-slate-300')}
        value={display}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
          onChange(digits ? Number(digits) : null);
        }}
      />
    </div>
  );
}

function validate(step: number, d: OnboardingDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    const b = d.bill.monthlyBillInr;
    if (!b) e.bill = 'Please enter your approximate monthly bill.';
    else if (b < 2000) e.bill = 'This looks too small for a business connection. Please check the amount.';
    else if (b > 10000000) e.bill = 'For bills above ₹1 crore a month, please talk to our large-industry team.';
    if (d.bill.monthlyUnitsKwh != null && d.bill.monthlyUnitsKwh < 0) e.units = 'Units cannot be negative.';
    if (d.bill.sanctionedLoadKva != null && (d.bill.sanctionedLoadKva <= 0 || d.bill.sanctionedLoadKva > 2000)) e.kva = 'Enter a value between 1 and 2,000 kVA.';
  }
  if (step === 1) {
    const b = d.business;
    if (!b.name.trim()) e.name = 'Please enter your business name.';
    if (!b.city.trim()) e.city = 'Please enter your city.';
    if (b.pinCode && !/^[1-9][0-9]{5}$/.test(b.pinCode)) e.pin = 'PIN code should be 6 digits.';
    if (!b.contactName.trim()) e.contact = 'Please tell us who to contact.';
    if (!/^[6-9][0-9]{9}$/.test(b.phone.replace(/\s/g, ''))) e.phone = 'Enter a 10-digit mobile number.';
    if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) e.email = 'This email address does not look right.';
    if (b.operatingStartHour === b.operatingEndHour) e.hours = 'Opening and closing time cannot be the same.';
  }
  if (step === 2) {
    const r = d.roof;
    if (r.method === 'manual') {
      if ((r.lengthM ?? 0) > 0 !== (r.widthM ?? 0) > 0) e.roof = 'Enter both length and width, or leave both empty.';
      if ((r.lengthM ?? 0) > 300 || (r.widthM ?? 0) > 300) e.roof = 'Please check the roof size (in metres).';
    }
    if (r.method === 'map' && (r.mapOutline?.length ?? 0) > 0 && (r.mapOutline?.length ?? 0) < 3) e.roof = 'Mark at least 3 corners, or clear the outline.';
    if (r.method === 'sample' && !r.customerConfirmed) e.roof = 'Please confirm the sample rooftop (or choose another option).';
  }
  return e;
}

export default function Onboarding() {
  const { t } = useI18n();
  const s = useAppState();
  const nav = useNavigate();
  const toast = useToast();
  const draft = s.onboardingDraft ?? emptyDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!s.onboardingDraft) store.set((st) => ({ ...st, onboardingDraft: emptyDraft() }));
  }, [s.onboardingDraft]);

  const update = (fn: (d: OnboardingDraft) => OnboardingDraft) => store.set((st) => ({ ...st, onboardingDraft: fn(st.onboardingDraft ?? emptyDraft()) }));
  const setBill = (p: Partial<OnboardingDraft['bill']>) => update((d) => ({ ...d, bill: { ...d.bill, ...p, source: d.usedSample ? d.bill.source : 'customer_entered' } }));
  const setBiz = (p: Partial<Business>) => update((d) => ({ ...d, business: { ...d.business, ...p } }));
  const setRoof = (p: Partial<RoofAssessment>) => update((d) => ({ ...d, roof: { ...d.roof, ...p } }));
  const setScreen = (p: Partial<OnboardingDraft['screening']>) => update((d) => ({ ...d, screening: { ...d.screening, ...p } }));
  const step = draft.step;

  const go = (n: number) => {
    if (n > step) {
      const e = validate(step, draft);
      setErrors(e);
      if (Object.keys(e).length) {
        toast('Please check the highlighted fields.', 'error');
        return;
      }
    } else setErrors({});
    update((d) => ({ ...d, step: n }));
    topRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const loadSample = () => {
    store.set((st) => ({ ...st, onboardingDraft: samplePuneFactoryDraft() }));
    setErrors({});
    toast('Sample Pune factory loaded (fictional data).', 'info');
  };

  const submit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 450)); // let the loading state render; the engine runs on the results page
    const r = submitEnquiry(store.get(), draft);
    store.set(r.state);
    setSubmitting(false);
    nav('/my/plan');
  };

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-20">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-navy">
            {t('Step')} {step + 1} {t('of')} {STEPS.length}: {t(STEPS[step])}
          </span>
          {draft.usedSample && <SimLabel>Sample factory (fictional)</SimLabel>}
        </div>
        <ProgressBar value={((step + 1) / STEPS.length) * 100} />
      </div>

      {step === 0 && (
        <Card>
          <h1 className="text-2xl font-bold">{t('What is your average monthly electricity bill?')}</h1>
          <p className="mt-1 text-slate-500">{t('An approximate amount is fine.')}</p>
          <div className="mt-5 space-y-4">
            <Field label="Monthly bill amount" htmlFor="bill" error={errors.bill}>
              <InrInput id="bill" value={draft.bill.monthlyBillInr} onChange={(v) => setBill({ monthlyBillInr: v })} invalid={!!errors.bill} />
            </Field>
            {!draft.usedSample && (
              <button onClick={loadSample} className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-teal bg-teal-50/50 p-4 text-left hover:bg-teal-50">
                <Sparkles className="h-5 w-5 text-teal-700" />
                <span>
                  <span className="block font-semibold text-teal-700">{t('Try Sample Pune Factory')}</span>
                  <span className="text-sm text-slate-600">Fill the form with a fictional small factory in Pune to see how it works.</span>
                </span>
              </button>
            )}
            {draft.usedSample && (
              <Notice tone="sim" title="Sample data loaded">
                Shree Ganesh Industries is a fictional Pune factory: ₹1,18,000 monthly bill, about 10,000 units, 40 kVA sanctioned load, 9 AM – 9 PM. You can still change any value.{' '}
                <button className="font-semibold underline" onClick={() => store.set((st) => ({ ...st, onboardingDraft: emptyDraft() }))}>
                  Clear sample
                </button>
              </Notice>
            )}
            <BillUpload draft={draft} setBill={setBill} />
            <details className="group rounded-xl border border-slate-200 bg-white" open={!!(draft.bill.monthlyUnitsKwh || draft.bill.sanctionedLoadKva)}>
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold text-navy">
                {t('Add more details for a better estimate')}
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
                <Field label={t('Monthly electricity units')} optional hint="Shown as 'Units consumed' or 'kWh' on your bill." error={errors.units}>
                  <NumberInput value={draft.bill.monthlyUnitsKwh} onChange={(v) => setBill({ monthlyUnitsKwh: v })} placeholder="e.g. 10000" />
                </Field>
                <Field label="Sanctioned load (kVA or kW)" optional hint="Shown near the top of your bill." error={errors.kva}>
                  <NumberInput value={draft.bill.sanctionedLoadKva} onChange={(v) => setBill({ sanctionedLoadKva: v })} placeholder="e.g. 40" />
                </Field>
                <Field label="Tariff category" optional>
                  <Select value={draft.bill.tariffCategory ?? ''} onChange={(e) => setBill({ tariffCategory: e.target.value })}>
                    <option value="">Not sure</option>
                    <option>LT Industrial</option>
                    <option>HT Industrial</option>
                    <option>LT Commercial</option>
                  </Select>
                </Field>
                <Field label="Electricity provider" optional>
                  <Input value={draft.bill.provider ?? ''} onChange={(e) => setBill({ provider: e.target.value })} placeholder="e.g. MSEDCL" />
                </Field>
                <Field label="Demand / fixed charges on the bill (₹)" optional>
                  <NumberInput value={draft.bill.demandChargesInr} onChange={(v) => setBill({ demandChargesInr: v })} placeholder="e.g. 21000" />
                </Field>
              </div>
            </details>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h1 className="text-2xl font-bold">{t('Tell us about your business')}</h1>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t('Business or factory name')} error={errors.name} htmlFor="bname">
                <Input id="bname" value={draft.business.name} onChange={(e) => setBiz({ name: e.target.value })} invalid={!!errors.name} placeholder="e.g. Shree Ganesh Industries" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t('Type of business')}>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setBiz({ industry: i.id })}
                      aria-pressed={draft.business.industry === i.id}
                      className={cx('rounded-full border px-3.5 py-2 text-sm font-medium', draft.business.industry === i.id ? 'border-electric bg-electric text-white' : 'border-slate-300 bg-white text-navy hover:border-slate-400')}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label={t('City')} error={errors.city}>
              <Input value={draft.business.city} onChange={(e) => setBiz({ city: e.target.value })} invalid={!!errors.city} />
            </Field>
            <Field label={t('PIN code')} optional error={errors.pin}>
              <Input value={draft.business.pinCode} inputMode="numeric" maxLength={6} onChange={(e) => setBiz({ pinCode: e.target.value.replace(/\D/g, '') })} invalid={!!errors.pin} placeholder="411026" />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('Factory working hours')} error={errors.hours} hint="This helps us estimate when you use electricity. It is only an estimate.">
                <div className="grid grid-cols-3 gap-2">
                  <Select aria-label={t('Opens at')} value={draft.business.operatingStartHour} onChange={(e) => setBiz({ operatingStartHour: Number(e.target.value) })}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {t('Opens at')} {hourLabel(h)}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label={t('Closes at')} value={draft.business.operatingEndHour} onChange={(e) => setBiz({ operatingEndHour: Number(e.target.value) })}>
                    {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                      <option key={h} value={h}>
                        {t('Closes at')} {hourLabel(h)}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label={t('Working days per week')} value={draft.business.workingDaysPerWeek} onChange={(e) => setBiz({ workingDaysPerWeek: Number(e.target.value) })}>
                    {[5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {d} days/week
                      </option>
                    ))}
                  </Select>
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t('Do you own or rent the premises?')}>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceCard selected={draft.business.premises === 'owned'} onClick={() => (setBiz({ premises: 'owned' }), setScreen({ premises: 'owned', roofPermission: 'owner' }))} title={t('Owned')} />
                  <ChoiceCard
                    selected={draft.business.premises === 'rented'}
                    onClick={() => (setBiz({ premises: 'rented' }), setScreen({ premises: 'rented', roofPermission: draft.screening.roofPermission === 'owner' ? 'unknown' : draft.screening.roofPermission }))}
                    title={t('Rented')}
                  />
                </div>
              </Field>
            </div>
            {draft.business.premises === 'rented' && (
              <>
                <Field label="Has your landlord agreed to solar panels on the roof?">
                  <Select value={draft.screening.roofPermission} onChange={(e) => setScreen({ roofPermission: e.target.value as OnboardingDraft['screening']['roofPermission'] })}>
                    <option value="landlord_granted">Yes, permission given</option>
                    <option value="landlord_pending">Asked, waiting for reply</option>
                    <option value="unknown">Not asked yet / not sure</option>
                  </Select>
                </Field>
                <Field label="How many more years do you expect to stay?" optional>
                  <NumberInput value={draft.screening.expectedOccupancyYears} onChange={(v) => setScreen({ expectedOccupancyYears: v })} placeholder="e.g. 5" />
                </Field>
              </>
            )}
            <Field label="How old is the business? (years)" optional>
              <NumberInput value={draft.business.businessAgeYears} onChange={(v) => (setBiz({ businessAgeYears: v }), setScreen({ businessAgeYears: v }))} placeholder="e.g. 8" />
            </Field>
            <Field label="Can you share basic registration documents (GST / Udyam)?" hint="Only needed later. Do not upload them here.">
              <Select value={draft.screening.canProvideRegistration} onChange={(e) => setScreen({ canProvideRegistration: e.target.value as 'yes' | 'no' | 'unsure' })}>
                <option value="yes">Yes</option>
                <option value="unsure">Not sure</option>
                <option value="no">No</option>
              </Select>
            </Field>
            <Field label={t('Your name')} error={errors.contact}>
              <Input value={draft.business.contactName} onChange={(e) => setBiz({ contactName: e.target.value })} invalid={!!errors.contact} autoComplete="name" />
            </Field>
            <Field label={t('Mobile number')} error={errors.phone}>
              <Input value={draft.business.phone} inputMode="tel" maxLength={10} onChange={(e) => setBiz({ phone: e.target.value.replace(/\D/g, '') })} invalid={!!errors.phone} placeholder="10-digit mobile" autoComplete="tel" />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('Email (optional)')} error={errors.email}>
                <Input type="email" value={draft.business.email ?? ''} onChange={(e) => setBiz({ email: e.target.value })} autoComplete="email" />
              </Field>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && <RoofStep draft={draft} setRoof={setRoof} error={errors.roof} />}

      {step === 3 && <ReviewStep draft={draft} goTo={(n) => go(n)} />}

      <div className="sticky bottom-0 z-20 -mx-4 mt-5 flex gap-3 border-t border-slate-200 bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        {step > 0 ? (
          <Button variant="outline" size="lg" onClick={() => go(step - 1)} icon={<ArrowLeft className="h-5 w-5" />}>
            {t('Back')}
          </Button>
        ) : (
          <Button variant="outline" size="lg" onClick={() => nav('/')} icon={<ArrowLeft className="h-5 w-5" />}>
            {t('Back')}
          </Button>
        )}
        {step < 3 ? (
          <Button size="lg" className="flex-1" onClick={() => go(step + 1)}>
            {t('Continue')} <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button size="lg" variant="teal" className="flex-1" onClick={submit} loading={submitting}>
            {submitting ? 'Calculating your estimate…' : t('See my estimate')}
          </Button>
        )}
      </div>
    </div>
  );
}

function BillUpload({ draft, setBill }: { draft: OnboardingDraft; setBill: (p: Partial<OnboardingDraft['bill']>) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const f = draft.bill.uploadedFile;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {f ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" />
              <span className="truncate font-medium">{f.name}</span>
              <Badge>{Math.round(f.size / 1024)} KB</Badge>
            </div>
            <button className="rounded p-1 text-slate-400 hover:text-navy" aria-label="Remove file" onClick={() => setBill({ uploadedFile: undefined })}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <Notice tone="info">We saved your bill for our team. Automatic reading of bills is not available in this prototype, so please type the bill amount above (and units if you know them).</Notice>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-3">
          <FileUp className="h-5 w-5 text-electric" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-navy">{busy ? 'Saving…' : t('Upload your bill (PDF or photo)')}</span>
            <span className="text-xs text-slate-500">Optional. Stored only in this browser for the demo — please do not upload real documents.</span>
          </span>
          <input
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const ref = await saveFile(file);
                setBill({ uploadedFile: ref });
              } catch (err) {
                toast((err as Error).message || 'Could not save the file.', 'error');
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

function RoofStep({ draft, setRoof, error }: { draft: OnboardingDraft; setRoof: (p: Partial<RoofAssessment>) => void; error?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const r = draft.roof;
  const area = polygonArea(r.polygon);
  const setManual = (lengthM: number | null, widthM: number | null) => setRoof({ lengthM, widthM, polygon: lengthM && widthM ? rectPolygon(lengthM, widthM) : [] });
  return (
    <Card>
      <h1 className="text-2xl font-bold">{t('Can you tell us about your factory rooftop?')}</h1>
      <p className="mt-1 text-slate-500">This helps us estimate how much solar can fit. You can skip it.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {r.method === 'sample' || draft.usedSample ? (
          <ChoiceCard selected={r.method === 'sample'} onClick={() => setRoof(samplePuneFactoryDraft().roof)} title="Sample factory roof" description="Pre-drawn for the demo" icon={<Factory className="h-5 w-5" />} />
        ) : null}
        <ChoiceCard selected={r.method === 'map'} onClick={() => setRoof({ method: 'map', polygon: latLngToLocalMetres(r.mapOutline ?? []), customerConfirmed: false })} title={t('Find my roof on a map')} icon={<Map className="h-5 w-5" />} />
        <ChoiceCard
          selected={r.method === 'manual'}
          onClick={() => setRoof({ method: 'manual', polygon: r.lengthM && r.widthM ? rectPolygon(r.lengthM, r.widthM) : [], obstacles: [], customerConfirmed: false })}
          title={t('Enter details manually')}
          icon={<Ruler className="h-5 w-5" />}
        />
        <ChoiceCard selected={r.method === 'unknown'} onClick={() => setRoof({ method: 'unknown', polygon: [], obstacles: [], customerConfirmed: false })} title={t('Not sure? Our engineer can check this.')} icon={<HelpCircle className="h-5 w-5" />} />
      </div>

      <div className="mt-5 space-y-4">
        {r.method === 'sample' && (
          <div className="space-y-3">
            <SampleRoofPreview roof={r} />
            <Notice tone="sim">
              Sample rooftop for the fictional factory: about {num(area)} m² ({r.lengthM} m × {r.widthM} m), with a water tank and a taller neighbouring building on the west side. This is a drawn illustration, not a satellite photo.
            </Notice>
            <Button variant={r.customerConfirmed ? 'teal' : 'primary'} onClick={() => setRoof({ customerConfirmed: !r.customerConfirmed, status: 'customer_provided' })} icon={<CheckCircle2 className="h-5 w-5" />}>
              {r.customerConfirmed ? 'Rooftop confirmed' : 'Yes, this is my factory rooftop'}
            </Button>
          </div>
        )}
        {r.method === 'map' && (
          <RoofMap
            points={r.mapOutline ?? []}
            center={r.mapCenter}
            onChange={(pts, center) => setRoof({ mapOutline: pts, mapCenter: center, polygon: pts.length >= 3 ? latLngToLocalMetres(pts) : [] })}
          />
        )}
        {r.method === 'manual' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Approximate roof length (metres)')} optional>
              <NumberInput value={r.lengthM} onChange={(v) => setManual(v, r.widthM ?? null)} placeholder="e.g. 20" min={0} />
            </Field>
            <Field label={t('Approximate roof width (metres)')} optional>
              <NumberInput value={r.widthM} onChange={(v) => setManual(r.lengthM ?? null, v)} placeholder="e.g. 12" min={0} />
            </Field>
            {area > 0 && <p className="text-sm text-slate-600 sm:col-span-2">That is about {num(area)} m².</p>}
          </div>
        )}
        {r.method === 'unknown' && <Notice tone="info">No problem. We will give you an estimate based on your bill, and our engineer will measure the roof during the free site visit.</Notice>}
        {error && <Notice tone="warn">{error}</Notice>}

        {(r.method === 'manual' || r.method === 'map') && (
          <>
            <div>
              <div className="mb-2 text-sm font-medium text-navy">{t('Is there anything on the roof or nearby that may block sunlight?')}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Checkbox checked={!!r.hasWaterTank} onChange={(v) => setRoof({ hasWaterTank: v })} label={t('Water tank')} />
                <Checkbox checked={!!r.hasTallNeighbours} onChange={(v) => setRoof({ hasTallNeighbours: v })} label={t('Tall buildings nearby')} />
                <Checkbox checked={!!r.hasOtherObstructions} onChange={(v) => setRoof({ hasOtherObstructions: v })} label={t('Other structures')} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <Camera className="h-5 w-5 text-electric" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t('Upload rooftop photos (optional)')}</span>
                  <span className="text-xs text-slate-500">Photos help our engineer. They are not analysed automatically.</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    const refs = [];
                    for (const f of files) {
                      try {
                        refs.push(await saveFile(f));
                      } catch (err) {
                        toast(`${f.name}: ${(err as Error).message}`, 'error');
                      }
                    }
                    if (refs.length) setRoof({ photos: [...r.photos, ...refs] });
                  }}
                />
              </label>
              {r.photos.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {r.photos.map((p) => (
                    <li key={p.id}>
                      <Badge tone="teal">
                        {p.name}
                        <button aria-label={`Remove ${p.name}`} onClick={() => setRoof({ photos: r.photos.filter((x) => x.id !== p.id) })}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export function SampleRoofPreview({ roof }: { roof: RoofAssessment }) {
  const xs = [...roof.polygon.map((p) => p.x), ...roof.obstacles.map((o) => o.x), ...roof.obstacles.map((o) => o.x + o.w)];
  const ys = [...roof.polygon.map((p) => p.y), ...roof.obstacles.map((o) => o.y), ...roof.obstacles.map((o) => o.y + o.h)];
  const minX = Math.min(...xs) - 1;
  const minY = Math.min(...ys) - 1;
  const w = Math.max(...xs) - minX + 1;
  const h = Math.max(...ys) - minY + 1;
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="h-48 w-full rounded-xl bg-slate-100" role="img" aria-label="Sample roof drawing">
      <polygon points={roof.polygon.map((p) => `${p.x},${p.y}`).join(' ')} fill="#dbe4ef" stroke="#092348" strokeWidth={0.15} />
      {roof.obstacles.map((o) => (
        <g key={o.id}>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={o.onRoof ? '#F1B650' : '#94a3b8'} opacity={0.9} rx={0.2} />
          <text x={o.x + o.w / 2} y={o.y + o.h / 2} fontSize={0.9} textAnchor="middle" dominantBaseline="middle" fill="#092348">
            {o.onRoof ? 'Tank' : 'Neighbour'}
          </text>
        </g>
      ))}
      <text x={minX + w - 1.5} y={minY + 1.5} fontSize={1} fill="#64748b" textAnchor="end">
        N ↑
      </text>
    </svg>
  );
}

function ReviewStep({ draft, goTo }: { draft: OnboardingDraft; goTo: (n: number) => void }) {
  const { t } = useI18n();
  const b = draft.business;
  const area = polygonArea(draft.roof.polygon);
  const rows: [string, string, number][] = [
    ['Monthly bill', draft.bill.monthlyBillInr ? `₹${new Intl.NumberFormat('en-IN').format(draft.bill.monthlyBillInr)}` : '—', 0],
    ['Monthly units', draft.bill.monthlyUnitsKwh ? `${num(draft.bill.monthlyUnitsKwh)} units` : 'Not provided — we will estimate', 0],
    ['Business', `${b.name} · ${INDUSTRIES.find((i) => i.id === b.industry)?.label}`, 1],
    ['Location', `${b.city}${b.pinCode ? ` ${b.pinCode}` : ''}`, 1],
    ['Working hours', `${hourLabel(b.operatingStartHour)} – ${hourLabel(b.operatingEndHour)}, ${b.workingDaysPerWeek} days a week`, 1],
    ['Premises', b.premises === 'owned' ? 'Owned' : `Rented (${draft.screening.roofPermission === 'landlord_granted' ? 'landlord agreed' : 'landlord permission pending'})`, 1],
    ['Contact', `${b.contactName} · ${b.phone}`, 1],
    ['Rooftop', area > 0 ? `About ${num(area)} m²${draft.roof.method === 'map' ? ' (marked on map)' : draft.roof.method === 'sample' ? ' (sample roof)' : ''}` : 'Engineer will check', 2],
  ];
  return (
    <Card>
      <h1 className="text-2xl font-bold">Check your details</h1>
      <p className="mt-1 text-slate-500">You will see a preliminary estimate next. It is not a final quotation.</p>
      <dl className="mt-5 divide-y divide-slate-100">
        {rows.map(([k, v, stepIdx]) => (
          <div key={k} className="flex items-start justify-between gap-3 py-3">
            <div>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="font-medium text-navy">{v}</dd>
            </div>
            <button onClick={() => goTo(stepIdx)} className="text-sm font-semibold text-electric hover:underline">
              Edit
            </button>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">By continuing you agree that JioUrja may contact you about this enquiry. ({t('Preliminary estimate')} · demo prototype)</p>
    </Card>
  );
}
