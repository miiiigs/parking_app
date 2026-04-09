import { createClient } from '@supabase/supabase-js';

function getEnv() {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let cachedClient: any = null;

export function getSupabaseClient(): any {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

export async function ensureMobileAuthSession() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}