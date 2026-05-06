import Link from 'next/link';
import { ArrowRight, Plus, TrendingUp, Wallet } from 'lucide-react';
import type { InsightsSummary, Subscription } from '@outflow/contracts';
import { Button } from '@outflow/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@outflow/ui/card';
import { apiFetch } from '@/lib/server/api';
import { cadenceSuffix, formatMoney, formatRelativeDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [summary, subs] = await Promise.all([
    apiFetch<InsightsSummary>('/api/v1/insights/summary'),
    apiFetch<Subscription[]>('/api/v1/subscriptions?status=ACTIVE&status=TRIAL'),
  ]);

  const isEmpty = subs.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your subscription burn at a glance.</p>
        </div>
        <Button asChild>
          <Link href="/subscriptions">
            <Plus className="size-4" /> Add subscription
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm">Monthly spend</CardTitle>
            <Wallet className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {formatMoney(summary.totals.monthlyCents, summary.totals.currency)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {summary.totals.activeCount} active subscription
              {summary.totals.activeCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm">Annualised</CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {formatMoney(summary.totals.yearlyCents, summary.totals.currency)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">at current monthly run-rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Top categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {summary.byCategory.length === 0 && (
              <p className="text-muted-foreground">No data yet.</p>
            )}
            {summary.byCategory.slice(0, 4).map((c) => (
              <div key={c.categorySlug ?? '__none__'} className="flex justify-between">
                <span className="text-muted-foreground truncate">
                  {c.categoryName ?? 'Uncategorised'}
                </span>
                <span className="tabular-nums">
                  {formatMoney(c.monthlyCents, summary.totals.currency)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming charges</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/subscriptions">
              All subscriptions <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {summary.upcomingCharges.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No upcoming charges. Add a subscription with a renewal date to see it here.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {summary.upcomingCharges.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.displayName}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeDate(c.nextChargeDate)}
                    </p>
                  </div>
                  <div className="tabular-nums">
                    {formatMoney(c.amountCents, c.currency)}
                    <span className="text-muted-foreground text-xs">
                      {cadenceSuffix(c.cadence)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isEmpty && (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h2 className="text-lg font-semibold">No subscriptions yet</h2>
            <p className="text-muted-foreground text-sm">
              Add your first subscription to start tracking spend. Gmail auto-detection arrives in
              Phase 2.
            </p>
            <Button asChild>
              <Link href="/subscriptions">
                <Plus className="size-4" /> Add subscription
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
