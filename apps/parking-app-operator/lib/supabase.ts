export type SupabaseRestConfig = {
  url: string;
  serviceRoleKey?: string;
  anonKey?: string;
};

export function getOperatorSupabaseConfig(): SupabaseRestConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    return null;
  }

  return {
    url,
    serviceRoleKey,
    anonKey,
  };
}
