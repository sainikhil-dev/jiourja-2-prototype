import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { Button, Card, ChoiceCard, EmptyState, Field, Input, LinkButton, Notice, Textarea, useToast } from '@/components/ui';
import { useI18n } from '@/i18n/i18n';
import { store, useAppState } from '@/store/store';
import { bookSurvey } from '@/store/actions';
import { dateLabel } from '@/lib/format';
import type { SiteSurvey } from '@/types';

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nextWorkingDay(from = new Date(), plus = 2) {
  const d = new Date(from);
  d.setDate(d.getDate() + plus);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

export default function BookSurvey() {
  const { t } = useI18n();
  const s = useAppState();
  const nav = useNavigate();
  const toast = useToast();
  const c = s.customers.find((x) => x.id === s.portalCustomerId);
  const existing = s.surveys.find((v) => v.customerId === c?.id && ['requested', 'confirmed', 'rescheduled'].includes(v.status));
  const [date, setDate] = useState(nextWorkingDay());
  const [win, setWin] = useState<SiteSurvey['timeWindow']>('morning');
  const [name, setName] = useState(c?.business.contactName ?? '');
  const [phone, setPhone] = useState(c?.business.phone ?? '');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (!c) return <EmptyState title="Start an enquiry first" action={<LinkButton to="/start">{t('Check My Savings')}</LinkButton>} />;

  const minDate = nextWorkingDay(new Date(), 1);
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!date || date < minDate) e.date = 'Please choose a date from tomorrow onwards.';
    else if (new Date(`${date}T00:00:00`).getDay() === 0) e.date = 'Site visits are not available on Sundays.';
    if (!name.trim()) e.name = 'Please enter a contact name.';
    if (!/^[6-9][0-9]{9}$/.test(phone)) e.phone = 'Enter a 10-digit mobile number.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    const r = bookSurvey(store.get(), c.id, { preferredDate: date, timeWindow: win, contactName: name, phone, notes });
    store.set(r.state);
    setBusy(false);
    setDone(r.id);
    toast('Site visit request sent.');
  };

  if (done || existing) {
    const sv = s.surveys.find((x) => x.id === (done ?? existing?.id));
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Card className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-teal" />
          <h1 className="mt-3 text-2xl font-bold">{sv?.status === 'confirmed' ? t('Your engineer visit is scheduled.') : 'Visit request received'}</h1>
          <p className="mt-2 text-slate-600">
            {sv?.status === 'confirmed'
              ? `Confirmed for ${dateLabel(sv.confirmedDate ?? sv.preferredDate)} (${sv.timeWindow})${sv.engineer ? ` with ${sv.engineer}` : ''}.`
              : `You asked for ${dateLabel(sv?.preferredDate)} (${sv?.timeWindow}). Our team will confirm the date — you will see it in your enquiry page. No engineer has been dispatched yet.`}
          </p>
        </Card>
        <Button size="lg" block onClick={() => nav('/my')}>
          Go to my enquiry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-electric">
        <ArrowLeft className="h-4 w-4" /> {t('Back')}
      </button>
      <Card>
        <h1 className="text-2xl font-bold">{t('Book a free site visit')}</h1>
        <p className="mt-1 text-slate-500">An engineer checks your roof, wiring and shade. It takes about an hour and there is no charge.</p>
        <div className="mt-5 space-y-4">
          <Field label={t('Preferred visit date')} error={errors.date}>
            <Input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} invalid={!!errors.date} />
          </Field>
          <Field label={t('Preferred time')}>
            <div className="grid gap-2 sm:grid-cols-3">
              <ChoiceCard selected={win === 'morning'} onClick={() => setWin('morning')} title={t('Morning (9 AM – 12 PM)')} />
              <ChoiceCard selected={win === 'afternoon'} onClick={() => setWin('afternoon')} title={t('Afternoon (12 PM – 4 PM)')} />
              <ChoiceCard selected={win === 'evening'} onClick={() => setWin('evening')} title={t('Evening (4 PM – 7 PM)')} />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Your name')} error={errors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} />
            </Field>
            <Field label={t('Mobile number')} error={errors.phone}>
              <Input value={phone} inputMode="tel" maxLength={10} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} invalid={!!errors.phone} />
            </Field>
          </div>
          <Field label={t('Notes for our engineer (optional)')}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Roof access is through the side staircase" />
          </Field>
          <Notice tone="info">Your request goes to the JioUrja team, who will confirm the visit. You can track it on your enquiry page.</Notice>
          <Button size="lg" block variant="teal" onClick={submit} loading={busy} icon={<CalendarCheck className="h-5 w-5" />}>
            {t('Request visit')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
