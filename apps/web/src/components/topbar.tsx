'use client';
import { useRouter } from 'next/navigation';
import { LogOut, MoonStar, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { Button } from '@outflow/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@outflow/ui/dropdown-menu';
import { clientFetch } from '@/lib/client/api';
import type { AuthUser } from '@outflow/contracts';

export function Topbar({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function logout() {
    try {
      await clientFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    } finally {
      toast.success('Logged out');
      router.replace('/');
      router.refresh();
    }
  }

  const initials = user.name?.[0] ?? user.email[0]?.toUpperCase() ?? '?';

  return (
    <header className="border-border bg-card sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4">
      <div className="text-muted-foreground text-sm">
        Welcome back{user.name ? `, ${user.name}` : ''}.
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <MoonStar className="size-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden md:inline">{user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/settings')}>
              <User className="mr-2 size-4" /> Account
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={logout} className="text-destructive">
              <LogOut className="mr-2 size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
