import { requireAuthOrRedirect } from '@/lib/server/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@outflow/ui/card';
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
            <span>{user.emailVerifiedAt ? 'Yes' : 'No (Phase 1.5)'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 text-sm">
          <p>Phase 1.5 — change name, change password, delete account.</p>
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
