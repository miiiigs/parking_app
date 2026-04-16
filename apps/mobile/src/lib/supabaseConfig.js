function getSupabaseConfigStatus(env) {
  const sourceEnv = env ?? (globalThis.process?.env ?? {});
  const missingKeys = [];

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

module.exports = {
  getSupabaseConfigStatus,
};