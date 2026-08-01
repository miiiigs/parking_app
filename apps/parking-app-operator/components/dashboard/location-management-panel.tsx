'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPinned, PencilLine, Plus, RefreshCcw, Settings2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { recordOperatorActionFailure, recordOperatorActionSuccess } from '@/lib/operatorDataStore';
import { normalizeManagedLocationCode, type ManagedLocation } from '@/lib/operatorAdminAccess';
import { useOperatorData } from '@/lib/useOperatorData';

type LocationDraft = {
  name: string;
  code: string;
  address: string;
  city: string;
  isActive: boolean;
};

const EMPTY_DRAFT: LocationDraft = {
  name: '',
  code: '',
  address: '',
  city: 'Bonifacio Global City',
  isActive: true,
};

function buildDraft(location?: ManagedLocation | null): LocationDraft {
  if (!location) {
    return EMPTY_DRAFT;
  }

  return {
    name: location.name,
    code: location.code,
    address: location.address,
    city: location.city,
    isActive: location.is_active,
  };
}

export function LocationManagementPanel() {
  const router = useRouter();
  const { user, activeLocation } = useAuth();
  const { refresh } = useOperatorData();
  const [locations, setLocations] = useState<ManagedLocation[]>([]);
  const [createDraft, setCreateDraft] = useState<LocationDraft>(EMPTY_DRAFT);
  const [selectedEditLocationId, setSelectedEditLocationId] = useState('');
  const [editDraft, setEditDraft] = useState<LocationDraft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [isPending, startTransition] = useTransition();

  const isAdmin = user?.role === 'admin';

  async function loadLocations() {
    setMessage(null);
    const response = await fetch('/api/operator/locations', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to load parking lots.');
    }

    setLocations((payload.locations ?? []) as ManagedLocation[]);
  }

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    startTransition(async () => {
      try {
        await loadLocations();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to load parking lots.');
        setMessageTone('error');
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    if (locations.length === 0) {
      setSelectedEditLocationId('');
      setEditDraft(EMPTY_DRAFT);
      return;
    }

    setSelectedEditLocationId((current) => {
      if (current && locations.some((location) => location.id === current)) {
        return current;
      }

      if (activeLocation?.id && locations.some((location) => location.id === activeLocation.id)) {
        return activeLocation.id;
      }

      return locations[0]?.id ?? '';
    });
  }, [activeLocation?.id, locations]);

  useEffect(() => {
    const selectedLocation = locations.find((location) => location.id === selectedEditLocationId) ?? null;
    setEditDraft(buildDraft(selectedLocation));
  }, [locations, selectedEditLocationId]);

  async function createLocation() {
    setMessage(null);
    const response = await fetch('/api/operator/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: createDraft.name,
        code: createDraft.code,
        address: createDraft.address,
        city: createDraft.city,
        isActive: createDraft.isActive,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to save parking lot.');
    }

    const savedLocation = payload.location as ManagedLocation | undefined;
    if (savedLocation) {
      setSelectedEditLocationId(savedLocation.id);
    }

    setCreateDraft(EMPTY_DRAFT);
    await loadLocations();
    await refresh({ silent: true, force: true });
    router.refresh();
    setMessage(payload?.message ?? 'Parking lot created.');
    setMessageTone('success');
  }

  async function saveSelectedLocation() {
    if (!selectedEditLocationId) {
      throw new Error('Choose a parking lot to edit first.');
    }

    setMessage(null);
    const response = await fetch('/api/operator/locations', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: selectedEditLocationId,
        name: editDraft.name,
        code: editDraft.code,
        address: editDraft.address,
        city: editDraft.city,
        isActive: editDraft.isActive,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to save parking lot.');
    }

    await loadLocations();
    await refresh({ silent: true, force: true });
    router.refresh();
    setMessage(payload?.message ?? 'Parking lot details saved.');
    setMessageTone('success');
  }

  const selectedEditLocation = locations.find((location) => location.id === selectedEditLocationId) ?? null;

  return (
    <div className="space-y-6">
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

      {!isAdmin ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Parking-lot management is admin-only. Your role can still view the pricing setup for the active location.
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPinned className="h-3.5 w-3.5 text-primary" />
                Global admin lot control
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Use this surface for system-wide lot inventory. Selected-lot pricing, grace periods, and setup now live under `Parking Setup` for the dashboard lot in the header.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/parking-setup')}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Open Parking Setup
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-4 2xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
          <Card className="border-border bg-card">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Plus className="h-5 w-5 text-primary" />
                    Create Parking Lot
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add a new lot to the shared backend inventory. After creation, use `Parking Setup` on the selected dashboard lot for pricing, grace periods, slots, and layout follow-up.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    try {
                      await loadLocations();
                    } catch (error) {
                      recordOperatorActionFailure();
                      setMessage(error instanceof Error ? error.message : 'Unable to refresh parking lots.');
                      setMessageTone('error');
                    }
                  })}
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lot-name">Lot name</Label>
                  <Input
                    id="lot-name"
                    value={createDraft.name}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="BGC Pilot Site"
                    className="border-border bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lot-code">Lot code</Label>
                  <Input
                    id="lot-code"
                    value={createDraft.code}
                    onChange={(event) =>
                      setCreateDraft((current) => ({
                        ...current,
                        code: normalizeManagedLocationCode(event.target.value),
                      }))
                    }
                    placeholder="BGC-PILOT"
                    className="border-border bg-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot-address">Address</Label>
                <Input
                  id="lot-address"
                  value={createDraft.address}
                  onChange={(event) => setCreateDraft((current) => ({ ...current, address: event.target.value }))}
                  placeholder="26th Street, Bonifacio Global City"
                  className="border-border bg-input"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label htmlFor="lot-city">City</Label>
                  <Input
                    id="lot-city"
                    value={createDraft.city}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, city: event.target.value }))}
                    placeholder="Bonifacio Global City"
                    className="border-border bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lot-status">Status</Label>
                  <select
                    id="lot-status"
                    value={createDraft.isActive ? 'active' : 'inactive'}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, isActive: event.target.value === 'active' }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                Active lots appear in the same backend location feeds used by the operator dashboard and the mobile app. Inactive lots stay out of those live selectors until you reactivate them.
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  disabled={isPending || !createDraft.name.trim() || !createDraft.code.trim() || !createDraft.address.trim() || !createDraft.city.trim()}
                  onClick={() => startTransition(async () => {
                    try {
                      await createLocation();
                      recordOperatorActionSuccess();
                    } catch (error) {
                      recordOperatorActionFailure();
                      setMessage(error instanceof Error ? error.message : 'Unable to save parking lot.');
                      setMessageTone('error');
                    }
                  })}
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create parking lot
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PencilLine className="h-5 w-5 text-primary" />
                Edit Managed Parking Lot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Create the first lot before editing an existing one.
                </div>
              ) : null}

              {locations.length > 0 ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Choose a managed lot</span>
                    <select
                      value={selectedEditLocationId}
                      onChange={(event) => setSelectedEditLocationId(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Edit the selected lot here. To change pricing or grace periods, switch the dashboard location in the header and continue in `Parking Setup`.
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-lot-name">Lot name</Label>
                      <Input
                        id="edit-lot-name"
                        value={editDraft.name}
                        onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))}
                        className="border-border bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lot-code">Lot code</Label>
                      <Input
                        id="edit-lot-code"
                        value={editDraft.code}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            code: normalizeManagedLocationCode(event.target.value),
                          }))
                        }
                        className="border-border bg-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-lot-address">Address</Label>
                    <Input
                      id="edit-lot-address"
                      value={editDraft.address}
                      onChange={(event) => setEditDraft((current) => ({ ...current, address: event.target.value }))}
                      className="border-border bg-input"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                    <div className="space-y-2">
                      <Label htmlFor="edit-lot-city">City</Label>
                      <Input
                        id="edit-lot-city"
                        value={editDraft.city}
                        onChange={(event) => setEditDraft((current) => ({ ...current, city: event.target.value }))}
                        className="border-border bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lot-status">Status</Label>
                      <select
                        id="edit-lot-status"
                        value={editDraft.isActive ? 'active' : 'inactive'}
                        onChange={(event) => setEditDraft((current) => ({ ...current, isActive: event.target.value === 'active' }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/parking-setup')}
                    >
                      Open Parking Setup
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending || !selectedEditLocationId || !editDraft.name.trim() || !editDraft.code.trim() || !editDraft.address.trim() || !editDraft.city.trim()}
                      onClick={() => startTransition(async () => {
                        try {
                          await saveSelectedLocation();
                          recordOperatorActionSuccess();
                        } catch (error) {
                          recordOperatorActionFailure();
                          setMessage(error instanceof Error ? error.message : 'Unable to save parking lot.');
                          setMessageTone('error');
                        }
                      })}
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save selected lot
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPinned className="h-5 w-5 text-primary" />
                Managed Parking Lots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {locations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No parking lots found yet. Create the first lot here, then continue with slot and map setup.
                </div>
              ) : null}
              {locations.map((location) => {
                const isCurrentActiveLot = activeLocation?.id === location.id;

                return (
                  <div
                    key={location.id}
                    className={`rounded-lg border p-4 ${
                      selectedEditLocationId === location.id ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/20'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-foreground">{location.name}</div>
                          <Badge variant={location.is_active ? 'secondary' : 'outline'}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {selectedEditLocationId === location.id ? <Badge variant="outline">Selected for edit</Badge> : null}
                          {isCurrentActiveLot ? <Badge variant="outline">Current dashboard lot</Badge> : null}
                        </div>
                        <div className="text-sm text-muted-foreground">{location.address}</div>
                        <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground/80">
                          {location.city} · {location.code}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={selectedEditLocationId === location.id ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedEditLocationId(location.id)}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        {selectedEditLocationId === location.id ? 'Selected' : 'Edit'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
