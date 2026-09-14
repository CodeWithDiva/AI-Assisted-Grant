import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthCard, Field, FormError, SubmitButton } from '../../components/form';
import { authApi } from './api';
import { useAuth } from './AuthProvider';

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
    <AuthCard
      title="Sign in"
      subtitle={
        <>
          New here?{' '}
          <Link className="text-brand-600 hover:underline" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={login.error?.message} />
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
        <SubmitButton pending={login.isPending}>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
