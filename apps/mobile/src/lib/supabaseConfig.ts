export type SupabaseConfigStatus = {
  isConfigured: boolean;
  missingKeys: string[];
};

type SupabaseEnv = Record<string, string | undefined>;

function normalizeEnvValue(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

// Expo only inlines EXPO_PUBLIC_* values when they are referenced directly via process.env.KEY.
const expoPublicSupabaseUrl = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
const expoPublicSupabaseAnonKey = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export function getResolvedSupabaseConfig(env?: SupabaseEnv) {
  return {
    supabaseUrl: normalizeEnvValue(env?.EXPO_PUBLIC_SUPABASE_URL) ?? expoPublicSupabaseUrl,
    supabaseAnonKey: normalizeEnvValue(env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ?? expoPublicSupabaseAnonKey,
  };
}

export function getSupabaseConfigStatus(env?: SupabaseEnv): SupabaseConfigStatus {
  const { supabaseUrl, supabaseAnonKey } = getResolvedSupabaseConfig(env);
  const missingKeys: string[] = [];

  if (!supabaseUrl) {
    missingKeys.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    missingKeys.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}
