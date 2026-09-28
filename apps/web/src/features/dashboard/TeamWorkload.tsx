import type { MemberView, ProposalSummary } from '@grant/shared';
import { UserRound, Users } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardHeader, formatMoney, relativeDays } from '../../components/ui';

/** Proposals still being written; finished ones are nobody's workload. */
const isOpen = (proposal: ProposalSummary) =>
  proposal.status === 'DRAFT' || proposal.status === 'IN_REVIEW';

interface Row {
  key: string;
  name: string;
  proposals: number;
  openNotes: number;
  amount: number;
  nextDeadline: string | null;
}

/** What each member is carrying: for the person who has to balance the work. */
export function TeamWorkload({
  proposals,
  members,
}: {
  proposals: ProposalSummary[];
  members: MemberView[];
}) {
  const open = proposals.filter(isOpen);
  const currency = proposals.find((proposal) => proposal.currency)?.currency ?? 'USD';

  const rowFor = (key: string, name: string, mine: ProposalSummary[]): Row => ({
    key,
    name,
    proposals: mine.length,
    openNotes: mine.reduce((total, proposal) => total + proposal.openComments, 0),
    amount: mine.reduce((total, proposal) => total + (proposal.requestedAmount ?? 0), 0),
    nextDeadline:
      mine
        .map((proposal) => proposal.nextDeadline)
        .filter((date): date is string => Boolean(date))
        .sort()[0] ?? null,
  });

  const rows: Row[] = [
    ...members.map((member) =>
      rowFor(
        member.user.id,
        member.user.name,
        open.filter((proposal) => proposal.ownerId === member.user.id),
      ),
    ),
    rowFor(
      'unassigned',
      'Unassigned',
      open.filter((proposal) => !proposal.ownerId),
    ),
  ]
    .filter((row) => row.proposals > 0 || row.key !== 'unassigned')
    .sort((a, b) => b.proposals - a.proposals);

  const busiest = Math.max(1, ...rows.map((row) => row.proposals));

  return (
    <Card padded={false}>
      <CardHeader
        title="Who is writing what"
        icon={Users}
        action={
          <Link to="/proposals" className="text-[13px] text-accent-600 hover:underline">
            All proposals
          </Link>
        }
      />
      {open.length ? (
        <ul className="divide-y divide-line">
          {rows.map((row) => {
            const days = row.nextDeadline
              ? Math.round((new Date(row.nextDeadline).getTime() - Date.now()) / 864e5)
              : null;
            return (
              <li key={row.key} className="flex items-center gap-3.5 px-5 py-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                    row.key === 'unassigned'
                      ? 'bg-brass-soft text-[#7a5a1f]'
                      : 'bg-paper-dark text-ink-600'
                  }`}
                >
                  {row.key === 'unassigned' ? (
                    <UserRound className="size-4" strokeWidth={1.8} />
                  ) : (
                    row.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('')
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] text-ink-900">{row.name}</div>
                  <div className="tabular mt-1 flex items-center gap-2 font-mono text-[11.5px] text-ink-400">
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-dark">
                      <span
                        className="block h-full rounded-full bg-accent-500"
                        style={{ width: `${(row.proposals / busiest) * 100}%` }}
                      />
                    </span>
                    {row.proposals} open
                    {row.openNotes
                      ? ` · ${row.openNotes} note${row.openNotes === 1 ? '' : 's'}`
                      : ''}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="tabular text-[13px] text-ink-800">
                    {row.amount ? formatMoney(row.amount, currency) : '—'}
                  </div>
                  <div
                    className={`text-[11.5px] ${
                      days !== null && days < 0
                        ? 'text-flag-red'
                        : days !== null && days <= 7
                          ? 'text-flag-amber'
                          : 'text-ink-400'
                    }`}
                  >
                    {days !== null ? relativeDays(days) : 'no deadline'}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-6 text-center text-[13px] text-ink-600">
          Nothing is being written at the moment.
        </p>
      )}
    </Card>
  );
}
