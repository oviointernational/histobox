import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Eye, List, ShieldCheck, FileText, Wrench, Palette, Users, Beaker, Shield, UserPlus, ClipboardList, ChevronDown, ChevronRight, Building, GraduationCap, CalendarDays, Tag, Key, MessageCircle, Phone, FlaskConical, Clock, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personnel, ALL_PERMISSIONS, PERMISSION_LABELS, SystemRole, SystemUser, OfficeType, StainCategory, HospitalPrefix } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import MiscTabsManager from '@/components/MiscTabsManager';

type SettingsTab = 'profile' | 'columns' | 'variables' | 'caseSetup' | 'qcCriteria' | 'reportTypes' | 'templates' | 'sitePrefixes' | 'personnel' | 'stains' | 'roles' | 'users' | 'requestTypes' | 'examSettings' | 'rosterFeeds' | 'patientTypes' | 'detailKeys' | 'support' | 'storageUnits' | 'immunoSettings' | 'protocols' | 'delays' | 'miscTabs' | 'qualityControl';

const allSettingsMenu = [
  { key: 'profile' as const, label: 'My Profile', icon: Users, requiresAdmin: false },
  { key: 'sitePrefixes' as const, label: 'Site & Prefixes', icon: Building, requiresAdmin: true },
  { key: 'columns' as const, label: 'Visible Columns', icon: Eye, requiresAdmin: true },
  { key: 'variables' as const, label: 'Variables', icon: List, requiresAdmin: true },
  { key: 'caseSetup' as const, label: 'Case Setup', icon: ClipboardList, requiresAdmin: true },
  { key: 'qcCriteria' as const, label: 'QC Criteria', icon: ShieldCheck, requiresAdmin: true },
  { key: 'qualityControl' as const, label: 'Quality Control', icon: ClipboardCheck, requiresAdmin: true },
  { key: 'stains' as const, label: 'Stain Types', icon: Beaker, requiresAdmin: true },
  { key: 'requestTypes' as const, label: 'Request Types', icon: ClipboardList, requiresAdmin: true },
  { key: 'personnel' as const, label: 'Personnel', icon: Users, requiresAdmin: true },
  { key: 'reportTypes' as const, label: 'Report Types', icon: FileText, requiresAdmin: true },
  { key: 'templates' as const, label: 'Templates', icon: Wrench, requiresAdmin: true },
  { key: 'roles' as const, label: 'Access Control', icon: Shield, requiresAdmin: true },
  { key: 'users' as const, label: 'Users', icon: UserPlus, requiresAdmin: true },
  { key: 'examSettings' as const, label: 'Exam Settings', icon: GraduationCap, requiresAdmin: true },
  { key: 'rosterFeeds' as const, label: 'Roster Feeds', icon: CalendarDays, requiresAdmin: true },
  { key: 'patientTypes' as const, label: 'Patient Types', icon: Tag, requiresAdmin: true },
  { key: 'storageUnits' as const, label: 'Storage Units', icon: Building, requiresAdmin: true },
  { key: 'immunoSettings' as const, label: 'Immuno Settings', icon: Beaker, requiresAdmin: true },
  
  { key: 'protocols' as const, label: 'Protocols', icon: FlaskConical, requiresAdmin: true },
  { key: 'delays' as const, label: 'Delay & Flag Rules', icon: Clock, requiresAdmin: true },
  { key: 'miscTabs' as const, label: 'Misc Tabs', icon: List, requiresAdmin: true },
  { key: 'support' as const, label: 'Support Link', icon: MessageCircle, requiresAdmin: true },
];

const officeTypes: OfficeType[] = ['MLS', 'IMLS', 'MLT', 'MLA'];
const officeLabels: Record<OfficeType, string> = {
  'MLS': 'Medical Laboratory Scientist',
  'IMLS': 'Intern Medical Laboratory Science',
  'MLT': 'Medical Laboratory Technologist',
  'MLA': 'Medical Laboratory Assistant',
};


