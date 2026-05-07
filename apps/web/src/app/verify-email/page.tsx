import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@outflow/ui';

import { VerifyEmailRunner } from './verify-email-runner';

export const metadata = { title: 'Verify email — Outflow' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
            O
          </span>
          Outflow
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>Hold on while we confirm the link.</CardDescription>
          </CardHeader>
          <CardContent>
            {token ? (
              <VerifyEmailRunner token={token} />
            ) : (
              <p className="text-destructive text-sm">
                The verification link looks broken. Sign in and request a new one from your
                settings.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
