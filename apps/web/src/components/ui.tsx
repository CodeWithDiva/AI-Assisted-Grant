import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/* ---------------------------------------------------------------- buttons */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-600 text-white border border-accent-700 hover:bg-accent-700 disabled:hover:bg-accent-600',
  secondary: 'bg-surface text-ink-800 border border-line-strong hover:bg-paper-dark',
  ghost: 'bg-transparent text-ink-600 border border-transparent hover:bg-paper-dark',
  danger: 'bg-surface text-flag-red border border-line-strong hover:bg-flag-red-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-[13.5px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    />
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
  return (
    <div className={`rounded-lg border border-line bg-surface ${padded ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="font-display text-[27px] leading-tight text-ink-900">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
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

/** A list of rows sharing hairline dividers — used for every list in the app. */
export function RowList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <ul
      className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${className}`}
    >
      {children}
    </ul>
  );
}

export function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <li className={`flex items-center gap-4 px-4 py-3.5 hover:bg-paper ${className}`}>
      {children}
    </li>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper-dark/60 px-5 py-8 text-center">
      <p className="font-display text-[18px] text-ink-800">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-md text-ink-600">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ status */

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

const tones: Record<Tone, string> = {
  neutral: 'bg-paper-dark text-ink-600',
  green: 'bg-flag-green-soft text-flag-green',
  amber: 'bg-flag-amber-soft text-flag-amber',
  red: 'bg-flag-red-soft text-flag-red',
  blue: 'bg-flag-blue-soft text-flag-blue',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 font-mono text-[11px] tracking-wide uppercase ${tones[tone]}`}
    >
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
  return <p className="text-ink-400">{label}…</p>;
}

/* ------------------------------------------------------------------- forms */

const control =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-accent-600 focus:outline-none disabled:bg-paper-dark';

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[12.5px] font-medium text-ink-600">{children}</span>;
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
      <input {...props} className={control} />
      {hint ? <span className="mt-1 block text-[12.5px] text-ink-400">{hint}</span> : null}
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
      <textarea {...props} className={`${control} resize-y`} />
      {hint ? <span className="mt-1 block text-[12.5px] text-ink-400">{hint}</span> : null}
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
      <select {...props} className={control}>
        {children}
      </select>
    </label>
  );
}

/* -------------------------------------------------------------- data bits */

export function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1.5 font-display text-[30px] leading-none text-ink-900">
        {value}
      </div>
      {note ? <div className="mt-1.5 text-[12.5px] text-ink-400">{note}</div> : null}
    </div>
  );
}

/** Thin bar showing how much of a funder's word limit is used. */
export function LimitBar({ used, limit }: { used: number; limit: number }) {
  const ratio = Math.min(used / limit, 1);
  const over = used > limit;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-paper-dark">
      <div
        className={`h-full ${over ? 'bg-flag-red' : ratio > 0.85 ? 'bg-flag-amber' : 'bg-accent-600'}`}
        style={{ width: `${Math.max(ratio * 100, 2)}%` }}
      />
    </div>
  );
}
