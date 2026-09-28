import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Field } from '../../components/ui';
import { authApi, safeNext } from './api';
import { useAuth } from './AuthProvider';
import { AuthShell } from './AuthShell';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: async () => {
      await refresh();
      // Invited people go back to accept; everyone else sets up their organization first.
      navigate(next ?? '/organizations', { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    register.mutate({ name, email, password });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up takes two minutes. Your first draft follows."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="font-medium text-accent-600 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Alert>{register.error?.message}</Alert>
        <Field
          label="Full name"
          autoComplete="name"
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={register.isPending}
          className="h-10 w-full"
        >
          {register.isPending ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
