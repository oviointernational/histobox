import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Search, ArrowLeft, Copy, ExternalLink, Check, Trash2, Edit2, RefreshCw,
  FileSpreadsheet, FileText, CheckCircle2, XCircle, Users, Calendar, Lock, Unlock, Key,
  Sparkles, Download
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Attendance, AttendanceAttendee, AttendanceField, AttendanceFieldType } from '@/types/attendance';
import PageTip from '@/components/PageTip';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel } from 'docx';

// Helper to generate access code
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper to export attendees as .docx
async function exportAttendeesDocx(attendance: Attendance, attendees: AttendanceAttendee[]) {
  try {
    const fieldLabels = attendance.fields.map(f => f.label);

    // Build table rows
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true })] })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        ...fieldLabels.map(label => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          width: { size: Math.floor(60 / (fieldLabels.length || 1)), type: WidthType.PERCENTAGE }
        })),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Registered At", bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Days Marked", bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
      ]
    });

    const dataRows = attendees.map((att, index) => {
      const datesMarked = Object.keys(att.marks || {}).sort().join(', ') || 'None';
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(index + 1) })] }),
          ...fieldLabels.map(label => new TableCell({
            children: [new Paragraph({ text: att.details[label] || '—' })]
          })),
          new TableCell({ children: [new Paragraph({ text: new Date(att.registeredAt).toLocaleDateString() })] }),
          new TableCell({ children: [new Paragraph({ text: `${Object.keys(att.marks || {}).length} day(s) (${datesMarked})` })] }),
        ]
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: attendance.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Access Code: `, bold: true }),
              new TextRun({ text: attendance.accessCode }),
              new TextRun({ text: `   |   Status: `, bold: true }),
              new TextRun({ text: attendance.isOpen ? 'Open for Marking' : 'Closed' }),
              new TextRun({ text: `   |   Total Attendees: `, bold: true }),
              new TextRun({ text: String(attendees.length) }),
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleString()}`,
            spacing: { after: 400 }
          }),
          new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${attendance.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_attendees.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded attendees .docx file successfully!');
  } catch (err: any) {
    console.error('Docx export error:', err);
    toast.error('Failed to export .docx file: ' + (err.message || err));
  }
}

