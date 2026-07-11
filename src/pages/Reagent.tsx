import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, ArrowUpDown, BookOpen, Package, FlaskConical, X, ArrowLeft, Minus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Reagent, ReagentPreparation, ReagentConsumable, ConsumableEntry, ReagentManual, SOPEntry, ManualStep, ReagentUsageLog } from '@/types/reagent';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';

type ViewMode = 'reagents' | 'consumables' | 'manuals';

const ReagentPage = () => {
  const { systemUsers, reagents, setReagents, consumables, setConsumables, manuals, setManuals, hasPermission } = useStore();
  const canAdd = hasPermission('add_reagent');
  const canEdit = hasPermission('edit_reagent');
  const canDelete = hasPermission('delete_reagent');
  const [viewMode, setViewMode] = useState<ViewMode>('reagents');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'available'>('name');

  const [selectedReagentId, setSelectedReagentId] = useState<string | null>(null);
  const [selectedConsumableId, setSelectedConsumableId] = useState<string | null>(null);
  const [selectedManualId, setSelectedManualId] = useState<string | null>(null);
  const [viewingSOP, setViewingSOP] = useState<SOPEntry | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addConsumableOpen, setAddConsumableOpen] = useState(false);
  const [addManualOpen, setAddManualOpen] = useState(false);
  const [addPrepOpen, setAddPrepOpen] = useState(false);
  const [addConsEntryOpen, setAddConsEntryOpen] = useState(false);
  const [addSOPOpen, setAddSOPOpen] = useState(false);
  const [useStockOpen, setUseStockOpen] = useState(false);
  const [dispenseConsOpen, setDispenseConsOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newTotalStock, setNewTotalStock] = useState('');
  const [newUnit, setNewUnit] = useState('g');

  const [prepBy, setPrepBy] = useState('');
  const [assistedBy, setAssistedBy] = useState<string[]>([]);
  const [validatedBy, setValidatedBy] = useState('');
  const [prepDate, setPrepDate] = useState('');
  const [prepQuantity, setPrepQuantity] = useState('');

  const [ceLot, setCeLot] = useState('');
  const [ceReceived, setCeReceived] = useState('');
  const [ceExpiration, setCeExpiration] = useState('');
  const [ceQuantity, setCeQuantity] = useState('');

  const [mAuthor, setMAuthor] = useState('');
  const [mApprover, setMApprover] = useState('');
  const [mSteps, setMSteps] = useState<ManualStep[]>([{ id: crypto.randomUUID(), action: '', duration: '', children: [] }]);

  const [cSortBy, setCSortBy] = useState<'name' | 'available'>('name');

  // Usage form
  const [useAmount, setUseAmount] = useState('');
  const [useBy, setUseBy] = useState<string[]>([]);
  const [useNotes, setUseNotes] = useState('');

  // Dispense form
  const [dispenseEntryId, setDispenseEntryId] = useState('');
  const [dispenseAmount, setDispenseAmount] = useState('');

  const staffList = systemUsers.filter(u => u.isActive);

  // Always derive selected items from store
  const selectedReagent = reagents.find(r => r.id === selectedReagentId) || null;
  const selectedConsumable = consumables.find(c => c.id === selectedConsumableId) || null;
  const selectedManual = manuals.find(m => m.id === selectedManualId) || null;

  // ===== REAGENT =====
  const addReagent = () => {
    if (!newName.trim()) return;
    const r: Reagent = {
      id: crypto.randomUUID(), name: newName.trim(), available: true,
      totalStock: parseFloat(newTotalStock) || 0, unit: newUnit || 'g',
      preparations: [], usageLogs: [], createdAt: new Date(), updatedAt: new Date(),
    };
    setReagents([...reagents, r]);
    setNewName(''); setNewTotalStock(''); setNewUnit('g'); setAddOpen(false);
  };

  const toggleReagentAvail = (id: string) => {
    setReagents(reagents.map(r => {
      if (r.id !== id) return r;
      const newAvail = !r.available;
      return { ...r, available: newAvail, preparations: newAvail ? r.preparations : r.preparations.map(p => ({ ...p, isActive: false })), updatedAt: new Date() };
    }));
  };

  const addPreparation = () => {
    if (!selectedReagent || !prepBy) return;
    const prep: ReagentPreparation = {
      id: crypto.randomUUID(), reagentId: selectedReagent.id,
      preparedBy: prepBy, assistedBy, validatedBy, datePrepared: new Date(prepDate || Date.now()),
      quantity: prepQuantity, isActive: false, createdAt: new Date(),
    };
    setReagents(reagents.map(r => r.id === selectedReagent.id
      ? { ...r, preparations: [prep, ...r.preparations], updatedAt: new Date() } : r));
    setPrepBy(''); setAssistedBy([]); setValidatedBy(''); setPrepDate(''); setPrepQuantity('');
    setAddPrepOpen(false);
  };

  const togglePrepActive = (prepId: string) => {
    if (!selectedReagent || !selectedReagent.available) return;
    const target = selectedReagent.preparations.find(p => p.id === prepId)!;
    const nowActive = !target.isActive;
    setReagents(reagents.map(r => {
      if (r.id !== selectedReagent.id) return r;
      return { ...r, preparations: r.preparations.map(p => ({ ...p, isActive: p.id === prepId ? nowActive : false })), updatedAt: new Date() };
    }));
  };

  const addUsage = () => {
    if (!selectedReagent || !useAmount) return;
    const log: ReagentUsageLog = {
      id: crypto.randomUUID(), reagentId: selectedReagent.id,
      date: new Date(), usedBy: useBy, amountUsed: parseFloat(useAmount) || 0, notes: useNotes,
    };
    setReagents(reagents.map(r => r.id === selectedReagent.id
      ? { ...r, usageLogs: [log, ...r.usageLogs], updatedAt: new Date() } : r));
    setUseAmount(''); setUseBy([]); setUseNotes(''); setUseStockOpen(false);
  };

  const getReagentRemaining = (r: Reagent) => {
    const totalUsed = r.usageLogs.reduce((sum, l) => sum + l.amountUsed, 0);
    return Math.max(0, r.totalStock - totalUsed);
  };

  // ===== CONSUMABLE =====
  const addConsumable = () => {
    if (!newName.trim()) return;
    const c: ReagentConsumable = {
      id: crypto.randomUUID(), name: newName.trim(), available: true,
      unit: newUnit || 'pcs', entries: [], createdAt: new Date(), updatedAt: new Date(),
    };
    setConsumables([...consumables, c]);
    setNewName(''); setNewUnit('pcs'); setAddConsumableOpen(false);
  };

  const toggleConsumableAvail = (id: string) => {
    setConsumables(consumables.map(c => {
      if (c.id !== id) return c;
      const newAvail = !c.available;
      return { ...c, available: newAvail, entries: newAvail ? c.entries : c.entries.map(e => ({ ...e, isActive: false })), updatedAt: new Date() };
    }));
  };

  const addConsEntry = () => {
    if (!selectedConsumable) return;
    const entry: ConsumableEntry = {
      id: crypto.randomUUID(), consumableId: selectedConsumable.id, lotNumber: ceLot,
      receivedDate: new Date(ceReceived || Date.now()), expiration: new Date(ceExpiration || Date.now()),
      quantity: parseFloat(ceQuantity) || 0, dispensed: 0, isActive: false, createdAt: new Date(),
    };
    setConsumables(consumables.map(c => c.id === selectedConsumable.id
      ? { ...c, entries: [entry, ...c.entries], updatedAt: new Date() } : c));
    setCeLot(''); setCeReceived(''); setCeExpiration(''); setCeQuantity('');
    setAddConsEntryOpen(false);
  };

  const toggleConsEntryActive = (entryId: string) => {
    if (!selectedConsumable || !selectedConsumable.available) return;
    const target = selectedConsumable.entries.find(e => e.id === entryId)!;
    const nowActive = !target.isActive;
    setConsumables(consumables.map(c => {
      if (c.id !== selectedConsumable.id) return c;
      return { ...c, entries: c.entries.map(e => ({ ...e, isActive: e.id === entryId ? nowActive : false })), updatedAt: new Date() };
    }));
  };

  const dispenseFromEntry = () => {
    if (!selectedConsumable || !dispenseEntryId || !dispenseAmount) return;
    const amt = parseFloat(dispenseAmount) || 0;
    setConsumables(consumables.map(c => {
      if (c.id !== selectedConsumable.id) return c;
      return {
        ...c,
        entries: c.entries.map(e => e.id === dispenseEntryId ? { ...e, dispensed: e.dispensed + amt } : e),
        updatedAt: new Date(),
      };
    }));
    setDispenseAmount(''); setDispenseEntryId(''); setDispenseConsOpen(false);
  };

  const getConsTotals = (c: ReagentConsumable) => {
    const totalIn = c.entries.reduce((sum, e) => sum + e.quantity, 0);
    const totalOut = c.entries.reduce((sum, e) => sum + e.dispensed, 0);
    return { totalIn, totalOut, remaining: totalIn - totalOut };
  };

  // ===== MANUAL =====
  const addManual = () => {
    if (!newName.trim()) return;
    setManuals([...manuals, { id: crypto.randomUUID(), name: newName.trim(), available: true, sops: [], createdAt: new Date(), updatedAt: new Date() }]);
    setNewName(''); setAddManualOpen(false);
  };

  const toggleManualAvail = (id: string) => {
    setManuals(manuals.map(m => {
      if (m.id !== id) return m;
      const newAvail = !m.available;
      return { ...m, available: newAvail, sops: newAvail ? m.sops : m.sops.map(s => ({ ...s, isActive: false })), updatedAt: new Date() };
    }));
  };

  const addManualStep = (steps: ManualStep[], parentId?: string): ManualStep[] => {
    if (!parentId) return [...steps, { id: crypto.randomUUID(), action: '', duration: '', children: [] }];
    return steps.map(s => s.id === parentId
      ? { ...s, children: [...s.children, { id: crypto.randomUUID(), action: '', duration: '', children: [] }] }
      : { ...s, children: addManualStep(s.children, parentId) });
  };

  const updateManualStep = (steps: ManualStep[], id: string, field: 'action' | 'duration', val: string): ManualStep[] => {
    return steps.map(s => s.id === id ? { ...s, [field]: val } : { ...s, children: updateManualStep(s.children, id, field, val) });
  };

  const removeManualStep = (steps: ManualStep[], id: string): ManualStep[] => {
    return steps.filter(s => s.id !== id).map(s => ({ ...s, children: removeManualStep(s.children, id) }));
  };

  const saveSOP = () => {
    if (!selectedManual) return;
    const sop: SOPEntry = {
      id: crypto.randomUUID(), manualId: selectedManual.id, steps: mSteps,
      authoredBy: mAuthor, approvedBy: mApprover, isApproved: !!mApprover,
      isActive: false, createdAt: new Date(), updatedAt: new Date(),
    };
    setManuals(manuals.map(m => m.id === selectedManual.id
      ? { ...m, sops: [sop, ...m.sops], updatedAt: new Date() } : m));
    setMAuthor(''); setMApprover('');
    setMSteps([{ id: crypto.randomUUID(), action: '', duration: '', children: [] }]);
    setAddSOPOpen(false);
  };

  const toggleSOPActive = (sopId: string) => {
    if (!selectedManual || !selectedManual.available) return;
    const target = selectedManual.sops.find(s => s.id === sopId)!;
    const nowActive = !target.isActive;
    setManuals(manuals.map(m => {
      if (m.id !== selectedManual.id) return m;
      return { ...m, sops: m.sops.map(s => ({ ...s, isActive: s.id === sopId ? nowActive : false })), updatedAt: new Date() };
    }));
  };

  const renderStepsForm = (steps: ManualStep[], depth = 0) => (
    <div className={cn('space-y-2', depth > 0 && 'ml-6 border-l-2 border-muted pl-3')}>
      {steps.map(step => (
        <div key={step.id}>
          <div className="flex items-center gap-2">
            <Input placeholder="Step" value={step.action}
              onChange={e => setMSteps(updateManualStep(mSteps, step.id, 'action', e.target.value))} className="flex-1" />
            <span className="text-muted-foreground">–</span>
            <Input placeholder="Duration" value={step.duration}
              onChange={e => setMSteps(updateManualStep(mSteps, step.id, 'duration', e.target.value))} className="w-32" />
            <Button size="icon" variant="ghost" onClick={() => setMSteps(addManualStep(mSteps, step.id))}><Plus className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setMSteps(removeManualStep(mSteps, step.id))}><X className="h-3 w-3" /></Button>
          </div>
          {step.children.length > 0 && renderStepsForm(step.children, depth + 1)}
        </div>
      ))}
    </div>
  );

  const renderStepsView = (steps: ManualStep[], depth = 0, parentNum = '') => {
    let stepCounter = 0;
    return (
      <div className={cn('space-y-2', depth > 0 && 'ml-6 border-l-2 border-primary/20 pl-4')}>
        {steps.map(step => {
          const hasBoth = step.action.trim() && step.duration.trim();
          const isComment = step.action.trim() && !step.duration.trim();
          if (hasBoth) stepCounter++;
          const num = parentNum ? `${parentNum}.${stepCounter}` : `${stepCounter}`;
          return (
            <div key={step.id}>
              {hasBoth ? (
                <div className="flex items-baseline justify-between py-1.5 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-bold text-primary min-w-[2rem]">{num}.</span>
                    <span className="font-medium text-sm">{step.action}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono ml-4 shrink-0">{step.duration}</span>
                </div>
              ) : isComment ? (
                <p className="text-sm italic text-muted-foreground px-3 py-1">{step.action}</p>
              ) : null}
              {step.children.length > 0 && renderStepsView(step.children, depth + 1, hasBoth ? num : parentNum)}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredReagents = reagents.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : Number(b.available) - Number(a.available));
  const filteredConsumables = consumables.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => cSortBy === 'name' ? a.name.localeCompare(b.name) : Number(b.available) - Number(a.available));
  const filteredManuals = manuals.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  // ===== SOP DETAIL VIEW =====
  if (viewingSOP && selectedManual) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingSOP(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{selectedManual.name} — SOP</h2>
          </div>
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm mb-6 pb-4 border-b border-border">
              <div><span className="text-muted-foreground">Authored By:</span> <span className="font-medium">{viewingSOP.authoredBy || '—'}</span></div>
              <div><span className="text-muted-foreground">Approved By:</span> <span className="font-medium">{viewingSOP.approvedBy || '—'}</span></div>
              <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(viewingSOP.createdAt).toLocaleDateString()}</span></div>
              <div>
                <Badge className={cn(viewingSOP.isApproved ? 'bg-[hsl(120,60%,45%)]' : 'bg-[hsl(0,70%,50%)]', 'text-[hsl(0,0%,100%)]')}>
                  {viewingSOP.isApproved ? 'Approved' : 'Not Approved'}
                </Badge>
              </div>
            </div>
            <h3 className="font-display font-semibold mb-4 text-lg">Procedure Steps</h3>
            {renderStepsView(viewingSOP.steps)}
          </Card>
        </div>
      </Layout>
    );
  }

  // ===== REAGENT DETAIL =====
  if (selectedReagent && viewMode === 'reagents') {
    const remaining = getReagentRemaining(selectedReagent);
    const pct = selectedReagent.totalStock > 0 ? (remaining / selectedReagent.totalStock) * 100 : 100;
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedReagentId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{selectedReagent.name}</h2>
            <Badge className={cn(selectedReagent.available ? 'bg-[hsl(120,60%,45%)]' : 'bg-[hsl(0,70%,50%)]', 'text-[hsl(0,0%,100%)]')}>
              {selectedReagent.available ? 'Available' : 'Unavailable'}
            </Badge>
          </div>

          {/* Stock gauge */}
          {selectedReagent.totalStock > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Stock</p>
                    <p className="text-2xl font-bold">{selectedReagent.totalStock} {selectedReagent.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Used</p>
                    <p className="text-2xl font-bold text-[hsl(0,70%,50%)]">{(selectedReagent.totalStock - remaining).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold">{remaining.toFixed(1)}</p>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.max(0, Math.min(100, pct))}%`,
                    background: pct > 25 ? 'hsl(120,60%,45%)' : pct > 10 ? 'hsl(45,90%,50%)' : 'hsl(0,70%,50%)',
                  }} />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">{Math.max(0, pct).toFixed(0)}% remaining</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => toggleReagentAvail(selectedReagent.id)}>
              {selectedReagent.available ? 'Mark Unavailable' : 'Mark Available'}
            </Button>
            {selectedReagent.available && (
              <>
                <Dialog open={addPrepOpen} onOpenChange={setAddPrepOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Add Preparation</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Preparation</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Prepared By</Label><Select value={prepBy} onValueChange={setPrepBy}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Assisted By</Label>
                        <div className="flex flex-wrap gap-1 mb-1">{assistedBy.map((a, i) => <Badge key={i} variant="secondary">{a} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setAssistedBy(assistedBy.filter((_, j) => j !== i))} /></Badge>)}</div>
                        <Select onValueChange={v => { if (!assistedBy.includes(v)) setAssistedBy([...assistedBy, v]); }}><SelectTrigger><SelectValue placeholder="Add" /></SelectTrigger><SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label>Validated By</Label><Select value={validatedBy} onValueChange={setValidatedBy}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Date</Label><Input type="date" value={prepDate} onChange={e => setPrepDate(e.target.value)} /></div>
                      <div><Label>Quantity</Label><Input value={prepQuantity} onChange={e => setPrepQuantity(e.target.value)} /></div>
                      <Button onClick={addPreparation} className="w-full">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={useStockOpen} onOpenChange={setUseStockOpen}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Minus className="h-3 w-3 mr-1" /> Use Stock</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Use Stock — {selectedReagent.name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Amount ({selectedReagent.unit})</Label><Input type="number" value={useAmount} onChange={e => setUseAmount(e.target.value)} /></div>
                      <div><Label>Used By</Label>
                        <div className="flex flex-wrap gap-1 mb-1">{useBy.map((a, i) => <Badge key={i} variant="secondary">{a} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setUseBy(useBy.filter((_, j) => j !== i))} /></Badge>)}</div>
                        <Select onValueChange={v => { if (!useBy.includes(v)) setUseBy([...useBy, v]); }}><SelectTrigger><SelectValue placeholder="Add person" /></SelectTrigger><SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label>Notes</Label><Input value={useNotes} onChange={e => setUseNotes(e.target.value)} placeholder="Optional" /></div>
                      <Button onClick={addUsage} className="w-full">Record Usage</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {/* Usage Logs */}
          {selectedReagent.usageLogs.length > 0 && (
            <>
              <h4 className="font-semibold">Usage Log</h4>
              <div className="space-y-2">
                {selectedReagent.usageLogs.map(l => (
                  <Card key={l.id} className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">−{l.amountUsed} {selectedReagent.unit}</p>
                        <p className="text-xs text-muted-foreground">{new Date(l.date).toLocaleString()} · {l.usedBy.join(', ') || '—'}</p>
                        {l.notes && <p className="text-xs text-muted-foreground italic">{l.notes}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          <h4 className="font-semibold">Preparations</h4>
          {selectedReagent.preparations.length === 0 ? (
            <p className="text-muted-foreground">No preparations yet.</p>
          ) : (
            <div className="space-y-3">
              {selectedReagent.preparations.map(p => (
                <Card key={p.id} className={cn('p-3', p.isActive && 'ring-2 ring-primary')}>
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-2 text-sm flex-1">
                      <div><span className="text-muted-foreground">Prepared by:</span> {p.preparedBy}</div>
                      <div><span className="text-muted-foreground">Validated by:</span> {p.validatedBy || 'N/A'}</div>
                      <div><span className="text-muted-foreground">Assisted by:</span> {p.assistedBy.join(', ') || 'N/A'}</div>
                      <div><span className="text-muted-foreground">Date:</span> {new Date(p.datePrepared).toLocaleDateString()}</div>
                      <div><span className="text-muted-foreground">Quantity:</span> {p.quantity}</div>
                    </div>
                    <Button size="sm" variant={p.isActive ? 'default' : 'outline'} onClick={() => togglePrepActive(p.id)}
                      disabled={!selectedReagent.available}>
                      {p.isActive ? 'Active' : 'Set Active'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ===== CONSUMABLE DETAIL =====
  if (selectedConsumable && viewMode === 'consumables') {
    const { totalIn, totalOut, remaining } = getConsTotals(selectedConsumable);
    const pct = totalIn > 0 ? (remaining / totalIn) * 100 : 100;
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedConsumableId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{selectedConsumable.name}</h2>
            <Badge className={cn(selectedConsumable.available ? 'bg-[hsl(120,60%,45%)]' : 'bg-[hsl(0,70%,50%)]', 'text-[hsl(0,0%,100%)]')}>
              {selectedConsumable.available ? 'Available' : 'Unavailable'}
            </Badge>
          </div>

          {/* Gauge */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Received</p>
                  <p className="text-2xl font-bold text-[hsl(120,60%,35%)]">{totalIn}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispensed</p>
                  <p className="text-2xl font-bold text-[hsl(0,70%,50%)]">{totalOut}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">{remaining} {selectedConsumable.unit}</p>
                </div>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.max(0, Math.min(100, pct))}%`,
                  background: pct > 25 ? 'hsl(120,60%,45%)' : pct > 10 ? 'hsl(45,90%,50%)' : 'hsl(0,70%,50%)',
                }} />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">{Math.max(0, pct).toFixed(0)}% remaining</p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toggleConsumableAvail(selectedConsumable.id)}>
              {selectedConsumable.available ? 'Mark Unavailable' : 'Mark Available'}
            </Button>
            {selectedConsumable.available && (
              <>
                <Dialog open={addConsEntryOpen} onOpenChange={setAddConsEntryOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Add Stock</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Consumable Stock</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Lot Number</Label><Input value={ceLot} onChange={e => setCeLot(e.target.value)} /></div>
                      <div><Label>Received Date</Label><Input type="date" value={ceReceived} onChange={e => setCeReceived(e.target.value)} /></div>
                      <div><Label>Expiration</Label><Input type="date" value={ceExpiration} onChange={e => setCeExpiration(e.target.value)} /></div>
                      <div><Label>Quantity ({selectedConsumable.unit})</Label><Input type="number" value={ceQuantity} onChange={e => setCeQuantity(e.target.value)} /></div>
                      <Button onClick={addConsEntry} className="w-full">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={dispenseConsOpen} onOpenChange={setDispenseConsOpen}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Minus className="h-3 w-3 mr-1" /> Dispense</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Dispense — {selectedConsumable.name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>From Entry</Label>
                        <Select value={dispenseEntryId} onValueChange={setDispenseEntryId}>
                          <SelectTrigger><SelectValue placeholder="Select entry" /></SelectTrigger>
                          <SelectContent>
                            {selectedConsumable.entries.filter(e => e.quantity - e.dispensed > 0).map(e => (
                              <SelectItem key={e.id} value={e.id}>Lot: {e.lotNumber} — {e.quantity - e.dispensed} left</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Amount ({selectedConsumable.unit})</Label><Input type="number" value={dispenseAmount} onChange={e => setDispenseAmount(e.target.value)} /></div>
                      <Button onClick={dispenseFromEntry} className="w-full">Dispense</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {selectedConsumable.entries.length === 0 ? (
            <p className="text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="space-y-3">
              {selectedConsumable.entries.map(e => {
                const entryPct = e.quantity > 0 ? ((e.quantity - e.dispensed) / e.quantity) * 100 : 100;
                return (
                  <Card key={e.id} className={cn('p-3', e.isActive && 'ring-2 ring-primary')}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Lot:</span> {e.lotNumber}</div>
                          <div><span className="text-muted-foreground">Qty:</span> {e.quantity} ({e.dispensed} dispensed)</div>
                          <div><span className="text-muted-foreground">Received:</span> {new Date(e.receivedDate).toLocaleDateString()}</div>
                          <div><span className="text-muted-foreground">Expires:</span> {new Date(e.expiration).toLocaleDateString()}</div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${Math.max(0, entryPct)}%`,
                            background: entryPct > 25 ? 'hsl(120,60%,45%)' : 'hsl(0,70%,50%)',
                          }} />
                        </div>
                      </div>
                      <Button size="sm" variant={e.isActive ? 'default' : 'outline'} onClick={() => toggleConsEntryActive(e.id)}
                        disabled={!selectedConsumable.available} className="ml-2">
                        {e.isActive ? 'Active' : 'Set Active'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ===== MANUAL DETAIL =====
  if (selectedManual && viewMode === 'manuals') {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedManualId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{selectedManual.name}</h2>
            <Badge className={cn(selectedManual.available ? 'bg-[hsl(120,60%,45%)]' : 'bg-[hsl(0,70%,50%)]', 'text-[hsl(0,0%,100%)]')}>
              {selectedManual.available ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toggleManualAvail(selectedManual.id)}>
              {selectedManual.available ? 'Mark Unavailable' : 'Mark Available'}
            </Button>
            {selectedManual.available && (
              <Dialog open={addSOPOpen} onOpenChange={setAddSOPOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Add SOP</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Standard Operating Procedure</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Steps</Label>
                        <Button size="sm" variant="outline" onClick={() => setMSteps(addManualStep(mSteps))}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
                      </div>
                      {renderStepsForm(mSteps)}
                    </div>
                    <div><Label>Authored By</Label><Select value={mAuthor} onValueChange={setMAuthor}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Approved By</Label><Select value={mApprover} onValueChange={setMApprover}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={saveSOP} className="w-full">Save SOP</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {selectedManual.sops.length === 0 ? (
            <p className="text-muted-foreground">No SOPs yet.</p>
          ) : (
            <div className="space-y-3">
              {selectedManual.sops.map(sop => (
                <Card key={sop.id} className={cn('p-3 cursor-pointer hover:shadow-md transition-shadow', sop.isActive && 'ring-2 ring-primary')}>
                  <div className="flex justify-between items-start">
                    <div onClick={() => setViewingSOP(sop)} className="flex-1">
                      <p className="font-semibold">SOP — {new Date(sop.createdAt).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">By: {sop.authoredBy || 'N/A'} · Approved: {sop.approvedBy || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className={cn(sop.isApproved ? 'bg-[hsl(120,60%,45%)]' : 'bg-[hsl(0,70%,50%)]', 'text-[hsl(0,0%,100%)]')}>
                        {sop.isApproved ? 'Approved' : 'Not Approved'}
                      </Badge>
                      <Button size="sm" variant={sop.isActive ? 'default' : 'outline'} onClick={e => { e.stopPropagation(); toggleSOPActive(sop.id); }}
                        disabled={!selectedManual.available}>
                        {sop.isActive ? 'Active' : 'Set Active'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ===== MAIN LIST VIEW =====
  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Reagent</h2>
          <PageTip content="Manage reagents (with stock tracking & usage gauge), consumables (with dispense tracking), and SOP manuals." />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={viewMode === 'reagents' ? 'default' : 'outline'} onClick={() => { setViewMode('reagents'); setSearch(''); }}>
            <FlaskConical className="h-4 w-4 mr-2" /> Reagents
          </Button>
          <Button variant={viewMode === 'consumables' ? 'default' : 'outline'} onClick={() => { setViewMode('consumables'); setSearch(''); }}>
            <Package className="h-4 w-4 mr-2" /> Consumables
          </Button>
          <Button variant={viewMode === 'manuals' ? 'default' : 'outline'} onClick={() => { setViewMode('manuals'); setSearch(''); }}>
            <BookOpen className="h-4 w-4 mr-2" /> Manuals
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {viewMode === 'reagents' && (
            <>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[160px]"><ArrowUpDown className="h-3 w-3 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="available">Sort by Status</SelectItem>
                </SelectContent>
              </Select>
              {canAdd && <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Reagent</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Reagent</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                    <div><Label>Total Stock</Label><Input type="number" value={newTotalStock} onChange={e => setNewTotalStock(e.target.value)} placeholder="e.g. 500" /></div>
                    <div><Label>Unit</Label><Input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="e.g. g, ml, L" /></div>
                    <Button onClick={addReagent} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>}
            </>
          )}
          {viewMode === 'consumables' && (
            <>
              <Select value={cSortBy} onValueChange={(v: any) => setCSortBy(v)}>
                <SelectTrigger className="w-[160px]"><ArrowUpDown className="h-3 w-3 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="available">Sort by Status</SelectItem>
                </SelectContent>
              </Select>
              {canAdd && <Dialog open={addConsumableOpen} onOpenChange={setAddConsumableOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Consumable</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Consumable</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                    <div><Label>Unit</Label><Input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="e.g. pcs, boxes, vials" /></div>
                    <Button onClick={addConsumable} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>}
            </>
          )}
          {viewMode === 'manuals' && canAdd && (
            <Dialog open={addManualOpen} onOpenChange={setAddManualOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Manual</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Manual</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                  <Button onClick={addManual} className="w-full">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {viewMode === 'reagents' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredReagents.map(r => {
              const rem = getReagentRemaining(r);
              const pct = r.totalStock > 0 ? (rem / r.totalStock) * 100 : 100;
              return (
                <div key={r.id} onClick={() => setSelectedReagentId(r.id)}
                  className={cn('rounded-xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md text-center',
                    r.available ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>
                  <p className="text-lg font-semibold">{r.name}</p>
                  {r.totalStock > 0 && (
                    <>
                      <p className="text-xs mt-1 opacity-70">{rem.toFixed(0)}/{r.totalStock} {r.unit}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-background/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.max(0, pct)}%`,
                          background: pct > 25 ? 'hsl(120,60%,45%)' : 'hsl(0,70%,50%)',
                        }} />
                      </div>
                    </>
                  )}
                  <Badge variant="outline" className="mt-2">{r.available ? 'Available' : 'Unavailable'}</Badge>
                </div>
              );
            })}
            {filteredReagents.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No reagents yet.</p>}
          </div>
        )}

        {viewMode === 'consumables' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredConsumables.map(c => {
              const { totalIn, remaining } = getConsTotals(c);
              const pct = totalIn > 0 ? (remaining / totalIn) * 100 : 100;
              return (
                <div key={c.id} onClick={() => setSelectedConsumableId(c.id)}
                  className={cn('rounded-xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md text-center',
                    c.available ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                  <p className="text-lg font-semibold">{c.name}</p>
                  <p className="text-sm mt-1 opacity-70">{remaining}/{totalIn} {c.unit}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-background/50 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.max(0, pct)}%`,
                      background: pct > 25 ? 'hsl(120,60%,45%)' : 'hsl(0,70%,50%)',
                    }} />
                  </div>
                  <Badge variant="outline" className="mt-2">{c.available ? 'Available' : 'Unavailable'}</Badge>
                </div>
              );
            })}
            {filteredConsumables.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No consumables yet.</p>}
          </div>
        )}

        {viewMode === 'manuals' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredManuals.map(m => (
              <div key={m.id} onClick={() => setSelectedManualId(m.id)}
                className={cn('rounded-xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md text-center font-semibold',
                  m.available ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground')}>
                <p className="text-lg">{m.name}</p>
                <p className="text-sm mt-1 opacity-70">{m.sops.length} SOPs</p>
                <Badge variant="outline" className="mt-2">{m.available ? 'Available' : 'Unavailable'}</Badge>
              </div>
            ))}
            {filteredManuals.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No manuals yet.</p>}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReagentPage;
