import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, stepToIngStatus } from '@/store/useStore';
import { getCaseIdentifier, getCaseIdentifierLabel } from '@/lib/caseIdentifier';
const stainingCategoryNames = ['Histochemistry', 'IHC', 'IF'];
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageTip from '@/components/PageTip';

const stepOrder = ['Fixation', 'Processing', 'Embedding', 'Microtomy', 'Cyto Analysis', 'Staining', 'Mounting'];

type QCGroup = 'Pending' | 'Passed' | 'Failed';

const Microscopy = () => {
  const navigate = useNavigate();
  const { cases, updateCase, addLog, currentUser, settings, getDisplayId, requests, updateRequest, hasPermission } = useStore();
  const canSubmit = hasPermission('submit_microscopy');
  const canView = hasPermission('view_microscopy') || canSubmit;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  // Single-case review dialog
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [qcStatus, setQcStatus] = useState<'Passed' | 'Failed' | ''>('');
  const [qcComment, setQcComment] = useState('');
  const [failedSteps, setFailedSteps] = useState<string[]>([]);
  const [qcCriteria, setQcCriteria] = useState<string[]>([]);
  // Batch review dialog
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchQcStatus, setBatchQcStatus] = useState<'Passed' | 'Failed' | ''>('');
  const [batchQcComment, setBatchQcComment] = useState('');
  const [batchFailedSteps, setBatchFailedSteps] = useState<string[]>([]);
  const [batchQcCriteria, setBatchQcCriteria] = useState<string[]>([]);

  const mounted = useMemo(() => {
    let result = cases.filter(c => c.currentStatus === 'Mounted' || c.currentStep === 'Microscopy');
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.hospitalNumber.toLowerCase().includes(s));
    }
    return result;
  }, [cases, search]);

  const activeCase = cases.find(c => c.id === selectedCase);
  const isCytology = activeCase?.caseType === 'Cytology';
  // Use qcCriteriaCategories (flat-mapped across all categories) when available,
  // otherwise fall back to the per-case-type legacy flat arrays
  const qcCriteriaCategories = settings.variables.qcCriteriaCategories || [];
  const allCriteriaFromCategories = qcCriteriaCategories.length > 0
    ? qcCriteriaCategories.flatMap((cat: { id: string; name: string; items: string[] }) => cat.items)
    : [];
  const availableCriteria = allCriteriaFromCategories.length > 0
    ? allCriteriaFromCategories
    : isCytology
      ? settings.variables.qcCriteriaCytology
      : settings.variables.qcCriteriaHistology;
  const previousSteps = isCytology ? ['Fixation', 'Cyto Analysis', 'Staining', 'Mounting'] : ['Fixation', 'Processing', 'Embedding', 'Microtomy', 'Staining', 'Mounting'];
  const allCriteriaSelected = availableCriteria.length > 0 && availableCriteria.every(c => batchQcCriteria.includes(c));

  const handleSelectAllCriteria = () => setQcCriteria(allCriteriaSelected ? [] : [...availableCriteria]);

  // ── QC group helper (for quick-select buckets) ──
  const getQcGroup = (c: typeof cases[0]): QCGroup => {
    if (c.qcStatus === 'Passed') return 'Passed';
    if (c.qcStatus === 'Failed') return 'Failed';
    return 'Pending';
  };
  const qcGroups: { key: QCGroup; label: string }[] = [
    { key: 'Pending', label: 'Pending' },
    { key: 'Passed', label: 'Passed' },
    { key: 'Failed', label: 'Failed' },
  ];

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectByGroup = (group: QCGroup) => {
    const ids = mounted.filter(c => getQcGroup(c) === group).map(c => c.id);
    if (ids.length === 0) return;
    setSelected(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const applyQC = (caseId: string, status: 'Passed' | 'Failed', comment: string, failed: string[], criteria: string[]) => {
    const caseEntry = cases.find(c => c.id === caseId);
    if (!caseEntry) return;
    const isCyto = caseEntry.caseType === 'Cytology';
    const prevSteps = isCyto ? ['Fixation', 'Cyto Analysis', 'Staining', 'Mounting'] : ['Fixation', 'Processing', 'Embedding', 'Microtomy', 'Staining', 'Mounting'];
    const cyto = isCyto;
    const critCats = settings.variables.qcCriteriaCategories || [];
    const allCrit = critCats.length > 0 ? critCats.flatMap((cat: { id: string; name: string; items: string[] }) => cat.items) : [];
    const availCrit = allCrit.length > 0 ? allCrit : (cyto ? settings.variables.qcCriteriaCytology : settings.variables.qcCriteriaHistology);

    if (status === 'Passed') {
      updateCase(caseId, { qcStatus: 'Passed', qcComment: comment, qcCriteria: criteria, currentStatus: 'Done', currentStep: 'Slide Movement' });
      addLog(caseId, { caseId, event: 'QC: Passed - Sent to Slide Movement', timestamp: new Date(), user: currentUser?.name || '', details: `${comment}${criteria.length ? ' | Criteria: ' + criteria.join(', ') : ''}` });
      requests.filter(r => r.caseId === caseId && (r.status === 'In Progress' || r.status === 'Pending') && stainingCategoryNames.some(cat => r.requestType === cat))
        .forEach(r => updateRequest(r.id, { status: 'Completed' }));
    } else {
      const sortedSteps = failed.sort((a, b) => stepOrder.indexOf(a) - stepOrder.indexOf(b));
      const earliestStep = sortedSteps[0] || 'Fixation';
      const ingStatus = stepToIngStatus[earliestStep] || earliestStep;
      const returnCount = (caseEntry.qcReturnInfo?.returnCount || 0) + 1;
      const updates: any = {
        qcStatus: 'Failed', qcComment: comment, qcCriteria: undefined,
        currentStatus: ingStatus, currentStep: earliestStep,
        qcReturnInfo: { failedSteps: [...failed], comment, returnedAt: new Date(), returnCount },
      };
      if (failed.includes('Staining') && caseEntry) {
        updates.stainRuns = (caseEntry.stainRuns || []).map(r => ({ ...r, status: 'Staining' as const }));
        updates.stainingStatus = 'Staining';
      }
      updateCase(caseId, updates);
      addLog(caseId, { caseId, event: `QC: Failed — returned to ${earliestStep}`, timestamp: new Date(), user: currentUser?.name || '', details: `Failed steps: ${failed.join(', ')}. ${comment}` });
    }
  };

  const handleQC = () => {
    if (!selectedCase || !qcStatus) return;
    applyQC(selectedCase, qcStatus, qcComment, failedSteps, qcCriteria);
    setSelectedCase(null); setQcStatus(''); setQcComment(''); setFailedSteps([]); setQcCriteria([]);
  };

  const handleBatchOpen = () => {
    setBatchQcStatus(''); setBatchQcComment(''); setBatchFailedSteps([]); setBatchQcCriteria([]);
    setBatchOpen(true);
  };

  const handleBatchQC = () => {
    if (!batchQcStatus) return;
    selected.forEach(id => applyQC(id, batchQcStatus, batchQcComment, batchFailedSteps, batchQcCriteria));
    setSelected([]);
    setBatchOpen(false);
    setBatchQcStatus(''); setBatchQcComment(''); setBatchFailedSteps([]); setBatchQcCriteria([]);
  };

  if (!canView) {
    return <Layout><p className="text-muted-foreground">You don't have permission to view Microscopy.</p></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Microscopy</h2>
          <PageTip content="Review mounted slides under the microscope. Pass cases to send them to Slide Movement, or fail them to return to the earliest failed step. Use batch select to review many cases at once." />
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Quick-select buckets by QC status */}
        <div className="flex flex-wrap gap-2">
          {qcGroups.map(g => {
            const groupCases = mounted.filter(c => getQcGroup(c) === g.key);
            const count = groupCases.length;
            if (count === 0) return null;
            const allSelected = count > 0 && groupCases.every(c => selected.includes(c.id));
            return (
              <Button key={g.key} variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => selectByGroup(g.key)}>
                <Checkbox checked={allSelected} className="h-3 w-3" />
                {g.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Batch action bar */}
        {selected.length > 0 && canSubmit && (
          <div className="bg-accent rounded-xl p-4 space-y-3 shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button size="sm" onClick={handleBatchOpen}>Batch Review</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {canSubmit && <th className="px-4 py-3 w-10"><Checkbox checked={selected.length === mounted.length && mounted.length > 0} onCheckedChange={c => setSelected(c ? mounted.map(f => f.id) : [])} /></th>}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">QC</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{getCaseIdentifierLabel(settings)}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">R.D.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MLS</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {mounted.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  {canSubmit && <td className="px-4 py-3"><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>}
                  <td className="px-4 py-3">
                    {c.qcStatus === 'Passed' ? <CheckCircle className="h-4 w-4 text-[hsl(120,60%,45%)]" /> : c.qcStatus === 'Failed' ? <XCircle className="h-4 w-4 text-destructive" /> : <span className="text-xs text-muted-foreground">Pending</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">{getCaseIdentifier(c, settings)}</td>
                  <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                  <td className="px-4 py-3">{c.typeOfSample}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{c.residentDoctor || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{c.mlsOnCall || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canSubmit && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedCase(c.id); setQcStatus(''); setQcComment(''); setFailedSteps([]); setQcCriteria([]); }}>Review</Button>
                      )}
                      {c.qcReturnInfo && <Badge variant="destructive" className="text-[10px]">Return #{c.qcReturnInfo.returnCount}</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
              {mounted.length === 0 && <tr><td colSpan={canSubmit ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">No cases ready for microscopy</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Single-case review dialog */}
        <Dialog open={!!selectedCase} onOpenChange={o => { if (!o) setSelectedCase(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Quality Control — {activeCase?.hospitalNumber}</DialogTitle></DialogHeader>
            {activeCase && (
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Patient:</span> {activeCase.surname}, {activeCase.firstName}</p>
                  <p><span className="text-muted-foreground">Type:</span> {activeCase.typeOfSample} · {activeCase.natureOfSample}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant={qcStatus === 'Passed' ? 'default' : 'outline'} onClick={() => { setQcStatus('Passed'); setFailedSteps([]); }} className="flex-1"><CheckCircle className="mr-2 h-4 w-4" /> Pass</Button>
                  <Button variant={qcStatus === 'Failed' ? 'destructive' : 'outline'} onClick={() => { setQcStatus('Failed'); setQcCriteria([]); }} className="flex-1"><XCircle className="mr-2 h-4 w-4" /> Fail</Button>
                </div>
                {qcStatus === 'Passed' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Assessment Criteria:</p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleSelectAllCriteria}><CheckSquare className="h-3 w-3" />{allCriteriaSelected ? 'Deselect All' : 'Select All'}</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">{availableCriteria.map(c => (
                      <label key={c} className="flex items-center gap-2 text-sm"><Checkbox checked={qcCriteria.includes(c)} onCheckedChange={v => setQcCriteria(v ? [...qcCriteria, c] : qcCriteria.filter(x => x !== c))} />{c}</label>
                    ))}</div>
                  </div>
                )}
                {qcStatus === 'Failed' && (
                  <div className="space-y-2"><p className="text-sm font-medium">Select failed step(s):</p>{previousSteps.map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm"><Checkbox checked={failedSteps.includes(s)} onCheckedChange={c => setFailedSteps(c ? [...failedSteps, s] : failedSteps.filter(x => x !== s))} />{s}</label>
                  ))}</div>
                )}
                <Textarea placeholder="QC Comment..." value={qcComment} onChange={e => setQcComment(e.target.value)} rows={3} />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCase(null)}>Cancel</Button>
              {canSubmit && (
                <Button onClick={handleQC} disabled={!qcStatus || (qcStatus === 'Failed' && failedSteps.length === 0)}>Submit</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch review dialog */}
        <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Batch Quality Control — {selected.length} case(s)</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Apply the same QC decision to all selected cases. Stain requests linked to passed cases will be marked Completed.</p>
              <div className="flex gap-3">
                <Button variant={batchQcStatus === 'Passed' ? 'default' : 'outline'} onClick={() => { setBatchQcStatus('Passed'); setBatchFailedSteps([]); }} className="flex-1"><CheckCircle className="mr-2 h-4 w-4" /> Pass All</Button>
                <Button variant={batchQcStatus === 'Failed' ? 'destructive' : 'outline'} onClick={() => { setBatchQcStatus('Failed'); setBatchQcCriteria([]); }} className="flex-1"><XCircle className="mr-2 h-4 w-4" /> Fail All</Button>
              </div>
              {batchQcStatus === 'Passed' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Assessment Criteria (applied to all):</p>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setBatchQcCriteria(allCriteriaSelected ? [] : [...availableCriteria])}><CheckSquare className="h-3 w-3" />{allCriteriaSelected ? 'Deselect All' : 'Select All'}</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">{availableCriteria.map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm"><Checkbox checked={batchQcCriteria.includes(c)} onCheckedChange={v => setBatchQcCriteria(v ? [...batchQcCriteria, c] : batchQcCriteria.filter(x => x !== c))} />{c}</label>
                  ))}</div>
                </div>
              )}
              {batchQcStatus === 'Failed' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select failed step(s) (applied to all):</p>
                  {['Fixation', 'Processing', 'Embedding', 'Microtomy', 'Cyto Analysis', 'Staining', 'Mounting'].map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm"><Checkbox checked={batchFailedSteps.includes(s)} onCheckedChange={c => setBatchFailedSteps(c ? [...batchFailedSteps, s] : batchFailedSteps.filter(x => x !== s))} />{s}</label>
                  ))}
                </div>
              )}
              <Textarea placeholder="QC Comment (applied to all)..." value={batchQcComment} onChange={e => setBatchQcComment(e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
              <Button onClick={handleBatchQC} disabled={!batchQcStatus || (batchQcStatus === 'Failed' && batchFailedSteps.length === 0)}>Apply to {selected.length} case(s)</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Microscopy;
