import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Card, Field, PageHeader, Select } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { templatesApi } from '../templates/api';
import { proposalsApi } from './api';

export function NewProposalPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeOrg } = useOrgs();
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
    if (!templateId && templates.data?.length) setTemplateId(templates.data[0].id);
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

  const selected = templates.data?.find((template) => template.id === templateId);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/proposals" className="text-[13px] text-ink-400 hover:text-ink-900">
        ← Proposals
      </Link>
      <div className="mt-3">
        <PageHeader
          title="New proposal"
          description="The template's sections are copied onto the proposal, so later template edits leave it alone."
        />
      </div>

      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <Alert>{create.error?.message}</Alert>

          <Field
            label="Proposal title"
            required
            placeholder="Girls' education programme 2027"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <div>
            <Select
              label="Funder template"
              value={templateId}
              required
              onChange={(event) => setTemplateId(event.target.value)}
            >
              <option value="">Select a template…</option>
              {(templates.data ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.isLibrary ? ' — starter library' : ''}
                </option>
              ))}
            </Select>
            {selected ? (
              <p className="tabular mt-1.5 text-[12.5px] text-ink-400">
                {selected.sectionCount} sections
                {selected.totalWordLimit
                  ? ` · ${selected.totalWordLimit.toLocaleString()} words in total`
                  : ' · no word limits recorded'}
              </p>
            ) : null}
          </div>

          <Field
            label="Amount requested"
            type="number"
            min={0}
            hint="Optional — you can add it later."
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <div className="flex items-center gap-3 border-t border-line pt-5">
            <Button type="submit" variant="primary" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create proposal'}
            </Button>
            <Link to="/proposals" className="text-[13.5px] text-ink-600 hover:text-ink-900">
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
