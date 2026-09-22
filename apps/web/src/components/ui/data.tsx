/** Small data displays and formatters. */
import { type ReactNode } from 'react';

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
