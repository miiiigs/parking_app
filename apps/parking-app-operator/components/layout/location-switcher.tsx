'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { recordOperatorActionFailure, recordOperatorActionSuccess, refreshOperatorData } from '@/lib/operatorDataStore';
import { useAuth } from '@/lib/auth-context';

export function LocationSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locations, activeLocation, setActiveLocationState } = useAuth();

  if (locations.length === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        No active parking location
      </div>
    );
  }

  const selectedValue = activeLocation?.id ?? locations[0]?.id ?? '';

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Location</div>
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
            className="max-w-[220px] truncate border-0 bg-transparent p-0 text-sm font-medium text-foreground outline-none"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>
    </div>
  );
}
