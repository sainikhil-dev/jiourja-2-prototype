import { useNavigate } from 'react-router-dom';
import { ArrowRight, BatteryCharging, Building2, Factory, HardHat, PlayCircle, Server, Sun, Wallet } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui';
import { useI18n } from '@/i18n/i18n';
import { store } from '@/store/store';
import { startDemo } from '@/components/GuidedDemo';

export default function Landing() {
  const { t } = useI18n();
  const nav = useNavigate();
  const cards = [
    { icon: <Sun className="h-6 w-6" />, title: t('Reduce electricity costs'), body: t('Use rooftop solar to buy fewer units from the grid.'), tone: 'bg-amber-50 text-amber-700' },
    { icon: <Wallet className="h-6 w-6" />, title: t('Pay flexibly'), body: t('Pay per unit of solar electricity, or own the system with an EMI.'), tone: 'bg-electric-50 text-electric' },
    { icon: <HardHat className="h-6 w-6" />, title: t('Get expert installation and support'), body: t('Engineers survey your roof, install the system and look after it.'), tone: 'bg-teal-50 text-teal-700' },
  ];
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-navy px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
            <BatteryCharging className="h-4 w-4 text-amber" /> Energy-as-a-Service for MSMEs · Concept prototype
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{t('Lower electricity bills. Smarter energy for your business.')}</h1>
          <p className="mt-4 text-lg text-slate-200">{t('Explore solar, battery storage and flexible payment options for your factory or business.')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="teal" onClick={() => nav('/start')} icon={<ArrowRight className="h-5 w-5" />}>
              {t('Check My Savings')}
            </Button>
            <LinkButton to="/my/accounts" size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              {t('View Sample Customer')}
            </LinkButton>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <button
              onClick={() => {
                startDemo();
                nav('/start');
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-amber hover:underline"
            >
              <PlayCircle className="h-4 w-4" /> {t('Start Guided Demo')}
            </button>
            <button onClick={() => nav('/partner')} className="font-semibold text-slate-200 hover:text-white hover:underline">
              {t('JioUrja Partner Login')} →
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/60">
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${c.tone}`}>{c.icon}</div>
            <h2 className="font-semibold text-navy">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{c.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('What kind of business are you?')}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => nav('/start')}
            className="group flex items-start gap-3 rounded-2xl border-2 border-electric bg-white p-4 text-left shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
          >
            <Factory className="mt-0.5 h-6 w-6 text-electric" />
            <span>
              <span className="block font-semibold">{t('MSME / Small Factory')}</span>
              <span className="text-sm text-slate-500">Check your savings in about 3 minutes</span>
            </span>
          </button>
          <button onClick={() => nav('/segments/large-industry')} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300">
            <Building2 className="mt-0.5 h-6 w-6 text-slate-400" />
            <span>
              <span className="block font-semibold">{t('Large Industry')}</span>
              <span className="text-sm text-slate-500">How JioUrja could work for large plants (concept)</span>
            </span>
          </button>
          <button onClick={() => nav('/segments/data-centre')} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300">
            <Server className="mt-0.5 h-6 w-6 text-slate-400" />
            <span>
              <span className="block font-semibold">{t('Data Centre')}</span>
              <span className="text-sm text-slate-500">Requirements we would assess (concept)</span>
            </span>
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-card ring-1 ring-slate-200/60">
        <h2 className="mb-2 font-semibold text-navy">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {['Tell us your monthly bill', 'See a preliminary savings estimate', 'Free engineer visit to check your roof', 'Installation, monitoring and support'].map((x, i) => (
            <li key={x} className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{i + 1}</span>
              {x}
            </li>
          ))}
        </ol>
      </section>
      <p className="text-center text-xs text-slate-400">
        Demo data is stored only in this browser.{' '}
        <button
          className="underline hover:text-navy"
          onClick={() => {
            if (confirm('Reset all demo data to the original sample customers?')) {
              store.reset();
              location.assign('/');
            }
          }}
        >
          Reset demo data
        </button>
      </p>
    </div>
  );
}
