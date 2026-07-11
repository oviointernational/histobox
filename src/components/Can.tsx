import { ReactNode } from 'react';
import type { Action, Resource } from '@/lib/rbac';

interface Props {
  resource: Resource | string;
  action: Action | string;
  fallback?: ReactNode;
  children: ReactNode;
}

// Permission gating disabled: every logged-in user can do everything.
export const Can = ({ children }: Props) => <>{children}</>;

export default Can;
