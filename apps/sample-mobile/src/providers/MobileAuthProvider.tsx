import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import {
  clearCachedAuthUser,
  getCurrentGuestMode,
  getCurrentMobileSession,
  sendPhoneVerificationCode,
  signInMobileUser,
  signOutMobileUser,
  signUpMobileUser,
  setCurrentGuestMode,
  verifyPhoneVerificationCode,
  subscribeToMobileAuthChanges,
} from '../lib/supabaseClient';

type MobileAuthContextValue = {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  sendPhoneCode: (phone: string) => Promise<{ phone: string }>;
  verifyPhoneCode: (params: { phone: string; token: string }) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (params: { email: string; password: string; displayName?: string }) => Promise<{ requiresEmailConfirmation: boolean }>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [currentSession, guestMode] = await Promise.all([getCurrentMobileSession(), getCurrentGuestMode()]);

        if (!active) {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsGuest(!currentSession && guestMode);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToMobileAuthChanges(({ session: nextSession, user: nextUser }) => {
      setSession(nextSession);
      setUser(nextUser);
      setIsGuest(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const sendPhoneCode = React.useCallback(async (phone: string) => {
    setError(null);
    await setCurrentGuestMode(false);
    setIsGuest(false);
    const normalizedPhone = await sendPhoneVerificationCode(phone);
    return { phone: normalizedPhone };
  }, []);

  const verifyPhoneCode = React.useCallback(async ({ phone, token }: { phone: string; token: string }) => {
    setError(null);
    await setCurrentGuestMode(false);
    setIsGuest(false);
    const nextUser = await verifyPhoneVerificationCode({ phone, token });
    setUser(nextUser);
    const nextSession = await getCurrentMobileSession();
    setSession(nextSession);
  }, []);

  const signInEmail = React.useCallback(async (email: string, password: string) => {
    setError(null);
    await setCurrentGuestMode(false);
    setIsGuest(false);
    const nextUser = await signInMobileUser(email, password);
    setUser(nextUser);
    const nextSession = await getCurrentMobileSession();
    setSession(nextSession);
  }, []);

  const signUpEmail = React.useCallback(async (params: { email: string; password: string; displayName?: string }) => {
    setError(null);
    await setCurrentGuestMode(false);
    setIsGuest(false);
    const result = await signUpMobileUser(params);
    setUser(result.user);
    setSession(result.session);
    return { requiresEmailConfirmation: result.requiresEmailConfirmation };
  }, []);

  const continueAsGuest = React.useCallback(async () => {
    setError(null);
    await signOutMobileUser();
    await setCurrentGuestMode(true);
    clearCachedAuthUser();
    setUser(null);
    setSession(null);
    setIsGuest(true);
  }, []);

  const signOut = React.useCallback(async () => {
    setError(null);
    await signOutMobileUser();
    clearCachedAuthUser();
    setUser(null);
    setSession(null);
    setIsGuest(false);
  }, []);

  const value = useMemo<MobileAuthContextValue>(
    () => ({
      user,
      session,
      isGuest,
      isLoading,
      error,
      sendPhoneCode,
      verifyPhoneCode,
      signInEmail,
      signUpEmail,
      continueAsGuest,
      signOut,
      clearError: () => setError(null),
    }),
    [continueAsGuest, error, isGuest, isLoading, sendPhoneCode, session, signInEmail, signOut, signUpEmail, user, verifyPhoneCode],
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth() {
  const value = useContext(MobileAuthContext);

  if (!value) {
    throw new Error('useMobileAuth must be used within MobileAuthProvider');
  }

  return value;
}
