import { ProposalStatus, RefineAction, type ProposalSectionView } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert, Badge, Button, LimitBar, SectionLabel, Spinner } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { proposalsApi } from './api';
import { CompliancePanel } from './CompliancePanel';
import { ExportButtons } from './ExportButtons';
import { statusLabels } from './status';

const refineLabels: Record<RefineAction, string> = {
  SHORTEN: 'Shorten',
  EXPAND: 'Expand',
  TONE_FORMAL: 'More formal',
  TONE_PLAIN: 'Plainer',
  CUSTOM: 'Custom',
};

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function ProposalEditorPage() {
  const { proposalId = '' } = useParams();
  const { activeOrg } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [instruction, setInstruction] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const dirty = useRef(false);

  const proposal = useQuery({
    queryKey: ['proposals', orgId, proposalId],
    queryFn: () => proposalsApi.get(orgId, proposalId),
    enabled: Boolean(orgId && proposalId),
  });

  const sections = proposal.data?.sections ?? [];
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    setSelectedId((current) => current ?? selected.id);
    if (!dirty.current && !streaming) setText(selected.text);
  }, [selected, streaming]);

  const applySection = (section: ProposalSectionView) => {
    queryClient.setQueryData(['proposals', orgId, proposalId], (old: typeof proposal.data) =>
      old
        ? {
            ...old,
            sections: old.sections.map((item) => (item.id === section.id ? section : item)),
          }
        : old,
    );
  };

  const openSection = (section: ProposalSectionView) => {
    dirty.current = false;
    setSelectedId(section.id);
    setText(section.text);
    setShowVersions(false);
  };

  const save = useMutation({
    mutationFn: (value: string) => proposalsApi.saveSection(orgId, proposalId, selected!.id, value),
    onSuccess: (section) => {
      dirty.current = false;
      applySection(section);
    },
  });

  // Autosave two seconds after typing stops.
  useEffect(() => {
    if (!selected || streaming || !dirty.current) return;
    const timer = setTimeout(() => save.mutate(text), 2000);
    return () => clearTimeout(timer);
  }, [text, selected, streaming]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useMutation({
    mutationFn: async () => {
      setStreaming(true);
      setText('');
      return proposalsApi.generateSection(
        orgId,
        proposalId,
        selected!.id,
        instruction.trim() || undefined,
        (delta) => setText((current) => current + delta),
      );
    },
    onSuccess: (section) => {
      setText(section.text);
      applySection(section);
      setInstruction('');
    },
    onSettled: () => setStreaming(false),
  });

  const refine = useMutation({
    mutationFn: async (action: RefineAction) => {
      setStreaming(true);
      const before = text;
      setText('');
      try {
        return await proposalsApi.refineSection(
          orgId,
          proposalId,
          selected!.id,
          { action, instruction: instruction.trim() || undefined },
          (delta) => setText((current) => current + delta),
        );
      } catch (error) {
        setText(before);
        throw error;
      }
    },
    onSuccess: (section) => {
      setText(section.text);
      applySection(section);
      setInstruction('');
    },
    onSettled: () => setStreaming(false),
  });

  const setStatus = useMutation({
    mutationFn: (status: ProposalStatus) => proposalsApi.update(orgId, proposalId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proposals', orgId] });
      await proposal.refetch();
    },
  });

  if (!activeOrg) return <NoOrganizationNotice />;
  if (proposal.isPending) return <Spinner label="Loading proposal" />;
  if (proposal.isError) return <Alert>{proposal.error.message}</Alert>;

  const data = proposal.data;
  const words = countWords(text);
  const busy = streaming || generate.isPending || refine.isPending;
  const placeholders = text.split('[NEEDS INPUT').length - 1;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/proposals" className="text-[13px] text-ink-400 hover:text-ink-900">
        ← Proposals
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="eyebrow mb-2">
            {data.funderName ?? 'No funder recorded'}
            {data.templateName ? ` · ${data.templateName}` : ''}
          </div>
          <h1 className="font-display text-[27px] leading-tight text-ink-900">{data.title}</h1>
          <p className="tabular mt-1.5 text-ink-600">
            {data.completedSections} of {data.sectionCount} sections written
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons orgId={orgId} proposalId={proposalId} />
          <Button onClick={() => setShowCompliance((value) => !value)}>
            {showCompliance ? 'Hide review' : 'Review draft'}
          </Button>
          <select
            value={data.status}
            onChange={(event) => setStatus.mutate(event.target.value as ProposalStatus)}
            className="h-9 rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink-900 focus:border-accent-600 focus:outline-none"
          >
            {Object.values(ProposalStatus).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {showCompliance ? (
        <CompliancePanel
          orgId={orgId}
          proposalId={proposalId}
          onJumpToSection={(sectionId) => {
            const section = sections.find((item) => item.id === sectionId);
            if (section) openSection(section);
          }}
        />
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_1fr]">
        <nav className="h-fit lg:sticky lg:top-9">
          <SectionLabel className="mb-2.5">Sections</SectionLabel>
          <ul className="overflow-hidden rounded-lg border border-line bg-surface">
            {sections.map((section) => {
              const active = selected?.id === section.id;
              const over = section.wordLimit ? section.wordCount > section.wordLimit : false;
              return (
                <li key={section.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openSection(section)}
                    className={`w-full px-3.5 py-3 text-left transition-colors ${
                      active
                        ? 'bg-accent-50 shadow-[inset_2px_0_0_0_var(--color-accent-600)]'
                        : 'hover:bg-paper'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                          section.wordCount === 0
                            ? 'bg-line-strong'
                            : over
                              ? 'bg-flag-red'
                              : 'bg-accent-600'
                        }`}
                      />
                      <span
                        className={`text-[13.5px] leading-snug ${active ? 'font-medium text-ink-900' : 'text-ink-600'}`}
                      >
                        {section.title}
                      </span>
                    </div>
                    <div className="tabular mt-1.5 pl-4 font-mono text-[11px] text-ink-400">
                      {section.wordCount}
                      {section.wordLimit ? ` / ${section.wordLimit}` : ''} words
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {selected ? (
          <div className="min-w-0 rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-6 pt-5 pb-4">
              <h2 className="font-display text-[20px] text-ink-900">{selected.title}</h2>
              {selected.instructions ? (
                <p className="mt-2 border-l-2 border-line-strong pl-3 text-[13.5px] text-ink-600">
                  {selected.instructions}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={() => generate.mutate()}
                >
                  {busy ? 'Writing…' : text.trim() ? 'Rewrite with AI' : 'Write with AI'}
                </Button>

                {Object.values(RefineAction)
                  .filter((action) => action !== RefineAction.CUSTOM)
                  .map((action) => (
                    <Button
                      key={action}
                      size="sm"
                      disabled={busy || !text.trim()}
                      onClick={() => refine.mutate(action)}
                    >
                      {refineLabels[action]}
                    </Button>
                  ))}

                <button
                  type="button"
                  onClick={() => setShowVersions((value) => !value)}
                  className="ml-auto text-[13px] text-ink-400 hover:text-ink-900"
                >
                  {showVersions ? 'Hide history' : 'History'}
                </button>
              </div>

              <input
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="Optional instruction — e.g. lead with the 2026 flood response"
                className="mt-3 w-full rounded-md border border-line bg-paper px-3 py-2 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-accent-600 focus:bg-surface focus:outline-none"
              />
            </div>

            <Alert>{generate.error?.message ?? refine.error?.message ?? save.error?.message}</Alert>

            <textarea
              value={text}
              readOnly={busy}
              onChange={(event) => {
                dirty.current = true;
                setText(event.target.value);
              }}
              placeholder="Write here, or let the AI draft it first."
              className="min-h-[460px] w-full resize-y bg-surface px-6 py-5 font-display text-[16.5px] leading-[1.75] text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-4 border-t border-line px-6 py-3">
              <div className="min-w-[160px] flex-1">
                <div className="tabular flex items-baseline justify-between font-mono text-[11.5px] text-ink-400">
                  <span>
                    {words} words{selected.wordLimit ? ` / ${selected.wordLimit}` : ''}
                  </span>
                  {streaming ? (
                    <span className="flex items-center gap-1.5 text-accent-600">
                      <span className="size-1.5 animate-pulse rounded-full bg-accent-600" />
                      writing
                    </span>
                  ) : save.isPending ? (
                    <span>saving…</span>
                  ) : (
                    <span>saved</span>
                  )}
                </div>
                {selected.wordLimit ? (
                  <div className="mt-1.5">
                    <LimitBar used={words} limit={selected.wordLimit} />
                  </div>
                ) : null}
              </div>

              <Button size="sm" disabled={save.isPending || busy} onClick={() => save.mutate(text)}>
                Save
              </Button>
            </div>

            {placeholders > 0 ? (
              <div className="border-t border-line px-6 py-3">
                <Alert tone="amber">
                  {placeholders} unfilled placeholder{placeholders > 1 ? 's' : ''} — the AI needed a
                  fact it was not given. Search the text for{' '}
                  <span className="font-mono text-[12px]">[NEEDS INPUT</span> and replace each one.
                </Alert>
              </div>
            ) : null}

            {showVersions ? (
              <div className="border-t border-line px-6 py-4">
                <VersionHistory
                  orgId={orgId}
                  proposalId={proposalId}
                  sectionId={selected.id}
                  onRestore={(section) => {
                    setText(section.text);
                    applySection(section);
                    setShowVersions(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-ink-400">This proposal has no sections.</p>
        )}
      </div>
    </div>
  );
}

function VersionHistory({
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
