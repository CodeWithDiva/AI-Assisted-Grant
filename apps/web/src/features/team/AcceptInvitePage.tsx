import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Wordmark } from '../../app/Wordmark';
import { Alert, Button, Spinner } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { teamApi } from './api';

const STORAGE_KEY = 'gp_active_org';

export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => teamApi.preview(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => teamApi.accept(token),
    onSuccess: async (organization) => {
      try {
        localStorage.setItem(STORAGE_KEY, organization.id);
      } catch {
        // Not remembered in private browsing; the switcher still defaults sensibly.
      }
      await queryClient.invalidateQueries({ queryKey: ['orgs'] });
      navigate('/', { replace: true });
    },
  });

  const next = encodeURIComponent(`/invite/${token}`);
  const invitation = preview.data;
  const wrongAccount = user && invitation && user.email.toLowerCase() !== invitation.email;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        <div className="card p-7 text-center">
          {preview.isPending || authLoading ? (
            <Spinner label="Checking the invitation" />
          ) : preview.isError ? (
            <>
              <p className="font-display text-[22px] text-ink-900">This link does not work</p>
              <p className="mt-2 text-ink-600">
                It may have been mistyped or revoked. Ask whoever invited you to send a new one.
              </p>
            </>
          ) : invitation ? (
            <>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <MailCheck className="size-6" strokeWidth={1.6} />
              </span>
              <p className="mt-4 text-[13.5px] text-ink-600">
                {invitation.invitedBy} invited you to join
              </p>
              <p className="mt-1 font-display text-[26px] leading-tight text-ink-900">
                {invitation.organizationName}
              </p>
              <p className="mt-2 text-[13.5px] text-ink-600">
                as{' '}
                <strong className="font-medium text-ink-900">
                  {invitation.role.toLowerCase()}
                </strong>{' '}
                · {invitation.email}
              </p>

              <div className="mt-6 space-y-3 text-left">
                {invitation.status === 'EXPIRED' ? (
                  <Alert tone="amber">This invitation has expired. Ask for a new one.</Alert>
                ) : invitation.status === 'ACCEPTED' ? (
                  <Alert tone="green">This invitation has already been accepted.</Alert>
                ) : !user ? (
                  <div className="grid grid-cols-1 gap-2">
                    <Link
                      to={`/register?next=${next}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-accent-700 bg-accent-600 text-[14px] font-medium text-white hover:bg-accent-700"
                    >
                      Create an account to accept
                    </Link>
                    <Link
                      to={`/login?next=${next}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface text-[14px] font-medium text-ink-800 hover:bg-paper"
                    >
                      I already have an account
                    </Link>
                  </div>
                ) : wrongAccount ? (
                  <Alert tone="amber">
                    You are signed in as {user.email}, but this invitation is for {invitation.email}
                    . Sign out and sign in with that address.
                  </Alert>
                ) : (
                  <>
                    <Alert>{accept.error?.message}</Alert>
                    <Button
                      variant="primary"
                      className="h-10 w-full"
                      disabled={accept.isPending}
                      onClick={() => accept.mutate()}
                    >
                      {accept.isPending ? 'Joining…' : `Join ${invitation.organizationName}`}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
