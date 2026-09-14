import { DocumentKind, type OrgDocument } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FormError } from '../../components/form';
import { documentsApi } from './api';

const kindLabels: Record<DocumentKind, string> = {
  PAST_PROPOSAL: 'Past proposal',
  REPORT: 'Report',
  RFP: 'Funder guidelines / RFP',
  OTHER: 'Other',
};

const statusStyles: Record<OrgDocument['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-amber-50 text-amber-700',
  READY: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
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
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Upload past proposals, annual reports and funder guidelines (PDF, Word, text — up to 20 MB).
        The text is read out of each file so the AI can reuse your own wording.
      </p>

      <FormError message={upload.error?.message ?? remove.error?.message} />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Document type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {Object.values(DocumentKind).map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">File</span>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
            }}
            className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
        </label>
        {upload.isPending ? <span className="text-sm text-slate-500">Reading file…</span> : null}
      </div>

      {documents.isPending ? (
        <p className="text-slate-500">Loading documents…</p>
      ) : documents.data?.length ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {documents.data.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{doc.fileName}</div>
                <div className="text-sm text-slate-500">
                  {kindLabels[doc.kind]} · {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB ·{' '}
                  {doc.textLength.toLocaleString()} characters read
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs ${statusStyles[doc.status]}`}>
                  {doc.status}
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate(doc.id)}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">No documents uploaded yet.</p>
      )}
    </div>
  );
}
