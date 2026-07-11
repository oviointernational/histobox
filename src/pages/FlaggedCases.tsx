import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Flag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const FlaggedCases = () => {
  const navigate = useNavigate();
  const { cases } = useStore();
  const [viewFlags, setViewFlags] = useState<string | null>(null);

  const flagged = useMemo(() => {
    return cases.filter(c => {
      const flags = c.flags || c.issues || [];
      return flags.length > 0;
    }).sort((a, b) => {
      const aActive = (a.flags || a.issues || []).filter(f => !f.isFixed).length;
      const bActive = (b.flags || b.issues || []).filter(f => !f.isFixed).length;
      return bActive - aActive;
    });
  }, [cases]);

  const viewingCase = cases.find(c => c.id === viewFlags);
  const viewingFlags = viewingCase ? (viewingCase.flags || viewingCase.issues || []) : [];

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-display font-bold">Flagged Cases</h2>
          <Badge variant="outline" className="bg-warning/15 text-warning">{flagged.length}</Badge>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flags</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {flagged.map(c => {
                const allFlags = c.flags || c.issues || [];
                const active = allFlags.filter(f => !f.isFixed).length;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary cursor-pointer hover:underline" onClick={() => navigate(`/case/${c.id}`)}>{c.hospitalNumber}</td>
                    <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.currentStatus}</Badge></td>
                    <td className="px-4 py-3">
                      <Button variant={active > 0 ? 'destructive' : 'outline'} size="sm" className="h-7 text-xs gap-1" onClick={() => setViewFlags(c.id)}>
                        <Flag className="h-3 w-3" /> {allFlags.length} ({active} active)
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/case/${c.id}/log`)}>View Log</Button>
                    </td>
                  </tr>
                );
              })}
              {flagged.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No flagged cases</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Flag Details Dialog */}
        <Dialog open={!!viewFlags} onOpenChange={o => { if (!o) setViewFlags(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Flags — {viewingCase?.hospitalNumber}</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {viewingFlags.map(f => (
                <div key={f.id} className={cn('rounded-lg px-3 py-2 text-sm', f.isFixed ? 'bg-muted/50' : 'bg-warning/15')}>
                  <div className="flex items-center justify-between">
                    <span className={f.isFixed ? 'line-through text-muted-foreground' : ''}>{f.description}</span>
                    <Badge variant={f.isFixed ? 'secondary' : 'destructive'} className="text-[10px]">{f.isFixed ? 'Fixed' : 'Active'}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    By {f.createdBy} · {new Date(f.createdAt).toLocaleString()}
                    {f.isFixed && f.fixedBy && ` · Fixed by ${f.fixedBy}`}
                  </p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FlaggedCases;
