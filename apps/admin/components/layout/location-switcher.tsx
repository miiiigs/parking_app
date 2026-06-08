'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { useAdmin } from '../../lib/admin-context';

export function LocationSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locations, activeLocation, setActiveLocationState } = useAdmin();

  if (locations.length === 0) {
    return null;
  }

  const selectedValue = activeLocation?.id ?? locations[0]?.id ?? '';

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: '#a9bdd6',
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Location</span>
      <select
        value={selectedValue}
        disabled={isPending}
        onChange={(event) => {
          const nextLocation = locations.find((location) => location.id === event.target.value);
          if (!nextLocation || nextLocation.id === activeLocation?.id) {
            return;
          }

          startTransition(async () => {
            const response = await fetch('/api/admin/location', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ locationId: nextLocation.id }),
            });

            if (!response.ok) {
              return;
            }

            setActiveLocationState(nextLocation);
            router.refresh();
          });
        }}
        style={{
          minWidth: 180,
          borderRadius: 10,
          border: '1px solid #26405f',
          background: '#08111d',
          color: '#f4f7fb',
          padding: '8px 12px',
        }}
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </label>
  );
}
