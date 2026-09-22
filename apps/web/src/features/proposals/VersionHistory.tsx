import { type ProposalSectionView } from '@grant/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge, SectionLabel, Spinner } from '../../components/ui';
import { proposalsApi } from './api';

/** Earlier versions of a section, newest first, each one restorable. */
export function VersionHistory({
  orgId,
  proposalId,
  sectionId,
  onRestore,
}: {
  orgId: string;
  proposalId: string;
  sectionId: string;
  onRestore: (section: ProposalSectionView) => void;
}) {
  const versions = useQuery({
    queryKey: ['versions', orgId, proposalId, sectionId],
    queryFn: () => proposalsApi.versions(orgId, proposalId, sectionId),
  });

  const restore = useMutation({
    mutationFn: (versionId: string) =>
      proposalsApi.restoreVersion(orgId, proposalId, sectionId, versionId),
    onSuccess: onRestore,
  });

  if (versions.isPending) return <Spinner label="Loading history" />;
  if (!versions.data?.length) return <p className="text-[13.5px] text-ink-400">No history yet.</p>;

  return (
    <>
      <SectionLabel className="mb-2.5">Version history</SectionLabel>
      <ul className="divide-y divide-line rounded-md border border-line">
        {versions.data.map((version) => (
          <li key={version.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <Badge tone={version.source === 'AI' ? 'blue' : 'neutral'}>
              {version.source === 'AI' ? 'AI' : 'You'}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="tabular text-[12.5px] text-ink-600">
                {new Date(version.createdAt).toLocaleString()} · {version.wordCount} words
              </div>
              <div className="truncate text-[12.5px] text-ink-400">
                {version.text.slice(0, 110)}
              </div>
            </div>
            <button
              type="button"
              disabled={restore.isPending}
              onClick={() => restore.mutate(version.id)}
              className="shrink-0 text-[13px] text-accent-600 hover:underline disabled:opacity-50"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
