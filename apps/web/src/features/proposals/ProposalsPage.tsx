import type { ProposalStatus, ProposalSummary } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, FileText, MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  formatMoney,
  LimitBar,
  PageTitle,
  relativeDays,
  Skeleton,
  Spinner,
  Tabs,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { proposalsApi } from './api';
import { statusLabels, statusTones } from './status';

/** Same rule as the API: whole calendar days (UTC), so the table and deadlines page agree. */
function calendarDaysUntil(due: Date): number {
  const now = new Date();
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dueDay - today) / 864e5);
}

type Filter = 'ALL' | ProposalStatus;

const isWritable = (status: ProposalStatus) => status === 'DRAFT' || status === 'IN_REVIEW';

function deadlineTone(days: number): string {
  return days < 0 ? 'text-flag-red' : days <= 7 ? 'text-flag-amber' : 'text-ink-400';
}

function formatDue(due: Date): string {
  return due.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Review state beside the title: open notes to deal with, or an owner's sign-off. */
function ReviewMarks({ proposal }: { proposal: ProposalSummary }) {
  if (!proposal.openComments && !proposal.approvedAt) return null;
  return (
    <span className="mt-1 flex items-center gap-3 text-[12px]">
      {proposal.openComments ? (
        <span className="tabular flex items-center gap-1 text-flag-amber">
          <MessageSquare className="size-3.5" strokeWidth={1.8} />
          {proposal.openComments} open note{proposal.openComments === 1 ? '' : 's'}
        </span>
      ) : null}
      {proposal.approvedAt ? (
        <span className="flex items-center gap-1 text-accent-700">
          <BadgeCheck className="size-3.5" strokeWidth={1.8} />
          Approved
        </span>
      ) : null}
    </span>
  );
}

/** Where a proposal stands: section progress while it is being written, otherwise its outcome. */
function ProgressCell({ proposal }: { proposal: ProposalSummary }) {
  if (isWritable(proposal.status)) {
    return (
      <>
        <div className="tabular mb-1.5 text-[12px] text-ink-600">
          {proposal.completedSections} of {proposal.sectionCount} sections
        </div>
        <LimitBar used={proposal.completedSections} limit={proposal.sectionCount} />
      </>
    );
  }
  return (
    <span className="text-[12.5px] text-ink-400">
      {proposal.status === 'SUBMITTED' ? 'Sent to funder' : 'Decision received'}
    </span>
  );
}

export function ProposalsPage() {
  const { activeOrg, isLoading } = useOrgs();
  const navigate = useNavigate();
  const orgId = activeOrg?.id ?? '';
  const [filter, setFilter] = useState<Filter>('ALL');

  const proposals = useQuery({
    queryKey: ['proposals', orgId],
    queryFn: () => proposalsApi.list(orgId),
    enabled: Boolean(orgId),
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const all = proposals.data ?? [];
  const visible = filter === 'ALL' ? all : all.filter((proposal) => proposal.status === filter);
  const count = (status: ProposalStatus) => all.filter((p) => p.status === status).length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Proposals"
        description="Every application you are writing or have sent, with its funder and deadline."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => navigate('/proposals/new')}>
            New proposal
          </Button>
        }
      />

      <Card padded={false}>
        <div className="px-5 pt-3">
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'ALL', label: 'All', count: all.length },
              { value: 'DRAFT', label: 'Draft', count: count('DRAFT') },
              { value: 'IN_REVIEW', label: 'In review', count: count('IN_REVIEW') },
              { value: 'SUBMITTED', label: 'Submitted', count: count('SUBMITTED') },
              { value: 'AWARDED', label: 'Awarded', count: count('AWARDED') },
              { value: 'REJECTED', label: 'Rejected', count: count('REJECTED') },
            ]}
          />
        </div>

        {proposals.isPending ? (
          <div className="divide-y divide-line border-t border-line">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-6 px-5 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="hidden h-3 w-32 md:block" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : visible.length ? (
          <>
            {/* Phones: one card per proposal instead of a table that would scroll sideways. */}
            <ul className="divide-y divide-line border-t border-line md:hidden">
              {visible.map((proposal) => {
                const due = proposal.nextDeadline ? new Date(proposal.nextDeadline) : null;
                const daysLeft = due ? calendarDaysUntil(due) : null;
                return (
                  <li key={proposal.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      className="w-full px-5 py-4 text-left hover:bg-paper"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-display text-[16px] leading-snug text-ink-900">
                            {proposal.title}
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] text-ink-400">
                            {proposal.funderName ?? proposal.templateName ?? 'No template'}
                          </div>
                          <ReviewMarks proposal={proposal} />
                        </div>
                        <Badge tone={statusTones[proposal.status]}>
                          {statusLabels[proposal.status]}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <ProgressCell proposal={proposal} />
                      </div>
                      <div className="tabular mt-3 flex items-center justify-between text-[12.5px]">
                        <span className="text-ink-800">
                          {formatMoney(proposal.requestedAmount, proposal.currency)}
                        </span>
                        {due && daysLeft !== null ? (
                          <span className={deadlineTone(daysLeft)}>
                            {formatDue(due)} · {relativeDays(daysLeft)}
                          </span>
                        ) : (
                          <span className="text-ink-300">No deadline</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-400">
                    <th className="px-5 py-3 font-medium">Proposal</th>
                    <th className="px-3 py-3 font-medium">Progress</th>
                    <th className="px-3 py-3 text-right font-medium">Requested</th>
                    <th className="px-3 py-3 font-medium">Next deadline</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((proposal) => {
                    const due = proposal.nextDeadline ? new Date(proposal.nextDeadline) : null;
                    const daysLeft = due ? calendarDaysUntil(due) : null;
                    return (
                      <tr
                        key={proposal.id}
                        onClick={() => navigate(`/proposals/${proposal.id}`)}
                        className="cursor-pointer hover:bg-paper"
                      >
                        <td className="max-w-[320px] px-5 py-3.5">
                          <div className="truncate font-display text-[16px] text-ink-900">
                            {proposal.title}
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] text-ink-400">
                            {[proposal.funderName, proposal.templateName]
                              .filter(Boolean)
                              .join(' · ') || 'No template'}
                          </div>
                          <ReviewMarks proposal={proposal} />
                        </td>
                        <td className="w-44 px-3 py-3.5">
                          <ProgressCell proposal={proposal} />
                        </td>
                        <td className="tabular px-3 py-3.5 text-right text-[14px] text-ink-800">
                          {formatMoney(proposal.requestedAmount, proposal.currency)}
                        </td>
                        <td className="px-3 py-3.5 text-[13.5px]">
                          {due && daysLeft !== null ? (
                            <>
                              <div className="text-ink-800">{formatDue(due)}</div>
                              <div className={`text-[12px] ${deadlineTone(daysLeft)}`}>
                                {relativeDays(daysLeft)}
                              </div>
                            </>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={statusTones[proposal.status]}>
                            {statusLabels[proposal.status]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title={
              filter === 'ALL'
                ? 'No proposals yet'
                : `Nothing ${statusLabels[filter as ProposalStatus].toLowerCase()}`
            }
            action={
              filter === 'ALL' ? (
                <Button variant="primary" icon={Plus} onClick={() => navigate('/proposals/new')}>
                  Start a proposal
                </Button>
              ) : undefined
            }
          >
            {filter === 'ALL'
              ? 'Pick a funder template and the sections, word limits and criteria come with it.'
              : 'Proposals move here when you change their status.'}
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
