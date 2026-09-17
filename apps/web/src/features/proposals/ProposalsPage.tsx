import type { ProposalStatus } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
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
          <div className="px-5">
            <Spinner label="Loading proposals" />
          </div>
        ) : visible.length ? (
          <div className="overflow-x-auto">
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
                      </td>
                      <td className="w-44 px-3 py-3.5">
                        {proposal.status === 'DRAFT' || proposal.status === 'IN_REVIEW' ? (
                          <>
                            <div className="tabular mb-1.5 text-[12px] text-ink-600">
                              {proposal.completedSections} of {proposal.sectionCount} sections
                            </div>
                            <LimitBar
                              used={proposal.completedSections}
                              limit={proposal.sectionCount}
                            />
                          </>
                        ) : (
                          <span className="text-[12.5px] text-ink-400">
                            {proposal.status === 'SUBMITTED'
                              ? 'Sent to funder'
                              : 'Decision received'}
                          </span>
                        )}
                      </td>
                      <td className="tabular px-3 py-3.5 text-right text-[14px] text-ink-800">
                        {formatMoney(proposal.requestedAmount, proposal.currency)}
                      </td>
                      <td className="px-3 py-3.5 text-[13.5px]">
                        {due ? (
                          <>
                            <div className="text-ink-800">
                              {due.toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div
                              className={`text-[12px] ${
                                daysLeft! < 0
                                  ? 'text-flag-red'
                                  : daysLeft! <= 7
                                    ? 'text-flag-amber'
                                    : 'text-ink-400'
                              }`}
                            >
                              {daysLeft! < 0
                                ? `${Math.abs(daysLeft!)} days late`
                                : `in ${daysLeft} days`}
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
