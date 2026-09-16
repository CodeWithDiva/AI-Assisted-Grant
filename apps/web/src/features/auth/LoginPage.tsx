import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Button, Field } from '../../components/ui';
import { authApi } from './api';
import { useAuth } from './AuthProvider';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: async () => {
      await refresh();
      navigate('/', { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={
        <>
          No account yet?{' '}
          <Link to="/register" className="font-medium text-accent-600 hover:underline">
            Create one
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={login.isPending} className="w-full">
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
