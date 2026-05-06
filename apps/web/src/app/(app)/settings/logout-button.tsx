'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@outflow/ui/button';
import { clientFetch } from '@/lib/client/api';

export function LogoutButton() {
  const router = useRouter();

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

  return (
    <Button variant="destructive" onClick={logout}>
      <LogOut className="size-4" /> Log out of all sessions
    </Button>
  );
}
