import { DocumentKind, type CreateTemplateInput, type ExtractedTemplate } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Field, SectionLabel } from '../../components/ui';
import { documentsApi } from '../documents/api';
import { templatesApi } from './api';

type Draft = CreateTemplateInput & { sourceDocumentId?: string };

function toDraft(extracted: ExtractedTemplate, documentId: string): Draft {
  return {
    name: extracted.programName ?? extracted.funderName ?? 'Imported template',
    funderName: extracted.funderName ?? undefined,
    description: extracted.description ?? undefined,
    sourceDocumentId: documentId,
    eligibility: extracted.eligibility,
    evaluationCriteria: extracted.evaluationCriteria.map((criterion) => ({
      name: criterion.name,
      weight: criterion.weight ?? undefined,
      description: criterion.description ?? undefined,
    })),
    amountMin: extracted.amountMin ?? undefined,
    amountMax: extracted.amountMax ?? undefined,
    currency: extracted.currency ?? undefined,
    sections: extracted.sections.map((section) => ({
      title: section.title,
      instructions: section.instructions ?? undefined,
      wordLimit: section.wordLimit ?? undefined,
      charLimit: section.charLimit ?? undefined,
      required: section.required,
    })),
  };
}

export function ImportRfpPanel({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const documents = useQuery({
    queryKey: ['documents', orgId],
    queryFn: () => documentsApi.list(orgId),
  });
  const rfps = (documents.data ?? []).filter(
    (doc) => doc.kind === DocumentKind.RFP && doc.status === 'READY',
  );

  const uploadAndExtract = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await documentsApi.upload(orgId, file, DocumentKind.RFP);
      await queryClient.invalidateQueries({ queryKey: ['documents', orgId] });
      return { extracted: await templatesApi.extract(orgId, uploaded.id), documentId: uploaded.id };
    },
    onSuccess: ({ extracted, documentId }) => setDraft(toDraft(extracted, documentId)),
  });

  const extractExisting = useMutation({
    mutationFn: async (documentId: string) => ({
      extracted: await templatesApi.extract(orgId, documentId),
      documentId,
    }),
    onSuccess: ({ extracted, documentId }) => setDraft(toDraft(extracted, documentId)),
  });

  const save = useMutation({
    mutationFn: (body: CreateTemplateInput) => templatesApi.create(orgId, body),
    onSuccess: async (template) => {
      await queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      navigate(`/templates/${template.id}`);
    },
  });

  const busy = uploadAndExtract.isPending || extractExisting.isPending;
  const error =
    uploadAndExtract.error?.message ?? extractExisting.error?.message ?? save.error?.message;

  if (draft) {
    return (
      <DraftReview
        draft={draft}
        onChange={setDraft}
        onCancel={() => setDraft(null)}
        onSave={() => save.mutate(draft)}
        saving={save.isPending}
        error={error}
      />
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <SectionLabel>Step 1 of 2</SectionLabel>
          <h2 className="mt-1.5 font-display text-[19px] text-ink-900">
            Give the AI the funder&apos;s guidelines
          </h2>
          <p className="mt-1 max-w-xl text-[13.5px] text-ink-600">
            It reads out the required sections, word limits, eligibility rules and scoring criteria.
            You check them before anything is saved.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] text-ink-400 hover:text-ink-900"
        >
          Close
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        <Alert>{error}</Alert>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-600">
            Upload a PDF, Word, text or Markdown file
          </span>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadAndExtract.mutate(file);
            }}
            className="block w-full cursor-pointer text-[13.5px] text-ink-600 file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-accent-700 file:bg-accent-600 file:px-4 file:text-[13.5px] file:font-medium file:text-white hover:file:bg-accent-700"
          />
        </label>

        {rfps.length > 0 ? (
          <div>
            <SectionLabel className="mb-2">Or use guidelines you already uploaded</SectionLabel>
            <ul className="divide-y divide-line rounded-md border border-line">
              {rfps.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-800">
                    {doc.fileName}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => extractExisting.mutate(doc.id)}
                    className="shrink-0 text-[13px] text-accent-600 hover:underline disabled:opacity-50"
                  >
                    Read with AI
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {busy ? (
          <p className="flex items-center gap-2 text-[13.5px] text-ink-600">
            <span className="size-1.5 animate-pulse rounded-full bg-accent-600" />
            Reading the guidelines — this usually takes under a minute.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DraftReview({
  draft,
  onChange,
  onCancel,
  onSave,
  saving,
  error,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error?: string;
}) {
  const setSection = (index: number, patch: Partial<Draft['sections'][number]>) => {
    const sections = [...draft.sections];
    sections[index] = { ...sections[index], ...patch };
    onChange({ ...draft, sections });
  };

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <SectionLabel>Step 2 of 2</SectionLabel>
        <h2 className="mt-1.5 font-display text-[19px] text-ink-900">Check what the AI found</h2>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-600">
          Compare these against the funder&apos;s document. Fix anything that is wrong — the word
          limits especially — then save.
        </p>
      </div>

      <div className="space-y-6 px-5 py-5">
        <Alert>{error}</Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Template name"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
          />
          <Field
            label="Funder"
            value={draft.funderName ?? ''}
            onChange={(event) => onChange({ ...draft, funderName: event.target.value })}
          />
        </div>

        <div>
          <SectionLabel className="mb-2">Sections ({draft.sections.length})</SectionLabel>
          <div className="space-y-2.5">
            {draft.sections.map((section, index) => (
              <div key={index} className="rounded-md border border-line p-3">
                <div className="flex gap-2">
                  <span className="tabular w-6 shrink-0 pt-2 font-mono text-[12px] text-ink-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <input
                    value={section.title}
                    onChange={(event) => setSection(index, { title: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-line-strong px-3 py-2 text-[14px] focus:border-accent-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="words"
                    value={section.wordLimit ?? ''}
                    onChange={(event) =>
                      setSection(index, {
                        wordLimit: event.target.value ? Number(event.target.value) : undefined,
                      })
                    }
                    className="tabular w-24 shrink-0 rounded-md border border-line-strong px-3 py-2 text-[14px] focus:border-accent-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...draft, sections: draft.sections.filter((_, i) => i !== index) })
                    }
                    className="shrink-0 px-1 text-[13px] text-ink-400 hover:text-flag-red"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Instructions from the funder"
                  value={section.instructions ?? ''}
                  onChange={(event) => setSection(index, { instructions: event.target.value })}
                  className="mt-2 ml-8 w-[calc(100%-2rem)] resize-y rounded-md border border-line px-3 py-2 text-[13.5px] text-ink-600 focus:border-accent-600 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...draft,
                sections: [...draft.sections, { title: 'New section', required: true }],
              })
            }
            className="mt-2.5 text-[13px] text-accent-600 hover:underline"
          >
            + Add a section
          </button>
        </div>

        {draft.eligibility?.length ? (
          <div>
            <SectionLabel className="mb-2">Eligibility found</SectionLabel>
            <ul className="space-y-1.5 text-[13.5px] text-ink-600">
              {draft.eligibility.map((item, index) => (
                <li key={index} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-line-strong" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save template'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[13.5px] text-ink-600 hover:text-ink-900"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
