import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@outflow/ui/card';

import { requireAuthOrRedirect } from '@/lib/server/auth';

import { LogoutButton } from './logout-button';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireAuthOrRedirect();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Profile, security, and account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{user.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verified</span>
            <span>{user.emailVerifiedAt ? 'Yes' : 'No'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-muted-foreground text-xs">
                Use the reset flow to change your password. Active sessions sign out automatically.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="text-primary text-sm underline-offset-4 hover:underline"
            >
              Reset password
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Activity log</p>
              <p className="text-muted-foreground text-xs">
                Recent sensitive actions on your account.
              </p>
            </div>
            <Link
              href="/settings/activity"
              className="text-primary text-sm underline-offset-4 hover:underline"
            >
              View log
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 text-sm">
          <p>Phase 2 — connect Gmail, manage email accounts.</p>
          <p>Phase 6 — billing &amp; plan management.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
