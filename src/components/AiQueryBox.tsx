import { useState } from 'react';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface AiQueryBoxProps {
  /** Which data domain to query */
  domain: 'cases' | 'maintenance' | 'reagent' | 'immuno' | 'report' | 'labsupply';
  className?: string;
}

const AiQueryBox = ({ domain, className }: AiQueryBoxProps) => {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const runQuery = () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');

    try {
      const q = query.toLowerCase();
      let data: any[] = [];

      if (domain === 'cases') {
        data = [...store.cases];

        // Parse stain queries: "cases with IHC of HER2", "cases with H & E"
        const stainMatch = q.match(/(?:cases?\s+)?(?:with|having|containing)\s+(?:stain\s+)?(?:of\s+)?(.+)/i);
        if (stainMatch) {
          const stainQuery = stainMatch[1].trim();
          // Check if it's category + stain: "IHC of HER2"
          const catStainMatch = stainQuery.match(/^(\w+)\s+(?:of|for|with)\s+(.+)/i);
          if (catStainMatch) {
            const catName = catStainMatch[1];
            const stainName = catStainMatch[2].trim();
            const cat = store.settings.variables.stainCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
            if (cat) {
              data = data.filter(c => c.stainRuns?.some((r: any) =>
                r.stainTypes.some((s: string) => s.toLowerCase().includes(stainName.toLowerCase()) && cat.stains.some(cs => cs.toLowerCase() === s.toLowerCase()))
              ));
            }
          } else {
            data = data.filter(c => c.stainRuns?.some((r: any) =>
              r.stainTypes.some((s: string) => s.toLowerCase().includes(stainQuery.toLowerCase()))
            ));
          }
        }

        // Status queries
        if (q.includes('delayed')) {
          const delayDays = store.settings.delayedDays || 7;
          const now = new Date();
          data = data.filter(c => {
            if (c.currentStatus === 'Signed Out' || c.currentStep === 'Done') return false;
            return (now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= delayDays;
          });
        }
        if (q.includes('flagged') || q.includes('flags')) {
          data = data.filter(c => (c.flags || c.issues || []).some((f: any) => !f.isFixed));
        }
        if (q.includes('signed out') || q.includes('completed')) {
          data = data.filter(c => c.currentStep === 'Done' || c.currentStatus === 'Signed Out');
        }
        if (q.includes('pending') || q.includes('active')) {
          data = data.filter(c => c.currentStep !== 'Done' && c.currentStatus !== 'Signed Out');
        }

        // Step queries
        const steps = ['fixation', 'processing', 'embedding', 'microtomy', 'staining', 'mounting', 'microscopy'];
        const stepMatch = steps.find(s => q.includes(s));
        if (stepMatch) {
          data = data.filter(c => c.currentStep.toLowerCase() === stepMatch);
        }

        // Type queries
        if (q.includes('histology') && !q.includes('histochemistry')) {
          data = data.filter(c => c.typeOfSample === 'Histology');
        }
        if (q.includes('cytology')) {
          data = data.filter(c => c.typeOfSample === 'Cytology');
        }
        if (q.includes('post mortem')) {
          data = data.filter(c => c.typeOfSample === 'Post Mortem');
        }

        // External block
        if (q.includes('external') || q.includes('outside') || q.includes('tissue block')) {
          data = data.filter(c => (c as any).isExternalBlock);
        }

        // Nature queries
        const natures = store.settings.variables.natureOfSamples.map(n => n.toLowerCase());
        const natureMatch = natures.find(n => q.includes(n));
        if (natureMatch) {
          data = data.filter(c => c.natureOfSample.toLowerCase() === natureMatch);
        }

        // Date range: "this week", "today", "this month"
        const now = new Date();
        if (q.includes('today')) {
          data = data.filter(c => new Date(c.createdAt).toDateString() === now.toDateString());
        } else if (q.includes('this week')) {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          data = data.filter(c => new Date(c.createdAt) >= weekAgo);
        } else if (q.includes('this month')) {
          data = data.filter(c => {
            const d = new Date(c.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
        }
      } else if (domain === 'maintenance') {
        data = [...store.equipment];
        if (q.includes('commissioned')) data = data.filter(e => e.commissioned);
        if (q.includes('decommissioned') || q.includes('not commissioned')) data = data.filter(e => !e.commissioned);
      } else if (domain === 'reagent') {
        data = [...store.reagents];
      } else if (domain === 'immuno') {
        data = [...store.immunoReagents];
      } else if (domain === 'report') {
        data = [...store.reports];
        if (q.includes('incident')) data = data.filter(r => r.category === 'Incident');
        if (q.includes('occurrence')) data = data.filter(r => r.category === 'Occurrence');
      } else if (domain === 'labsupply') {
        data = [...store.labSupplies];
      }

      // Count query
      if (q.startsWith('how many') || q.startsWith('count')) {
        setResults([{ _summary: `Found ${data.length} result(s)` }]);
      } else {
        setResults(data);
      }
    } catch {
      setError('Could not parse query. Try: "cases with IHC of HER2", "delayed cases", "this month"');
    }
    setLoading(false);
  };

  const getResultLabel = (item: any) => {
    if (item._summary) return item._summary;
    if (item.hospitalNumber) return `${item.hospitalNumber} — ${item.surname || ''}, ${item.firstName || ''} (${item.currentStep})`;
    if (item.name && item.commissioned !== undefined) return `${item.name} — ${item.commissioned ? 'Active' : 'Inactive'}`;
    if (item.title) return item.title;
    if (item.name) return item.name;
    return JSON.stringify(item).slice(0, 80);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className={cn('gap-2', className)} onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> Query Data
      </Button>
    );
  }

  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Query Data</span>
        </div>
        <button onClick={() => { setOpen(false); setResults(null); }} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder='e.g. "get all cases with IHC of HER2" or "delayed cases this month"'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runQuery()}
          className="text-sm"
        />
        <Button size="icon" onClick={runQuery} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {results !== null && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{results.length} result(s)</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.slice(0, 50).map((item, i) => (
              <div key={i} className="text-xs px-2 py-1.5 bg-muted/50 rounded flex items-center gap-2">
                <span className="font-mono text-muted-foreground w-5">{i + 1}.</span>
                <span className="flex-1 truncate">{getResultLabel(item)}</span>
              </div>
            ))}
            {results.length > 50 && <p className="text-xs text-muted-foreground">...and {results.length - 50} more</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiQueryBox;
