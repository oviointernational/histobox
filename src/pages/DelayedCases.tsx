import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock } from 'lucide-react';

const DelayedCases = () => {
  const navigate = useNavigate();
  const { cases, settings, getDisplayId } = useStore();
  const delayDays = settings.delayedDays || 7;
  const now = new Date();

  const delayed = useMemo(() => {
    return cases.filter(c => {
      if (c.currentStatus === 'Signed Out' || c.currentStep === 'Done') return false;
      const created = new Date(c.createdAt);
      const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= delayDays;
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [cases, delayDays]);

  const getDays = (d: Date) => Math.floor((now.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-display font-bold">Delayed Cases</h2>
          <Badge variant="destructive">{delayed.length}</Badge>
          <span className="text-xs text-muted-foreground">({'>'}{delayDays} days without sign-out)</span>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Current Step</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date Entered</th>
              </tr>
            </thead>
            <tbody>
              {delayed.map(c => (
                <tr key={c.id} onClick={() => navigate(`/case/${c.id}`)} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{c.hospitalNumber}</td>
                  <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.currentStep}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{c.currentStatus}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge variant="destructive" className="text-xs gap-1">
                      <Clock className="h-3 w-3" /> {getDays(c.createdAt)}d
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {delayed.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No delayed cases</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default DelayedCases;
