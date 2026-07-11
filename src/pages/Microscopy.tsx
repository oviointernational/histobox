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

const Microscopy = () => {
  const navigate = useNavigate();
  const { cases, updateCase, addLog, currentUser, settings, getDisplayId, requests, updateRequest, hasPermission } = useStore();
  const canSubmit = hasPermission('submit_microscopy');
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [qcStatus, setQcStatus] = useState<'Passed' | 'Failed' | ''>('');
  const [qcComment, setQcComment] = useState('');
  const [failedSteps, setFailedSteps] = useState<string[]>([]);
  const [qcCriteria, setQcCriteria] = useState<string[]>([]);

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
  const allCriteriaSelected = availableCriteria.length > 0 && availableCriteria.every(c => qcCriteria.includes(c));

  const handleSelectAllCriteria = () => setQcCriteria(allCriteriaSelected ? [] : [...availableCriteria]);

  const handleQC = () => {
    if (!selectedCase || !qcStatus) return;
    if (qcStatus === 'Passed') {
      updateCase(selectedCase, { qcStatus: 'Passed', qcComment, qcCriteria, currentStatus: 'Done', currentStep: 'Slide Movement' });
      addLog(selectedCase, { caseId: selectedCase, event: 'QC: Passed - Sent to Slide Movement', timestamp: new Date(), user: currentUser?.name || '', details: `${qcComment}${qcCriteria.length ? ' | Criteria: ' + qcCriteria.join(', ') : ''}` });
      // Mark linked stain requests as Completed
      requests.filter(r => r.caseId === selectedCase && (r.status === 'In Progress' || r.status === 'Pending') && stainingCategoryNames.some(cat => r.requestType === cat))
        .forEach(r => updateRequest(r.id, { status: 'Completed' }));
    } else {
      const sortedSteps = failedSteps.sort((a, b) => stepOrder.indexOf(a) - stepOrder.indexOf(b));
      const earliestStep = sortedSteps[0] || 'Fixation';
      const ingStatus = stepToIngStatus[earliestStep] || earliestStep;
      const returnCount = (activeCase?.qcReturnInfo?.returnCount || 0) + 1;

      // If failed at Staining, re-open stain runs
      const updates: any = {
        qcStatus: 'Failed', qcComment, qcCriteria: undefined,
        currentStatus: ingStatus, currentStep: earliestStep,
        qcReturnInfo: { failedSteps: [...failedSteps], comment: qcComment, returnedAt: new Date(), returnCount },
      };
      if (failedSteps.includes('Staining') && activeCase) {
        updates.stainRuns = (activeCase.stainRuns || []).map(r => ({ ...r, status: 'Staining' as const }));
        updates.stainingStatus = 'Staining';
      }

      updateCase(selectedCase, updates);
      addLog(selectedCase, { caseId: selectedCase, event: `QC: Failed — returned to ${earliestStep}`, timestamp: new Date(), user: currentUser?.name || '', details: `Failed steps: ${failedSteps.join(', ')}. ${qcComment}` });
    }
    setSelectedCase(null); setQcStatus(''); setQcComment(''); setFailedSteps([]); setQcCriteria([]);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Microscopy</h2>
          <PageTip content="Review mounted slides under the microscope. Pass cases to send them to Slide Movement, or fail them to return to the earliest failed step. Cases that pass QC show a green checkmark in Sign Out." />
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
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
                  <td className="px-4 py-3">
                    {c.qcStatus === 'Passed' ? <CheckCircle className="h-4 w-4 text-[hsl(120,60%,45%)]" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  </td>
                  <td className="px-4 py-3 font-medium">{getCaseIdentifier(c, settings)}</td>
                  <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                  <td className="px-4 py-3">{c.typeOfSample}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{c.residentDoctor || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{c.mlsOnCall || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canSubmit && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedCase(c.id)}>Review</Button>
                      )}
                      {c.qcReturnInfo && <Badge variant="destructive" className="text-[10px]">Return #{c.qcReturnInfo.returnCount}</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
              {mounted.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No cases ready for microscopy</td></tr>}
            </tbody>
          </table>
        </div>

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
      </div>
    </Layout>
  );
};

export default Microscopy;
