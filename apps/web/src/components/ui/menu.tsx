/** Dropdown menu. */
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected?: boolean;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

/** A small dropdown menu. `trigger` receives the open state so it can style itself. */
/** Shared by Menu and Popover: closes on an outside click or Escape. */
function useDismissable(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onEscape = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, close]);

  return ref;
}

/** A panel hung under a trigger, for content richer than a list of menu items. */
export function Popover({
  trigger,
  children,
  align = 'left',
  width = 'w-80',
  label,
}: {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissable(open, close);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((value) => !value)}>{trigger(open)}</div>
      {open ? (
        <div
          aria-label={label}
          className={`absolute z-40 mt-1.5 animate-rise overflow-hidden rounded-lg border border-line bg-surface shadow-pop ${width} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

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
