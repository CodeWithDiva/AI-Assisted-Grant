import type { ActivityEntry } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import {
  BookMarked,
  Building2,
  CalendarClock,
  Download,
  FileText,
  FolderOpen,
  History,
  LibraryBig,
  PenLine,
  Users,
} from 'lucide-react';
import { useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Card, EmptyState, PageTitle, Skeleton, Spinner } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { activityApi } from './api';
import { dayLabel, describeActivity } from './describe';

const ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  proposal: FileText,
  section: PenLine,
  template: LibraryBig,
  document: FolderOpen,
  library: BookMarked,
  deadline: CalendarClock,
  export: Download,
  profile: Building2,
  organization: Building2,
  member: Users,
  invitation: Users,
};

export function ActivityPage() {
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  // Pages are appended as the reader asks for more; each one starts before the oldest shown.
  const [pages, setPages] = useState<ActivityEntry[][]>([]);
  const [before, setBefore] = useState<string | undefined>();

  const page = useQuery({
    queryKey: ['activity', orgId, before],
    queryFn: async () => {
      const entries = await activityApi.list(orgId, before);
      setPages((current) => (before ? [...current, entries] : [entries]));
      return entries;
    },
    enabled: Boolean(orgId),
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const entries = pages.flat();
  const lastPage = pages.at(-1);
  const more = (lastPage?.length ?? 0) >= 40;
  const days = groupByDay(entries);

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        title="Activity"
        description={`Everything that changed in ${activeOrg.name}: who did it and when. Section edits by the same person fold into one entry.`}
      />

      {page.isPending && !entries.length ? (
        <Card padded={false}>
          <div className="space-y-4 px-5 py-5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </Card>
      ) : entries.length ? (
        <>
          {days.map(([day, items]) => (
            <section key={day}>
              <h2 className="eyebrow mb-2.5">{day}</h2>
              <Card padded={false}>
                <ul className="divide-y divide-line">
                  {items.map((entry) => {
                    const Icon = ICONS[entry.entity] ?? History;
                    const { text, subject, after } = describeActivity(entry);
                    // Proposals are the one thing worth opening straight from the trail.
                    const href =
                      entry.entity === 'proposal' &&
                      entry.entityId &&
                      entry.action !== 'proposal.deleted'
                        ? `/proposals/${entry.entityId}`
                        : null;
                    const named: ReactNode = href ? (
                      <Link to={href} className="text-ink-900 hover:underline">
                        {subject}
                      </Link>
                    ) : (
                      <span className="text-ink-900">{subject}</span>
                    );
                    return (
                      <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-paper-dark text-ink-400">
                          <Icon className="size-4" strokeWidth={1.7} />
                        </span>
                        <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-600">
                          <span className="font-medium text-ink-900">
                            {entry.userName ?? 'Someone'}
                          </span>{' '}
                          {text}
                          {subject ? <> {named}</> : null}
                          {after ? ` ${after}` : ''}
                        </p>
                        <time
                          dateTime={entry.at}
                          className="tabular shrink-0 font-mono text-[11.5px] text-ink-400"
                        >
                          {new Date(entry.at).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}

          {more ? (
            <Button
              onClick={() => setBefore(entries.at(-1)?.at)}
              disabled={page.isFetching}
              className="w-full"
            >
              {page.isFetching ? 'Loading…' : 'Show earlier activity'}
            </Button>
          ) : (
            <p className="text-center text-[13px] text-ink-400">That is the whole trail.</p>
          )}
        </>
      ) : (
        <Card>
          <EmptyState icon={History} title="Nothing yet">
            As soon as someone writes, uploads or changes something, it appears here.
          </EmptyState>
        </Card>
      )}
    </div>
  );
}

function groupByDay(entries: ActivityEntry[]): [string, ActivityEntry[]][] {
  const days = new Map<string, ActivityEntry[]>();
  for (const entry of entries) {
    const label = dayLabel(entry.at);
    days.set(label, [...(days.get(label) ?? []), entry]);
  }
  return [...days.entries()];
}
