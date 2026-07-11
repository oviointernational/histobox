import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit2, Printer, Save, X } from 'lucide-react';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reports, updateReport, addReportLog, currentUser, settings } = useStore();
  const report = reports.find(r => r.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(report || {} as any);

  if (!report) return <Layout><p className="text-muted-foreground">Report not found</p></Layout>;

  const handleSave = () => {
    updateReport(report.id, form);
    addReportLog(report.id, { caseId: report.id, event: 'Report Edited', timestamp: new Date(), user: currentUser?.name || '' });
    setEditing(false);
  };

  const handlePrint = () => {
    addReportLog(report.id, { caseId: report.id, event: 'Report Printed', timestamp: new Date(), user: currentUser?.name || '' });
    window.print();
  };

  const field = (label: string, value: string, key: string, multiline = false) => (
    <div>
      <Label className="text-muted-foreground text-xs uppercase">{label}</Label>
      {editing ? (
        multiline
          ? <Textarea value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1" rows={3} />
          : <Input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1" />
      ) : (
        <p className="text-sm mt-0.5">{value || '—'}</p>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/report')}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1">
            <h2 className="text-2xl font-display font-bold">{report.title}</h2>
            <p className="text-sm text-muted-foreground">S/N {report.serialNumber} · {report.category}</p>
          </div>
          <Badge variant={report.category === 'Incident' ? 'destructive' : 'secondary'}>{report.category}</Badge>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(report); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(true); setForm(report); }}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {field('Type', report.type, 'type')}
            {field('Location', report.location, 'location')}
            {field('Reported By', report.reportedBy, 'reportedBy')}
            {field('MLS in Charge', report.mlsInCharge, 'mlsInCharge')}
            {field('Superior Reported', report.superiorReported, 'superiorReported')}
          </div>
          {field('Description', report.description, 'description', true)}
          {field('Immediate Action Taken', report.immediateAction, 'immediateAction', true)}
          {field('Root Cause Analysis', report.rootCauseAnalysis, 'rootCauseAnalysis', true)}
          {field('Corrective Actions', report.correctiveActions, 'correctiveActions', true)}
        </div>

        {/* Log */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-3">
          <h3 className="font-display font-semibold">Activity Log</h3>
          {report.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No log entries</p>
          ) : (
            <div className="divide-y divide-border">
              {report.logs.map(log => (
                <div key={log.id} className="py-2 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{log.event}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()} · {log.user}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReportDetail;
