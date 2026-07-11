import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { getCaseIdentifier, getCaseIdentifierLabel } from '@/lib/caseIdentifier';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, AlertTriangle, AlertCircle, Users, X, CheckCircle, ClipboardCheck, ClipboardList } from 'lucide-react';
import { BenchStep, StainRun, CaseFlag, ProcessingProtocol } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';
import ProtocolCheckDialog from '@/components/ProtocolCheckDialog';

const stepConfig: Record<string, { statuses: string[]; doneStatus: string; nextStep: BenchStep | 'Microscopy' }> = {
  fixation: { statuses: ['Room Fixing', 'Heat Fixing', 'ReFixing', 'Decalcifying', 'Fixed'], doneStatus: 'Fixed', nextStep: 'Processing' },
  processing: { statuses: ['Processing', 'Processed'], doneStatus: 'Processed', nextStep: 'Embedding' },
  embedding: { statuses: ['Embedding', 'Embedded'], doneStatus: 'Embedded', nextStep: 'Microtomy' },
  microtomy: { statuses: ['Microtomy', 'Microtomed'], doneStatus: 'Microtomed', nextStep: 'Staining' },
  'cyto-analysis': { statuses: ['Analysing', 'Analysed'], doneStatus: 'Analysed', nextStep: 'Staining' },
  staining: { statuses: ['Staining', 'Stained'], doneStatus: 'Stained', nextStep: 'Mounting' },
  mounting: { statuses: ['Mounting', 'Mounted'], doneStatus: 'Mounted', nextStep: 'Microscopy' },
};

const stepNames: Record<string, BenchStep | string> = {
  fixation: 'Fixation', processing: 'Processing', embedding: 'Embedding',
  microtomy: 'Microtomy', 'cyto-analysis': 'Cyto Analysis',
  staining: 'Staining', mounting: 'Mounting',
};

const stepTips: Record<string, string> = {
  fixation: 'Fixation preserves tissue samples. Assign status and MLS staff. Cases move to Processing (histology) or Cyto Analysis (cytology) when fixed.',
  processing: 'Processing dehydrates and infiltrates fixed tissue with paraffin wax. Cases move to Embedding when processed.',
  embedding: 'Embedding places processed tissue into wax blocks for sectioning. Cases move to Microtomy when embedded.',
  microtomy: 'Microtomy cuts thin sections from embedded blocks. Cases move to Staining when microtomed.',
  'cyto-analysis': 'Cytology analysis examines cell samples using various methods. Cases move to Staining when analysed.',
  staining: 'Staining applies dyes to tissue sections. Each stain can be individually marked as stained. Case leaves only when ALL stains are marked stained, then moves to Mounting.',
  mounting: 'Mounting covers stained slides with coverslips. Cases move to Microscopy when mounted.',
};

const cytoMethods = ['Direct Smear', 'Centrifugation', 'LBC Surepath', 'LBC Thinpath', 'Cell Block'];
const stainingCategoryNames = ['Histochemistry', 'IHC', 'IF'];

