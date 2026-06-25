'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, LockKeyhole, Plus, ShieldCheck, Trash2, UsersRound } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

type DashboardAccount = {
  user_id: string;
  display_name: string | null;
  role: string;
};

type DashboardLocation = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
};

type OperatorAssignment = {
  user_id: string;
  location_id: string;
  assigned_by?: string | null;
  created_at?: string | null;
};

type AssignmentPayload = {
  accounts: DashboardAccount[];
  locations: DashboardLocation[];
  assignments: OperatorAssignment[];
};

const DASHBOARD_ROLE_OPTIONS = [
  { value: 'operator', label: 'Operator' },
  { value: 'support', label: 'Support' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
] as const;

function accountLabel(account?: DashboardAccount) {
  if (!account) {
    return 'Unknown dashboard account';
  }

  return account.display_name || account.user_id;
}

export default function AccessControlPage() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<AssignmentPayload | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionDisplayName, setProvisionDisplayName] = useState('');
  const [provisionRole, setProvisionRole] = useState<(typeof DASHBOARD_ROLE_OPTIONS)[number]['value']>('operator');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [isPending, startTransition] = useTransition();

  const isAdmin = user?.role === 'admin';

  async function loadAssignments() {
    setMessage(null);
    const response = await fetch('/api/operator/location-assignments', { cache: 'no-store' });
    const responsePayload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(responsePayload?.error || 'Unable to load operator assignments.');
    }

    const nextPayload = responsePayload as AssignmentPayload;
    setPayload(nextPayload);
    setSelectedUserId((current) => current || nextPayload.accounts.find((account) => account.role !== 'admin')?.user_id || '');
    setSelectedLocationId((current) => current || nextPayload.locations[0]?.id || '');
  }

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    startTransition(async () => {
      try {
        await loadAssignments();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to load operator assignments.');
        setMessageTone('error');
      }
    });
  }, [isAdmin]);

  async function submitAssignment(method: 'POST' | 'DELETE', userId: string, locationId: string) {
    setMessage(null);
    const response = await fetch('/api/operator/location-assignments', {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, locationId }),
    });
    const responsePayload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(responsePayload?.error || 'Unable to update operator assignment.');
    }

    await loadAssignments();
    setMessage(method === 'POST' ? 'Operator assignment saved.' : 'Operator assignment removed.');
    setMessageTone('success');
  }

  async function submitDashboardProvision() {
    setMessage(null);
    const response = await fetch('/api/operator/dashboard-accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: provisionEmail,
        role: provisionRole,
        displayName: provisionDisplayName,
      }),
    });
    const responsePayload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(responsePayload?.error || 'Unable to provision dashboard access.');
    }

    await loadAssignments();
    setProvisionEmail('');
    setProvisionDisplayName('');
    setProvisionRole('operator');
    setMessage(responsePayload?.message ?? 'Dashboard access granted.');
    setMessageTone('success');
  }

  const accounts = payload?.accounts ?? [];
  const locations = payload?.locations ?? [];
  const assignments = payload?.assignments ?? [];
  const accountsById = new Map(accounts.map((account) => [account.user_id, account]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const assignableAccounts = accounts.filter((account) => account.role !== 'admin');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Admin control plane
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Access Control</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Manage which dashboard accounts can operate each parking lot. Customer mobile users remain separate from dashboard access unless they are deliberately added to `admin_user_roles`.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!isAdmin || isPending}
            onClick={() => startTransition(async () => {
              try {
                await loadAssignments();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Unable to refresh operator assignments.');
                setMessageTone('error');
              }
            })}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        {!isAdmin ? (
          <Card className="border-border bg-card">
            <CardContent className="flex items-start gap-3 p-6">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-semibold text-foreground">Admin access required</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your role can use assigned operational views, but only admins can manage dashboard accounts and lot assignments.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              messageTone === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {message}
          </div>
        ) : null}

        {isAdmin ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Onboard Dashboard Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Supabase Auth email</span>
                  <input
                    type="email"
                    value={provisionEmail}
                    onChange={(event) => setProvisionEmail(event.target.value)}
                    placeholder="operator@example.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Display name</span>
                  <input
                    type="text"
                    value={provisionDisplayName}
                    onChange={(event) => setProvisionDisplayName(event.target.value)}
                    placeholder="North Gate Operator"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Dashboard role</span>
                  <select
                    value={provisionRole}
                    onChange={(event) => setProvisionRole(event.target.value as (typeof DASHBOARD_ROLE_OPTIONS)[number]['value'])}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {DASHBOARD_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!provisionEmail.trim() || isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await submitDashboardProvision();
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Unable to provision dashboard access.');
                      setMessageTone('error');
                    }
                  })}
                  className="w-full"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Invite or Grant Dashboard Access
                </Button>
                <p className="text-xs text-muted-foreground">
                  If the email already belongs to a Supabase Auth user, this grants or updates dashboard access immediately. Otherwise the dashboard sends a Supabase invite and prepares the `admin_user_roles` entry before first sign-in.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersRound className="h-5 w-5 text-primary" />
                  Add Lot Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Dashboard account</span>
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {assignableAccounts.map((account) => (
                      <option key={account.user_id} value={account.user_id}>
                        {accountLabel(account)} ({account.role})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Parking lot</span>
                  <select
                    value={selectedLocationId}
                    onChange={(event) => setSelectedLocationId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!selectedUserId || !selectedLocationId || isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await submitAssignment('POST', selectedUserId, selectedLocationId);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Unable to save assignment.');
                      setMessageTone('error');
                    }
                  })}
                  className="w-full"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Assign Lot
                </Button>
                <p className="text-xs text-muted-foreground">
                  Admin users keep all-lot visibility. Operator, support, and finance accounts should receive explicit lot assignments for operational views.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Current Dashboard Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No dashboard accounts have been granted access yet.
                  </div>
                ) : null}
                {accounts.map((account) => (
                  <div
                    key={account.user_id}
                    className="rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <div className="font-medium text-foreground">{accountLabel(account)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{account.role}</div>
                    <div className="mt-1 break-all text-xs text-muted-foreground/80">{account.user_id}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Current Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No operator lot assignments found. Non-admin users will not have an active location until an admin assigns one.
                  </div>
                ) : null}
                {assignments.map((assignment) => {
                  const account = accountsById.get(assignment.user_id);
                  const location = locationsById.get(assignment.location_id);
                  return (
                    <div
                      key={`${assignment.user_id}-${assignment.location_id}`}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-medium text-foreground">{accountLabel(account)}</div>
                        <div className="text-sm text-muted-foreground">
                          {account?.role ?? 'unknown role'} assigned to {location?.name ?? assignment.location_id}
                        </div>
                        {assignment.created_at ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Created {new Date(assignment.created_at).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => startTransition(async () => {
                          try {
                            await submitAssignment('DELETE', assignment.user_id, assignment.location_id);
                          } catch (error) {
                            setMessage(error instanceof Error ? error.message : 'Unable to remove assignment.');
                            setMessageTone('error');
                          }
                        })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
