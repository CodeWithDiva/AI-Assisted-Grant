/** Page and card structure. */
import type { LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

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
