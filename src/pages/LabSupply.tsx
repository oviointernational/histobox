import { useState, useMemo } from 'react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowLeft, Package, ArrowDownToLine, ArrowUpFromLine, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { LabSupply, LabSupplyEntry } from '@/types/labsupply';
import PageTip from '@/components/PageTip';

const LabSupplyPage = () => {
  const { settings, labSupplies: supplies, setLabSupplies: setSupplies, hasPermission } = useStore();
  const canAdd = hasPermission('add_lab_supply');
  const canEdit = hasPermission('edit_lab_supply');
  const canDelete = hasPermission('delete_lab_supply');
  const supplyParams = (settings.variables as any).labSupplyParams || [];
  const storageUnits = (settings.variables as any).storageUnits || [];

  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addSupplyOpen, setAddSupplyOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [newSupplyName, setNewSupplyName] = useState('');
  const [newSupplyUnit, setNewSupplyUnit] = useState('units');
  const [newStoreLocation, setNewStoreLocation] = useState('');
  const [entryQty, setEntryQty] = useState('');
  const [entryParams, setEntryParams] = useState<{ key: string; value: string }[]>([]);
  const [dispenseQty, setDispenseQty] = useState('');
  const [dispenseParams, setDispenseParams] = useState<{ key: string; value: string }[]>([]);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedSupply = supplies.find(s => s.id === selectedSupplyId) || null;

  const filteredSupplies = useMemo(() => {
    if (!searchTerm.trim()) return supplies;
    const q = searchTerm.toLowerCase();
    return supplies.filter(s => s.name.toLowerCase().includes(q) || (s.storeLocation || '').toLowerCase().includes(q));
  }, [supplies, searchTerm]);

  const addParamRow = (setter: React.Dispatch<React.SetStateAction<{ key: string; value: string }[]>>) =>
    setter(prev => [...prev, { key: '', value: '' }]);

  const getTotals = (supply: LabSupply) => {
    let totalIn = 0, totalOut = 0;
    supply.entries.forEach(e => {
      if (e.type === 'input') totalIn += e.quantity;
      else totalOut += e.quantity;
    });
    return { totalIn, totalOut, remaining: totalIn - totalOut };
  };

  const saveEntry = () => {
    if (!selectedSupply || !entryQty) return;
    const params: Record<string, string> = {};
    entryParams.forEach(p => { if (p.key) params[p.key] = p.value; });
    const entry: LabSupplyEntry = {
      id: crypto.randomUUID(), supplyId: selectedSupply.id, type: 'input',
      quantity: parseFloat(entryQty) || 0, parameters: params, createdAt: new Date(),
    };
    setSupplies(supplies.map(s => s.id === selectedSupply.id
      ? { ...s, entries: [entry, ...s.entries], updatedAt: new Date() } : s));
    setEntryQty(''); setEntryParams([]); setAddEntryOpen(false);
  };

  const saveDispense = () => {
    if (!selectedSupply || !dispenseQty) return;
    const params: Record<string, string> = {};
    dispenseParams.forEach(p => { if (p.key) params[p.key] = p.value; });
    const entry: LabSupplyEntry = {
      id: crypto.randomUUID(), supplyId: selectedSupply.id, type: 'output',
      quantity: parseFloat(dispenseQty) || 0, parameters: params, createdAt: new Date(),
    };
    setSupplies(supplies.map(s => s.id === selectedSupply.id
      ? { ...s, entries: [entry, ...s.entries], updatedAt: new Date() } : s));
    setDispenseQty(''); setDispenseParams([]); setDispenseOpen(false);
  };

  const deleteEntry = (entryId: string) => {
    if (!selectedSupply) return;
    setSupplies(supplies.map(s => s.id === selectedSupply.id
      ? { ...s, entries: s.entries.filter(e => e.id !== entryId), updatedAt: new Date() } : s));
  };

  const addNewSupply = () => {
    if (!newSupplyName.trim()) return;
    const s: LabSupply = {
      id: crypto.randomUUID(), name: newSupplyName.trim(), unit: newSupplyUnit || 'units',
      storeLocation: newStoreLocation.trim() || undefined,
      entries: [], createdAt: new Date(), updatedAt: new Date(),
    };
    setSupplies([...supplies, s]);
    setNewSupplyName(''); setNewSupplyUnit('units'); setNewStoreLocation(''); setAddSupplyOpen(false);
  };

  const removeSupply = (id: string) => {
    setSupplies(supplies.filter(s => s.id !== id));
    if (selectedSupplyId === id) setSelectedSupplyId(null);
  };

  const renderParamForm = (params: { key: string; value: string }[], setParams: React.Dispatch<React.SetStateAction<{ key: string; value: string }[]>>) => (
    <>
      {params.map((p, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Parameter</Label>
            <Select value={p.key} onValueChange={v => setParams(prev => prev.map((pp, ii) => ii === i ? { ...pp, key: v } : pp))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{supplyParams.map((sp: string) => <SelectItem key={sp} value={sp}>{sp}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Value</Label>
            <Input value={p.value} onChange={e => setParams(prev => prev.map((pp, ii) => ii === i ? { ...pp, value: e.target.value } : pp))} />
          </div>
          <Button size="icon" variant="ghost" onClick={() => setParams(prev => prev.filter((_, ii) => ii !== i))}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={() => addParamRow(setParams)} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Parameter</Button>
    </>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Lab Inventory</h2>
          <PageTip content="Track laboratory supplies with input (received) and output (dispensed). The gauge shows remaining stock. Add storage locations to track where items are stored." />
        </div>

        {!selectedSupply ? (
          <>
            <div className="flex flex-wrap gap-2">
              {canAdd && <Dialog open={addSupplyOpen} onOpenChange={setAddSupplyOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Supply</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Supply Type</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Supply Name</Label><Input value={newSupplyName} onChange={e => setNewSupplyName(e.target.value)} placeholder="e.g. Formalin" /></div>
                    <div><Label>Unit</Label><Input value={newSupplyUnit} onChange={e => setNewSupplyUnit(e.target.value)} placeholder="e.g. litres, pieces, kg" /></div>
                    <div>
                      <Label>Store Location</Label>
                      {storageUnits.length > 0 ? (
                        <Select value={newStoreLocation} onValueChange={setNewStoreLocation}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                          <SelectContent>
                            {storageUnits.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={newStoreLocation} onChange={e => setNewStoreLocation(e.target.value)} placeholder="e.g. Cabinet A, Shelf 2" className="mt-1" />
                      )}
                    </div>
                    <Button onClick={addNewSupply} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search supplies..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            {filteredSupplies.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{supplies.length === 0 ? 'No supplies. Add one above.' : 'No results found.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredSupplies.map(s => {
                  const { totalIn, remaining } = getTotals(s);
                  const pct = totalIn > 0 ? (remaining / totalIn) * 100 : 0;
                  return (
                    <div key={s.id} className="relative rounded-xl p-5 cursor-pointer bg-card border shadow-sm hover:shadow-md transition-all text-center"
                      onClick={() => setSelectedSupplyId(s.id)}>
                      <p className="font-semibold text-foreground">{s.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{remaining} / {totalIn} {s.unit}</p>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.max(0, Math.min(100, pct))}%`,
                          background: pct > 25 ? 'hsl(120,60%,45%)' : pct > 10 ? 'hsl(45,90%,50%)' : 'hsl(0,70%,50%)',
                        }} />
                      </div>
                      {s.storeLocation && (
                        <p className="text-xs font-bold text-primary mt-2">{s.storeLocation}</p>
                      )}
                      {canDelete && <button className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        onClick={e => { e.stopPropagation(); removeSupply(s.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </button>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSupplyId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h3 className="text-xl font-display font-bold">{selectedSupply.name}</h3>
              {selectedSupply.storeLocation && (
                <span className="text-sm font-bold text-primary">📍 {selectedSupply.storeLocation}</span>
              )}
            </div>

            {(() => {
              const { totalIn, totalOut, remaining } = getTotals(selectedSupply);
              const pct = totalIn > 0 ? (remaining / totalIn) * 100 : 0;
              return (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total In</p>
                        <p className="text-2xl font-bold text-[hsl(120,60%,35%)]">{totalIn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Out</p>
                        <p className="text-2xl font-bold text-[hsl(0,70%,50%)]">{totalOut}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="text-2xl font-bold">{remaining} {selectedSupply.unit}</p>
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
              );
            })()}

            <div className="flex gap-2">
              <Dialog open={addEntryOpen} onOpenChange={(o) => { setAddEntryOpen(o); if (!o) setEntryParams([]); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><ArrowDownToLine className="h-3 w-3 mr-1" /> Add Stock (Input)</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Stock — {selectedSupply.name}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Quantity ({selectedSupply.unit})</Label><Input type="number" value={entryQty} onChange={e => setEntryQty(e.target.value)} /></div>
                    {renderParamForm(entryParams, setEntryParams)}
                    <Button onClick={saveEntry} className="w-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dispenseOpen} onOpenChange={(o) => { setDispenseOpen(o); if (!o) setDispenseParams([]); }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><ArrowUpFromLine className="h-3 w-3 mr-1" /> Dispense (Output)</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Dispense — {selectedSupply.name}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Quantity ({selectedSupply.unit})</Label><Input type="number" value={dispenseQty} onChange={e => setDispenseQty(e.target.value)} /></div>
                    {renderParamForm(dispenseParams, setDispenseParams)}
                    <Button onClick={saveDispense} className="w-full">Dispense</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {selectedSupply.entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {selectedSupply.entries.map(e => (
                  <Card key={e.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {e.type === 'input' ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[hsl(120,60%,90%)] text-[hsl(120,60%,30%)]">+ IN</span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[hsl(0,70%,93%)] text-[hsl(0,70%,40%)]">− OUT</span>
                          )}
                          <span className="font-semibold">{e.quantity} {selectedSupply.unit}</span>
                          <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                        </div>
                        {Object.keys(e.parameters).length > 0 && (
                          <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                            {Object.entries(e.parameters).map(([k, v]) => (
                              <div key={k}><span>{k}:</span> {String(v)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteAction(() => () => deleteEntry(e.id))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        <DeleteConfirmDialog open={!!deleteAction} onOpenChange={o => { if (!o) setDeleteAction(null); }} onConfirm={() => { deleteAction?.(); setDeleteAction(null); }} />
      </div>
    </Layout>
  );
};

export default LabSupplyPage;
