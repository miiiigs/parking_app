import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
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
        <LoginForm />
        <p className="text-xs text-center text-muted-foreground">
          Secure operator access only. All activities are logged and monitored.
        </p>
      </div>
    </div>
  );
}
