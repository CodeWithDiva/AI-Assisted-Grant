import { OrganizationType, type CreateOrganizationInput } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  PageHeader,
  Row,
  RowList,
  SectionLabel,
  Select,
} from '../../components/ui';
import { organizationsApi } from './api';
import { useOrgs } from './OrgProvider';

const typeLabels: Record<string, string> = {
  NONPROFIT: 'Nonprofit',
  STARTUP: 'Startup',
  OTHER: 'Other',
};

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const { setActiveOrgId } = useOrgs();
  const organizations = useQuery({ queryKey: ['orgs'], queryFn: organizationsApi.list });

  const [form, setForm] = useState<CreateOrganizationInput>({
    name: '',
    type: OrganizationType.NONPROFIT,
  });

  const create = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: async (organization) => {
      setForm({ name: '', type: OrganizationType.NONPROFIT });
      await queryClient.invalidateQueries({ queryKey: ['orgs'] });
      setActiveOrgId(organization.id);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({
      ...form,
      country: form.country?.trim() ? form.country : undefined,
      website: form.website?.trim() ? form.website : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Workspace"
        title="Organizations"
        description="Every proposal, template and deadline belongs to one. Grant writers can keep one per client."
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionLabel className="mb-2.5">Yours</SectionLabel>
          {organizations.isPending ? (
            <p className="text-ink-400">Loading…</p>
          ) : organizations.data?.length ? (
            <RowList>
              {organizations.data.map((org) => (
                <Row key={org.id}>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/organization/${org.id}`}
                      className="font-display text-[17px] text-ink-900 hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="mt-0.5 truncate text-[12.5px] text-ink-400">
                      {typeLabels[org.type] ?? org.type}
                      {org.country ? ` · ${org.country}` : ''}
                    </div>
                  </div>
                  <Badge tone={org.role === 'OWNER' ? 'green' : 'neutral'}>{org.role}</Badge>
                </Row>
              ))}
            </RowList>
          ) : (
            <EmptyState title="Nothing here yet">
              Create your first organization on the right — it takes a name and a type.
            </EmptyState>
          )}
        </section>

        <section>
          <SectionLabel className="mb-2.5">Create an organization</SectionLabel>
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-lg border border-line bg-surface p-5"
          >
            <Alert>{create.error?.message}</Alert>
            <Field
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as CreateOrganizationInput['type'] })
              }
            >
              {Object.values(OrganizationType).map((value) => (
                <option key={value} value={value}>
                  {typeLabels[value]}
                </option>
              ))}
            </Select>
            <Field
              label="Country"
              value={form.country ?? ''}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
            <Field
              label="Website"
              type="url"
              placeholder="https://example.org"
              value={form.website ?? ''}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
            />
            <Button type="submit" variant="primary" disabled={create.isPending} className="w-full">
              {create.isPending ? 'Creating…' : 'Create organization'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
