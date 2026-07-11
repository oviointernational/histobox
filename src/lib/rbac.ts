import { supabase } from '@/integrations/supabase/client';

export const RESOURCES = [
  'cases','reports','maintenance','equipment','reagent','immuno_reagent',
  'immuno_manual','lab_supply','exam','roster','misc','query','requests',
  'stains','users','roles','settings',
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ['create','read','update','delete'] as const;
export type Action = (typeof ACTIONS)[number];

export const RESOURCE_LABELS: Record<Resource, string> = {
  cases: 'Cases',
  reports: 'Reports',
  maintenance: 'Maintenance',
  equipment: 'Equipment',
  reagent: 'Reagent',
  immuno_reagent: 'Immuno Reagent',
  immuno_manual: 'Immuno Manual',
  lab_supply: 'Lab Inventory',
  exam: 'Exam',
  roster: 'Roster',
  misc: 'Misc',
  query: 'Query',
  requests: 'Special Requests',
  stains: 'Stains',
  users: 'Users',
  roles: 'Roles & Access',
  settings: 'Settings',
};

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
}

// Untyped table accessor — these tables aren't in generated Database types yet.
const sb = supabase as any;

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await sb.from('roles').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createRole(name: string, description?: string): Promise<Role> {
  const { data, error } = await sb.from('roles').insert({ name, description: description ?? null }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRole(id: string, patch: Partial<Pick<Role,'name'|'description'>>): Promise<void> {
  const { error } = await sb.from('roles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await sb.from('roles').delete().eq('id', id);
  if (error) throw error;
}

export async function listPermissions(): Promise<Permission[]> {
  const { data, error } = await sb.from('permissions').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function getRolePermissionIds(roleId: string): Promise<string[]> {
  const { data, error } = await sb.from('role_permissions').select('permission_id').eq('role_id', roleId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.permission_id);
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const current = await getRolePermissionIds(roleId);
  const toAdd = permissionIds.filter(id => !current.includes(id));
  const toRemove = current.filter(id => !permissionIds.includes(id));

  if (toRemove.length) {
    const { error } = await sb.from('role_permissions').delete().eq('role_id', roleId).in('permission_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await sb.from('role_permissions').insert(toAdd.map(pid => ({ role_id: roleId, permission_id: pid })));
    if (error) throw error;
  }
}

export interface UserWithRoles {
  id: string;
  email: string | null;
  full_name: string | null;
  role_ids: string[];
  created_at?: string;
}

export async function listUsersWithRoles(): Promise<UserWithRoles[]> {
  const res = await fetch('/api/public/admin-users', { method: 'GET' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Failed (${res.status})`);
  const json = await res.json();
  return (json.users ?? []) as UserWithRoles[];
}

export async function setUserRole(userId: string, roleId: string | null): Promise<void> {
  await adminPatchUser({ userId, roleId });
}

export async function adminPatchUser(patch: {
  userId: string;
  email?: string;
  password?: string;
  full_name?: string;
  roleId?: string | null;
}): Promise<void> {
  const res = await fetch('/api/public/admin-users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Failed (${res.status})`);
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const res = await fetch('/api/public/admin-users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Failed (${res.status})`);
}

export async function fetchMyPermissions(): Promise<Set<string>> {
  const { data, error } = await sb.rpc('current_user_permissions');
  if (error) {
    // Fallback if RPC not yet created — assume no perms.
    return new Set();
  }
  return new Set((data ?? []).map((r: any) => `${r.resource}:${r.action}`));
}
