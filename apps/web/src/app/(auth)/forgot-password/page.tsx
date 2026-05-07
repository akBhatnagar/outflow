import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@outflow/ui';

import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = { title: 'Forgot password — Outflow' };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the email address you used to sign up. If we have a matching account we&apos;ll send
          you a one-time link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-muted-foreground text-sm">
          Remembered it?{' '}
          <Link className="text-primary underline-offset-4 hover:underline" href="/login">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
