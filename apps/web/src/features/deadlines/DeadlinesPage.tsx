import { DeadlineType, DEADLINE_TYPE_LABELS, type DeadlineView } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  PageHeader,
  SectionLabel,
  Select,
  Spinner,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { proposalsApi } from '../proposals/api';
import { deadlinesApi } from './api';

export function DeadlinesPage() {
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<DeadlineType>(DeadlineType.FULL_PROPOSAL);
  const [dueAt, setDueAt] = useState('');
  const [proposalId, setProposalId] = useState('');

  const deadlines = useQuery({
    queryKey: ['deadlines', orgId],
    queryFn: () => deadlinesApi.list(orgId),
    enabled: Boolean(orgId),
  });

  const proposals = useQuery({
    queryKey: ['proposals', orgId],
    queryFn: () => proposalsApi.list(orgId),
    enabled: Boolean(orgId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['deadlines', orgId] });

  const create = useMutation({
    mutationFn: () =>
      deadlinesApi.create(orgId, {
        title,
        type,
        dueAt: new Date(`${dueAt}T12:00:00Z`).toISOString(),
        proposalId: proposalId || undefined,
      }),
    onSuccess: async () => {
      setTitle('');
      setDueAt('');
      setProposalId('');
      await refresh();
    },
  });

  const toggle = useMutation({
    mutationFn: (deadline: DeadlineView) =>
      deadlinesApi.update(orgId, deadline.id, { completed: !deadline.completedAt }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (deadlineId: string) => deadlinesApi.remove(orgId, deadlineId),
    onSuccess: refresh,
  });

  const sendReminders = useMutation({ mutationFn: () => deadlinesApi.runReminders(orgId) });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const all = deadlines.data ?? [];
  const open = all.filter((deadline) => !deadline.completedAt);
  const groups = [
    { label: 'Overdue', items: open.filter((d) => d.daysRemaining < 0) },
    {
      label: 'Next 30 days',
      items: open.filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= 30),
    },
    { label: 'Later', items: open.filter((d) => d.daysRemaining > 30) },
    { label: 'Submitted', items: all.filter((d) => d.completedAt) },
  ];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Calendar"
        title="Deadlines"
        description="Reminders go to every owner and editor 14, 7, 3 and 1 day before the date."
      />

      <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-line bg-surface px-5 py-4">
        <SectionLabel className="mb-3">Add a deadline</SectionLabel>
        <Alert>{create.error?.message}</Alert>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <Field
            label="What is due"
            required
            placeholder="Full proposal to the Education Fund"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Field
            label="Date"
            type="date"
            required
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          <Select
            label="Type"
            value={type}
            onChange={(event) => setType(event.target.value as DeadlineType)}
          >
            {Object.values(DeadlineType).map((value) => (
              <option key={value} value={value}>
                {DEADLINE_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
          <Select
            label="Proposal"
            value={proposalId}
            onChange={(event) => setProposalId(event.target.value)}
          >
            <option value="">Not linked</option>
            {(proposals.data ?? []).map((proposal) => (
              <option key={proposal.id} value={proposal.id}>
                {proposal.title}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </form>

      {all.length === 0 && !deadlines.isPending ? (
        <div className="mt-8">
          <EmptyState title="No deadlines tracked yet">
            Add the funder&apos;s submission date above and the reminders take care of themselves.
          </EmptyState>
        </div>
      ) : null}

      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <section key={group.label} className="mt-8">
            <SectionLabel className="mb-2.5">
              {group.label} ({group.items.length})
            </SectionLabel>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {group.items.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-paper"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(deadline.completedAt)}
                    onChange={() => toggle.mutate(deadline)}
                    className="size-4 accent-[var(--color-accent-600)]"
                    aria-label={`Mark ${deadline.title} as submitted`}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[14.5px] ${
                        deadline.completedAt ? 'text-ink-400 line-through' : 'text-ink-900'
                      }`}
                    >
                      {deadline.title}
                    </div>
                    <div className="tabular mt-0.5 truncate text-[12.5px] text-ink-400">
                      {DEADLINE_TYPE_LABELS[deadline.type]} ·{' '}
                      {new Date(deadline.dueAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {deadline.proposalTitle ? ` · ${deadline.proposalTitle}` : ''}
                    </div>
                  </div>

                  {!deadline.completedAt ? (
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
                  ) : null}

                  <a
                    href={deadlinesApi.icsUrl(orgId, deadline.id)}
                    className="shrink-0 text-[13px] text-accent-600 hover:underline"
                  >
                    Calendar
                  </a>
                  <button
                    type="button"
                    onClick={() => remove.mutate(deadline.id)}
                    className="shrink-0 text-[13px] text-ink-400 hover:text-flag-red"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

      <div className="mt-10 flex items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => sendReminders.mutate()}
          disabled={sendReminders.isPending}
          className="text-[13px] text-ink-400 hover:text-ink-900 disabled:opacity-50"
        >
          Send any due reminders now
        </button>
        {sendReminders.data ? (
          <span className="text-[13px] text-ink-600">
            {sendReminders.data.sent} reminder{sendReminders.data.sent === 1 ? '' : 's'} sent.
          </span>
        ) : null}
        {sendReminders.error ? (
          <span className="text-[13px] text-flag-red">{sendReminders.error.message}</span>
        ) : null}
      </div>
    </div>
  );
}
