import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, CalendarIcon, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MaintenanceLog } from '@/types';

const MaintenanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { equipment, settings, addMaintenanceLog, currentUser } = useStore();
  const eq = equipment.find(e => e.id === id);
  const template = eq ? settings.variables.maintenanceTemplates.find(t => t.id === eq.templateId) : null;

  const [showAdd, setShowAdd] = useState(false);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const filteredLogs = useMemo(() => {
    if (!eq) return [];
    let logs = [...eq.maintenanceLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (dateRange.from) {
      logs = logs.filter(l => new Date(l.date) >= dateRange.from!);
    }
    if (dateRange.to) {
      logs = logs.filter(l => new Date(l.date) <= dateRange.to!);
    }
    return logs;
  }, [eq?.maintenanceLogs, dateRange]);

  if (!eq) return <Layout><p className="text-muted-foreground">Equipment not found</p></Layout>;

  const logDates = new Set(eq.maintenanceLogs.map(l => format(new Date(l.date), 'yyyy-MM-dd')));

  const handleAdd = () => {
    const log: MaintenanceLog = {
      id: crypto.randomUUID(),
      date: selectedDate || new Date(),
      performedBy: currentUser?.name || '',
      notes,
      checklistCompleted: checklist,
    };
    addMaintenanceLog(eq.id, log);
    setShowAdd(false);
    setNotes('');
    setChecklist({});
    setSelectedDate(undefined);
  };

  const openAddLog = () => {
    if (template) {
      const initial: Record<string, boolean> = {};
      template.checklist.forEach(item => { initial[item] = false; });
      setChecklist(initial);
    }
    setShowAdd(true);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/maintenance')}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1">
            <h2 className="text-2xl font-display font-bold">{eq.name}</h2>
            <p className="text-sm text-muted-foreground">{template?.name || 'Unknown'} · {eq.commissioned ? 'Commissioned' : 'Decommissioned'}</p>
          </div>
          <Badge variant={eq.commissioned ? 'default' : 'secondary'}>{eq.commissioned ? 'Active' : 'Inactive'}</Badge>
          <Button onClick={openAddLog}><Plus className="mr-2 h-4 w-4" /> Log Maintenance</Button>
        </div>

        {/* Date filter */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
          <Label className="text-sm">Filter by date:</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!dateRange.from && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {dateRange.from ? format(dateRange.from, 'PPP') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={d => setDateRange(prev => ({ ...prev, from: d }))}
                modifiers={{ hasLog: (date) => logDates.has(format(date, 'yyyy-MM-dd')) }}
                modifiersClassNames={{ hasLog: 'bg-primary/20 font-bold' }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!dateRange.to && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {dateRange.to ? format(dateRange.to, 'PPP') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={d => setDateRange(prev => ({ ...prev, to: d }))}
                modifiers={{ hasLog: (date) => logDates.has(format(date, 'yyyy-MM-dd')) }}
                modifiersClassNames={{ hasLog: 'bg-primary/20 font-bold' }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {(dateRange.from || dateRange.to) && (
            <Button variant="ghost" size="sm" onClick={() => setDateRange({})}>Clear</Button>
          )}
        </div>

        {/* Logs */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No maintenance logs yet</p>
            </div>
          ) : filteredLogs.map(log => (
            <div key={log.id} className="bg-card rounded-xl border border-border p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{format(new Date(log.date), 'PPP')}</h4>
                <span className="text-xs text-muted-foreground">by {log.performedBy}</span>
              </div>
              {log.notes && <p className="text-sm text-muted-foreground">{log.notes}</p>}
              <div className="flex flex-wrap gap-2">
                {Object.entries(log.checklistCompleted).map(([item, done]) => (
                  <Badge key={item} variant={done ? 'default' : 'secondary'} className="text-xs">
                    {done ? '✓' : '✗'} {item}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Log Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Log Maintenance</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full mt-1 justify-start', !selectedDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Today'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {template && (
                <div className="space-y-2">
                  <Label>Checklist</Label>
                  {template.checklist.map(item => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checklist[item] || false}
                        onCheckedChange={v => setChecklist(prev => ({ ...prev, [item]: !!v }))}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              )}

              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save Log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MaintenanceDetail;
