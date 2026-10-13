import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Headphones, Languages, Phone, UserRound } from 'lucide-react';
import { Button, Field, Input, Logo, Modal, Textarea, useToast } from '@/components/ui';
import { useI18n } from '@/i18n/i18n';
import { store, useAppState } from '@/store/store';
import { createTicket } from '@/store/actions';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      {lang === 'en' ? 'हिंदी' : 'English'}
    </button>
  );
}

export function HelpButton() {
  const { t } = useI18n();
  const s = useAppState();
  const toast = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const customer = s.customers.find((c) => c.id === s.portalCustomerId);
  const submit = () => {
    if (!customer) return;
    const r = createTicket(store.get(), customer.id, { category: 'general', subject: 'Call-back requested', description: `${note || 'Customer requested a call back.'}${phone ? ` Call on ${phone}.` : ''}`, priority: 'medium' });
    store.set(r.state);
    setOpen(false);
    setNote('');
    toast('Call-back request sent. Our team will see it in the partner console.');
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
      >
        <Headphones className="h-5 w-5" />
        <span className="hidden sm:inline">{t('Need help? Talk to us')}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('Talk to a JioUrja advisor')}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
            <Phone className="h-5 w-5 text-electric" />
            <div>
              <div className="font-semibold">1800-000-0000 (demo number)</div>
              <div className="text-xs text-slate-500">Mon–Sat, 9 AM – 7 PM. This prototype has no live call centre.</div>
            </div>
          </div>
          {customer ? (
            <>
              <Field label="Phone number for the call back" optional>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={customer.business.phone} inputMode="tel" />
              </Field>
              <Field label="What would you like help with?" optional>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I want to understand the payment options" />
              </Field>
              <Button block onClick={submit}>
                {t('Request a call back')}
              </Button>
              <p className="text-xs text-slate-500">Your request appears in the JioUrja partner console as a service ticket for {customer.business.name}.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Start a quick savings check first (about 3 minutes). An advisor can then call you about your own factory.</p>
              <Button
                block
                onClick={() => {
                  setOpen(false);
                  nav('/start');
                }}
              >
                {t('Check My Savings')}
              </Button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

export function CustomerLayout() {
  const s = useAppState();
  const { t } = useI18n();
  const loc = useLocation();
  const customer = s.customers.find((c) => c.id === s.portalCustomerId);
  return (
    <div className="min-h-screen bg-surface">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" aria-label="JioUrja home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {customer && loc.pathname !== '/my' && (
              <Link to="/my" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-navy hover:bg-slate-100">
                <UserRound className="h-4 w-4" />
                <span className="hidden max-w-[10rem] truncate sm:inline">{customer.business.name}</span>
                <span className="sm:hidden">{t('My enquiry')}</span>
              </Link>
            )}
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">
        <Outlet />
      </main>
      <footer className="no-print border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-slate-500">
          JioUrja 2.0 is a concept prototype by Team Miles Ahead, FMS Delhi, for The Ultimate Pitch XII. It is not an official Reliance service and has not been launched or authorised by
          Reliance Industries. All customers, tariffs and results shown are fictional or illustrative.{' '}
          <Link to="/partner" className="font-semibold text-electric hover:underline">
            {t('JioUrja Partner Login')}
          </Link>
        </div>
      </footer>
      <HelpButton />
    </div>
  );
}
