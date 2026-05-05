import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-8 py-20 text-center">
      <div className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
        <span className="bg-primary size-1.5 rounded-full" />
        Phase 0 scaffold — auth ships in Phase 1
      </div>

      <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight md:text-6xl">
        See every subscription <br className="hidden md:block" /> draining your account.
      </h1>

      <p className="text-muted-foreground max-w-xl text-balance text-lg">
        Outflow connects to Gmail, finds your recurring charges, and warns you{' '}
        <span className="text-foreground">3 days before</span> each trial ends — without sharing
        your bank password.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-lg px-6 text-sm font-medium shadow-sm transition hover:opacity-90"
        >
          Get started
        </Link>
        <a
          href="https://github.com"
          className="border-border bg-card text-foreground hover:bg-muted inline-flex h-11 items-center rounded-lg border px-6 text-sm font-medium transition"
        >
          View on GitHub
        </a>
      </div>

      <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { title: '30-day money math', body: 'See your real monthly burn at a glance.' },
          { title: 'Trial-end alerts', body: 'Cancel before the charge, not after.' },
          { title: 'Duplicate detection', body: 'Find overlapping services you forgot about.' },
        ].map((card) => (
          <div
            key={card.title}
            className="border-border bg-card rounded-xl border p-5 text-left shadow-sm"
          >
            <h3 className="text-sm font-semibold">{card.title}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{card.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
