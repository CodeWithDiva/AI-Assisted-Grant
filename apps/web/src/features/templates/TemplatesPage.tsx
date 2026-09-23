import type { FunderTemplateSummary } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import { FileUp, LibraryBig, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, PageTitle, SectionLabel, Spinner } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { templatesApi } from './api';
import { ImportRfpPanel } from './ImportRfpPanel';
import { usePermissions } from '../organizations/permissions';

export function TemplatesPage() {
  const { activeOrg, isLoading } = useOrgs();
  const { canWrite } = usePermissions();
  const [importing, setImporting] = useState(false);
  const orgId = activeOrg?.id ?? '';

  const templates = useQuery({
    queryKey: ['templates', orgId],
    queryFn: () => templatesApi.list(orgId),
    enabled: Boolean(orgId),
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const own = (templates.data ?? []).filter((template) => !template.isLibrary);
  const library = (templates.data ?? []).filter((template) => template.isLibrary);

  return (
    <div className="space-y-7">
      <PageTitle
        title="Funder templates"
        description="The sections, word limits and scoring criteria a funder expects — the skeleton every proposal is built on."
        actions={
          !importing && canWrite ? (
            <Button variant="primary" icon={FileUp} onClick={() => setImporting(true)}>
              Import from RFP
            </Button>
          ) : null
        }
      />

      {importing ? (
        <div className="animate-rise">
          <ImportRfpPanel orgId={orgId} onClose={() => setImporting(false)} />
        </div>
      ) : null}

      {templates.isPending ? <Spinner label="Loading templates" /> : null}

      <section>
        <SectionLabel className="mb-3">Your templates</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {own.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
          {!importing ? (
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="flex min-h-[168px] flex-col items-start justify-between rounded-[11px] border border-accent-100 bg-accent-50 p-5 text-left transition-colors hover:border-accent-300"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-accent-600 text-white">
                <FileUp className="size-[18px]" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block font-display text-[18px] text-ink-900">
                  Import a funder&apos;s guidelines
                </span>
                <span className="mt-1 block text-[13px] text-ink-600">
                  Upload the RFP; the AI reads out its sections and limits for you to check.
                </span>
              </span>
            </button>
          ) : null}
        </div>
      </section>

      <section>
        <SectionLabel className="mb-3">Starter library</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {library.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplateCard({ template }: { template: FunderTemplateSummary }) {
  return (
    <Link
      to={`/templates/${template.id}`}
      className="card group flex min-h-[168px] flex-col p-5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-center gap-2 text-[12px] text-ink-400">
        {template.isLibrary ? (
          <LibraryBig className="size-3.5" strokeWidth={1.8} />
        ) : (
          <ScrollText className="size-3.5" strokeWidth={1.8} />
        )}
        <span className="truncate">
          {template.isLibrary ? 'Starter library' : (template.funderName ?? 'Custom')}
        </span>
      </div>
      <div className="mt-2 font-display text-[18px] leading-snug text-ink-900 group-hover:text-accent-700">
        {template.name}
      </div>
      {template.description ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-600">{template.description}</p>
      ) : null}
      <div className="tabular mt-auto flex gap-4 border-t border-line pt-3 text-[12.5px] text-ink-600">
        <span>
          <strong className="font-semibold text-ink-900">{template.sectionCount}</strong> sections
        </span>
        {template.totalWordLimit ? (
          <span>
            <strong className="font-semibold text-ink-900">
              {template.totalWordLimit.toLocaleString()}
            </strong>{' '}
            words
          </span>
        ) : null}
      </div>
    </Link>
  );
}