const SettingsPage = () => {
  const { currentUser, settings, updateSettings, addVariable, removeVariable, addRole, updateRole, removeRole, setDefaultRole, systemUsers, addSystemUser, updateSystemUser, deleteSystemUser, addStainCategory, addStainToCategory, removeStainFromCategory, removeStainCategory, addQcCriteriaCategory, removeQcCriteriaCategory, addQcCriteriaItem, removeQcCriteriaItem, hasPermission } = useStore();
  
  const canManageSettings = hasPermission('manage_settings');
  const [activeTab, setActiveTab] = useState<SettingsTab>(canManageSettings ? 'sitePrefixes' : 'profile');
  const [newNature, setNewNature] = useState('');
  const [newType, setNewType] = useState('');
  const [newNationality, setNewNationality] = useState('');
  const [newQcHistology, setNewQcHistology] = useState('');
  const [newQcCytology, setNewQcCytology] = useState('');
  const [newReportType, setNewReportType] = useState('');
  const [newReportLocation, setNewReportLocation] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateChecklist, setNewTemplateChecklist] = useState('');
  const [newRequestType, setNewRequestType] = useState('');
  const [idPrefix, setIdPrefix] = useState(settings.idPrefix);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorInitials, setNewDoctorInitials] = useState('');
  const [newMlsUserId, setNewMlsUserId] = useState('');
  const [newMlsInitials, setNewMlsInitials] = useState('');

  // Stain categories
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newStainInCat, setNewStainInCat] = useState<Record<string, string>>({});
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  // Roles
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [acSelectedRoleId, setAcSelectedRoleId] = useState<string | null>(null);
  const [acExpandedGroups, setAcExpandedGroups] = useState<Record<string, boolean>>({});

  // Users
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: '', gender: '' as 'Male' | 'Female' | '', raNumber: '', phone: '', email: '', office: 'MLS' as OfficeType, designation: '', roleId: settings.defaultRoleId, password: '' });
  const [savingUser, setSavingUser] = useState(false);

  // Delete confirmation
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);

  // Hospital Prefix
  const [newHospitalUnit, setNewHospitalUnit] = useState('');
  const [newHospitalPfx, setNewHospitalPfx] = useState('');
  const [newExamSchool, setNewExamSchool] = useState('');
  const [newExamLevel, setNewExamLevel] = useState('');
  const [newExamInternSet, setNewExamInternSet] = useState('');
  const [newRosterFeed, setNewRosterFeed] = useState('');
  const [newPatientType, setNewPatientType] = useState('');
  const [newDetailKey, setNewDetailKey] = useState('');
  const [newExamDifficulty, setNewExamDifficulty] = useState('');
  const [newQcParameter, setNewQcParameter] = useState('');
  
  // Nature mapping states
  const [newSampleTypeForNature, setNewSampleTypeForNature] = useState('');
  const [newNatureUnderType, setNewNatureUnderType] = useState('');

  // QC criteria category states
  const [newCriteriaType, setNewCriteriaType] = useState('');
  const [newCriteriaItemInCat, setNewCriteriaItemInCat] = useState<Record<string, string>>({});
  

  // Protocol form states (lifted from protocols tab)
  const [showCreateProtocol, setShowCreateProtocol] = useState(false);
  const [editProtocolId, setEditProtocolId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pSampleTypes, setPSampleTypes] = useState<string[]>([]);
  const [pSteps, setPSteps] = useState<{reagent:string;duration:string;concentration:string;temperature?:string}[]>([]);
  const [newStepReagent, setNewStepReagent] = useState('');
  const [newStepDuration, setNewStepDuration] = useState('');
  const [newStepConc, setNewStepConc] = useState('');
  const [newStepTemp, setNewStepTemp] = useState('');

  const toggleColumn = (key: keyof typeof settings.visibleColumns) => {
    updateSettings({ visibleColumns: { ...settings.visibleColumns, [key]: !settings.visibleColumns[key] } });
  };

  const handleAddVariable = (category: any, value: string, clear: () => void) => {
    const items = value.split('*').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    items.forEach(item => addVariable(category, item));
    clear();
  };

  const handleAddNatureUnderType = () => {
    const val = newNatureUnderType.trim();
    if (!val || !newSampleTypeForNature) return;
    const items = val.split('*').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return;

    let natureList = [...settings.variables.natureOfSamples];
    const mapping = { ...(settings.variables.natureOfSampleTypes || {}) };

    items.forEach(item => {
      if (!natureList.includes(item)) {
        natureList.push(item);
      }
      const types = mapping[item] || [];
      if (!types.includes(newSampleTypeForNature)) {
        mapping[item] = [...types, newSampleTypeForNature];
      }
    });

    updateSettings({
      variables: {
        ...settings.variables,
        natureOfSamples: natureList,
        natureOfSampleTypes: mapping,
      }
    });
    setNewNatureUnderType('');
  };

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateChecklist.trim()) return;
    const template = { id: crypto.randomUUID(), name: newTemplateName.trim(), checklist: newTemplateChecklist.split('\n').map(s => s.trim()).filter(Boolean) };
    updateSettings({ variables: { ...settings.variables, maintenanceTemplates: [...settings.variables.maintenanceTemplates, template] } });
    setNewTemplateName(''); setNewTemplateChecklist('');
  };

  const removeTemplate = (id: string) => {
    updateSettings({ variables: { ...settings.variables, maintenanceTemplates: settings.variables.maintenanceTemplates.filter(t => t.id !== id) } });
  };

  const handleAddPersonnel = (type: 'residentDoctors' | 'mlsOnCall', name: string, initials: string, clearName: () => void, clearInitials: () => void) => {
    if (!name.trim() || !initials.trim()) return;
    const person: Personnel = { id: crypto.randomUUID(), name: name.trim(), initials: initials.trim().toUpperCase() };
    updateSettings({ variables: { ...settings.variables, [type]: [...settings.variables[type], person] } });
    clearName(); clearInitials();
  };

  const removePersonnel = (type: 'residentDoctors' | 'mlsOnCall', id: string) => {
    updateSettings({ variables: { ...settings.variables, [type]: settings.variables[type].filter(p => p.id !== id) } });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    addRole({ id: crypto.randomUUID(), name: newRoleName.trim(), isDefault: false, permissions: newRolePermissions });
    setNewRoleName(''); setNewRolePermissions([]);
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim() || !userForm.raNumber.trim() || !userForm.phone.trim()) return;
    if (!userForm.gender) {
      toast.error('Please select a gender.');
      return;
    }
    setSavingUser(true);
    try {
      if (editingUser) {
        // If password changed, update via edge function
        if (userForm.password && userForm.email) {
          // We can't update password via admin API easily, just update local record
        }
        updateSystemUser(editingUser, { ...userForm, updatedAt: new Date() });
        setEditingUser(null);
        toast.success('User updated');
      } else {
        // Create auth user via edge function so they appear in Lovable Cloud
        if (userForm.email && userForm.password) {
          const { data, error } = await supabase.functions.invoke('create-auth-user', {
            body: { email: userForm.email, password: userForm.password },
          });
          if (error) {
            toast.error('Failed to create auth user: ' + error.message);
            setSavingUser(false);
            return;
          }
          if (data?.error) {
            toast.error('Auth error: ' + data.error);
            setSavingUser(false);
            return;
          }
          // Store the auth user ID with the system user
          if (!data?.userId) {
            toast.error('Could not determine the new auth user ID; user was not saved.');
            setSavingUser(false);
            return;
          }
          await addSystemUser({ ...userForm, id: data.userId, isActive: true, createdAt: new Date(), updatedAt: new Date() });
          toast.success('User created and registered for authentication');
        } else {
          // The system_users table requires a real Supabase Auth account
          // (its id column references auth.users), so email + password are
          // mandatory — there is no "local-only" user anymore.
          toast.error('Email and password are required to create a user.');
          setSavingUser(false);
          return;
        }
      }
      setShowAddUser(false);
      setUserForm({ name: '', gender: '', raNumber: '', phone: '', email: '', office: 'MLS', designation: '', roleId: settings.defaultRoleId, password: '' });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const variableSection = (title: string, items: string[], category: any, value: string, setValue: (v: string) => void) => (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
      <h3 className="font-display font-semibold">{title}</h3>
      <div className="flex gap-2">
        <Input placeholder={`Add ${title.toLowerCase()}...`} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddVariable(category, value, () => setValue(''))} />
        <Button size="icon" onClick={() => handleAddVariable(category, value, () => setValue(''))}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(v => (
          <Badge key={v} variant="secondary" className="gap-1 py-1">
            {v}
            <button onClick={() => setDeleteAction(() => () => removeVariable(category, v))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
    </div>
  );

  const personnelSection = (title: string, type: 'residentDoctors' | 'mlsOnCall', items: Personnel[], name: string, setName: (v: string) => void, initials: string, setInitials: (v: string) => void) => (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
      <h3 className="font-display font-semibold">{title}</h3>
      <div className="flex gap-2">
        <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="flex-1" />
        <Input placeholder="Initials" value={initials} onChange={e => setInitials(e.target.value)} className="w-28" maxLength={4} />
        <Button size="icon" onClick={() => handleAddPersonnel(type, name, initials, () => setName(''), () => setInitials(''))}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-1">
        {items.map(p => (
          <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
            <span className="text-sm"><span className="font-bold font-mono">{p.initials}</span> — {p.name}</span>
            <button onClick={() => setDeleteAction(() => () => removePersonnel(type, p.id))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const filteredUsers = systemUsers;

  const toggleCatExpand = (id: string) => {
    setExpandedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Layout hideSidebar>
      <div className="flex flex-col md:flex-row gap-0 min-h-[calc(100vh-3.5rem)] -mx-6 -mt-6">
        {/* Settings Left Sidebar */}
        <div className="w-full md:w-56 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col md:sticky md:top-0 md:h-[calc(100vh-3.5rem)] md:self-start">
          <div className="px-4 py-5 border-b border-sidebar-border shrink-0">
            <h2 className="text-base font-display font-bold text-sidebar-foreground/90">Settings</h2>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {allSettingsMenu
              .filter(item => !item.requiresAdmin || canManageSettings)
              .map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  activeTab === item.key
                    ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}>
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">

            {activeTab === 'profile' && (() => {
              const myUser = systemUsers.find(u => u.id === currentUser?.id);
              return (
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">My Profile</h3>
                  {myUser ? (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{myUser.name}</p></div>
                        <div><Label className="text-muted-foreground">Gender</Label><p className="font-medium">{myUser.gender}</p></div>
                        <div><Label className="text-muted-foreground">RA Number</Label><p className="font-mono font-medium">{myUser.raNumber}</p></div>
                        <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{myUser.phone}</p></div>
                        <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{myUser.email || '—'}</p></div>
                        <div><Label className="text-muted-foreground">Office</Label><p className="font-medium">{myUser.office}</p></div>
                        <div><Label className="text-muted-foreground">Designation</Label><p className="font-medium">{myUser.designation || '—'}</p></div>
                        <div><Label className="text-muted-foreground">Role</Label><p className="font-medium">{settings.roles.find(r => r.id === myUser.roleId)?.name || '—'}</p></div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Profile not found.</p>
                  )}
                </div>
              );
            })()}

            {activeTab === 'sitePrefixes' && (
              <div className="space-y-6">
                {/* Site Name */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">Site Name</h3>
                  <p className="text-sm text-muted-foreground">Change the site name displayed across the app (default: Histobox).</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={(settings as any).siteName || 'Histobox'}
                      onChange={e => updateSettings({ siteName: e.target.value } as any)}
                      className="w-60"
                      placeholder="e.g. Histobox"
                    />
                  </div>
                </div>

                {/* ID Prefix */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">ID Prefix</h3>
                  <p className="text-sm text-muted-foreground">Set the prefix for unique case IDs (e.g. HBX-A1B2C3D4)</p>
                  <div className="flex gap-2 items-center">
                    <Input value={idPrefix} onChange={e => setIdPrefix(e.target.value)} className="w-40" placeholder="e.g. HBX" />
                    <Button onClick={() => updateSettings({ idPrefix })} disabled={idPrefix === settings.idPrefix}>Save</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Current: <span className="font-mono font-bold">{settings.idPrefix}-XXXXXXXX</span></p>
                </div>

                {/* Hospital Prefixes */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">Hospital Prefixes</h3>
                  <p className="text-sm text-muted-foreground">Map hospital units to lab number prefixes used during case entry.</p>
                  <div className="flex gap-2">
                    <Input placeholder="Hospital Unit (e.g. Ife Hospital Unit)" value={newHospitalUnit} onChange={e => setNewHospitalUnit(e.target.value)} className="flex-1" />
                    <Input placeholder="Prefix (e.g. H)" value={newHospitalPfx} onChange={e => setNewHospitalPfx(e.target.value)} className="w-24" />
                    <Button size="icon" onClick={() => {
                      if (newHospitalUnit.trim() && newHospitalPfx.trim()) {
                        const hp: HospitalPrefix = { id: crypto.randomUUID(), hospitalUnit: newHospitalUnit.trim(), prefix: newHospitalPfx.trim().toUpperCase() };
                        updateSettings({ variables: { ...settings.variables, hospitalPrefixes: [...(settings.variables.hospitalPrefixes || []), hp] } });
                        setNewHospitalUnit(''); setNewHospitalPfx('');
                      }
                    }}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    {(settings.variables.hospitalPrefixes || []).map(hp => (
                      <div key={hp.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <span className="text-sm"><span className="font-medium">{hp.hospitalUnit}</span> → <span className="font-mono font-bold text-primary">{hp.prefix}</span></span>
                        <button onClick={() => setDeleteAction(() => () => updateSettings({ variables: { ...settings.variables, hospitalPrefixes: settings.variables.hospitalPrefixes.filter(h => h.id !== hp.id) } }))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'columns' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-5 shadow-sm">
                <div>
                  <h3 className="font-display font-semibold">Site-wide Unique Identifier</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose one column to serve as the case identifier everywhere (Cases, Bench Flow, Microscopy, Slide Movement, Sign Out, Query, Request, etc.). The chosen column is always visible sitewide and cannot be hidden.
                  </p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.keys(settings.visibleColumns).map((key) => {
                      const active = settings.uniqueIdentifierColumn === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateSettings({ uniqueIdentifierColumn: key as any, visibleColumns: { ...settings.visibleColumns, [key]: true } })}
                          className={cn(
                            'text-left text-sm px-3 py-2 rounded-lg border transition',
                            active
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-border hover:bg-accent/40'
                          )}
                        >
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          {active && <span className="ml-2 text-[10px] uppercase tracking-wide">Identifier</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="font-display font-semibold">Overview Visible Columns</h3>
                  <div className="space-y-3 mt-3">
                    {Object.entries(settings.visibleColumns).map(([key, value]) => {
                      const isIdentifier = settings.uniqueIdentifierColumn === key;
                      return (
                        <label key={key} className="flex items-center justify-between">
                          <span className="text-sm capitalize flex items-center gap-2">
                            {key.replace(/([A-Z])/g, ' $1')}
                            {isIdentifier && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                Identifier
                              </span>
                            )}
                          </span>
                          <Switch
                            checked={Boolean(value)}
                            disabled={isIdentifier}
                            onCheckedChange={() => !isIdentifier && toggleColumn(key as any)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'variables' && (
              <div className="space-y-6">
                {/* Types of Samples */}
                {variableSection('Types of Samples', settings.variables.typesOfSamples, 'typesOfSamples', newType, setNewType)}

                {/* Nature of Samples mapping under types */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">Nature of Samples</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a Type of Sample first, then add Natures under it. A Nature can be assigned to more than one Type by adding it under each.
                  </p>
                  
                  {settings.variables.typesOfSamples.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Add a Type of Sample above first.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto] gap-2">
                        <Select value={newSampleTypeForNature} onValueChange={setNewSampleTypeForNature}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Type of Sample" />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.variables.typesOfSamples.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder={newSampleTypeForNature ? `Add Nature under "${newSampleTypeForNature}"... (comma-separated)` : "Pick a Type first"}
                          value={newNatureUnderType}
                          disabled={!newSampleTypeForNature}
                          onChange={e => setNewNatureUnderType(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleAddNatureUnderType();
                            }
                          }}
                        />

                        <Button
                          size="icon"
                          disabled={!newSampleTypeForNature || !newNatureUnderType.trim()}
                          onClick={handleAddNatureUnderType}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {settings.variables.typesOfSamples.map(type => {
                          const mapping = settings.variables.natureOfSampleTypes || {};
                          const getTypesForNature = (nat: string, map: any) => map[nat] || [];
                          const naturesForThisType = settings.variables.natureOfSamples.filter(
                            nat => getTypesForNature(nat, mapping).includes(type)
                          );

                          return (
                            <div key={type} className="border border-border rounded-lg p-3 space-y-2">
                              <p className="text-sm font-semibold">
                                {type} <span className="text-xs text-muted-foreground font-normal">({naturesForThisType.length})</span>
                              </p>

                              {naturesForThisType.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No natures yet — pick this Type above and add one.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {naturesForThisType.map(nat => (
                                    <Badge key={nat} variant="secondary" className="gap-1 py-1">
                                      {nat}
                                      <button
                                        onClick={() => setDeleteAction(() => () => {
                                          const map = { ...(settings.variables.natureOfSampleTypes || {}) };
                                          const currentTypes = map[nat] || [];
                                          map[nat] = currentTypes.filter(t => t !== type);

                                          let allNatures = settings.variables.natureOfSamples;
                                          if (map[nat].length === 0) {
                                            delete map[nat];
                                            allNatures = allNatures.filter(n => n !== nat);
                                          }

                                          updateSettings({
                                            variables: {
                                              ...settings.variables,
                                              natureOfSamples: allNatures,
                                              natureOfSampleTypes: map,
                                            }
                                          });
                                        })}
                                        className="hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Nationality */}
                {variableSection('Nationality', settings.variables.nationalities, 'nationalities', newNationality, setNewNationality)}
              </div>
            )}

            {activeTab === 'caseSetup' && (
              <div className="space-y-4">
                <h3 className="text-lg font-display font-semibold">Case Setup — Field Visibility</h3>
                <p className="text-sm text-muted-foreground">
                  Toggle which fields appear in the Add Entry form. Disabled fields are hidden from staff.
                </p>
                <div className="space-y-2">
                  {[
                    { key: 'surname', label: 'Surname' },
                    { key: 'firstName', label: 'First Name' },
                    { key: 'middleName', label: 'Middle Name' },
                    { key: 'age', label: 'Age' },
                    { key: 'gender', label: 'Gender' },
                    { key: 'nationality', label: 'Nationality' },
                    { key: 'occupation', label: 'Occupation' },
                    { key: 'ward', label: 'Ward' },
                    { key: 'consultant', label: 'Consultant' },
                    { key: 'hospitalNumber', label: 'Hospital / Lab No.' },
                    { key: 'typeOfSample', label: 'Type of Sample' },
                    { key: 'natureOfSample', label: 'Nature of Sample' },
                    { key: 'patientType', label: 'Patient Type' },
                    { key: 'examination', label: 'Examination' },
                    { key: 'provisionalDiagnosis', label: 'Provisional Diagnosis' },
                    { key: 'clinicalDetails', label: 'Clinical Details' },
                    { key: 'gross', label: 'Gross Description' }
                  ].map(f => {
                    const cfg = settings.variables.fieldConfig?.[f.key] || { required: false, enabled: true };
                    return (
                      <div key={f.key} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                        <div className="flex items-center gap-2">
                          {!cfg.enabled && <span className="text-xs text-muted-foreground">🚫</span>}
                          <span className="text-sm font-medium">{f.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Switch
                              checked={cfg.required}
                              onCheckedChange={v => {
                                const newConfig = {
                                  ...(settings.variables.fieldConfig || {}),
                                  [f.key]: {
                                    ...(settings.variables.fieldConfig?.[f.key] || { enabled: true }),
                                    required: v
                                  }
                                };
                                updateSettings({
                                  variables: {
                                    ...settings.variables,
                                    fieldConfig: newConfig
                                  }
                                });
                              }}
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Switch
                              checked={cfg.enabled !== false}
                              onCheckedChange={v => {
                                const newConfig = {
                                  ...(settings.variables.fieldConfig || {}),
                                  [f.key]: {
                                    ...(settings.variables.fieldConfig?.[f.key] || { required: false }),
                                    enabled: v
                                  }
                                };
                                updateSettings({
                                  variables: {
                                    ...settings.variables,
                                    fieldConfig: newConfig
                                  }
                                });
                              }}
                            />
                            Visible
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'qcCriteria' && (
              <div className="space-y-4">
                <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                  <h3 className="font-display font-semibold">Criteria Types</h3>
                  <p className="text-sm text-muted-foreground">
                    Create criteria types (e.g. Adequacy, Morphology) and add criteria items under each. These criteria will be available for QC during microscopy and sign-out.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New criteria type (e.g. Adequacy)..."
                      value={newCriteriaType}
                      onChange={e => setNewCriteriaType(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCriteriaType.trim()) {
                          addQcCriteriaCategory({ id: crypto.randomUUID(), name: newCriteriaType.trim(), items: [] });
                          setNewCriteriaType('');
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={() => {
                        if (newCriteriaType.trim()) {
                          addQcCriteriaCategory({ id: crypto.randomUUID(), name: newCriteriaType.trim(), items: [] });
                          setNewCriteriaType('');
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {(settings.variables.qcCriteriaCategories || []).map(cat => (
                  <div key={cat.id} className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {cat.name} <span className="text-xs text-muted-foreground font-normal">({cat.items.length} criteria)</span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteAction(() => () => removeQcCriteriaCategory(cat.id))}
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add to ${cat.name}... (comma-separated)`}
                        value={newCriteriaItemInCat[cat.id] || ''}
                        onChange={e => setNewCriteriaItemInCat({ ...newCriteriaItemInCat, [cat.id]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = (newCriteriaItemInCat[cat.id] || '').trim();
                            if (val) {
                              val.split(',').map(s => s.trim()).filter(Boolean).forEach(item => {
                                addQcCriteriaItem(cat.id, item);
                              });
                              setNewCriteriaItemInCat({ ...newCriteriaItemInCat, [cat.id]: '' });
                            }
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          const val = (newCriteriaItemInCat[cat.id] || '').trim();
                          if (val) {
                            val.split(',').map(s => s.trim()).filter(Boolean).forEach(item => {
                              addQcCriteriaItem(cat.id, item);
                            });
                            setNewCriteriaItemInCat({ ...newCriteriaItemInCat, [cat.id]: '' });
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.map(item => (
                        <Badge key={item} variant="secondary" className="gap-1 py-1 text-xs">
                          {item}
                          <button
                            onClick={() => setDeleteAction(() => () => removeQcCriteriaItem(cat.id, item))}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {cat.items.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No criteria yet — add some above</p>
                      )}
                    </div>
                  </div>
                ))}

                {(settings.variables.qcCriteriaCategories || []).length === 0 && (
                  <p className="text-sm text-muted-foreground italic px-1">
                    No criteria types yet — create one above to get started.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'stains' && (
              <div className="space-y-4">
                <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                  <h3 className="font-display font-semibold">Stain Categories</h3>
                  <p className="text-sm text-muted-foreground">Create categories (e.g. Special Stain, IHC) and add individual stains under each.</p>
                  <div className="flex gap-2">
                    <Input placeholder="New category name..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          addStainCategory({ id: crypto.randomUUID(), name: newCategoryName.trim(), stains: [] });
                          setNewCategoryName('');
                        }
                      }} />
                    <Button size="icon" onClick={() => {
                      if (newCategoryName.trim()) {
                        addStainCategory({ id: crypto.randomUUID(), name: newCategoryName.trim(), stains: [] });
                        setNewCategoryName('');
                      }
                    }}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>

                {settings.variables.stainCategories.map(cat => (
                  <div key={cat.id} className="bg-card rounded-xl border border-border p-4 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <button className="flex items-center gap-2 font-semibold text-sm" onClick={() => toggleCatExpand(cat.id)}>
                        {expandedCats.includes(cat.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {cat.name}
                        <Badge variant="secondary" className="text-[10px]">{cat.stains.length}</Badge>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteAction(() => () => removeStainCategory(cat.id))} className="text-destructive hover:text-destructive"><X className="h-3 w-3" /></Button>
                    </div>
                    {expandedCats.includes(cat.id) && (
                      <div className="space-y-2 ml-6">
                        <div className="flex gap-2">
                          <Input
                            placeholder={`Add stain to ${cat.name}...`}
                            value={newStainInCat[cat.id] || ''}
                            onChange={e => setNewStainInCat({ ...newStainInCat, [cat.id]: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && (newStainInCat[cat.id] || '').trim()) {
                                addStainToCategory(cat.id, newStainInCat[cat.id].trim());
                                setNewStainInCat({ ...newStainInCat, [cat.id]: '' });
                              }
                            }}
                          />
                          <Button size="icon" onClick={() => {
                            if ((newStainInCat[cat.id] || '').trim()) {
                              addStainToCategory(cat.id, newStainInCat[cat.id].trim());
                              setNewStainInCat({ ...newStainInCat, [cat.id]: '' });
                            }
                          }}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.stains.map(s => (
                            <Badge key={s} variant="secondary" className="gap-1 py-1 text-xs">
                              {s}
                              <button onClick={() => setDeleteAction(() => () => removeStainFromCategory(cat.id, s))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                          {cat.stains.length === 0 && <p className="text-xs text-muted-foreground">No stains yet — add some above</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'requestTypes' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                <h3 className="font-display font-semibold">Request Types</h3>
                <p className="text-sm text-muted-foreground">Type to add, or click a stain category below to add as request type.</p>
                <div className="flex gap-2">
                  <Input placeholder="Add request type..." value={newRequestType} onChange={e => setNewRequestType(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddVariable('requestTypes', newRequestType, () => setNewRequestType(''))} />
                  <Button size="icon" onClick={() => handleAddVariable('requestTypes', newRequestType, () => setNewRequestType(''))}><Plus className="h-4 w-4" /></Button>
                </div>
                {/* Show stain categories as quick-add buttons */}
                <div className="flex flex-wrap gap-2">
                  {settings.variables.stainCategories
                    .filter(cat => !settings.variables.requestTypes.includes(cat.name))
                    .map(cat => (
                      <Button key={cat.id} variant="outline" size="sm" className="text-xs h-7" onClick={() => addVariable('requestTypes', cat.name)}>
                        <Plus className="h-3 w-3 mr-1" /> {cat.name}
                      </Button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.variables.requestTypes.map(v => (
                    <Badge key={v} variant="secondary" className="gap-1 py-1">
                      {v}
                      <button onClick={() => setDeleteAction(() => () => removeVariable('requestTypes', v))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'personnel' && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                  <h3 className="font-display font-semibold">Histopathology Staff</h3>
                  <div className="flex gap-2">
                    <Select value={newMlsUserId} onValueChange={setNewMlsUserId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select registered user..." /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const available = systemUsers.filter(u => u.isActive && !settings.variables.mlsOnCall.some(p => p.name === u.name));
                          if (available.length === 0) {
                            return <div className="px-3 py-2 text-sm text-muted-foreground">No available users</div>;
                          }
                          return available.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.office})</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Initials" value={newMlsInitials} onChange={e => setNewMlsInitials(e.target.value)} className="w-28" maxLength={4} />
                    <Button size="icon" onClick={() => {
                      if (!newMlsUserId || !newMlsInitials.trim()) return;
                      const u = systemUsers.find(x => x.id === newMlsUserId);
                      if (!u) return;
                      if (settings.variables.mlsOnCall.some(p => p.name === u.name)) {
                        toast.error('Already added');
                        return;
                      }
                      const person: Personnel = { id: crypto.randomUUID(), name: u.name, initials: newMlsInitials.trim().toUpperCase() };
                      updateSettings({ variables: { ...settings.variables, mlsOnCall: [...settings.variables.mlsOnCall, person] } });
                      setNewMlsUserId(''); setNewMlsInitials('');
                    }} disabled={!newMlsUserId || !newMlsInitials.trim()}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1">
                    {settings.variables.mlsOnCall.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                        <span className="text-sm"><span className="font-bold font-mono">{p.initials}</span> — {p.name}</span>
                        <button onClick={() => setDeleteAction(() => () => removePersonnel('mlsOnCall', p.id))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                {personnelSection('Pathology Staff', 'residentDoctors', settings.variables.residentDoctors, newDoctorName, setNewDoctorName, newDoctorInitials, setNewDoctorInitials)}
              </div>
            )}

            {activeTab === 'reportTypes' && (
              <div className="space-y-6">
                {variableSection('Report Types', settings.variables.reportTypes, 'reportTypes', newReportType, setNewReportType)}
                {variableSection('Report Locations', settings.variables.reportLocations, 'reportLocations', newReportLocation, setNewReportLocation)}
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">Maintenance Templates</h3>
                  <div className="space-y-3">
                    <Input placeholder="Template name" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} />
                    <textarea placeholder="Checklist items (one per line)" value={newTemplateChecklist} onChange={e => setNewTemplateChecklist(e.target.value)}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={4} />
                    <Button onClick={handleAddTemplate} disabled={!newTemplateName.trim()}><Plus className="mr-2 h-4 w-4" /> Add Template</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {settings.variables.maintenanceTemplates.map(t => (
                    <div key={t.id} className="bg-card rounded-xl border border-border p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{t.name}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteAction(() => () => removeTemplate(t.id))} className="text-destructive hover:text-destructive"><X className="h-3 w-3" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.checklist.map((item, i) => <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'roles' && (() => {
              const PERMISSION_GROUPS: { name: string; perms: string[] }[] = [
                { name: 'Overview', perms: ['view_overview'] },
                { name: 'Cases & Entry', perms: ['view_cases','add_entry','edit_entry','delete_entry'] },
                { name: 'Bench Flow', perms: ['bench_fixation','bench_processing','bench_embedding','bench_microtomy','bench_cyto_analysis','bench_staining','bench_mounting'] },
                { name: 'Microscopy', perms: ['view_microscopy','submit_microscopy'] },
                { name: 'Slide Movement', perms: ['view_slide_movement','mark_slide_movement','confirm_slide_movement','raise_slide_movement_issue'] },
                { name: 'Case Sign Out', perms: ['view_signout','add_signout','edit_signout','signout_approve'] },
                { name: 'Quality Control', perms: ['view_qc','add_qc','edit_qc','delete_qc'] },
                { name: 'Reports', perms: ['view_reports','add_reports','edit_reports','delete_reports'] },
                { name: 'Maintenance', perms: ['view_maintenance','add_maintenance','edit_maintenance','delete_maintenance'] },
                { name: 'Reagent', perms: ['view_reagent','add_reagent','edit_reagent','delete_reagent'] },
                { name: 'Immuno Reagent', perms: ['view_immuno_reagent','add_immuno_reagent','edit_immuno_reagent','delete_immuno_reagent'] },
                { name: 'Immuno Manual', perms: ['view_immuno_manual','add_immuno_manual','edit_immuno_manual','delete_immuno_manual'] },
                { name: 'Lab Inventory', perms: ['view_lab_supply','add_lab_supply','edit_lab_supply','delete_lab_supply'] },
                { name: 'Request', perms: ['view_requests','add_requests','edit_requests','delete_requests','manage_requests'] },
                { name: 'Query', perms: ['view_query','add_query','edit_query','delete_query','manage_query'] },
                { name: 'Exam', perms: ['view_exam','add_exam','edit_exam','delete_exam'] },
                { name: 'Roster', perms: ['view_roster','add_roster','edit_roster','delete_roster'] },
                { name: 'Misc', perms: ['view_misc','add_misc','edit_misc','delete_misc'] },
                { name: 'Misc → Labels', perms: ['view_misc_label','add_misc_label','edit_misc_label','delete_misc_label'] },
                { name: 'Misc → Sub-Items', perms: ['view_misc_subitem','add_misc_subitem','edit_misc_subitem','delete_misc_subitem'] },
                { name: 'Stain Data', perms: ['view_stain_data','add_stain_data','edit_stain_data','delete_stain_data'] },
                { name: 'Delayed Cases', perms: ['view_delayed_cases','manage_delayed_cases'] },
                { name: 'Flagged Cases', perms: ['view_flagged_cases','manage_flagged_cases'] },
                { name: 'Administration', perms: ['manage_settings','manage_roles','manage_users','register_users','manage_db_sync'] },
              ];
              const currentRoleId = acSelectedRoleId ?? settings.roles[0]?.id ?? null;
              const currentRole = settings.roles.find(r => r.id === currentRoleId) || null;
              const rolePerms = new Set(currentRole?.permissions ?? []);
              const allPermIds = ALL_PERMISSIONS.map(p => p);
              const allSelected = currentRole ? allPermIds.every(p => rolePerms.has(p)) : false;

              const togglePerm = (perm: string, on: boolean) => {
                if (!currentRole) return;
                const next = new Set(rolePerms);
                if (on) next.add(perm); else next.delete(perm);
                updateRole(currentRole.id, { permissions: Array.from(next) });
              };
              const toggleGroup = (perms: string[], on: boolean) => {
                if (!currentRole) return;
                const next = new Set(rolePerms);
                for (const p of perms) { if (on) next.add(p); else next.delete(p); }
                updateRole(currentRole.id, { permissions: Array.from(next) });
              };
              const toggleAll = (on: boolean) => {
                if (!currentRole) return;
                updateRole(currentRole.id, { permissions: on ? [...allPermIds] : [] });
              };

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                    {/* Roles list */}
                    <div className="bg-card rounded-xl border border-border shadow-sm">
                      <div className="p-4 border-b border-border">
                        <h3 className="font-display font-semibold text-base">Roles</h3>
                        <div className="mt-3 flex gap-2">
                          <Input placeholder="New role name" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="h-9 text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleAddRole()} />
                          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAddRole} disabled={!newRoleName.trim()}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2 space-y-0.5 max-h-[500px] overflow-y-auto">
                        {settings.roles.map(role => {
                          const active = role.id === currentRoleId;
                          return (
                            <div
                              key={role.id}
                              className={cn(
                                'group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition',
                                active ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent/40'
                              )}
                              onClick={() => setAcSelectedRoleId(role.id)}
                            >
                              <span className="truncate flex-1 min-w-0">{role.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {role.isDefault
                                  ? <span className="text-[10px] text-primary/70 uppercase tracking-wide font-semibold px-1">default</span>
                                  : (
                                    <button
                                      title="Set as default role for new users"
                                      onClick={(e) => { e.stopPropagation(); setDefaultRole(role.id); toast.success(`"${role.name}" set as default role`); }}
                                      className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-primary uppercase tracking-wide px-1"
                                    >
                                      set default
                                    </button>
                                  )
                                }
                                {role.id !== 'role-superuser' && !role.isDefault && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteAction(() => () => removeRole(role.id)); }}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Permissions matrix */}
                    <div className="bg-card rounded-xl border border-border shadow-sm">
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <div className="text-base font-display font-semibold">
                          Permissions {currentRole && <span className="text-muted-foreground font-normal">— {currentRole.name}</span>}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                          Auto-saved
                        </span>
                      </div>
                      {!currentRole ? (
                        <div className="p-6 text-sm text-muted-foreground">Select a role to edit its permissions.</div>
                      ) : (
                        <div className="p-4 space-y-3">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                            Select All
                          </label>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {PERMISSION_GROUPS.map(group => {
                              const total = group.perms.length;
                              const onCount = group.perms.filter(p => rolePerms.has(p)).length;
                              const allOn = onCount === total;
                              const expanded = acExpandedGroups[group.name] ?? true;
                              return (
                                <div key={group.name} className="border border-border rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                                      <Checkbox
                                        checked={allOn ? true : (onCount > 0 ? ('indeterminate' as any) : false)}
                                        onCheckedChange={(v) => toggleGroup(group.perms, !!v)}
                                      />
                                      {group.name}
                                    </label>
                                    <button
                                      className="flex items-center gap-2 text-xs text-muted-foreground"
                                      onClick={() => setAcExpandedGroups(s => ({ ...s, [group.name]: !expanded }))}
                                    >
                                      <span>{onCount}/{total}</span>
                                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                  {expanded && (
                                    <div className="px-3 py-2 space-y-1.5">
                                      {group.perms.map(p => (
                                        <label key={p} className="flex items-center gap-2 text-sm">
                                          <Checkbox
                                            checked={rolePerms.has(p)}
                                            onCheckedChange={(v) => togglePerm(p, !!v)}
                                          />
                                          {PERMISSION_LABELS[p] || p}
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Assignments */}
                  <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-display font-semibold text-base">User Assignments</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-left">
                            <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground w-56">Role</th>
                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {systemUsers.map(u => (
                            <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">{u.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{u.email || '—'}</td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary" className="text-[10px] bg-success/15 text-success border-0">Active</Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Select value={u.roleId} onValueChange={(v) => {
                                  updateSystemUser(u.id, { roleId: v });
                                  const roleName = settings.roles.find(r => r.id === v)?.name || 'role';
                                  toast.success(`${u.name} assigned to ${roleName}`);
                                }}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {settings.roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" onClick={() => {
                                  setEditingUser(u.id);
                                  setUserForm({ name: u.name, gender: u.gender, raNumber: u.raNumber, phone: u.phone, email: u.email || '', office: u.office, designation: u.designation, roleId: u.roleId, password: '' });
                                  setShowAddUser(true);
                                }}>Edit</Button>
                              </td>
                            </tr>
                          ))}
                          {!systemUsers.length && (
                            <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No users yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}



            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">Users</h3>
                  <Button onClick={() => { setShowAddUser(true); setEditingUser(null); setUserForm({ name: '', gender: '', raNumber: '', phone: '', email: '', office: 'MLS', designation: '', roleId: settings.defaultRoleId, password: '' }); }}>
                    <Plus className="mr-2 h-4 w-4" /> Register User
                  </Button>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">RA Number</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Office</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Designation</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => {
                        const role = settings.roles.find(r => r.id === u.roleId);
                        return (
                          <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{u.name}</td>
                            <td className="px-4 py-3 font-mono text-xs">{u.raNumber}</td>
                            <td className="px-4 py-3 text-xs">{officeLabels[u.office]}</td>
                            <td className="px-4 py-3 text-xs">{u.designation}</td>
                            <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{role?.name || '—'}</Badge></td>
                            <td className="px-4 py-3">
                              <Button size="sm" variant="ghost" onClick={() => {
                                setEditingUser(u.id);
                                setUserForm({ name: u.name, gender: u.gender, raNumber: u.raNumber, phone: u.phone, email: u.email || '', office: u.office, designation: u.designation, roleId: u.roleId, password: '' });
                                setShowAddUser(true);
                              }}>Edit</Button>
                              {u.id !== currentUser?.id && (
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteAction(() => async () => {
                                  try {
                                    await supabase.functions.invoke('delete-auth-user', { body: { userId: u.id } });
                                  } catch { /* ignore — still remove locally */ }
                                  deleteSystemUser(u.id);
                                  toast.success('User deleted');
                                })}>Delete</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}



            {activeTab === 'protocols' && (() => {
              const protocols = settings.variables.protocols || [];
              const sampleTypes = settings.variables.typesOfSamples || [];

              const resetProtocolForm = () => { setPName(''); setPSampleTypes([]); setPSteps([]); setNewStepReagent(''); setNewStepDuration(''); setNewStepConc(''); setNewStepTemp(''); };

              const handleAddStep = () => {
                if (!newStepReagent.trim()) return;
                setPSteps([...pSteps, { reagent: newStepReagent.trim(), duration: newStepDuration.trim(), concentration: newStepConc.trim(), temperature: newStepTemp.trim() || undefined }]);
                setNewStepReagent(''); setNewStepDuration(''); setNewStepConc(''); setNewStepTemp('');
              };

              const handleSaveProtocol = () => {
                if (!pName.trim() || pSampleTypes.length === 0) { toast.error('Name and at least one sample type required.'); return; }
                if (editProtocolId) {
                  updateSettings({ variables: { ...settings.variables, protocols: protocols.map(p => p.id === editProtocolId ? { ...p, name: pName.trim(), sampleTypes: pSampleTypes, steps: pSteps } : p) } });
                  setEditProtocolId(null);
                } else {
                  const newP = { id: crypto.randomUUID(), name: pName.trim(), sampleTypes: pSampleTypes, steps: pSteps };
                  updateSettings({ variables: { ...settings.variables, protocols: [...protocols, newP] } });
                }
                resetProtocolForm();
                setShowCreateProtocol(false);
              };

              const startEdit = (p: any) => {
                setEditProtocolId(p.id);
                setPName(p.name);
                setPSampleTypes([...p.sampleTypes]);
                setPSteps([...p.steps]);
                setShowCreateProtocol(true);
              };

              return (
                <div className="space-y-4">
                  <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold">Processing Protocols</h3>
                        <p className="text-sm text-muted-foreground">Manage tissue processing protocols tied to sample types.</p>
                      </div>
                      <Button onClick={() => { resetProtocolForm(); setEditProtocolId(null); setShowCreateProtocol(true); }}><Plus className="h-4 w-4 mr-1" /> Add Protocol</Button>
                    </div>
                  </div>

                  <Dialog open={showCreateProtocol} onOpenChange={o => { if (!o) { setShowCreateProtocol(false); resetProtocolForm(); setEditProtocolId(null); } }}>
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>{editProtocolId ? 'Edit Protocol' : 'Create Protocol'}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Protocol Name *</Label><Input value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Standard Histology Overnight" /></div>
                        <div>
                          <Label>Sample Types *</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {sampleTypes.map(st => (
                              <label key={st} className="flex items-center gap-1.5 text-sm">
                                <Checkbox checked={pSampleTypes.includes(st)} onCheckedChange={v => setPSampleTypes(v ? [...pSampleTypes, st] : pSampleTypes.filter(x => x !== st))} />
                                {st}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Steps ({pSteps.length})</Label>
                          {pSteps.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {pSteps.map((s, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs bg-muted/50 rounded px-2 py-1.5">
                                  <span className="font-mono w-5 text-muted-foreground">{i+1}.</span>
                                  <span className="font-medium flex-1">{s.reagent}</span>
                                  <span>{s.duration}</span>
                                  <span>{s.concentration}</span>
                                  {s.temperature && <span>{s.temperature}</span>}
                                  <button onClick={() => setPSteps(pSteps.filter((_, ii) => ii !== i))} className="hover:text-destructive ml-1"><X className="h-3 w-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <Input placeholder="Reagent *" value={newStepReagent} onChange={e => setNewStepReagent(e.target.value)} className="text-xs" />
                            <Input placeholder="Duration" value={newStepDuration} onChange={e => setNewStepDuration(e.target.value)} className="text-xs" />
                            <Input placeholder="Conc." value={newStepConc} onChange={e => setNewStepConc(e.target.value)} className="text-xs" />
                            <div className="flex gap-1">
                              <Input placeholder="Temp" value={newStepTemp} onChange={e => setNewStepTemp(e.target.value)} className="text-xs flex-1" />
                              <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={handleAddStep}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCreateProtocol(false); resetProtocolForm(); setEditProtocolId(null); }}>Cancel</Button>
                        <Button onClick={handleSaveProtocol} disabled={!pName.trim() || pSampleTypes.length === 0}>{editProtocolId ? 'Save Changes' : 'Create Protocol'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {protocols.map(p => (
                    <div key={p.id} className="bg-card rounded-xl border border-border p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{p.name}</h4>
                          <div className="flex gap-1 mt-1">{p.sampleTypes.map(st => <Badge key={st} variant="secondary" className="text-[10px]">{st}</Badge>)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(p)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            updateSettings({ variables: { ...settings.variables, protocols: protocols.filter(x => x.id !== p.id) } });
                          }} className="text-destructive hover:text-destructive"><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.steps.length} steps</div>
                      <div className="space-y-1">
                        {p.steps.map((s, i) => (
                          <div key={i} className="flex gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                            <span className="font-mono w-6 text-muted-foreground">{i + 1}.</span>
                            <span className="font-medium">{s.reagent}</span>
                            <span>{s.duration}</span>
                            <span>{s.concentration}</span>
                            {s.temperature && <span>{s.temperature}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {protocols.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No protocols configured.</p>}
                </div>
              );
            })()}
            {activeTab === 'delays' && (
              <div className="space-y-4">
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">Case Delay Threshold</h3>
                  <p className="text-sm text-muted-foreground">Cases older than this many days are flagged as delayed.</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={settings.delayedDays || 7}
                      onChange={e => updateSettings({ delayedDays: parseInt(e.target.value) || 7 })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                  <h3 className="font-display font-semibold">Stain Delay Threshold</h3>
                  <p className="text-sm text-muted-foreground">If a case has multiple stains and at least one isn't out after this many hours, a stain delay flag is triggered.</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={(settings as any).stainDelayHours || 48}
                      onChange={e => updateSettings({ stainDelayHours: parseInt(e.target.value) || 48 } as any)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'examSettings' && (
              <div className="space-y-6">
                {variableSection('Schools', (settings.variables as any).examSchools || [], 'examSchools' as any, newExamSchool, setNewExamSchool)}
                {variableSection('Levels', (settings.variables as any).examLevels || [], 'examLevels' as any, newExamLevel, setNewExamLevel)}
                {variableSection('Intern Sets', (settings.variables as any).examInternSets || [], 'examInternSets' as any, newExamInternSet, setNewExamInternSet)}
                {variableSection('Exam Difficulties (Exam Bank)', (settings.variables as any).examDifficulties || [], 'examDifficulties' as any, newExamDifficulty, setNewExamDifficulty)}
              </div>
            )}

            {activeTab === 'rosterFeeds' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                <h3 className="font-display font-semibold">Roster Feeds (Table Headings)</h3>
                <p className="text-sm text-muted-foreground">Configure the column headings for rosters.</p>
                <div className="flex gap-2">
                  <Input placeholder="Feed name (e.g. Morning Shift)" value={newRosterFeed} onChange={e => setNewRosterFeed(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newRosterFeed.trim()) {
                        const feed = { id: crypto.randomUUID(), name: newRosterFeed.trim() };
                        const current = (settings.variables as any).rosterFeeds || [];
                        updateSettings({ variables: { ...settings.variables, rosterFeeds: [...current, feed] } as any });
                        setNewRosterFeed('');
                      }
                    }} />
                  <Button size="icon" onClick={() => {
                    if (newRosterFeed.trim()) {
                      const feed = { id: crypto.randomUUID(), name: newRosterFeed.trim() };
                      const current = (settings.variables as any).rosterFeeds || [];
                      updateSettings({ variables: { ...settings.variables, rosterFeeds: [...current, feed] } as any });
                      setNewRosterFeed('');
                    }
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-1">
                  {((settings.variables as any).rosterFeeds || []).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">{f.name}</span>
                      <button onClick={() => {
                        const current = (settings.variables as any).rosterFeeds || [];
                        updateSettings({ variables: { ...settings.variables, rosterFeeds: current.filter((x: any) => x.id !== f.id) } as any });
                      }} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'patientTypes' && (
              <div className="space-y-6">
                {variableSection('Patient Types', (settings.variables as any).patientTypes || [], 'patientTypes' as any, newPatientType, setNewPatientType)}
              </div>
            )}

            {activeTab === 'storageUnits' && (
              <div className="space-y-6">
                {variableSection('Storage Units (for Lab Inventory locations)', (settings.variables as any).storageUnits || [], 'storageUnits' as any, newDetailKey, setNewDetailKey)}
              </div>
            )}

            {activeTab === 'immunoSettings' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                <h3 className="font-display font-semibold">Immuno Depletion Threshold</h3>
                <p className="text-sm text-muted-foreground">Set the percentage at which a low-stock notification appears for immuno reagents.</p>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={(settings as any).immunoDepletionThreshold || 20}
                    onChange={e => updateSettings({ immunoDepletionThreshold: parseInt(e.target.value) || 20 } as any)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
                <h3 className="font-display font-semibold">Support / WhatsApp Link</h3>
                <p className="text-sm text-muted-foreground">Set a WhatsApp or support link shown on the login page. Users needing password changes or help will be directed here.</p>
                <div className="flex gap-2 items-center">
                  <Input
                    value={settings.supportLink || ''}
                    onChange={e => updateSettings({ supportLink: e.target.value })}
                    placeholder="https://wa.me/2347067137400"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Example: https://wa.me/2347067137400 or any support URL.</p>
              </div>
            )}

            {activeTab === 'miscTabs' && <MiscTabsManager />}

            {activeTab === 'qualityControl' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-3 shadow-sm">
                <h3 className="font-display font-semibold">Quality Control Parameters</h3>
                <p className="text-sm text-muted-foreground">These appear in the first dropdown of each QC check row on the Quality Control page. Separate multiple with *.</p>
                <div className="flex gap-2">
                  <Input placeholder="Add QC parameter..." value={newQcParameter} onChange={e => setNewQcParameter(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddVariable('qcParameters', newQcParameter, () => setNewQcParameter(''))} />
                  <Button size="icon" onClick={() => handleAddVariable('qcParameters', newQcParameter, () => setNewQcParameter(''))}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.variables.qcParameters || []).map(v => (
                    <Badge key={v} variant="secondary" className="gap-1 py-1">
                      {v}
                      <button onClick={() => setDeleteAction(() => () => removeVariable('qcParameters', v))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingUser ? 'Edit User' : 'Register User'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Full Name *" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={userForm.gender} onValueChange={v => setUserForm({ ...userForm, gender: v as any })}>
                    <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="RA Number *" value={userForm.raNumber} onChange={e => setUserForm({ ...userForm, raNumber: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Phone *" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} />
                  <Input placeholder="Email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={userForm.office} onValueChange={v => setUserForm({ ...userForm, office: v as OfficeType })}>
                    <SelectTrigger><SelectValue placeholder="Office" /></SelectTrigger>
                    <SelectContent>{officeTypes.map(o => <SelectItem key={o} value={o}>{o} — {officeLabels[o]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Designation" value={userForm.designation} onChange={e => setUserForm({ ...userForm, designation: e.target.value })} />
                </div>
                <Select value={userForm.roleId} onValueChange={v => {
                  setUserForm({ ...userForm, roleId: v });
                  if (editingUser) {
                    const roleName = settings.roles.find(r => r.id === v)?.name || 'role';
                    toast.success(`Role changed to ${roleName}`);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>{settings.roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="password" placeholder={editingUser ? 'New Password (leave blank to keep)' : 'Password *'} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
                <Button onClick={handleSaveUser} disabled={savingUser || !userForm.name.trim() || !userForm.raNumber.trim() || !userForm.phone.trim()}>
                  {savingUser ? 'Creating...' : editingUser ? 'Save Changes' : 'Register'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DeleteConfirmDialog
            open={!!deleteAction}
            onOpenChange={open => { if (!open) setDeleteAction(null); }}
            onConfirm={() => { deleteAction?.(); setDeleteAction(null); }}
          />
          </div>
        </div>
    </Layout>
  );
};

export default SettingsPage;
