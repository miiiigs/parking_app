import { createClient, type AuthChangeEvent, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { getSupabaseConfigStatus } from './supabaseConfig';

function getEnv() {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let cachedClient: SupabaseClient | null = null;
let cachedUser: User | null = null;
const guestModeStorageKey = 'parking_mobile_guest_mode';
const mobileAuthSessionStorageKey = 'parking_mobile_auth_session';
const authStorageCache = new Map<string, string>();

type PersistedSessionSnapshot = {
  accessToken: string;
  refreshToken: string;
};

const supabaseAuthStorage = {
  async getItem(key: string) {
    try {
      const storedValue = await SecureStore.getItemAsync(key);
      return storedValue ?? authStorageCache.get(key) ?? null;
    } catch {
      return authStorageCache.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    authStorageCache.set(key, value);

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Keep the in-memory copy so the session still works during this runtime.
    }
  },
  async removeItem(key: string) {
    authStorageCache.delete(key);

    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore storage cleanup failures and fall back to the in-memory cache.
    }
  },
};

async function getGuestModeEnabled() {
  try {
    return (await SecureStore.getItemAsync(guestModeStorageKey)) === '1';
  } catch {
    return false;
  }
}

async function setGuestModeEnabled(enabled: boolean) {
  try {
    if (enabled) {
      await SecureStore.setItemAsync(guestModeStorageKey, '1');
      return;
    }

    await SecureStore.deleteItemAsync(guestModeStorageKey);
  } catch {
    // Guest mode is a convenience flag only; ignore storage failures.
  }
}

async function readPersistedSessionSnapshot(): Promise<PersistedSessionSnapshot | null> {
  try {
    const raw = await SecureStore.getItemAsync(mobileAuthSessionStorageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSessionSnapshot>;

    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
  } catch {
    return null;
  }
}

async function writePersistedSessionSnapshot(session: Session | null) {
  try {
    if (!session?.access_token || !session.refresh_token) {
      await SecureStore.deleteItemAsync(mobileAuthSessionStorageKey);
      return;
    }

    await SecureStore.setItemAsync(
      mobileAuthSessionStorageKey,
      JSON.stringify({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      } satisfies PersistedSessionSnapshot),
    );
  } catch {
    // Keep auth usable even if the extra snapshot write fails.
  }
}

async function restoreSessionFromSnapshot(supabase: SupabaseClient): Promise<Session | null> {
  const snapshot = await readPersistedSessionSnapshot();

  if (!snapshot) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: snapshot.accessToken,
      refresh_token: snapshot.refreshToken,
    });

    if (error) {
      await writePersistedSessionSnapshot(null);
      return null;
    }

    return data.session ?? null;
  } catch {
    await writePersistedSessionSnapshot(null);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();
  const configStatus = getSupabaseConfigStatus(env);

  if (!configStatus.isConfigured) {
    return null;
  }

  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: supabaseAuthStorage,
    },
  });

  return cachedClient;
}

export async function getCurrentMobileSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData.session ?? null;

  if (!session) {
    session = await restoreSessionFromSnapshot(supabase);
  }

  cachedUser = session?.user ?? null;
  await writePersistedSessionSnapshot(session);
  return session;
}

export async function getCurrentMobileAuthUser(): Promise<User | null> {
  if (cachedUser) {
    return cachedUser;
  }

  const session = await getCurrentMobileSession();
  return session?.user ?? null;
}

export async function getCurrentGuestMode(): Promise<boolean> {
  return getGuestModeEnabled();
}

export async function setCurrentGuestMode(enabled: boolean) {
  await setGuestModeEnabled(enabled);
}

export async function ensureMobileAuthSession(): Promise<User | null> {
  const user = await getCurrentMobileAuthUser();

  if (!user) {
    throw new Error('Sign in is required before you can reserve or manage parking sessions.');
  }

  return user;
}

function normalizePhoneNumber(phone: string) {
  return phone.trim().replace(/[\s()-]/g, '');
}

export async function sendPhoneVerificationCode(phone: string): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    throw new Error('Enter your phone number.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizedPhone;
}

export async function verifyPhoneVerificationCode({
  phone,
  token,
}: {
  phone: string;
  token: string;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const trimmedToken = token.trim();

  if (!normalizedPhone || !trimmedToken) {
    throw new Error('Enter your phone number and verification code.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: trimmedToken,
    type: 'sms',
  });

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? null;
  await writePersistedSessionSnapshot(data.session ?? null);

  if (!data.user) {
    throw new Error('Unable to confirm the customer session.');
  }

  return data.user;
}

export async function signInMobileUser(email: string, password: string): Promise<User> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    throw new Error('Enter your email and password.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: trimmedPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? null;
  await writePersistedSessionSnapshot(data.session ?? null);

  if (!data.user) {
    throw new Error('Unable to confirm the customer session.');
  }

  return data.user;
}

export async function signUpMobileUser({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();
  const trimmedDisplayName = displayName?.trim() ?? '';

  if (!normalizedEmail || !trimmedPassword) {
    throw new Error('Enter your email and password.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: trimmedPassword,
    options: {
      data: trimmedDisplayName
        ? {
            display_name: trimmedDisplayName,
          }
        : undefined,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? null;
  await writePersistedSessionSnapshot(data.session ?? null);

  return {
    user: data.user ?? null,
    session: data.session ?? null,
    requiresEmailConfirmation: !data.session,
  };
}

export async function signOutMobileUser() {
  await setGuestModeEnabled(false);

  const supabase = getSupabaseClient();

  if (!supabase) {
    cachedUser = null;
    await writePersistedSessionSnapshot(null);
    return;
  }

  const { error } = await supabase.auth.signOut();

  cachedUser = null;
  await writePersistedSessionSnapshot(null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMobileUserProfile({ displayName }: { displayName?: string }) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const trimmedDisplayName = displayName?.trim() ?? '';

  if (!trimmedDisplayName) {
    return;
  }

  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: trimmedDisplayName,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? cachedUser;
}

export async function requestMobilePhoneChange(phone: string): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    throw new Error('Enter your new phone number.');
  }

  const { data, error } = await supabase.auth.updateUser({
    phone: normalizedPhone,
  });

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? cachedUser;
  return normalizedPhone;
}

export async function verifyMobilePhoneChange({
  phone,
  token,
}: {
  phone: string;
  token: string;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const trimmedToken = token.trim();

  if (!normalizedPhone || !trimmedToken) {
    throw new Error('Enter your phone number and verification code.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: trimmedToken,
    type: 'phone_change',
  });

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? cachedUser;
  await writePersistedSessionSnapshot(data.session ?? null);
  return data.user ?? cachedUser;
}

export function subscribeToMobileAuthChanges(
  callback: (params: {
    event: AuthChangeEvent;
    session: Session | null;
    user: User | null;
  }) => void,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    cachedUser = session?.user ?? null;
    void writePersistedSessionSnapshot(session);
    callback({
      event,
      session,
      user: session?.user ?? null,
    });
  });

  return () => {
    subscription.unsubscribe();
  };
}

export function clearCachedAuthUser() {
  cachedUser = null;
}
