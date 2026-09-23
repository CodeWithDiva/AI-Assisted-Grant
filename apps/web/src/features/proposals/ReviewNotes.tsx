import type { ProposalCommentView } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquare, RotateCcw, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alert, Button, IconButton, Spinner } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { proposalsApi } from './api';

/**
 * Review notes for one proposal: the current section's first, then notes about the whole
 * proposal, then anything already resolved. Every member can write one, including viewers.
 */
export function ReviewNotes({
  orgId,
  proposalId,
  sectionId,
  sectionTitle,
  onClose,
}: {
  orgId: string;
  proposalId: string;
  sectionId: string;
  sectionTitle: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [aboutSection, setAboutSection] = useState(true);

  const notes = useQuery({
    queryKey: ['comments', orgId, proposalId],
    queryFn: () => proposalsApi.comments(orgId, proposalId),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['comments', orgId, proposalId] });
    // The open-note count travels with the proposal.
    await queryClient.invalidateQueries({ queryKey: ['proposals', orgId] });
  };

  const add = useMutation({
    mutationFn: () =>
      proposalsApi.addComment(orgId, proposalId, {
        body,
        ...(aboutSection ? { sectionId } : {}),
      }),
    onSuccess: async () => {
      setBody('');
      await refresh();
    },
  });

  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      proposalsApi.resolveComment(orgId, proposalId, id, resolved),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => proposalsApi.deleteComment(orgId, proposalId, id),
    onSuccess: refresh,
  });

  const all = notes.data ?? [];
  const open = all.filter((note) => !note.resolvedAt);
  const ordered = [
    ...open.filter((note) => note.sectionId === sectionId),
    ...open.filter((note) => note.sectionId !== sectionId),
    ...all.filter((note) => note.resolvedAt),
  ];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (body.trim()) add.mutate();
  };

  return (
    <div className="border-b border-line bg-paper/60 px-4 py-3.5" aria-label="Review notes">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">Review notes · {open.length} open</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the review notes"
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-400 hover:bg-paper-dark hover:text-ink-900"
        >
          <X className="size-4" />
        </button>
      </div>

      <Alert>{add.error?.message ?? resolve.error?.message ?? remove.error?.message}</Alert>

      <div className="mt-2.5 max-h-64 overflow-y-auto">
        {notes.isPending ? (
          <Spinner label="Loading notes" />
        ) : ordered.length ? (
          <ul className="space-y-1.5">
            {ordered.map((note) => (
              <Note
                key={note.id}
                note={note}
                mine={note.authorId === user?.id}
                busy={resolve.isPending || remove.isPending}
                onResolve={(resolved) => resolve.mutate({ id: note.id, resolved })}
                onDelete={() => remove.mutate(note.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-[13px] text-ink-600">
            No notes yet. Leave one for whoever writes this section next.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-3 border-t border-line pt-3">
        <textarea
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={`A note about ${aboutSection ? sectionTitle : 'this proposal'}…`}
          className="w-full resize-y rounded-md border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-accent-500 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!body.trim() || add.isPending}
          >
            {add.isPending ? 'Adding…' : 'Add note'}
          </Button>
          <label className="flex items-center gap-1.5 text-[13px] text-ink-600">
            <input
              type="checkbox"
              checked={aboutSection}
              onChange={(event) => setAboutSection(event.target.checked)}
              className="size-3.5 accent-accent-600"
            />
            About this section
          </label>
        </div>
      </form>
    </div>
  );
}

function Note({
  note,
  mine,
  busy,
  onResolve,
  onDelete,
}: {
  note: ProposalCommentView;
  mine: boolean;
  busy: boolean;
  onResolve: (resolved: boolean) => void;
  onDelete: () => void;
}) {
  const resolved = Boolean(note.resolvedAt);

  return (
    <li
      className={`rounded-md border px-3 py-2.5 ${
        resolved ? 'border-line bg-paper text-ink-400' : 'border-line bg-surface'
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageSquare
          className={`mt-0.5 size-4 shrink-0 ${resolved ? 'text-ink-300' : 'text-accent-600'}`}
          strokeWidth={1.8}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-[13.5px] leading-snug ${resolved ? '' : 'text-ink-900'}`}>
            {note.body}
          </p>
          <div className="tabular mt-1 font-mono text-[11px] text-ink-400">
            {note.authorName ?? 'Someone'} · {note.sectionTitle ?? 'whole proposal'} ·{' '}
            {new Date(note.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })}
            {resolved ? ` · resolved by ${note.resolvedByName ?? 'someone'}` : ''}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton
            icon={resolved ? RotateCcw : Check}
            label={resolved ? 'Reopen' : 'Mark resolved'}
            disabled={busy}
            onClick={() => onResolve(!resolved)}
          />
          {mine ? (
            <IconButton
              icon={Trash2}
              label="Delete note"
              tone="danger"
              disabled={busy}
              onClick={onDelete}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}
