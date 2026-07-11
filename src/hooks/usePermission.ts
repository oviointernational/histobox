import type { Resource, Action } from '@/lib/rbac';

// Permission gating disabled: any logged-in user can do everything.
// All checks return true so existing call sites continue to work.
export function invalidatePermissions() {}

export function usePermission() {
  const can = (_resource: Resource | string, _action: Action | string) => true;
  const canAny = (_resource: Resource | string) => true;
  return { can, canAny, isAdmin: true, isLoading: false, permissions: null };
}
