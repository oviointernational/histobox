import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { syncAuthenticatedUser } from '@/lib/auth';

interface ProtectedRouteProps { children: ReactNode; }

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session) {
        useStore.getState().logout();
        if (active) { setAuthorized(false); setChecking(false); }
        return;
      }
      try {
        const ok = await syncAuthenticatedUser(session);
        if (active) setAuthorized(ok);
      } catch (error) {
        console.error('[auth] profile sync failed', error);
        useStore.getState().logout();
        if (active) setAuthorized(false);
      } finally {
        if (active) setChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useStore.getState().logout();
        if (active) { setAuthorized(false); setChecking(false); }
      } else if (event === 'SIGNED_IN' && session) {
        setChecking(true);
        void applySession(session);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
    </div>
  );
  if (!authorized || !isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
