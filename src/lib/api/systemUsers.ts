import { supabase } from '@/integrations/supabase/client';
import type { SystemUser } from '@/types';

// Untyped table accessor — `system_users` isn't in the generated Database types.
const sb = supabase as any;

// Note: the live `system_users` table has no `password` column — auth
// credentials live entirely in Supabase Auth. `SystemUser.password` is kept
// in the app's type for legacy call sites but is never persisted here.
function toRow(user: SystemUser) {
  return {
    id: user.id,
    name: user.name ?? '',
    gender: user.gender || 'Male',
    ra_number: user.raNumber ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    office: user.office || 'MLS',
    designation: user.designation ?? '',
    role_id: user.roleId || null,
    is_active: user.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: any): SystemUser {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    raNumber: row.ra_number ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    office: row.office,
    designation: row.designation ?? '',
    roleId: row.role_id,
    isActive: row.is_active,
    password: '',
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function fetchSystemUsers(): Promise<SystemUser[]> {
  const { data, error } = await sb.from('system_users').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function insertSystemUser(user: SystemUser): Promise<void> {
  // A DB trigger auto-creates a placeholder system_users row when a new
  // Supabase Auth user signs up, so this must upsert rather than insert —
  // a plain insert 409s on the id the trigger already claimed.
  const { error } = await sb.from('system_users').upsert(toRow(user));
  if (error) throw error;
}

export async function updateSystemUserRow(id: string, user: SystemUser): Promise<void> {
  const { error } = await sb.from('system_users').update(toRow(user)).eq('id', id);
  if (error) throw error;
}

export async function deleteSystemUserRow(id: string): Promise<void> {
  const { error } = await sb.from('system_users').delete().eq('id', id);
  if (error) throw error;
}
