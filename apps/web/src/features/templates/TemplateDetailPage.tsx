import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, Badge, SectionLabel, Spinner } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { templatesApi } from './api';

export function TemplateDetailPage() {
  const { templateId = '' } = useParams();
  const { activeOrg } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const template = useQuery({
    queryKey: ['templates', orgId, templateId],
    queryFn: () => templatesApi.get(orgId, templateId),
    enabled: Boolean(orgId && templateId),
  });

  const remove = useMutation({
    mutationFn: () => templatesApi.remove(orgId, templateId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      navigate('/templates');
    },
  });

  if (!activeOrg) return <NoOrganizationNotice />;
  if (template.isPending) return <Spinner />;
  if (template.isError) return <Alert>{template.error.message}</Alert>;

  const data = template.data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/templates" className="text-[13px] text-ink-400 hover:text-ink-900">
        ← Funder templates
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="eyebrow mb-2 flex items-center gap-2">
            {data.funderName ?? 'No funder recorded'}
            {data.isLibrary ? <Badge>Library</Badge> : null}
          </div>
          <h1 className="font-display text-[27px] leading-tight text-ink-900">{data.name}</h1>
          {data.description ? <p className="mt-1.5 text-ink-600">{data.description}</p> : null}
        </div>
        <Link
          to={`/proposals/new?templateId=${data.id}`}
          className="inline-flex h-9 items-center rounded-md border border-accent-700 bg-accent-600 px-4 text-[13.5px] font-medium text-white hover:bg-accent-700"
        >
          Start a proposal
        </Link>
      </header>

      <section className="mt-7">
        <SectionLabel className="mb-2.5">
          Sections ({data.sectionCount}
          {data.totalWordLimit ? ` · ${data.totalWordLimit.toLocaleString()} words` : ''})
        </SectionLabel>
        <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {data.sections.map((section) => (
            <li key={section.id} className="flex gap-4 px-4 py-3.5">
              <span className="tabular w-6 shrink-0 pt-0.5 font-mono text-[12px] text-ink-300">
                {String(section.order).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] text-ink-900">{section.title}</span>
                  <span className="tabular shrink-0 font-mono text-[11.5px] text-ink-400">
                    {section.wordLimit ? `${section.wordLimit} words` : 'no limit'}
                    {section.required ? '' : ' · optional'}
                  </span>
                </div>
                {section.instructions ? (
                  <p className="mt-1 text-[13.5px] text-ink-600">{section.instructions}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {data.eligibility.length ? (
        <section className="mt-7">
          <SectionLabel className="mb-2.5">Eligibility</SectionLabel>
          <ul className="space-y-1.5 text-[14px] text-ink-800">
            {data.eligibility.map((item, index) => (
              <li key={index} className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent-600" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.evaluationCriteria.length ? (
        <section className="mt-7">
          <SectionLabel className="mb-2.5">How it is scored</SectionLabel>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {data.evaluationCriteria.map((criterion, index) => (
              <li key={index} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14.5px] font-medium text-ink-900">{criterion.name}</span>
                  {criterion.weight ? (
                    <span className="tabular shrink-0 font-mono text-[11.5px] text-ink-400">
                      {criterion.weight}%
                    </span>
                  ) : null}
                </div>
                {criterion.description ? (
                  <p className="mt-1 text-[13.5px] text-ink-600">{criterion.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 border-t border-line pt-4">
        {!data.isLibrary ? (
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="text-[13px] text-ink-400 hover:text-flag-red"
          >
            Delete this template
          </button>
        ) : (
          <p className="text-[13px] text-ink-400">
            A starter template from the library — copy it by importing your funder&apos;s own
            guidelines.
          </p>
        )}
      </div>
    </div>
  );
}
