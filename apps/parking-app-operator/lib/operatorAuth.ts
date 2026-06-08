import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { OPERATOR_ROLES, type OperatorRole } from './adminAuth';
import { getOperatorSupabaseConfig } from './supabase';
import type { User } from './types';

export type AuthenticatedOperatorUser = User & {
  role: OperatorRole;
};

export async function createOperatorServerAuthClient() {
  const config = getOperatorSupabaseConfig();

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

export async function getCurrentOperatorUser(): Promise<AuthenticatedOperatorUser | null> {
  const supabase = await createOperatorServerAuthClient();

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

  if (!role || !OPERATOR_ROLES.includes(role as OperatorRole)) {
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
      'Operator User',
    role: role as OperatorRole,
    lastLogin: authUser.last_sign_in_at ?? authUser.created_at,
  };
}
