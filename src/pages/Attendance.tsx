import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Copy, Users, CheckCircle, Power, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Attendance, AttendanceAttendee, AttendanceField } from '@/types/attendance';

const sb = supabase as any;
const absoluteUrl = (path: string) => `${window.location.origin}${path}`;
const token = () => crypto.randomUUID().replaceAll('-', '');
const today = () => new Date().toISOString().slice(0, 10);

function CopyLink({ value, label = 'Copy' }: { value: string; label?: string }) {
  return <div className="flex gap-2"><Input value={value} readOnly className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} /><Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(value).then(() => toast.success('Link copied'))}><Copy className="h-4 w-4 mr-1" />{label}</Button></div>;
}

export function AttendanceRegister() {
  const { id } = useParams();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [code, setCode] = useState('');
  const [personalLink, setPersonalLink] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const { data, error } = await sb.rpc('get_public_attendance_registration', { p_attendance_id: id });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) toast.error('Attendance registration was not found.');
    else setAttendance({ id: row.id, title: row.title, accessCode: '', isOpen: row.is_open, fields: row.fields || [], createdBy: '', createdAt: new Date(), updatedAt: new Date(), logs: [] });
    setLoading(false);
  })(); }, [id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!attendance) return;
    if (attendance.fields.some((field) => field.required && !values[field.id]?.trim())) return toast.error('Complete all required fields.');
    const accessLink = token();
    const { data, error } = await sb.rpc('register_attendance_attendee', { p_attendance_id: attendance.id, p_access_code: code.trim(), p_access_link: accessLink, p_details: values });
    if (error) return toast.error(error.message || 'Registration failed.');
    const returnedToken = typeof data === 'string' ? data : accessLink;
    setPersonalLink(absoluteUrl(`/attendance/mark/${returnedToken}`));
  };

  if (loading) return <PublicShell><p>Loading registration…</p></PublicShell>;
  if (!attendance) return <PublicShell><p>This attendance registration link is invalid or unavailable.</p></PublicShell>;
  if (personalLink) return <PublicShell><CheckCircle className="h-12 w-12 text-green-600 mx-auto" /><h1 className="text-2xl font-bold text-center">Registration complete</h1><p className="text-sm text-muted-foreground text-center">Save this personal link. You do not need an account or login to mark attendance.</p><CopyLink value={personalLink} label="Copy link" /><p className="text-xs text-muted-foreground break-all">Manual copy: {personalLink}</p></PublicShell>;

  return <PublicShell><h1 className="text-2xl font-bold">{attendance.title}</h1><p className="text-sm text-muted-foreground">Public attendance registration — no login required.</p><form onSubmit={submit} className="space-y-4">{attendance.fields.map((field) => <div key={field.id}><Label>{field.label}{field.required ? ' *' : ''}</Label>{field.type === 'Dropdown' ? <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={values[field.id] || ''} onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}><option value="">Select…</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <Input type={field.type === 'Number' ? 'number' : 'text'} value={values[field.id] || ''} onChange={(e) => setValues({ ...values, [field.id]: e.target.value })} />}</div>)}<div><Label>Registration access code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div><Button className="w-full" type="submit">Register and get my personal link</Button></form></PublicShell>;
}

export function AttendanceMark() {
  const { token: accessToken } = useParams();
  const [attendee, setAttendee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const link = window.location.href;
  const load = async () => {
    const { data, error } = await sb.rpc('get_public_attendance_attendee', { p_access_link: accessToken });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) { toast.error('Personal attendance link is invalid.'); setLoading(false); return; }
    setAttendee(row); setAttendance({ id: row.attendance_id, title: row.title, isOpen: row.is_open }); setLoading(false);
  };
  useEffect(() => { void load(); }, [accessToken]);
  const mark = async () => {
    const { error } = await sb.rpc('mark_public_attendance', { p_access_link: accessToken });
    if (error) return toast.error(error.message || 'Could not mark attendance.');
    toast.success('Attendance marked for today.'); await load();
  };
  if (loading) return <PublicShell><p>Loading your attendance…</p></PublicShell>;
  if (!attendee) return <PublicShell><p>This personal attendance link is invalid.</p></PublicShell>;
  const marked = !!attendee.marks?.[today()];
  return <PublicShell><h1 className="text-2xl font-bold">{attendance.title}</h1><p className="text-sm text-muted-foreground">Your personal attendance marking page — no login required.</p><CopyLink value={link} label="Copy my link" /><div className="rounded-lg bg-muted p-4 space-y-1">{Object.entries(attendee.details || {}).map(([key, value]) => <p key={key}><b>{key}:</b> {String(value)}</p>)}</div><Button className="w-full" size="lg" onClick={mark} disabled={!attendance.isOpen || marked}>{marked ? <><CheckCircle className="mr-2 h-5 w-5" />Marked today</> : attendance.isOpen ? 'Mark attendance now' : 'Attendance is currently closed'}</Button></PublicShell>;
}

function PublicShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-muted/30 px-4 py-10"><Card className="mx-auto max-w-xl"><CardContent className="p-6 space-y-5">{children}</CardContent></Card></main>; }

export default function AttendancePage() {
  const { attendance, attendanceAttendees, setAttendance, setAttendanceAttendees, currentUser, hasPermission, fetchAll } = useStore();
  const canAdd = hasPermission('add_attendance');
  const canEdit = hasPermission('edit_attendance');
  const canView = hasPermission('view_attendance');
  const [title, setTitle] = useState('');
  const [fieldNames, setFieldNames] = useState('Name, Department');
  useEffect(() => { void fetchAll(); }, [fetchAll]);
  const byAttendance = useMemo(() => new Map(attendance.map((entry) => [entry.id, attendanceAttendees.filter((person) => person.attendanceId === entry.id)])), [attendance, attendanceAttendees]);
  if (!canView) return <Layout><p>You do not have permission to view attendance.</p></Layout>;
  const create = () => {
    if (!title.trim()) return;
    const fields: AttendanceField[] = fieldNames.split(',').map((label) => label.trim()).filter(Boolean).map((label) => ({ id: crypto.randomUUID(), label, type: 'Text', required: true }));
    const now = new Date();
    setAttendance([{ id: crypto.randomUUID(), title: title.trim(), accessCode: String(Math.floor(100000 + Math.random() * 900000)), isOpen: true, fields, createdBy: currentUser?.name || '', createdAt: now, updatedAt: now, logs: [] }, ...attendance]);
    setTitle('');
  };
  const update = (entry: Attendance, patch: Partial<Attendance>) => setAttendance(attendance.map((item) => item.id === entry.id ? { ...item, ...patch, updatedAt: new Date() } : item));
  return <Layout><div className="space-y-5"><div><h1 className="text-2xl font-bold">Attendance</h1><p className="text-sm text-muted-foreground">Create public registration links and manage registered attendees.</p></div>{canAdd && <Card><CardHeader><CardTitle className="text-lg">Create attendance</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Attendance title" value={title} onChange={(e) => setTitle(e.target.value)} /><div><Label>Registration fields (comma separated)</Label><Input value={fieldNames} onChange={(e) => setFieldNames(e.target.value)} /></div><Button onClick={create}><Plus className="h-4 w-4 mr-2" />Create</Button></CardContent></Card>}{attendance.map((entry) => { const people = byAttendance.get(entry.id) || []; const registrationLink = absoluteUrl(`/attendance/register/${entry.id}`); return <Card key={entry.id}><CardHeader><div className="flex flex-wrap justify-between gap-2"><CardTitle>{entry.title}</CardTitle><Badge variant={entry.isOpen ? 'default' : 'secondary'}>{entry.isOpen ? 'Open' : 'Closed'}</Badge></div></CardHeader><CardContent className="space-y-4"><div><Label>Public registration link (no login)</Label><CopyLink value={registrationLink} /></div><div><Label>Registration access code</Label><div className="flex gap-2"><Input readOnly value={entry.accessCode} className="font-mono" />{canEdit && <Button variant="outline" onClick={() => update(entry, { accessCode: String(Math.floor(100000 + Math.random() * 900000)) })}><RefreshCw className="h-4 w-4" /></Button>}</div></div>{canEdit && <Button variant="outline" onClick={() => update(entry, { isOpen: !entry.isOpen })}><Power className="h-4 w-4 mr-2" />{entry.isOpen ? 'Close marking' : 'Open marking'}</Button>}<div><h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Attendees ({people.length})</h3>{people.length === 0 ? <p className="text-sm text-muted-foreground mt-2">No attendees registered.</p> : <div className="space-y-2 mt-2">{people.map((person) => { const personLink = absoluteUrl(`/attendance/mark/${person.accessLink}`); return <div key={person.id} className="border rounded-lg p-3"><div className="flex flex-wrap justify-between gap-2"><span>{Object.values(person.details)[0] || 'Attendee'}</span><Badge variant="outline">{Object.keys(person.marks).length} marks</Badge></div><CopyLink value={personLink} label="Copy attendee link" /></div>; })}</div>}</div></CardContent></Card>; })}</div></Layout>;
}
