import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Create your account' };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start tracking your subscriptions in 30 seconds.
        </p>
      </div>
      <SignupForm />
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
