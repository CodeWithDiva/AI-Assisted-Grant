/** Tabs. */

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
