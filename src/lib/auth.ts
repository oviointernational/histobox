import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { SystemUser, User } from '@/types';
import { fetchSystemUsers } from '@/lib/api/systemUsers';

/** Load the authenticated user's profile and authoritative role data. */
export async function resolveSessionUser(session: Session): Promise<{ profile: SystemUser; user: User } | null> {
  await useAuthoritativeSettings();
  const users = await fetchSystemUsers();
  const profile = users.find((entry) => entry.id === session.user.id);
  if (!profile || !profile.isActive || !profile.roleId) return null;
  return {
    profile,
    user: {
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      role: profile.roleId,
      raNumber: profile.raNumber,
    },
  };
}

async function useAuthoritativeSettings() {
  const { useStore } = await import('@/store/useStore');
  await useStore.getState().loadSettingsFromDB();
}

export async function syncAuthenticatedUser(session: Session): Promise<boolean> {
  const { useStore } = await import('@/store/useStore');
  const resolved = await resolveSessionUser(session);
  if (!resolved) {
    useStore.getState().logout();
    return false;
  }
  useStore.setState({ systemUsers: await fetchSystemUsers() });
  useStore.getState().login(resolved.user);
  // Access is ready once the authenticated profile is resolved. Load page data
  // in the background so route rendering is not delayed by every database fetch.
  void Promise.all([
    useStore.getState().fetchCases(),
    useStore.getState().fetchAll(),
  ]).catch((error) => console.error('[auth] background data load failed', error));
  return true;
}

export async function signOutEverywhereLocally() {
  const { useStore } = await import('@/store/useStore');
  await supabase.auth.signOut();
  useStore.getState().logout();
}
