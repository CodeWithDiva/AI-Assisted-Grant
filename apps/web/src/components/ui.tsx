import type { LucideIcon } from 'lucide-react';
import { Check, ChevronDown } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/* ---------------------------------------------------------------- buttons */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-600 text-white border border-accent-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-accent-700',
  secondary: 'bg-surface text-ink-800 border border-line-strong shadow-card hover:bg-paper',
  ghost:
    'bg-transparent text-ink-600 border border-transparent hover:bg-paper-dark hover:text-ink-900',
  danger: 'bg-surface text-flag-red border border-line-strong hover:bg-flag-red-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[13.5px] gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon ? <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  tone = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper-dark disabled:opacity-40 ${
        tone === 'danger' ? 'hover:text-flag-red' : 'hover:text-ink-900'
      } ${className}`}
    >
      <Icon className="size-4" strokeWidth={1.8} />
    </button>
  );
}

/* ------------------------------------------------------------------ layout */

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={`card ${padded ? 'p-5' : ''} ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  icon: Icon,
  action,
  className = '',
}: {
  title: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 ${className}`}
    >
      <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900">
        {Icon ? <Icon className="size-4 text-ink-400" strokeWidth={1.8} /> : null}
        {title}
      </div>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-ink-900">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionLabel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? 'px-5 py-8' : 'px-6 py-14'}`}>
      {Icon ? (
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-paper-dark text-ink-400">
          <Icon className="size-5" strokeWidth={1.6} />
        </div>
      ) : null}
      <p className="font-display text-[19px] text-ink-900">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-sm text-ink-600">{children}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ status */

export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'brass';

const tones: Record<Tone, string> = {
  neutral: 'bg-paper-dark text-ink-600',
  green: 'bg-flag-green-soft text-flag-green',
  amber: 'bg-flag-amber-soft text-flag-amber',
  red: 'bg-flag-red-soft text-flag-red',
  blue: 'bg-flag-blue-soft text-flag-blue',
  brass: 'bg-brass-soft text-[#7a5a1f]',
};

const dots: Record<Tone, string> = {
  neutral: 'bg-ink-300',
  green: 'bg-flag-green',
  amber: 'bg-flag-amber',
  red: 'bg-flag-red',
  blue: 'bg-flag-blue',
  brass: 'bg-brass',
};

/** Status pill: a coloured dot and a sentence-case label. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${tones[tone]}`}
    >
      <span className={`size-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}

export function Alert({ tone = 'red', children }: { tone?: Tone; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className={`rounded-md px-3.5 py-2.5 text-[13.5px] ${tones[tone]}`} role="alert">
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-6 text-ink-400">
      <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent-600" />
      {label}…
    </div>
  );
}

/* ------------------------------------------------------------------- forms */

export const controlClass =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink-900 shadow-[inset_0_1px_1px_rgb(21_23_27/0.03)] placeholder:text-ink-300 focus:border-accent-500 focus:ring-3 focus:ring-accent-100 focus:outline-none disabled:bg-paper-dark';

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-ink-800">{children}</span>;
}

export function Field({
  label,
  hint,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <Label>{label}</Label>
      <input {...props} className={controlClass} />
      {hint ? <span className="mt-1.5 block text-[12.5px] text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      {label ? <Label>{label}</Label> : null}
      <textarea {...props} className={`${controlClass} resize-y leading-relaxed`} />
      {hint ? <span className="mt-1.5 block text-[12.5px] text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={`block ${className}`}>
      {label ? <Label>{label}</Label> : null}
      <span className="relative block">
        <select {...props} className={`${controlClass} appearance-none pr-9`}>
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
          strokeWidth={1.8}
        />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------ menu/popover */

export interface MenuItem {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected?: boolean;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

/** A small dropdown menu. `trigger` receives the open state so it can style itself. */
export function Menu({
  trigger,
  items,
  align = 'left',
  width = 'w-60',
  footer,
}: {
  trigger: (open: boolean) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  width?: string;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((value) => !value)}>{trigger(open)}</div>
      {open ? (
        <div
          role="menu"
          className={`absolute z-40 mt-1.5 animate-rise overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-pop ${width} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-paper ${
                item.tone === 'danger' ? 'text-flag-red' : 'text-ink-800'
              }`}
            >
              {item.icon ? (
                <item.icon className="mt-0.5 size-4 shrink-0 text-ink-400" strokeWidth={1.8} />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px]">{item.label}</span>
                {item.description ? (
                  <span className="block text-[12px] text-ink-400">{item.description}</span>
                ) : null}
              </span>
              {item.selected ? (
                <Check className="mt-0.5 size-4 shrink-0 text-accent-600" strokeWidth={2} />
              ) : null}
            </button>
          ))}
          {footer ? <div className="mt-1 border-t border-line pt-1">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ navigation */

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 pt-1 pb-2.5 text-[13.5px] whitespace-nowrap transition-colors ${
              active
                ? 'border-accent-600 font-medium text-ink-900'
                : 'border-transparent text-ink-400 hover:text-ink-800'
            }`}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={`tabular rounded-full px-1.5 py-px font-mono text-[11px] ${
                  active ? 'bg-accent-50 text-accent-700' : 'bg-paper-dark text-ink-400'
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- data bits */

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const palette = ['bg-accent-600', 'bg-[#7a5a1f]', 'bg-flag-blue', 'bg-[#6b3a52]', 'bg-ink-800'];
  const color =
    palette[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
  const dimensions = {
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-[11.5px]',
    lg: 'size-10 text-[13px]',
  }[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${color} ${dimensions}`}
    >
      {initials || '?'}
    </span>
  );
}

/** Thin bar showing how much of a limit (words, sections) is used. */
export function LimitBar({ used, limit }: { used: number; limit: number }) {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  const over = used > limit;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-dark">
      <div
        className={`h-full rounded-full transition-[width] ${
          over
            ? 'bg-flag-red'
            : ratio >= 1
              ? 'bg-accent-600'
              : ratio > 0.85
                ? 'bg-brass'
                : 'bg-accent-500'
        }`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-paper-dark)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent-600)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      {label !== undefined ? (
        <span className="tabular absolute font-mono text-[11px] text-ink-800">{label}</span>
      ) : null}
    </span>
  );
}

/** Calendar-page style date: month on top, day number large. */
export function DateTile({
  date,
  tone = 'neutral',
}: {
  date: Date;
  tone?: 'neutral' | 'red' | 'amber';
}) {
  const head = { neutral: 'bg-ink-800', red: 'bg-flag-red', amber: 'bg-brass' }[tone];
  return (
    <span className="flex w-11 shrink-0 flex-col overflow-hidden rounded-md border border-line bg-surface text-center shadow-card">
      <span
        className={`py-0.5 font-mono text-[9.5px] font-medium tracking-wider text-white uppercase ${head}`}
      >
        {date.toLocaleDateString(undefined, { month: 'short' })}
      </span>
      <span className="tabular py-0.5 text-[17px] leading-tight font-semibold text-ink-900">
        {date.getDate()}
      </span>
    </span>
  );
}

export function formatMoney(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function relativeDays(days: number): string {
  if (days < -1) return `${Math.abs(days)} days late`;
  if (days === -1) return '1 day late';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `${days} days left`;
}
