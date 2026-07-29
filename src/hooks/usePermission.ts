import { useStore } from '@/store/useStore';
import type { Resource, Action } from '@/lib/rbac';

const permissionMap: Record<string, string> = {
  'cases:read': 'view_cases', 'cases:create': 'add_entry', 'cases:update': 'edit_entry', 'cases:delete': 'delete_entry',
  'roles:read': 'manage_roles', 'roles:create': 'manage_roles', 'roles:update': 'manage_roles', 'roles:delete': 'manage_roles',
  'users:read': 'manage_users', 'users:create': 'register_users', 'users:update': 'manage_users', 'users:delete': 'manage_users',
  'settings:read': 'manage_settings', 'settings:update': 'manage_settings',
};

export function invalidatePermissions() {
  void useStore.getState().loadSettingsFromDB();
}

export function usePermission() {
  const hasPermission = useStore((state) => state.hasPermission);
  const currentUser = useStore((state) => state.currentUser);
  const can = (resource: Resource | string, action: Action | string) => hasPermission(permissionMap[`${resource}:${action}`] || `${action}_${resource}`);
  const canAny = (resource: Resource | string) => ['read', 'create', 'update', 'delete'].some((action) => can(resource, action));
  return {
    can,
    canAny,
    isAdmin: hasPermission('manage_roles') || hasPermission('manage_users'),
    isLoading: !!currentUser && !useStore.getState()._hasHydrated,
    permissions: null,
  };
}
