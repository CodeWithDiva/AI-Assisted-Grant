import {
  LIBRARY_CATEGORY_LABELS,
  LibraryCategory,
  plainText,
  type LibraryBlockView,
} from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert, Button, Select, Spinner } from '../../components/ui';
import { libraryApi } from './api';

/**
 * Opens under the editor's toolbar: insert an approved passage at the cursor, or save the
 * selected text (the whole section when nothing is selected) as a new passage.
 */
export function LibraryPanel({
  orgId,
  sectionTitle,
  source,
  onInsert,
  onClose,
}: {
  orgId: string;
  sectionTitle: string;
  /** What "save to library" stores: the selection when the panel opened, or the whole section. */
  source: { text: string; isSelection: boolean };
  onInsert: (block: LibraryBlockView) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<{ title: string; category: LibraryCategory } | null>(null);

  const library = useQuery({
    queryKey: ['library', orgId],
    queryFn: () => libraryApi.list(orgId),
  });

  const save = useMutation({
    mutationFn: () =>
      libraryApi.create(orgId, {
        title: saving!.title,
        category: saving!.category,
        body: source.text,
      }),
    onSuccess: async () => {
      setSaving(null);
      await queryClient.invalidateQueries({ queryKey: ['library', orgId] });
    },
  });

  const query = search.trim().toLowerCase();
  const blocks = (library.data ?? [])
    .filter(
      (block) =>
        !query ||
        block.title.toLowerCase().includes(query) ||
        block.body.toLowerCase().includes(query),
    )
    .sort((a, b) => b.usageCount - a.usageCount);

  return (
    <div className="border-b border-line bg-paper/60 px-4 py-3.5" aria-label="Content library">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the content library"
            aria-label="Search the content library"
            className="w-full rounded-md border border-line-strong bg-surface py-1.5 pr-3 pl-9 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-accent-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the library"
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-400 hover:bg-paper-dark hover:text-ink-900"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto">
        {library.isPending ? (
          <Spinner label="Loading the library" />
        ) : blocks.length ? (
          <ul className="space-y-1.5">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex items-start gap-3 rounded-md border border-line bg-surface px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-ink-900">
                    {block.title}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-600">
                    {plainText(block.body)}
                  </div>
                  <div className="tabular mt-1 font-mono text-[11px] text-ink-400">
                    {LIBRARY_CATEGORY_LABELS[block.category]} · {block.wordCount} words
                  </div>
                </div>
                <Button size="sm" onClick={() => onInsert(block)}>
                  Insert
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-[13px] text-ink-600">
            {library.data?.length ? (
              'Nothing matches that search.'
            ) : (
              <>
                The library is empty. Save this section below, or{' '}
                <Link to="/library" className="text-accent-600 hover:underline">
                  add passages
                </Link>{' '}
                you reuse.
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <Alert>{save.error?.message}</Alert>
        {save.isSuccess && !saving ? (
          <p className="text-[13px] text-accent-700">Saved to the library.</p>
        ) : null}
        {saving ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-end"
          >
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-medium text-ink-800">
                Title for this passage
              </span>
              <input
                required
                minLength={2}
                value={saving.title}
                onChange={(event) => setSaving({ ...saving, title: event.target.value })}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[13.5px] focus:border-accent-500 focus:outline-none"
              />
            </label>
            <Select
              aria-label="Category"
              value={saving.category}
              onChange={(event) =>
                setSaving({ ...saving, category: event.target.value as LibraryCategory })
              }
            >
              {Object.values(LibraryCategory).map((category) => (
                <option key={category} value={category}>
                  {LIBRARY_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save passage'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSaving(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            disabled={!source.text.trim()}
            onClick={() => {
              save.reset();
              setSaving({ title: sectionTitle, category: 'OTHER' });
            }}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-600 hover:underline disabled:text-ink-300 disabled:no-underline"
          >
            <BookmarkPlus className="size-4" />
            {source.isSelection
              ? 'Save the selected text to the library'
              : 'Save this section to the library'}
          </button>
        )}
      </div>
    </div>
  );
}
