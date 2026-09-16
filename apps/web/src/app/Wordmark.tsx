/** The product mark: a small filled square, then the name set in the display serif. */
export function Wordmark({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
  const text = tone === 'light' ? 'text-white' : 'text-ink-900';
  const mark = tone === 'light' ? 'bg-white' : 'bg-accent-600';

  return (
    <div className="flex items-center gap-2.5">
      <span className={`block size-3.5 rotate-45 rounded-[2px] ${mark}`} aria-hidden />
      <span className={`font-display text-[19px] leading-none tracking-tight ${text}`}>
        GrantPilot
      </span>
    </div>
  );
}
