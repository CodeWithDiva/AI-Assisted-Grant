import { OrganizationType, type CreateOrganizationInput } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Field, FormError, SubmitButton } from '../../components/form';
import { organizationsApi } from './api';

const typeLabels: Record<string, string> = {
  NONPROFIT: 'Nonprofit',
  STARTUP: 'Startup',
  OTHER: 'Other',
};

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const organizations = useQuery({ queryKey: ['orgs'], queryFn: organizationsApi.list });

  const [form, setForm] = useState<CreateOrganizationInput>({
    name: '',
    type: OrganizationType.NONPROFIT,
  });

  const create = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: async () => {
      setForm({ name: '', type: OrganizationType.NONPROFIT });
      await queryClient.invalidateQueries({ queryKey: ['orgs'] });
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
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <p className="mt-1 text-slate-600">
        Every proposal belongs to an organization. Create one to get started.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Yours</h2>
        {organizations.isPending ? (
          <p className="mt-2 text-slate-500">Loading…</p>
        ) : organizations.data?.length ? (
          <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {organizations.data.map((org) => (
              <li key={org.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link to={`/organization/${org.id}`} className="font-medium hover:underline">
                    {org.name}
                  </Link>
                  <div className="text-sm text-slate-500">
                    {typeLabels[org.type] ?? org.type}
                    {org.country ? ` · ${org.country}` : ''}
                  </div>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {org.role}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-slate-500">No organizations yet.</p>
        )}
      </section>

      <section className="mt-8 max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Create an organization</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <FormError message={create.error?.message} />
          <Field
            label="Name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as CreateOrganizationInput['type'] })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {Object.values(OrganizationType).map((value) => (
                <option key={value} value={value}>
                  {typeLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Country (optional)"
            value={form.country ?? ''}
            onChange={(event) => setForm({ ...form, country: event.target.value })}
          />
          <Field
            label="Website (optional)"
            type="url"
            placeholder="https://example.org"
            value={form.website ?? ''}
            onChange={(event) => setForm({ ...form, website: event.target.value })}
          />
          <SubmitButton pending={create.isPending}>Create organization</SubmitButton>
        </form>
      </section>
    </div>
  );
}
