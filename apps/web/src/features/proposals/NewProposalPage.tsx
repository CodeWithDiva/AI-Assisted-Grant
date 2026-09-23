import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, LibraryBig, Lock } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  PageTitle,
  SectionLabel,
  Spinner,
} from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { usePermissions } from '../organizations/permissions';
import { templatesApi } from '../templates/api';
import { proposalsApi } from './api';

export function NewProposalPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeOrg } = useOrgs();
  const { canWrite } = usePermissions();
  const orgId = activeOrg?.id ?? '';

  const [templateId, setTemplateId] = useState(searchParams.get('templateId') ?? '');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const templates = useQuery({
    queryKey: ['templates', orgId],
    queryFn: () => templatesApi.list(orgId),
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (!templateId && templates.data?.length) {
      setTemplateId((templates.data.find((t) => !t.isLibrary) ?? templates.data[0]).id);
    }
  }, [templates.data, templateId]);

  const create = useMutation({
    mutationFn: () =>
      proposalsApi.create(orgId, {
        templateId,
        title,
        requestedAmount: amount.trim() ? Number(amount) : undefined,
      }),
    onSuccess: (proposal) => navigate(`/proposals/${proposal.id}`),
  });

  if (!activeOrg) return <NoOrganizationNotice />;
  if (!canWrite) {
    return (
      <Card>
        <EmptyState icon={Lock} title="Only owners and editors start proposals">
          You can read everything here and leave review notes. Ask an owner if you need to write.
        </EmptyState>
      </Card>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <PageTitle
        title="New proposal"
        description="Name it, choose the funder's format, and the sections are laid out for you."
      />

      <Alert>{create.error?.message}</Alert>

      <Card className="space-y-5">
        <Field
          label="Proposal title"
          required
          autoFocus
          placeholder="Girls' education programme 2027"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Field
          label="Amount to request"
          type="number"
          min={0}
          hint="Optional — it shows up in your pipeline totals."
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <SectionLabel>Funder template</SectionLabel>
          <Link to="/templates" className="text-[13px] text-accent-600 hover:underline">
            Import a new one
          </Link>
        </div>

        {templates.isPending ? (
          <Spinner label="Loading templates" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...(templates.data ?? [])]
              // The organization's own templates first: they are the ones it is applying to.
              .sort((a, b) => Number(a.isLibrary) - Number(b.isLibrary))
              .map((template) => {
                const selected = template.id === templateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    className={`relative rounded-[11px] border bg-surface p-4 text-left shadow-card transition-colors ${
                      selected
                        ? 'border-accent-600 ring-3 ring-accent-100'
                        : 'border-line hover:border-line-strong'
                    }`}
                  >
                    {selected ? (
                      <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-accent-600 text-white">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                    ) : null}
                    <div className="flex items-center gap-2 text-[12px] text-ink-400">
                      <LibraryBig className="size-3.5" />
                      {template.isLibrary
                        ? 'Starter library'
                        : (template.funderName ?? 'Your template')}
                    </div>
                    <div className="mt-1.5 pr-6 font-display text-[17px] leading-snug text-ink-900">
                      {template.name}
                    </div>
                    <div className="tabular mt-2 text-[12.5px] text-ink-600">
                      {template.sectionCount} sections
                      {template.totalWordLimit
                        ? ` · ${template.totalWordLimit.toLocaleString()} words`
                        : ''}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button
          type="submit"
          variant="primary"
          disabled={create.isPending || !templateId || !title.trim()}
        >
          {create.isPending ? 'Creating…' : 'Create proposal'}
        </Button>
        <Link to="/proposals" className="text-[13.5px] text-ink-600 hover:text-ink-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
