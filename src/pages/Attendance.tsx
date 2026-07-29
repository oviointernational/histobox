import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import PageTip from '@/components/PageTip';
import { useStore } from '@/store/useStore';
import type { Attendance, AttendanceAttendee, AttendanceField } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarCheck, Copy, ExternalLink, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);
const token = () => crypto.randomUUID();

const AttendancePage = () => {
  const [params] = useSearchParams();
  const registerId = params.get('register');
  const attendeeToken = params.get('attendee');
  const {
    attendance, attendanceAttendees, setAttendance, setAttendanceAttendees,
    currentUser, isAuthenticated, hasPermission, _hasHydrated,
  } = useStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<AttendanceField[]>([]);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<AttendanceField['type']>('Text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [registration, setRegistration] = useState<Record<string, string>>({});

  const canAdd = hasPermission('add_attendance');
  const canEdit = hasPermission('edit_attendance');
  const canDelete = hasPermission('delete_attendance');

  const registrationRecord = attendance.find(a => a.id === registerId);
  const attendee = attendanceAttendees.find(a => a.accessLink === attendeeToken);
  const attendeeRecord = attendee ? attendance.find(a => a.id === attendee.attendanceId) : undefined;

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setFields([
      { id: token(), label: 'Name', type: 'Text', required: true },
      { id: token(), label: 'Email', type: 'Text', required: true },
    ]);
    setFieldLabel(''); setFieldType('Text'); setFieldOptions('');
  };

  const openCreate = () => { resetEditor(); setEditorOpen(true); };
  const openEdit = (record: Attendance) => {
    setEditingId(record.id); setTitle(record.title); setFields(record.fields);
    setFieldLabel(''); setFieldType('Text'); setFieldOptions(''); setEditorOpen(true);
  };

  const addField = () => {
    const label = fieldLabel.trim();
    if (!label || fields.some(f => f.label.toLowerCase() === label.toLowerCase())) return;
    setFields([...fields, {
      id: token(), label, type: fieldType, required: true,
      options: fieldType === 'Dropdown' ? fieldOptions.split(',').map(x => x.trim()).filter(Boolean) : undefined,
    }]);
    setFieldLabel(''); setFieldOptions('');
  };

  const saveRecord = () => {
    if (!title.trim() || fields.length === 0) return;
    const now = new Date();
    if (editingId) {
      setAttendance(attendance.map(a => a.id === editingId ? {
        ...a, title: title.trim(), fields, updatedAt: now,
        logs: [...a.logs, { id: token(), event: 'Attendance edited', timestamp: now, user: currentUser?.name || 'Admin' }],
      } : a));
      toast.success('Attendance updated');
    } else {
      const record: Attendance = {
        id: token(), title: title.trim(), accessCode: token().slice(0, 8).toUpperCase(),
        isOpen: true, fields, createdBy: currentUser?.name || 'Admin', createdAt: now, updatedAt: now,
        logs: [{ id: token(), event: 'Attendance created', timestamp: now, user: currentUser?.name || 'Admin' }],
      };
      setAttendance([...attendance, record]);
      toast.success('Attendance created');
    }
    setEditorOpen(false); resetEditor();
  };

  const updateRecord = (id: string, patch: Partial<Attendance>, event: string) => {
    const now = new Date();
    setAttendance(attendance.map(a => a.id === id ? {
      ...a, ...patch, updatedAt: now,
      logs: [...a.logs, { id: token(), event, timestamp: now, user: currentUser?.name || 'Admin' }],
    } : a));
  };

  const removeRecord = (id: string) => {
    if (!confirm('Delete this attendance and all registered attendees?')) return;
    setAttendance(attendance.filter(a => a.id !== id));
    setAttendanceAttendees(attendanceAttendees.filter(a => a.attendanceId !== id));
    toast.success('Attendance deleted');
  };

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  const register = () => {
    if (!registrationRecord || accessCode.trim().toUpperCase() !== registrationRecord.accessCode.toUpperCase()) {
      toast.error('Invalid access code'); return;
    }
    if (registrationRecord.fields.some(f => f.required && !registration[f.label]?.trim())) {
      toast.error('Complete all required fields'); return;
    }
    const newAttendee: AttendanceAttendee = {
      id: token(), attendanceId: registrationRecord.id, accessLink: token(),
      details: registration, registeredAt: new Date(), marks: {},
    };
    setAttendanceAttendees([...attendanceAttendees, newAttendee]);
    const link = `${window.location.origin}/attendance/link?attendee=${newAttendee.accessLink}`;
    setRegistration({}); setAccessCode('');
    copy(link, 'Registered. Your personal attendance link was copied.');
  };

  const markAttendance = () => {
    if (!attendee || !attendeeRecord || !attendeeRecord.isOpen || attendee.marks[today()]) return;
    setAttendanceAttendees(attendanceAttendees.map(a => a.id === attendee.id
      ? { ...a, marks: { ...a.marks, [today()]: new Date().toISOString() } } : a));
    toast.success('Attendance marked');
  };

  if (!_hasHydrated) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading attendance…</div>;

  // Public registration link.
  if (registerId) {
    return <div className="min-h-screen bg-background p-4 grid place-items-center">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>{registrationRecord?.title || 'Attendance registration'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!registrationRecord ? <p className="text-destructive">This attendance link is invalid.</p> : <>
            {registrationRecord.fields.map(field => <div key={field.id}>
              <Label>{field.label}{field.required && ' *'}</Label>
              {field.type === 'Dropdown' ? <Select value={registration[field.label] || ''} onValueChange={v => setRegistration(r => ({ ...r, [field.label]: v }))}>
                <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
                <SelectContent>{(field.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select> : <Input type={field.type === 'Number' ? 'number' : 'text'} value={registration[field.label] || ''} onChange={e => setRegistration(r => ({ ...r, [field.label]: e.target.value }))} />}
            </div>)}
            <div><Label>Access code *</Label><Input value={accessCode} onChange={e => setAccessCode(e.target.value)} /></div>
            <Button className="w-full" onClick={register}>Register</Button>
          </>}
        </CardContent>
      </Card>
    </div>;
  }

  // Public personal link: mark attendance and view the register.
  if (attendeeToken) {
    const peers = attendeeRecord ? attendanceAttendees.filter(a => a.attendanceId === attendeeRecord.id) : [];
    return <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      <Card><CardHeader><CardTitle>{attendeeRecord?.title || 'Attendance'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!attendee || !attendeeRecord ? <p className="text-destructive">This personal attendance link is invalid.</p> : <>
            <p className="text-sm text-muted-foreground">Welcome, {attendee.details.Name || Object.values(attendee.details)[0] || 'attendee'}.</p>
            <Button onClick={markAttendance} disabled={!attendeeRecord.isOpen || !!attendee.marks[today()]}>
              <CalendarCheck className="mr-2 h-4 w-4" />
              {attendee.marks[today()] ? 'Marked today' : attendeeRecord.isOpen ? 'Mark attendance' : 'Attendance is closed'}
            </Button>
          </>}
        </CardContent>
      </Card>
      {attendeeRecord && <Card><CardHeader><CardTitle className="text-base">Attendance performance</CardTitle></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">Attendee</th><th className="text-left py-2">Days marked</th><th className="text-left py-2">Last marked</th></tr></thead>
          <tbody>{peers.map(p => { const dates = Object.keys(p.marks).sort(); return <tr key={p.id} className="border-b"><td className="py-2">{p.details.Name || Object.values(p.details)[0] || 'Attendee'}</td><td>{dates.length}</td><td>{dates.at(-1) || '—'}</td></tr>; })}</tbody>
        </table></div>
      </CardContent></Card>}
    </div>;
  }

  if (!isAuthenticated || !hasPermission('view_attendance')) {
    return <Layout><p className="text-muted-foreground">You do not have permission to view Attendance.</p></Layout>;
  }

  const selected = attendance.find(a => a.id === detailsId);
  const selectedAttendees = selected ? attendanceAttendees.filter(a => a.attendanceId === selected.id) : [];

  return <Layout><div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><h2 className="text-2xl font-display font-bold">Attendance</h2><PageTip content="Create attendance registers, share registration links and access codes, and review daily attendance marks." /></div>
      {canAdd && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Attendance</Button>}
    </div>
    {attendance.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground">No attendance records yet.</CardContent></Card> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{attendance.map(record => {
        const attendees = attendanceAttendees.filter(a => a.attendanceId === record.id);
        const registrationLink = `${window.location.origin}/attendance/link?register=${record.id}`;
        return <Card key={record.id}><CardHeader className="pb-3"><div className="flex justify-between gap-2"><CardTitle className="text-lg">{record.title}</CardTitle><Badge variant={record.isOpen ? 'default' : 'secondary'}>{record.isOpen ? 'Open' : 'Closed'}</Badge></div></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />{attendees.length} registered</div>
            <div><span className="text-muted-foreground">Access code:</span> <span className="font-mono font-semibold">{record.accessCode}</span></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(registrationLink, 'Registration link copied')}><Copy className="mr-1 h-3 w-3" />Link</Button>
              <Button size="sm" variant="outline" onClick={() => window.open(registrationLink, '_blank')}><ExternalLink className="mr-1 h-3 w-3" />Open</Button>
              <Button size="sm" variant="outline" onClick={() => setDetailsId(record.id)}>Attendees</Button>
              {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(record)}><Pencil className="h-3 w-3" /></Button>}
              {canEdit && <Button size="sm" variant="outline" onClick={() => updateRecord(record.id, { isOpen: !record.isOpen }, record.isOpen ? 'Attendance closed' : 'Attendance opened')}>{record.isOpen ? 'Close' : 'Open'}</Button>}
              {canEdit && <Button size="sm" variant="outline" title="Regenerate code" onClick={() => updateRecord(record.id, { accessCode: token().slice(0, 8).toUpperCase() }, 'Access code regenerated')}><RefreshCw className="h-3 w-3" /></Button>}
              {canDelete && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeRecord(record.id)}><Trash2 className="h-3 w-3" /></Button>}
            </div>
          </CardContent></Card>;
      })}</div>}

    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? 'Edit Attendance' : 'New Attendance'}</DialogTitle></DialogHeader>
      <div className="space-y-4"><div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Department seminar" /></div>
        <div className="space-y-2"><Label>Registration fields</Label>{fields.map(f => <div key={f.id} className="flex items-center gap-2 rounded border p-2"><Checkbox checked={f.required} onCheckedChange={v => setFields(fields.map(x => x.id === f.id ? { ...x, required: !!v } : x))} /><span className="flex-1">{f.label} <span className="text-xs text-muted-foreground">({f.type})</span></span><Button size="icon" variant="ghost" onClick={() => setFields(fields.filter(x => x.id !== f.id))}><Trash2 className="h-3 w-3" /></Button></div>)}</div>
        <div className="grid gap-2 sm:grid-cols-[1fr_130px] "><Input value={fieldLabel} onChange={e => setFieldLabel(e.target.value)} placeholder="Field label" /><Select value={fieldType} onValueChange={v => setFieldType(v as AttendanceField['type'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Text">Text</SelectItem><SelectItem value="Number">Number</SelectItem><SelectItem value="Dropdown">Dropdown</SelectItem></SelectContent></Select></div>
        {fieldType === 'Dropdown' && <Input value={fieldOptions} onChange={e => setFieldOptions(e.target.value)} placeholder="Options separated by commas" />}
        <Button type="button" variant="outline" size="sm" onClick={addField}><Plus className="mr-1 h-3 w-3" />Add field</Button>
      </div><DialogFooter><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button onClick={saveRecord} disabled={!title.trim() || fields.length === 0}>Save</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={!!detailsId} onOpenChange={o => !o && setDetailsId(null)}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.title} — Attendees</DialogTitle></DialogHeader>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">Details</th><th className="text-left py-2">Registered</th><th className="text-left py-2">Days marked</th><th className="text-left py-2">Personal link</th></tr></thead><tbody>
        {selectedAttendees.map(a => <tr key={a.id} className="border-b"><td className="py-2">{Object.entries(a.details).map(([k,v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> {v}</div>)}</td><td>{new Date(a.registeredAt).toLocaleDateString()}</td><td>{Object.keys(a.marks).length}</td><td><Button size="sm" variant="ghost" onClick={() => copy(`${window.location.origin}/attendance/link?attendee=${a.accessLink}`, 'Personal link copied')}><Copy className="h-3 w-3" /></Button></td></tr>)}
        {selectedAttendees.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No attendees registered.</td></tr>}
      </tbody></table></div><DialogFooter><Button variant="outline" onClick={() => setDetailsId(null)}>Close</Button></DialogFooter>
    </DialogContent></Dialog>
  </div></Layout>;
};

export default AttendancePage;
