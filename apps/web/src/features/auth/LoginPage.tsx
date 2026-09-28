import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Field } from '../../components/ui';
import { authApi, safeNext } from './api';
import { useAuth } from './AuthProvider';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: async () => {
      await refresh();
      navigate(next ?? '/', { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your applications."
      footer={
        <>
          New to GrantPilot?{' '}
          <Link
            to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
            className="font-medium text-accent-600 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Alert>{login.error?.message}</Alert>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div>
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium text-accent-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" variant="primary" disabled={login.isPending} className="h-10 w-full">
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
