import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, ArrowRight, ChevronRight, Flag } from 'lucide-react';
import PageTip from '@/components/PageTip';

const HistoSlideMovement = () => {
  const {
    cases,
    updateCase,
    addLog,
    addFlag,
    fixFlag,
    currentUser,
    getDisplayId,
    hasPermission,
  } = useStore();
  const canMark = hasPermission('mark_slide_movement');
  const canConfirm = hasPermission('confirm_slide_movement');
  const canRaiseIssue = hasPermission('raise_slide_movement_issue');

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detailCase, setDetailCase] = useState<any>(null);
  const [moveNotes, setMoveNotes] = useState('');
  const [flagText, setFlagText] = useState('');
  const [markCase, setMarkCase] = useState<any>(null);
  const [markNotes, setMarkNotes] = useState('');

  // Cases awaiting slide movement
  const slideCases = useMemo(() => {
    let result = cases.filter((c) => c.currentStep === 'Slide Movement');
    return result.filter(
      (c) =>
        !search ||
        (c.hospitalNumber || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [cases, search]);

  const activeCase = detailCase ? cases.find((c) => c.id === detailCase.id) : null;

  /** Toggle a single case in the bulk-select list */
  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /** Mark a single case as moved */
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

  /** Mark all selected cases as moved */
  const handleBulkMove = () => {
    selected.forEach((id) => markMoved(id, 'Bulk move'));
    setSelected([]);
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

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Slide Movement</h2>
            <PageTip content="Track physical movement of slides from Microscopy bench to Sign Out. Mark slides as moved individually or in bulk. Issues can be raised for each case." />
          </div>
          {selected.length > 0 && canMark && (
            <Button size="sm" onClick={handleBulkMove}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Mark {selected.length} as Moved
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by lab number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Case list */}
        {slideCases.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            <p>No cases awaiting slide movement. Cases arrive here after Microscopy QC pass.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slideCases.map((c) => {
              const flags = c.flags ?? c.issues ?? [];
              const openFlags = flags.filter((f) => !f.isFixed);
              return (
                <Card key={c.id} className="p-0">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Bulk checkbox */}
                      <Checkbox
                        checked={selected.includes(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                      {/* Case info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold">
                          {c.hospitalNumber || '—'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {c.surname || ''} {c.firstName || ''}
                        </span>
                        <Badge className="ml-2 text-xs" variant="outline">
                          {c.caseType || 'Histology'}
                        </Badge>
                        {openFlags.length > 0 && (
                          <Badge className="ml-2 text-xs" variant="destructive">
                            {openFlags.length} flag{openFlags.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setDetailCase(c)}
                        >
                          <ChevronRight className="mr-1 h-3 w-3" />
                          Details
                        </Button>
                        {canMark && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setMarkCase(c);
                              setMarkNotes('');
                            }}
                          >
                            <ArrowRight className="mr-1 h-3 w-3" />
                            Mark Moved
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Open flags list */}
                    {openFlags.length > 0 && (
                      <ul className="space-y-1 pl-8">
                        {openFlags.map((f) => (
                          <li key={f.id} className="text-xs text-destructive flex items-center gap-2">
                            <span className="flex-1">{f.description}</span>
                            <button
                              className="text-xs underline text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                fixFlag(c.id, f.id, currentUser?.name || '')
                              }
                            >
                              Resolve
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Case detail dialog */}
        <Dialog open={!!detailCase} onOpenChange={(open) => { if (!open) setDetailCase(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                {detailCase ? `Slide Movement — ${detailCase.hospitalNumber}` : 'Slide Movement'}
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

        {/* Quick "Mark Moved" confirmation dialog (replaces native browser prompt) */}
        <Dialog open={!!markCase} onOpenChange={(open) => { if (!open) { setMarkCase(null); setMarkNotes(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Mark Moved — {markCase?.hospitalNumber}
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
      </div>
    </Layout>
  );
};

export default HistoSlideMovement;

