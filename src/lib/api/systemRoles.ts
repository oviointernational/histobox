import { supabase } from '@/integrations/supabase/client';
import type { SystemRole } from '@/types';

// Untyped table accessor — `system_roles` isn't in the generated Database types.
const sb = supabase as any;

function toRow(role: SystemRole) {
  return {
    id: role.id,
    name: role.name,
    is_default: role.isDefault,
    permissions: role.permissions ?? [],
  };
}

function fromRow(row: any): SystemRole {
  return {
    id: row.id,
    name: row.name,
    isDefault: !!row.is_default,
    permissions: row.permissions ?? [],
  };
}

export async function fetchSystemRoles(): Promise<SystemRole[]> {
  const { data, error } = await sb.from('system_roles').select('*');
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function upsertSystemRole(role: SystemRole): Promise<void> {
  const { error } = await sb.from('system_roles').upsert(toRow(role));
  if (error) throw error;
}

export async function deleteSystemRoleRow(id: string): Promise<void> {
  const { error } = await sb.from('system_roles').delete().eq('id', id);
  if (error) throw error;
}

export async function setDefaultSystemRoleRow(id: string, allRoleIds: string[]): Promise<void> {
  const { error } = await sb
    .from('system_roles')
    .update({ is_default: false })
    .in('id', allRoleIds);
  if (error) throw error;
  const { error: error2 } = await sb.from('system_roles').update({ is_default: true }).eq('id', id);
  if (error2) throw error2;
}

export async function seedSystemRolesIfEmpty(defaults: SystemRole[]): Promise<SystemRole[]> {
  const existing = await fetchSystemRoles();
  if (existing.length > 0) return existing;
  const { error } = await sb.from('system_roles').insert(defaults.map(toRow));
  if (error) throw error;
  return defaults;
}
