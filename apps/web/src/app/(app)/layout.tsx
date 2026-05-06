import { requireAuthOrRedirect } from '@/lib/server/auth';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthOrRedirect();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="bg-background flex-1">
          <div className="container py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
