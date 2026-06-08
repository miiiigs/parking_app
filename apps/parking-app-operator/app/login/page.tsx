import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';

type Props = {
  searchParams?: Promise<{ error?: string } | undefined>;
};

export default async function LoginPage({ searchParams }: Props) {
  const operatorUser = await getCurrentOperatorUser();

  if (operatorUser) {
    redirect('/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error ? decodeURIComponent(resolvedSearchParams.error) : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            ParkHub
          </h1>
          <p className="text-sm text-muted-foreground">
            Professional Parking Management System
          </p>
        </div>
        <LoginForm errorMessage={errorMessage} />
        <p className="text-xs text-center text-muted-foreground">
          Secure operator access only. All activities are logged and monitored.
        </p>
      </div>
    </div>
  );
}
