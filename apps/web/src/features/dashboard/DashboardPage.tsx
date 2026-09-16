import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  Badge,
  EmptyState,
  PageHeader,
  Row,
  RowList,
  SectionLabel,
  Spinner,
  StatTile,
} from '../../components/ui';
import { deadlinesApi } from '../deadlines/api';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { proposalsApi } from '../proposals/api';
import { statusLabels, statusTones } from '../proposals/status';

export function DashboardPage() {
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';

  const proposals = useQuery({
    queryKey: ['proposals', orgId],
    queryFn: () => proposalsApi.list(orgId),
    enabled: Boolean(orgId),
  });

  const deadlines = useQuery({
    queryKey: ['deadlines', orgId],
    queryFn: () => deadlinesApi.list(orgId),
    enabled: Boolean(orgId),
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const all = proposals.data ?? [];
  const inProgress = all.filter((p) => p.status === 'DRAFT' || p.status === 'IN_REVIEW');
  const submitted = all.filter((p) => p.status === 'SUBMITTED');
  const awarded = all.filter((p) => p.status === 'AWARDED');
  const open = (deadlines.data ?? []).filter((deadline) => !deadline.completedAt);
  const dueSoon = open.filter((deadline) => deadline.daysRemaining <= 7);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Overview"
        title={activeOrg.name}
        description="What is being written, and what is due next."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="In progress" value={inProgress.length} note="Drafts and reviews" />
        <StatTile label="Submitted" value={submitted.length} note="Awaiting a decision" />
        <StatTile label="Awarded" value={awarded.length} note="Funding won" />
        <StatTile
          label="Due within 7 days"
          value={dueSoon.length}
          note={dueSoon.length ? 'Needs attention' : 'Nothing urgent'}
        />
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <SectionLabel>Next deadlines</SectionLabel>
            <Link to="/deadlines" className="text-[13px] text-accent-600 hover:underline">
              All deadlines
            </Link>
          </div>
          {open.length ? (
            <RowList>
              {open.slice(0, 5).map((deadline) => (
                <Row key={deadline.id}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] text-ink-900">{deadline.title}</div>
                    <div className="tabular mt-0.5 text-[12.5px] text-ink-400">
                      {new Date(deadline.dueAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {deadline.proposalTitle ? ` · ${deadline.proposalTitle}` : ''}
                    </div>
                  </div>
                  <Badge
                    tone={
                      deadline.daysRemaining < 0
                        ? 'red'
                        : deadline.daysRemaining <= 7
                          ? 'amber'
                          : 'neutral'
                    }
                  >
                    {deadline.daysRemaining < 0
                      ? `${Math.abs(deadline.daysRemaining)}d late`
                      : deadline.daysRemaining === 0
                        ? 'today'
                        : `${deadline.daysRemaining}d left`}
                  </Badge>
                </Row>
              ))}
            </RowList>
          ) : (
            <EmptyState title="Nothing scheduled">
              Add the funder&apos;s submission date and reminders will follow.
            </EmptyState>
          )}
        </section>

        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <SectionLabel>Recent proposals</SectionLabel>
            <Link to="/proposals" className="text-[13px] text-accent-600 hover:underline">
              All proposals
            </Link>
          </div>
          {all.length ? (
            <RowList>
              {all.slice(0, 5).map((proposal) => (
                <Row key={proposal.id}>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/proposals/${proposal.id}`}
                      className="block truncate text-[14.5px] text-ink-900 hover:underline"
                    >
                      {proposal.title}
                    </Link>
                    <div className="tabular mt-0.5 text-[12.5px] text-ink-400">
                      {proposal.completedSections} of {proposal.sectionCount} sections written
                    </div>
                  </div>
                  <Badge tone={statusTones[proposal.status]}>{statusLabels[proposal.status]}</Badge>
                </Row>
              ))}
            </RowList>
          ) : (
            <EmptyState
              title="No proposals yet"
              action={
                <Link
                  to="/templates"
                  className="text-[13.5px] font-medium text-accent-600 hover:underline"
                >
                  Start from a funder template →
                </Link>
              }
            >
              Pick the funder&apos;s format first; the proposal is built from it.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
