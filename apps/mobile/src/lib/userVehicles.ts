import { ensureMobileAuthSession, getSupabaseClient } from './supabaseClient';
import type { WalkInVehicle } from '../features/parking/store/useWalkInPreferencesStore';

type UserVehicleRow = {
  id: string;
  model: string;
  color: string;
  plate_number: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type SaveUserVehicleParams = {
  id?: string;
  model: string;
  color: string;
  plate: string;
  isDefault?: boolean;
};

function mapVehicleRow(row: UserVehicleRow): WalkInVehicle {
  return {
    id: row.id,
    model: row.model,
    color: row.color,
    plate: row.plate_number,
    isDefault: row.is_default,
  };
}

function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim();
}

export async function listUserVehicles(): Promise<WalkInVehicle[]> {
  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  await ensureMobileAuthSession();

  const { data, error } = await supabase
    .from('user_vehicles')
    .select('id, model, color, plate_number, is_default, created_at, updated_at')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as UserVehicleRow[]).map(mapVehicleRow);
}

export async function saveUserVehicle(params: SaveUserVehicleParams): Promise<WalkInVehicle> {
  const supabase = getSupabaseClient() as any;
  const user = await ensureMobileAuthSession();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!user) {
    throw new Error('Sign in is required before you can save vehicles.');
  }

  const normalizedPlate = normalizePlate(params.plate);

  if (params.isDefault) {
    const { error: resetError } = await supabase
      .from('user_vehicles')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .neq('id', params.id ?? '00000000-0000-0000-0000-000000000000');

    if (resetError) {
      throw new Error(resetError.message);
    }
  }

  const payload = {
    user_id: user.id,
    model: params.model.trim(),
    color: params.color.trim(),
    plate_number: normalizedPlate,
    is_default: Boolean(params.isDefault),
  };

  const operation = params.id
    ? supabase.from('user_vehicles').update(payload).eq('id', params.id).select('id, model, color, plate_number, is_default, created_at, updated_at').single()
    : supabase.from('user_vehicles').insert(payload).select('id, model, color, plate_number, is_default, created_at, updated_at').single();

  const { data, error } = await operation;

  if (error) {
    if (error.code === '23505') {
      throw new Error('That plate number is already saved in your vehicle list.');
    }

    throw new Error(error.message);
  }

  return mapVehicleRow(data as UserVehicleRow);
}

export async function deleteUserVehicle(vehicleId: string) {
  const supabase = getSupabaseClient() as any;
  const user = await ensureMobileAuthSession();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!user) {
    throw new Error('Sign in is required before you can remove vehicles.');
  }

  const { error } = await supabase.from('user_vehicles').delete().eq('id', vehicleId);

  if (error) {
    throw new Error(error.message);
  }
}
