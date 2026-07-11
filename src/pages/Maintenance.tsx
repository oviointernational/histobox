import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Wrench } from 'lucide-react';
import PageTip from '@/components/PageTip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Equipment } from '@/types';
import { cn } from '@/lib/utils';

const Maintenance = () => {
  const navigate = useNavigate();
  const { equipment, addEquipment, updateEquipment, settings, currentUser, hasPermission } = useStore();
  const canAdd = hasPermission('add_maintenance');
  const canEdit = hasPermission('edit_maintenance');
  const canDelete = hasPermission('delete_maintenance');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [commissioned, setCommissioned] = useState(true);

  const filtered = useMemo(() => {
    let result = [...equipment].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(s));
    }
    return result;
  }, [equipment, search]);

  const handleAdd = () => {
    if (!name.trim() || !templateId) return;
    const eq: Equipment = {
      id: crypto.randomUUID(),
      name, imageUrl: undefined, commissioned, templateId,
      maintenanceLogs: [], createdAt: new Date(), updatedAt: new Date(),
    };
    addEquipment(eq);
    setShowAdd(false);
    setName(''); setTemplateId(''); setCommissioned(true);
  };

  const toggleCommission = (id: string, value: boolean) => {
    updateEquipment(id, { commissioned: value });
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Maintenance</h2>
            <PageTip content="Manage laboratory equipment and maintenance schedules. Add equipment, assign templates with checklists, and log regular maintenance activities." />
          </div>
          {canAdd && <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Add Equipment</Button>}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search equipment..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No equipment added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(eq => {
              const template = settings.variables.maintenanceTemplates.find(t => t.id === eq.templateId);
              return (
                <div
                  key={eq.id}
                  className={cn(
                    'relative bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-all group',
                    !eq.commissioned && 'opacity-60'
                  )}
                  onClick={() => navigate(`/maintenance/${eq.id}`)}
                >
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center">
                    <Wrench className="h-12 w-12 text-primary/40" />
                  </div>
                  <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-[10px] text-muted-foreground">{eq.commissioned ? 'Active' : 'Decom.'}</span>
                      <Switch checked={eq.commissioned} onCheckedChange={v => toggleCommission(eq.id, v)} className="scale-75" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-sm truncate">{eq.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{template?.name || 'Unknown template'}</p>
                    <p className="text-xs text-muted-foreground">{eq.maintenanceLogs.length} log(s)</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Equipment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Equipment name" /></div>
              <div>
                <Label>Template *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose template" /></SelectTrigger>
                  <SelectContent>
                    {settings.variables.maintenanceTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Label>Commissioned</Label>
                <Switch checked={commissioned} onCheckedChange={setCommissioned} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!name.trim() || !templateId}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Maintenance;
