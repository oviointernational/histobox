import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

interface Props {
  permission: string;
  redirectTo?: string;
  children: ReactNode;
}

const RequirePermission = ({ permission, redirectTo = '/profile', children }: Props) => {
  const allowed = useStore((state) => state.hasPermission(permission));
  return allowed ? <>{children}</> : <Navigate to={redirectTo} replace />;
};

export default RequirePermission;
