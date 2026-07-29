import { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import type { Action, Resource } from '@/lib/rbac';

interface Props {
  resource: Resource | string;
  action: Action | string;
  fallback?: ReactNode;
  children: ReactNode;
}

const permissionMap: Record<string, string> = {
  'cases:read': 'view_cases', 'cases:create': 'add_entry', 'cases:update': 'edit_entry', 'cases:delete': 'delete_entry',
  'roles:read': 'manage_roles', 'roles:create': 'manage_roles', 'roles:update': 'manage_roles', 'roles:delete': 'manage_roles',
  'users:read': 'manage_users', 'users:create': 'register_users', 'users:update': 'manage_users', 'users:delete': 'manage_users',
  'settings:read': 'manage_settings', 'settings:update': 'manage_settings',
};

export const Can = ({ resource, action, fallback = null, children }: Props) => {
  const permission = permissionMap[`${resource}:${action}`] || `${action}_${resource}`;
  const allowed = useStore((state) => state.hasPermission(permission));
  return allowed ? <>{children}</> : <>{fallback}</>;
};

export default Can;
