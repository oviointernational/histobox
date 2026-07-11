import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  FlaskConical, Microscope, FileSignature, Users, AlertCircle,
  ClipboardList, FileText, Wrench, CheckCircle, Clock, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning, 38 92% 50%))',
  'hsl(142 76% 36%)', 'hsl(262 83% 58%)', 'hsl(199 89% 48%)', 'hsl(24 95% 53%)', 'hsl(350 89% 60%)',
];

const Dashboard = () => {
  const { cases, requests, reports, equipment, systemUsers, queryCases, settings } = useStore();

  const stats = useMemo(() => {
    const stepCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalFlags = 0;
    let activeFlags = 0;

    cases.forEach(c => {
      stepCounts[c.currentStep] = (stepCounts[c.currentStep] || 0) + 1;
      statusCounts[c.currentStatus] = (statusCounts[c.currentStatus] || 0) + 1;
      typeCounts[c.caseType] = (typeCounts[c.caseType] || 0) + 1;
      const flags = c.flags || c.issues || [];
      totalFlags += flags.length;
      activeFlags += flags.filter(i => !i.isFixed).length;
    });

    const stepData = Object.entries(stepCounts).map(([name, value]) => ({ name: name === 'Done' ? 'Signed Out' : name, value }));
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    const pendingRequests = requests.filter(r => r.status === 'Pending').length;
    const inProgressRequests = requests.filter(r => r.status === 'In Progress').length;
    const completedRequests = requests.filter(r => r.status === 'Completed').length;
    const openQueries = queryCases.filter(q => q.status === 'Open').length;
    const activeUsers = systemUsers.filter(u => u.isActive).length;
    const signedOut = cases.filter(c => c.currentStatus === 'Signed Out' || c.currentStep === 'Done').length;
    const atMicroscopy = cases.filter(c => c.currentStep === 'Microscopy').length;
    const inBench = cases.filter(c => !['Microscopy', 'SignOut', 'Done'].includes(c.currentStep)).length;

    return {
      total: cases.length, signedOut, atMicroscopy, inBench,
      stepData, typeData, totalFlags, activeFlags,
      pendingRequests, inProgressRequests, completedRequests,
      openQueries, activeUsers, totalReports: reports.length,
      totalEquipment: equipment.length,
    };
  }, [cases, requests, reports, equipment, systemUsers, queryCases]);

  const statCard = (title: string, value: number | string, Icon: any, color?: string, subtitle?: string) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', color || 'bg-primary/10')}>
          <Icon className={cn('h-6 w-6', color ? 'text-white' : 'text-primary')} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold font-display">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );

  const completionPct = stats.total > 0 ? Math.round((stats.signedOut / stats.total) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Overview</h2>
            <PageTip content="Dashboard overview showing key statistics, workflow distribution charts, and system health. Monitor case progress, active flags, and team activity at a glance." />
          </div>
          <Badge variant="outline" className="text-xs">
            {completionPct}% Completion Rate
          </Badge>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {statCard('Total Cases', stats.total, Package)}
          {statCard('In Bench Flow', stats.inBench, FlaskConical)}
          {statCard('At Microscopy', stats.atMicroscopy, Microscope)}
          {statCard('Signed Out', stats.signedOut, FileSignature, 'bg-green-600')}
          {statCard('Active Flags', stats.activeFlags, AlertCircle, stats.activeFlags > 0 ? 'bg-red-600' : undefined)}
          {statCard('Pending Requests', stats.pendingRequests, ClipboardList)}
          {statCard('Open Queries', stats.openQueries, Clock, stats.openQueries > 0 ? 'bg-amber-600' : undefined)}
          {statCard('Reports', stats.totalReports, FileText)}
          {statCard('Equipment', stats.totalEquipment, Wrench)}
          {statCard('Active Users', stats.activeUsers, Users)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Cases by Step */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Cases by Workflow Step</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.stepData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cases by Type */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Cases by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.typeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {stats.typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Requests Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Special Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: stats.pendingRequests },
                        { name: 'In Progress', value: stats.inProgressRequests },
                        { name: 'Completed', value: stats.completedRequests },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                    >
                      <Cell fill="hsl(var(--warning, 38 92% 50%))" />
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(142 76% 36%)" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">System Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Flags</p>
                  <p className="text-xl font-bold">{stats.totalFlags}</p>
                  <p className="text-[10px] text-muted-foreground">{stats.activeFlags} active / {stats.totalFlags - stats.activeFlags} fixed</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Completion</p>
                  <p className="text-xl font-bold">{completionPct}%</p>
                  <p className="text-[10px] text-muted-foreground">{stats.signedOut} of {stats.total} cases</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Roles Defined</p>
                  <p className="text-xl font-bold">{settings.roles.length}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Stain Categories</p>
                  <p className="text-xl font-bold">{settings.variables.stainCategories.length}</p>
                  <p className="text-[10px] text-muted-foreground">{settings.variables.stainTypes.length} total stains</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
