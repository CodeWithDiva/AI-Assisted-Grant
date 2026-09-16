import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import {
  Badge,
  Button,
  EmptyState,
  LimitBar,
  PageHeader,
  Row,
  RowList,
  Spinner,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { proposalsApi } from './api';
import { statusLabels, statusTones } from './status';

export function ProposalsPage() {
  const { activeOrg, isLoading } = useOrgs();
  const navigate = useNavigate();
  const orgId = activeOrg?.id ?? '';

  const proposals = useQuery({
    queryKey: ['proposals', orgId],
    queryFn: () => proposalsApi.list(orgId),
    enabled: Boolean(orgId),
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Applications"
        title="Proposals"
        description="Each proposal follows one funder's format, section by section."
        actions={
          <Button variant="primary" onClick={() => navigate('/proposals/new')}>
            New proposal
          </Button>
        }
      />

      <div className="mt-6">
        {proposals.isPending ? (
          <Spinner label="Loading proposals" />
        ) : proposals.data?.length ? (
          <RowList>
            {proposals.data.map((proposal) => (
              <Row key={proposal.id}>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/proposals/${proposal.id}`}
                    className="font-display text-[17px] text-ink-900 hover:underline"
                  >
                    {proposal.title}
                  </Link>
                  <div className="mt-1 truncate text-[12.5px] text-ink-400">
                    {proposal.funderName ? `${proposal.funderName} · ` : ''}
                    {proposal.templateName ?? 'No template'}
                    {proposal.nextDeadline
                      ? ` · due ${new Date(proposal.nextDeadline).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}`
                      : ''}
                  </div>
                </div>

                <div className="hidden w-36 sm:block">
                  <div className="tabular mb-1 text-right font-mono text-[11.5px] text-ink-400">
                    {proposal.completedSections}/{proposal.sectionCount}
                  </div>
                  <LimitBar used={proposal.completedSections} limit={proposal.sectionCount || 1} />
                </div>

                <Badge tone={statusTones[proposal.status]}>{statusLabels[proposal.status]}</Badge>
              </Row>
            ))}
          </RowList>
        ) : (
          <EmptyState
            title="No proposals yet"
            action={
              <Button variant="primary" onClick={() => navigate('/proposals/new')}>
                Start a proposal
              </Button>
            }
          >
            Choose a funder template and the sections, limits and criteria come with it.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