export default function AttendancePage() {
  const { id: paramId, accessLink: paramAccessLink } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const registerId = paramId || searchParams.get('register') || searchParams.get('id');
  const markToken = paramAccessLink || searchParams.get('mark') || searchParams.get('token');

  const {
    attendance: storeAttendance,
    attendanceAttendees: storeAttendees,
    setAttendance,
    setAttendanceAttendees,
    currentUser,
    hasPermission,
    _hasHydrated
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);

  // Dialog state for create/edit attendance
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [accessCode, setAccessCode] = useState(generateCode());
  const [isOpen, setIsOpen] = useState(true);
  const [fields, setFields] = useState<AttendanceField[]>([
    { id: crypto.randomUUID(), label: 'Full Name', type: 'Text', required: true },
    { id: crypto.randomUUID(), label: 'Email', type: 'Text', required: false },
    { id: crypto.randomUUID(), label: 'Department / Organization', type: 'Text', required: false },
  ]);

  // Field builder temp state
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<AttendanceFieldType>('Text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  // Delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Registration View state (for public/unauthenticated or logged in user registering)
  const [regAccessCode, setRegAccessCode] = useState('');
  const [regValues, setRegValues] = useState<Record<string, string>>({});
  const [regSuccessLink, setRegSuccessLink] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [publicAttendance, setPublicAttendance] = useState<Attendance | null>(null);
  const [regLoadFailed, setRegLoadFailed] = useState(false);

  // Marking View state
  const [publicAttendee, setPublicAttendee] = useState<AttendanceAttendee | null>(null);
  const [publicMarkingAttendance, setPublicMarkingAttendance] = useState<Attendance | null>(null);
  const [markSubmitting, setMarkSubmitting] = useState(false);
  const [markLoadFailed, setMarkLoadFailed] = useState(false);

  // Load public registration attendance if accessing via public link
  useEffect(() => {
    if (!registerId) return;

    // Check store first (works for hydrated state or logged-in users)
    const found = storeAttendance.find(a => a.id === registerId);
    if (found) {
      setPublicAttendance(found);
      setRegLoadFailed(false);
      return;
    }

    setRegLoadFailed(false);
    // Use security-definer RPC — bypasses RLS, works for anon users
    (supabase as any)
      .rpc('get_public_attendance_registration', { p_attendance_id: registerId })
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (data && !error) {
          setPublicAttendance({
            id: data.id,
            title: data.title,
            accessCode: '', // access_code not exposed via this RPC intentionally
            isOpen: data.is_open,
            fields: data.fields || [],
            createdBy: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            logs: [],
          });
          setRegLoadFailed(false);
        } else {
          // Fallback: direct table read (works when anon RLS policy is set)
          (supabase as any)
            .from('attendance')
            .select('*')
            .eq('id', registerId)
            .single()
            .then(({ data: d2, error: e2 }: { data: any; error: any }) => {
              if (d2 && !e2) {
                setPublicAttendance({
                  id: d2.id,
                  title: d2.title,
                  accessCode: d2.access_code,
                  isOpen: d2.is_open,
                  fields: d2.fields || [],
                  createdBy: d2.created_by || '',
                  createdAt: new Date(d2.created_at),
                  updatedAt: new Date(d2.updated_at),
                  logs: d2.logs || [],
                });
                setRegLoadFailed(false);
              } else {
                console.error('[attendance] failed to load registration:', e2 || error);
                if (_hasHydrated) setRegLoadFailed(true);
              }
            })
            .catch((err: any) => {
              console.error('[attendance] fallback error:', err);
              if (_hasHydrated) setRegLoadFailed(true);
            });
        }
      })
      .catch((err: any) => {
        console.error('[attendance] RPC error:', err);
        if (_hasHydrated) setRegLoadFailed(true);
      });
  }, [registerId, storeAttendance, _hasHydrated]);

  // Load public attendee & attendance if accessing via marking link
  useEffect(() => {
    if (!markToken) return;

    // Try store first (works for hydrated state or logged-in users)
    const foundAtt = storeAttendees.find(a => a.accessLink === markToken);
    if (foundAtt) {
      setPublicAttendee(foundAtt);
      setMarkLoadFailed(false);
      const parent = storeAttendance.find(att => att.id === foundAtt.attendanceId);
      if (parent) setPublicMarkingAttendance(parent);
      return;
    }

    setMarkLoadFailed(false);
    // Use security-definer RPC — bypasses RLS, works for anon users
    (supabase as any)
      .rpc('get_public_attendance_attendee', { p_access_link: markToken })
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (data && !error) {
          // RPC returns: attendance_id, title, is_open, details, marks
          setPublicMarkingAttendance({
            id: data.attendance_id,
            title: data.title,
            accessCode: '',
            isOpen: data.is_open,
            fields: [],
            createdBy: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            logs: [],
          });
          setPublicAttendee({
            id: markToken, // use token as id placeholder
            attendanceId: data.attendance_id,
            accessLink: markToken,
            details: data.details || {},
            registeredAt: new Date(),
            marks: data.marks || {},
          });
          setMarkLoadFailed(false);
        } else {
          // Fallback: direct table read
          (supabase as any)
            .from('attendance_attendees')
            .select('*')
            .eq('access_link', markToken)
            .single()
            .then(({ data: attData, error: attErr }: { data: any; error: any }) => {
              if (attData && !attErr) {
                setPublicAttendee({
                  id: attData.id,
                  attendanceId: attData.attendance_id,
                  accessLink: attData.access_link,
                  details: attData.details || {},
                  registeredAt: new Date(attData.registered_at),
                  marks: attData.marks || {},
                });
                setMarkLoadFailed(false);
                (supabase as any)
                  .from('attendance')
                  .select('*')
                  .eq('id', attData.attendance_id)
                  .single()
                  .then(({ data: p, error: pErr }: { data: any; error: any }) => {
                    if (p && !pErr) {
                      setPublicMarkingAttendance({
                        id: p.id, title: p.title, accessCode: p.access_code,
                        isOpen: p.is_open, fields: p.fields || [],
                        createdBy: p.created_by || '',
                        createdAt: new Date(p.created_at),
                        updatedAt: new Date(p.updated_at), logs: p.logs || [],
                      });
                    }
                  });
              } else {
                console.error('[attendance] failed to load attendee:', attErr || error);
                if (_hasHydrated) setMarkLoadFailed(true);
              }
            })
            .catch((e: any) => { if (_hasHydrated) setMarkLoadFailed(true); console.error(e); });
        }
      })
      .catch((err: any) => {
        console.error('[attendance] RPC error:', err);
        if (_hasHydrated) setMarkLoadFailed(true);
      });
  }, [markToken, storeAttendees, storeAttendance, _hasHydrated]);

  // Filtered list of attendances
  const filteredAttendances = useMemo(() => {
    return storeAttendance.filter(a => {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.accessCode.toLowerCase().includes(q) ||
        a.createdBy.toLowerCase().includes(q)
      );
    });
  }, [storeAttendance, searchQuery]);

  const selectedAttendance = storeAttendance.find(a => a.id === selectedAttendanceId) || null;
  const selectedAttendees = useMemo(() => {
    if (!selectedAttendanceId) return [];
    return storeAttendees.filter(a => a.attendanceId === selectedAttendanceId);
  }, [storeAttendees, selectedAttendanceId]);

  // Handle Field Add/Remove
  const addField = () => {
    if (!fieldLabel.trim()) return;
    const f: AttendanceField = {
      id: crypto.randomUUID(),
      label: fieldLabel.trim(),
      type: fieldType,
      required: fieldRequired,
      ...(fieldType === 'Dropdown' ? { options: fieldOptions.split(',').map(o => o.trim()).filter(Boolean) } : {})
    };
    setFields([...fields, f]);
    setFieldLabel(''); setFieldType('Text'); setFieldRequired(false); setFieldOptions('');
  };

  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));

  // Save Attendance (Create / Edit)
  const saveAttendance = () => {
    if (!title.trim()) return;
    const userName = currentUser?.name || 'Admin';

    if (editingAttendanceId) {
      const updated = storeAttendance.map(a => a.id === editingAttendanceId ? {
        ...a,
        title: title.trim(),
        accessCode: accessCode.trim(),
        isOpen,
        fields,
        updatedAt: new Date(),
        logs: [...a.logs, { id: crypto.randomUUID(), event: 'Attendance updated', timestamp: new Date(), user: userName }]
      } : a);
      setAttendance(updated);
      toast.success('Attendance updated');
    } else {
      const newAtt: Attendance = {
        id: crypto.randomUUID(),
        title: title.trim(),
        accessCode: accessCode.trim() || generateCode(),
        isOpen,
        fields,
        createdBy: userName,
        createdAt: new Date(),
        updatedAt: new Date(),
        logs: [{ id: crypto.randomUUID(), event: 'Attendance created', timestamp: new Date(), user: userName }]
      };
      setAttendance([newAtt, ...storeAttendance]);
      setSelectedAttendanceId(newAtt.id);
      toast.success('New Attendance created');
    }

    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setAccessCode(generateCode()); setIsOpen(true);
    setFields([
      { id: crypto.randomUUID(), label: 'Full Name', type: 'Text', required: true },
      { id: crypto.randomUUID(), label: 'Email', type: 'Text', required: false },
      { id: crypto.randomUUID(), label: 'Department / Organization', type: 'Text', required: false },
    ]);
    setEditingAttendanceId(null);
  };

  const openEdit = (att: Attendance) => {
    setEditingAttendanceId(att.id);
    setTitle(att.title);
    setAccessCode(att.accessCode);
    setIsOpen(att.isOpen);
    setFields([...att.fields]);
    setShowCreateDialog(true);
  };

  const deleteAttendance = (id: string) => {
    setAttendance(storeAttendance.filter(a => a.id !== id));
    setAttendanceAttendees(storeAttendees.filter(a => a.attendanceId !== id));
    if (selectedAttendanceId === id) setSelectedAttendanceId(null);
    toast.success('Attendance deleted');
  };

  const toggleAttendanceOpen = (att: Attendance) => {
    const updated = storeAttendance.map(a => a.id === att.id ? { ...a, isOpen: !a.isOpen, updatedAt: new Date() } : a);
    setAttendance(updated);
    toast.success(att.isOpen ? 'Attendance closed for marking' : 'Attendance opened for marking');
  };

  const regenerateCode = (att: Attendance) => {
    const newCode = generateCode();
    const updated = storeAttendance.map(a => a.id === att.id ? { ...a, accessCode: newCode, updatedAt: new Date() } : a);
    setAttendance(updated);
    toast.success(`Access code regenerated: ${newCode}`);
  };

  // Submit Public Registration
  const handlePublicRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicAttendance) return;

    if (publicAttendance.accessCode && regAccessCode.trim().toLowerCase() !== publicAttendance.accessCode.toLowerCase()) {
      toast.error('Invalid Access Code. Please check and try again.');
      return;
    }

    // Check required fields
    for (const f of publicAttendance.fields) {
      if (f.required && !regValues[f.label]?.trim()) {
        toast.error(`Please fill in required field: ${f.label}`);
        return;
      }
    }

    setRegSubmitting(true);
    try {
      const accessLinkToken = `att-token-${crypto.randomUUID()}`;

      // Use security-definer RPC — bypasses RLS for anon users
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('register_attendance_attendee', {
        p_attendance_id: publicAttendance.id,
        p_access_code: regAccessCode.trim(),
        p_access_link: accessLinkToken,
        p_details: regValues,
      });

      if (rpcError) {
        // Fallback: direct insert (works if anon INSERT policy is set)
        const { error: insertError } = await (supabase as any).from('attendance_attendees').insert({
          id: crypto.randomUUID(),
          attendance_id: publicAttendance.id,
          access_link: accessLinkToken,
          details: regValues,
          registered_at: new Date().toISOString(),
          marks: {}
        });
        if (insertError) throw insertError;
      }

      const newAttendee: AttendanceAttendee = {
        id: rpcData || accessLinkToken,
        attendanceId: publicAttendance.id,
        accessLink: accessLinkToken,
        details: { ...regValues },
        registeredAt: new Date(),
        marks: {}
      };

      setAttendanceAttendees([...storeAttendees, newAttendee]);
      const markingUrl = `${window.location.origin}/attendance/mark/${accessLinkToken}`;
      setRegSuccessLink(markingUrl);
      toast.success('Registration successful!');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error('Registration failed: ' + (err.message || err));
    } finally {
      setRegSubmitting(false);
    }
  };

  // Submit Personal Marking for Today
  const handlePublicMark = async () => {
    if (!publicAttendee || !publicMarkingAttendance) return;

    if (!publicMarkingAttendance.isOpen) {
      toast.error('Attendance marking is currently CLOSED for this register.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (publicAttendee.marks[todayStr]) {
      toast.info(`You have already marked attendance for today (${todayStr}).`);
      return;
    }

    setMarkSubmitting(true);
    try {
      const todayStr2 = new Date().toISOString().split('T')[0];

      // Use security-definer RPC — bypasses RLS for anon users
      const { error: rpcError } = await (supabase as any).rpc('mark_public_attendance', {
        p_access_link: publicAttendee.accessLink,
      });

      if (rpcError) {
        // Fallback: direct update (works if anon UPDATE policy is set)
        const updatedMarks = { ...publicAttendee.marks, [todayStr2]: new Date().toISOString() };
        const { error: updateError } = await (supabase as any).from('attendance_attendees')
          .update({ marks: updatedMarks })
          .eq('access_link', publicAttendee.accessLink);
        if (updateError) throw updateError;
      }

      const updatedMarks = { ...publicAttendee.marks, [todayStr2]: new Date().toISOString() };
      const updatedObj = { ...publicAttendee, marks: updatedMarks };
      setPublicAttendee(updatedObj);
      setAttendanceAttendees(storeAttendees.map(a => a.accessLink === publicAttendee.accessLink ? updatedObj : a));
      toast.success(`Attendance marked successfully for today (${todayStr2})!`);
    } catch (err: any) {
      console.error('Marking error:', err);
      toast.error('Failed to mark attendance: ' + (err.message || err));
    } finally {
      setMarkSubmitting(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // =========================================================================
  // PUBLIC ROUTE VIEW 1: REGISTRATION LINK (/attendance/register/:id)
  // =========================================================================
  if (registerId) {
    if (!publicAttendance) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-border">
            {regLoadFailed ? (
              <div className="flex flex-col items-center gap-3">
                <XCircle className="h-10 w-10 text-destructive" />
                <p className="font-semibold text-destructive">Attendance Not Found</p>
                <p className="text-xs text-muted-foreground">
                  This registration link is invalid or has been removed. Please contact the organiser for a new link.
                </p>
              </div>
            ) : (
              <div className="animate-pulse flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading Attendance Registration...</p>
              </div>
            )}
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900/5 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-border bg-card rounded-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-1">
              <Calendar className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{publicAttendance.title}</h1>
            <p className="text-xs text-muted-foreground">Attendance Registration Form</p>
          </div>

          {regSuccessLink ? (
            <div className="space-y-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
              <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">You are Registered!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Save your personal marking link below to mark your daily attendance.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-xs font-semibold">Your Personal Attendance Marking Link:</Label>
                <div className="flex gap-2">
                  <Input value={regSuccessLink} readOnly className="font-mono text-xs bg-background" />
                  <Button variant="secondary" onClick={() => copyToClipboard(regSuccessLink, 'Personal Link')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full gap-2" onClick={() => window.location.href = regSuccessLink}>
                  <CheckCircle2 className="h-4 w-4" /> Go to Personal Marking Link
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublicRegister} className="space-y-4">
              {publicAttendance.accessCode && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-primary" /> Access Code *
                  </Label>
                  <Input
                    required
                    placeholder="Enter access code"
                    value={regAccessCode}
                    onChange={e => setRegAccessCode(e.target.value)}
                    className="font-mono uppercase tracking-wider text-center font-bold text-base"
                  />
                  <p className="text-[11px] text-muted-foreground">Provided by the organizer/administrator.</p>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Registration Details</h4>
                {publicAttendance.fields.map(f => (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-sm font-medium">
                      {f.label}{f.required && ' *'}
                    </Label>
                    {f.type === 'Dropdown' ? (
                      <Select value={regValues[f.label] || ''} onValueChange={v => setRegValues({ ...regValues, [f.label]: v })}>
                        <SelectTrigger><SelectValue placeholder="Select choice" /></SelectTrigger>
                        <SelectContent>{(f.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : f.type === 'Number' ? (
                      <Input
                        type="number"
                        required={f.required}
                        value={regValues[f.label] || ''}
                        onChange={e => setRegValues({ ...regValues, [f.label]: e.target.value })}
                        placeholder={`Enter ${f.label}`}
                      />
                    ) : (
                      <Input
                        required={f.required}
                        value={regValues[f.label] || ''}
                        onChange={e => setRegValues({ ...regValues, [f.label]: e.target.value })}
                        placeholder={`Enter ${f.label}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full text-base font-semibold py-5 mt-4" disabled={regSubmitting}>
                {regSubmitting ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  // =========================================================================
  // PUBLIC ROUTE VIEW 2: PERSONAL MARKING LINK (/attendance/mark/:accessLink)
  // =========================================================================
  if (markToken) {
    if (!publicAttendee) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-border">
            {markLoadFailed ? (
              <div className="flex flex-col items-center gap-3">
                <XCircle className="h-10 w-10 text-destructive" />
                <p className="font-semibold text-destructive">Personal Link Not Found</p>
                <p className="text-xs text-muted-foreground">
                  This attendance link is invalid or has expired. Please re-register using the registration link to get a new personal link.
                </p>
              </div>
            ) : (
              <div className="animate-pulse flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Loading Personal Attendance Link...</p>
              </div>
            )}
          </Card>
        </div>
      );
    }


    const todayStr = new Date().toISOString().split('T')[0];
    const isMarkedToday = !!publicAttendee.marks[todayStr];
    const isClosed = publicMarkingAttendance ? !publicMarkingAttendance.isOpen : false;

    return (
      <div className="min-h-screen bg-slate-900/5 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-border bg-card rounded-2xl">
          <div className="text-center space-y-2">
            <Badge variant={isClosed ? "destructive" : "default"} className="mb-1 text-xs">
              {isClosed ? 'Marking Closed' : 'Marking Open'}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">{publicMarkingAttendance?.title || 'Attendance Register'}</h1>
            <p className="text-sm font-semibold text-primary">
              Attendee: {publicAttendee.details['Full Name'] || publicAttendee.details['Name'] || Object.values(publicAttendee.details)[0] || 'Attendee'}
            </p>
          </div>

          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2 text-sm">
            {Object.entries(publicAttendee.details).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/50 last:border-0 pb-1.5 last:pb-0">
                <span className="text-muted-foreground text-xs font-medium">{k}:</span>
                <span className="font-semibold text-xs">{v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4 text-center">
            {isMarkedToday ? (
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-6 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">Attendance Marked for Today!</h3>
                <p className="text-xs text-muted-foreground">
                  Recorded at: {new Date(publicAttendee.marks[todayStr]).toLocaleTimeString()} ({todayStr})
                </p>
              </div>
            ) : isClosed ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 space-y-2">
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <h3 className="font-bold text-lg text-destructive">Marking Currently Closed</h3>
                <p className="text-xs text-muted-foreground">
                  The administrator has closed attendance marking for this session.
                </p>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full py-6 text-lg font-bold gap-2 shadow-lg hover:shadow-xl transition-all"
                onClick={handlePublicMark}
                disabled={markSubmitting}
              >
                <CheckCircle2 className="h-6 w-6" />
                {markSubmitting ? 'Marking Attendance...' : `Mark Attendance for Today (${todayStr})`}
              </Button>
            )}

            {/* Attendance Performance / Marking History */}
            <div className="pt-4 border-t border-border text-left space-y-3">
              <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider flex items-center justify-between">
                <span>Marking History</span>
                <Badge variant="outline" className="font-mono">{Object.keys(publicAttendee.marks).length} Day(s)</Badge>
              </h4>
              {Object.keys(publicAttendee.marks).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">No dates marked yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {Object.entries(publicAttendee.marks).sort(([a], [b]) => b.localeCompare(a)).map(([date, ts]) => (
                    <div key={date} className="flex justify-between items-center bg-muted/40 rounded-lg px-3 py-2 text-xs font-mono">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {date}
                      </span>
                      <span className="text-muted-foreground">{new Date(ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // MAIN DASHBOARD VIEW (Searchable List & Detail View)
  // =========================================================================
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold">Attendance</h2>
            <PageTip content="Create attendance registers with dynamic fields and access codes. Unregistered, unlogged users, guests, and registered users have unlimited access to registration & marking links." />
          </div>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create Attendance
          </Button>
        </div>

        {/* DETAIL VIEW (When an attendance card is clicked) */}
        {selectedAttendance ? (
          <div className="space-y-6 animate-fade-in">
            {/* Top Navigation & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAttendanceId(null)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back to Attendance List
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedAttendance)} className="gap-1.5">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportAttendeesDocx(selectedAttendance, selectedAttendees)}
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Download className="h-3.5 w-3.5" /> Export Attendees (.docx)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTargetId(selectedAttendance.id)}
                  className="text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>

            {/* Overview Card */}
            <Card className="p-6 space-y-6 shadow-md border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold font-display">{selectedAttendance.title}</h1>
                    <Badge variant={selectedAttendance.isOpen ? "default" : "destructive"}>
                      {selectedAttendance.isOpen ? "Open for Marking" : "Closed"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(selectedAttendance.createdAt).toLocaleDateString()} by {selectedAttendance.createdBy || 'Admin'}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-muted-foreground">Marking Status:</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedAttendance.isOpen}
                      onCheckedChange={() => toggleAttendanceOpen(selectedAttendance)}
                    />
                    <span className="text-xs font-bold">{selectedAttendance.isOpen ? "OPEN" : "CLOSED"}</span>
                  </div>
                </div>
              </div>

              {/* Links & Access Code Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Registration Link Card */}
                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" /> Registration Link (Unlimited Access)
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/attendance/register/${selectedAttendance.id}`}
                      className="font-mono text-xs bg-background"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/attendance/register/${selectedAttendance.id}`, 'Registration Link')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`${window.location.origin}/attendance/register/${selectedAttendance.id}`, '_blank')}
                    >
                      Open
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Share this link with attendees to allow them to register.</p>
                </div>

                {/* Access Code Card */}
                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" /> Registration Access Code
                    </Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={() => regenerateCode(selectedAttendance)}>
                      <RefreshCw className="h-3 w-3" /> Regenerate Code
                    </Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="font-mono font-bold text-lg bg-background border border-border rounded-lg px-4 py-1.5 text-primary tracking-widest flex-1 text-center">
                      {selectedAttendance.accessCode || 'NONE'}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => copyToClipboard(selectedAttendance.accessCode, 'Access Code')}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Required by attendees during registration.</p>
                </div>
              </div>

              {/* Attendees List Table */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Registered Attendees ({selectedAttendees.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportAttendeesDocx(selectedAttendance, selectedAttendees)}
                    className="gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Export .docx
                  </Button>
                </div>

                {selectedAttendees.length === 0 ? (
                  <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border text-muted-foreground space-y-2">
                    <Users className="h-8 w-8 mx-auto opacity-40" />
                    <p className="text-sm">No registered attendees yet.</p>
                    <p className="text-xs">Share the registration link above to let attendees register.</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-muted/60 text-muted-foreground border-b border-border">
                          <th className="text-left px-4 py-3 font-semibold">#</th>
                          {selectedAttendance.fields.map(f => (
                            <th key={f.id} className="text-left px-4 py-3 font-semibold">{f.label}</th>
                          ))}
                          <th className="text-left px-4 py-3 font-semibold">Registered</th>
                          <th className="text-left px-4 py-3 font-semibold">Personal Marking Link</th>
                          <th className="text-left px-4 py-3 font-semibold">Days Marked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAttendees.map((att, idx) => {
                          const personalUrl = `${window.location.origin}/attendance/mark/${att.accessLink}`;
                          const markCount = Object.keys(att.marks || {}).length;
                          return (
                            <tr key={att.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                              {selectedAttendance.fields.map(f => (
                                <td key={f.id} className="px-4 py-3 font-medium">{att.details[f.label] || '—'}</td>
                              ))}
                              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(att.registeredAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Input readOnly value={personalUrl} className="font-mono text-[10px] h-7 max-w-[180px] bg-background" />
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(personalUrl, 'Personal Marking Link')}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(personalUrl, '_blank')}>
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={markCount > 0 ? "secondary" : "outline"} className="font-mono text-xs">
                                  {markCount} day(s)
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ) : (
          /* SEARCHABLE LIST VIEW (Created Attendances - Concise Cards) */
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attendances by title, code, or creator..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 shadow-2xs"
              />
            </div>

            {/* Cards Grid */}
            {filteredAttendances.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground space-y-3 shadow-xs">
                <Calendar className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-base font-medium">No attendances found.</p>
                <p className="text-xs">Click "Create Attendance" to start a new registration and marking register.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAttendances.map(att => {
                  const attendeeCount = storeAttendees.filter(a => a.attendanceId === att.id).length;
                  return (
                    <Card
                      key={att.id}
                      className="p-5 cursor-pointer hover:shadow-lg transition-all border-border hover:border-primary/50 group flex flex-col justify-between"
                      onClick={() => setSelectedAttendanceId(att.id)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-lg font-display text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {att.title}
                          </h3>
                          <Badge variant={att.isOpen ? "default" : "secondary"} className="shrink-0 text-[10px]">
                            {att.isOpen ? 'Open' : 'Closed'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                            Code: {att.accessCode || 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Users className="h-3.5 w-3.5 text-primary" /> {attendeeCount} Attendee(s)
                        </span>
                        <span>{new Date(att.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CREATE / EDIT ATTENDANCE DIALOG */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingAttendanceId ? 'Edit Attendance' : 'Create New Attendance'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Attendance Title *</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Pathology Symposium 2026"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Access Code</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value.toUpperCase())}
                      className="font-mono uppercase text-center font-bold"
                    />
                    <Button variant="outline" size="icon" onClick={() => setAccessCode(generateCode())} title="Random Code">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
                    <Switch checked={isOpen} onCheckedChange={setIsOpen} />
                    <Label className="text-xs font-semibold cursor-pointer">
                      {isOpen ? 'Open for Marking' : 'Closed'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Dynamic Registration Fields */}
              <div className="space-y-3 border-t border-border pt-3">
                <Label className="font-semibold text-sm text-primary">Registration Fields</Label>
                <div className="space-y-2">
                  {fields.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{f.label}</span>
                        <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                        {f.required && <Badge className="text-[10px]">Req</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeField(f.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Field Inline Form */}
                <div className="border border-dashed border-border p-3 rounded-lg space-y-2 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground">Add Custom Field</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Field Label *"
                      value={fieldLabel}
                      onChange={e => setFieldLabel(e.target.value)}
                      className="text-xs"
                    />
                    <Select value={fieldType} onValueChange={v => setFieldType(v as AttendanceFieldType)}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Text">Text</SelectItem>
                        <SelectItem value="Number">Number</SelectItem>
                        <SelectItem value="Dropdown">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {fieldType === 'Dropdown' && (
                    <Input
                      placeholder="Options (comma-separated)"
                      value={fieldOptions}
                      onChange={e => setFieldOptions(e.target.value)}
                      className="text-xs"
                    />
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={fieldRequired} onChange={e => setFieldRequired(e.target.checked)} />
                      Required
                    </label>
                    <Button size="sm" onClick={addField} disabled={!fieldLabel.trim()}>
                      Add Field
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={saveAttendance} disabled={!title.trim()}>
                {editingAttendanceId ? 'Save Changes' : 'Create Attendance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <DeleteConfirmDialog
          open={!!deleteTargetId}
          onOpenChange={o => { if (!o) setDeleteTargetId(null); }}
          onConfirm={() => { if (deleteTargetId) deleteAttendance(deleteTargetId); setDeleteTargetId(null); }}
        />
      </div>
    </Layout>
  );
}
