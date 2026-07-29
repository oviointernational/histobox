import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  LayoutDashboard, FlaskConical, Microscope, FileSignature,
  ChevronDown, ChevronRight, Droplets,
  Cog, Box, Scissors, Paintbrush, Frame, TestTubes,
  FileText, Wrench, ClipboardList, HelpCircle, LogOut,
  Beaker, Syringe, Package, GraduationCap, BookOpen, CalendarDays, LayoutList,
  MoveRight, ShieldCheck, ClipboardCheck, UserCheck
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const benchFlowItems = [
  { title: 'Fixation', path: '/bench/fixation', icon: Droplets, perm: 'bench_fixation' },
  { title: 'Processing', path: '/bench/processing', icon: Cog, perm: 'bench_processing' },
  { title: 'Embedding', path: '/bench/embedding', icon: Box, perm: 'bench_embedding' },
  { title: 'Microtomy', path: '/bench/microtomy', icon: Scissors, perm: 'bench_microtomy' },
  { title: 'Cyto Analysis', path: '/bench/cyto-analysis', icon: TestTubes, perm: 'bench_cyto_analysis' },
  { title: 'Staining', path: '/bench/staining', icon: Paintbrush, perm: 'bench_staining' },
  { title: 'Mounting', path: '/bench/mounting', icon: Frame, perm: 'bench_mounting' },
];

const AppSidebar = () => {
  const { sidebarOpen, setSidebarOpen, logout, hasPermission } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [benchOpen, setBenchOpen] = useState(location.pathname.startsWith('/bench'));

  const isActive = (path: string) => location.pathname === path;
  const isBenchActive = location.pathname.startsWith('/bench');
  const collapsed = !sidebarOpen;

  const hasBenchPerm = benchFlowItems.some(b => hasPermission(b.perm));

  const navItem = (title: string, path: string, Icon: any, permission?: string | string[]) => {
    if (permission) {
      const perms = Array.isArray(permission) ? permission : [permission];
      if (!perms.some(p => hasPermission(p))) return null;
    }
    const active = isActive(path);
    const btn = (
      <button
        key={path}
        onClick={() => { navigate(path); if (window.innerWidth < 768) setSidebarOpen(false); }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          collapsed && 'justify-center px-2',
          active
            ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{title}</span>}
      </button>
    );
    if (collapsed) {
      return (
        <Tooltip key={path}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{title}</TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 shrink-0 overflow-hidden',
          sidebarOpen
            ? 'w-64 max-w-[85vw] translate-x-0'
            : 'w-0 -translate-x-full md:w-14 md:translate-x-0'
        )}
      >
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItem('Overview', '/', LayoutDashboard, 'view_overview')}
          {navItem('Cases', '/cases', ClipboardList, ['view_cases', 'view_overview'])}

          {/* Bench Flow */}
          {hasBenchPerm && (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { setSidebarOpen(true); setBenchOpen(true); }}
                    className={cn(
                      'w-full flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isBenchActive
                        ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <FlaskConical className="h-4 w-4 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Bench Flow</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <button
                  onClick={() => setBenchOpen(!benchOpen)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isBenchActive
                      ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-4 w-4 shrink-0" />
                    <span>Bench Flow</span>
                  </div>
                  {benchOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {benchOpen && (
                  <div className="ml-4 space-y-0.5 animate-fade-in">
                    {benchFlowItems.map(item => navItem(item.title, item.path, item.icon, item.perm))}
                  </div>
                )}
              </>
            )
          )}

          {navItem('Microscopy', '/microscopy', Microscope, ['view_microscopy', 'submit_microscopy'])}
          {navItem('Slide Movement', '/slide-movement', MoveRight, ['view_slide_movement', 'mark_slide_movement', 'confirm_slide_movement', 'raise_slide_movement_issue'])}
          {navItem('Case Sign Out', '/signout', FileSignature, ['view_signout', 'signout_approve'])}

          <div className="my-3 border-t border-sidebar-border" />

          {navItem('Quality Control', '/quality-control', ClipboardCheck, 'view_qc')}
          {navItem('Report', '/report', FileText, 'view_reports')}
          {navItem('Maintenance', '/maintenance', Wrench, 'view_maintenance')}
          {navItem('Reagent', '/reagent', Beaker, 'view_reagent')}
          {navItem('Immuno Reagent', '/immuno-reagent', Syringe, 'view_immuno_reagent')}
          {navItem('Immuno Manual', '/immuno-manual', BookOpen, 'view_immuno_manual')}
          {navItem('Lab Inventory', '/lab-supply', Package, 'view_lab_supply')}

          <div className="my-3 border-t border-sidebar-border" />

          {navItem('Request', '/request', ClipboardList, ['view_requests', 'manage_requests'])}
          {navItem('Query', '/query', HelpCircle, ['view_query', 'manage_query'])}
          {navItem('Exam', '/exam', GraduationCap, 'view_exam')}
          {navItem('Attendance', '/attendance', ClipboardCheck, ['view_attendance', 'view_overview'])}
          {navItem('Roster', '/roster', CalendarDays, 'view_roster')}
          {navItem('Attendance', '/attendance', UserCheck, 'view_attendance')}
          {navItem('Misc', '/misc', LayoutList, ['view_misc', 'view_overview'])}

          
        </nav>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Log Out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
