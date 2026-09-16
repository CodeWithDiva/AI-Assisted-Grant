import { OrgRole, ROLE_DESCRIPTIONS, type CreatedInvitation } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MailPlus, Trash2, UserMinus, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  IconButton,
  PageTitle,
  Select,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { teamApi } from './api';

const roleLabel = (role: OrgRole) => role.charAt(0) + role.slice(1).toLowerCase();

export function TeamPage() {
  const { user } = useAuth();
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';
  const isOwner = activeOrg?.role === OrgRole.OWNER;
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>(OrgRole.EDITOR);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const members = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => teamApi.members(orgId),
    enabled: Boolean(orgId),
  });
  const invitations = useQuery({
    queryKey: ['invitations', orgId],
    queryFn: () => teamApi.invitations(orgId),
    enabled: Boolean(orgId) && isOwner,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['members', orgId] });
    await queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
  };

  const invite = useMutation({
    mutationFn: () => teamApi.invite(orgId, { email, role }),
    onSuccess: async (invitation) => {
      setCreated(invitation);
      setCopied(false);
      setEmail('');
      await refresh();
    },
  });
  const changeRole = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrgRole }) =>
      teamApi.updateRole(orgId, id, next),
    onSuccess: refresh,
  });
  const removeMember = useMutation({
    mutationFn: (id: string) => teamApi.removeMember(orgId, id),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => teamApi.revoke(orgId, id),
    onSuccess: refresh,
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const onInvite = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate();
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Team"
        description={`The people who can see and work on ${activeOrg.name}'s proposals.`}
      />

      <Alert>
        {changeRole.error?.message ?? removeMember.error?.message ?? revoke.error?.message}
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card padded={false}>
            <CardHeader
              title="Members"
              icon={Users}
              action={<span className="text-[13px] text-ink-400">{members.data?.length ?? 0}</span>}
            />
            {members.isPending ? (
              <div className="px-5">
                <Spinner />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {(members.data ?? []).map((member) => {
                  const isSelf = member.user.id === user?.id;
                  return (
                    <li key={member.id} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
                      <Avatar name={member.user.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-ink-900">
                          {member.user.name}
                          {isSelf ? (
                            <span className="ml-1.5 font-normal text-ink-400">(you)</span>
                          ) : null}
                        </div>
                        <div className="truncate text-[12.5px] text-ink-400">
                          {member.user.email}
                        </div>
                      </div>
                      {isOwner && !isSelf ? (
                        <>
                          <Select
                            value={member.role}
                            onChange={(event) =>
                              changeRole.mutate({
                                id: member.id,
                                next: event.target.value as OrgRole,
                              })
                            }
                            className="w-32"
                          >
                            {Object.values(OrgRole).map((value) => (
                              <option key={value} value={value}>
                                {roleLabel(value)}
                              </option>
                            ))}
                          </Select>
                          <IconButton
                            icon={UserMinus}
                            label={`Remove ${member.user.name}`}
                            tone="danger"
                            onClick={() => removeMember.mutate(member.id)}
                          />
                        </>
                      ) : (
                        <Badge tone={member.role === OrgRole.OWNER ? 'green' : 'neutral'}>
                          {roleLabel(member.role)}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {isOwner ? (
            <Card padded={false}>
              <CardHeader
                title="Pending invitations"
                icon={MailPlus}
                action={
                  <span className="text-[13px] text-ink-400">{invitations.data?.length ?? 0}</span>
                }
              />
              {invitations.data?.length ? (
                <ul className="divide-y divide-line">
                  {invitations.data.map((invitation) => (
                    <li key={invitation.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-400">
                        <MailPlus className="size-4" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] text-ink-900">{invitation.email}</div>
                        <div className="truncate text-[12.5px] text-ink-400">
                          {roleLabel(invitation.role)} · invited by {invitation.invitedBy} · expires{' '}
                          {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>
                      <IconButton
                        icon={Trash2}
                        label="Revoke invitation"
                        tone="danger"
                        onClick={() => revoke.mutate(invitation.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="No invitations waiting" />
              )}
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          {isOwner ? (
            <Card>
              <form onSubmit={onInvite} className="space-y-4">
                <div className="text-[14px] font-medium text-ink-900">Invite someone</div>
                <Alert>{invite.error?.message}</Alert>
                <Field
                  label="Email"
                  type="email"
                  required
                  placeholder="colleague@organization.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Select
                  label="Role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as OrgRole)}
                >
                  {Object.values(OrgRole).map((value) => (
                    <option key={value} value={value}>
                      {roleLabel(value)}
                    </option>
                  ))}
                </Select>
                <p className="text-[12.5px] text-ink-400">{ROLE_DESCRIPTIONS[role]}.</p>
                <Button
                  type="submit"
                  variant="primary"
                  icon={MailPlus}
                  disabled={invite.isPending}
                  className="w-full"
                >
                  {invite.isPending ? 'Sending…' : 'Send invitation'}
                </Button>
              </form>

              {created ? (
                <div className="mt-4 animate-rise rounded-md border border-accent-100 bg-accent-50 p-3.5">
                  <div className="text-[13px] font-medium text-accent-700">
                    Invitation created for {created.email}
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-600">
                    Share this link if the email does not arrive. It works once and expires in 7
                    days.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      readOnly
                      value={created.link}
                      onFocus={(event) => event.target.select()}
                      className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[11.5px] text-ink-600"
                    />
                    <Button size="sm" icon={Copy} onClick={copyLink}>
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : (
            <Card>
              <div className="text-[14px] font-medium text-ink-900">
                Your role: {roleLabel(activeOrg.role ?? OrgRole.VIEWER)}
              </div>
              <p className="mt-1 text-[13px] text-ink-600">
                Only owners can invite people or change roles.
              </p>
            </Card>
          )}

          <div className="rounded-[11px] border border-line bg-paper-dark/60 p-5">
            <div className="mb-3 text-[13px] font-medium text-ink-900">What each role can do</div>
            <dl className="space-y-2.5 text-[12.5px]">
              {Object.values(OrgRole).map((value) => (
                <div key={value}>
                  <dt className="font-medium text-ink-800">{roleLabel(value)}</dt>
                  <dd className="text-ink-600">{ROLE_DESCRIPTIONS[value]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
