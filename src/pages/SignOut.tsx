import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageTip from '@/components/PageTip';

const SignOutPage = () => {
  const { cases, updateCase, addLog, currentUser, settings, getDisplayId, hasPermission } = useStore();
  const canApprove = hasPermission('add_signout') || hasPermission('signout_approve');
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [batchComment, setBatchComment] = useState('');

  const signOutCases = useMemo(() => {
    let result = cases.filter(c => c.currentStep === 'SignOut');
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.hospitalNumber.toLowerCase().includes(s));
    }
    return result;
  }, [cases, search]);

  const activeCase = cases.find(c => c.id === selectedCase);

  // Get all possible QC criteria to check against
  // Use qcCriteriaCategories (flat-mapped) if available, else fall back to legacy flat arrays
  const qcCriteriaCategories = settings.variables.qcCriteriaCategories || [];
  const allCriteriaFromCategories = qcCriteriaCategories.length > 0
    ? qcCriteriaCategories.flatMap((cat: { id: string; name: string; items: string[] }) => cat.items)
    : [];
  const allHistoCriteria = allCriteriaFromCategories.length > 0 ? allCriteriaFromCategories : settings.variables.qcCriteriaHistology;
  const allCytoCriteria = allCriteriaFromCategories.length > 0 ? allCriteriaFromCategories : settings.variables.qcCriteriaCytology;

  const handleSignOut = (caseId: string, approved: boolean, cmt: string) => {
    if (approved) {
      updateCase(caseId, {
        signOutStatus: 'Approved', signOutComment: cmt,
        currentStatus: 'Signed Out', currentStep: 'Done',
      });
      addLog(caseId, { caseId, event: 'Sign Out: Approved', timestamp: new Date(), user: currentUser?.name || '', details: cmt });
    } else {
      updateCase(caseId, {
        signOutStatus: 'Unapproved', signOutComment: cmt,
        currentStatus: 'Done', currentStep: 'Slide Movement',
        qcStatus: undefined, qcComment: undefined,
      });
      addLog(caseId, { caseId, event: 'Sign Out: Unapproved — returned to Slide Movement', timestamp: new Date(), user: currentUser?.name || '', details: cmt });
    }
  };

  const handleSingleSignOut = (approved: boolean) => {
    if (!selectedCase) return;
    handleSignOut(selectedCase, approved, comment);
    setSelectedCase(null); setComment('');
  };

  const handleBatchAction = (approved: boolean) => {
    selected.forEach(id => handleSignOut(id, approved, batchComment));
    setSelected([]); setBatchComment('');
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const pendingCases = signOutCases.filter(c => c.currentStep === 'SignOut' && c.currentStatus !== 'Signed Out');

  const renderQcCriteriaIcons = (caseEntry: typeof cases[0]) => {
    const isCyto = caseEntry.caseType === 'Cytology';
    const allCriteria = isCyto ? allCytoCriteria : allHistoCriteria;
    const passedCriteria = caseEntry.qcCriteria || [];
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {allCriteria.map(c => {
          const passed = passedCriteria.includes(c);
          return (
            <Badge key={c} variant="secondary" className="text-xs gap-1">
              {passed ? <CheckCircle className="h-3 w-3 text-[hsl(120,60%,45%)]" /> : <XCircle className="h-3 w-3 text-destructive" />}
              {c}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Case Sign Out</h2>
          <PageTip content="Review and approve or reject cases that have passed microscopy QC. Green check marks indicate criteria that passed QC; red X marks indicate criteria not checked." />
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {selected.length > 0 && (
          <div className="bg-accent rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Textarea placeholder="Batch comment (optional)" value={batchComment} onChange={e => setBatchComment(e.target.value)} className="flex-1" rows={1} />
            {canApprove && <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => handleBatchAction(false)}>
                <XCircle className="mr-1 h-3 w-3" /> Reject All
              </Button>
              <Button size="sm" onClick={() => handleBatchAction(true)}>
                <CheckCircle className="mr-1 h-3 w-3" /> Approve All
              </Button>
            </div>}
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={selected.length === pendingCases.length && pendingCases.length > 0} onCheckedChange={c => setSelected(c ? pendingCases.map(f => f.id) : [])} />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">QC</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">R.D.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MLS</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {signOutCases.map(c => {
                const isPending = c.currentStep === 'SignOut' && c.currentStatus !== 'Signed Out';
                const qcPassed = c.qcStatus === 'Passed';
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {isPending && <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} />}
                    </td>
                    <td className="px-4 py-3">
                      {qcPassed ? <CheckCircle className="h-4 w-4 text-[hsl(120,60%,45%)]" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{getDisplayId(c.id)}</td>
                    <td className="px-4 py-3 font-medium">{c.hospitalNumber}</td>
                    <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{c.residentDoctor || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{c.mlsOnCall || '—'}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{c.signOutStatus || 'Pending'}</Badge></td>
                    <td className="px-4 py-3">
                      {isPending && <Button size="sm" variant="outline" onClick={() => setSelectedCase(c.id)}>Review</Button>}
                    </td>
                  </tr>
                );
              })}
              {signOutCases.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No cases for sign out</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={!!selectedCase} onOpenChange={(o) => { if (!o) setSelectedCase(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Case Sign Out — {activeCase?.hospitalNumber}</DialogTitle></DialogHeader>
            {activeCase && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  {activeCase.qcStatus === 'Passed' ? (
                    <CheckCircle className="h-5 w-5 text-[hsl(120,60%,45%)]" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">{activeCase.qcStatus === 'Passed' ? 'QC Passed' : 'QC Not Passed'}</span>
                </div>
                <p><span className="text-muted-foreground">Patient:</span> {activeCase.surname}, {activeCase.firstName}</p>
                <p><span className="text-muted-foreground">Type:</span> {activeCase.typeOfSample}</p>
                <p><span className="text-muted-foreground">ID:</span> <span className="font-mono">{getDisplayId(activeCase.id)}</span></p>
                {(activeCase.qcCriteria && activeCase.qcCriteria.length > 0 || activeCase.qcStatus) && (
                  <div>
                    <span className="text-muted-foreground">QC Assessment Criteria:</span>
                    {renderQcCriteriaIcons(activeCase)}
                  </div>
                )}
                {activeCase.qcComment && <p><span className="text-muted-foreground">QC Comment:</span> {activeCase.qcComment}</p>}
              </div>
            )}
            <Textarea placeholder="Comment..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCase(null)}>Cancel</Button>
              {canApprove && <Button variant="destructive" onClick={() => handleSingleSignOut(false)}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>}
              {canApprove && <Button onClick={() => handleSingleSignOut(true)}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SignOutPage;
