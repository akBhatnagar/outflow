import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@outflow/ui/card';

import { apiFetch } from '@/lib/server/api';

export const metadata = { title: 'Activity log — Outflow' };
export const dynamic = 'force-dynamic';

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

interface AuditPage {
  items: AuditEntry[];
  nextCursor: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  'user.signup': 'Signed up',
  'user.login': 'Signed in',
  'user.logout': 'Signed out',
  'user.email_verified': 'Verified email',
  'user.password_reset': 'Reset password',
  'subscription.create': 'Created subscription',
  'subscription.update': 'Updated subscription',
  'subscription.delete': 'Deleted subscription',
  'subscription.set_status': 'Changed subscription status',
};

export default async function ActivityLogPage() {
  const page = await apiFetch<AuditPage>('/api/v1/audit-logs?limit=50').catch(
    () => ({ items: [], nextCursor: null }) satisfies AuditPage,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
          <p className="text-muted-foreground text-sm">
            The 50 most recent sensitive actions on your account.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Settings
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {page.items.length === 0 ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">
              No activity yet. Check back after creating or editing something.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {page.items.map((entry) => (
                <li key={entry.id} className="px-6 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</p>
                    <time
                      className="text-muted-foreground text-xs tabular-nums"
                      dateTime={entry.createdAt}
                    >
                      {new Date(entry.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {entry.ip ?? 'unknown ip'} · {truncate(entry.userAgent, 60)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function truncate(s: string | null, n: number): string {
  if (!s) return 'unknown agent';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
