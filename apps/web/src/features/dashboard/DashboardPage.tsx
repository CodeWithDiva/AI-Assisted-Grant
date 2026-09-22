import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CheckCircle2, Circle, FileText } from 'lucide-react';
import { Link } from 'react-router';
import {
  Badge,
  Card,
  CardHeader,
  DateTile,
  EmptyState,
  relativeDays,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { deadlinesApi } from '../deadlines/api';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { profileApi } from '../profile/api';
import { proposalsApi } from '../proposals/api';
import { statusLabels, statusTones } from '../proposals/status';
import { teamApi } from '../team/api';
import { templatesApi } from '../templates/api';
import { FocusCard } from './FocusCard';
import { PipelineCard, FundingCard } from './PipelineCard';
import { StatusMark } from './StatusMark';
import { DashboardSkeleton } from './DashboardSkeleton';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { user } = useAuth();
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  const enabled = Boolean(orgId);

  const proposals = useQuery({
    queryKey: ['proposals', orgId],
    queryFn: () => proposalsApi.list(orgId),
    enabled,
  });
  const deadlines = useQuery({
    queryKey: ['deadlines', orgId],
    queryFn: () => deadlinesApi.list(orgId),
    enabled,
  });
  const profile = useQuery({
    queryKey: ['profile', orgId],
    queryFn: () => profileApi.get(orgId),
    enabled,
  });
  const templates = useQuery({
    queryKey: ['templates', orgId],
    queryFn: () => templatesApi.list(orgId),
    enabled,
  });
  const members = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => teamApi.members(orgId),
    enabled,
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;
  if (proposals.isPending || deadlines.isPending) return <DashboardSkeleton />;

  const allProposals = proposals.data ?? [];
  const openDeadlines = (deadlines.data ?? []).filter((deadline) => !deadline.completedAt);
  const firstName = user?.name.split(' ')[0] ?? '';

  const checklist = [
    {
      label: 'Fill in the organization profile',
      done: Boolean(profile.data?.mission),
      to: '/profile',
    },
    {
      label: 'Add a funder template',
      done: (templates.data ?? []).some((template) => !template.isLibrary),
      to: '/templates',
    },
    { label: 'Start a proposal', done: allProposals.length > 0, to: '/proposals/new' },
    { label: 'Track a deadline', done: (deadlines.data ?? []).length > 0, to: '/deadlines' },
    { label: 'Invite a colleague', done: (members.data ?? []).length > 1, to: '/team' },
  ];
  const setupDone = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[32px] leading-tight tracking-[-0.01em] text-ink-900">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-ink-600">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}{' '}
          · {openDeadlines.filter((deadline) => deadline.daysRemaining <= 7).length} deadline
          {openDeadlines.filter((deadline) => deadline.daysRemaining <= 7).length === 1
            ? ''
            : 's'}{' '}
          this week
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <FocusCard proposals={allProposals} deadlines={openDeadlines} />
        {setupDone < checklist.length ? (
          <Card padded={false}>
            <CardHeader
              title="Set up your workspace"
              action={
                <span className="tabular font-mono text-[12px] text-ink-400">
                  {setupDone}/{checklist.length}
                </span>
              }
            />
            <ul className="px-2 py-2">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-paper"
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-[18px] text-accent-600" strokeWidth={2} />
                    ) : (
                      <Circle className="size-[18px] text-line-strong" strokeWidth={2} />
                    )}
                    <span
                      className={`flex-1 text-[13.5px] ${item.done ? 'text-ink-400' : 'text-ink-800'}`}
                    >
                      {item.label}
                    </span>
                    {!item.done ? (
                      <ArrowRight className="size-4 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <FundingCard proposals={allProposals} />
        )}
      </div>

      <PipelineCard proposals={allProposals} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader
            title="Upcoming deadlines"
            icon={CalendarClock}
            action={
              <Link to="/deadlines" className="text-[13px] text-accent-600 hover:underline">
                View all
              </Link>
            }
          />
          {openDeadlines.length ? (
            <ul className="divide-y divide-line">
              {openDeadlines.slice(0, 4).map((deadline) => (
                <li key={deadline.id} className="flex items-center gap-3.5 px-5 py-3">
                  <DateTile
                    date={new Date(deadline.dueAt)}
                    tone={
                      deadline.daysRemaining < 0
                        ? 'red'
                        : deadline.daysRemaining <= 7
                          ? 'amber'
                          : 'neutral'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-ink-900">{deadline.title}</div>
                    <div className="truncate text-[12.5px] text-ink-400">
                      {deadline.proposalTitle ?? 'Not linked to a proposal'}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[12.5px] font-medium ${
                      deadline.daysRemaining < 0
                        ? 'text-flag-red'
                        : deadline.daysRemaining <= 7
                          ? 'text-flag-amber'
                          : 'text-ink-400'
                    }`}
                  >
                    {relativeDays(deadline.daysRemaining)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={CalendarClock} title="Nothing scheduled">
              Add the funder&apos;s submission date and reminders follow automatically.
            </EmptyState>
          )}
        </Card>

        <Card padded={false}>
          <CardHeader
            title="Recent proposals"
            icon={FileText}
            action={
              <Link to="/proposals" className="text-[13px] text-accent-600 hover:underline">
                View all
              </Link>
            }
          />
          {allProposals.length ? (
            <ul className="divide-y divide-line">
              {allProposals.slice(0, 4).map((proposal) => (
                <li key={proposal.id}>
                  <Link
                    to={`/proposals/${proposal.id}`}
                    className="flex items-center gap-3.5 px-5 py-3 hover:bg-paper"
                  >
                    <StatusMark proposal={proposal} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-ink-900">{proposal.title}</div>
                      <div className="truncate text-[12.5px] text-ink-400">
                        {proposal.funderName ?? proposal.templateName ?? 'No funder'}
                      </div>
                    </div>
                    <Badge tone={statusTones[proposal.status]}>
                      {statusLabels[proposal.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={FileText} title="No proposals yet">
              Start from a funder template — sections and limits come with it.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
