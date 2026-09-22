import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, Button, Field } from '../../components/ui';
import { authApi } from './api';
import { useAuth } from './AuthProvider';
import { AuthShell } from './AuthShell';

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && confirm !== password;

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ token, password }),
    // The API signs the user in, so go straight to the app.
    onSuccess: async () => {
      await refresh();
      navigate('/', { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!mismatch) reset.mutate();
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You will be signed in, and signed out on every other device."
      footer={
        <Link to="/login" className="font-medium text-accent-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {reset.error ? (
          <Alert>
            {reset.error.message}{' '}
            <Link to="/forgot-password" className="font-medium underline">
              Request a new link
            </Link>
          </Alert>
        ) : null}
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          hint="At least 8 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Field
          label="Repeat the new password"
          type="password"
          autoComplete="new-password"
          required
          hint={mismatch ? 'The two passwords do not match.' : undefined}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={reset.isPending || mismatch}
          className="h-10 w-full"
        >
          {reset.isPending ? 'Saving…' : 'Save and sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
