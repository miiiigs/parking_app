export type SupabaseConfigStatus = {
  isConfigured: boolean;
  missingKeys: string[];
};

export function getSupabaseConfigStatus(env?: Record<string, string | undefined>): SupabaseConfigStatus {
  const sourceEnv = env ?? ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {});
  const missingKeys: string[] = [];

  if (!sourceEnv.EXPO_PUBLIC_SUPABASE_URL) {
    missingKeys.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!sourceEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    missingKeys.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}
