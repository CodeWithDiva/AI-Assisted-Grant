import type { ExportFormat } from '@grant/shared';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Download, FileText, FileType2 } from 'lucide-react';
import { Button, Menu } from '../../components/ui';
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
    <div className="flex items-center gap-2">
      <Menu
        align="right"
        width="w-64"
        trigger={() => (
          <Button variant="primary" icon={Download} disabled={create.isPending}>
            {create.isPending ? 'Preparing…' : 'Export'}
            <ChevronDown className="-mr-1 size-3.5 opacity-70" />
          </Button>
        )}
        items={[
          {
            label: 'Word document',
            description: '.docx — edit before sending',
            icon: FileText,
            onSelect: () => create.mutate('DOCX'),
          },
          {
            label: 'PDF',
            description: 'Ready to upload to a funder portal',
            icon: FileType2,
            onSelect: () => create.mutate('PDF'),
          },
        ]}
      />
      {create.error ? (
        <span className="text-[12.5px] text-flag-red">{create.error.message}</span>
      ) : null}
    </div>
  );
}
