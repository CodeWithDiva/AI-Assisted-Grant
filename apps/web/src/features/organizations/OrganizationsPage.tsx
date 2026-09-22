import { OrganizationType, type CreateOrganizationInput } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  PageTitle,
  Select,
  Spinner,
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
  const navigate = useNavigate();
  const { activeOrg, setActiveOrgId } = useOrgs();
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
      navigate('/profile');
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

  const hasOrgs = Boolean(organizations.data?.length);

  return (
    <div className="space-y-6">
      <PageTitle
        title={hasOrgs ? 'Organizations' : 'Create your organization'}
        description={
          hasOrgs
            ? 'Switch between the organizations you belong to, or add another. Grant writers can keep one per client.'
            : 'Proposals, templates and deadlines all belong to an organization — your nonprofit, your company, or a client.'
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {hasOrgs ? (
          <Card padded={false} className="h-fit">
            <CardHeader title="Yours" />
            {organizations.isPending ? (
              <div className="px-5">
                <Spinner />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {organizations.data!.map((org) => {
                  const active = org.id === activeOrg?.id;
                  return (
                    <li key={org.id} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-night-900 font-display text-[17px] text-brass">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium text-ink-900">
                          {org.name}
                        </div>
                        <div className="truncate text-[12.5px] text-ink-400">
                          {typeLabels[org.type] ?? org.type}
                          {org.country ? ` · ${org.country}` : ''}
                        </div>
                      </div>
                      <Badge tone={org.role === 'OWNER' ? 'green' : 'neutral'}>
                        {org.role ? org.role.charAt(0) + org.role.slice(1).toLowerCase() : 'Member'}
                      </Badge>
                      {active ? (
                        <span className="flex w-24 items-center justify-end gap-1.5 text-[13px] text-accent-600">
                          <Check className="size-4" /> Current
                        </span>
                      ) : (
                        <Button size="sm" className="w-24" onClick={() => setActiveOrgId(org.id)}>
                          Switch
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : null}

        <Card className={hasOrgs ? 'h-fit' : 'max-w-xl'}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="text-[14px] font-medium text-ink-900">
              {hasOrgs ? 'Add an organization' : 'Organization details'}
            </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Country"
                value={form.country ?? ''}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
              />
              <Field
                label="Website"
                type="url"
                placeholder="https://"
                value={form.website ?? ''}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
              />
            </div>
            <Button type="submit" variant="primary" disabled={create.isPending} className="w-full">
              {create.isPending ? 'Creating…' : 'Create organization'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
