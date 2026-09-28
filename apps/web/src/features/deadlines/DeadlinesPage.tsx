import { DeadlineType, DEADLINE_TYPE_LABELS, type DeadlineView } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarClock, CalendarPlus, Check, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Button,
  Card,
  DateTile,
  EmptyState,
  Field,
  IconButton,
  PageTitle,
  relativeDays,
  SectionLabel,
  Select,
  Spinner,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { proposalsApi } from '../proposals/api';
import { deadlinesApi } from './api';
import { usePermissions } from '../organizations/permissions';

export function DeadlinesPage() {
  const { activeOrg, isLoading } = useOrgs();
  const { canWrite, isOwner } = usePermissions();
  const orgId = activeOrg?.id ?? '';
  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
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
      setAdding(false);
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
    { label: 'This week', items: open.filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= 7) },
    {
      label: 'Next 30 days',
      items: open.filter((d) => d.daysRemaining > 7 && d.daysRemaining <= 30),
    },
    { label: 'Later', items: open.filter((d) => d.daysRemaining > 30) },
    { label: 'Done', items: all.filter((d) => d.completedAt) },
  ].filter((group) => group.items.length);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Deadlines"
        description="Every owner and editor is emailed 14, 7, 3 and 1 day before each date."
        actions={
          <>
            {isOwner ? (
              <Button
                icon={BellRing}
                onClick={() => sendReminders.mutate()}
                disabled={sendReminders.isPending}
              >
                {sendReminders.data ? `${sendReminders.data.sent} sent` : 'Send due reminders'}
              </Button>
            ) : null}
            {!adding && canWrite ? (
              <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
                Add deadline
              </Button>
            ) : null}
          </>
        }
      />

      <Alert>{sendReminders.error?.message}</Alert>

      {adding ? (
        <Card className="animate-rise">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>New deadline</SectionLabel>
              <IconButton icon={X} label="Close" onClick={() => setAdding(false)} />
            </div>
            <Alert>{create.error?.message}</Alert>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="What is due"
                required
                autoFocus
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
                label="Linked proposal"
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
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" variant="primary" disabled={create.isPending}>
                {create.isPending ? 'Adding…' : 'Add deadline'}
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {deadlines.isPending ? (
        <Spinner label="Loading deadlines" />
      ) : groups.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={CalendarClock}
            title="No deadlines tracked yet"
            action={
              canWrite ? (
                <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
                  Add the first one
                </Button>
              ) : undefined
            }
          >
            Add the funder&apos;s submission date and the reminders take care of themselves.
          </EmptyState>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <SectionLabel className="mb-2.5 flex items-center gap-2">
              {group.label}
              <span className="tabular text-ink-300">{group.items.length}</span>
            </SectionLabel>
            <Card padded={false}>
              <ul className="divide-y divide-line">
                {group.items.map((deadline) => {
                  const done = Boolean(deadline.completedAt);
                  const tone = done
                    ? 'neutral'
                    : deadline.daysRemaining < 0
                      ? 'red'
                      : deadline.daysRemaining <= 7
                        ? 'amber'
                        : 'neutral';
                  return (
                    <li key={deadline.id} className="group flex items-center gap-4 px-5 py-3.5">
                      <DateTile date={new Date(deadline.dueAt)} tone={tone} />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-[14.5px] ${done ? 'text-ink-400 line-through' : 'text-ink-900'}`}
                        >
                          {deadline.title}
                        </div>
                        <div className="truncate text-[12.5px] text-ink-400">
                          {DEADLINE_TYPE_LABELS[deadline.type]}
                          {deadline.proposalId ? (
                            <>
                              {' · '}
                              <Link
                                to={`/proposals/${deadline.proposalId}`}
                                className="hover:text-accent-600 hover:underline"
                              >
                                {deadline.proposalTitle}
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {!done ? (
                        <span
                          className={`hidden shrink-0 text-[13px] font-medium sm:block ${
                            tone === 'red'
                              ? 'text-flag-red'
                              : tone === 'amber'
                                ? 'text-flag-amber'
                                : 'text-ink-400'
                          }`}
                        >
                          {relativeDays(deadline.daysRemaining)}
                        </span>
                      ) : null}
                      <div className="flex shrink-0 items-center">
                        {canWrite ? (
                          <IconButton
                            icon={Check}
                            label={done ? 'Mark as not done' : 'Mark as done'}
                            onClick={() => toggle.mutate(deadline)}
                            className={done ? 'text-accent-600' : ''}
                          />
                        ) : null}
                        <a
                          href={deadlinesApi.icsUrl(orgId, deadline.id)}
                          title="Add to calendar"
                          aria-label="Add to calendar"
                          className="inline-flex size-8 items-center justify-center rounded-md text-ink-400 hover:bg-paper-dark hover:text-ink-900"
                        >
                          <CalendarPlus className="size-4" strokeWidth={1.8} />
                        </a>
                        {canWrite ? (
                          <IconButton
                            icon={Trash2}
                            label="Delete"
                            tone="danger"
                            onClick={() => remove.mutate(deadline.id)}
                          />
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
