import Link from 'next/link';
import { Button } from '@outflow/ui/button';
import { ArrowRight, Bell, Inbox, Search, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server/auth';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen">
      <header className="border-border border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
              O
            </span>
            Outflow
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-20">
        <section className="mx-auto max-w-3xl text-center">
          <div className="border-border bg-card text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <span className="bg-primary size-1.5 rounded-full" />
            Phase 1 — Auth + manual tracker shipped
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            See every subscription <br className="hidden md:block" /> draining your account.
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-balance text-lg">
            Track recurring charges in one place. Get alerts before trials convert. Find duplicate
            services and silent price hikes — without ever sharing your bank password.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Get started — it&apos;s free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Already have an account?</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: <Inbox className="size-5" />,
              title: 'One source of truth',
              body: 'Add subscriptions manually, or (Phase 2) connect Gmail and let us find them automatically.',
            },
            {
              icon: <Bell className="size-5" />,
              title: 'Trial-end alerts',
              body: 'Cancel before the charge, not after. We notify you 3 days before any trial converts.',
            },
            {
              icon: <Search className="size-5" />,
              title: 'Duplicate detection',
              body: 'Two video streamers? Two notepads? We surface overlap so you can drop the cheaper one.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="border-border bg-card rounded-xl border p-5 text-left shadow-sm"
            >
              <div className="bg-primary/10 text-primary mb-3 inline-flex size-9 items-center justify-center rounded-lg">
                {card.icon}
              </div>
              <h3 className="text-sm font-semibold">{card.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="border-border bg-card mx-auto mt-20 max-w-2xl rounded-xl border p-6 text-sm">
          <div className="text-primary mb-3 inline-flex items-center gap-2">
            <ShieldCheck className="size-4" /> <span className="font-medium">Privacy posture</span>
          </div>
          <p className="text-muted-foreground">
            Outflow never asks for bank credentials. When Gmail integration ships in Phase 2, it
            requests <code className="bg-muted rounded px-1">gmail.readonly</code> only, encrypts
            tokens at rest with AES-256-GCM, and lets you disconnect with one click.
          </p>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground container py-8 text-center text-xs">
          © {new Date().getFullYear()} Outflow · MIT License
        </div>
      </footer>
    </div>
  );
}
