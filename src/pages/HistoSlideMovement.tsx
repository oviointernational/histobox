import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { getCaseIdentifier, getCaseIdentifierLabel } from '@/lib/caseIdentifier';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, ArrowRight, ChevronRight, AlertCircle, Users, X, CheckCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';

type SlideGroup = 'Awaiting Move' | 'Moved';

const HistoSlideMovement = () => {
  const navigate = useNavigate();
  const {
    cases,
    updateCase,
    addLog,
    addFlag,
    fixFlag,
    currentUser,
    settings,
    getDisplayId,
    hasPermission,
    systemUsers,
  } = useStore();
  const canMark = hasPermission('mark_slide_movement');
  const canConfirm = hasPermission('confirm_slide_movement');
  const canRaiseIssue = hasPermission('raise_slide_movement_issue');
  const canView = hasPermission('view_slide_movement') || canMark || canConfirm || canRaiseIssue;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detailCase, setDetailCase] = useState<any>(null);
  const [moveNotes, setMoveNotes] = useState('');
  const [flagText, setFlagText] = useState('');
  const [markCase, setMarkCase] = useState<any>(null);
  const [markNotes, setMarkNotes] = useState('');
  // Batch move dialog
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchNotes, setBatchNotes] = useState('');
  const [issueDialogCase, setIssueDialogCase] = useState<string | null>(null);
  const [issueText, setIssueText] = useState('');

  const activeSystemUsers = systemUsers.filter(u => u.isActive);

  // Cases awaiting slide movement (not yet moved)
  const slideCases = useMemo(() => {
    let result = cases.filter((c) => c.currentStep === 'Slide Movement');
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        (c.hospitalNumber || '').toLowerCase().includes(s) ||
        `${c.surname || ''} ${c.firstName || ''}`.toLowerCase().includes(s)
      );
    }
    return result;
  }, [cases, search]);

  // Moved cases (already in SignOut/Done with slideMovedBy)
  const movedCases = useMemo(() => {
    return cases.filter((c) => c.currentStep === 'SignOut' && c.slideMovedBy);
  }, [cases]);

  const activeCase = detailCase ? cases.find((c) => c.id === detailCase.id) : null;

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectByGroup = (group: SlideGroup) => {
    if (group === 'Awaiting Move') {
      const ids = slideCases.map(c => c.id);
      if (ids.length === 0) return;
      setSelected(prev => {
        const allSelected = ids.every(id => prev.includes(id));
        if (allSelected) return prev.filter(id => !ids.includes(id));
        return [...new Set([...prev, ...ids])];
      });
    } else {
      const ids = movedCases.map(c => c.id);
      if (ids.length === 0) return;
      setSelected(prev => {
        const allSelected = ids.every(id => prev.includes(id));
        if (allSelected) return prev.filter(id => !ids.includes(id));
        return [...new Set([...prev, ...ids])];
      });
    }
  };

  const markMoved = (caseId: string, notes: string) => {
    updateCase(caseId, {
      currentStep: 'SignOut',
      currentStatus: 'Done',
      signOutStatus: undefined,
      signOutComment: undefined,
      slideMovedBy: currentUser?.name || '',
      slideMovedAt: new Date().toISOString(),
      slideMovementNotes: notes || '',
    });
    addLog(caseId, {
      caseId,
      event: 'Slide Movement: Marked as Moved',
      timestamp: new Date(),
      user: currentUser?.name || '',
      details: notes || '',
    });
  };

  const handleBulkMove = () => {
    selected.forEach((id) => markMoved(id, batchNotes || 'Bulk move'));
    setSelected([]);
    setBatchOpen(false);
    setBatchNotes('');
  };

  const raiseIssue = (caseId: string, description: string) => {
    addFlag(caseId, {
      id: crypto.randomUUID(),
      description: description.trim(),
      isFixed: false,
      createdAt: new Date(),
      createdBy: currentUser?.name || '',
    });
    addLog(caseId, {
      caseId,
      event: 'Slide Movement: Issue Raised',
      timestamp: new Date(),
      user: currentUser?.name || '',
      details: description.trim(),
    });
  };

  const handleAddIssues = () => {
    if (!issueDialogCase || !issueText.trim()) return;
    issueText.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      raiseIssue(issueDialogCase, line);
    });
    setIssueDialogCase(null); setIssueText('');
  };

  const getActiveIssueCount = (c: typeof cases[0]) => (c.flags || c.issues || []).filter(i => !i.isFixed).length;

  if (!canView) {
    return <Layout><p className="text-muted-foreground">You don't have permission to view Slide Movement.</p></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Slide Movement</h2>
            <PageTip content="Track physical movement of slides from Microscopy bench to Sign Out. Mark slides as moved individually or in bulk. Issues can be raised for each case." />
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick-select buckets */}
        <div className="flex flex-wrap gap-2">
          {([{ key: 'Awaiting Move' as SlideGroup, list: slideCases }, { key: 'Moved' as SlideGroup, list: movedCases }]).map(({ key, list }) => {
            const count = list.length;
            if (count === 0) return null;
            const allSelected = count > 0 && list.every(c => selected.includes(c.id));
            return (
              <Button key={key} variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => selectByGroup(key)}>
                <Checkbox checked={allSelected} className="h-3 w-3" />
                {key} ({count})
              </Button>
            );
          })}
        </div>

        {/* Batch action bar */}
        {selected.length > 0 && canMark && (
          <div className="bg-accent rounded-xl p-4 space-y-3 shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button size="sm" onClick={() => { setBatchNotes(''); setBatchOpen(true); }}>
              <ArrowRight className="mr-2 h-4 w-4" /> Mark {selected.length} as Moved
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}

        {/* Cases awaiting move — table style like BenchFlow */}
        {slideCases.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            <p>No cases awaiting slide movement. Cases arrive here after Microscopy QC pass.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {canMark && <th className="px-4 py-3 w-10"><Checkbox checked={selected.length === slideCases.length && slideCases.length > 0} onCheckedChange={c => setSelected(c ? slideCases.map(f => f.id) : [])} /></th>}
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{getCaseIdentifierLabel(settings)}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">QC</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flags</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {slideCases.map(c => {
                  const flags = c.flags ?? c.issues ?? [];
                  const openFlags = flags.filter(f => !f.isFixed);
                  const hasIssues = openFlags.length > 0;
                  return (
                    <tr key={c.id} className={cn('border-b border-border last:border-0 transition-colors', hasIssues ? 'bg-destructive/15 hover:bg-destructive/20' : 'hover:bg-muted/30')}>
                      {canMark && <td className="px-4 py-3"><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>}
                      <td className="px-4 py-3 font-medium cursor-pointer text-primary hover:underline" onClick={() => navigate(`/case/${c.id}`)}>{getCaseIdentifier(c, settings)}</td>
                      <td className="px-4 py-3">{c.surname || ''}, {c.firstName || ''}</td>
                      <td className="px-4 py-3 text-xs">{c.caseType || 'Histology'}</td>
                      <td className="px-4 py-3">
                        {c.qcStatus === 'Passed' ? <CheckCircle className="h-4 w-4 text-[hsl(120,60%,45%)]" /> : c.qcStatus === 'Failed' ? <XCircle className="h-4 w-4 text-destructive" /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant={hasIssues ? 'destructive' : 'ghost'} size="sm" className={cn('h-7 px-2 text-xs gap-1', !hasIssues && 'text-muted-foreground')} onClick={() => { setIssueDialogCase(c.id); setIssueText(''); }}>
                                <AlertCircle className="h-3 w-3" />{openFlags.length}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              {hasIssues ? (
                                <div className="space-y-1"><p className="font-semibold text-xs">Active Flags:</p>{openFlags.map(f => <p key={f.id} className="text-xs">• {f.description}</p>)}</div>
                              ) : <p className="text-xs">No flags — click to add</p>}
                            </TooltipContent>
                          </Tooltip>
                          {hasIssues && <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => openFlags.forEach(f => fixFlag(c.id, f.id, currentUser?.name || ''))}>Fix All</Button>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setDetailCase(c)}>
                            <ChevronRight className="mr-1 h-3 w-3" /> Details
                          </Button>
                          {canMark && (
                            <Button size="sm" onClick={() => { setMarkCase(c); setMarkNotes(''); }}>
                              <ArrowRight className="mr-1 h-3 w-3" /> Mark Moved
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {slideCases.length === 0 && <tr><td colSpan={canMark ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">No cases awaiting slide movement.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Already moved cases — table style */}
        {movedCases.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Already Moved ({movedCases.length})</h3>
            <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {canMark && <th className="px-4 py-3 w-10"><Checkbox checked={movedCases.length > 0 && movedCases.every(c => selected.includes(c.id))} onCheckedChange={c => setSelected(c ? movedCases.map(f => f.id) : [])} /></th>}
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{getCaseIdentifierLabel(settings)}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Moved By</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Moved At</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movedCases.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      {canMark && <td className="px-4 py-3"><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>}
                      <td className="px-4 py-3 font-medium cursor-pointer text-primary hover:underline" onClick={() => navigate(`/case/${c.id}`)}>{getCaseIdentifier(c, settings)}</td>
                      <td className="px-4 py-3">{c.surname || ''}, {c.firstName || ''}</td>
                      <td className="px-4 py-3 text-xs">{c.slideMovedBy || '—'}</td>
                      <td className="px-4 py-3 text-xs">{c.slideMovedAt ? new Date(c.slideMovedAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{c.slideMovementNotes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Batch move dialog */}
        <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Mark {selected.length} case(s) as Moved</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Notes (applied to all, optional)</Label>
                <Textarea value={batchNotes} onChange={e => setBatchNotes(e.target.value)} placeholder="Optional notes..." className="mt-1" rows={3} autoFocus />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
              {canMark && (
                <Button onClick={handleBulkMove}>
                  <ArrowRight className="mr-2 h-4 w-4" /> Confirm Move All
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Case detail dialog */}
        <Dialog open={!!detailCase} onOpenChange={(open) => { if (!open) setDetailCase(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                {detailCase ? `Slide Movement — ${getCaseIdentifier(detailCase, settings)}` : 'Slide Movement'}
              </DialogTitle>
            </DialogHeader>
            {detailCase && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Patient: </span>
                    <span>
                      {detailCase.surname || ''} {detailCase.firstName || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span>{detailCase.caseType || 'Histology'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">QC Status: </span>
                    <Badge variant="outline" className="text-xs">
                      {detailCase.qcStatus || '—'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Movement Notes</Label>
                  <Input
                    value={moveNotes}
                    onChange={(e) => setMoveNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Issue (optional)</Label>
                  <Input
                    value={flagText}
                    onChange={(e) => setFlagText(e.target.value)}
                    placeholder="Describe any issues raised..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailCase(null)}>
                Cancel
              </Button>
              {flagText.trim() && canRaiseIssue && (
                <Button
                  variant="outline"
                  onClick={() => {
                    raiseIssue(detailCase.id, flagText);
                    setFlagText('');
                    setMoveNotes('');
                    setDetailCase(null);
                  }}
                >
                  Raise Issue Only
                </Button>
              )}
              {detailCase && canConfirm && (
                <Button
                  onClick={() => {
                    markMoved(detailCase.id, moveNotes);
                    if (flagText.trim()) {
                      raiseIssue(detailCase.id, flagText);
                    }
                    setDetailCase(null);
                    setMoveNotes('');
                    setFlagText('');
                  }}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Confirm Moved
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick "Mark Moved" confirmation dialog */}
        <Dialog open={!!markCase} onOpenChange={(open) => { if (!open) { setMarkCase(null); setMarkNotes(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Mark Moved — {markCase ? getCaseIdentifier(markCase, settings) : ''}
              </DialogTitle>
            </DialogHeader>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={markNotes}
                onChange={(e) => setMarkNotes(e.target.value)}
                placeholder="Optional notes..."
                className="mt-1"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setMarkCase(null); setMarkNotes(''); }}>
                Cancel
              </Button>
              {canMark && (
                <Button
                  onClick={() => {
                    markMoved(markCase.id, markNotes);
                    setMarkCase(null);
                    setMarkNotes('');
                  }}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Mark Moved
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Dialog */}
        <Dialog open={!!issueDialogCase} onOpenChange={(o) => { if (!o) setIssueDialogCase(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Raise Flag — Slide Movement</DialogTitle></DialogHeader>
            {issueDialogCase && (() => {
              const c = cases.find(x => x.id === issueDialogCase);
              const activeIssues = (c?.flags || c?.issues || []).filter(i => !i.isFixed);
              const fixedIssues = (c?.flags || c?.issues || []).filter(i => i.isFixed);
              return (
                <div className="space-y-3">
                  {activeIssues.length > 0 && <div className="space-y-1"><p className="text-sm font-medium text-destructive">Active ({activeIssues.length}):</p>{activeIssues.map(i => (
                    <div key={i.id} className="flex items-center justify-between text-sm bg-destructive/10 rounded px-2 py-1"><span>• {i.description}</span><Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { fixFlag(issueDialogCase, i.id, currentUser?.name || 'Unknown'); }}>Fix</Button></div>
                  ))}</div>}
                  {fixedIssues.length > 0 && <div className="space-y-1"><p className="text-sm font-medium text-muted-foreground">Fixed ({fixedIssues.length}):</p>{fixedIssues.map(i => <p key={i.id} className="text-xs text-muted-foreground line-through">• {i.description}</p>)}</div>}
                  <div><p className="text-sm font-medium mb-1">Add new flags (one per line):</p><Textarea value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="Flag description" rows={4} /></div>
                </div>
              );
            })()}
            <DialogFooter><Button variant="outline" onClick={() => setIssueDialogCase(null)}>Close</Button><Button onClick={handleAddIssues} disabled={!issueText.trim()}>Add Flags</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default HistoSlideMovement;
