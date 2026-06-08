import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { OPERATOR_ROLES } from './lib/adminAuth';
import { getOperatorSupabaseConfig } from './lib/supabase';

export async function proxy(request: NextRequest) {
  const config = getOperatorSupabaseConfig();
  const pathname = request.nextUrl.pathname;

  if (!config?.url || !config.anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (pathname === '/login') {
    if (!user) {
      return response;
    }

    const { data: roleData } = await supabase
      .from('admin_user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role && OPERATOR_ROLES.includes(roleData.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    await supabase.auth.signOut();
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: roleData } = await supabase
    .from('admin_user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = roleData?.role;

  if (!role || !OPERATOR_ROLES.includes(role)) {
    return NextResponse.redirect(new URL('/login?error=Access%20denied.%20Ask%20an%20administrator%20to%20assign%20your%20role.', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
