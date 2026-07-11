import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, SendHorizontal } from 'lucide-react';
import PageTip from '@/components/PageTip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { QueryCase, BenchStep } from '@/types';

const sendToSteps: { label: string; step: BenchStep | 'Microscopy'; status: string }[] = [
  { label: 'Fixation (Fixing)', step: 'Fixation', status: 'Room Fixing' },
  { label: 'Processing', step: 'Processing', status: 'Processing' },
  { label: 'Embedding', step: 'Embedding', status: 'Embedding' },
  { label: 'Microtomy', step: 'Microtomy', status: 'Microtomy' },
  { label: 'Staining', step: 'Staining', status: 'Staining' },
  { label: 'Mounting', step: 'Mounting', status: 'Mounting' },
  { label: 'Microscopy', step: 'Microscopy', status: 'Mounted' },
];

const QueryPage = () => {
  const navigate = useNavigate();
  const { queryCases, addQueryCase, updateQueryCase, cases, updateCase, addLog, currentUser, settings, hasPermission } = useStore();
  const canAdd = hasPermission('add_query') || hasPermission('manage_query');
  const canEdit = hasPermission('edit_query') || hasPermission('manage_query');
  const canDelete = hasPermission('delete_query') || hasPermission('manage_query');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [statusFilter, setStatusFilter] = useState('all');

  // Send-to dialog
  const [sendToId, setSendToId] = useState<string | null>(null);
  const [sendToStep, setSendToStep] = useState('');

  const [labNumber, setLabNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [rdInitials, setRdInitials] = useState('');
  const [rdName, setRdName] = useState('');
  const [mlsInitials, setMlsInitials] = useState('');
  const [mlsName, setMlsName] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    let result = [...queryCases];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(q => q.labNumber.toLowerCase().includes(s) || q.patientName.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }
    result.sort((a, b) => {
      if (sortBy === 'lab') return a.labNumber.localeCompare(b.labNumber);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [queryCases, search, sortBy, statusFilter]);

  const handleAddQuery = () => {
    if (!labNumber.trim() || !patientName.trim()) return;
    const qc: QueryCase = {
      id: crypto.randomUUID(),
      labNumber: labNumber.trim(),
      patientName: patientName.trim(),
      residentDoctor: rdName,
      residentDoctorInitials: rdInitials,
      mls: mlsName,
      mlsInitials: mlsInitials,
      status: 'Open',
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: [{ id: crypto.randomUUID(), caseId: '', event: 'Query Case Created', timestamp: new Date(), user: currentUser?.name || '' }],
    };
    addQueryCase(qc);
    setShowAdd(false);
    setLabNumber(''); setPatientName(''); setRdInitials(''); setRdName(''); setMlsInitials(''); setMlsName(''); setNotes('');
  };

  const handleResolve = (id: string) => {
    updateQueryCase(id, { status: 'Resolved' });
  };

  const handleSendTo = () => {
    if (!sendToId || !sendToStep) return;
    const qc = queryCases.find(q => q.id === sendToId);
    if (!qc) return;
    const stepInfo = sendToSteps.find(s => s.step === sendToStep);
    if (!stepInfo) return;

    // Find matching case by lab number
    const matchingCase = cases.find(c => c.labNumber === qc.labNumber);
    if (matchingCase) {
      const statusKey = stepInfo.step === 'Fixation' ? 'fixationStatus' :
        stepInfo.step === 'Processing' ? 'processingStatus' :
        stepInfo.step === 'Embedding' ? 'embeddingStatus' :
        stepInfo.step === 'Microtomy' ? 'microtomyStatus' :
        stepInfo.step === 'Staining' ? 'stainingStatus' :
        stepInfo.step === 'Mounting' ? 'mountingStatus' : undefined;

      const updates: any = {
        currentStep: stepInfo.step,
        currentStatus: stepInfo.status,
      };
      if (statusKey) updates[statusKey] = stepInfo.status;

      updateCase(matchingCase.id, updates);
      addLog(matchingCase.id, {
        caseId: matchingCase.id,
        event: `Sent from Query to ${stepInfo.label}`,
        timestamp: new Date(),
        user: currentUser?.name || '',
      });
    }

    updateQueryCase(sendToId, {
      status: 'Resolved',
      logs: [...(qc.logs || []), { id: crypto.randomUUID(), caseId: '', event: `Sent to ${stepInfo.label}`, timestamp: new Date(), user: currentUser?.name || '' }],
    });

    setSendToId(null);
    setSendToStep('');
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Query Cases</h2>
            <PageTip content="Track cases that need queries. Resolve and optionally send resolved cases to a specific bench step." />
          </div>
          {canAdd && <Button onClick={() => setShowAdd(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Query Case
          </Button>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search lab number or name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="lab">Lab Number</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lab Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">R.D.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MLS</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{q.labNumber}</td>
                  <td className="px-4 py-3">{q.patientName}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{q.residentDoctorInitials || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{q.mlsInitials || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={q.status === 'Open' ? 'destructive' : 'secondary'}>{q.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {q.status === 'Open' && (
                        <Button size="sm" variant="outline" onClick={() => handleResolve(q.id)}>Resolve</Button>
                      )}
                      {q.status === 'Resolved' && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSendToId(q.id); setSendToStep(''); }}>
                          <SendHorizontal className="h-3 w-3" /> Send To
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No query cases</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Query Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">New Query Case</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Laboratory Number *</p>
                <Input value={labNumber} onChange={e => setLabNumber(e.target.value)} placeholder="e.g. H1234/26" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Patient Name *</p>
                <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Surname, First Name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium mb-1">Resident Doctor</p>
                  <Select value={rdInitials} onValueChange={v => {
                    setRdInitials(v);
                    const p = settings.variables.residentDoctors.find(d => d.initials === v);
                    setRdName(p?.name || '');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select R.D." /></SelectTrigger>
                    <SelectContent>
                      {settings.variables.residentDoctors.map(d => <SelectItem key={d.id} value={d.initials}>{d.name} ({d.initials})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Medical Laboratory Scientist</p>
                  <Select value={mlsInitials} onValueChange={v => {
                    setMlsInitials(v);
                    const p = settings.variables.mlsOnCall.find(d => d.initials === v);
                    setMlsName(p?.name || '');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select MLS" /></SelectTrigger>
                    <SelectContent>
                      {settings.variables.mlsOnCall.map(d => <SelectItem key={d.id} value={d.initials}>{d.name} ({d.initials})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddQuery} disabled={!labNumber.trim() || !patientName.trim()}>Create Query</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send To Dialog */}
        <Dialog open={!!sendToId} onOpenChange={o => { if (!o) setSendToId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Send Case To</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Send the resolved query case to a bench flow step.</p>
            <Select value={sendToStep} onValueChange={setSendToStep}>
              <SelectTrigger><SelectValue placeholder="Select destination step" /></SelectTrigger>
              <SelectContent>
                {sendToSteps.map(s => <SelectItem key={s.step} value={s.step}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendToId(null)}>Cancel</Button>
              <Button onClick={handleSendTo} disabled={!sendToStep}>Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default QueryPage;
