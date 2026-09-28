import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Alert, Button, Field } from '../../components/ui';
import { authApi } from './api';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const request = useMutation({ mutationFn: authApi.forgotPassword });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    request.mutate({ email });
  };

  const backToSignIn = (
    <Link to="/login" className="font-medium text-accent-600 hover:underline">
      Back to sign in
    </Link>
  );

  if (request.isSuccess) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="One more step to get back in."
        footer={backToSignIn}
      >
        <div className="flex gap-3 rounded-lg border border-line bg-paper px-4 py-4">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-accent-600" strokeWidth={1.8} />
          <div className="text-[14px] text-ink-800">
            <p>
              If an account exists for <strong className="text-ink-900">{email}</strong>, a link to
              choose a new password is on its way. It works for 60 minutes.
            </p>
            <p className="mt-2 text-[13px] text-ink-600">
              Nothing after a few minutes? Check the spam folder, or ask again.
            </p>
          </div>
        </div>
        <Button className="mt-4 h-10 w-full" onClick={() => request.reset()}>
          Use a different email
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={<>Remembered it? {backToSignIn}</>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Alert>{request.error?.message}</Alert>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={request.isPending}
          className="h-10 w-full"
        >
          {request.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  );
}
