import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@outflow/ui';

import { ResetPasswordForm } from './reset-password-form';

export const metadata = { title: 'Reset password — Outflow' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset link is missing</CardTitle>
          <CardDescription>
            The link you clicked doesn&apos;t look right. Try requesting a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/forgot-password"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Request another email
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Pick something at least 12 characters long that you haven&apos;t used elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
