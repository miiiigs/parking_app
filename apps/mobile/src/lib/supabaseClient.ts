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

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);

  return cachedClient;
}