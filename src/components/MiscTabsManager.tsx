import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, X, Edit2, Trash2, GripVertical } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { MiscTab, MiscFieldDef, MiscFieldType, MiscLog } from '@/types/misc';
import { cn } from '@/lib/utils';

const fieldTypeLabels: Record<MiscFieldType, string> = {
  text: 'Text Input', textarea: 'Text Area', date: 'Date', dropdown: 'Dropdown', number: 'Number',
};

const newLog = (event: string, user: string): MiscLog => ({
  id: crypto.randomUUID(), event, user, timestamp: new Date(),
});

const MiscTabsManager = () => {
  const { currentUser, hasPermission } = useStore();
  const canAdd = hasPermission('add_misc');
  const canEdit = hasPermission('edit_misc');
  const canDelete = hasPermission('delete_misc');
  const userName = currentUser?.name || 'Unknown';
  const tabs: MiscTab[] = (useStore(s => (s as any).miscTabs) || []) as MiscTab[];
  const labels: any[] = (useStore(s => (s as any).miscLabels) || []);
  const items: any[] = (useStore(s => (s as any).miscItems) || []);
  const setTabs = (next: MiscTab[]) => useStore.getState().setMiscTabs(next);
  const setLabels = (next: any[]) => useStore.getState().setMiscLabels(next);
  const setItems = (next: any[]) => useStore.getState().setMiscItems(next);

  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tabName, setTabName] = useState('');
  const [fields, setFields] = useState<MiscFieldDef[]>([]);
  const [subFields, setSubFields] = useState<MiscFieldDef[]>([]);
  const [calculateSubItem, setCalculateSubItem] = useState(true);

  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<MiscFieldType>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [subFieldLabel, setSubFieldLabel] = useState('');
  const [subFieldType, setSubFieldType] = useState<MiscFieldType>('text');
  const [subFieldOptions, setSubFieldOptions] = useState('');
  const [subFieldRequired, setSubFieldRequired] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reset = () => {
    setTabName(''); setFields([]); setSubFields([]); setCalculateSubItem(true);
    setFieldLabel(''); setFieldType('text'); setFieldOptions(''); setFieldRequired(false);
    setSubFieldLabel(''); setSubFieldType('text'); setSubFieldOptions(''); setSubFieldRequired(false);
    setEditingId(null);
  };

  const addField = () => {
    if (!fieldLabel.trim()) return;
    setFields([...fields, {
      id: crypto.randomUUID(), label: fieldLabel.trim(), type: fieldType, required: fieldRequired,
      ...(fieldType === 'dropdown' ? { options: fieldOptions.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    }]);
    setFieldLabel(''); setFieldType('text'); setFieldOptions(''); setFieldRequired(false);
  };
  const addSubField = () => {
    if (!subFieldLabel.trim()) return;
    setSubFields([...subFields, {
      id: crypto.randomUUID(), label: subFieldLabel.trim(), type: subFieldType, required: subFieldRequired,
      ...(subFieldType === 'dropdown' ? { options: subFieldOptions.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    }]);
    setSubFieldLabel(''); setSubFieldType('text'); setSubFieldOptions(''); setSubFieldRequired(false);
  };

  const save = () => {
    if (!tabName.trim() || fields.length === 0) return;
    if (editingId) {
      setTabs(tabs.map(t => t.id === editingId ? {
        ...t, name: tabName.trim(), fields, subFields, calculateSubItem, updatedAt: new Date(),
        logs: [...(t.logs || []), newLog('Tab edited', userName)],
      } : t));
    } else {
      const tab: MiscTab = {
        id: crypto.randomUUID(), name: tabName.trim(), fields, subFields, calculateSubItem,
        createdAt: new Date(), updatedAt: new Date(), createdBy: userName,
        logs: [newLog('Tab created', userName)],
      };
      setTabs([...tabs, tab]);
    }
    setShow(false); reset();
  };

  const startEdit = (t: MiscTab) => {
    setEditingId(t.id); setTabName(t.name);
    setFields([...t.fields]); setSubFields([...(t.subFields || [])]);
    setCalculateSubItem(t.calculateSubItem !== false);
    setShow(true);
  };

  const doDelete = (id: string) => {
    setTabs(tabs.filter(t => t.id !== id));
    setLabels(labels.filter(l => l.tabId !== id));
    setItems(items.filter(i => i.tabId !== id));
  };

  const renderFieldList = (list: MiscFieldDef[], remove: (id: string) => void) => (
    <>
      {list.map(f => (
        <div key={f.id} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5 text-sm">
          <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-medium flex-1">{f.label}</span>
          <Badge variant="outline" className="text-[10px]">{fieldTypeLabels[f.type]}</Badge>
          {f.required && <Badge className="text-[10px]">Req</Badge>}
          <button onClick={() => remove(f.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
        </div>
      ))}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold">Misc Tabs</h3>
            <p className="text-sm text-muted-foreground">Create and manage Misc tabs (form templates) used across the Misc page.</p>
          </div>
          {canAdd && <Button onClick={() => { reset(); setShow(true); }}><Plus className="h-4 w-4 mr-1" /> Add Tab</Button>}
        </div>
      </div>

      {tabs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tabs configured.</p>}
      {tabs.map(t => (
        <div key={t.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-2 shadow-sm">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{t.name}</h4>
            <p className="text-xs text-muted-foreground">
              {t.fields.length} field(s), {t.subFields?.length || 0} sub-key(s) ·{' '}
              {t.calculateSubItem !== false ? 'Numeric (auto-sum)' : 'Manual total'}
            </p>
          </div>
          {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(t)}><Edit2 className="h-3 w-3" /></Button>}
          {canDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3 w-3" /></Button>}
        </div>
      ))}

      <Dialog open={show} onOpenChange={o => { if (!o) { setShow(false); reset(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Tab' : 'Create Tab'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tab Name *</Label>
              <Input value={tabName} onChange={e => setTabName(e.target.value)} placeholder="e.g. Equipment Log" className="mt-1" />
            </div>
            <label className="flex items-start gap-2 bg-muted/50 rounded-lg p-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={calculateSubItem} onChange={e => setCalculateSubItem(e.target.checked)} />
              <div className="text-xs">
                <p className="font-medium">Calculate Sub-Item</p>
                <p className="text-muted-foreground">If checked, sub-item values must be numeric and are summed. Otherwise the Total is entered manually.</p>
              </div>
            </label>

            <div className="space-y-2">
              <Label>Item Fields ({fields.length})</Label>
              {renderFieldList(fields, id => setFields(fields.filter(f => f.id !== id)))}
            </div>
            <div className="border border-dashed rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add Item Field</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Label *" value={fieldLabel} onChange={e => setFieldLabel(e.target.value)} />
                <Select value={fieldType} onValueChange={v => setFieldType(v as MiscFieldType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(fieldTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {fieldType === 'dropdown' && <Input placeholder="Options (comma-separated)" value={fieldOptions} onChange={e => setFieldOptions(e.target.value)} />}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={fieldRequired} onChange={e => setFieldRequired(e.target.checked)} />Required
                </label>
                <Button size="sm" onClick={addField} disabled={!fieldLabel.trim()}><Plus className="h-3 w-3 mr-1" />Add Field</Button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Sub-Item Keys (optional dropdown)</Label>
              {renderFieldList(subFields, id => setSubFields(subFields.filter(f => f.id !== id)))}
            </div>
            <div className="border border-dashed rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add Sub-Item Key</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Label *" value={subFieldLabel} onChange={e => setSubFieldLabel(e.target.value)} />
                <Select value={subFieldType} onValueChange={v => setSubFieldType(v as MiscFieldType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(fieldTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {subFieldType === 'dropdown' && <Input placeholder="Options (comma-separated)" value={subFieldOptions} onChange={e => setSubFieldOptions(e.target.value)} />}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={subFieldRequired} onChange={e => setSubFieldRequired(e.target.checked)} />Required
                </label>
                <Button size="sm" onClick={addSubField} disabled={!subFieldLabel.trim()}><Plus className="h-3 w-3 mr-1" />Add Sub-Key</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShow(false); reset(); }}>Cancel</Button>
            <Button onClick={save} disabled={!tabName.trim() || fields.length === 0}>{editingId ? 'Save Changes' : 'Create Tab'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={o => { if (!o) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) doDelete(deleteId); setDeleteId(null); }}
      />
    </div>
  );
};

export default MiscTabsManager;