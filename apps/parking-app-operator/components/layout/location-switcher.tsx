'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { recordOperatorActionFailure, recordOperatorActionSuccess, refreshOperatorData } from '@/lib/operatorDataStore';
import { useAuth } from '@/lib/auth-context';

export function LocationSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { user, locations, activeLocation, setActiveLocationState } = useAuth();

  if (locations.length === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        No active parking location
      </div>
    );
  }

  const selectedLocation = activeLocation ?? locations[0] ?? null;
  const selectedValue = selectedLocation?.id ?? '';

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 shadow-sm">
        <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Assigned lot</div>
          <div className="truncate text-sm font-semibold text-foreground">
            {selectedLocation?.name ?? 'No active parking location'}
          </div>
          {selectedLocation?.city ? (
            <div className="truncate text-xs text-muted-foreground">{selectedLocation.city}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 shadow-sm">
      <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Active lot</div>
        <div className="flex items-center gap-2">
          <select
            value={selectedValue}
            disabled={isPending}
            onChange={(event) => {
              const nextLocation = locations.find((location) => location.id === event.target.value);
              if (!nextLocation || nextLocation.id === activeLocation?.id) {
                return;
              }

              startTransition(async () => {
                try {
                  const response = await fetch('/api/operator/location', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ locationId: nextLocation.id }),
                  });

                  if (!response.ok) {
                    throw new Error('Failed to switch operator location.');
                  }

                  setActiveLocationState(nextLocation);
                  recordOperatorActionSuccess();
                  await refreshOperatorData({ silent: true });
                  router.refresh();
                } catch {
                  recordOperatorActionFailure();
                }
              });
            }}
            className="min-w-[240px] max-w-[320px] rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition focus:border-primary"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.city ? `${location.name} - ${location.city}` : location.name}
              </option>
            ))}
          </select>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>
    </div>
  );
}