const BenchFlow = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { cases, updateCase, addLog, addIssue, fixIssue, currentUser, settings, getDisplayId, requests, updateRequest, systemUsers } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [batchStatus, setBatchStatus] = useState('');
  const [comment, setComment] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [cytoDialogCase, setCytoDialogCase] = useState<string | null>(null);
  const [cytoMethods_, setCytoMethods_] = useState<string[]>([]);
  const [newStainDialogCase, setNewStainDialogCase] = useState<string | null>(null);
  const [newStainTypes, setNewStainTypes] = useState<string[]>([]);
  const [issueDialogCase, setIssueDialogCase] = useState<string | null>(null);
  const [issueText, setIssueText] = useState('');
  const [mlsDialogCase, setMlsDialogCase] = useState<string | null>(null);
  const [mlsInCharge, setMlsInCharge] = useState('');
  const [mlsOnBench, setMlsOnBench] = useState<string[]>([]);
  const [batchMlsInCharge, setBatchMlsInCharge] = useState('');
  const [batchMlsOnBench, setBatchMlsOnBench] = useState<string[]>([]);
  // Stain-level selection for staining step
  const [stainSelections, setStainSelections] = useState<Record<string, Set<string>>>({}); // caseId -> Set of stainRunId:stainName
  // Protocol check
  const [protocolCheckCase, setProtocolCheckCase] = useState<string | null>(null);
  const [filterProtocol, setFilterProtocol] = useState<string>('all');
  // Step parameters
  const [stepParamCase, setStepParamCase] = useState<string | null>(null);
  const [stepParamKey, setStepParamKey] = useState('');
  const [stepParamValue, setStepParamValue] = useState('');

  const config = step ? stepConfig[step] : null;
  const currentStepName = step ? stepNames[step] : '';
  const isCytoAnalysis = step === 'cyto-analysis';
  const isStaining = step === 'staining';
  const hasProtocolColumn = ['processing', 'embedding', 'microtomy', 'staining'].includes(step || '');
  const protocols: ProcessingProtocol[] = settings.variables.protocols || [];
  const getProtocol = (id?: string) => protocols.find(p => p.id === id);

  const activeSystemUsers = systemUsers.filter(u => u.isActive);

  const filtered = useMemo(() => {
    if (!currentStepName) return [];
    let result = cases.filter(c => {
      if (isCytoAnalysis) return c.caseType === 'Cytology' && c.currentStep === 'Cyto Analysis';
      if (['Processing', 'Embedding', 'Microtomy'].includes(currentStepName as string)) {
        return c.currentStep === currentStepName && c.caseType !== 'Cytology';
      }
      if (isStaining) {
        // Show if at staining step OR has any unstained stain runs
        const atStep = c.currentStep === 'Staining';
        const hasUnstainedRuns = c.stainRuns?.some(r => r.status === 'Staining');
        const hasStainRequest = requests.some(req =>
          req.caseId === c.id && req.status === 'In Progress' &&
          stainingCategoryNames.some(cat => req.requestType === cat)
        );
        return atStep || hasUnstainedRuns || hasStainRequest;
      }
      if (step === 'mounting') {
        // Show in mounting if currentStep is Mounting OR has any stained runs (partial staining done)
        // BUT exclude cases that are already fully mounted (moved to Microscopy)
        if (c.currentStep === 'Microscopy' || c.currentStep === 'SignOut' || c.currentStep === 'Done') return false;
        if (c.mountingStatus === 'Mounted' && c.currentStep !== 'Mounting') return false;
        const atStep = c.currentStep === 'Mounting';
        const hasStainedRuns = c.stainRuns?.some(r => r.status === 'Stained');
        return atStep || hasStainedRuns;
      }
      return c.currentStep === currentStepName;
    });
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.hospitalNumber.toLowerCase().includes(s) || `${c.surname} ${c.firstName}`.toLowerCase().includes(s));
    }
    const statusOrder = config?.statuses || [];
    result.sort((a, b) => {
      const statusKey = step === 'cyto-analysis' ? 'cytoAnalysisStatus' : `${step?.replace('-', '')}Status`;
      const aIdx = statusOrder.indexOf((a as any)[statusKey] || statusOrder[0] || '');
      const bIdx = statusOrder.indexOf((b as any)[statusKey] || statusOrder[0] || '');
      return aIdx - bIdx;
    });
    if (filterStatus !== 'all') {
      const statusKey = step === 'cyto-analysis' ? 'cytoAnalysisStatus' : `${step?.replace('-', '')}Status`;
      result = result.filter(c => (c as any)[statusKey] === filterStatus);
    }
    if (filterProtocol !== 'all' && hasProtocolColumn) {
      result = result.filter(c => c.protocolId === filterProtocol);
    }
    return result;
  }, [cases, currentStepName, search, isCytoAnalysis, isStaining, config, step, filterStatus, filterProtocol, hasProtocolColumn, requests]);

  const getActiveIssueCount = (c: typeof cases[0]) => (c.flags || c.issues || []).filter(i => !i.isFixed).length;
  const getCaseStatus = (c: typeof cases[0]) => {
    const statusKey = step === 'cyto-analysis' ? 'cytoAnalysisStatus' : `${step?.replace('-', '')}Status`;
    return (c as any)[statusKey] || config?.statuses[0] || '';
  };

  const handleStatusChange = (caseId: string, newStatus: string) => {
    if (!config || !step) return;
    const statusKey = step === 'cyto-analysis' ? 'cytoAnalysisStatus' : `${step.replace('-', '')}Status`;
    const updates: any = { [statusKey]: newStatus };

    if (newStatus === config.doneStatus) {
      const caseEntry = cases.find(c => c.id === caseId);
      let nextStep = config.nextStep;
      if (step === 'fixation' && caseEntry?.caseType === 'Cytology') {
        nextStep = 'Cyto Analysis' as any;
      }
      if (isStaining && caseEntry) {
        // Don't advance via global status for staining - use individual stain tracking
        // Only mark the default run
        const updatedRuns = (caseEntry.stainRuns || []).map(r =>
          r.isDefault ? { ...r, status: 'Stained' as const } : r
        );
        const allDone = updatedRuns.every(r => r.status === 'Stained' || r.status === 'Done' || r.status === 'Mounted');
        if (allDone) {
          updates.currentStep = 'Mounting';
          updates.currentStatus = 'Mounting';
          updates.mountingStatus = 'Mounting';
        }
        updates.stainRuns = updatedRuns;
      } else {
        updates.currentStep = nextStep;
        updates.currentStatus = nextStep === 'Microscopy' ? 'Mounted' : newStatus;
        // When mounting is complete, mark all stain runs as Done so case leaves mounting view
        if (step === 'mounting' && caseEntry) {
          updates.stainRuns = (caseEntry.stainRuns || []).map(r => ({
            ...r,
            status: (r.status === 'Stained' || r.status === 'Mounting') ? 'Done' as const : r.status
          }));
        }
      }
    } else {
      updates.currentStatus = newStatus;
    }

    updateCase(caseId, updates);
    addLog(caseId, {
      caseId, event: `${currentStepName}: Status → ${newStatus}`,
      timestamp: new Date(), user: currentUser?.name || 'Unknown', details: comment || undefined,
    });
    setComment('');
  };

  // Toggle individual stain selection
  const toggleStainSel = (caseId: string, key: string) => {
    setStainSelections(prev => {
      const s = new Set(prev[caseId] || []);
      s.has(key) ? s.delete(key) : s.add(key);
      return { ...prev, [caseId]: s };
    });
  };

  const selectAllStains = (caseId: string, stainRuns: StainRun[]) => {
    const keys: string[] = [];
    stainRuns.forEach(r => r.stainTypes.forEach(s => { if (r.status === 'Staining') keys.push(`${r.id}:${s}`); }));
    setStainSelections(prev => ({ ...prev, [caseId]: new Set(keys) }));
  };

  // Mark selected stains as stained
  const markSelectedStained = (caseId: string) => {
    const sel = stainSelections[caseId];
    if (!sel || sel.size === 0) return;
    const caseEntry = cases.find(c => c.id === caseId);
    if (!caseEntry) return;

    // Parse selections
    const stainedByRun: Record<string, Set<string>> = {};
    sel.forEach(key => {
      const [runId, stainName] = key.split(':');
      if (!stainedByRun[runId]) stainedByRun[runId] = new Set();
      stainedByRun[runId].add(stainName);
    });

    const updatedRuns = (caseEntry.stainRuns || []).map(r => {
      if (!stainedByRun[r.id]) return r;
      const allStainsSelected = r.stainTypes.every(s => stainedByRun[r.id]?.has(s));
      if (allStainsSelected) {
        return { ...r, status: 'Stained' as const };
      }
      return r;
    });

    const allRunsDone = updatedRuns.every(r => r.status === 'Stained' || r.status === 'Done' || r.status === 'Mounted');
    const updates: any = { stainRuns: updatedRuns, stainingStatus: allRunsDone ? 'Stained' : 'Staining' };
    if (allRunsDone) {
      updates.currentStep = 'Mounting';
      updates.currentStatus = 'Mounting';
      updates.mountingStatus = 'Mounting';
    }

    updateCase(caseId, updates);
    addLog(caseId, {
      caseId, event: `Staining: Marked stained — ${Array.from(sel).map(k => k.split(':')[1]).join(', ')}`,
      timestamp: new Date(), user: currentUser?.name || 'Unknown',
    });
    setStainSelections(prev => ({ ...prev, [caseId]: new Set() }));
  };

  const handleAddStainRun = () => {
    if (!newStainDialogCase || newStainTypes.length === 0) return;
    const caseEntry = cases.find(c => c.id === newStainDialogCase);
    if (!caseEntry) return;
    const newRun: StainRun = { id: crypto.randomUUID(), stainTypes: newStainTypes, status: 'Staining', createdAt: new Date(), isDefault: false };
    // If case was already past staining, bring it back
    const updates: any = { stainRuns: [...(caseEntry.stainRuns || []), newRun] };
    if (caseEntry.currentStep !== 'Staining') {
      updates.currentStep = 'Staining';
      updates.currentStatus = 'Staining';
      updates.stainingStatus = 'Staining';
    }
    updateCase(newStainDialogCase, updates);
    addLog(newStainDialogCase, { caseId: newStainDialogCase, event: `New stains added — ${newStainTypes.join(', ')}`, timestamp: new Date(), user: currentUser?.name || 'Unknown' });
    setNewStainDialogCase(null); setNewStainTypes([]);
  };

  const handleCytoSubmit = () => {
    if (!cytoDialogCase) return;
    updateCase(cytoDialogCase, { cytoAnalysisMethods: cytoMethods_ });
    addLog(cytoDialogCase, { caseId: cytoDialogCase, event: `Cyto Analysis: Methods set — ${cytoMethods_.join(', ')}`, timestamp: new Date(), user: currentUser?.name || 'Unknown' });
    setCytoDialogCase(null); setCytoMethods_([]);
  };

  const handleBatchUpdate = () => {
    if (!batchStatus) return;
    selected.forEach(id => handleStatusChange(id, batchStatus));
    if (batchMlsInCharge || batchMlsOnBench.length > 0) {
      selected.forEach(id => {
        const updates: any = {};
        if (batchMlsInCharge) updates.mlsInCharge = batchMlsInCharge;
        if (batchMlsOnBench.length > 0) updates.mlsOnBenchList = batchMlsOnBench;
        updateCase(id, updates);
      });
    }
    setSelected([]); setBatchStatus(''); setComment(''); setBatchMlsInCharge(''); setBatchMlsOnBench([]);
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectByStatus = (status: string) => {
    const ids = filtered.filter(c => getCaseStatus(c) === status).map(c => c.id);
    setSelected(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const handleAddIssues = () => {
    if (!issueDialogCase || !issueText.trim()) return;
    issueText.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      addIssue(issueDialogCase, { id: crypto.randomUUID(), description: line, isFixed: false, createdAt: new Date(), createdBy: currentUser?.name || 'Unknown' });
      addLog(issueDialogCase, { caseId: issueDialogCase, event: `Flag at ${currentStepName}: ${line}`, timestamp: new Date(), user: currentUser?.name || 'Unknown' });
    });
    setIssueDialogCase(null); setIssueText('');
  };

  const handleFixAllIssues = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    if (!c) return;
    (c.issues || []).filter(i => !i.isFixed).forEach(i => {
      fixIssue(caseId, i.id, currentUser?.name || 'Unknown');
    });
  };

  const handleMlsSave = () => {
    if (!mlsDialogCase) return;
    const updates: any = {};
    if (mlsInCharge) updates.mlsInCharge = mlsInCharge;
    if (mlsOnBench.length > 0) updates.mlsOnBenchList = mlsOnBench;
    updateCase(mlsDialogCase, updates);
    setMlsDialogCase(null); setMlsInCharge(''); setMlsOnBench([]);
  };

  if (!config || !step) return <Layout><p className="text-muted-foreground">Invalid bench step</p></Layout>;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold capitalize">{currentStepName}</h2>
          <PageTip content={stepTips[step] || 'Manage cases at this workflow step.'} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {config.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasProtocolColumn && (
            <Select value={filterProtocol} onValueChange={setFilterProtocol}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Filter protocol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Protocols</SelectItem>
                {protocols.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {config.statuses.map(s => {
            const count = filtered.filter(c => getCaseStatus(c) === s).length;
            if (count === 0) return null;
            return (
              <Button key={s} variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => selectByStatus(s)}>
                <Checkbox checked={filtered.filter(c => getCaseStatus(c) === s).every(c => selected.includes(c.id)) && count > 0} className="h-3 w-3" />
                {s} ({count})
              </Button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="bg-accent rounded-xl p-4 space-y-3 shadow-sm">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={batchStatus} onValueChange={setBatchStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Set status" /></SelectTrigger>
                <SelectContent>{config.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={batchMlsInCharge} onValueChange={setBatchMlsInCharge}>
                <SelectTrigger className="w-44"><SelectValue placeholder="MLS In Charge" /></SelectTrigger>
                <SelectContent>{activeSystemUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-xs text-muted-foreground">MLS on Bench:</span>
              {batchMlsOnBench.map(id => {
                const u = activeSystemUsers.find(x => x.id === id);
                return <Badge key={id} variant="secondary" className="gap-1 text-xs">{u?.name || id}<button onClick={() => setBatchMlsOnBench(batchMlsOnBench.filter(x => x !== id))}><X className="h-3 w-3" /></button></Badge>;
              })}
              <Select onValueChange={v => { if (!batchMlsOnBench.includes(v)) setBatchMlsOnBench([...batchMlsOnBench, v]); }}>
                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="+ Add" /></SelectTrigger>
                <SelectContent>{activeSystemUsers.filter(u => !batchMlsOnBench.includes(u.id)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Textarea placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} className="flex-1" rows={1} />
              <Button size="sm" onClick={handleBatchUpdate} disabled={!batchStatus}>Apply</Button>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={c => setSelected(c ? filtered.map(f => f.id) : [])} /></th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{getCaseIdentifierLabel(settings)}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blocks</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                {hasProtocolColumn && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Protocol</th>}
                {isCytoAnalysis && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Methods</th>}
                {isStaining && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stains</th>}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MLS</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flags</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const issueCount = getActiveIssueCount(c);
                const hasIssues = issueCount > 0;
                const caseSel = stainSelections[c.id] || new Set();
                return (
                  <tr key={c.id} className={cn('border-b border-border last:border-0 transition-colors', hasIssues ? 'bg-destructive/15 hover:bg-destructive/20' : c.fixationStatus === 'Decalcifying' && step === 'fixation' ? 'bg-[hsl(50,100%,70%)]/30 hover:bg-[hsl(50,100%,70%)]/40' : 'hover:bg-muted/30')}>
                    <td className="px-4 py-3"><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>
                    <td className="px-4 py-3 font-medium cursor-pointer text-primary hover:underline" onClick={() => navigate(`/case/${c.id}`)}>{getCaseIdentifier(c, settings)}</td>
                    <td className="px-4 py-3">{c.surname}, {c.firstName}</td>
                    <td className="px-4 py-3 text-xs font-mono">{c.totalCassettes || '—'}</td>
                    <td className="px-4 py-3 text-xs">{c.typeOfSample}</td>
                    {hasProtocolColumn && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs truncate max-w-[100px]">{getProtocol(c.protocolId)?.name || '—'}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-6 w-6 p-0', c.reagentChecks?.[currentStepName as string] ? 'text-emerald-600' : 'text-muted-foreground')}
                                onClick={() => setProtocolCheckCase(c.id)}
                              >
                                {c.reagentChecks?.[currentStepName as string] ? <ClipboardCheck className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {c.reagentChecks?.[currentStepName as string]
                                ? `Checked by ${c.reagentChecks[currentStepName as string].checkedBy}`
                                : 'Reagent check not done — click to check'}
                            </TooltipContent>
                          </Tooltip>
                          {c.protocolOverride && <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500 text-amber-600">OVR</Badge>}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => { setStepParamCase(c.id); setStepParamKey(''); setStepParamValue(''); }}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add step parameters</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    )}
                    {isCytoAnalysis && (
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => { setCytoDialogCase(c.id); setCytoMethods_(c.cytoAnalysisMethods || []); }}>
                          {c.cytoAnalysisMethods?.length ? c.cytoAnalysisMethods.join(', ') : 'Set Methods'}
                        </Button>
                      </td>
                    )}
                    {isStaining && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {c.stainRuns?.map(r => (
                            <div key={r.id} className="space-y-0.5">
                              {r.stainTypes.map(s => {
                                const key = `${r.id}:${s}`;
                                const isStained = r.status === 'Stained' || r.status === 'Done' || r.status === 'Mounted';
                                return (
                                  <label key={key} className={cn('flex items-center gap-1 text-[10px]', isStained && 'line-through opacity-60')}>
                                    {!isStained && (
                                      <Checkbox checked={caseSel.has(key)} onCheckedChange={() => toggleStainSel(c.id, key)} className="h-3 w-3" />
                                    )}
                                    {isStained && <CheckCircle className="h-3 w-3 text-[hsl(120,60%,45%)]" />}
                                    {s}
                                  </label>
                                );
                              })}
                            </div>
                          ))}
                          <div className="flex gap-1 mt-1">
                            {caseSel.size > 0 && (
                              <Button variant="default" size="sm" className="text-[10px] h-6 px-2" onClick={() => markSelectedStained(c.id)}>
                                Mark Stained ({caseSel.size})
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => selectAllStains(c.id, c.stainRuns || [])}>
                              All
                            </Button>
                            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => setNewStainDialogCase(c.id)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {!isStaining ? (
                        <Select value={getCaseStatus(c)} onValueChange={v => handleStatusChange(c.id, v)}>
                          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{config.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{getCaseStatus(c)}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => {
                        setMlsDialogCase(c.id); setMlsInCharge((c as any).mlsInCharge || ''); setMlsOnBench((c as any).mlsOnBenchList || []);
                      }}>
                        <Users className="h-3 w-3" />
                        {(c as any).mlsInCharge ? activeSystemUsers.find(u => u.id === (c as any).mlsInCharge)?.name?.split(' ')[0] || 'Set' : 'Set'}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant={hasIssues ? 'destructive' : 'ghost'} size="sm" className={cn('h-7 px-2 text-xs gap-1', !hasIssues && 'text-muted-foreground')} onClick={() => { setIssueDialogCase(c.id); setIssueText(''); }}>
                              <AlertCircle className="h-3 w-3" />{issueCount}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            {hasIssues ? (
                              <div className="space-y-1"><p className="font-semibold text-xs">Active Flags:</p>{(c.flags || c.issues || []).filter(i => !i.isFixed).map(i => <p key={i.id} className="text-xs">• {i.description}</p>)}</div>
                            ) : <p className="text-xs">No flags — click to add</p>}
                          </TooltipContent>
                        </Tooltip>
                        {hasIssues && <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleFixAllIssues(c.id)}>Fix All</Button>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.qcReturnInfo && (
                        <Tooltip>
                          <TooltipTrigger><Badge variant="destructive" className="text-[10px] gap-1 cursor-help"><AlertTriangle className="h-3 w-3" />QC #{c.qcReturnInfo.returnCount}</Badge></TooltipTrigger>
                          <TooltipContent side="left"><p className="font-semibold text-xs">QC Failed</p><p className="text-xs">Failed: {c.qcReturnInfo.failedSteps.join(', ')}</p></TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={hasProtocolColumn ? (isStaining ? 11 : 10) : (isStaining ? 10 : isCytoAnalysis ? 10 : 9)} className="px-4 py-8 text-center text-muted-foreground">No cases at this stage</td></tr>}
            </tbody>
          </table>
        </div>

        {/* MLS Dialog */}
        <Dialog open={!!mlsDialogCase} onOpenChange={o => { if (!o) setMlsDialogCase(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Assign MLS — {currentStepName}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><p className="text-sm font-medium mb-2">MLS In Charge</p>
                <Select value={mlsInCharge} onValueChange={setMlsInCharge}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{activeSystemUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><p className="text-sm font-medium mb-2">MLS on Bench</p>
                <div className="flex flex-wrap gap-1 mb-2">{mlsOnBench.map(id => { const u = activeSystemUsers.find(x => x.id === id); return <Badge key={id} variant="secondary" className="gap-1">{u?.name || id}<button onClick={() => setMlsOnBench(mlsOnBench.filter(x => x !== id))}><X className="h-3 w-3" /></button></Badge>; })}</div>
                <Select onValueChange={v => { if (!mlsOnBench.includes(v)) setMlsOnBench([...mlsOnBench, v]); }}><SelectTrigger><SelectValue placeholder="+ Add" /></SelectTrigger><SelectContent>{activeSystemUsers.filter(u => !mlsOnBench.includes(u.id)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setMlsDialogCase(null)}>Cancel</Button><Button onClick={handleMlsSave}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Dialog */}
        <Dialog open={!!issueDialogCase} onOpenChange={o => { if (!o) setIssueDialogCase(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Raise Flag — {currentStepName}</DialogTitle></DialogHeader>
            {issueDialogCase && (() => {
              const c = cases.find(x => x.id === issueDialogCase);
              const activeIssues = (c?.flags || c?.issues || []).filter(i => !i.isFixed);
              const fixedIssues = (c?.flags || c?.issues || []).filter(i => i.isFixed);
              return (
                <div className="space-y-3">
                  {activeIssues.length > 0 && <div className="space-y-1"><p className="text-sm font-medium text-destructive">Active ({activeIssues.length}):</p>{activeIssues.map(i => (
                    <div key={i.id} className="flex items-center justify-between text-sm bg-destructive/10 rounded px-2 py-1"><span>• {i.description}</span><Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { fixIssue(issueDialogCase, i.id, currentUser?.name || 'Unknown'); }}>Fix</Button></div>
                  ))}</div>}
                  {fixedIssues.length > 0 && <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">Fixed ({fixedIssues.length}):</p>{fixedIssues.map(i => <p key={i.id} className="text-xs text-muted-foreground line-through">• {i.description}</p>)}</div>}
                  <div><p className="text-sm font-medium mb-1">Add new flags (one per line):</p><Textarea value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="Flag description" rows={4} /></div>
                </div>
              );
            })()}
            <DialogFooter><Button variant="outline" onClick={() => setIssueDialogCase(null)}>Close</Button><Button onClick={handleAddIssues} disabled={!issueText.trim()}>Add Flags</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cyto Methods Dialog */}
        <Dialog open={!!cytoDialogCase} onOpenChange={o => { if (!o) setCytoDialogCase(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Cytology Analysis Methods</DialogTitle></DialogHeader>
            <div className="space-y-2">{cytoMethods.map(m => (
              <label key={m} className="flex items-center gap-2 text-sm"><Checkbox checked={cytoMethods_.includes(m)} onCheckedChange={v => setCytoMethods_(v ? [...cytoMethods_, m] : cytoMethods_.filter(x => x !== m))} />{m}</label>
            ))}</div>
            <DialogFooter><Button variant="outline" onClick={() => setCytoDialogCase(null)}>Cancel</Button><Button onClick={handleCytoSubmit}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Stain Run Dialog */}
        <Dialog open={!!newStainDialogCase} onOpenChange={o => { if (!o) setNewStainDialogCase(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add New Stains</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Add stains to this case. The case will remain in Staining until all are marked stained.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {settings.variables.stainCategories.map(cat => (
                <div key={cat.id}><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{cat.name}</p>
                  {cat.stains.map(s => <label key={s} className="flex items-center gap-2 text-sm ml-2"><Checkbox checked={newStainTypes.includes(s)} onCheckedChange={v => setNewStainTypes(v ? [...newStainTypes, s] : newStainTypes.filter(x => x !== s))} />{s}</label>)}
                </div>
              ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setNewStainDialogCase(null)}>Cancel</Button><Button onClick={handleAddStainRun} disabled={newStainTypes.length === 0}>Add Stains</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Protocol Check Dialog */}
        {protocolCheckCase && (() => {
          const caseEntry = cases.find(c => c.id === protocolCheckCase);
          const protocol = getProtocol(caseEntry?.protocolId);
          return (
            <ProtocolCheckDialog
              open={!!protocolCheckCase}
              onOpenChange={o => { if (!o) setProtocolCheckCase(null); }}
              caseId={protocolCheckCase}
              protocol={protocol}
              existingCheck={caseEntry?.reagentChecks?.[currentStepName as string]}
              benchStep={currentStepName as string}
            />
          );
        })()}

        {/* Step Parameters Dialog */}
        <Dialog open={!!stepParamCase} onOpenChange={o => { if (!o) setStepParamCase(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Step Parameters — {currentStepName}</DialogTitle></DialogHeader>
            {stepParamCase && (() => {
              const caseEntry = cases.find(c => c.id === stepParamCase);
              if (!caseEntry) return null;
              const existingParams = caseEntry.stepParameters?.[currentStepName as string] || {};
              return (
                <div className="space-y-4">
                  {Object.keys(existingParams).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Current Parameters:</p>
                      {Object.entries(existingParams).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                          <span><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></span>
                          <button onClick={() => {
                            const newParams = { ...existingParams };
                            delete newParams[k];
                            const allStepParams = { ...(caseEntry.stepParameters || {}), [currentStepName as string]: newParams };
                            updateCase(stepParamCase!, { stepParameters: allStepParams });
                          }} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Add Parameter:</p>
                    <div className="flex gap-2">
                      <Input placeholder="Key" value={stepParamKey} onChange={e => setStepParamKey(e.target.value)} className="flex-1" />
                      <Input placeholder="Value" value={stepParamValue} onChange={e => setStepParamValue(e.target.value)} className="flex-1" />
                      <Button size="icon" onClick={() => {
                        if (!stepParamKey.trim() || !stepParamValue.trim()) return;
                        const allStepParams = {
                          ...(caseEntry.stepParameters || {}),
                          [currentStepName as string]: {
                            ...(caseEntry.stepParameters?.[currentStepName as string] || {}),
                            [stepParamKey.trim()]: stepParamValue.trim(),
                          },
                        };
                        updateCase(stepParamCase!, { stepParameters: allStepParams });
                        addLog(stepParamCase!, { caseId: stepParamCase!, event: `${currentStepName}: Parameter "${stepParamKey.trim()}" = "${stepParamValue.trim()}"`, timestamp: new Date(), user: currentUser?.name || 'Unknown' });
                        setStepParamKey(''); setStepParamValue('');
                      }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })()}
            <DialogFooter><Button variant="outline" onClick={() => setStepParamCase(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};


export default BenchFlow;
