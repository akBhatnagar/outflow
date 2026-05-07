import Link from 'next/link';

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
            O
          </span>
          Outflow
        </Link>
        {children}
      </div>
    </div>
  );
}
