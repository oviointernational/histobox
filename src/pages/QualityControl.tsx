import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, X, Search, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';
import { QualityControl, QCCheck } from '@/types';

const emptyCheck = (): QCCheck => ({
  id: crypto.randomUUID(),
  parameter: '',
  timeValue: '',
  timeUnit: 'm',
  result: '',
});

const QualityControlPage = () => {
  const { qualityControls, addQualityControl, deleteQualityControl, settings, currentUser, hasPermission } = useStore();
  const canAdd = hasPermission('add_qc');
  const canDelete = hasPermission('delete_qc');
  const pathologyStaff = settings.variables.residentDoctors;
  const stainTypes = settings.variables.stainTypes;
  const qcParameters = settings.variables.qcParameters || [];

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [sample, setSample] = useState('');
  const [stainType, setStainType] = useState('');
  const [checks, setChecks] = useState<QCCheck[]>([emptyCheck()]);
  const [doneBy, setDoneBy] = useState<string[]>([]);
  const [approvedBy, setApprovedBy] = useState<string[]>([]);
  const [comments, setComments] = useState<string[]>(['']);
  const [pickDoneId, setPickDoneId] = useState('');
  const [pickApprovedId, setPickApprovedId] = useState('');

  const filtered = useMemo(() => {
    let list = [...qualityControls];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(q => q.sample.toLowerCase().includes(s) || q.stainType.toLowerCase().includes(s));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [qualityControls, search]);

  const resetForm = () => {
    setSample(''); setStainType(''); setChecks([emptyCheck()]);
    setDoneBy([]); setApprovedBy([]); setComments(['']);
    setPickDoneId(''); setPickApprovedId('');
  };

  const handleSave = () => {
    if (!sample.trim() || !stainType) return;
    const qc: QualityControl = {
      id: crypto.randomUUID(),
      serialNumber: qualityControls.length + 1,
      sample: sample.trim(),
      stainType,
      checks: checks.filter(c => c.parameter || c.timeValue || c.result),
      doneBy,
      approvedBy,
      comments: comments.map(c => c.trim()).filter(Boolean),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addQualityControl(qc);
    setShowAdd(false);
    resetForm();
  };

  const updateCheck = (id: string, patch: Partial<QCCheck>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const staffName = (id: string) => pathologyStaff.find(p => p.id === id)?.name || id;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Quality Control</h2>
            <PageTip content="Log quality control checks for stained slides. Configure QC parameters in Settings > Quality Control." />
          </div>
          {canAdd && (
            <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Add QC</Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by sample or stain..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">S/N</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sample</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stain Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Checks</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Done By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Approved By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{q.serialNumber}</td>
                  <td className="px-4 py-3 font-medium">{q.sample}</td>
                  <td className="px-4 py-3">{q.stainType}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {q.checks.map(c => (
                        <Badge key={c.id} variant={c.result === 'pass' ? 'default' : c.result === 'fail' ? 'destructive' : 'secondary'} className="text-xs">
                          {c.parameter} · {c.timeValue}{c.timeUnit} · {c.result === 'pass' ? '✓' : c.result === 'fail' ? '✕' : '—'}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{q.doneBy.map(staffName).join(', ')}</td>
                  <td className="px-4 py-3 text-xs">{q.approvedBy.map(staffName).join(', ')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {canDelete && <Button variant="ghost" size="icon" onClick={() => deleteQualityControl(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No QC records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">New Quality Control</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Sample *</Label>
                  <Input value={sample} onChange={e => setSample(e.target.value)} className="mt-1" placeholder="Sample identifier" />
                </div>
                <div>
                  <Label>Stain Type *</Label>
                  <Select value={stainType} onValueChange={setStainType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select stain type" /></SelectTrigger>
                    <SelectContent>
                      {stainTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>QC Checks</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setChecks(prev => [...prev, emptyCheck()])}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {qcParameters.length === 0 && (
                  <p className="text-xs text-muted-foreground">No QC parameters configured. Add some in Settings &gt; Quality Control.</p>
                )}
                <div className="space-y-2">
                  {checks.map((c, idx) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-2 p-2 rounded border border-border bg-muted/20">
                      <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                      <Select value={c.parameter} onValueChange={v => updateCheck(c.id, { parameter: v })}>
                        <SelectTrigger className="flex-1 min-w-[160px]"><SelectValue placeholder="Parameter" /></SelectTrigger>
                        <SelectContent>
                          {qcParameters.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" value={c.timeValue} onChange={e => updateCheck(c.id, { timeValue: e.target.value })} className="w-24" placeholder="Time" />
                      <Select value={c.timeUnit} onValueChange={(v: any) => updateCheck(c.id, { timeUnit: v })}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="h">h</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="s">s</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => updateCheck(c.id, { result: c.result === 'pass' ? '' : 'pass' })}
                          className={cn(
                            'h-9 w-9 rounded flex items-center justify-center border',
                            c.result === 'pass' ? 'bg-green-500 text-white border-green-600' : 'bg-background border-border hover:bg-muted'
                          )}
                          aria-label="Pass"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCheck(c.id, { result: c.result === 'fail' ? '' : 'fail' })}
                          className={cn(
                            'h-9 w-9 rounded flex items-center justify-center border',
                            c.result === 'fail' ? 'bg-red-500 text-white border-red-600' : 'bg-background border-border hover:bg-muted'
                          )}
                          aria-label="Fail"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setChecks(prev => prev.filter(x => x.id !== c.id))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Done By */}
              <div className="space-y-2">
                <Label>Done By (Pathology Staff)</Label>
                <div className="flex gap-2">
                  <Select value={pickDoneId} onValueChange={setPickDoneId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select staff to add" /></SelectTrigger>
                    <SelectContent>
                      {pathologyStaff.filter(p => !doneBy.includes(p.id)).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.initials} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={() => { if (pickDoneId) { setDoneBy(prev => [...prev, pickDoneId]); setPickDoneId(''); } }} disabled={!pickDoneId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doneBy.map(id => (
                    <Badge key={id} variant="secondary" className="gap-1 py-1">
                      {staffName(id)}
                      <button onClick={() => setDoneBy(prev => prev.filter(x => x !== id))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Approved By */}
              <div className="space-y-2">
                <Label>Approved By (Pathology Staff)</Label>
                <div className="flex gap-2">
                  <Select value={pickApprovedId} onValueChange={setPickApprovedId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select staff to add" /></SelectTrigger>
                    <SelectContent>
                      {pathologyStaff.filter(p => !approvedBy.includes(p.id)).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.initials} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={() => { if (pickApprovedId) { setApprovedBy(prev => [...prev, pickApprovedId]); setPickApprovedId(''); } }} disabled={!pickApprovedId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {approvedBy.map(id => (
                    <Badge key={id} variant="secondary" className="gap-1 py-1">
                      {staffName(id)}
                      <button onClick={() => setApprovedBy(prev => prev.filter(x => x !== id))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Comments</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setComments(prev => [...prev, ''])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Comment
                  </Button>
                </div>
                <div className="space-y-2">
                  {comments.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={c} onChange={e => setComments(prev => prev.map((x, ix) => ix === i ? e.target.value : x))} placeholder={`Comment ${i + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setComments(prev => prev.filter((_, ix) => ix !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!sample.trim() || !stainType}>Save QC</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default QualityControlPage;
