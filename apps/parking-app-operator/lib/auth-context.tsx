'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
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
  const [activeLocation, setActiveLocation] = useState<OperatorLocation | null>(initialActiveLocation);

  return (
    <AuthContext.Provider
      value={{
        user: initialUser,
        isAuthenticated: !!initialUser,
        locations: initialLocations,
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
