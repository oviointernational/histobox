import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, PackageCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CassetteLabel, CytologyDetail, CaseEntry } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const AddEntry = () => {
  const { settings, addCase, addLog, cases, currentUser } = useStore();
  const navigate = useNavigate();

  const [hospitalUnit, setHospitalUnit] = useState('');
  const [hospitalNumber, setHospitalNumber] = useState('');
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [careOfEnabled, setCareOfEnabled] = useState(false);
  const [careOf, setCareOf] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [nationality, setNationality] = useState('Nigeria');
  const [occupation, setOccupation] = useState('');
  const [ward, setWard] = useState('');
  const [consultant, setConsultant] = useState('');
  const [typeOfSample, setTypeOfSample] = useState('');
  const [natureOfSample, setNatureOfSample] = useState('');
  const [customNatureOfSample, setCustomNatureOfSample] = useState('');
  const [patientType, setPatientType] = useState('');
  const [examination, setExamination] = useState('');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [clinicalDetails, setClinicalDetails] = useState('');
  const [gross, setGross] = useState('');
  const [totalCassettes, setTotalCassettes] = useState('');
  const [cassetteLabels, setCassetteLabels] = useState<CassetteLabel[]>([]);
  const [cytologyDetails, setCytologyDetails] = useState<CytologyDetail[]>([]);
  const [residentDoctorIds, setResidentDoctorIds] = useState<string[]>([]);
  const [mlsOnCallIds, setMlsOnCallIds] = useState<string[]>([]);
  const [decal, setDecal] = useState(false);
  const [isExternalBlock, setIsExternalBlock] = useState(false);
  const [externalSource, setExternalSource] = useState('');
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [showMlsPicker, setShowMlsPicker] = useState(false);

  // Protocol state
  const [protocolId, setProtocolId] = useState('');
  const [protocolLocked, setProtocolLocked] = useState(false);
  const [protocolOverridden, setProtocolOverridden] = useState(false);
  const [customDetails, setCustomDetails] = useState<{ key: string; value: string }[]>([]);

  // Field config visibility & required status helpers
  const isEnabled = (key: string) => settings.variables.fieldConfig?.[key]?.enabled !== false;
  const isRequired = (key: string) => !!settings.variables.fieldConfig?.[key]?.required;
  const renderLabel = (key: string, labelText: string) => (
    <Label className="flex items-center gap-0.5">
      {labelText}
      {isRequired(key) && <span className="text-destructive font-bold">*</span>}
    </Label>
  );

  const addCustomDetail = () => setCustomDetails([...customDetails, { key: '', value: '' }]);
  const removeCustomDetail = (idx: number) => setCustomDetails(customDetails.filter((_, i) => i !== idx));
  const updateCustomDetail = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...customDetails];
    updated[idx][field] = val;
    setCustomDetails(updated);
  };

  const protocols = settings.variables.protocols || [];
  const selectedProtocol = protocols.find(p => p.id === protocolId);

  const isHistoOrPM = typeOfSample === 'Histology' || typeOfSample === 'Post Mortem';
  const isCytology = typeOfSample === 'Cytology';

  // Auto-select protocol when type of sample changes
  const handleTypeOfSampleChange = (val: string) => {
    setTypeOfSample(val);
    setNatureOfSample(''); // Clear nature of sample when sample type changes
    const matched = protocols.filter(p => p.sampleTypes.includes(val));
    if (matched.length === 1) {
      // Only one option — auto-assign and lock
      setProtocolId(matched[0].id);
      setProtocolLocked(true);
      setProtocolOverridden(false);
    } else if (matched.length > 1) {
      // Multiple options — require user to pick
      setProtocolId('');
      setProtocolLocked(false);
      setProtocolOverridden(false);
    } else {
      setProtocolId('');
      setProtocolLocked(false);
    }
  };

  const rawNatures = typeOfSample
    ? settings.variables.natureOfSamples.filter(n => {
        const types = settings.variables.natureOfSampleTypes?.[n] || [];
        return types.length === 0 || types.includes(typeOfSample);
      })
    : settings.variables.natureOfSamples;
  const filteredNatures = rawNatures.includes('Other') ? rawNatures : [...rawNatures, 'Other'];

  const handleProtocolOverride = (newProtocolId: string) => {
    setProtocolId(newProtocolId);
    setProtocolOverridden(true);
  };

  const selectedDoctors = settings.variables.residentDoctors.filter(d => residentDoctorIds.includes(d.id));
  const selectedMlsList = settings.variables.mlsOnCall.filter(m => mlsOnCallIds.includes(m.id));
  const selectedDoctor = selectedDoctors[0];
  const selectedMls = selectedMlsList[0];
  const toggleDoctor = (id: string) =>
    setResidentDoctorIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleMls = (id: string) =>
    setMlsOnCallIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const nextLabNumber = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    // Get hospital prefix
    const hpEntry = settings.variables.hospitalPrefixes?.find(h => h.hospitalUnit === hospitalUnit);
    const hospitalPfx = hpEntry?.prefix || (isHistoOrPM ? 'H' : 'C');
    const count = cases.filter(c => c.labNumber.startsWith(hospitalPfx)).length + 1;
    return `${hospitalPfx}${String(count).padStart(4, '0')}/${year}`;
  };

  const addCassetteLabel = () => setCassetteLabels([...cassetteLabels, { label: '', number: 0 }]);
  const removeCassetteLabel = (i: number) => setCassetteLabels(cassetteLabels.filter((_, idx) => idx !== i));
  const updateCassetteLabel = (i: number, field: keyof CassetteLabel, value: string) => {
    const updated = [...cassetteLabels];
    if (field === 'number') updated[i].number = parseInt(value) || 0;
    else updated[i].label = value;
    setCassetteLabels(updated);
  };

  const addCytologyDetail = () => setCytologyDetails([...cytologyDetails, { label: '', value: '' }]);
  const removeCytologyDetail = (i: number) => setCytologyDetails(cytologyDetails.filter((_, idx) => idx !== i));
  const updateCytologyDetail = (i: number, field: keyof CytologyDetail, value: string) => {
    const updated = [...cytologyDetails];
    updated[i][field] = value;
    setCytologyDetails(updated);
  };

  const generateSubItems = (labNum: string) => {
    const items: any[] = [];
    if (isExternalBlock) {
      // External blocks: already embedded, sub-items start at Staining
      const num = parseInt(totalCassettes) || 1;
      for (let i = 1; i <= num; i++) {
        items.push({ id: `${labNum}-${i}`, label: `${labNum}-${i}`, currentStep: 'Staining', currentStatus: 'Staining' });
      }
    } else if (isHistoOrPM) {
      if (cassetteLabels.length > 0) {
        cassetteLabels.forEach(cl => {
          for (let i = 1; i <= cl.number; i++) {
            items.push({ id: `${labNum}-${cl.label}${i}`, label: `${labNum}-${cl.label}${i}`, currentStep: 'Fixation', currentStatus: 'Room Fixing' });
          }
        });
      } else if (totalCassettes) {
        for (let i = 1; i <= parseInt(totalCassettes); i++) {
          items.push({ id: `${labNum}-${i}`, label: `${labNum}-${i}`, currentStep: 'Fixation', currentStatus: 'Room Fixing' });
        }
      }
    }
    return items;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalNumber) return;

    // Validate required fields based on fieldConfig
    const fieldConfig = settings.variables.fieldConfig || {};
    const missingFields: string[] = [];

    const checkRequired = (key: string, value: any, labelText: string) => {
      const isReq = fieldConfig[key]?.required;
      const isEnabledField = fieldConfig[key]?.enabled !== false;
      if (isReq && isEnabledField && (!value || (typeof value === 'string' && !value.trim()))) {
        missingFields.push(labelText);
      }
    };

    checkRequired('surname', surname, 'Surname');
    checkRequired('firstName', firstName, 'First Name');
    checkRequired('middleName', middleName, 'Middle Name');
    checkRequired('age', age, 'Age');
    checkRequired('gender', gender, 'Gender');
    checkRequired('nationality', nationality, 'Nationality');
    checkRequired('occupation', occupation, 'Occupation');
    const resolvedNature = natureOfSample === 'Other' ? customNatureOfSample.trim() : natureOfSample;
    checkRequired('ward', ward, 'Ward');
    checkRequired('consultant', consultant, 'Consultant');
    checkRequired('typeOfSample', typeOfSample, 'Type of Sample');
    checkRequired('natureOfSample', resolvedNature, 'Nature of Sample');
    checkRequired('patientType', patientType, 'Patient Type');
    checkRequired('examination', examination, 'Examination');
    checkRequired('provisionalDiagnosis', provisionalDiagnosis, 'Provisional Diagnosis');
    checkRequired('clinicalDetails', clinicalDetails, 'Clinical Details');
    if (!isCytology) {
      checkRequired('gross', gross, 'Gross Description');
    }

    if (missingFields.length > 0) {
      toast.error(`The following required fields are missing: ${missingFields.join(', ')}`);
      return;
    }

    const hpPrefix = hospitalUnit ? (settings.variables.hospitalPrefixes?.find(h => h.hospitalUnit === hospitalUnit)?.prefix || '') : '';
    let formattedHospitalNumber = hospitalNumber.trim();
    if (hpPrefix && formattedHospitalNumber) {
      if (formattedHospitalNumber.toUpperCase().startsWith(hpPrefix.toUpperCase())) {
        // Prefix is already present — do not duplicate!
      } else {
        formattedHospitalNumber = `${hpPrefix}${formattedHospitalNumber}`;
      }
    }
    const labNum = nextLabNumber();
    const caseId = crypto.randomUUID();
    const userName = currentUser?.name || 'Unknown';

    const entry: CaseEntry = {
      id: caseId, labNumber: labNum, hospitalNumber: formattedHospitalNumber,
      surname, firstName, middleName,
      careOf: careOfEnabled && careOf.trim() ? careOf.trim() : undefined,
      age: parseInt(age) || 0, gender: gender as any, nationality, occupation,
      ward, consultant, typeOfSample, natureOfSample: resolvedNature, patientType,
      examination, provisionalDiagnosis, clinicalDetails, gross: isCytology ? '' : gross,
      caseDetails: customDetails.filter(d => d.key.trim() || d.value.trim()).length > 0
        ? customDetails.filter(d => d.key.trim() || d.value.trim())
        : undefined,
      caseType: typeOfSample as any,
      totalCassettes: parseInt(totalCassettes) || undefined,
      cassetteLabels: cassetteLabels.length > 0 ? cassetteLabels : undefined,
      cytologyDetails: cytologyDetails.length > 0 ? cytologyDetails : undefined,
      isExternalBlock: isExternalBlock || undefined,
      externalSource: isExternalBlock ? externalSource : undefined,
      // External blocks skip to staining — all prior steps are marked done
      currentStatus: isExternalBlock ? 'Staining' : (decal ? 'Decalcifying' : 'Fixing'),
      currentStep: isExternalBlock ? 'Staining' : 'Fixation',
      fixationStatus: isExternalBlock ? 'Fixed' : (decal ? 'Decalcifying' : 'Room Fixing'),
      processingStatus: isExternalBlock ? 'Processed' : undefined,
      embeddingStatus: isExternalBlock ? 'Embedded' : undefined,
      microtomyStatus: isExternalBlock ? 'Microtomed' : undefined,
      logs: [],
      createdAt: new Date(), updatedAt: new Date(),
      comments: {},
      flags: [],
      subItems: generateSubItems(labNum),
      stainRuns: [{ id: crypto.randomUUID(), stainTypes: ['H & E'], status: 'Staining', createdAt: new Date(), isDefault: true }],
      residentDoctor: selectedDoctor?.initials || '',
      residentDoctorName: selectedDoctor?.name || '',
      mlsOnCall: selectedMls?.initials || '',
      mlsOnCallName: selectedMls?.name || '',
      residentDoctors: selectedDoctors.map(d => ({ initials: d.initials, name: d.name })),
      mlsOnCalls: selectedMlsList.map(m => ({ initials: m.initials, name: m.name })),
      decal: isExternalBlock ? false : decal,
      hospitalUnit,
      protocolId: protocolId || undefined,
      protocolOverride: protocolOverridden || undefined,
      protocolOverrideBy: protocolOverridden ? userName : undefined,
    };
    addCase(entry);

    addLog(caseId, { caseId, event: 'Case Created', timestamp: new Date(), user: userName, details: `Lab#: ${labNum}, Hospital#: ${hospitalNumber}, Patient: ${surname}, ${firstName}, Type: ${typeOfSample}, Nature: ${natureOfSample}` });

    if (protocolId && selectedProtocol) {
      addLog(caseId, { caseId, event: 'Protocol Assigned', timestamp: new Date(), user: userName, details: `Protocol: ${selectedProtocol.name}${protocolOverridden ? ' (OVERRIDE)' : ' (auto-assigned)'}` });
    }

    if (isHistoOrPM && (cassetteLabels.length > 0 || totalCassettes)) {
      addLog(caseId, { caseId, event: 'Cassettes Assigned', timestamp: new Date(), user: userName, details: cassetteLabels.length > 0 ? cassetteLabels.map(cl => `${cl.label}: ${cl.number}`).join(', ') : `Total: ${totalCassettes}` });
    }

    if (selectedDoctors.length > 0) {
      addLog(caseId, { caseId, event: 'Resident Doctor(s) Assigned', timestamp: new Date(), user: userName, details: selectedDoctors.map(d => `${d.name} (${d.initials})`).join(', ') });
    }
    if (selectedMlsList.length > 0) {
      addLog(caseId, { caseId, event: 'MLS on Call Assigned', timestamp: new Date(), user: userName, details: selectedMlsList.map(m => `${m.name} (${m.initials})`).join(', ') });
    }

    if (isExternalBlock) {
      addLog(caseId, { caseId, event: 'External Block Added', timestamp: new Date(), user: userName, details: `External tissue block from ${externalSource || 'unknown source'}. Skipped to Staining.` });
    } else {
      addLog(caseId, { caseId, event: 'Status: Grossed & Fixing', timestamp: new Date(), user: userName, details: 'Initial fixation status set to Room Fixing' });
    }

    navigate('/');
  };

  const fieldGroup = (label: string, children: React.ReactNode) => (
    <div>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-display font-bold">New Entry</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
            {/* External Block Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">Patient Information</h3>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="ext-block" className="text-sm font-medium cursor-pointer">External Tissue Block</Label>
                <Switch id="ext-block" checked={isExternalBlock} onCheckedChange={setIsExternalBlock} />
              </div>
            </div>
            {isExternalBlock && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                <p className="text-xs text-primary font-medium">🧱 External block mode — case will skip directly to Staining step. Prior steps are auto-completed.</p>
                <div>
                  <Label>Source / Referring Lab</Label>
                  <Input value={externalSource} onChange={e => setExternalSource(e.target.value)} placeholder="e.g. General Hospital Lagos" className="mt-1" />
                </div>
              </div>
            )}
            {fieldGroup('Identification', <>
              {settings.variables.hospitalPrefixes && settings.variables.hospitalPrefixes.length > 0 && (
                <div>
                  <Label>Hospital Unit</Label>
                  <Select value={hospitalUnit} onValueChange={setHospitalUnit}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      {settings.variables.hospitalPrefixes.map(h => (
                        <SelectItem key={h.id} value={h.hospitalUnit}>{h.hospitalUnit} ({h.prefix})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Lab Number *</Label><Input value={hospitalNumber} onChange={e => setHospitalNumber(e.target.value)} placeholder={`${settings.variables.hospitalPrefixes?.find(h => h.hospitalUnit === hospitalUnit)?.prefix || 'H'}1000/26-1`} required className="mt-1" /></div>
            </>)}
            {fieldGroup('Personal Details', <>
              {isEnabled('surname') && <div>{renderLabel('surname', 'Surname')}<Input value={surname} onChange={e => setSurname(e.target.value)} className="mt-1" /></div>}
              {isEnabled('firstName') && <div>{renderLabel('firstName', 'First Name')}<Input value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1" /></div>}
              {isEnabled('middleName') && <div>{renderLabel('middleName', 'Middle Name')}<Input value={middleName} onChange={e => setMiddleName(e.target.value)} className="mt-1" /></div>}
              <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-3 bg-muted/40 rounded-lg p-2.5">
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="care-of" checked={careOfEnabled} onCheckedChange={(v) => setCareOfEnabled(!!v)} />
                  <Label htmlFor="care-of" className="text-sm font-medium cursor-pointer whitespace-nowrap">Care of</Label>
                </div>
                <Input
                  value={careOf}
                  onChange={e => setCareOf(e.target.value)}
                  disabled={!careOfEnabled}
                  placeholder="Scientist / Doctor / Person responsible"
                  className="flex-1"
                />
              </div>
              {isEnabled('age') && <div>{renderLabel('age', 'Age')}<Input type="number" value={age} onChange={e => setAge(e.target.value)} className="mt-1" /></div>}
              {isEnabled('gender') && (
                <div>
                  {renderLabel('gender', 'Gender')}
                  <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              {isEnabled('nationality') && (
                <div>
                  {renderLabel('nationality', 'Nationality')}
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{settings.variables.nationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {isEnabled('occupation') && <div>{renderLabel('occupation', 'Occupation')}<Input value={occupation} onChange={e => setOccupation(e.target.value)} className="mt-1" /></div>}
            </>)}
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
            <h3 className="font-display font-semibold text-lg">Sample Information</h3>
            {fieldGroup('Details', <>
              {isEnabled('ward') && <div>{renderLabel('ward', 'Ward')}<Input value={ward} onChange={e => setWard(e.target.value)} className="mt-1" /></div>}
              {isEnabled('consultant') && <div>{renderLabel('consultant', 'Consultant')}<Input value={consultant} onChange={e => setConsultant(e.target.value)} className="mt-1" /></div>}
              {isEnabled('typeOfSample') && (
                <div>
                  {renderLabel('typeOfSample', 'Type of Sample')}
                  <Select value={typeOfSample} onValueChange={handleTypeOfSampleChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{settings.variables.typesOfSamples.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {isEnabled('natureOfSample') && (
                <div>
                  {renderLabel('natureOfSample', 'Nature of Sample')}
                  <Select value={natureOfSample} onValueChange={setNatureOfSample}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select nature" /></SelectTrigger>
                    <SelectContent>{filteredNatures.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                  {natureOfSample === 'Other' && (
                    <Input
                      placeholder="Enter nature of sample..."
                      value={customNatureOfSample}
                      onChange={e => setCustomNatureOfSample(e.target.value)}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>
              )}
              {isEnabled('patientType') && (
                <div>
                  {renderLabel('patientType', 'Patient Type')}
                  <Select value={patientType} onValueChange={setPatientType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select patient type" /></SelectTrigger>
                    <SelectContent>
                      {((settings.variables as any).patientTypes || ['In-Patient', 'Out-Patient', 'Emergency']).map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>)}
          </div>

          {/* Protocol */}
          {typeOfSample && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
              <h3 className="font-display font-semibold text-lg">Protocol</h3>
              <div className="flex items-center gap-3 flex-wrap">
                {protocolLocked && !protocolOverridden && selectedProtocol && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">{selectedProtocol.name}</Badge>
                    <span className="text-xs text-muted-foreground">(auto-assigned for {typeOfSample})</span>
                    <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setProtocolLocked(false)}>
                      Override
                    </Button>
                  </div>
                )}
                {(!protocolLocked || protocolOverridden) && (
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs">Select Protocol</Label>
                    <Select value={protocolId} onValueChange={handleProtocolOverride}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Choose protocol" /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const matching = protocols.filter(p => p.sampleTypes.includes(typeOfSample));
                          const list = matching.length ? matching : protocols;
                          return list.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                    {protocolOverridden && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">⚠ Protocol overridden — this will be recorded in case logs</p>
                    )}
                  </div>
                )}
                {!protocolId && <p className="text-xs text-muted-foreground">No protocol matched for "{typeOfSample}"</p>}
              </div>
              {selectedProtocol && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View protocol schedule ({selectedProtocol.steps.length} steps)</summary>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50 border-b"><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Reagent</th><th className="px-2 py-1 text-left">Duration</th><th className="px-2 py-1 text-left">Conc.</th><th className="px-2 py-1 text-left">Temp</th></tr></thead>
                      <tbody>
                        {selectedProtocol.steps.map((s, i) => (
                          <tr key={i} className="border-b last:border-0"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1">{s.reagent}</td><td className="px-2 py-1">{s.duration}</td><td className="px-2 py-1">{s.concentration}</td><td className="px-2 py-1">{s.temperature || '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
            <h3 className="font-display font-semibold text-lg">Personnel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Resident Doctor</Label>
                <Button type="button" variant="outline" className="w-full mt-1 justify-start" onClick={() => setShowDoctorPicker(true)}>
                  {selectedDoctors.length > 0
                    ? <span className="truncate">{selectedDoctors.map(d => d.initials).join(', ')} — {selectedDoctors.length} selected</span>
                    : 'Choose Resident Doctor(s)'}
                </Button>
              </div>
              <div>
                <Label>MLS on Call</Label>
                <Button type="button" variant="outline" className="w-full mt-1 justify-start" onClick={() => setShowMlsPicker(true)}>
                  {selectedMlsList.length > 0
                    ? <span className="truncate">{selectedMlsList.map(m => m.initials).join(', ')} — {selectedMlsList.length} selected</span>
                    : 'Choose MLS on Call(s)'}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
            <h3 className="font-display font-semibold text-lg">Clinical Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEnabled('examination') && <div>{renderLabel('examination', 'Examination')}<Input value={examination} onChange={e => setExamination(e.target.value)} className="mt-1" /></div>}
              {isEnabled('provisionalDiagnosis') && <div>{renderLabel('provisionalDiagnosis', 'Provisional Diagnosis')}<Input value={provisionalDiagnosis} onChange={e => setProvisionalDiagnosis(e.target.value)} className="mt-1" /></div>}
            </div>
             {isEnabled('clinicalDetails') && <div>{renderLabel('clinicalDetails', 'Clinical Details')}<Textarea value={clinicalDetails} onChange={e => setClinicalDetails(e.target.value)} className="mt-1" rows={3} /></div>}
            {!isCytology && isEnabled('gross') && (
              <div>{renderLabel('gross', 'Gross Description')}<Textarea value={gross} onChange={e => setGross(e.target.value)} className="mt-1" rows={4} /></div>
            )}
            {isHistoOrPM && (
              <div className="flex items-center gap-2 mt-2">
                <Checkbox checked={decal} onCheckedChange={(v) => setDecal(!!v)} id="decal" />
                <Label htmlFor="decal" className="text-sm font-medium">Decal (Decalcification required)</Label>
              </div>
            )}
          </div>

          {isHistoOrPM && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
              <h3 className="font-display font-semibold text-lg">Cassettes</h3>
              <div className="flex items-center gap-3">
                <Label>Total</Label>
                <Input type="number" value={totalCassettes} onChange={e => setTotalCassettes(e.target.value)} className="w-24" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Labels</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCassetteLabel}><Plus className="h-3 w-3 mr-1" /> Add Label</Button>
                </div>
                {cassetteLabels.map((cl, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Label (e.g. A)" value={cl.label} onChange={e => updateCassetteLabel(i, 'label', e.target.value)} className="w-32" />
                    <Input type="number" placeholder="Number" value={cl.number || ''} onChange={e => updateCassetteLabel(i, 'number', e.target.value)} className="w-24" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCassetteLabel(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isCytology && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
              <h3 className="font-display font-semibold text-lg">Cytology Details</h3>
              <p className="text-sm text-muted-foreground">Add slides count, fluid volume, consistency, color, etc.</p>
              <Button type="button" variant="outline" size="sm" onClick={addCytologyDetail}><Plus className="h-3 w-3 mr-1" /> Add Detail</Button>
              {cytologyDetails.map((cd, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Label (e.g. Slides, Fluid, Consistency, Color)" value={cd.label} onChange={e => updateCytologyDetail(i, 'label', e.target.value)} className="flex-1" />
                  <Input placeholder="Value (e.g. 6pcs, 10ml, Thick, Yellow)" value={cd.value} onChange={e => updateCytologyDetail(i, 'value', e.target.value)} className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCytologyDetail(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg">Additional Case Details</h3>
                <p className="text-sm text-muted-foreground">Add any extra key/value information relevant to this case.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCustomDetail}>
                <Plus className="h-3 w-3 mr-1" /> Add Detail
              </Button>
            </div>
            {customDetails.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No additional details added.</p>
            )}
            {customDetails.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Key (e.g. Referring Lab)"
                  value={item.key}
                  onChange={e => updateCustomDetail(idx, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={item.value}
                  onChange={e => updateCustomDetail(idx, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomDetail(idx)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={!hospitalNumber}>Save Entry</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </form>

        {/* Doctor Picker */}
        <Dialog open={showDoctorPicker} onOpenChange={setShowDoctorPicker}>
          <DialogContent>
            <DialogHeader><DialogTitle>Choose Resident Doctor(s)</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {settings.variables.residentDoctors.length === 0 && <p className="text-sm text-muted-foreground">No doctors configured. Add them in Settings.</p>}
              {settings.variables.residentDoctors.map(d => (
                <label key={d.id} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer ${residentDoctorIds.includes(d.id) ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                  <Checkbox checked={residentDoctorIds.includes(d.id)} onCheckedChange={() => toggleDoctor(d.id)} />
                  <span className="font-bold">{d.initials}</span> — {d.name}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDoctorPicker(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MLS Picker */}
        <Dialog open={showMlsPicker} onOpenChange={setShowMlsPicker}>
          <DialogContent>
            <DialogHeader><DialogTitle>Choose MLS on Call(s)</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {settings.variables.mlsOnCall.length === 0 && <p className="text-sm text-muted-foreground">No MLS configured. Add them in Settings.</p>}
              {settings.variables.mlsOnCall.map(m => (
                <label key={m.id} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer ${mlsOnCallIds.includes(m.id) ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                  <Checkbox checked={mlsOnCallIds.includes(m.id)} onCheckedChange={() => toggleMls(m.id)} />
                  <span className="font-bold">{m.initials}</span> — {m.name}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMlsPicker(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AddEntry;
