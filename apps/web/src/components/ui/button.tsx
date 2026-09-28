/** Buttons. */
import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes } from 'react';

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
