import type { OrgProfileInput, Program } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, FormError, SubmitButton } from '../../components/form';
import { profileApi } from './api';

const emptyProfile: OrgProfileInput = {
  mission: '',
  vision: '',
  beneficiaries: '',
  teamSummary: '',
  currency: 'USD',
  programs: [],
};

export function ProfileForm({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ['profile', orgId],
    queryFn: () => profileApi.get(orgId),
  });

  const [form, setForm] = useState<OrgProfileInput>(emptyProfile);
  const [budget, setBudget] = useState('');

  // Fill the form once the saved profile arrives.
  useEffect(() => {
    if (!profile.data) return;
    setForm({ ...emptyProfile, ...profile.data });
    setBudget(profile.data.annualBudget ? String(profile.data.annualBudget) : '');
  }, [profile.data]);

  const save = useMutation({
    mutationFn: (body: OrgProfileInput) => profileApi.update(orgId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', orgId] });
    },
  });

  const setProgram = (index: number, patch: Partial<Program>) => {
    const programs = [...(form.programs ?? [])];
    programs[index] = { ...programs[index], ...patch };
    setForm({ ...form, programs });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = (value?: string) => (value?.trim() ? value.trim() : undefined);
    save.mutate({
      mission: trimmed(form.mission),
      vision: trimmed(form.vision),
      beneficiaries: trimmed(form.beneficiaries),
      teamSummary: trimmed(form.teamSummary),
      currency: trimmed(form.currency),
      annualBudget: budget.trim() ? Number(budget) : undefined,
      programs: (form.programs ?? []).filter((program) => program.name.trim()),
    });
  };

  if (profile.isPending) return <p className="text-slate-500">Loading profile…</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        The AI writes proposals from these facts, so the more complete this is, the fewer
        placeholders your drafts will contain.
      </p>
      <FormError message={save.error?.message} />

      <TextArea
        label="Mission"
        value={form.mission ?? ''}
        onChange={(value) => setForm({ ...form, mission: value })}
        placeholder="What your organization exists to do"
      />
      <TextArea
        label="Vision"
        value={form.vision ?? ''}
        onChange={(value) => setForm({ ...form, vision: value })}
      />
      <TextArea
        label="Who you serve"
        value={form.beneficiaries ?? ''}
        onChange={(value) => setForm({ ...form, beneficiaries: value })}
        placeholder="Communities, ages, locations, numbers reached"
      />
      <TextArea
        label="Team"
        value={form.teamSummary ?? ''}
        onChange={(value) => setForm({ ...form, teamSummary: value })}
        placeholder="Key people and their experience"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Annual budget"
          type="number"
          min={0}
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
        />
        <Field
          label="Currency"
          maxLength={3}
          value={form.currency ?? ''}
          onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Programs</span>
          <button
            type="button"
            onClick={() => setForm({ ...form, programs: [...(form.programs ?? []), { name: '' }] })}
            className="text-sm text-brand-600 hover:underline"
          >
            + Add program
          </button>
        </div>
        <div className="space-y-3">
          {(form.programs ?? []).map((program, index) => (
            <div key={index} className="rounded-md border border-slate-200 p-3">
              <div className="flex gap-2">
                <input
                  value={program.name}
                  placeholder="Program name"
                  onChange={(event) => setProgram(index, { name: event.target.value })}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      programs: (form.programs ?? []).filter((_, i) => i !== index),
                    })
                  }
                  className="px-2 text-sm text-slate-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={program.description ?? ''}
                placeholder="What it does, for whom, with what result"
                rows={2}
                onChange={(event) => setProgram(index, { description: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          ))}
          {(form.programs ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No programs added yet.</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-40">
          <SubmitButton pending={save.isPending}>Save profile</SubmitButton>
        </div>
        {save.isSuccess && !save.isPending ? (
          <span className="text-sm text-emerald-600">Saved</span>
        ) : null}
      </div>
    </form>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
