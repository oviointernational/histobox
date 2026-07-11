import { Settings, User, Menu, Moon, Sun, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AppHeader = () => {
  const { currentUser, logout, sidebarOpen, setSidebarOpen, darkMode, setDarkMode, hasPermission, settings } = useStore();
  const isSuperAdmin = hasPermission('manage_settings');
  const currentRoleName = settings.roles.find(r => r.id === currentUser?.role)?.name || currentUser?.role;
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-20 sticky top-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
        {!isHome && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <button onClick={() => navigate('/')} className="flex items-center gap-0 hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-display font-bold tracking-tight">
            {(() => {
              const siteName = ((settings as any).siteName as string) || 'Histobox';
              const upper = siteName.toUpperCase();
              const half = Math.ceil(upper.length / 2);
              return <><span className="text-primary">{upper.slice(0, half)}</span><span className="text-foreground">{upper.slice(half)}</span></>;
            })()}
          </h1>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="text-muted-foreground hover:text-foreground">
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {isSuperAdmin && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 hover:bg-primary/20">
              <User className="h-4 w-4 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentRoleName}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>My Profile</DropdownMenuItem>
            {isSuperAdmin && <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>}
            <DropdownMenuItem onClick={async () => { const { supabase } = await import('@/integrations/supabase/client'); await supabase.auth.signOut(); logout(); navigate('/login'); }}>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
