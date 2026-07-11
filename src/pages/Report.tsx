import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, ArrowUpDown } from 'lucide-react';
import PageTip from '@/components/PageTip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Report } from '@/types';

const ReportPage = () => {
  const navigate = useNavigate();
  const { reports, addReport, settings, currentUser, hasPermission } = useStore();
  const canAdd = hasPermission('add_reports');
  const canEdit = hasPermission('edit_reports');
  const canDelete = hasPermission('delete_reports');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Incident' | 'Occurrence'>('Incident');
  const [type, setType] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [mlsInCharge, setMlsInCharge] = useState('');
  const [superiorReported, setSuperiorReported] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [corrective, setCorrective] = useState('');

  const filtered = useMemo(() => {
    let result = [...reports];
    if (filterCategory !== 'all') result = result.filter(r => r.category === filterCategory);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.title.toLowerCase().includes(s) || r.type.toLowerCase().includes(s));
    }
    result.sort((a, b) => {
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [reports, search, sortBy, filterCategory]);

  const handleAdd = () => {
    if (!title.trim()) return;
    const report: Report = {
      id: crypto.randomUUID(),
      serialNumber: reports.length + 1,
      title, category, type, reportedBy, mlsInCharge, superiorReported, location,
      description, immediateAction, rootCauseAnalysis: rootCause, correctiveActions: corrective,
      createdAt: new Date(), updatedAt: new Date(),
      logs: [{ id: crypto.randomUUID(), caseId: '', event: 'Report Created', timestamp: new Date(), user: currentUser?.name || '' }],
    };
    addReport(report);
    setShowAdd(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setCategory('Incident'); setType(''); setReportedBy('');
    setMlsInCharge(''); setSuperiorReported(''); setLocation('');
    setDescription(''); setImmediateAction(''); setRootCause(''); setCorrective('');
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Reports</h2>
            <PageTip content="Log and manage incident and occurrence reports. Each report tracks the type, location, description, root cause analysis, and corrective actions taken." />
          </div>
          {canAdd && <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Add Report</Button>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Incident">Incident</SelectItem>
              <SelectItem value="Occurrence">Occurrence</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">S/N</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => navigate(`/report/${r.id}`)} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium">{r.serialNumber}</td>
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3"><Badge variant={r.category === 'Incident' ? 'destructive' : 'secondary'}>{r.category}</Badge></td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No reports found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">New Report</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Incident">Incident</SelectItem>
                      <SelectItem value="Occurrence">Occurrence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{settings.variables.reportTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{settings.variables.reportLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Reported By</Label><Input value={reportedBy} onChange={e => setReportedBy(e.target.value)} className="mt-1" /></div>
                <div><Label>MLS in Charge</Label><Input value={mlsInCharge} onChange={e => setMlsInCharge(e.target.value)} className="mt-1" /></div>
                <div><Label>Superior Reported</Label><Input value={superiorReported} onChange={e => setSuperiorReported(e.target.value)} className="mt-1" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} /></div>
              <div><Label>Immediate Action Taken</Label><Textarea value={immediateAction} onChange={e => setImmediateAction(e.target.value)} className="mt-1" rows={2} /></div>
              <div><Label>Root Cause Analysis</Label><Textarea value={rootCause} onChange={e => setRootCause(e.target.value)} className="mt-1" rows={2} /></div>
              <div><Label>Corrective Actions</Label><Textarea value={corrective} onChange={e => setCorrective(e.target.value)} className="mt-1" rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!title.trim()}>Save Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ReportPage;
