import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, Loader2, X } from 'lucide-react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'outline';
const variants: Record<Variant, string> = {
  primary: 'bg-electric text-white hover:bg-electric-700 focus-visible:ring-electric',
  teal: 'bg-teal text-white hover:bg-teal-700 focus-visible:ring-teal',
  secondary: 'bg-navy text-white hover:bg-navy-700 focus-visible:ring-navy',
  outline: 'border border-slate-300 bg-white text-navy hover:bg-slate-50 focus-visible:ring-electric',
  ghost: 'text-navy hover:bg-slate-100 focus-visible:ring-electric',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600',
};
const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-14 px-6 text-lg' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size = 'md', className, children, icon, block }: { to: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode; icon?: ReactNode; block?: boolean }) {
  return (
    <Link
      to={to}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function Card({ className, children, title, action, subtitle, id }: { className?: string; children?: ReactNode; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cx('rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/60', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-base font-semibold text-navy">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = 'slate' | 'blue' | 'teal' | 'amber' | 'red' | 'navy' | 'green';
const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-electric-50 text-electric-700',
  teal: 'bg-teal-50 text-teal-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  navy: 'bg-navy text-white',
};

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

/** Visible marker for simulated / illustrative / fictional data. */
export function SimLabel({ children = 'Simulated data', className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800', className)}>
      <FlaskConical className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children, htmlFor, optional }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy">
        {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-navy placeholder:text-slate-400 focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/30 disabled:bg-slate-50';

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={cx(inputCls, 'h-11', invalid && 'border-rose-400', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(inputCls, 'h-11 pr-8', className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputCls, 'min-h-[88px] py-2.5', className)} />;
}

export function NumberInput({ value, onChange, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <Input
      {...rest}
      type="number"
      inputMode="decimal"
      className={className}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
    />
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric',
            value === t.id ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl outline-none sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-navy" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', children, title, className }: { tone?: 'info' | 'warn' | 'success' | 'sim'; children: ReactNode; title?: ReactNode; className?: string }) {
  const map = {
    info: { cls: 'bg-electric-50 text-navy ring-electric-100', icon: <Info className="h-4 w-4 text-electric" /> },
    warn: { cls: 'bg-amber-50 text-amber-900 ring-amber-200', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
    success: { cls: 'bg-emerald-50 text-emerald-900 ring-emerald-200', icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
    sim: { cls: 'bg-amber-50/60 text-amber-900 ring-amber-200', icon: <FlaskConical className="h-4 w-4 text-amber-600" /> },
  }[tone];
  return (
    <div className={cx('flex gap-2.5 rounded-xl p-3 text-sm ring-1', map.cls, className)}>
      <div className="mt-0.5 shrink-0">{map.icon}</div>
      <div>
        {title && <div className="font-semibold">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'teal' | 'blue' | 'amber' | 'navy' }) {
  const color = tone === 'teal' ? 'text-teal-700' : tone === 'amber' ? 'text-amber-700' : tone === 'blue' ? 'text-electric-700' : 'text-navy';
  return (
    <div className="rounded-xl bg-surface p-3.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={cx('mt-1 text-xl font-bold tabular-nums', color)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <div className="font-semibold text-navy">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <label htmlFor={fid} className="flex cursor-pointer items-center gap-3 text-sm text-navy">
      <span className="relative inline-flex">
        <input id={fid} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-electric" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition', checked ? 'border-teal bg-teal-50/50' : 'border-slate-200 bg-white hover:border-slate-300', disabled && 'cursor-not-allowed opacity-60')}>
      <input id={id} type="checkbox" disabled={disabled} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-teal accent-teal-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-navy">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function ChoiceCard({ selected, onClick, title, description, icon }: { selected: boolean; onClick: () => void; title: ReactNode; description?: ReactNode; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric',
        selected ? 'border-electric bg-electric-50/60' : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      {icon && <span className={cx('mt-0.5', selected ? 'text-electric' : 'text-slate-400')}>{icon}</span>}
      <span>
        <span className="block font-semibold text-navy">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-500">{description}</span>}
      </span>
    </button>
  );
}

// ---------------- Toasts ----------------
type ToastT = { id: number; text: ReactNode; tone: 'success' | 'info' | 'error' };
const ToastCtx = createContext<(text: ReactNode, tone?: ToastT['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastT[]>([]);
  const push = useCallback((text: ReactNode, tone: ToastT['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg',
              t.tone === 'success' ? 'bg-teal-700' : t.tone === 'error' ? 'bg-rose-600' : 'bg-navy',
            )}
          >
            {t.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : t.tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function Logo({ light, compact }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill={light ? '#ffffff' : '#092348'} />
        <circle cx="16" cy="16" r="6" fill="#F1B650" />
        <path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke="#12B8A6" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className={cx('text-lg font-bold tracking-tight', light ? 'text-white' : 'text-navy')}>
          JioUrja <span className="text-teal">2.0</span>
        </span>
      )}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
