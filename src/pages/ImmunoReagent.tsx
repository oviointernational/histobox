import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, ArrowUpDown, Info, X, Play, ArrowLeft, Minus } from 'lucide-react';
import { ImmunoReagent, ImmunoReagentLog, ImmunoReagentType, ImmunoReagentStatus, ImmunoRun } from '@/types/immuno';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';
import { toast } from '@/hooks/use-toast';

const LIGHT_COLORS = [
  'hsl(200,70%,85%)', 'hsl(280,50%,85%)', 'hsl(35,70%,85%)', 'hsl(160,50%,80%)',
  'hsl(330,50%,85%)', 'hsl(50,65%,85%)', 'hsl(10,60%,85%)', 'hsl(220,50%,85%)',
];

const formatTemp = (val: string) => val ? `${val}°C` : '—';

const ImmunoReagentPage = () => {
  const { systemUsers, immunoReagents: reagents, setImmunoReagents: setReagents, immunoRuns, setImmunoRuns, settings, hasPermission } = useStore();
  const canAdd = hasPermission('add_immuno_reagent');
  const canEdit = hasPermission('edit_immuno_reagent');
  const canDelete = hasPermission('delete_immuno_reagent');
  const staffList = systemUsers.filter(u => u.isActive);
  const depletionThreshold = (settings as any).immunoDepletionThreshold || 20;

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [viewingReagentId, setViewingReagentId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  // Run Immuno state
  const [runImmunoOpen, setRunImmunoOpen] = useState(false);
  const [runReagentId, setRunReagentId] = useState('');
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [runDoneBy, setRunDoneBy] = useState<string[]>([]);
  const [runSlides, setRunSlides] = useState('');
  const [activeTab, setActiveTab] = useState<'reagents' | 'runs'>('reagents');

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ImmunoReagentType>('Marker');
  const [newAvailable, setNewAvailable] = useState(true);

  const [logName, setLogName] = useState('');
  const [logStatus, setLogStatus] = useState<ImmunoReagentStatus>('Unused [New & Sealed]');
  const [logDateReceived, setLogDateReceived] = useState('');
  const [logTempReceived, setLogTempReceived] = useState('');
  const [logReceivedBy, setLogReceivedBy] = useState('');
  const [logReconBy, setLogReconBy] = useState('');
  const [logValidatedBy, setLogValidatedBy] = useState('');
  const [logStorageTemp, setLogStorageTemp] = useState('');
  const [logLot, setLogLot] = useState('');
  const [logClone, setLogClone] = useState('');
  const [logExpiration, setLogExpiration] = useState('');
  const [logSlides, setLogSlides] = useState('');

  const viewingReagent = reagents.find(r => r.id === viewingReagentId) || null;

  const addReagent = () => {
    if (!newName.trim()) return;
    const r: ImmunoReagent = {
      id: crypto.randomUUID(), name: newName.trim(), type: newType, available: newAvailable,
      quantity: 0, logs: [], color: LIGHT_COLORS[reagents.length % LIGHT_COLORS.length],
      createdAt: new Date(), updatedAt: new Date(),
    };
    setReagents([...reagents, r]);
    setNewName(''); setAddOpen(false);
  };

  const addLog = () => {
    if (!viewingReagent) return;
    const log: ImmunoReagentLog = {
      id: crypto.randomUUID(), parentId: viewingReagent.id, name: logName, status: logStatus,
      dateReceived: new Date(logDateReceived || Date.now()), temperatureReceived: logTempReceived,
      receivedBy: logReceivedBy, reconstitutedBy: logReconBy, validatedBy: logValidatedBy,
      storageTemperature: logStorageTemp, lot: logLot, clone: logClone,
      expiration: new Date(logExpiration || Date.now()), numberOfSlides: parseInt(logSlides) || 0,
      slidesUsed: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    setReagents(reagents.map(r => r.id === viewingReagent.id
      ? { ...r, logs: [...r.logs, log], quantity: r.quantity + 1, updatedAt: new Date() } : r));
    setLogName(''); setLogStatus('Unused [New & Sealed]'); setLogDateReceived(''); setLogTempReceived('');
    setLogReceivedBy(''); setLogReconBy(''); setLogValidatedBy(''); setLogStorageTemp('');
    setLogLot(''); setLogClone(''); setLogExpiration(''); setLogSlides('');
    setAddLogOpen(false);
  };

  const changeLogStatus = (logId: string, newStatus: ImmunoReagentStatus) => {
    if (!viewingReagent) return;
    setReagents(reagents.map(r => r.id === viewingReagent.id
      ? { ...r, logs: r.logs.map(l => l.id === logId ? { ...l, status: newStatus, updatedAt: new Date() } : l), updatedAt: new Date() } : r));
  };

  const toggleSelect = (id: string) => {
    const r = reagents.find(x => x.id === id);
    if (r && !r.available) return;
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const handleSelectAll = () => {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(filtered.filter(r => r.available).map(r => r.id))); setSelectAll(true); }
  };

  const selectByType = (type: ImmunoReagentType) => {
    setSelectedIds(new Set(reagents.filter(r => r.type === type && r.available).map(r => r.id)));
  };

  // Run Immuno - from the main page button
  const handleRunImmuno = () => {
    const count = parseInt(runSlides) || 0;
    if (count <= 0 || !runReagentId || runDoneBy.length === 0) {
      toast({ title: 'Error', description: 'Select reagent, add done by, and enter number of slides.', variant: 'destructive' });
      return;
    }
    const reagent = reagents.find(r => r.id === runReagentId);
    if (!reagent) return;

    // Subtract from active logs
    const updatedReagents = reagents.map(r => {
      if (r.id !== runReagentId) return r;
      let remaining = count;
      const updatedLogs = r.logs.map(l => {
        if (remaining <= 0) return l;
        if (l.status !== 'In use [Active]' && l.status !== 'Unused [New & Sealed]') return l;
        const available = l.numberOfSlides - l.slidesUsed;
        const toSubtract = Math.min(remaining, available);
        remaining -= toSubtract;
        const newUsed = l.slidesUsed + toSubtract;
        const newStatus: ImmunoReagentStatus = newUsed >= l.numberOfSlides ? 'Used [exhausted]' : 'In use [Active]';
        return { ...l, slidesUsed: newUsed, status: newStatus, updatedAt: new Date() };
      });
      return { ...r, logs: updatedLogs, updatedAt: new Date() };
    });
    setReagents(updatedReagents);

    // Add to runs list
    const run: ImmunoRun = {
      id: crypto.randomUUID(),
      reagentId: runReagentId,
      reagentName: reagent.name,
      date: new Date(runDate),
      doneBy: [...runDoneBy],
      numberOfSlides: count,
      createdAt: new Date(),
    };
    setImmunoRuns([run, ...immunoRuns]);

    // Check depletion
    const updatedReagent = updatedReagents.find(r => r.id === runReagentId);
    if (updatedReagent) {
      const totalVol = getTotalVolume(updatedReagent);
      const totalUsed = getTotalUsed(updatedReagent);
      const pct = totalVol > 0 ? ((totalVol - totalUsed) / totalVol) * 100 : 0;
      if (pct <= depletionThreshold) {
        toast({
          title: `⚠ Low Stock: ${reagent.name}`,
          description: `Only ${Math.max(0, pct).toFixed(0)}% remaining (${Math.max(0, totalVol - totalUsed)} slides left).`,
          variant: 'destructive',
        });
      }
    }

    setRunReagentId(''); setRunDate(new Date().toISOString().split('T')[0]); setRunDoneBy([]); setRunSlides('');
    setRunImmunoOpen(false);
  };

  const toggleAvailability = (id: string) => {
    setReagents(reagents.map(r => r.id === id ? { ...r, available: !r.available, updatedAt: new Date() } : r));
  };

  const getTotalVolume = (r: ImmunoReagent) => {
    return r.logs
      .filter(l => l.status === 'In use [Active]' || l.status === 'Unused [New & Sealed]')
      .reduce((sum, l) => sum + l.numberOfSlides, 0);
  };

  const getTotalUsed = (r: ImmunoReagent) => {
    return r.logs
      .filter(l => l.status === 'In use [Active]' || l.status === 'Unused [New & Sealed]')
      .reduce((sum, l) => sum + l.slidesUsed, 0);
  };

  const getReagentBg = (r: ImmunoReagent): string => {
    if (!r.available) return 'hsl(0,0%,88%)';
    const activeLog = r.logs.find(l => l.status === 'In use [Active]');
    const exhaustedLog = r.logs.find(l => l.status === 'Used [exhausted]');
    const expiredLog = r.logs.find(l => l.status === 'Not in use [expired]');
    if (exhaustedLog && !activeLog) return 'hsl(0,70%,85%)';
    if (expiredLog && !activeLog) return 'hsl(0,0%,25%)';
    if (activeLog) return 'hsl(120,50%,85%)';
    return r.color;
  };

  const getTextColor = (r: ImmunoReagent): string => {
    if (!r.available) return 'hsl(0,0%,50%)';
    const expiredLog = r.logs.find(l => l.status === 'Not in use [expired]');
    const activeLog = r.logs.find(l => l.status === 'In use [Active]');
    if (expiredLog && !activeLog) return 'hsl(0,0%,90%)';
    return 'hsl(0,0%,15%)';
  };

  const filtered = useMemo(() => {
    let list = reagents.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'type') list.sort((a, b) => sortDir === 'asc' ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type));
    else list.sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return list;
  }, [reagents, search, sortBy, sortDir]);

  // Detail page for a specific reagent
  if (viewingReagent) {
    const totalVol = getTotalVolume(viewingReagent);
    const totalUsed = getTotalUsed(viewingReagent);
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingReagentId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{viewingReagent.name} — Logs</h2>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Slides (Active)</p>
                  <p className="text-2xl font-bold">{totalVol}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slides Used</p>
                  <p className="text-2xl font-bold">{totalUsed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">{Math.max(0, totalVol - totalUsed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Dialog open={addLogOpen} onOpenChange={setAddLogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Add Log</Button></DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Reagent Log</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={logName} onChange={e => setLogName(e.target.value)} /></div>
                  <div><Label>Status</Label>
                    <Select value={logStatus} onValueChange={(v: ImmunoReagentStatus) => setLogStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unused [New & Sealed]">Unused [New & Sealed]</SelectItem>
                        <SelectItem value="In use [Active]">In use [Active]</SelectItem>
                        <SelectItem value="Not in use [expired]">Not in use [expired]</SelectItem>
                        <SelectItem value="Used [exhausted]">Used [exhausted]</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date Received</Label><Input type="date" value={logDateReceived} onChange={e => setLogDateReceived(e.target.value)} /></div>
                  <div><Label>Temperature Received (°C)</Label><Input value={logTempReceived} onChange={e => setLogTempReceived(e.target.value)} /></div>
                  <div><Label>Received By</Label>
                    <Select value={logReceivedBy} onValueChange={setLogReceivedBy}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reconstituted By</Label>
                    <Select value={logReconBy} onValueChange={setLogReconBy}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Validated By</Label>
                    <Select value={logValidatedBy} onValueChange={setLogValidatedBy}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Storage Temperature (°C)</Label><Input value={logStorageTemp} onChange={e => setLogStorageTemp(e.target.value)} /></div>
                  <div><Label>Lot</Label><Input value={logLot} onChange={e => setLogLot(e.target.value)} /></div>
                  <div><Label>Clone</Label><Input value={logClone} onChange={e => setLogClone(e.target.value)} /></div>
                  <div><Label>Expiration</Label><Input type="date" value={logExpiration} onChange={e => setLogExpiration(e.target.value)} /></div>
                  <div><Label>Number of Slides</Label><Input type="number" value={logSlides} onChange={e => setLogSlides(e.target.value)} /></div>
                  <Button onClick={addLog} className="w-full">Save Log</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {viewingReagent.logs.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No logs yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {viewingReagent.logs.map(l => {
                const pct = l.numberOfSlides > 0 ? ((l.numberOfSlides - l.slidesUsed) / l.numberOfSlides) * 100 : 100;
                return (
                  <Card key={l.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold">{l.name}</p>
                      <Select value={l.status} onValueChange={(v: ImmunoReagentStatus) => changeLogStatus(l.id, v)}>
                        <SelectTrigger className="w-[180px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unused [New & Sealed]">Unused</SelectItem>
                          <SelectItem value="In use [Active]">In use</SelectItem>
                          <SelectItem value="Not in use [expired]">Expired</SelectItem>
                          <SelectItem value="Used [exhausted]">Exhausted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <p>Lot: {l.lot}</p><p>Clone: {l.clone}</p>
                      <p>Received: {new Date(l.dateReceived).toLocaleDateString()}</p>
                      <p>Expires: {new Date(l.expiration).toLocaleDateString()}</p>
                      <p>Temp Received: {formatTemp(l.temperatureReceived)}</p>
                      <p>Storage Temp: {formatTemp(l.storageTemperature)}</p>
                      <p>Received By: {l.receivedBy || '—'}</p>
                      <p>Reconstituted By: {l.reconstitutedBy || '—'}</p>
                      <p>Validated By: {l.validatedBy || '—'}</p>
                      <p>Slides: {l.slidesUsed}/{l.numberOfSlides}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.max(0, pct)}%`,
                        background: pct > 25 ? 'hsl(120,60%,45%)' : pct > 10 ? 'hsl(45,90%,50%)' : 'hsl(0,70%,50%)',
                      }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Remaining: {Math.max(0, pct).toFixed(0)}%</p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Main list page
  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Immuno Reagent</h2>
          <PageTip content="Manage immunohistochemistry reagents. Add reagents, log batches with slide counts. Use 'Run Immuno' to subtract slides from a specific reagent. View runs history in the Runs tab." />
        </div>

        <div className="flex flex-wrap gap-2">
          {canAdd && <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Immuno Reagent</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Immuno Reagent</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. HER2" /></div>
                <div><Label>Type</Label>
                  <Select value={newType} onValueChange={(v: ImmunoReagentType) => setNewType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Detection Kit">Detection Kit</SelectItem>
                      <SelectItem value="Marker">Marker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={newAvailable} onCheckedChange={(v) => setNewAvailable(!!v)} />
                  <Label>Available</Label>
                </div>
                <Button onClick={addReagent} className="w-full">Add</Button>
              </div>
            </DialogContent>
          </Dialog>}

          <Dialog open={runImmunoOpen} onOpenChange={setRunImmunoOpen}>
            <DialogTrigger asChild><Button variant="outline"><Minus className="h-4 w-4 mr-2" /> Run Immuno</Button></DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Run Immuno</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Immuno Reagent *</Label>
                  <Select value={runReagentId} onValueChange={setRunReagentId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select reagent" /></SelectTrigger>
                    <SelectContent>
                      {reagents.filter(r => r.available).map(r => {
                        const totalSlides = getTotalVolume(r) - getTotalUsed(r);
                        return <SelectItem key={r.id} value={r.id}>{r.name} ({totalSlides} slides left)</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={runDate} onChange={e => setRunDate(e.target.value)} /></div>
                <div>
                  <Label>Done By *</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {runDoneBy.map((name, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {name}
                        <button onClick={() => setRunDoneBy(runDoneBy.filter((_, ii) => ii !== i))}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <Select value="" onValueChange={v => { if (v && !runDoneBy.includes(v)) setRunDoneBy([...runDoneBy, v]); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Add person" /></SelectTrigger>
                    <SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Number of Slides *</Label><Input type="number" value={runSlides} onChange={e => setRunSlides(e.target.value)} placeholder="Slides to subtract" /></div>
                <Button onClick={handleRunImmuno} className="w-full">Run</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={legendOpen} onOpenChange={setLegendOpen}>
            <DialogTrigger asChild><Button variant="outline"><Info className="h-4 w-4 mr-2" /> Color Legend</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Color Legend</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded" style={{ background: 'hsl(120,50%,85%)' }} /><span>In use [Active]</span></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded border border-border bg-background" /><span>Unused [New & Sealed]</span></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded" style={{ background: 'hsl(0,0%,25%)' }} /><span>Not in use [expired]</span></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded" style={{ background: 'hsl(0,70%,85%)' }} /><span>Used [exhausted]</span></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded" style={{ background: 'hsl(0,0%,88%)' }} /><span>Unavailable (greyed out)</span></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="reagents">Immuno Reagents</TabsTrigger>
            <TabsTrigger value="runs">Immuno Runs ({immunoRuns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="reagents" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="type">By Type</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                {sortDir === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(r => {
                const bg = getReagentBg(r);
                const textColor = getTextColor(r);
                const isGrey = !r.available;
                const totalVol = getTotalVolume(r);
                const totalUsed = getTotalUsed(r);
                const remaining = totalVol - totalUsed;
                const pct = totalVol > 0 ? (remaining / totalVol) * 100 : 0;
                return (
                  <div key={r.id}
                    className={cn('relative rounded-xl px-4 py-6 transition-all shadow-sm min-h-[100px]', isGrey ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md')}
                    style={{ background: bg }}
                    onClick={() => { if (!isGrey) setViewingReagentId(r.id); }}>
                    <div className="absolute top-2 right-2">
                      <button
                        className={cn('w-5 h-5 rounded-full border-2 transition-colors',
                          r.available ? 'bg-[hsl(120,60%,45%)] border-[hsl(0,0%,100%)]' : 'bg-[hsl(0,0%,60%)] border-[hsl(0,0%,100%)]')}
                        onClick={e => { e.stopPropagation(); toggleAvailability(r.id); }}
                        title={r.available ? 'Mark unavailable' : 'Mark available'}
                      />
                    </div>
                    <div className="text-center pt-2">
                      <p className="font-bold text-lg" style={{ color: textColor }}>{r.name}</p>
                      {totalVol > 0 && (
                        <>
                          <p className="text-xs mt-1" style={{ color: textColor, opacity: 0.7 }}>
                            {remaining}/{totalVol} slides
                          </p>
                          {pct <= depletionThreshold && pct > 0 && (
                            <Badge variant="destructive" className="mt-1 text-[10px]">Low Stock</Badge>
                          )}
                        </>
                      )}
                      <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: textColor + '40', color: textColor }}>{r.type}</Badge>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No immuno reagents. Add one above.</p>}
            </div>
          </TabsContent>

          <TabsContent value="runs" className="space-y-3 mt-4">
            {immunoRuns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No runs recorded yet. Use "Run Immuno" to log usage.</p>
            ) : (
              <div className="space-y-2">
                {immunoRuns.map(run => (
                  <Card key={run.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{run.reagentName}</p>
                        <p className="text-sm text-muted-foreground">{new Date(run.date).toLocaleDateString()} · {run.numberOfSlides} slides</p>
                        <p className="text-xs text-muted-foreground">Done by: {run.doneBy.join(', ')}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ImmunoReagentPage;
