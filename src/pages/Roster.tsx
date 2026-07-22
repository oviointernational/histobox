import { useState, useRef } from 'react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ArrowLeft, Trash2, Edit2, X, ChevronDown, Search, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { RosterEntry, RosterFeed, RosterRow } from '@/types/roster';
import PageTip from '@/components/PageTip';
import { cn } from '@/lib/utils';

// ─── Searchable single-select dropdown ────────────────────────────────────────
interface SearchSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}
const SearchSelect = ({ value, onChange, options, placeholder = 'Search…' }: SearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()));
  const selectedLabel = options.find(o => o.name === value)?.name || '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-border hover:border-primary/60 bg-card px-3.5 py-2.5 text-sm font-medium text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className={cn('truncate', !selectedLabel && 'text-muted-foreground font-normal')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-primary shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-popover border-2 border-primary/40 rounded-lg shadow-2xl overflow-hidden ring-1 ring-black/10">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <input
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground font-medium"
              placeholder="Search staff..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No matching staff found</p>
            ) : filtered.map(o => (
              <button
                key={o.id}
                type="button"
                className={cn(
                  'w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary',
                  value === o.name && 'bg-primary/15 text-primary font-bold'
                )}
                onClick={() => { onChange(o.name); setOpen(false); setQuery(''); }}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Multi-select tag dropdown ────────────────────────────────────────────────
interface MultiSelectProps {
  values: string[];
  onChange: (v: string[]) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}
const MultiSelect = ({ values, onChange, options, placeholder = '+ Add Staff' }: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(query.toLowerCase()) && !values.includes(o.name)
  );

  const remove = (v: string) => onChange(values.filter(x => x !== v));
  const add = (v: string) => { onChange([...values, v]); setQuery(''); };

  return (
    <div className="relative">
      <div
        className="min-h-[42px] w-full flex flex-wrap gap-1.5 items-center rounded-lg border-2 border-border hover:border-primary/60 bg-card px-3 py-2 cursor-pointer shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
        onClick={() => setOpen(p => !p)}
      >
        {values.map(v => (
          <Badge key={v} variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
            {v}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(v); }}
              className="hover:bg-primary/20 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <span className="text-xs font-medium text-primary flex items-center gap-1 ml-auto">
          {placeholder} <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </span>
      </div>
      {open && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-popover border-2 border-primary/40 rounded-lg shadow-2xl overflow-hidden ring-1 ring-black/10">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <input
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground font-medium"
              placeholder="Search and add..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No choices available</p>
            ) : filtered.map(o => (
              <button
                key={o.id}
                type="button"
                className="w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={e => { e.stopPropagation(); add(o.name); setOpen(false); }}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const RosterPage = () => {
  const { currentUser, settings, rosters, setRosters, hasPermission } = useStore();
  const canAdd = hasPermission('add_roster');
  const canEdit = hasPermission('edit_roster');
  const canDelete = hasPermission('delete_roster');
  const rosterFeeds: RosterFeed[] = (settings.variables as any).rosterFeeds || [];

  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);
  const [title, setTitle] = useState('');
  const [designedBy, setDesignedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpandedRows(p => ({ ...p, [id]: !p[id] }));

  const allPersonnel = [
    ...settings.variables.residentDoctors,
    ...settings.variables.mlsOnCall,
  ];

  const selectedRoster = rosters.find(r => r.id === selectedRosterId) || null;

  // Migrate old feed-based data to rows if needed
  const getRosterRows = (roster: RosterEntry): RosterRow[] => {
    if (roster.rows && roster.rows.length > 0) return roster.rows;
    if (roster.feeds) {
      const maxLen = Math.max(1, ...rosterFeeds.map(f => (roster.feeds?.[f.id] || []).length));
      return Array.from({ length: maxLen }).map((_, i) => ({
        id: crypto.randomUUID(),
        startDate: '',
        endDate: '',
        values: Object.fromEntries(rosterFeeds.map(f => [f.id, (roster.feeds?.[f.id] || [])[i] || ''])),
      }));
    }
    return [];
  };

  const addRow = () => {
    const id = crypto.randomUUID();
    setRows([...rows, {
      id,
      startDate: '',
      endDate: '',
      values: Object.fromEntries(rosterFeeds.map(f => [f.id, ''])),
    }]);
    setExpandedRows(p => ({ ...p, [id]: true }));
  };

  const removeRow = (id: string) => setRows(rows.filter(r => r.id !== id));

  const updateRowField = (rowId: string, feedId: string, value: string) => {
    setRows(rows.map(r => r.id === rowId ? { ...r, values: { ...r.values, [feedId]: value } } : r));
  };

  // Multi-value update for a feed (array stored as comma-separated)
  const updateRowMulti = (rowId: string, feedId: string, values: string[]) => {
    setRows(rows.map(r => r.id === rowId ? { ...r, values: { ...r.values, [feedId]: values.join(', ') } } : r));
  };

  const updateRowDate = (rowId: string, field: 'startDate' | 'endDate', value: string) => {
    setRows(rows.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  };

  const resetForm = () => {
    setTitle(''); setDesignedBy(''); setApprovedBy(''); setRows([]);
    setEditingRosterId(null);
  };

  const openAddDialog = () => { resetForm(); setShowAdd(true); };

  const openEditDialog = (roster: RosterEntry) => {
    setEditingRosterId(roster.id);
    setTitle(roster.title);
    setDesignedBy(roster.designedBy);
    setApprovedBy(roster.approvedBy);
    setRows(getRosterRows(roster).map(r => ({ ...r })));
    setShowAdd(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const userName = currentUser?.name || 'Admin';

    if (editingRosterId) {
      setRosters(rosters.map(r => r.id === editingRosterId ? {
        ...r, title: title.trim(), designedBy, approvedBy,
        rows: [...rows],
        updatedAt: new Date(),
        logs: [...r.logs, { id: crypto.randomUUID(), event: 'Roster updated', timestamp: new Date(), user: userName }],
      } : r));
    } else {
      const entry: RosterEntry = {
        id: crypto.randomUUID(), title: title.trim(), designedBy, approvedBy,
        rows: [...rows],
        createdAt: new Date(), updatedAt: new Date(),
        logs: [{ id: crypto.randomUUID(), event: 'Roster created', timestamp: new Date(), user: userName }],
      };
      setRosters([entry, ...rosters]);
    }
    setShowAdd(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setRosters(rosters.filter(r => r.id !== id));
    if (selectedRosterId === id) setSelectedRosterId(null);
  };

  const formatDateRange = (start: string, end: string) => {
    if (!start && !end) return '—';
    const fmt = (d: string) => {
      if (!d) return '?';
      const dt = new Date(d);
      return `${dt.getDate()}/${dt.getMonth() + 1}/${String(dt.getFullYear()).slice(-2)}`;
    };
    return `${fmt(start)} — ${fmt(end)}`;
  };

  function renderFormContent() {
    return (
      <div className="space-y-5">
        <div>
          <Label className="text-sm font-medium">Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. July 2025 Duty Roster" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Designed By *</Label>
            <div className="mt-1.5">
              <SearchSelect value={designedBy} onChange={setDesignedBy} options={allPersonnel} placeholder="Search staff…" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Approved By *</Label>
            <div className="mt-1.5">
              <SearchSelect value={approvedBy} onChange={setApprovedBy} options={allPersonnel} placeholder="Search staff…" />
            </div>
          </div>
        </div>

        {rosterFeeds.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
            No roster feeds configured. Go to <strong>Settings → Roster Feeds</strong> to add column headers.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Roster Rows</Label>
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" /> Add Row
              </Button>
            </div>

            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border">
                No rows yet. Click "Add Row" to start.
              </p>
            )}

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {rows.map((row, ri) => {
                const isOpen = expandedRows[row.id] ?? false;
                const dateSummary = formatDateRange(row.startDate, row.endDate);
                const filledCount = rosterFeeds.reduce((n, f) => n + ((row.values[f.id] || '').split(',').map(s => s.trim()).filter(Boolean).length), 0);
                return (
                  <div key={row.id} className="bg-muted/40 rounded-md border border-border overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleRow(row.id)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-90')} />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Row {ri + 1}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          · {dateSummary} · {filledCount} name{filledCount === 1 ? '' : 's'}
                        </span>
                      </button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeRow(row.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start Date</Label>
                            <Input type="date" value={row.startDate} onChange={e => updateRowDate(row.id, 'startDate', e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">End Date</Label>
                            <Input type="date" value={row.endDate} onChange={e => updateRowDate(row.id, 'endDate', e.target.value)} className="mt-1" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {rosterFeeds.map(f => {
                            const raw = row.values[f.id] || '';
                            const multi = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
                            return (
                              <div key={f.id}>
                                <Label className="text-xs text-muted-foreground">{f.name}</Label>
                                <div className="mt-1">
                                  <MultiSelect
                                    values={multi}
                                    onChange={vals => updateRowMulti(row.id, f.id, vals)}
                                    options={allPersonnel}
                                    placeholder={`+ Add`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Detail view ────────────────────────────────────────────────────────────
  if (selectedRoster) {
    const displayRows = getRosterRows(selectedRoster);
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedRosterId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{selectedRoster.title}</h2>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => openEditDialog(selectedRoster)}>
              <Edit2 className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Designed by: <strong className="text-foreground">{selectedRoster.designedBy || '—'}</strong></span>
            <span>Approved by: <strong className="text-foreground">{selectedRoster.approvedBy || '—'}</strong></span>
          </div>

          {rosterFeeds.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm w-full scrollbar-thin">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="text-left px-4 py-3 font-semibold text-foreground min-w-[140px]">Date Range</th>
                    {rosterFeeds.map(f => (
                      <th key={f.id} className="text-left px-4 py-3 font-semibold text-foreground min-w-[160px]">{f.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 ? (
                    <tr><td colSpan={rosterFeeds.length + 1} className="px-4 py-6 text-center text-muted-foreground">No rows added.</td></tr>
                  ) : displayRows.map(row => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-xs align-top whitespace-nowrap min-w-[140px]">
                        {formatDateRange(row.startDate, row.endDate)}
                      </td>
                      {rosterFeeds.map(f => (
                        <td key={f.id} className="px-4 py-3 align-top min-w-[160px]">
                          <div className="flex flex-wrap gap-1.5">
                            {(row.values[f.id] || '').split(',').map(s => s.trim()).filter(Boolean).map((name, i) => (
                              <span key={i} className="inline-flex items-center rounded-md bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 border border-primary/30 shadow-2xs">{name}</span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No roster feeds configured. Add feeds in Settings.</p>
          )}

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Activity Log</h3>
            <div className="divide-y divide-border">
              {selectedRoster.logs.map(log => (
                <div key={log.id} className="py-2 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{log.event}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()} · {log.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
          <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto resize-x">
            <DialogHeader><DialogTitle className="font-display">{editingRosterId ? 'Edit Roster' : 'New Roster'}</DialogTitle></DialogHeader>
            {renderFormContent()}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!title.trim()}>{editingRosterId ? 'Save Changes' : 'Create Roster'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // ─── List view ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Roster</h2>
          <PageTip content="Create and manage duty rosters. Configure roster feeds (table headings) in Settings. Each roster row begins with a date range followed by values for each feed column." />
        </div>

        {canAdd && <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" /> Add Roster</Button>}

        {rosters.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            <p>No rosters created yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rosters.map(r => (
              <Card key={r.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRosterId(r.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Designed by: {r.designedBy || '—'} · Approved by: {r.approvedBy || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()} · {(r.rows || []).length} row(s)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); openEditDialog(r); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>}
                    {canDelete && <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setDeleteAction(() => () => handleDelete(r.id)); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
          <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editingRosterId ? 'Edit Roster' : 'New Roster'}</DialogTitle></DialogHeader>
            {renderFormContent()}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!title.trim()}>{editingRosterId ? 'Save Changes' : 'Create Roster'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DeleteConfirmDialog open={!!deleteAction} onOpenChange={o => { if (!o) setDeleteAction(null); }} onConfirm={() => { deleteAction?.(); setDeleteAction(null); }} />
      </div>
    </Layout>
  );
};

export default RosterPage;
