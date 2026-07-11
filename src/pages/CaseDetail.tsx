import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, CheckCircle, XCircle, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cases, updateCase, addLog, getDisplayId, settings, currentUser, hasPermission } = useStore();
  const caseEntry = cases.find(c => c.id === id);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  if (!caseEntry) return <Layout><p className="text-muted-foreground">Case not found</p></Layout>;

  const canEdit = hasPermission('edit_entry');

  const startEdit = () => {
    setEditData({
      surname: caseEntry.surname, firstName: caseEntry.firstName, middleName: caseEntry.middleName || '',
      age: caseEntry.age, gender: caseEntry.gender, nationality: caseEntry.nationality, occupation: caseEntry.occupation,
      ward: caseEntry.ward, consultant: caseEntry.consultant, typeOfSample: caseEntry.typeOfSample,
      natureOfSample: caseEntry.natureOfSample, patientType: caseEntry.patientType,
      examination: caseEntry.examination, provisionalDiagnosis: caseEntry.provisionalDiagnosis,
      clinicalDetails: caseEntry.clinicalDetails, gross: caseEntry.gross, hospitalNumber: caseEntry.hospitalNumber,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    const changes: string[] = [];
    const fieldLabels: Record<string, string> = {
      surname: 'Surname', firstName: 'First Name', middleName: 'Middle Name',
      age: 'Age', gender: 'Gender', nationality: 'Nationality', occupation: 'Occupation',
      ward: 'Ward', consultant: 'Consultant', typeOfSample: 'Type of Sample',
      natureOfSample: 'Nature of Sample', patientType: 'Patient Type',
      examination: 'Examination', provisionalDiagnosis: 'Diagnosis',
      clinicalDetails: 'Clinical Details', gross: 'Gross', hospitalNumber: 'Hospital No.',
    };
    for (const [key, label] of Object.entries(fieldLabels)) {
      const oldVal = String((caseEntry as any)[key] || '');
      const newVal = String(editData[key] || '');
      if (oldVal !== newVal) changes.push(`${label}: "${oldVal}" → "${newVal}"`);
    }
    if (changes.length === 0) { setEditing(false); return; }
    updateCase(caseEntry.id, editData);
    addLog(caseEntry.id, {
      caseId: caseEntry.id, event: 'Case Edited', timestamp: new Date(),
      user: currentUser?.name || 'Unknown', details: changes.join('; '),
    });
    setEditing(false);
    toast.success(`Case updated. ${changes.length} field(s) changed.`);
  };

  const ef = (key: string) => editing ? editData[key] ?? '' : (caseEntry as any)[key] ?? '';
  const setEf = (key: string, value: any) => setEditData(prev => ({ ...prev, [key]: value }));

  const isCytology = caseEntry.caseType === 'Cytology';
  const steps = isCytology
    ? ['Fixation', 'Cyto Analysis', 'Staining', 'Mounting', 'Microscopy', 'Sign Out']
    : ['Fixation', 'Processing', 'Embedding', 'Microtomy', 'Staining', 'Mounting', 'Microscopy', 'Sign Out'];

  const isSignedOut = caseEntry.currentStatus === 'Signed Out' || caseEntry.currentStep === 'Done';
  const stepIndex = isSignedOut ? steps.length : steps.findIndex(s => {
    if (s === 'Sign Out') return caseEntry.currentStep === 'SignOut' || caseEntry.currentStatus === 'Approved';
    if (s === 'Cyto Analysis') return caseEntry.currentStep === 'Cyto Analysis';
    if (s === 'Microscopy') return caseEntry.currentStep === 'Microscopy';
    return caseEntry.currentStep === s;
  });

  const getStepStatus = (i: number) => {
    if (i < stepIndex) return 'completed';
    if (i === stepIndex) return 'current';
    return 'pending';
  };

  // Use qcCriteriaCategories (flat-mapped) when available, fallback to legacy per-type arrays
  const qcCriteriaCategories = settings.variables.qcCriteriaCategories || [];
  const allCriteriaFromCategories = qcCriteriaCategories.length > 0
    ? qcCriteriaCategories.flatMap((cat: { id: string; name: string; items: string[] }) => cat.items)
    : [];
  const allCriteria = allCriteriaFromCategories.length > 0
    ? allCriteriaFromCategories
    : isCytology
      ? settings.variables.qcCriteriaCytology
      : settings.variables.qcCriteriaHistology;
  const passedCriteria = caseEntry.qcCriteria || [];
  const protocols = settings.variables.protocols || [];
  const protocol = protocols.find(p => p.id === caseEntry.protocolId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-display font-bold">{caseEntry.hospitalNumber}</h2>
            <p className="text-xs text-muted-foreground font-mono">ID: {getDisplayId(caseEntry.id)}</p>
          </div>
          <Badge className="shrink-0">{caseEntry.currentStatus}</Badge>
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          )}
          {editing && (
            <>
              <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/case/${id}/log`)}>
            <FileText className="h-4 w-4 mr-1" /> Log
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                    getStepStatus(i) === 'completed' ? 'bg-[hsl(120,60%,40%)] border-[hsl(120,60%,40%)] text-white' :
                    getStepStatus(i) === 'current' ? 'border-primary text-primary bg-primary/10' :
                    'border-border text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn('text-[10px] mt-1 text-center leading-tight', getStepStatus(i) === 'current' ? 'text-primary font-medium' : 'text-muted-foreground')}>{step}</span>
                </div>
                {i < steps.length - 1 && <div className={cn('w-4 sm:w-6 h-0.5 mx-0.5', i < stepIndex ? 'bg-[hsl(120,60%,40%)]' : 'bg-border')} />}
              </div>
            ))}
          </div>
        </div>

        {/* Personnel */}
        {(caseEntry.residentDoctor || caseEntry.mlsOnCall || (caseEntry.residentDoctors?.length || caseEntry.mlsOnCalls?.length)) && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="font-display font-semibold mb-3">Personnel</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {caseEntry.residentDoctors && caseEntry.residentDoctors.length > 0 ? (
                <div>
                  <span className="text-muted-foreground">Resident Doctor{caseEntry.residentDoctors.length > 1 ? 's' : ''}:</span>{' '}
                  {caseEntry.residentDoctors.map((d, i) => (
                    <span key={i} className="inline-block mr-2">
                      <span className="font-bold font-mono">{d.initials}</span>
                      <span className="text-muted-foreground text-xs ml-1">({d.name})</span>
                    </span>
                  ))}
                </div>
              ) : caseEntry.residentDoctor && (
                <div>
                  <span className="text-muted-foreground">Resident Doctor:</span>{' '}
                  <span className="font-bold font-mono">{caseEntry.residentDoctor}</span>
                  {caseEntry.residentDoctorName && <span className="text-muted-foreground text-xs ml-1">({caseEntry.residentDoctorName})</span>}
                </div>
              )}
              {caseEntry.mlsOnCalls && caseEntry.mlsOnCalls.length > 0 ? (
                <div>
                  <span className="text-muted-foreground">MLS on Call{caseEntry.mlsOnCalls.length > 1 ? 's' : ''}:</span>{' '}
                  {caseEntry.mlsOnCalls.map((m, i) => (
                    <span key={i} className="inline-block mr-2">
                      <span className="font-bold font-mono">{m.initials}</span>
                      <span className="text-muted-foreground text-xs ml-1">({m.name})</span>
                    </span>
                  ))}
                </div>
              ) : caseEntry.mlsOnCall && (
                <div>
                  <span className="text-muted-foreground">MLS on Call:</span>{' '}
                  <span className="font-bold font-mono">{caseEntry.mlsOnCall}</span>
                  {caseEntry.mlsOnCallName && <span className="text-muted-foreground text-xs ml-1">({caseEntry.mlsOnCallName})</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patient Details */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
          <h3 className="font-display font-semibold">Patient Details</h3>
          {editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Hospital No.</span><Input value={ef('hospitalNumber')} onChange={e => setEf('hospitalNumber', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Surname</span><Input value={ef('surname')} onChange={e => setEf('surname', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">First Name</span><Input value={ef('firstName')} onChange={e => setEf('firstName', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Middle Name</span><Input value={ef('middleName')} onChange={e => setEf('middleName', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Age</span><Input type="number" value={ef('age')} onChange={e => setEf('age', parseInt(e.target.value) || 0)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Gender</span>
                <Select value={ef('gender')} onValueChange={v => setEf('gender', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div><span className="text-muted-foreground text-xs">Nationality</span><Input value={ef('nationality')} onChange={e => setEf('nationality', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Occupation</span><Input value={ef('occupation')} onChange={e => setEf('occupation', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Ward</span><Input value={ef('ward')} onChange={e => setEf('ward', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Consultant</span><Input value={ef('consultant')} onChange={e => setEf('consultant', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Type</span><Input value={ef('typeOfSample')} onChange={e => setEf('typeOfSample', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Nature</span><Input value={ef('natureOfSample')} onChange={e => setEf('natureOfSample', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Patient Type</span><Input value={ef('patientType')} onChange={e => setEf('patientType', e.target.value)} className="h-8 text-sm" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{caseEntry.surname}, {caseEntry.firstName} {caseEntry.middleName}</span></div>
              <div><span className="text-muted-foreground">Age:</span> {caseEntry.age}</div>
              <div><span className="text-muted-foreground">Gender:</span> {caseEntry.gender}</div>
              <div><span className="text-muted-foreground">Nationality:</span> {caseEntry.nationality}</div>
              <div><span className="text-muted-foreground">Occupation:</span> {caseEntry.occupation}</div>
              <div><span className="text-muted-foreground">Ward:</span> {caseEntry.ward}</div>
              <div><span className="text-muted-foreground">Consultant:</span> {caseEntry.consultant}</div>
              <div><span className="text-muted-foreground">Type:</span> {caseEntry.typeOfSample}</div>
              <div><span className="text-muted-foreground">Nature:</span> {caseEntry.natureOfSample}</div>
              <div><span className="text-muted-foreground">Patient Type:</span> {caseEntry.patientType}</div>
            </div>
          )}
        </div>

        {/* Clinical */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
          <h3 className="font-display font-semibold">Clinical Information</h3>
          {editing ? (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Examination</span><Input value={ef('examination')} onChange={e => setEf('examination', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Diagnosis</span><Input value={ef('provisionalDiagnosis')} onChange={e => setEf('provisionalDiagnosis', e.target.value)} className="h-8 text-sm" /></div>
              <div><span className="text-muted-foreground text-xs">Clinical Details</span><Textarea value={ef('clinicalDetails')} onChange={e => setEf('clinicalDetails', e.target.value)} rows={3} /></div>
              {!isCytology && <div><span className="text-muted-foreground text-xs">Gross</span><Textarea value={ef('gross')} onChange={e => setEf('gross', e.target.value)} rows={3} /></div>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Examination:</span> {caseEntry.examination}</div>
                <div><span className="text-muted-foreground">Diagnosis:</span> {caseEntry.provisionalDiagnosis}</div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">Clinical Details:</span> <p className="mt-1">{caseEntry.clinicalDetails}</p></div>
              {!isCytology && caseEntry.gross && <div className="text-sm"><span className="text-muted-foreground">Gross:</span> <p className="mt-1">{caseEntry.gross}</p></div>}
            </>
          )}
        </div>

        {/* Protocol */}
        {protocol && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="font-display font-semibold">Processing Protocol — {protocol.name}</h3>
            <div className="space-y-1">
              {protocol.steps.map((s, i) => (
                <div key={i} className="flex gap-3 text-xs bg-muted/50 rounded px-3 py-1.5">
                  <span className="font-mono w-6 text-muted-foreground">{i + 1}.</span>
                  <span className="font-medium flex-1">{s.reagent}</span>
                  <span>{s.duration}</span>
                  <span>{s.concentration}</span>
                  {s.temperature && <span>{s.temperature}</span>}
                </div>
              ))}
            </div>
            {caseEntry.stepParameters && Object.keys(caseEntry.stepParameters).length > 0 && (
              <div className="space-y-3 mt-4">
                {Object.entries(caseEntry.stepParameters).map(([stepName, params]) => (
                  <div key={stepName}>
                    <h4 className="text-sm font-semibold text-primary">{stepName}</h4>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {Object.entries(params).map(([key, value]) => (
                        <div key={key} className="text-xs bg-muted/50 rounded px-2 py-1">
                          <span className="text-muted-foreground">{key}:</span> <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QC Assessment */}
        {caseEntry.qcStatus && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="font-display font-semibold">QC Assessment Criteria</h3>
            <div className="text-sm space-y-2">
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={caseEntry.qcStatus === 'Passed' ? 'default' : 'destructive'}>{caseEntry.qcStatus}</Badge></div>
              <div className="flex flex-wrap gap-1 mt-1">
                {allCriteria.map(c => {
                  const passed = passedCriteria.includes(c);
                  return (
                    <Badge key={c} variant="secondary" className="text-xs gap-1">
                      {passed ? <CheckCircle className="h-3 w-3 text-[hsl(120,60%,45%)]" /> : <XCircle className="h-3 w-3 text-destructive" />}
                      {c}
                    </Badge>
                  );
                })}
              </div>
              {caseEntry.qcComment && <div><span className="text-muted-foreground">Comment:</span> {caseEntry.qcComment}</div>}
            </div>
          </div>
        )}

        {/* Stain Runs */}
        {caseEntry.stainRuns && caseEntry.stainRuns.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="font-display font-semibold">Staining</h3>
            <div className="space-y-2">
              {caseEntry.stainRuns.map((r, i) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <Badge variant={r.isDefault ? 'default' : 'outline'} className="text-xs">{r.isDefault ? 'Default' : `Run ${i + 1}`}</Badge>
                  <span>{r.stainTypes.join(', ')}</span>
                  <Badge variant="secondary" className="text-xs">{r.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cytology Details */}
        {isCytology && caseEntry.cytologyDetails && caseEntry.cytologyDetails.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="font-display font-semibold">Cytology Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {caseEntry.cytologyDetails.map((cd, i) => (
                <div key={i}><span className="text-muted-foreground">{cd.label}:</span> {cd.value}</div>
              ))}
            </div>
            {caseEntry.cytoAnalysisMethods && caseEntry.cytoAnalysisMethods.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Analysis Methods:</span>
                <div className="flex gap-1 mt-1">{caseEntry.cytoAnalysisMethods.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}</div>
              </div>
            )}
          </div>
        )}

        {/* Sub-items */}
        {caseEntry.subItems && caseEntry.subItems.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="font-display font-semibold">Cassettes / Blocks</h3>
            <div className="flex flex-wrap gap-2">
              {caseEntry.subItems.map(si => (
                <Badge key={si.id} variant="secondary">{si.label} — {si.currentStatus}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CaseDetail;
