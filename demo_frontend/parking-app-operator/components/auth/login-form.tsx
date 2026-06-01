'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { Mail, Phone, Chrome, Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const { login, loginWithPhone, loginWithOAuth } = useAuth();
  const [tab, setTab] = useState<'email' | 'phone' | 'oauth'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginWithPhone(phone, otp);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid phone or OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    setLoading(true);
    setError('');
    try {
      await loginWithOAuth(provider);
      router.push('/dashboard');
    } catch (err) {
      setError('OAuth login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Operator Access</CardTitle>
        <CardDescription>Choose your preferred authentication method</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab('email')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'email'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="inline-block w-4 h-4 mr-2" />
            Email
          </button>
          <button
            onClick={() => setTab('phone')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'phone'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Phone className="inline-block w-4 h-4 mr-2" />
            Phone
          </button>
          <button
            onClick={() => setTab('oauth')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'oauth'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Chrome className="inline-block w-4 h-4 mr-2" />
            OAuth
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Email Tab */}
        {tab === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="operator@parkhub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        )}

        {/* Phone Tab */}
        {tab === 'phone' && (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium text-foreground">
                One-Time Password
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        )}

        {/* OAuth Tab */}
        {tab === 'oauth' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Sign in with your preferred provider
            </p>
            <Button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full bg-secondary hover:bg-secondary/90 text-foreground border border-border"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Chrome className="mr-2 h-4 w-4" />
                  Continue with Google
                </>
              )}
            </Button>
            <Button
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="w-full bg-secondary hover:bg-secondary/90 text-foreground border border-border"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Chrome className="mr-2 h-4 w-4" />
                  Continue with GitHub
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
