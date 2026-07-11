import { ReactNode } from 'react';

interface Props {
  permission: string;
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Permission gating has been disabled. Any logged-in user can access
 * everything. This component is now a passthrough kept for compatibility.
 */
const RequirePermission = ({ children }: Props) => <>{children}</>;

export default RequirePermission;