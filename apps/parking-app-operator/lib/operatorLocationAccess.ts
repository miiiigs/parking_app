type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

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
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to verify operator location assignment (${response.status}).`);
  }

  const rows = (await response.json().catch(() => [])) as Array<{ user_id?: string; location_id?: string }>;
  return rows.some((row) => row.user_id === userId && row.location_id === locationId);
}
