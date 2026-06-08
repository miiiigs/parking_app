'use client';

import { useFormStatus } from 'react-dom';
import { Loader2, Mail } from 'lucide-react';

import { signInOperator } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        'Sign In'
      )}
    </Button>
  );
}

export function LoginForm({ errorMessage }: { errorMessage?: string | null }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Operator Access</CardTitle>
        <CardDescription>Use your Supabase admin account to access live operator tools</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 text-primary" />
          Email and password access only
        </div>

        {errorMessage ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <form action={signInOperator} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@yourcompany.com"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <SubmitButton />
        </form>

        <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
          Access is limited to Supabase Auth users with a matching role in <code>admin_user_roles</code>.
        </div>
      </CardContent>
    </Card>
  );
}
