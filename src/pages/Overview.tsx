import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowUpDown, AlertTriangle, Flag, Clock, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';
import SmartSearch from '@/components/SmartSearch';
import AiQueryBox from '@/components/AiQueryBox';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  'Entered': 'bg-muted text-muted-foreground',
  'Fixing': 'bg-warning/15 text-warning',
  'Fixed': 'bg-primary/15 text-primary',
  'Processing': 'bg-warning/15 text-warning',
  'Processed': 'bg-primary/15 text-primary',
  'Embedding': 'bg-warning/15 text-warning',
  'Embedded': 'bg-primary/15 text-primary',
  'Microtomy': 'bg-warning/15 text-warning',
  'Microtomed': 'bg-primary/15 text-primary',
  'Analysing': 'bg-warning/15 text-warning',
  'Analysed': 'bg-primary/15 text-primary',
  'Staining': 'bg-warning/15 text-warning',
  'Stained': 'bg-primary/15 text-primary',
  'Mounting': 'bg-warning/15 text-warning',
  'Mounted': 'bg-primary/15 text-primary',
  'Done': 'bg-success/15 text-success',
  'Returned': 'bg-destructive/15 text-destructive',
  'Approved': 'bg-success/15 text-success',
  'Signed Out': 'bg-success/15 text-success',
  'Unapproved': 'bg-muted text-muted-foreground',
  'Query': 'bg-destructive/15 text-destructive',
  'Room Fixing': 'bg-warning/15 text-warning',
  'Heat Fixing': 'bg-warning/15 text-warning',
  'ReFixing': 'bg-warning/15 text-warning',
  'Decalcifying': 'bg-[hsl(50,90%,50%)]/20 text-[hsl(50,90%,30%)]',
};

