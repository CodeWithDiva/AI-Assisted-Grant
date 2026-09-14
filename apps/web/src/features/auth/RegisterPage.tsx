import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthCard, Field, FormError, SubmitButton } from '../../components/form';
import { authApi } from './api';
import { useAuth } from './AuthProvider';

export function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: async () => {
      await refresh();
      navigate('/organization', { replace: true });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    register.mutate({ name, email, password });
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle={
        <>
          Already registered?{' '}
          <Link className="text-brand-600 hover:underline" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={register.error?.message} />
        <Field
          label="Full name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <SubmitButton pending={register.isPending}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
