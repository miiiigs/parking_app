import { createClient } from '@supabase/supabase-js';

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type DashboardRole = 'admin' | 'operator' | 'support' | 'finance';
type AuthAdminUserLike = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
};
type AuthAdminClientLike = {
  auth: {
    admin: {
      inviteUserByEmail(
        email: string,
        options?: { data?: object; redirectTo?: string },
      ): Promise<{ data: { user: AuthAdminUserLike | null }; error: { message: string } | null }>;
      listUsers(options: {
        page: number;
        perPage: number;
      }): Promise<{ data: { users: AuthAdminUserLike[] }; error: { message: string } | null }>;
    };
  };
};

function getServiceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

async function readRestList<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as T[]) : [];
}

async function readRestFirst<T>(response: Response): Promise<T | null> {
  const rows = await readRestList<T>(response);
  return rows[0] ?? null;
}

export type ManagedLocation = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DashboardRoleAccount = {
  user_id: string;
  display_name: string | null;
  role: DashboardRole;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuthUserLookup = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
};

function getAdminHeaders(serviceRoleKey: string) {
  return {
    ...getServiceHeaders(serviceRoleKey),
    Prefer: 'return=representation',
  } as Record<string, string>;
}

function getAuthAdminClient(url: string, serviceRoleKey: string): AuthAdminClientLike {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function toAuthUserLookup(user: AuthAdminUserLike): AuthUserLookup {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    displayName:
      typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
  };
}

export function normalizeManagedLocationCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function listManagedLocations({
  url,
  serviceRoleKey,
  includeInactive = true,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  includeInactive?: boolean;
  fetcher?: FetchLike;
}) {
  const activeFilter = includeInactive ? '' : '&is_active=eq.true';
  const response = await fetcher(
    `${url}/rest/v1/locations?select=id,name,code,address,city,is_active,created_at,updated_at${activeFilter}&order=created_at.asc`,
    {
      headers: getServiceHeaders(serviceRoleKey),
      cache: 'no-store',
    },
  );

  return readRestList<ManagedLocation>(response);
}

export async function createManagedLocation({
  url,
  serviceRoleKey,
  name,
  code,
  address,
  city,
  isActive,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  name: string;
  code: string;
  address: string;
  city: string;
  isActive: boolean;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(`${url}/rest/v1/locations`, {
    method: 'POST',
    headers: getAdminHeaders(serviceRoleKey),
    body: JSON.stringify({
      name,
      code: normalizeManagedLocationCode(code),
      address,
      city,
      is_active: isActive,
    }),
    cache: 'no-store',
  });

  return readRestFirst<ManagedLocation>(response);
}

export async function updateManagedLocation({
  url,
  serviceRoleKey,
  locationId,
  name,
  code,
  address,
  city,
  isActive,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  locationId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  isActive: boolean;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(
    `${url}/rest/v1/locations?id=eq.${encodeURIComponent(locationId)}`,
    {
      method: 'PATCH',
      headers: getAdminHeaders(serviceRoleKey),
      body: JSON.stringify({
        name,
        code: normalizeManagedLocationCode(code),
        address,
        city,
        is_active: isActive,
      }),
      cache: 'no-store',
    },
  );

  return readRestFirst<ManagedLocation>(response);
}

export async function readDashboardRoleAccount({
  url,
  serviceRoleKey,
  userId,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  userId: string;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(
    `${url}/rest/v1/admin_user_roles?select=user_id,display_name,role,created_at,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: getServiceHeaders(serviceRoleKey),
      cache: 'no-store',
    },
  );

  return readRestFirst<DashboardRoleAccount>(response);
}

export async function upsertDashboardRoleAccount({
  url,
  serviceRoleKey,
  userId,
  role,
  displayName,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  userId: string;
  role: DashboardRole;
  displayName?: string | null;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(`${url}/rest/v1/admin_user_roles`, {
    method: 'POST',
    headers: {
      ...getAdminHeaders(serviceRoleKey),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      role,
      display_name: displayName ?? null,
    }),
    cache: 'no-store',
  });

  return readRestFirst<DashboardRoleAccount>(response);
}

export async function findAuthUserByEmail({
  url,
  serviceRoleKey,
  email,
  adminClient,
}: {
  url: string;
  serviceRoleKey: string;
  email: string;
  adminClient?: AuthAdminClientLike;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = adminClient ?? getAuthAdminClient(url, serviceRoleKey);

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Unable to look up Supabase Auth users (${error.message}).`);
    }

    const matchedUser = data.users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
    if (matchedUser) {
      return toAuthUserLookup(matchedUser);
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function inviteAuthUserByEmail({
  url,
  serviceRoleKey,
  email,
  displayName,
  redirectTo,
  adminClient,
}: {
  url: string;
  serviceRoleKey: string;
  email: string;
  displayName?: string | null;
  redirectTo?: string;
  adminClient?: AuthAdminClientLike;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedDisplayName = displayName?.trim() ?? '';
  const client = adminClient ?? getAuthAdminClient(url, serviceRoleKey);

  const { data, error } = await client.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: trimmedDisplayName
      ? {
          display_name: trimmedDisplayName,
          full_name: trimmedDisplayName,
        }
      : undefined,
    redirectTo,
  });

  if (error) {
    throw new Error(`Unable to invite Supabase Auth user (${error.message}).`);
  }

  if (!data.user) {
    throw new Error('Unable to invite Supabase Auth user (missing invited user response).');
  }

  return toAuthUserLookup(data.user);
}
