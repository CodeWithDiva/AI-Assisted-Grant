import { OrganizationType, OrgRole } from '@grant/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AtSign, Building2, KeyRound, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, Card, Field, PageTitle, Select, type Tone } from '../../components/ui';
import { authApi } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import { organizationsApi } from '../organizations/api';
import { useOrgs } from '../organizations/OrgProvider';

export function SettingsPage() {
  const { activeOrg } = useOrgs();

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        title="Settings"
        description="Your account, and the details of the organization you are working in."
      />
      <AccountSection />
      <EmailSection />
      <PasswordSection />
      {activeOrg ? <OrganizationSection /> : null}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card padded={false}>
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[220px_1fr]">
        <div>
          <div className="flex items-center gap-2 text-[14.5px] font-medium text-ink-900">
            <Icon className="size-4 text-ink-400" strokeWidth={1.8} />
            {title}
          </div>
          <p className="mt-1.5 text-[13px] text-ink-600">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Card>
  );
}

function Notice({ tone, children }: { tone: Tone; children?: ReactNode }) {
  return children ? <Alert tone={tone}>{children}</Alert> : null;
}

function AccountSection() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? '');

  const save = useMutation({
    mutationFn: () => authApi.updateAccount({ name }),
    onSuccess: refresh,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Section
      icon={UserRound}
      title="Account"
      description="How your name appears to teammates and on invitations."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Notice tone="red">{save.error?.message}</Notice>
        <Notice tone="green">{save.isSuccess ? 'Saved.' : undefined}</Notice>
        <Field
          label="Full name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={save.isPending || name.trim() === user?.name}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Section>
  );
}

function EmailSection() {
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrent] = useState('');

  const save = useMutation({
    mutationFn: () => authApi.changeEmail({ email, currentPassword }),
    onSuccess: async () => {
      setEmail('');
      setCurrent('');
      await refresh();
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Section
      icon={AtSign}
      title="Email address"
      description="Used to sign in and for reminders. The old address is told about the change."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Notice tone="red">{save.error?.message}</Notice>
        <Notice tone="green">
          {save.isSuccess ? `You now sign in with ${user?.email}.` : undefined}
        </Notice>
        <Field label="Current email" value={user?.email ?? ''} disabled />
        <Field
          label="New email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          hint="Your current password, to confirm it is you."
          value={currentPassword}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Change email'}
        </Button>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');

  const save = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Section
      icon={KeyRound}
      title="Password"
      description="Changing it signs you out everywhere else, so a lost laptop stops working."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Notice tone="red">{save.error?.message}</Notice>
        <Notice tone="green">
          {save.isSuccess ? 'Password changed. Other sessions were signed out.' : undefined}
        </Notice>
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint="At least 8 characters."
          value={newPassword}
          onChange={(event) => setNext(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </Section>
  );
}

function OrganizationSection() {
  const { activeOrg } = useOrgs();
  const queryClient = useQueryClient();
  const canEdit = activeOrg?.role === OrgRole.OWNER;

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(OrganizationType.NONPROFIT);
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (!activeOrg) return;
    setName(activeOrg.name);
    setType(activeOrg.type);
    setCountry(activeOrg.country ?? '');
    setWebsite(activeOrg.website ?? '');
  }, [activeOrg]);

  const save = useMutation({
    mutationFn: () =>
      organizationsApi.update(activeOrg!.id, {
        name,
        type: type as OrganizationType,
        country: country.trim() || undefined,
        website: website.trim() || undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orgs'] }),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Section
      icon={Building2}
      title="Organization"
      description={
        canEdit
          ? 'Name and details used on exports and invitations.'
          : 'Only owners can change these.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Notice tone="red">{save.error?.message}</Notice>
        <Notice tone="green">{save.isSuccess ? 'Saved.' : undefined}</Notice>
        <Field
          label="Name"
          required
          disabled={!canEdit}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            disabled={!canEdit}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="NONPROFIT">Nonprofit</option>
            <option value="STARTUP">Startup</option>
            <option value="OTHER">Other</option>
          </Select>
          <Field
            label="Country"
            disabled={!canEdit}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          />
        </div>
        <Field
          label="Website"
          type="url"
          disabled={!canEdit}
          placeholder="https://"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
        {canEdit ? (
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        ) : null}
      </form>
    </Section>
  );
}