const Overview = () => {
  const { cases, settings, getDisplayId } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [noResults, setNoResults] = useState(false);

  // Stain category stats
  const stainStats = useMemo(() => {
    const categories = ['Histochemistry', 'IHC', 'IF'];
    return categories.map(cat => {
      const catObj = settings.variables.stainCategories.find(c => c.name === cat);
      const stains = catObj?.stains || [];
      const count = cases.filter(c => c.stainRuns?.some(r => r.stainTypes.some(s => stains.includes(s)))).length;
      return { name: cat, count, slug: cat.toLowerCase() === 'histochemistry' ? 'histochemistry' : cat.toLowerCase() };
    });
  }, [cases, settings.variables.stainCategories]);

  // Delayed cases
  const delayDays = settings.delayedDays || 7;
  const now = new Date();
  const delayedCount = useMemo(() => {
    return cases.filter(c => {
      if (c.currentStatus === 'Signed Out' || c.currentStep === 'Done') return false;
      return (now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= delayDays;
    }).length;
  }, [cases, delayDays]);

  // Flagged cases
  const flaggedCount = useMemo(() => {
    return cases.filter(c => {
      const flags = c.flags || c.issues || [];
      return flags.length > 0;
    }).length;
  }, [cases]);

  // Stain delay flag count: cases with multiple stains where at least one isn't done
  const stainDelayHours = (settings as any).stainDelayHours || 48;
  const stainFlagCount = useMemo(() => {
    return cases.filter(c => {
      const runs = c.stainRuns || [];
      if (runs.length <= 1) return false;
      const hasIncomplete = runs.some(r => r.status === 'Staining');
      return hasIncomplete;
    }).length;
  }, [cases]);

  const activeFlagCount = useMemo(() => {
    return cases.reduce((sum, c) => sum + (c.flags || c.issues || []).filter(f => !f.isFixed).length, 0);
  }, [cases]);

  const filtered = useMemo(() => {
    let result = [...cases];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.hospitalNumber.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        getDisplayId(c.id).toLowerCase().includes(s) ||
        `${c.surname} ${c.firstName}`.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'hospital': cmp = a.hospitalNumber.localeCompare(b.hospitalNumber); break;
        case 'name': cmp = a.surname.localeCompare(b.surname); break;
        case 'careOf': cmp = (a.careOf || '').localeCompare(b.careOf || ''); break;
        case 'nature': cmp = a.natureOfSample.localeCompare(b.natureOfSample); break;
        case 'type': cmp = a.typeOfSample.localeCompare(b.typeOfSample); break;
        case 'status': cmp = a.currentStatus.localeCompare(b.currentStatus); break;
        case 'step': cmp = a.currentStep.localeCompare(b.currentStep); break;
        case 'blocks': cmp = (a.totalCassettes || 0) - (b.totalCassettes || 0); break;
        default: cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); return sortDir === 'desc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    setNoResults(search.length > 0 && result.length === 0);
    return result;
  }, [cases, search, sortBy, sortDir, getDisplayId]);

  const cols = settings.visibleColumns;

  const dataCard = (title: string, count: number, icon: any, color: string, onClick: () => void) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', color)}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-bold font-display">{count}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Cases</h2>
            <PageTip content="View and manage all registered cases. Search by ID, lab number, or patient name. Sort by various fields and click a case to see full details and logs." />
          </div>
          <Button onClick={() => navigate('/add-entry')} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Add Entry
          </Button>
        </div>

        {/* Data Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stainStats.map(s => (
            dataCard(s.name, s.count, <FlaskConical className="h-5 w-5 text-white" />,
              s.slug === 'histochemistry' ? 'bg-[hsl(262,83%,58%)]' : s.slug === 'ihc' ? 'bg-[hsl(199,89%,48%)]' : 'bg-[hsl(330,50%,55%)]',
              () => navigate(`/stain-data/${s.slug}`)
            )
          ))}
          {dataCard('Delayed', delayedCount, <Clock className="h-5 w-5 text-white" />, delayedCount > 0 ? 'bg-destructive' : 'bg-muted', () => navigate('/delayed-cases'))}
          {dataCard(`Flags (${activeFlagCount} active)`, flaggedCount, <Flag className="h-5 w-5 text-white" />, activeFlagCount > 0 ? 'bg-[hsl(38,92%,50%)]' : 'bg-muted', () => navigate('/flagged-cases'))}
        </div>

        {/* AI Query Box */}
        <AiQueryBox domain="cases" />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SmartSearch
              onSearchChange={setSearch}
              selectedCaseIds={selectedCaseIds}
              onSelectedChange={setSelectedCaseIds}
              showChipMode={true}
              batchActions={[
                { label: 'View Selected', onClick: (ids) => { if (ids.length === 1) navigate(`/case/${ids[0]}`); else toast.info(`${ids.length} cases selected`); } },
              ]}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="hospital">Hospital No.</SelectItem>
              <SelectItem value="name">Patient Name</SelectItem>
              <SelectItem value="careOf">Care of</SelectItem>
              <SelectItem value="nature">Nature of Sample</SelectItem>
              <SelectItem value="type">Type of Sample</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="step">Current Step</SelectItem>
              <SelectItem value="blocks">Blocks</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                {cols.hospitalNumber && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab No.</th>}
                {cols.patientName && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient Name</th>}
                {cols.natureOfSample && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nature</th>}
                {cols.typeOfSample && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>}
                {cols.patientType && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient Type</th>}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blocks</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Step</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => navigate(`/case/${c.id}`)}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{getDisplayId(c.id)}</td>
                  {cols.hospitalNumber && <td className="px-4 py-3 font-medium text-primary">{c.hospitalNumber}</td>}
                  {cols.patientName && <td className="px-4 py-3">{c.surname}, {c.firstName}</td>}
                  {cols.natureOfSample && <td className="px-4 py-3">{c.natureOfSample}</td>}
                  {cols.typeOfSample && <td className="px-4 py-3">{c.typeOfSample}</td>}
                  {cols.patientType && <td className="px-4 py-3">{c.patientType}</td>}
                  <td className="px-4 py-3 text-xs font-mono">{c.totalCassettes || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{c.currentStep === 'Done' ? 'Signed Out' : c.currentStep}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn('text-xs', statusColor[c.currentStatus] || '')}>{c.currentStatus}</Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <p className="text-muted-foreground mb-3">No cases found</p>
                    {noResults && (
                      <Button variant="outline" onClick={() => navigate('/query')} className="gap-2">
                        <AlertTriangle className="h-4 w-4" /> Query Case
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Overview;
