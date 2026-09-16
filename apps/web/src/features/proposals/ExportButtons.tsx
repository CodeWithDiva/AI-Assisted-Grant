import type { ExportFormat } from '@grant/shared';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui';
import { API_BASE } from '../deadlines/api';
import { proposalsApi } from './api';

/**
 * Builds the file on the server, then sends the browser to the download URL
 * (a normal navigation, so the session cookie goes with it).
 */
export function ExportButtons({ orgId, proposalId }: { orgId: string; proposalId: string }) {
  const create = useMutation({
    mutationFn: (format: ExportFormat) => proposalsApi.createExport(orgId, proposalId, format),
    onSuccess: (record) => {
      window.location.href = `${API_BASE}/orgs/${orgId}/exports/${record.id}/download`;
    },
  });

  return (
    <>
      {(['DOCX', 'PDF'] as ExportFormat[]).map((format) => (
        <Button
          key={format}
          disabled={create.isPending}
          onClick={() => create.mutate(format)}
          title={`Download this proposal as ${format}`}
        >
          {create.isPending && create.variables === format ? 'Preparing…' : format}
        </Button>
      ))}
      {create.error ? (
        <span className="text-[12.5px] text-flag-red">{create.error.message}</span>
      ) : null}
    </>
  );
}
