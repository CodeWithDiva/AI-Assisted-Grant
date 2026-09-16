import type { DeadlineView, ProposalStatus, ProposalSummary } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  FileText,
  PenLine,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  Badge,
  Card,
  CardHeader,
  DateTile,
  EmptyState,
  formatMoney,
  ProgressRing,
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

const PIPELINE: { status: ProposalStatus; bar: string }[] = [
  { status: 'DRAFT', bar: 'bg-ink-300' },
  { status: 'IN_REVIEW', bar: 'bg-brass' },
  { status: 'SUBMITTED', bar: 'bg-flag-blue' },
  { status: 'AWARDED', bar: 'bg-accent-600' },
  { status: 'REJECTED', bar: 'bg-flag-red/70' },
];

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
  if (proposals.isPending || deadlines.isPending) return <Spinner label="Loading your workspace" />;

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

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
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

      <div className="grid gap-5 lg:grid-cols-2">
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
                    <ProgressRing
                      value={
                        proposal.sectionCount
                          ? proposal.completedSections / proposal.sectionCount
                          : 0
                      }
                      size={40}
                      label={`${proposal.completedSections}/${proposal.sectionCount}`}
                    />
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

/** The single most useful thing to do next: the draft with the nearest deadline. */
function FocusCard({
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
                ? 'days overdue'
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

function PipelineCard({ proposals }: { proposals: ProposalSummary[] }) {
  const total = proposals.length;
  const currency = proposals.find((p) => p.currency)?.currency ?? 'USD';

  const rows = PIPELINE.map((stage) => {
    const items = proposals.filter((p) => p.status === stage.status);
    return {
      ...stage,
      count: items.length,
      amount: items.reduce((sum, p) => sum + (p.requestedAmount ?? 0), 0),
    };
  });

  return (
    <Card padded={false}>
      <CardHeader
        title="Pipeline"
        icon={TrendingUp}
        action={
          <span className="text-[13px] text-ink-400">
            {total} proposal{total === 1 ? '' : 's'}
          </span>
        }
      />
      <div className="px-5 py-5">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-paper-dark">
          {total
            ? rows
                .filter((row) => row.count)
                .map((row) => (
                  <div
                    key={row.status}
                    className={row.bar}
                    style={{ width: `${(row.count / total) * 100}%` }}
                    title={`${statusLabels[row.status]}: ${row.count}`}
                  />
                ))
            : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
          {rows.map((row) => (
            <div key={row.status}>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-600">
                <span className={`size-2 rounded-full ${row.bar}`} />
                {statusLabels[row.status]}
              </div>
              <div className="tabular mt-1 text-[22px] leading-tight font-semibold text-ink-900">
                {row.count}
              </div>
              <div className="tabular text-[12.5px] text-ink-400">
                {row.amount ? formatMoney(row.amount, currency) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function FundingCard({ proposals }: { proposals: ProposalSummary[] }) {
  const currency = proposals.find((p) => p.currency)?.currency ?? 'USD';
  const sum = (statuses: ProposalStatus[]) =>
    proposals
      .filter((p) => statuses.includes(p.status))
      .reduce((total, p) => total + (p.requestedAmount ?? 0), 0);
  const decided = proposals.filter((p) => p.status === 'AWARDED' || p.status === 'REJECTED').length;
  const awarded = proposals.filter((p) => p.status === 'AWARDED').length;

  return (
    <Card>
      <div className="eyebrow">Funding</div>
      <div className="mt-4 space-y-4">
        <div>
          <div className="text-[12.5px] text-ink-400">Awarded</div>
          <div className="tabular text-[26px] font-semibold text-accent-700">
            {formatMoney(sum(['AWARDED']), currency)}
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-ink-400">Requested and still open</div>
          <div className="tabular text-[20px] font-semibold text-ink-900">
            {formatMoney(sum(['DRAFT', 'IN_REVIEW', 'SUBMITTED']), currency)}
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-ink-400">Success rate</div>
          <div className="tabular text-[20px] font-semibold text-ink-900">
            {decided ? `${Math.round((awarded / decided) * 100)}%` : '—'}
          </div>
        </div>
      </div>
    </Card>
  );
}
