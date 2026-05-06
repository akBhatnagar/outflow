'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@outflow/ui/utils';
import { CreditCard, LayoutDashboard, ListChecks, Settings } from 'lucide-react';

const NAV: Array<{
  href: '/dashboard' | '/subscriptions' | '/settings';
  label: string;
  icon: React.ElementType;
}> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/subscriptions', label: 'Subscriptions', icon: ListChecks },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="border-border bg-card hidden w-60 shrink-0 border-r md:flex md:flex-col">
      <div className="border-border flex h-16 items-center gap-2 border-b px-5 font-semibold">
        <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
          O
        </span>
        Outflow
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-border bg-background text-muted-foreground m-3 rounded-lg border p-3 text-xs">
        <div className="text-foreground mb-1 flex items-center gap-2">
          <CreditCard className="size-3.5" /> <span className="font-medium">Free plan</span>
        </div>
        Upgrade in Phase 6 to unlock unlimited tracking and Gmail sync.
      </div>
    </aside>
  );
}
