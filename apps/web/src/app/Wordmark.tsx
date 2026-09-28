/**
 * The product mark: a compass needle — north in brass, south in white — on a rounded badge,
 * the same drawing as the favicon. On the dark shell the badge lightens instead of filling.
 */
export function Wordmark({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
  const light = tone === 'light';

  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-[26px] shrink-0" aria-hidden focusable="false">
        <rect width="32" height="32" rx="7" fill={light ? '#26473b' : '#11261f'} />
        <path d="M16 5 20 16 12 16Z" fill="#c79a45" />
        <path d="M16 27 20 16 12 16Z" fill="#ffffff" />
      </svg>
      <span
        className={`font-display text-[19px] leading-none tracking-tight ${
          light ? 'text-white' : 'text-ink-900'
        }`}
      >
        GrantPilot
      </span>
    </div>
  );
}
