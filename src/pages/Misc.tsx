import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Edit2, ArrowLeft, GripVertical, X, ChevronDown, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import { FileDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { MiscTab, MiscFieldDef, MiscFieldType, MiscItem, MiscSubItem, MiscLabel, MiscLog, MiscComment } from '@/types/misc';
import { cn } from '@/lib/utils';
import PageTip from '@/components/PageTip';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const fieldTypeLabels: Record<MiscFieldType, string> = {
  text: 'Text Input',
  textarea: 'Text Area',
  date: 'Date',
  dropdown: 'Dropdown',
  number: 'Number',
};

const newLog = (event: string, user: string, details?: string): MiscLog => ({
  id: crypto.randomUUID(), event, user, timestamp: new Date(), details,
});

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString();
const fmtDateTime = (d: Date | string) => new Date(d).toLocaleString();

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function exportItemPdf(item: MiscItem, tab: MiscTab, calc: boolean, subtotal: number) {
  const titleParts = tab.fields.map(f => item.values[f.id] || '').filter(Boolean).slice(0, 2).join(' — ') || 'Item';
  const fieldRows = tab.fields.map(f =>
    `<tr><td class="k">${escapeHtml(f.label)}</td><td>${escapeHtml(item.values[f.id] || '—')}</td></tr>`
  ).join('');
  const subRows = item.subItems.map((s, i) => {
    const k = s.values.key || '';
    const v = s.values.value || '';
    return `<tr><td>${i + 1}</td><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(v) || '—'}</td></tr>`;
  }).join('');
  const totalsBlock = item.subItems.length === 0 ? '' : calc
    ? `<div class="totals"><div><span>Subtotal</span><b>${subtotal.toLocaleString()}</b></div><div class="grand"><span>Total</span><b>${subtotal.toLocaleString()}</b></div></div>`
    : `<div class="totals"><div class="grand"><span>Total</span><b>${escapeHtml(item.manualTotal || '—')}</b></div></div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(titleParts)}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;padding:32px;max-width:800px;margin:0 auto}
      h1{font-size:20px;margin:0 0 4px} .meta{color:#666;font-size:12px;margin-bottom:20px}
      h2{font-size:14px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      td,th{border:1px solid #e5e5e5;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f5f5f5;font-weight:600} td.k{background:#fafafa;width:35%;font-weight:600}
      td.num{text-align:right;font-family:ui-monospace,Menlo,monospace}
      .totals{margin-top:12px;border-top:2px solid #333;padding-top:8px;font-size:13px}
      .totals>div{display:flex;justify-content:space-between;padding:4px 0}
      .totals .grand{font-size:16px;font-weight:700;border-top:1px dashed #999;margin-top:4px;padding-top:6px}
      @media print{body{padding:0}}
    </style></head><body>
    <h1>${escapeHtml(tab.name)} — ${escapeHtml(titleParts)}</h1>
    <div class="meta">Created ${escapeHtml(fmtDateTime(item.createdAt))} by ${escapeHtml(item.createdBy || '—')}</div>
    <h2>Details</h2><table><tbody>${fieldRows}</tbody></table>
    <h2>Sub-Items (${item.subItems.length})</h2>
    ${item.subItems.length === 0
      ? '<p style="color:#888;font-size:12px">No sub-items.</p>'
      : `<table><thead><tr><th style="width:40px">#</th><th>Key</th><th class="num">Value</th></tr></thead><tbody>${subRows}</tbody></table>${totalsBlock}`}
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
}

const MiscPage = () => {
  const { currentUser, hasPermission } = useStore();
  const userName = currentUser?.name || 'Unknown';
  const canAdd = hasPermission('add_misc');
  const canEdit = hasPermission('edit_misc');
  const canDelete = hasPermission('delete_misc');
  const canAddLabel = hasPermission('add_misc_label');
  const canEditLabel = hasPermission('edit_misc_label');
  const canDeleteLabel = hasPermission('delete_misc_label');
  const canAddSubItem = hasPermission('add_misc_subitem');
  const canEditSubItem = hasPermission('edit_misc_subitem');
  const canDeleteSubItem = hasPermission('delete_misc_subitem');
  const [tabs, setTabs] = usePersistedMisc();
  const [labels, setLabels] = usePersistedLabels();
  const [items, setItems] = usePersistedMiscItems();

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tabName, setTabName] = useState('');
  const [fields, setFields] = useState<MiscFieldDef[]>([]);
  const [subFields, setSubFields] = useState<MiscFieldDef[]>([]);
  const [calculateSubItem, setCalculateSubItem] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragSection, setDragSection] = useState<'fields' | 'subFields'>('fields');

  // Field builders
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<MiscFieldType>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [subFieldLabel, setSubFieldLabel] = useState('');
  const [subFieldType, setSubFieldType] = useState<MiscFieldType>('text');
  const [subFieldOptions, setSubFieldOptions] = useState('');
  const [subFieldRequired, setSubFieldRequired] = useState(false);

  // Label dialog
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelName, setLabelName] = useState('');
  const [expandedLabels, setExpandedLabels] = useState<Record<string, boolean>>({});

  // Item dialog
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemLabelId, setAddItemLabelId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemValues, setItemValues] = useState<Record<string, string>>({});
  const [batchCount, setBatchCount] = useState(1);

  // Item detail
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddSubItem, setShowAddSubItem] = useState(false);
  const [subKey, setSubKey] = useState('');
  const [subValue, setSubValue] = useState('');
  const [editingSubItemId, setEditingSubItemId] = useState<string | null>(null);

  const [showLogsFor, setShowLogsFor] = useState<{ kind: 'tab' | 'label' | 'item'; id: string } | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ kind: 'item' | 'subItem'; id: string; parentId?: string } | null>(null);
  const [newComment, setNewComment] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'tab' | 'label' | 'item' | 'subItem'; id: string; parentId?: string } | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeLabels = labels.filter(l => l.tabId === activeTabId);
  const selectedItem = items.find(i => i.id === selectedItemId);

  const addField = () => {
    if (!fieldLabel.trim()) return;
    const f: MiscFieldDef = {
      id: crypto.randomUUID(), label: fieldLabel.trim(), type: fieldType, required: fieldRequired,
      ...(fieldType === 'dropdown' ? { options: fieldOptions.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    };
    setFields([...fields, f]);
    setFieldLabel(''); setFieldType('text'); setFieldOptions(''); setFieldRequired(false);
  };
  const addSubField = () => {
    if (!subFieldLabel.trim()) return;
    const f: MiscFieldDef = {
      id: crypto.randomUUID(), label: subFieldLabel.trim(), type: subFieldType, required: subFieldRequired,
      ...(subFieldType === 'dropdown' ? { options: subFieldOptions.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    };
    setSubFields([...subFields, f]);
    setSubFieldLabel(''); setSubFieldType('text'); setSubFieldOptions(''); setSubFieldRequired(false);
  };

  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));
  const removeSubField = (id: string) => setSubFields(subFields.filter(f => f.id !== id));

  const handleDragStart = (idx: number, section: 'fields' | 'subFields') => { setDragIdx(idx); setDragSection(section); };
  const handleDragOver = (e: React.DragEvent, idx: number, section: 'fields' | 'subFields') => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx || dragSection !== section) return;
    const arr = section === 'fields' ? [...fields] : [...subFields];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, moved);
    if (section === 'fields') setFields(arr); else setSubFields(arr);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const saveTab = () => {
    if (!tabName.trim() || fields.length === 0) return;
    if (editingTabId) {
      setTabs(tabs.map(t => t.id === editingTabId ? {
        ...t, name: tabName.trim(), fields, subFields, calculateSubItem, updatedAt: new Date(),
        logs: [...(t.logs || []), newLog('Tab edited', userName)],
      } : t));
    } else {
      const newTab: MiscTab = {
        id: crypto.randomUUID(), name: tabName.trim(), fields, subFields, calculateSubItem,
        createdAt: new Date(), updatedAt: new Date(), createdBy: userName,
        logs: [newLog('Tab created', userName)],
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
    setShowCreateTab(false); setEditingTabId(null); setTabName(''); setFields([]); setSubFields([]); setCalculateSubItem(true);
  };

  const deleteTab = (id: string) => {
    setTabs(tabs.filter(t => t.id !== id));
    setLabels(labels.filter(l => l.tabId !== id));
    setItems(items.filter(i => i.tabId !== id));
    if (activeTabId === id) setActiveTabId(tabs.find(t => t.id !== id)?.id || null);
  };
  const startEditTab = (tab: MiscTab) => {
    setEditingTabId(tab.id); setTabName(tab.name);
    setFields([...tab.fields]); setSubFields([...(tab.subFields || [])]);
    setCalculateSubItem(tab.calculateSubItem !== false);
    setShowCreateTab(true);
  };

  // Labels
  const saveLabel = () => {
    if (!activeTabId || !labelName.trim()) return;
    if (editingLabelId) {
      setLabels(labels.map(l => l.id === editingLabelId ? {
        ...l, name: labelName.trim(), updatedAt: new Date(),
        logs: [...(l.logs || []), newLog('Label renamed', userName)],
      } : l));
    } else {
      const newLabel: MiscLabel = {
        id: crypto.randomUUID(), tabId: activeTabId, name: labelName.trim(),
        createdAt: new Date(), updatedAt: new Date(), createdBy: userName,
        logs: [newLog('Label created', userName)],
      };
      setLabels([...labels, newLabel]);
      setExpandedLabels(prev => ({ ...prev, [newLabel.id]: true }));
    }
    setShowLabelDialog(false); setEditingLabelId(null); setLabelName('');
  };
  const deleteLabel = (id: string) => {
    setLabels(labels.filter(l => l.id !== id));
    setItems(items.filter(i => i.labelId !== id));
  };
  const startEditLabel = (l: MiscLabel) => { setEditingLabelId(l.id); setLabelName(l.name); setShowLabelDialog(true); };

  // Items
  const saveItem = () => {
    if (!activeTabId || !addItemLabelId) return;
    if (editingItemId) {
      setItems(items.map(i => i.id === editingItemId ? {
        ...i, values: { ...itemValues }, updatedAt: new Date(),
        logs: [...(i.logs || []), newLog('Item edited', userName)],
      } : i));
      setEditingItemId(null);
    } else {
      const created: MiscItem[] = [];
      for (let b = 0; b < batchCount; b++) {
        created.push({
          id: crypto.randomUUID(), tabId: activeTabId, labelId: addItemLabelId,
          values: { ...itemValues }, subItems: [],
          createdAt: new Date(), updatedAt: new Date(), createdBy: userName,
          logs: [newLog('Item created', userName)],
        });
      }
      setItems([...items, ...created]);
    }
    setShowAddItem(false); setItemValues({}); setBatchCount(1); setAddItemLabelId(null);
  };
  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };
  const startEditItem = (item: MiscItem) => {
    setEditingItemId(item.id); setItemValues({ ...item.values });
    setAddItemLabelId(item.labelId || null); setShowAddItem(true);
  };

  // Sub-items (key/value)
  const saveSubItem = () => {
    if (!selectedItemId || !subKey.trim()) return;
    if (editingSubItemId) {
      setItems(items.map(i => i.id === selectedItemId ? {
        ...i,
        subItems: i.subItems.map(s => s.id === editingSubItemId ? { ...s, values: { key: subKey.trim(), value: subValue } } : s),
        logs: [...(i.logs || []), newLog('Sub-item edited', userName, subKey.trim())],
      } : i));
      setEditingSubItemId(null);
    } else {
      const sub: MiscSubItem = {
        id: crypto.randomUUID(), values: { key: subKey.trim(), value: subValue },
        createdAt: new Date(), createdBy: userName,
      };
      setItems(items.map(i => i.id === selectedItemId ? {
        ...i, subItems: [...i.subItems, sub],
        logs: [...(i.logs || []), newLog('Sub-item added', userName, subKey.trim())],
      } : i));
    }
    setShowAddSubItem(false); setSubKey(''); setSubValue('');
  };
  const deleteSubItem = (itemId: string, subId: string) => {
    setItems(items.map(i => i.id === itemId ? {
      ...i, subItems: i.subItems.filter(s => s.id !== subId),
      logs: [...(i.logs || []), newLog('Sub-item removed', userName)],
    } : i));
  };

  const renderFieldInput = (field: MiscFieldDef, values: Record<string, string>, setValues: (v: Record<string, string>) => void) => {
    const val = values[field.id] || '';
    switch (field.type) {
      case 'textarea': return <Textarea value={val} onChange={e => setValues({ ...values, [field.id]: e.target.value })} rows={2} className="mt-1" />;
      case 'date': return <Input type="date" value={val} onChange={e => setValues({ ...values, [field.id]: e.target.value })} className="mt-1" />;
      case 'number': return <Input type="number" value={val} onChange={e => setValues({ ...values, [field.id]: e.target.value })} className="mt-1" />;
      case 'dropdown': return (
        <Select value={val} onValueChange={v => setValues({ ...values, [field.id]: v })}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>{(field.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
      default: return <Input value={val} onChange={e => setValues({ ...values, [field.id]: e.target.value })} className="mt-1" />;
    }
  };

  const renderFieldList = (list: MiscFieldDef[], section: 'fields' | 'subFields', removeFn: (id: string) => void) => (
    <>
      {list.map((f, idx) => (
        <div key={f.id} draggable
          onDragStart={() => handleDragStart(idx, section)}
          onDragOver={e => handleDragOver(e, idx, section)}
          onDragEnd={handleDragEnd}
          className={cn('flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5 text-sm cursor-move', dragIdx === idx && dragSection === section && 'opacity-50')}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="font-medium flex-1">{f.label}</span>
          <Badge variant="outline" className="text-[10px]">{fieldTypeLabels[f.type]}</Badge>
          {f.required && <Badge className="text-[10px]">Req</Badge>}
          <button onClick={() => removeFn(f.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
        </div>
      ))}
    </>
  );

  // ===== ITEM DETAIL VIEW =====
  if (selectedItem && activeTab) {
    const calc = activeTab.calculateSubItem !== false;
    const subtotal = selectedItem.subItems.reduce((sum, s) => {
      const n = parseFloat(s.values.value || '');
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    const total = subtotal;
    const titleParts = activeTab.fields.map(f => selectedItem.values[f.id] || '').filter(Boolean).slice(0, 2).join(' — ') || 'Item';
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedItemId(null)}><ArrowLeft className="h-4 w-4" /></Button>
            <h2 className="text-xl font-display font-bold flex-1 truncate">{titleParts}</h2>
            <Button variant="outline" size="sm" onClick={() => exportItemPdf(selectedItem, activeTab, calc, subtotal)}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="relative" onClick={() => { setCommentTarget({ kind: 'item', id: selectedItem.id }); setNewComment(''); }}>
              <MessageSquare className="h-4 w-4 mr-1" /> Comments
              {selectedItem.comments && selectedItem.comments.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{selectedItem.comments.length}</span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowLogsFor({ kind: 'item', id: selectedItem.id })}>
              <FileText className="h-4 w-4 mr-1" /> Log
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              {activeTab.fields.map(f => (
                <div key={f.id}>
                  <Label className="text-muted-foreground text-xs">{f.label}</Label>
                  <p className="text-sm font-medium">{selectedItem.values[f.id] || '—'}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
              Created {fmtDateTime(selectedItem.createdAt)} by {selectedItem.createdBy || '—'}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Sub-Items ({selectedItem.subItems.length})</h3>
              <Button size="sm" onClick={() => { setShowAddSubItem(true); setEditingSubItemId(null); setSubKey(''); setSubValue(''); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {selectedItem.subItems.length === 0 && <p className="text-xs text-muted-foreground">No sub-items yet.</p>}
            <div className="space-y-1.5">
              {selectedItem.subItems.map((sub, idx) => {
                const k = sub.values.key || '';
                const v = sub.values.value || '';
                const num = parseFloat(v);
                return (
                  <div key={sub.id} className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}.</span>
                    <span className="flex-1 text-sm font-medium truncate">{k}</span>
                    <span className="text-sm font-mono">{v || '—'}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(sub.createdAt)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 relative" onClick={() => { setCommentTarget({ kind: 'subItem', id: sub.id, parentId: selectedItem.id }); setNewComment(''); }}>
                      <MessageSquare className="h-3 w-3" />
                      {sub.comments && sub.comments.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 w-3.5 flex items-center justify-center">{sub.comments.length}</span>
                      )}
                    </Button>
                    {canEditSubItem && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      setEditingSubItemId(sub.id); setSubKey(k); setSubValue(v); setShowAddSubItem(true);
                    }}><Edit2 className="h-3 w-3" /></Button>}
                    {canDeleteSubItem && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget({ type: 'subItem', id: sub.id, parentId: selectedItem.id })}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                );
              })}
            </div>
            {selectedItem.subItems.length > 0 && (
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                {calc ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono font-semibold">{subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-base"><span className="font-semibold">Total</span><span className="font-mono font-bold text-primary">{total.toLocaleString()}</span></div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold whitespace-nowrap">Total</Label>
                    <Input
                      value={selectedItem.manualTotal || ''}
                      onChange={e => {
                        const v = e.target.value;
                        setItems(items.map(i => i.id === selectedItem.id ? { ...i, manualTotal: v, updatedAt: new Date() } : i));
                      }}
                      placeholder="Enter total (any text or number)"
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Dialog open={showAddSubItem} onOpenChange={setShowAddSubItem}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingSubItemId ? 'Edit Sub-Item' : 'Add Sub-Item'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Key *</Label>
                  {(activeTab.subFields && activeTab.subFields.length > 0) ? (
                    <Select value={subKey} onValueChange={setSubKey}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select key" /></SelectTrigger>
                      <SelectContent>
                        {activeTab.subFields.map(sf => <SelectItem key={sf.id} value={sf.label}>{sf.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={subKey} onChange={e => setSubKey(e.target.value)} placeholder="e.g. Item name" className="mt-1" />
                  )}
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type={calc ? 'number' : 'text'}
                    value={subValue}
                    onChange={e => setSubValue(e.target.value)}
                    placeholder={calc ? '0' : 'Any value'}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {calc
                  ? 'Numeric values are summed into the subtotal/total.'
                  : 'Values can be any text. Total is entered manually.'}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddSubItem(false)}>Cancel</Button>
                <Button onClick={saveSubItem} disabled={!subKey.trim()}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Logs dialog */}
          <LogsDialog open={!!showLogsFor} onClose={() => setShowLogsFor(null)} logs={
            showLogsFor?.kind === 'item' ? (selectedItem.logs || []) : []
          } title="Item Activity Log" />

          <CommentsDialog
            open={!!commentTarget}
            onClose={() => setCommentTarget(null)}
            comments={
              commentTarget?.kind === 'item'
                ? (selectedItem.comments || [])
                : (selectedItem.subItems.find(s => s.id === commentTarget?.id)?.comments || [])
            }
            newComment={newComment}
            setNewComment={setNewComment}
            onAdd={() => {
              if (!commentTarget || !newComment.trim()) return;
              const c: MiscComment = { id: crypto.randomUUID(), text: newComment.trim(), user: userName, timestamp: new Date() };
              if (commentTarget.kind === 'item') {
                setItems(items.map(i => i.id === commentTarget.id ? { ...i, comments: [...(i.comments || []), c] } : i));
              } else {
                setItems(items.map(i => i.id === commentTarget.parentId ? {
                  ...i, subItems: i.subItems.map(s => s.id === commentTarget.id ? { ...s, comments: [...(s.comments || []), c] } : s),
                } : i));
              }
              setNewComment('');
            }}
          />

          <DeleteConfirmDialog
            open={!!deleteTarget}
            onOpenChange={open => { if (!open) setDeleteTarget(null); }}
            onConfirm={() => {
              if (deleteTarget?.type === 'subItem' && deleteTarget.parentId) deleteSubItem(deleteTarget.parentId, deleteTarget.id);
              setDeleteTarget(null);
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold">Misc</h2>
            <PageTip content="Tabs are managed in Settings → Misc Tabs. Here, add labels (groupings) under each tab, then add items under each label. Each item/sub-item tracks date, comments, and a full activity log." />
          </div>
        </div>

        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <div key={t.id} className="flex items-center gap-0.5">
                <Button variant={activeTabId === t.id ? 'default' : 'outline'} size="sm"
                  onClick={() => { setActiveTabId(t.id); setSelectedItemId(null); }}>
                  {t.name}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowLogsFor({ kind: 'tab', id: t.id })} title="Tab log">
                  <FileText className="h-3 w-3" />
                </Button>
                {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditTab(t)}><Edit2 className="h-3 w-3" /></Button>}
                {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'tab', id: t.id })}><Trash2 className="h-3 w-3" /></Button>}
              </div>
            ))}
          </div>
        )}

        {/* Active tab content */}
        {activeTab && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{activeTab.name}</h3>
                <p className="text-[11px] text-muted-foreground">Created {fmtDate(activeTab.createdAt)}{activeTab.createdBy ? ` by ${activeTab.createdBy}` : ''}</p>
              </div>
              {canAddLabel && <Button size="sm" onClick={() => { setShowLabelDialog(true); setEditingLabelId(null); setLabelName(''); }}>
                <Plus className="h-3 w-3 mr-1" /> Add Label
              </Button>}
            </div>

            {activeLabels.length === 0 && <p className="text-sm text-muted-foreground">No labels yet. Click "Add Label" to create one.</p>}

            <div className="space-y-2">
              {activeLabels.map(label => {
                const labelItems = items.filter(i => i.labelId === label.id);
                const isOpen = expandedLabels[label.id] ?? true;
                return (
                  <Collapsible key={label.id} open={isOpen} onOpenChange={(o) => setExpandedLabels(prev => ({ ...prev, [label.id]: o }))}>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center px-3 py-2.5 gap-2">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 flex-1 text-left">
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{label.name}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(label.createdAt)} · {labelItems.length} item(s)</p>
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        {canAdd && <Button size="sm" onClick={() => { setAddItemLabelId(label.id); setShowAddItem(true); setEditingItemId(null); setItemValues({}); setBatchCount(1); }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Item
                        </Button>}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowLogsFor({ kind: 'label', id: label.id })} title="Label log">
                          <FileText className="h-3 w-3" />
                        </Button>
                        {canEditLabel && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditLabel(label)}><Edit2 className="h-3 w-3" /></Button>}
                        {canDeleteLabel && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'label', id: label.id })}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                      <CollapsibleContent>
                        <div className="border-t border-border">
                          {labelItems.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-muted-foreground">No items yet.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50 text-muted-foreground">
                                  <th className="text-left px-4 py-2 font-medium">#</th>
                                  {activeTab.fields.slice(0, 5).map(f => (
                                    <th key={f.id} className="text-left px-4 py-2 font-medium">{f.label}</th>
                                  ))}
                                  <th className="text-left px-4 py-2 font-medium">Date</th>
                                  <th className="text-left px-4 py-2 font-medium">Sub</th>
                                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {labelItems.map((item, idx) => (
                                  <tr key={item.id} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedItemId(item.id)}>
                                    <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                                    {activeTab.fields.slice(0, 5).map(f => (
                                      <td key={f.id} className="px-4 py-2">{item.values[f.id] || '—'}</td>
                                    ))}
                                    <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(item.createdAt)}</td>
                                    <td className="px-4 py-2"><Badge variant="secondary" className="text-[10px]">{item.subItems.length}</Badge></td>
                                    <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                                      {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditItem(item)}><Edit2 className="h-3 w-3" /></Button>}
                                      {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'item', id: item.id })}><Trash2 className="h-3 w-3" /></Button>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}

        {tabs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-3">No Misc tabs yet. Ask an admin to create one in Settings → Misc Tabs.</p>
          </div>
        )}

        {/* Create/Edit Tab Dialog */}
        <Dialog open={showCreateTab} onOpenChange={o => { if (!o) setShowCreateTab(false); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingTabId ? 'Edit Tab' : 'Create Tab'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tab Name *</Label>
                <Input value={tabName} onChange={e => setTabName(e.target.value)} placeholder="e.g. Equipment Log" className="mt-1" />
              </div>

              <label className="flex items-start gap-2 bg-muted/50 rounded-lg p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={calculateSubItem}
                  onChange={e => setCalculateSubItem(e.target.checked)}
                />
                <div className="text-xs">
                  <p className="font-medium text-foreground">Calculate Sub-Item</p>
                  <p className="text-muted-foreground">
                    If checked, sub-item values must be numeric and are summed into a Subtotal/Total.
                    If unchecked, values can be any text and the Total is entered manually.
                  </p>
                </div>
              </label>

              <div className="space-y-2">
                <Label className="text-primary">Item Fields ({fields.length})</Label>
                <p className="text-xs text-muted-foreground">These fields define the main item form.</p>
                {renderFieldList(fields, 'fields', removeField)}
              </div>

              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Add Item Field</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Label *" value={fieldLabel} onChange={e => setFieldLabel(e.target.value)} />
                  <Select value={fieldType} onValueChange={v => setFieldType(v as MiscFieldType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(fieldTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {fieldType === 'dropdown' && (
                  <Input placeholder="Options (comma-separated)" value={fieldOptions} onChange={e => setFieldOptions(e.target.value)} />
                )}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={fieldRequired} onChange={e => setFieldRequired(e.target.checked)} />
                    Required
                  </label>
                  <Button size="sm" onClick={addField} disabled={!fieldLabel.trim()}>
                    <Plus className="h-3 w-3 mr-1" /> Add Field
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <Label className="text-primary">Sub-Item Keys (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Define the keys that will appear as a dropdown when adding sub-items. If none are defined, you can type any key freely.
                </p>
                {renderFieldList(subFields, 'subFields', removeSubField)}
              </div>

              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Add Sub-Item Field</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Label *" value={subFieldLabel} onChange={e => setSubFieldLabel(e.target.value)} />
                  <Select value={subFieldType} onValueChange={v => setSubFieldType(v as MiscFieldType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(fieldTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {subFieldType === 'dropdown' && (
                  <Input placeholder="Options (comma-separated)" value={subFieldOptions} onChange={e => setSubFieldOptions(e.target.value)} />
                )}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={subFieldRequired} onChange={e => setSubFieldRequired(e.target.checked)} />
                    Required
                  </label>
                  <Button size="sm" onClick={addSubField} disabled={!subFieldLabel.trim()}>
                    <Plus className="h-3 w-3 mr-1" /> Add Sub-Field
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateTab(false)}>Cancel</Button>
              <Button onClick={saveTab} disabled={!tabName.trim() || fields.length === 0}>
                {editingTabId ? 'Save Changes' : 'Create Tab'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Label dialog */}
        <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingLabelId ? 'Edit Label' : 'Add Label'}</DialogTitle></DialogHeader>
            <div>
              <Label>Label Name *</Label>
              <Input value={labelName} onChange={e => setLabelName(e.target.value)} placeholder="e.g. Week 1 / Vendor A" className="mt-1" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLabelDialog(false)}>Cancel</Button>
              <Button onClick={saveLabel} disabled={!labelName.trim()}>{editingLabelId ? 'Save' : 'Add Label'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Item Dialog */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItemId ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {activeTab?.fields.map(f => (
                <div key={f.id}>
                  <Label>{f.label}{f.required && ' *'}</Label>
                  {renderFieldInput(f, itemValues, setItemValues)}
                </div>
              ))}
              {!editingItemId && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Batch count:</Label>
                  <Input type="number" min={1} max={50} value={batchCount} onChange={e => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-20" />
                  <span className="text-xs text-muted-foreground">Create {batchCount} item(s) at once</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
              <Button onClick={saveItem}>{editingItemId ? 'Save' : `Add ${batchCount > 1 ? `${batchCount} Items` : 'Item'}`}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <LogsDialog
          open={!!showLogsFor && showLogsFor.kind !== 'item'}
          onClose={() => setShowLogsFor(null)}
          logs={
            showLogsFor?.kind === 'tab' ? (tabs.find(t => t.id === showLogsFor.id)?.logs || []) :
            showLogsFor?.kind === 'label' ? (labels.find(l => l.id === showLogsFor.id)?.logs || []) :
            []
          }
          title={showLogsFor?.kind === 'tab' ? 'Tab Activity Log' : 'Label Activity Log'}
        />

        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={open => { if (!open) setDeleteTarget(null); }}
          onConfirm={() => {
            if (!deleteTarget) return;
            if (deleteTarget.type === 'tab') deleteTab(deleteTarget.id);
            else if (deleteTarget.type === 'label') deleteLabel(deleteTarget.id);
            else if (deleteTarget.type === 'item') deleteItem(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </div>
    </Layout>
  );
};

const LogsDialog = ({ open, onClose, logs, title }: { open: boolean; onClose: () => void; logs: MiscLog[]; title: string }) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="divide-y divide-border">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No activity yet.</p>
        ) : (
          [...logs].reverse().map(l => (
            <div key={l.id} className="py-2 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 bg-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{l.event}</p>
                {l.details && <p className="text-xs text-muted-foreground">{l.details}</p>}
                <p className="text-xs text-muted-foreground">{fmtDateTime(l.timestamp)} · {l.user}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </DialogContent>
  </Dialog>
);

const CommentsDialog = ({ open, onClose, comments, newComment, setNewComment, onAdd }: {
  open: boolean; onClose: () => void; comments: MiscComment[];
  newComment: string; setNewComment: (v: string) => void; onAdd: () => void;
}) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Comments ({comments.length})</DialogTitle></DialogHeader>
      <div className="divide-y divide-border max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No comments yet.</p>
        ) : (
          [...comments].reverse().map(c => (
            <div key={c.id} className="py-2">
              <p className="text-sm">{c.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{fmtDateTime(c.timestamp)} · {c.user}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <Input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          onKeyDown={e => { if (e.key === 'Enter') onAdd(); }}
        />
        <Button onClick={onAdd} disabled={!newComment.trim()}>Add</Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Comments cannot be deleted.</p>
    </DialogContent>
  </Dialog>
);

function usePersistedMisc(): [MiscTab[], (tabs: MiscTab[] | ((prev: MiscTab[]) => MiscTab[])) => void] {
  const tabs: MiscTab[] = useStore(s => (s as any).miscTabs || []);
  const setTabs = (val: MiscTab[] | ((prev: MiscTab[]) => MiscTab[])) => {
    const next = typeof val === 'function' ? (val as any)(useStore.getState().miscTabs ?? []) : val;
    useStore.getState().setMiscTabs(next);
  };
  return [tabs, setTabs];
}

function usePersistedLabels(): [MiscLabel[], (labels: MiscLabel[] | ((prev: MiscLabel[]) => MiscLabel[])) => void] {
  const labels: MiscLabel[] = useStore(s => (s as any).miscLabels || []);
  const setLabels = (val: MiscLabel[] | ((prev: MiscLabel[]) => MiscLabel[])) => {
    const next = typeof val === 'function' ? (val as any)(useStore.getState().miscLabels ?? []) : val;
    useStore.getState().setMiscLabels(next);
  };
  return [labels, setLabels];
}

function usePersistedMiscItems(): [MiscItem[], (items: MiscItem[] | ((prev: MiscItem[]) => MiscItem[])) => void] {
  const items: MiscItem[] = useStore(s => (s as any).miscItems || []);
  const setItems = (val: MiscItem[] | ((prev: MiscItem[]) => MiscItem[])) => {
    const next = typeof val === 'function' ? (val as any)(useStore.getState().miscItems ?? []) : val;
    useStore.getState().setMiscItems(next);
  };
  return [items, setItems];
}

export default MiscPage;
