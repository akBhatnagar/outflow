import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">Log in to continue tracking.</p>
      </div>
      <LoginForm />
      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-foreground font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
