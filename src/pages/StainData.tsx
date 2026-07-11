import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const StainData = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { cases, settings, hasPermission } = useStore();
  const canView = hasPermission('view_stain_data');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStain, setFilterStain] = useState('all');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genDateFrom, setGenDateFrom] = useState('');
  const [genDateTo, setGenDateTo] = useState('');
  const [genStains, setGenStains] = useState<string[]>([]);
  const [genAll, setGenAll] = useState(true);
  const [generatedData, setGeneratedData] = useState<any[] | null>(null);

  const categoryName = category === 'histochemistry' ? 'Histochemistry' : category === 'ihc' ? 'IHC' : category === 'if' ? 'IF' : category || '';

  // Get stains for this category
  const categoryStains = useMemo(() => {
    const cat = settings.variables.stainCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return cat?.stains || [];
  }, [settings.variables.stainCategories, categoryName]);

  // Filter cases that have stain runs with stains from this category
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const hasStain = c.stainRuns?.some(r =>
        r.stainTypes.some(s => categoryStains.includes(s))
      );
      return hasStain;
    }).filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return c.hospitalNumber.toLowerCase().includes(s) || `${c.surname} ${c.firstName}`.toLowerCase().includes(s);
    }).filter(c => {
      if (filterStain === 'all') return true;
      return c.stainRuns?.some(r => r.stainTypes.includes(filterStain));
    }).sort((a, b) => {
      if (sortBy === 'name') return a.surname.localeCompare(b.surname);
      if (sortBy === 'stain') {
        const aStain = a.stainRuns?.flatMap(r => r.stainTypes.filter(s => categoryStains.includes(s))).join(',') || '';
        const bStain = b.stainRuns?.flatMap(r => r.stainTypes.filter(s => categoryStains.includes(s))).join(',') || '';
        return aStain.localeCompare(bStain);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [cases, categoryStains, search, filterStain, sortBy]);

  const getStainsForCase = (c: typeof cases[0]) => {
    return c.stainRuns?.flatMap(r => r.stainTypes.filter(s => categoryStains.includes(s))) || [];
  };

  const handleGenerate = () => {
    const stainsToUse = genAll ? categoryStains : genStains;
    const result = cases.filter(c => {
      const hasStain = c.stainRuns?.some(r => r.stainTypes.some(s => stainsToUse.includes(s)));
      if (!hasStain) return false;
      if (genDateFrom && new Date(c.createdAt) < new Date(genDateFrom)) return false;
      if (genDateTo && new Date(c.createdAt) > new Date(genDateTo)) return false;
      return true;
    }).map(c => ({
      labNumber: c.hospitalNumber,
      patientName: `${c.surname}, ${c.firstName}`,
      stains: c.stainRuns?.flatMap(r => r.stainTypes.filter(s => stainsToUse.includes(s))).join(', ') || '',
      status: c.currentStatus,
      date: new Date(c.createdAt).toLocaleDateString(),
      natureOfSample: c.natureOfSample,
      typeOfSample: c.typeOfSample,
    }));
    setGeneratedData(result);
    setGenerateOpen(false);
  };

  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm">You don't have permission to view Stain Data.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-display font-bold">{categoryName} Data</h2>
          <Badge variant="outline">{filteredCases.length} cases</Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by lab no., name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStain} onValueChange={setFilterStain}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter stain" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {categoryName} Stains</SelectItem>
              {categoryStains.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Patient Name</SelectItem>
              <SelectItem value="stain">Stain</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setGenerateOpen(true)} className="gap-2">
            <Download className="h-4 w-4" /> Generate Data
          </Button>
        </div>

        {/* Cases Table */}
        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stains</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id} onClick={() => navigate(`/case/${c.id}`)} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{c.hospitalNumber}</td>
                  <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {getStainsForCase(c).map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.currentStatus}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No cases with {categoryName} stains found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Generated Data Results */}
        {generatedData && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Generated Report — {generatedData.length} records</h3>
              <Button variant="outline" size="sm" onClick={() => setGeneratedData(null)}>Close</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Lab No.</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Patient</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Stain(s)</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nature</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedData.map((d, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{d.labNumber}</td>
                      <td className="px-3 py-2">{d.patientName}</td>
                      <td className="px-3 py-2">{d.stains}</td>
                      <td className="px-3 py-2">{d.natureOfSample}</td>
                      <td className="px-3 py-2">{d.typeOfSample}</td>
                      <td className="px-3 py-2">{d.status}</td>
                      <td className="px-3 py-2 text-xs">{d.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generate Dialog */}
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Generate {categoryName} Data</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>From Date</Label><Input type="date" value={genDateFrom} onChange={e => setGenDateFrom(e.target.value)} /></div>
                <div><Label>To Date</Label><Input type="date" value={genDateTo} onChange={e => setGenDateTo(e.target.value)} /></div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm mb-2">
                  <Checkbox checked={genAll} onCheckedChange={v => setGenAll(!!v)} />
                  <span className="font-medium">All {categoryName} stains</span>
                </label>
                {!genAll && (
                  <div className="space-y-1 ml-6 max-h-40 overflow-y-auto">
                    {categoryStains.map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={genStains.includes(s)} onCheckedChange={v => setGenStains(v ? [...genStains, s] : genStains.filter(x => x !== s))} />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerate}>Generate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default StainData;
