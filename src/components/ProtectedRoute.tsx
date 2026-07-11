import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session) {
          setHasSession(true);

          // Pull real cases/users from Supabase now that we have a session
          useStore.getState().fetchCases();
          useStore.getState().fetchSystemUsers();

          // If store doesn't have the user yet, try to restore from session
          if (!useStore.getState().isAuthenticated) {
            const email = session.user.email;
            if (email) {
              // Wait for store hydration (up to 5s)
              let attempts = 0;
              const tryRestore = () => {
                const state = useStore.getState();
                let sysUser = state.systemUsers.find(
                  u => u.email?.toLowerCase() === email.toLowerCase()
                );
                const fallbackRoleId = state.settings.defaultRoleId;

                if (!sysUser && state._hasHydrated) {
                  // Auto-create default-role profile for any signed-in user without a profile
                  const newUser = {
                    id: session.user.id || crypto.randomUUID(),
                    name: email.split('@')[0],
                    gender: 'Male' as const,
                    raNumber: '', phone: '', email,
                    office: 'MLS' as const, designation: '',
                    roleId: fallbackRoleId, isActive: true, password: '',
                    createdAt: new Date(), updatedAt: new Date(),
                  };
                  state.addSystemUser(newUser);
                  sysUser = newUser;
                }

                if (sysUser) {
                  useStore.getState().login({
                    id: sysUser.id,
                    name: sysUser.name,
                    phone: sysUser.phone,
                    role: sysUser.roleId,
                    raNumber: sysUser.raNumber,
                  });
                  return true;
                }
                return false;
              };

              if (!tryRestore() && !useStore.getState()._hasHydrated) {
                // Wait for hydration then try again
                const interval = setInterval(() => {
                  attempts++;
                  if (tryRestore() || attempts > 25) {
                    clearInterval(interval);
                  }
                }, 200);
              }
            }
          }
        }
      } catch {
        // ignore
      }

      if (mounted) setSessionChecked(true);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      if (!session) {
        useStore.getState().logout();
      }
    });

    // Fallback timeout
    const timeout = setTimeout(() => {
      if (mounted && !sessionChecked) setSessionChecked(true);
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasSession && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
