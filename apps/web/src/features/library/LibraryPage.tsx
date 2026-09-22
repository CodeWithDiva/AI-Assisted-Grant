import {
  countWords,
  LIBRARY_CATEGORY_LABELS,
  LibraryCategory,
  plainText,
  type LibraryBlockView,
} from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Check, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  PageTitle,
  Select,
  Skeleton,
  Spinner,
  TextArea,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { libraryApi } from './api';

type Filter = 'ALL' | LibraryCategory;

interface DraftPassage {
  id?: string;
  title: string;
  category: LibraryCategory;
  body: string;
}

/** Passages most organizations reuse; offered as starting points in an empty library. */
const SUGGESTIONS: { title: string; category: LibraryCategory }[] = [
  { title: 'Organization history', category: 'ORGANIZATION' },
  { title: 'Monitoring and evaluation approach', category: 'IMPACT' },
  { title: 'Leadership team', category: 'TEAM' },
  { title: 'Safeguarding policy', category: 'POLICIES' },
  { title: 'Financial management', category: 'FINANCE' },
];

export function LibraryPage() {
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<DraftPassage | null>(null);

  const library = useQuery({
    queryKey: ['library', orgId],
    queryFn: () => libraryApi.list(orgId),
    enabled: Boolean(orgId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['library', orgId] });

  const save = useMutation({
    mutationFn: (passage: DraftPassage) => {
      const body = { title: passage.title, category: passage.category, body: passage.body };
      return passage.id
        ? libraryApi.update(orgId, passage.id, body)
        : libraryApi.create(orgId, body);
    },
    onSuccess: async () => {
      setDraft(null);
      await refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (blockId: string) => libraryApi.remove(orgId, blockId),
    onSuccess: refresh,
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const all = library.data ?? [];
  const query = search.trim().toLowerCase();
  const visible = all.filter(
    (block) =>
      (filter === 'ALL' || block.category === filter) &&
      (!query ||
        block.title.toLowerCase().includes(query) ||
        block.body.toLowerCase().includes(query)),
  );
  const countOf = (category: LibraryCategory) =>
    all.filter((block) => block.category === category).length;

  const startNew = (preset?: Partial<DraftPassage>) => {
    save.reset();
    setDraft({ title: '', category: filter === 'ALL' ? 'OTHER' : filter, body: '', ...preset });
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Content library"
        description="Approved passages you reuse from proposal to proposal: history, team, methods, policies. Insert them while writing; the AI draws on them too, so every application tells the same story."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => startNew()}>
            New passage
          </Button>
        }
      />

      {draft ? (
        <PassageForm
          draft={draft}
          saving={save.isPending}
          error={save.error?.message}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={() => save.mutate(draft)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search passages"
              aria-label="Search passages"
              className="w-full rounded-md border border-line-strong bg-surface py-2 pr-3 pl-9 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-accent-500 focus:ring-3 focus:ring-accent-100 focus:outline-none"
            />
          </label>

          <Select
            label="Category"
            className="lg:hidden"
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            <option value="ALL">All ({all.length})</option>
            {Object.values(LibraryCategory).map((category) => (
              <option key={category} value={category}>
                {LIBRARY_CATEGORY_LABELS[category]} ({countOf(category)})
              </option>
            ))}
          </Select>

          <nav className="hidden lg:block" aria-label="Categories">
            {(['ALL', ...Object.values(LibraryCategory)] as Filter[]).map((category) => {
              const active = filter === category;
              const count = category === 'ALL' ? all.length : countOf(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilter(category)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13.5px] transition-colors ${
                    active
                      ? 'bg-accent-50 font-medium text-ink-900'
                      : 'text-ink-600 hover:bg-paper-dark hover:text-ink-900'
                  }`}
                >
                  {category === 'ALL' ? 'All passages' : LIBRARY_CATEGORY_LABELS[category]}
                  <span className="tabular font-mono text-[11.5px] text-ink-400">{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <Alert>{remove.error?.message}</Alert>
          {library.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-[132px] rounded-[11px]" />
              ))}
            </div>
          ) : visible.length ? (
            <ul className="space-y-3">
              {visible.map((block) => (
                <PassageCard
                  key={block.id}
                  block={block}
                  deleting={remove.isPending && remove.variables === block.id}
                  onEdit={() => {
                    save.reset();
                    setDraft({
                      id: block.id,
                      title: block.title,
                      category: block.category,
                      body: block.body,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={() => remove.mutate(block.id)}
                />
              ))}
            </ul>
          ) : all.length ? (
            <Card>
              <EmptyState compact icon={Search} title="Nothing matches">
                Try another word, or look under All passages.
              </EmptyState>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={BookMarked}
                title="Start your library"
                action={
                  <div className="flex max-w-lg flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion.title}
                        type="button"
                        onClick={() => startNew(suggestion)}
                        className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] text-ink-800 hover:border-accent-500 hover:bg-accent-50"
                      >
                        + {suggestion.title}
                      </button>
                    ))}
                  </div>
                }
              >
                Save the paragraphs you write again and again. Here are the ones most funders ask
                for:
              </EmptyState>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PassageForm({
  draft,
  saving,
  error,
  onChange,
  onCancel,
  onSave,
}: {
  draft: DraftPassage;
  saving: boolean;
  error?: string;
  onChange: (draft: DraftPassage) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="eyebrow">{draft.id ? 'Edit passage' : 'New passage'}</div>
        <Alert>{error}</Alert>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field
            label="Title"
            required
            autoFocus
            placeholder="e.g. Organization history"
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
          <Select
            label="Category"
            value={draft.category}
            onChange={(event) =>
              onChange({ ...draft, category: event.target.value as LibraryCategory })
            }
          >
            {Object.values(LibraryCategory).map((category) => (
              <option key={category} value={category}>
                {LIBRARY_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </div>
        <TextArea
          label="Passage"
          required
          rows={8}
          hint={`${countWords(draft.body)} words. **bold**, *italic* and lists work as in the editor.`}
          value={draft.body}
          onChange={(event) => onChange({ ...draft, body: event.target.value })}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Add to library'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PassageCard({
  block,
  deleting,
  onEdit,
  onDelete,
}: {
  block: LibraryBlockView;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the text is still selectable.
    }
  };

  return (
    <li className="card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[17px] leading-snug text-ink-900">{block.title}</h3>
          <div className="mt-1">
            <Badge tone="neutral">{LIBRARY_CATEGORY_LABELS[block.category]}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton
            icon={copied ? Check : Copy}
            label={copied ? 'Copied' : 'Copy text'}
            onClick={copy}
          />
          <IconButton icon={Pencil} label="Edit" onClick={onEdit} />
          {confirming ? (
            <span className="ml-1 flex items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="font-medium text-flag-red hover:underline"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-ink-400 hover:text-ink-900"
              >
                Keep
              </button>
            </span>
          ) : (
            <IconButton
              icon={Trash2}
              label="Delete"
              tone="danger"
              onClick={() => setConfirming(true)}
            />
          )}
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-600">
        {plainText(block.body)}
      </p>
      <div className="tabular mt-3 font-mono text-[11.5px] text-ink-400">
        {block.wordCount} words · used {block.usageCount} time{block.usageCount === 1 ? '' : 's'}
        {block.createdByName ? ` · by ${block.createdByName}` : ''} · updated{' '}
        {new Date(block.updatedAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </div>
    </li>
  );
}
