import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getAdminSupabaseConfig } from './supabase';

export const ADMIN_ROLES = ['admin', 'operator', 'support', 'finance'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AuthenticatedAdminUser = {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: AdminRole;
  lastLogin: string;
};

export async function createAdminServerAuthClient() {
  const config = getAdminSupabaseConfig();

  if (!config?.url || !config.anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function getCurrentAdminUser(): Promise<AuthenticatedAdminUser | null> {
  const supabase = await createAdminServerAuthClient();

  if (!supabase) {
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authUser = userData.user;

  if (userError || !authUser) {
    return null;
  }

  const { data: roleData, error: roleError } = await supabase
    .from('admin_user_roles')
    .select('role, display_name')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (roleError) {
    return null;
  }

  const role = roleData?.role;

  if (!role || !ADMIN_ROLES.includes(role as AdminRole)) {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email ?? undefined,
    phone: authUser.phone ?? undefined,
    name:
      roleData.display_name ??
      authUser.user_metadata?.display_name ??
      authUser.user_metadata?.full_name ??
      authUser.email ??
      authUser.phone ??
      'Admin User',
    role: role as AdminRole,
    lastLogin: authUser.last_sign_in_at ?? authUser.created_at,
  };
}
