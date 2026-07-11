import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { getCaseIdentifier } from '@/lib/caseIdentifier';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const CaseLog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cases, settings } = useStore();
  const caseEntry = cases.find(c => c.id === id);

  if (!caseEntry) return <Layout><p className="text-muted-foreground">Case not found</p></Layout>;

  // Check if a log event is flag-related
  const isFlagLog = (event: string) => {
    const lower = event.toLowerCase();
    return lower.includes('flag') || lower.includes('issue');
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-2xl font-display font-bold">Activity Log — {getCaseIdentifier(caseEntry, settings)}</h2>
        </div>

        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {caseEntry.logs.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No log entries yet</p>
          ) : (
            caseEntry.logs.map(log => (
              <div key={log.id} className={cn(
                'px-5 py-3 flex items-start gap-3',
                isFlagLog(log.event) && 'bg-warning/10'
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full mt-2 shrink-0',
                  isFlagLog(log.event) ? 'bg-warning' : 'bg-primary'
                )} />
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {isFlagLog(log.event) && <Flag className="h-3 w-3 text-warning" />}
                    {log.event}
                  </p>
                  {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(log.timestamp).toLocaleString()} · {log.user}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CaseLog;
