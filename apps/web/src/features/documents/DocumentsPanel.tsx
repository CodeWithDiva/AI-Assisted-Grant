import { DocumentKind, type OrgDocument } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Alert, Badge, EmptyState, SectionLabel, Select, Spinner } from '../../components/ui';
import { documentsApi } from './api';

const kindLabels: Record<DocumentKind, string> = {
  PAST_PROPOSAL: 'Past proposal',
  REPORT: 'Report',
  RFP: 'Funder guidelines',
  OTHER: 'Other',
};

const statusTones: Record<OrgDocument['status'], 'neutral' | 'amber' | 'green' | 'red'> = {
  PENDING: 'neutral',
  PROCESSING: 'amber',
  READY: 'green',
  FAILED: 'red',
};

export function DocumentsPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>(DocumentKind.PAST_PROPOSAL);

  const documents = useQuery({
    queryKey: ['documents', orgId],
    queryFn: () => documentsApi.list(orgId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['documents', orgId] });

  const upload = useMutation({
    mutationFn: (file: File) => documentsApi.upload(orgId, file, kind),
    onSuccess: async () => {
      if (fileInput.current) fileInput.current.value = '';
      await refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => documentsApi.remove(orgId, documentId),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-6">
      <Alert>{upload.error?.message ?? remove.error?.message}</Alert>

      <div className="rounded-lg border border-line bg-surface px-5 py-4">
        <SectionLabel className="mb-3">Add a document</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
          <Select
            label="Type"
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
          >
            {Object.values(DocumentKind).map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </Select>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-600">
              File — PDF, Word, text or Markdown, up to 20 MB
            </span>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
              }}
              className="block w-full cursor-pointer text-[13.5px] text-ink-600 file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-line-strong file:bg-paper-dark file:px-4 file:text-[13.5px] file:font-medium file:text-ink-800 hover:file:bg-line"
            />
          </label>
        </div>
        {upload.isPending ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-600">
            <span className="size-1.5 animate-pulse rounded-full bg-accent-600" />
            Reading the file…
          </p>
        ) : null}
      </div>

      {documents.isPending ? (
        <Spinner label="Loading documents" />
      ) : documents.data?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {documents.data.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-paper">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] text-ink-900">{doc.fileName}</div>
                <div className="tabular mt-0.5 text-[12.5px] text-ink-400">
                  {kindLabels[doc.kind]} · {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB ·{' '}
                  {doc.textLength.toLocaleString()} characters read
                </div>
              </div>
              <Badge tone={statusTones[doc.status]}>{doc.status}</Badge>
              <button
                type="button"
                onClick={() => remove.mutate(doc.id)}
                className="shrink-0 text-[13px] text-ink-400 hover:text-flag-red"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No documents yet">
          Upload a past proposal or an annual report — drafts will then reuse your own wording and
          figures.
        </EmptyState>
      )}
    </div>
  );
}
