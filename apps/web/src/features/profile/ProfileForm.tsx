import type { OrgProfileInput, Program } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Field, SectionLabel, Spinner, TextArea } from '../../components/ui';
import { profileApi } from './api';
import { usePermissions } from '../organizations/permissions';

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
  const { canWrite } = usePermissions();
  const profile = useQuery({
    queryKey: ['profile', orgId],
    queryFn: () => profileApi.get(orgId),
  });

  const [form, setForm] = useState<OrgProfileInput>(emptyProfile);
  const [budget, setBudget] = useState('');

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

  if (profile.isPending) return <Spinner label="Loading profile" />;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Read-only members see the facts but cannot change them. */}
      <fieldset disabled={!canWrite} className="contents">
        {!canWrite ? (
          <Alert tone="neutral">
            You can read the profile. Owners and editors keep it up to date.
          </Alert>
        ) : null}
        <Alert>{save.error?.message}</Alert>

        <div className="space-y-5 rounded-lg border border-line bg-surface p-5">
          <TextArea
            label="Mission"
            rows={3}
            placeholder="What your organization exists to do"
            value={form.mission ?? ''}
            onChange={(event) => setForm({ ...form, mission: event.target.value })}
          />
          <TextArea
            label="Vision"
            rows={2}
            value={form.vision ?? ''}
            onChange={(event) => setForm({ ...form, vision: event.target.value })}
          />
          <TextArea
            label="Who you serve"
            rows={3}
            placeholder="Communities, ages, locations, numbers reached"
            value={form.beneficiaries ?? ''}
            onChange={(event) => setForm({ ...form, beneficiaries: event.target.value })}
          />
          <TextArea
            label="Team"
            rows={3}
            placeholder="Key people and the experience they bring"
            value={form.teamSummary ?? ''}
            onChange={(event) => setForm({ ...form, teamSummary: event.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
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
        </div>

        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Programs</SectionLabel>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, programs: [...(form.programs ?? []), { name: '' }] })
              }
              className="text-[13px] text-accent-600 hover:underline"
            >
              + Add a program
            </button>
          </div>

          <div className="space-y-3">
            {(form.programs ?? []).map((program, index) => (
              <div key={index} className="rounded-md border border-line p-3">
                <div className="flex gap-2">
                  <input
                    value={program.name}
                    placeholder="Program name"
                    onChange={(event) => setProgram(index, { name: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-line-strong px-3 py-2 text-[14px] focus:border-accent-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        programs: (form.programs ?? []).filter((_, i) => i !== index),
                      })
                    }
                    className="shrink-0 px-1 text-[13px] text-ink-400 hover:text-flag-red"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={program.description ?? ''}
                  placeholder="What it does, for whom, and what it achieved"
                  rows={2}
                  onChange={(event) => setProgram(index, { description: event.target.value })}
                  className="mt-2 w-full resize-y rounded-md border border-line px-3 py-2 text-[13.5px] text-ink-600 focus:border-accent-600 focus:outline-none"
                />
              </div>
            ))}
            {(form.programs ?? []).length === 0 ? (
              <p className="text-[13.5px] text-ink-400">
                No programs yet. Each one you add gives the AI something concrete to write about.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canWrite ? (
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          ) : null}
          {save.isSuccess && !save.isPending ? (
            <span className="text-[13px] text-flag-green">Saved</span>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
