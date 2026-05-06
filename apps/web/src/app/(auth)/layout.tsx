import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
              O
            </span>
            Outflow
          </Link>
        </header>
        <main className="container flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
      <aside className="bg-muted/40 hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <blockquote className="space-y-4">
          <p className="text-2xl font-medium leading-relaxed">
            “The first month I used Outflow it found four subscriptions I&apos;d completely
            forgotten about. That paid for the next twenty years of the app.”
          </p>
          <footer className="text-muted-foreground text-sm">— You, in a few weeks (we hope)</footer>
        </blockquote>
        <p className="text-muted-foreground text-xs">
          Read-only Gmail access, AES-256-GCM token encryption, one-click disconnect.
        </p>
      </aside>
    </div>
  );
}
