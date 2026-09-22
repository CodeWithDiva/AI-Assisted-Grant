import { DocumentKind, type OrgDocument } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import {
  Alert,
  Badge,
  EmptyState,
  FileDrop,
  SectionLabel,
  Select,
  Skeleton,
} from '../../components/ui';
import { documentsApi } from './api';

const kindLabels: Record<DocumentKind, string> = {
  PAST_PROPOSAL: 'Past proposal',
  REPORT: 'Report',
  RFP: 'Funder guidelines',
  OTHER: 'Other',
};

const statusLabels: Record<OrgDocument['status'], string> = {
  PENDING: 'Waiting',
  PROCESSING: 'Reading',
  READY: 'Ready',
  FAILED: 'Could not read',
};

const statusTones: Record<OrgDocument['status'], 'neutral' | 'amber' | 'green' | 'red'> = {
  PENDING: 'neutral',
  PROCESSING: 'amber',
  READY: 'green',
  FAILED: 'red',
};

export function DocumentsPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DocumentKind>(DocumentKind.PAST_PROPOSAL);
  // Deleting is two clicks: the first asks, the second deletes.
  const [confirming, setConfirming] = useState<string | null>(null);

  const documents = useQuery({
    queryKey: ['documents', orgId],
    queryFn: () => documentsApi.list(orgId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['documents', orgId] });

  const upload = useMutation({
    mutationFn: (file: File) => documentsApi.upload(orgId, file, kind),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => documentsApi.remove(orgId, documentId),
    onSuccess: async () => {
      setConfirming(null);
      await refresh();
    },
  });

  return (
    <div className="space-y-6">
      <Alert>{upload.error?.message ?? remove.error?.message}</Alert>

      <div className="rounded-lg border border-line bg-surface px-5 py-4">
        <SectionLabel className="mb-3">Add a document</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
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
          <FileDrop
            accept=".pdf,.docx,.txt,.md"
            hint="PDF, Word, text or Markdown, up to 20 MB. The text is read straight away."
            busy={upload.isPending}
            busyLabel="Uploading and reading the file"
            onFile={(file) => upload.mutate(file)}
          />
        </div>
      </div>

      {documents.isPending ? (
        <div className="space-y-px overflow-hidden rounded-lg border border-line bg-surface">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="size-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : documents.data?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {documents.data.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-paper">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-paper-dark text-ink-400">
                <FileText className="size-[18px]" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] text-ink-900">{doc.fileName}</div>
                <div className="tabular mt-0.5 text-[12.5px] text-ink-400">
                  {kindLabels[doc.kind]} · {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB ·{' '}
                  {doc.textLength.toLocaleString()} characters read
                </div>
              </div>
              <Badge tone={statusTones[doc.status]}>{statusLabels[doc.status]}</Badge>
              {confirming === doc.id ? (
                <span className="flex shrink-0 items-center gap-2 text-[13px]">
                  <button
                    type="button"
                    onClick={() => remove.mutate(doc.id)}
                    disabled={remove.isPending}
                    className="font-medium text-flag-red hover:underline"
                  >
                    {remove.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="text-ink-400 hover:text-ink-900"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(doc.id)}
                  className="shrink-0 text-[13px] text-ink-400 hover:text-flag-red"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={FileText} title="No documents yet">
          Upload a past proposal or an annual report — drafts will then reuse your own wording and
          figures.
        </EmptyState>
      )}
    </div>
  );
}
