import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { getSupabaseConfigStatus } from './supabaseConfig';

function getEnv() {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let cachedClient: any = null;
let cachedUser: any = null;

const authStorageCache = new Map<string, string>();

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

export function getSupabaseClient(): any {
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

export async function ensureMobileAuthSession() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  // Return cached user when available to avoid repeated network auth calls.
  if (cachedUser) {
    return cachedUser;
  }

  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.user) {
    cachedUser = sessionData.session.user;
    return sessionData.session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(error.message);
  }

  cachedUser = data.user ?? null;
  return cachedUser;
}

// Expose a helper to reset cached user (useful for tests or sign-out flows)
export function clearCachedAuthUser() {
  cachedUser = null;
}