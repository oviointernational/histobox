import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import PageTip from '@/components/PageTip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SpecialRequest, StainRun } from '@/types';

const RequestPage = () => {
  const navigate = useNavigate();
  const { cases, requests, addRequest, updateRequest, updateCase, addLog, currentUser, settings, getDisplayId, hasPermission } = useStore();
  const canAdd = hasPermission('add_requests') || hasPermission('manage_requests');
  const canEdit = hasPermission('edit_requests') || hasPermission('manage_requests');
  const canDelete = hasPermission('delete_requests') || hasPermission('manage_requests');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showAdd, setShowAdd] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [selectedStains, setSelectedStains] = useState<string[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const doneCases = useMemo(() => {
    const s = caseSearch.toLowerCase();
    return cases.filter(c =>
      (c.currentStatus === 'Signed Out' || c.currentStatus === 'Approved' || c.currentStep === 'Done') &&
      (c.hospitalNumber.toLowerCase().includes(s) || getDisplayId(c.id).toLowerCase().includes(s))
    );
  }, [cases, caseSearch, getDisplayId]);

  const selectedCaseEntry = cases.find(c => c.id === selectedCaseId);

  // Map "Special Stain" to "Histochemistry" for display
  const displayRequestType = (type: string) => type === 'Special Stain' ? 'Histochemistry' : type;

  // Check if request type is a stain category (including Histochemistry mapped from Special Stain)
  const getMatchingCategory = (type: string) => {
    // Direct match
    let cat = settings.variables.stainCategories.find(c => c.name === type);
    if (cat) return cat;
    // Map Special Stain -> Histochemistry
    if (type === 'Special Stain') {
      cat = settings.variables.stainCategories.find(c => c.name === 'Histochemistry');
    }
    return cat || null;
  };

  const matchingCategory = getMatchingCategory(requestType);

  // Staining-related request types
  const stainingCategoryNames = ['Histochemistry', 'IHC', 'IF', 'H & E', 'Special Stain'];
  const isStainRequest = (type: string) => {
    if (stainingCategoryNames.includes(type)) return true;
    return !!settings.variables.stainCategories.find(c => c.name === type);
  };

  const filtered = useMemo(() => {
    let result = [...requests];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => {
        const c = cases.find(x => x.id === r.caseId);
        return c?.hospitalNumber.toLowerCase().includes(s) || getDisplayId(r.caseId).toLowerCase().includes(s) || r.requestType.toLowerCase().includes(s);
      });
    }
    result.sort((a, b) => {
      if (sortBy === 'lab') {
        const ca = cases.find(x => x.id === a.caseId);
        const cb = cases.find(x => x.id === b.caseId);
        return (ca?.hospitalNumber || '').localeCompare(cb?.hospitalNumber || '');
      }
      if (sortBy === 'id') return getDisplayId(a.caseId).localeCompare(getDisplayId(b.caseId));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [requests, search, sortBy, cases, getDisplayId]);

  const handleAddRequest = () => {
    if (!selectedCaseId || !requestType) return;
    const req: SpecialRequest = {
      id: crypto.randomUUID(),
      caseId: selectedCaseId,
      requestType: displayRequestType(requestType),
      selectedBlocks,
      selectedStains: selectedStains.length > 0 ? selectedStains : undefined,
      status: 'Pending',
      requestedBy: currentUser?.name || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: [{ id: crypto.randomUUID(), caseId: selectedCaseId, event: `Request created: ${displayRequestType(requestType)}${selectedStains.length ? ` (${selectedStains.join(', ')})` : ''}`, timestamp: new Date(), user: currentUser?.name || '' }],
    };
    addRequest(req);
    addLog(selectedCaseId, {
      caseId: selectedCaseId, event: `Special Request: ${displayRequestType(requestType)}${selectedStains.length ? ` — ${selectedStains.join(', ')}` : ''} — Blocks: ${selectedBlocks.join(', ') || 'All'}`,
      timestamp: new Date(), user: currentUser?.name || '',
    });
    setShowAdd(false);
    setSelectedCaseId(null); setRequestType(''); setSelectedBlocks([]); setSelectedStains([]); setCaseSearch('');
  };

  const handleStatusChange = (reqId: string, status: SpecialRequest['status']) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    updateRequest(reqId, { status });

    // If marking as "In Progress" and it's a stain-type request, add stain runs to the case
    if (status === 'In Progress' && isStainRequest(req.requestType)) {
      const caseEntry = cases.find(c => c.id === req.caseId);
      if (caseEntry) {
        const stains = req.selectedStains || (req.requestType === 'H & E' ? ['H & E'] : []);
        if (stains.length > 0) {
          const existingRun = (caseEntry.stainRuns || []).find(r => !r.isDefault && r.stainTypes.join(',') === stains.join(','));
          if (!existingRun) {
            const newRun: StainRun = {
              id: crypto.randomUUID(),
              stainTypes: stains,
              status: 'Staining',
              createdAt: new Date(),
              isDefault: false,
            };
            const updates: any = { stainRuns: [...(caseEntry.stainRuns || []), newRun] };
            // Bring case back to staining if not already there
            if (caseEntry.currentStep !== 'Staining') {
              updates.currentStep = 'Staining';
              updates.currentStatus = 'Staining';
              updates.stainingStatus = 'Staining';
            }
            updateCase(req.caseId, updates);
          }
        }
      }
    }

    // If marking as "Completed" and it's a stain request (H&E, Histochemistry, IHC), send to Microscopy
    if (status === 'Completed' && isStainRequest(req.requestType)) {
      const caseEntry = cases.find(c => c.id === req.caseId);
      if (caseEntry) {
        // Check if all stain runs are done
        const allDone = (caseEntry.stainRuns || []).every(r => r.status === 'Stained' || r.status === 'Done' || r.status === 'Mounted');
        if (allDone) {
          updateCase(req.caseId, {
            currentStep: 'Microscopy',
            currentStatus: 'Mounted',
            mountingStatus: 'Mounted',
          });
        }
      }
    }

    addLog(req.caseId, {
      caseId: req.caseId, event: `Request ${displayRequestType(req.requestType)}: Status → ${status}`,
      timestamp: new Date(), user: currentUser?.name || '',
    });
  };

  // Build request types with "Histochemistry" replacing "Special Stain" in display
  const requestTypeOptions = settings.variables.requestTypes.map(t => ({
    value: t,
    label: t === 'Special Stain' ? 'Histochemistry' : t,
  }));

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Special Requests</h2>
            <PageTip content="Create requests (IHC, Histochemistry, H&E, recuts, etc.) for completed cases. Stain requests appear in Staining bench flow and go to Microscopy when completed." />
          </div>
          {canAdd && <Button onClick={() => setShowAdd(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Add Request
          </Button>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by lab no., ID, type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="lab">Lab Number</SelectItem>
              <SelectItem value="id">Unique ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Request Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stains</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blocks</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const c = cases.find(x => x.id === r.caseId);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{getDisplayId(r.caseId)}</td>
                    <td className="px-4 py-3 font-medium text-primary cursor-pointer hover:underline" onClick={() => c && navigate(`/case/${c.id}`)}>{c?.hospitalNumber || '—'}</td>
                    <td className="px-4 py-3">{c ? `${c.surname}, ${c.firstName}` : '—'}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{r.requestType}</Badge></td>
                    <td className="px-4 py-3 text-xs">{r.selectedStains?.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.selectedBlocks.length > 0 ? r.selectedBlocks.join(', ') : 'All'}</td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v: any) => handleStatusChange(r.id, v)}>
                        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => c && navigate(`/case/${c.id}`)}>View</Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No requests</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Request Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">New Special Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Search Case (only completed cases):</p>
                <Input placeholder="Search by lab no. or ID..." value={caseSearch} onChange={e => { setCaseSearch(e.target.value); setSelectedCaseId(null); }} />
                {caseSearch && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-lg">
                    {doneCases.map(c => (
                      <button key={c.id} onClick={() => setSelectedCaseId(c.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${selectedCaseId === c.id ? 'bg-accent' : ''}`}>
                        <span className="font-mono text-xs text-muted-foreground">{getDisplayId(c.id)}</span> — <span className="font-medium">{c.hospitalNumber}</span> — {c.surname}, {c.firstName}
                      </button>
                    ))}
                    {doneCases.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No completed cases found</p>}
                  </div>
                )}
              </div>

              {selectedCaseEntry && (
                <>
                  <div className="text-sm bg-muted/50 rounded-lg p-3">
                    <p><span className="text-muted-foreground">Selected:</span> <span className="font-medium">{selectedCaseEntry.hospitalNumber}</span> — {selectedCaseEntry.surname}, {selectedCaseEntry.firstName}</p>
                    {selectedCaseEntry.totalCassettes && <p className="text-xs text-muted-foreground mt-1">Blocks: {selectedCaseEntry.totalCassettes}</p>}
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Request Type:</p>
                    <Select value={requestType} onValueChange={v => { setRequestType(v); setSelectedStains([]); }}>
                      <SelectTrigger><SelectValue placeholder="Select request type" /></SelectTrigger>
                      <SelectContent>
                        {requestTypeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* If request type matches a stain category, show stain list */}
                  {matchingCategory && (
                    <div>
                      <p className="text-sm font-medium mb-2">Select {matchingCategory.name} stains/markers:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                        {matchingCategory.stains.map(s => (
                          <label key={s} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={selectedStains.includes(s)} onCheckedChange={v => setSelectedStains(v ? [...selectedStains, s] : selectedStains.filter(x => x !== s))} />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* For IHC/IF - show their stain lists directly */}
                  {!matchingCategory && requestType && ['IHC', 'IF'].includes(requestType) && (() => {
                    const cat = settings.variables.stainCategories.find(c => c.name === requestType);
                    if (!cat) return null;
                    return (
                      <div>
                        <p className="text-sm font-medium mb-2">Select {cat.name} markers:</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                          {cat.stains.map(s => (
                            <label key={s} className="flex items-center gap-2 text-sm">
                              <Checkbox checked={selectedStains.includes(s)} onCheckedChange={v => setSelectedStains(v ? [...selectedStains, s] : selectedStains.filter(x => x !== s))} />
                              {s}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedCaseEntry.subItems && selectedCaseEntry.subItems.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Select Blocks:</p>
                      <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" className="text-xs h-7"
                          onClick={() => setSelectedBlocks(selectedBlocks.length === selectedCaseEntry.subItems!.length ? [] : selectedCaseEntry.subItems!.map(s => s.label))}>
                          {selectedBlocks.length === selectedCaseEntry.subItems.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                        {selectedCaseEntry.subItems.map(si => (
                          <label key={si.id} className="flex items-center gap-2 text-xs">
                            <Checkbox checked={selectedBlocks.includes(si.label)} onCheckedChange={v => setSelectedBlocks(v ? [...selectedBlocks, si.label] : selectedBlocks.filter(x => x !== si.label))} />
                            {si.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddRequest} disabled={!selectedCaseId || !requestType}>Create Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RequestPage;
