import { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

const Layout = ({ children, hideSidebar }: LayoutProps) => {
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && <AppSidebar />}
        <main
          className={cn(
            'flex-1 overflow-y-auto transition-all duration-300',
            !hideSidebar && (sidebarOpen ? 'md:ml-64' : 'md:ml-14'),
            /* On mobile, never shift — sidebar is overlay */
            'ml-0'
          )}
        >
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
