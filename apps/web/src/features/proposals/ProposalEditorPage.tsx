import { countWords, ProposalStatus, RefineAction, type ProposalSectionView } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, BookMarked, ChevronDown, ClipboardCheck, MessageSquare } from 'lucide-react';
import { useParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  formatMoney,
  LimitBar,
  Menu,
  SectionLabel,
  Select,
  Spinner,
} from '../../components/ui';
import { insertPassage, libraryApi } from '../library/api';
import { LibraryPanel } from '../library/LibraryPanel';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { usePermissions } from '../organizations/permissions';
import { teamApi } from '../team/api';
import { proposalsApi } from './api';
import { CompliancePanel } from './CompliancePanel';
import { ExportButtons } from './ExportButtons';
import { applyFormat, FormattingToolbar, RichPreview } from './Formatting';
import { ReviewNotes } from './ReviewNotes';
import { statusLabels, statusTones } from './status';
import { VersionHistory } from './VersionHistory';

const refineLabels: Record<RefineAction, string> = {
  SHORTEN: 'Shorten',
  EXPAND: 'Expand',
  TONE_FORMAL: 'More formal',
  TONE_PLAIN: 'Plainer',
  CUSTOM: 'Custom',
};

export function ProposalEditorPage() {
  const { proposalId = '' } = useParams();
  const { activeOrg } = useOrgs();
  const { canWrite, isOwner } = usePermissions();
  const orgId = activeOrg?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [instruction, setInstruction] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [preview, setPreview] = useState(false);
  const dirty = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  // The selection when the library opened: what "save to library" stores.
  const [librarySource, setLibrarySource] = useState<{
    text: string;
    isSelection: boolean;
  } | null>(null);

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

  /** Editing also withdraws the owner's approval on the server, so the header follows. */
  const applySection = (section: ProposalSectionView) => {
    queryClient.setQueryData(['proposals', orgId, proposalId], (old: typeof proposal.data) =>
      old
        ? {
            ...old,
            approvedAt: null,
            approvedByName: null,
            sections: old.sections.map((item) => (item.id === section.id ? section : item)),
          }
        : old,
    );
    void queryClient.invalidateQueries({ queryKey: ['proposals', orgId] });
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
      const before = text;
      setText('');
      try {
        return await proposalsApi.generateSection(
          orgId,
          proposalId,
          selected!.id,
          instruction.trim() || undefined,
          (delta) => setText((current) => current + delta),
          () => setText(''),
        );
      } catch (error) {
        // Nothing was saved, so put back what was there instead of a half-written draft.
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
          () => setText(''),
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

  const approval = useMutation({
    mutationFn: (approved: boolean) => proposalsApi.setApproval(orgId, proposalId, approved),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proposals', orgId] });
      await proposal.refetch();
    },
  });

  const assign = useMutation({
    mutationFn: (ownerId: string | null) => proposalsApi.update(orgId, proposalId, { ownerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proposals', orgId] });
      await proposal.refetch();
    },
  });

  // Only loaded when someone may reassign the proposal.
  const members = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => teamApi.members(orgId),
    enabled: canWrite,
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
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {canWrite ? (
              <Menu
                width="w-48"
                trigger={(open) => (
                  <button
                    type="button"
                    title="Change status"
                    className={`inline-flex items-center gap-1 rounded-full pr-1.5 ${open ? 'ring-3 ring-accent-100' : ''}`}
                  >
                    <Badge tone={statusTones[data.status]}>{statusLabels[data.status]}</Badge>
                    <ChevronDown className="size-3.5 text-ink-400" />
                  </button>
                )}
                items={Object.values(ProposalStatus).map((status) => ({
                  label: statusLabels[status],
                  selected: status === data.status,
                  onSelect: () => setStatus.mutate(status),
                }))}
              />
            ) : (
              <Badge tone={statusTones[data.status]}>{statusLabels[data.status]}</Badge>
            )}
            <span className="truncate text-[13px] text-ink-400">
              {[data.funderName, data.templateName].filter(Boolean).join(' · ')}
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-ink-900">
            {data.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-600">
            <span>Assigned to</span>
            {canWrite ? (
              <Menu
                width="w-56"
                trigger={(open) => (
                  <button
                    type="button"
                    title="Assign this proposal"
                    aria-label="Assign this proposal"
                    className={`inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-[13px] font-medium text-ink-900 hover:bg-paper ${
                      open ? 'ring-3 ring-accent-100' : ''
                    }`}
                  >
                    {data.ownerName ?? 'Nobody'}
                    <ChevronDown className="size-3.5 text-ink-400" />
                  </button>
                )}
                items={[
                  ...(members.data ?? []).map((member) => ({
                    label: member.user.name,
                    description: member.user.email,
                    selected: member.user.id === data.ownerId,
                    onSelect: () => assign.mutate(member.user.id),
                  })),
                  {
                    label: 'Nobody',
                    selected: !data.ownerId,
                    onSelect: () => assign.mutate(null),
                  },
                ]}
              />
            ) : (
              <span className="font-medium text-ink-900">{data.ownerName ?? 'Nobody'}</span>
            )}
          </div>
          <p className="tabular mt-1.5 text-ink-600">
            {data.completedSections} of {data.sectionCount} sections written
            {data.requestedAmount
              ? ` · ${formatMoney(data.requestedAmount, data.currency)} requested`
              : ''}
          </p>
        </div>

        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={ClipboardCheck} onClick={() => setShowCompliance((value) => !value)}>
              {showCompliance ? 'Hide review' : 'Review draft'}
            </Button>
            <ExportButtons orgId={orgId} proposalId={proposalId} />
          </div>
        ) : null}
      </header>

      <ApprovalBar
        approvedAt={data.approvedAt}
        approvedByName={data.approvedByName}
        openComments={data.openComments}
        isOwner={isOwner}
        pending={approval.isPending}
        error={approval.error?.message}
        onApprove={() => approval.mutate(true)}
        onWithdraw={() => approval.mutate(false)}
        onShowNotes={() => setShowNotes(true)}
      />

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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav className="h-fit lg:sticky lg:top-9">
          {/* Phones: a compact picker, so the text box is not pushed below a long list. */}
          <Select
            label="Section"
            className="lg:hidden"
            value={selected?.id ?? ''}
            onChange={(event) => {
              const section = sections.find((item) => item.id === event.target.value);
              if (section) openSection(section);
            }}
          >
            {sections.map((section, index) => (
              <option key={section.id} value={section.id}>
                {index + 1}. {section.title} ({section.wordCount}
                {section.wordLimit ? `/${section.wordLimit}` : ''} words)
              </option>
            ))}
          </Select>
          <SectionLabel className="mb-2.5 hidden lg:block">Sections</SectionLabel>
          <ul className="hidden overflow-hidden rounded-lg border border-line bg-surface lg:block">
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
                {canWrite ? (
                  <>
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
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowVersions((value) => !value)}
                  className="ml-auto text-[13px] text-ink-400 hover:text-ink-900"
                >
                  {showVersions ? 'Hide history' : 'History'}
                </button>
              </div>

              {canWrite ? (
                <input
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Optional instruction — e.g. lead with the 2026 flood response"
                  className="mt-3 w-full rounded-md border border-line bg-paper px-3 py-2 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-accent-600 focus:bg-surface focus:outline-none"
                />
              ) : null}
            </div>

            <Alert>{generate.error?.message ?? refine.error?.message ?? save.error?.message}</Alert>

            <FormattingToolbar
              textareaRef={textareaRef}
              text={text}
              disabled={busy || !canWrite}
              preview={preview}
              onPreviewChange={setPreview}
              onChange={(value) => {
                dirty.current = true;
                setText(value);
              }}
              extra={
                <>
                  <button
                    type="button"
                    disabled={busy || preview}
                    onClick={() => setShowNotes((value) => !value)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] disabled:opacity-40 ${
                      showNotes
                        ? 'bg-accent-50 text-accent-700'
                        : 'text-ink-600 hover:bg-paper-dark hover:text-ink-900'
                    }`}
                  >
                    <MessageSquare className="size-4" />
                    Notes
                    {data.openComments ? (
                      <span className="tabular rounded-full bg-brass-soft px-1.5 font-mono text-[11px] text-[#7a5a1f]">
                        {data.openComments}
                      </span>
                    ) : null}
                  </button>
                  {canWrite ? (
                    <button
                      type="button"
                      disabled={busy || preview}
                      aria-expanded={librarySource !== null}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (librarySource) return setLibrarySource(null);
                        const area = textareaRef.current;
                        const picked = area
                          ? text.slice(area.selectionStart, area.selectionEnd)
                          : '';
                        setLibrarySource(
                          picked.trim()
                            ? { text: picked, isSelection: true }
                            : { text, isSelection: false },
                        );
                      }}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] disabled:opacity-40 ${
                        librarySource
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-ink-600 hover:bg-paper-dark hover:text-ink-900'
                      }`}
                    >
                      <BookMarked className="size-4" />
                      Library
                    </button>
                  ) : null}
                </>
              }
            />

            {showNotes && !preview ? (
              <ReviewNotes
                orgId={orgId}
                proposalId={proposalId}
                sectionId={selected.id}
                sectionTitle={selected.title}
                onClose={() => setShowNotes(false)}
              />
            ) : null}

            {librarySource && !preview ? (
              <LibraryPanel
                orgId={orgId}
                sectionTitle={selected.title}
                source={librarySource}
                onClose={() => setLibrarySource(null)}
                onInsert={(block) => {
                  const area = textareaRef.current;
                  const start = area?.selectionStart ?? text.length;
                  const end = area?.selectionEnd ?? text.length;
                  const edit = insertPassage(text, start, end, block.body);
                  dirty.current = true;
                  setText(edit.text);
                  setLibrarySource(null);
                  // Counts towards "most used", which also orders what the AI sees first.
                  void libraryApi
                    .markUsed(orgId, block.id)
                    .then(() => queryClient.invalidateQueries({ queryKey: ['library', orgId] }));
                  requestAnimationFrame(() => {
                    area?.focus();
                    area?.setSelectionRange(edit.cursor, edit.cursor);
                  });
                }}
              />
            ) : null}

            {preview ? (
              <RichPreview text={text} />
            ) : (
              <textarea
                ref={textareaRef}
                value={text}
                readOnly={busy || !canWrite}
                onChange={(event) => {
                  dirty.current = true;
                  setText(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (!(event.ctrlKey || event.metaKey) || busy) return;
                  const kind = event.key === 'b' ? 'bold' : event.key === 'i' ? 'italic' : null;
                  if (!kind) return;
                  event.preventDefault();
                  const area = event.currentTarget;
                  const edit = applyFormat(text, area.selectionStart, area.selectionEnd, kind);
                  dirty.current = true;
                  setText(edit.text);
                  requestAnimationFrame(() =>
                    area.setSelectionRange(edit.selectionStart, edit.selectionEnd),
                  );
                }}
                placeholder="Write here, or let the AI draft it first. **bold**, *italic*, and lines starting with - or 1. become lists."
                className="min-h-[340px] w-full resize-y bg-surface px-6 py-5 font-display text-[16.5px] leading-[1.75] text-ink-900 placeholder:text-ink-300 focus:outline-none"
              />
            )}

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

              {canWrite ? (
                <Button
                  size="sm"
                  disabled={save.isPending || busy}
                  onClick={() => save.mutate(text)}
                >
                  Save
                </Button>
              ) : null}
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

/**
 * Sign-off before a proposal leaves the building: only an owner approves, and any later
 * edit clears the approval, so it always refers to the text that was read.
 */
function ApprovalBar({
  approvedAt,
  approvedByName,
  openComments,
  isOwner,
  pending,
  error,
  onApprove,
  onWithdraw,
  onShowNotes,
}: {
  approvedAt: string | null;
  approvedByName: string | null;
  openComments: number;
  isOwner: boolean;
  pending: boolean;
  error?: string;
  onApprove: () => void;
  onWithdraw: () => void;
  onShowNotes: () => void;
}) {
  const approvedOn = approvedAt
    ? new Date(approvedAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3">
      {approvedAt ? (
        <span className="flex items-center gap-2 text-[13.5px] text-ink-800">
          <BadgeCheck className="size-[18px] text-accent-600" strokeWidth={1.8} />
          Approved for submission by{' '}
          <span className="font-medium text-ink-900">{approvedByName ?? 'an owner'}</span> on{' '}
          {approvedOn}
        </span>
      ) : (
        <span className="text-[13.5px] text-ink-600">
          Not yet approved for submission.
          {isOwner ? ' Read it through, then sign it off.' : ' An owner signs it off.'}
        </span>
      )}

      {openComments ? (
        <button
          type="button"
          onClick={onShowNotes}
          className="text-[13px] font-medium text-accent-600 hover:underline"
        >
          {openComments} open review note{openComments === 1 ? '' : 's'}
        </button>
      ) : null}

      {isOwner ? (
        <span className="ml-auto flex items-center gap-2">
          {error ? <span className="text-[12.5px] text-flag-red">{error}</span> : null}
          {approvedAt ? (
            <Button size="sm" onClick={onWithdraw} disabled={pending}>
              Withdraw approval
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={onApprove} disabled={pending}>
              {pending ? 'Saving…' : 'Approve for submission'}
            </Button>
          )}
        </span>
      ) : null}
    </div>
  );
}
