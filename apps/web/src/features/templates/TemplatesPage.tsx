import type { FunderTemplateSummary } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Row,
  RowList,
  SectionLabel,
  Spinner,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { templatesApi } from './api';
import { ImportRfpPanel } from './ImportRfpPanel';

export function TemplatesPage() {
  const { activeOrg, isLoading } = useOrgs();
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Formats"
        title="Funder templates"
        description="A template holds the sections, word limits and scoring criteria one funder expects."
        actions={
          !importing ? (
            <Button variant="primary" onClick={() => setImporting(true)}>
              Import from RFP
            </Button>
          ) : null
        }
      />

      {importing ? (
        <div className="mt-6">
          <ImportRfpPanel orgId={orgId} onClose={() => setImporting(false)} />
        </div>
      ) : null}

      <section className="mt-8">
        <SectionLabel className="mb-2.5">Your templates</SectionLabel>
        {own.length ? (
          <RowList>
            {own.map((template) => (
              <TemplateRow key={template.id} template={template} />
            ))}
          </RowList>
        ) : (
          <EmptyState
            title="No templates of your own yet"
            action={
              !importing ? (
                <Button variant="primary" onClick={() => setImporting(true)}>
                  Import the funder&apos;s guidelines
                </Button>
              ) : undefined
            }
          >
            Upload an RFP and the AI reads out its sections, limits and criteria for you to check.
          </EmptyState>
        )}
      </section>

      <section className="mt-8">
        <SectionLabel className="mb-2.5">Starter library</SectionLabel>
        {library.length ? (
          <RowList>
            {library.map((template) => (
              <TemplateRow key={template.id} template={template} />
            ))}
          </RowList>
        ) : (
          <p className="text-ink-400">No library templates.</p>
        )}
      </section>
    </div>
  );
}

function TemplateRow({ template }: { template: FunderTemplateSummary }) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <Link
          to={`/templates/${template.id}`}
          className="font-display text-[17px] text-ink-900 hover:underline"
        >
          {template.name}
        </Link>
        <div className="tabular mt-1 truncate text-[12.5px] text-ink-400">
          {template.funderName ? `${template.funderName} · ` : ''}
          {template.sectionCount} sections
          {template.totalWordLimit
            ? ` · ${template.totalWordLimit.toLocaleString()} words in total`
            : ''}
        </div>
      </div>
      {template.isLibrary ? <Badge>Library</Badge> : null}
    </Row>
  );
}
