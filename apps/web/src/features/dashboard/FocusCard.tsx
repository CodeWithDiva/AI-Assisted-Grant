import type { DeadlineView, ProposalSummary } from '@grant/shared';
import { PenLine } from 'lucide-react';
import { useNavigate } from 'react-router';
import { formatMoney } from '../../components/ui';

/** The single most useful thing to do next: the draft with the nearest deadline. */
export function FocusCard({
  proposals,
  deadlines,
}: {
  proposals: ProposalSummary[];
  deadlines: DeadlineView[];
}) {
  const navigate = useNavigate();
  const writable = proposals.filter((p) => p.status === 'DRAFT' || p.status === 'IN_REVIEW');

  const urgent = deadlines
    .filter((deadline) => deadline.proposalId && writable.some((p) => p.id === deadline.proposalId))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

  const proposal = urgent
    ? writable.find((p) => p.id === urgent.proposalId)
    : [...writable].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!proposal) {
    return (
      <div className="relative overflow-hidden rounded-[11px] bg-night-900 p-7 text-white">
        <div className="font-mono text-[11px] tracking-[0.1em] text-brass uppercase">Up next</div>
        <p className="mt-3 max-w-md font-display text-[26px] leading-snug">
          Nothing in draft. Start a proposal from a funder&apos;s template.
        </p>
        <button
          type="button"
          onClick={() => navigate('/proposals/new')}
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-[13.5px] font-medium text-night-900 hover:bg-paper"
        >
          <PenLine className="size-4" /> Start a proposal
        </button>
        <FocusTexture />
      </div>
    );
  }

  const progress = proposal.sectionCount ? proposal.completedSections / proposal.sectionCount : 0;

  return (
    <div className="relative overflow-hidden rounded-[11px] bg-night-900 p-7 text-white">
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] tracking-[0.1em] text-brass uppercase">Up next</div>
          <h2 className="mt-2.5 font-display text-[26px] leading-snug">{proposal.title}</h2>
          <p className="mt-1 text-[13.5px] text-white/55">
            {proposal.funderName ?? proposal.templateName ?? 'No funder recorded'}
            {proposal.requestedAmount
              ? ` · ${formatMoney(proposal.requestedAmount, proposal.currency)}`
              : ''}
          </p>
        </div>

        {urgent ? (
          <div className="text-right">
            <div
              className={`tabular font-display text-[46px] leading-none ${
                urgent.daysRemaining < 0
                  ? 'text-[#f08a9a]'
                  : urgent.daysRemaining <= 7
                    ? 'text-brass'
                    : 'text-white'
              }`}
            >
              {Math.abs(urgent.daysRemaining)}
            </div>
            <div className="mt-1 text-[12px] text-white/50">
              {urgent.daysRemaining < 0
                ? urgent.daysRemaining === -1
                  ? 'day overdue'
                  : 'days overdue'
                : urgent.daysRemaining === 1
                  ? 'day left'
                  : 'days left'}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mt-7">
        <div className="mb-2 flex items-baseline justify-between text-[12.5px]">
          <span className="text-white/60">
            {proposal.completedSections} of {proposal.sectionCount} sections written
          </span>
          <span className="tabular font-mono text-white/50">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(`/proposals/${proposal.id}`)}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-[13.5px] font-medium text-night-900 hover:bg-paper"
        >
          <PenLine className="size-4" /> Continue writing
        </button>
        {urgent ? (
          <span className="inline-flex h-9 items-center px-2 text-[13px] text-white/50">
            {urgent.title} ·{' '}
            {new Date(urgent.dueAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        ) : null}
      </div>

      <FocusTexture />
    </div>
  );
}

/** A large, faint section mark in the corner — texture without an image. */
function FocusTexture() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-4 -bottom-20 hidden font-display text-[220px] leading-none text-white/[0.03] sm:block select-none"
    >
      §
    </span>
  );
}
