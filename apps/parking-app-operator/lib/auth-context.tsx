'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import type { OperatorLocation, User } from './types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  locations: OperatorLocation[];
  activeLocation: OperatorLocation | null;
  setActiveLocationState: (location: OperatorLocation) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
  initialLocations,
  initialActiveLocation,
}: {
  children: ReactNode;
  initialUser: User | null;
  initialLocations: OperatorLocation[];
  initialActiveLocation: OperatorLocation | null;
}) {
  const [locations, setLocations] = useState<OperatorLocation[]>(initialLocations);
  const [activeLocation, setActiveLocation] = useState<OperatorLocation | null>(initialActiveLocation);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  useEffect(() => {
    setActiveLocation(initialActiveLocation);
  }, [initialActiveLocation]);

  return (
    <AuthContext.Provider
      value={{
        user: initialUser,
        isAuthenticated: !!initialUser,
        locations,
        activeLocation,
        setActiveLocationState: (location) => setActiveLocation(location),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
