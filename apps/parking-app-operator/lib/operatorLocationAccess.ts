type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type OperatorLocationAssignment = {
  user_id: string;
  location_id: string;
  assigned_by?: string | null;
  created_at?: string | null;
};

function getAssignmentHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

export async function hasOperatorLocationAssignment({
  url,
  serviceRoleKey,
  userId,
  locationId,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  userId: string;
  locationId: string;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(
    `${url}/rest/v1/operator_location_assignments?select=user_id,location_id&user_id=eq.${encodeURIComponent(userId)}&location_id=eq.${encodeURIComponent(locationId)}&limit=1`,
    {
      headers: getAssignmentHeaders(serviceRoleKey),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to verify operator location assignment (${response.status}).`);
  }

  const rows = (await response.json().catch(() => [])) as Array<{ user_id?: string; location_id?: string }>;
  return rows.some((row) => row.user_id === userId && row.location_id === locationId);
}

export async function listOperatorLocationAssignments({
  url,
  serviceRoleKey,
  userId,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  userId?: string | null;
  fetcher?: FetchLike;
}) {
  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '';
  const response = await fetcher(
    `${url}/rest/v1/operator_location_assignments?select=user_id,location_id,assigned_by,created_at${userFilter}&order=created_at.desc`,
    {
      headers: getAssignmentHeaders(serviceRoleKey),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to list operator location assignments (${response.status}).`);
  }

  const rows = (await response.json().catch(() => [])) as OperatorLocationAssignment[];
  return Array.isArray(rows) ? rows : [];
}

export async function createOperatorLocationAssignment({
  url,
  serviceRoleKey,
  userId,
  locationId,
  assignedBy,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  userId: string;
  locationId: string;
  assignedBy: string;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(`${url}/rest/v1/operator_location_assignments`, {
    method: 'POST',
    headers: {
      ...getAssignmentHeaders(serviceRoleKey),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      location_id: locationId,
      assigned_by: assignedBy,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Unable to create operator location assignment (${response.status}).`);
  }

  return ((await response.json().catch(() => [])) as OperatorLocationAssignment[])[0] ?? null;
}

export async function deleteOperatorLocationAssignment({
  url,
  serviceRoleKey,
  userId,
  locationId,
  fetcher = fetch,
}: {
  url: string;
  serviceRoleKey: string;
  userId: string;
  locationId: string;
  fetcher?: FetchLike;
}) {
  const response = await fetcher(
    `${url}/rest/v1/operator_location_assignments?user_id=eq.${encodeURIComponent(userId)}&location_id=eq.${encodeURIComponent(locationId)}`,
    {
      method: 'DELETE',
      headers: {
        ...getAssignmentHeaders(serviceRoleKey),
        Prefer: 'return=representation',
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to delete operator location assignment (${response.status}).`);
  }

  return ((await response.json().catch(() => [])) as OperatorLocationAssignment[])[0] ?? null;
}
