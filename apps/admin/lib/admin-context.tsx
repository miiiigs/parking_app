'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import type { AdminLocation } from './adminLocation';
import type { AuthenticatedAdminUser } from './adminAuth';

type AdminContextValue = {
  user: AuthenticatedAdminUser | null;
  locations: AdminLocation[];
  activeLocation: AdminLocation | null;
  setActiveLocationState: (location: AdminLocation) => void;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({
  children,
  initialUser,
  initialLocations,
  initialActiveLocation,
}: {
  children: ReactNode;
  initialUser: AuthenticatedAdminUser | null;
  initialLocations: AdminLocation[];
  initialActiveLocation: AdminLocation | null;
}) {
  const [activeLocation, setActiveLocation] = useState<AdminLocation | null>(initialActiveLocation);

  return (
    <AdminContext.Provider
      value={{
        user: initialUser,
        locations: initialLocations,
        activeLocation,
        setActiveLocationState: (location) => setActiveLocation(location),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
