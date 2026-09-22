/** Status and feedback: badges, alerts, loading states. */
import { type ReactNode } from 'react';

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

/** Grey placeholder shapes shown while a page's data loads, in the page's own layout. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-paper-dark ${className}`} />;
}
