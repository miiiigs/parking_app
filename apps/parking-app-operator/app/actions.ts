'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import { OPERATOR_ROLES } from '@/lib/adminAuth';
import {
  clearOperatorLocationSelection,
  ensureDefaultOperatorLocationSelection,
} from '@/lib/operatorLocationServer';
import { getOperatorSupabaseConfig } from '@/lib/supabase';

async function createOperatorAuthClient() {
  const config = getOperatorSupabaseConfig();

  if (!config?.url || !config.anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in operator environment variables.');
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

export async function signInOperator(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!email || !password) {
    redirect('/login?error=Enter%20your%20email%20and%20password.');
  }

  const supabase = await createOperatorAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    await supabase.auth.signOut();
    redirect('/login?error=Unable%20to%20confirm%20your%20session.');
  }

  const { data: roleData, error: roleError } = await supabase
    .from('admin_user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent(roleError.message)}`);
  }

  const role = roleData?.role;

  if (!role || !OPERATOR_ROLES.includes(role)) {
    await supabase.auth.signOut();
    redirect('/login?error=Access%20denied.%20This%20account%20is%20not%20allowed%20to%20use%20the%20operator%20dashboard.');
  }

  await ensureDefaultOperatorLocationSelection();
  redirect('/dashboard');
}

export async function signOutOperator() {
  const supabase = await createOperatorAuthClient();
  await supabase.auth.signOut();
  await clearOperatorLocationSelection();
  redirect('/login');
}
