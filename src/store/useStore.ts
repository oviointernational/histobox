import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { supabaseStorage, markHydrationSucceeded, subscribeToCloudState, applyRemoteStateWithoutEcho } from '@/lib/supabase-storage';
import { CaseEntry, AppSettings, User, LogEntry, CassetteLabel, SubItem, BenchStep, Report, Equipment, MaintenanceTemplate, MaintenanceLog, Personnel, SpecialRequest, QueryCase, SystemRole, SystemUser, StainCategory, CaseFlag, HospitalPrefix, ProcessingProtocol, QCCriteriaCategory, QualityControl } from '@/types';
import { Reagent, ReagentConsumable, ReagentManual } from '@/types/reagent';
import { ImmunoReagent, ImmunoRun } from '@/types/immuno';
import { LabSupply } from '@/types/labsupply';
import { Exam, ExamSubmission, ExamBankQuestion } from '@/types/exam';
import { RosterEntry } from '@/types/roster';
import { MiscTab, MiscItem, MiscLabel } from '@/types/misc';
import { toast } from 'sonner';
import { fetchCases as fetchCasesApi, insertCase, updateCaseRow, deleteCaseRow } from '@/lib/api/cases';
import { fetchSystemUsers as fetchSystemUsersApi, insertSystemUser, updateSystemUserRow, deleteSystemUserRow } from '@/lib/api/systemUsers';
import { seedSystemRolesIfEmpty, upsertSystemRole, deleteSystemRoleRow, setDefaultSystemRoleRow } from '@/lib/api/systemRoles';
import {
  fetchReports, upsertReport, deleteReport as deleteReportRow,
  fetchEquipment, upsertEquipment, deleteEquipment as deleteEquipmentRow,
  fetchRequests, upsertRequest, deleteRequest as deleteRequestRow,
  fetchQueryCases, upsertQueryCase, deleteQueryCase as deleteQueryCaseRow,
  fetchReagents, upsertReagent, deleteReagent,
  fetchConsumables, upsertConsumable, deleteConsumable,
  fetchManuals, upsertManual, deleteManual,
  fetchImmunoReagents, upsertImmunoReagent, deleteImmunoReagent,
  fetchImmunoRuns, upsertImmunoRun, deleteImmunoRun,
  fetchLabSupplies, upsertLabSupply, deleteLabSupply,
  fetchMiscTabs, upsertMiscTab, deleteMiscTab,
  fetchMiscLabels, upsertMiscLabel, deleteMiscLabel,
  fetchMiscItems, upsertMiscItem, deleteMiscItem,
  fetchRosters, upsertRoster, deleteRoster as deleteRosterRow,
  fetchExams, upsertExam, deleteExam as deleteExamRow,
  fetchExamBank, upsertExamBankQuestion, deleteExamBankQuestion,
  fetchExamSubmissions, upsertExamSubmission,
  fetchQualityControls, upsertQualityControl, deleteQualityControl as deleteQualityControlRow,
  saveAppSettings,
} from '@/lib/api/allEntities';

// Debounced settings save: prevents racing DB writes when multiple settings
// mutations happen in rapid succession (e.g. bulk addVariable calls).
// Each call resets the 400 ms timer; the flush executes once with the latest state.
let _saveSettingsTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSettingsSave() {
  if (_saveSettingsTimer !== null) clearTimeout(_saveSettingsTimer);
  _saveSettingsTimer = setTimeout(() => {
    _saveSettingsTimer = null;
    useStore.getState().saveSettingsToDB().catch(e => {
      console.error('[settings] debounced saveSettingsToDB failed', e);
    });
  }, 400);
}

// Smart diff-based Supabase sync for module entity setters.
// Only upserts items that are new (not in oldMap) or changed (different reference).
// Deletes items that were removed from the collection.
function syncCollectionToDb<T extends { id: string }>(
  oldItems: T[],
  newItems: T[],
  upsertFn: (item: T) => Promise<void>,
  deleteFn: (id: string) => Promise<void>,
  label: string,
) {
  const oldMap = new Map(oldItems.map(i => [i.id, i]));
  const newIds = new Set(newItems.map(i => i.id));
  const toUpsert = newItems.filter(i => !oldMap.has(i.id) || oldMap.get(i.id) !== i);
  const toDelete = oldItems.filter(i => !newIds.has(i.id));
  if (toUpsert.length) {
    Promise.all(toUpsert.map(upsertFn)).catch(e => console.error(`[${label}] sync failed`, e));
  }
  if (toDelete.length) {
    Promise.all(toDelete.map(i => deleteFn(i.id))).catch(e => console.error(`[${label}] delete failed`, e));
  }
}

const defaultNationalities = [
  'Nigeria', 'Ghana', 'South Africa', 'Kenya', 'Egypt', 'Ethiopia', 'Tanzania',
  'Uganda', 'Cameroon', 'Algeria', 'Morocco', 'United States', 'United Kingdom',
  'Canada', 'India', 'China', 'Germany', 'France', 'Brazil', 'Australia',
];

const defaultNatureOfSamples = [
  'Biopsy', 'Excision', 'Curettage', 'Aspiration', 'Resection', 'Amputation',
  'Incision', 'Punch Biopsy', 'Core Biopsy', 'Fine Needle Aspiration (FNA)',
  'Fluid / Cytology', 'Smear', 'Swab', 'Bone Marrow', 'Autopsy', 'Cell Block', 'Other'
];
const defaultTypesOfSamples = ['Histology', 'Cytology', 'Post Mortem'];

const defaultQcCriteriaHistology = [
  'Right sample', 'Floaters', 'Thickness', 'Folds', 'Chatter', 'Shatter',
  'Cytoplasm Stain Quality', 'Nuclear Crisp appearance', 'Air bubble', 'Water bubble', 'Nuclear bubble',
];

const defaultQcCriteriaCytology = [
  'Right sample', 'Floaters', 'Thickness', 'Folds',
  'Cytoplasm Stain Quality', 'Nuclear Crisp appearance', 'Air bubble', 'Water bubble',
];

const defaultStainCategories: StainCategory[] = [
  { id: crypto.randomUUID(), name: 'Routine', stains: ['H & E'] },
  { id: crypto.randomUUID(), name: 'Histochemistry', stains: ['PAS', 'Congo Red', 'Masson Trichrome', 'Reticulin', 'Giemsa', 'Ziehl-Neelsen', 'Alcian Blue', 'Oil Red O', 'Iron Stain'] },
  { id: crypto.randomUUID(), name: 'IHC', stains: ['PR', 'ER', 'HER2', 'Ki-67', 'P53', 'CD3', 'CD20', 'CK7', 'CK20', 'Vimentin'] },
];

const defaultStainTypes = defaultStainCategories.flatMap(c => c.stains);

const defaultReportTypes = ['Fire', 'Spill', 'Equipment Failure', 'Chemical Exposure', 'Needle Stick', 'Slip/Fall'];
const defaultReportLocations = ['Main Lab', 'Cytology Lab', 'IHC Lab', 'Hallway'];
const defaultRequestTypes = ['IHC', 'Special Stain', 'Recut', 'Deeper Section'];

const defaultTemplates: MaintenanceTemplate[] = [
  { id: '1', name: 'Leica Peloris II', checklist: ['Check reagent levels', 'Inspect tubing', 'Clean chambers', 'Run diagnostic cycle', 'Check temperature probes', 'Verify agitation', 'Clean exterior'] },
  { id: '2', name: 'Leica Bond III', checklist: ['Check reagent containers', 'Clean slide trays', 'Inspect waste containers', 'Run cleaning cycle', 'Verify dispensing', 'Check barcode reader'] },
  { id: '3', name: 'Ventana Benchmark Ultra', checklist: ['Check reagent dispensers', 'Clean slide heater', 'Inspect waste lines', 'Run maintenance wash', 'Verify temperature', 'Check barcode scanner'] },
  { id: '4', name: 'Leica Tissue-Tek Embedding machine', checklist: ['Clean wax reservoir', 'Check temperature', 'Clean mold trays', 'Inspect heating elements', 'Clean forceps wells', 'Check cold plate'] },
  { id: '5', name: 'Leica Microtome', checklist: ['Clean blade holder', 'Lubricate mechanisms', 'Check handwheel brake', 'Inspect blade clamp', 'Clean specimen clamp', 'Check section thickness'] },
  { id: '6', name: 'Leica Emi automatic Microtome', checklist: ['Clean blade holder', 'Check motor function', 'Lubricate feed mechanism', 'Inspect safety features', 'Verify section thickness', 'Clean waste tray'] },
  { id: '7', name: 'Mavotech Microtome', checklist: ['Clean blade holder', 'Lubricate mechanisms', 'Check handwheel', 'Inspect clamp', 'Clean specimen holder', 'Verify thickness'] },
  { id: '8', name: 'Marvotech Hot Plate', checklist: ['Clean surface', 'Check temperature accuracy', 'Inspect power cord', 'Verify thermostat', 'Clean exterior'] },
  { id: '9', name: 'Marvotech Waterbath', checklist: ['Clean tank', 'Check temperature', 'Change water', 'Inspect heating element', 'Clean exterior', 'Check thermostat'] },
  { id: '10', name: 'Marvotech Microscope', checklist: ['Clean lenses', 'Check light source', 'Inspect stage mechanism', 'Clean eyepieces', 'Verify focus mechanism', 'Check electrical connections'] },
  { id: '11', name: 'Olympus Microscope', checklist: ['Clean objective lenses', 'Clean eyepieces', 'Check illumination', 'Inspect stage', 'Verify focus', 'Clean condenser', 'Check electrical'] },
  { id: '12', name: 'Leica Cryostat', checklist: ['Defrost chamber', 'Clean blade holder', 'Check temperature', 'Inspect anti-roll plate', 'Clean specimen holder', 'Verify section quality'] },
  { id: '13', name: 'Hettich Cytospin centrifuge', checklist: ['Clean rotor', 'Check speed calibration', 'Inspect lid seal', 'Clean chamber', 'Verify timer', 'Check brake function'] },
  { id: '14', name: 'Haier Thermocool Chest Freezer', checklist: ['Check temperature', 'Defrost if needed', 'Clean interior', 'Inspect seal', 'Check power indicator', 'Verify alarm function'] },
  { id: '15', name: 'Haier Thermocool Fridge', checklist: ['Check temperature', 'Clean interior', 'Inspect door seal', 'Check power indicator', 'Organize contents', 'Verify alarm'] },
];

// Local cache of role permissions. Supabase RLS may reject writes to
// `system_roles` from this browser (e.g. anon/preview sessions that never
// authenticate with Supabase Auth), in which case role edits made in the
// Settings UI would otherwise silently fail to persist and get reverted on
// the next refresh (loadSettingsFromDB re-pulls the stale DB copy). Caching
// the last-known-good role list locally means edits made in this browser
// always survive a refresh, even when the server-side write failed.
const ROLES_CACHE_KEY = 'histobox_roles_cache_v1';

function loadCachedRoles(): SystemRole[] | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ROLES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function saveCachedRoles(roles: SystemRole[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ROLES_CACHE_KEY, JSON.stringify(roles));
  } catch {
    // Ignore quota / privacy-mode errors — caching is best-effort.
  }
}

const defaultRoles: SystemRole[] = [
  {
    id: 'role-superuser',
    name: 'Superuser',
    isDefault: false,
    permissions: [
      'view_overview', 'add_entry', 'edit_entry',
      'bench_fixation', 'bench_processing', 'bench_embedding', 'bench_microtomy', 'bench_cyto_analysis', 'bench_staining', 'bench_mounting',
      'view_microscopy', 'submit_microscopy',
      'view_slide_movement', 'mark_slide_movement', 'confirm_slide_movement', 'raise_slide_movement_issue',
      'signout_approve',
      'manage_requests', 'manage_query',
      'view_reports', 'add_reports', 'edit_reports',
      'view_maintenance', 'add_maintenance', 'edit_maintenance',
      'manage_settings', 'manage_roles', 'manage_users', 'register_users', 'manage_db_sync',
      'view_reagent', 'view_immuno_reagent', 'view_immuno_manual', 'view_lab_supply', 'view_exam', 'view_roster',
      'view_qc', 'add_qc', 'edit_qc',
    ],
  },
  {
    id: 'role-default',
    name: 'Staff',
    isDefault: true,
    permissions: [
      'view_overview', 'add_entry',
      'bench_fixation', 'bench_processing', 'bench_embedding', 'bench_microtomy', 'bench_cyto_analysis', 'bench_staining', 'bench_mounting',
      'view_reports', 'view_maintenance',
      'view_reagent', 'view_immuno_reagent', 'view_immuno_manual', 'view_lab_supply', 'view_roster',
      'view_qc', 'add_qc',
    ],
  },
  {
    id: 'role-guest',
    name: 'Guest',
    isDefault: false,
    permissions: [
      'view_exam', 'view_roster',
    ],
  },
];

function generateSubItems(labNumber: string, cassetteLabels?: CassetteLabel[], totalCassettes?: number): SubItem[] {
  const items: SubItem[] = [];
  if (cassetteLabels && cassetteLabels.length > 0) {
    cassetteLabels.forEach(cl => {
      for (let i = 1; i <= cl.number; i++) {
        items.push({ id: `${labNumber}-${cl.label}${i}`, label: `${labNumber}-${cl.label}${i}`, currentStep: 'Fixation', currentStatus: 'Room Fixing' } as SubItem);
      }
    });
  } else if (totalCassettes) {
    for (let i = 1; i <= totalCassettes; i++) {
      items.push({ id: `${labNumber}-${i}`, label: `${labNumber}-${i}`, currentStep: 'Fixation', currentStatus: 'Room Fixing' });
    }
  }
  return items;
}

const sampleCases: CaseEntry[] = [];

interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  cases: CaseEntry[];
  reports: Report[];
  equipment: Equipment[];
  requests: SpecialRequest[];
  queryCases: QueryCase[];
  systemUsers: SystemUser[];
  settings: AppSettings;
  sidebarOpen: boolean;
  darkMode: boolean;
  _hasHydrated: boolean;

  // New persisted module data
  reagents: Reagent[];
  consumables: ReagentConsumable[];
  manuals: ReagentManual[];
  immunoReagents: ImmunoReagent[];
  immunoRuns: ImmunoRun[];
  labSupplies: LabSupply[];
  exams: Exam[];
  examSubmissions: ExamSubmission[];
  examBank: ExamBankQuestion[];
  rosters: RosterEntry[];
  miscTabs: MiscTab[];
  miscItems: MiscItem[];
  miscLabels: MiscLabel[];
  qualityControls: QualityControl[];

  login: (user: User) => void;
  loginWithCredentials: (identifier: string, password: string) => User | null;
  logout: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  addCase: (entry: CaseEntry) => void;
  updateCase: (id: string, updates: Partial<CaseEntry>) => void;
  addLog: (caseId: string, log: Omit<LogEntry, 'id'>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addVariable: (category: keyof AppSettings['variables'], value: any) => void;
  removeVariable: (category: keyof AppSettings['variables'], value: any) => void;
  getCasesByStep: (step: BenchStep) => CaseEntry[];
  getMountedCases: () => CaseEntry[];
  getQueryCases: () => CaseEntry[];
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  addReportLog: (reportId: string, log: Omit<LogEntry, 'id'>) => void;
  addEquipment: (eq: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  addMaintenanceLog: (equipmentId: string, log: MaintenanceLog) => void;
  getDisplayId: (id: string) => string;
  addRequest: (req: SpecialRequest) => void;
  updateRequest: (id: string, updates: Partial<SpecialRequest>) => void;
  addQueryCase: (qc: QueryCase) => void;
  updateQueryCase: (id: string, updates: Partial<QueryCase>) => void;
  addSystemUser: (user: SystemUser) => Promise<void>;
  updateSystemUser: (id: string, updates: Partial<SystemUser>) => void;
  deleteSystemUser: (id: string) => void;
  addRole: (role: SystemRole) => void;
  updateRole: (id: string, updates: Partial<SystemRole>) => void;
  removeRole: (id: string) => void;
  setDefaultRole: (id: string) => void;
  addFlag: (caseId: string, flag: CaseFlag) => void;
  fixFlag: (caseId: string, flagId: string, fixedBy: string) => void;
  /** @deprecated use addFlag */
  addIssue: (caseId: string, flag: CaseFlag) => void;
  /** @deprecated use fixFlag */
  fixIssue: (caseId: string, flagId: string, fixedBy: string) => void;
  addStainCategory: (cat: StainCategory) => void;
  updateStainCategory: (id: string, updates: Partial<StainCategory>) => void;
  removeStainCategory: (id: string) => void;
  addStainToCategory: (catId: string, stain: string) => void;
  removeStainFromCategory: (catId: string, stain: string) => void;
  addQcCriteriaCategory: (cat: QCCriteriaCategory) => void;
  removeQcCriteriaCategory: (id: string) => void;
  addQcCriteriaItem: (catId: string, item: string) => void;
  removeQcCriteriaItem: (catId: string, item: string) => void;
  deleteCase: (id: string) => void;
  resetToDefaults: () => void;

  /** Fetches all cases from the `cases` Supabase table. */
  fetchCases: () => Promise<void>;
  /** Fetches all users from the `system_users` Supabase table. */
  fetchSystemUsers: () => Promise<void>;
  /** Fetches ALL module entities from Supabase (reports, equipment, rosters, etc.). */
  fetchAll: () => Promise<void>;
  /** Saves current settings to the app_settings Supabase table. */
  saveSettingsToDB: () => Promise<void>;

  // Delete actions for real-table entities
  deleteReport: (id: string) => void;
  deleteEquipment: (id: string) => void;
  deleteRequest: (id: string) => void;
  deleteQueryCase: (id: string) => void;

  // Module setters — also sync changes to Supabase via diff
  setReagents: (reagents: Reagent[]) => void;
  setConsumables: (consumables: ReagentConsumable[]) => void;
  setManuals: (manuals: ReagentManual[]) => void;
  setImmunoReagents: (reagents: ImmunoReagent[]) => void;
  setImmunoRuns: (runs: ImmunoRun[]) => void;
  setLabSupplies: (supplies: LabSupply[]) => void;
  setExams: (exams: Exam[]) => void;
  setExamSubmissions: (submissions: ExamSubmission[]) => void;
  setExamBank: (questions: ExamBankQuestion[]) => void;
  setRosters: (rosters: RosterEntry[]) => void;
  setMiscTabs: (tabs: MiscTab[]) => void;
  setMiscItems: (items: MiscItem[]) => void;
  setMiscLabels: (labels: MiscLabel[]) => void;

  // Permission helper
  hasPermission: (permission: string) => boolean;

  // Quality Control (no live table — stays in blob)
  addQualityControl: (qc: QualityControl) => void;
  updateQualityControl: (id: string, updates: Partial<QualityControl>) => void;
  deleteQualityControl: (id: string) => void;

  /** Fetches app_settings + system_roles from Supabase and merges into store. */
  loadSettingsFromDB: () => Promise<void>;
}

// Map step name to its 'ing' status form
const stepToIngStatus: Record<string, string> = {
  'Fixation': 'Room Fixing',
  'Processing': 'Processing',
  'Embedding': 'Embedding',
  'Microtomy': 'Microtomy',
  'Cyto Analysis': 'Analysing',
  'Staining': 'Staining',
  'Mounting': 'Mounting',
};

const defaultProtocols: ProcessingProtocol[] = [
  {
    id: 'proto-standard-histo', name: 'Standard Histology Overnight',
    sampleTypes: ['Histology'],
    steps: [
      { reagent: '10% NBF', duration: '1 hr', concentration: '10%' },
      { reagent: '70% Alcohol', duration: '1 hr', concentration: '70%' },
      { reagent: '80% Alcohol', duration: '1 hr', concentration: '80%' },
      { reagent: '95% Alcohol', duration: '1 hr', concentration: '95%' },
      { reagent: 'Absolute Alcohol I', duration: '1 hr', concentration: '100%' },
      { reagent: 'Absolute Alcohol II', duration: '1 hr', concentration: '100%' },
      { reagent: 'Absolute Alcohol III', duration: '1 hr', concentration: '100%' },
      { reagent: 'Xylene I', duration: '1 hr', concentration: '100%' },
      { reagent: 'Xylene II', duration: '1 hr', concentration: '100%' },
      { reagent: 'Paraffin Wax I', duration: '1 hr', concentration: '100%', temperature: '60°C' },
      { reagent: 'Paraffin Wax II', duration: '1 hr', concentration: '100%', temperature: '60°C' },
      { reagent: 'Paraffin Wax III', duration: '1 hr', concentration: '100%', temperature: '60°C' },
    ],
  },
  {
    id: 'proto-rapid', name: 'Rapid Processing (2hr)',
    sampleTypes: ['Histology'],
    steps: [
      { reagent: '10% NBF', duration: '15 min', concentration: '10%' },
      { reagent: '80% Alcohol', duration: '10 min', concentration: '80%' },
      { reagent: '95% Alcohol', duration: '10 min', concentration: '95%' },
      { reagent: 'Absolute Alcohol I', duration: '10 min', concentration: '100%' },
      { reagent: 'Absolute Alcohol II', duration: '10 min', concentration: '100%' },
      { reagent: 'Xylene I', duration: '15 min', concentration: '100%' },
      { reagent: 'Xylene II', duration: '15 min', concentration: '100%' },
      { reagent: 'Paraffin Wax I', duration: '15 min', concentration: '100%', temperature: '60°C' },
      { reagent: 'Paraffin Wax II', duration: '15 min', concentration: '100%', temperature: '60°C' },
    ],
  },
  {
    id: 'proto-pm', name: 'Post Mortem Protocol',
    sampleTypes: ['Post Mortem'],
    steps: [
      { reagent: '10% NBF', duration: '2 hr', concentration: '10%' },
      { reagent: '70% Alcohol', duration: '1.5 hr', concentration: '70%' },
      { reagent: '80% Alcohol', duration: '1.5 hr', concentration: '80%' },
      { reagent: '95% Alcohol', duration: '1.5 hr', concentration: '95%' },
      { reagent: 'Absolute Alcohol I', duration: '1.5 hr', concentration: '100%' },
      { reagent: 'Absolute Alcohol II', duration: '1.5 hr', concentration: '100%' },
      { reagent: 'Xylene I', duration: '1.5 hr', concentration: '100%' },
      { reagent: 'Xylene II', duration: '1.5 hr', concentration: '100%' },
      { reagent: 'Paraffin Wax I', duration: '1.5 hr', concentration: '100%', temperature: '60°C' },
      { reagent: 'Paraffin Wax II', duration: '1.5 hr', concentration: '100%', temperature: '60°C' },
    ],
  },
  {
    id: 'proto-cyto', name: 'Cytology Processing',
    sampleTypes: ['Cytology'],
    steps: [
      { reagent: '95% Alcohol Fix', duration: '15 min', concentration: '95%' },
      { reagent: 'Absolute Alcohol', duration: '5 min', concentration: '100%' },
      { reagent: 'Xylene', duration: '5 min', concentration: '100%' },
    ],
  },
  {
    id: 'proto-if-cryostat', name: 'IF Procedure (Cryostat)',
    sampleTypes: ['Histology'],
    steps: [
      { reagent: 'Fresh Tissue Snap-Freeze (OCT embedded)', duration: '1 min', concentration: 'N/A', temperature: '-80°C' },
      { reagent: 'Cryostat Sectioning', duration: '5 min', concentration: 'N/A', temperature: '-20°C' },
      { reagent: 'Acetone Fixation', duration: '10 min', concentration: '100%', temperature: '-20°C' },
      { reagent: 'Air Dry', duration: '15 min', concentration: 'N/A' },
      { reagent: 'PBS Wash', duration: '5 min', concentration: '1X' },
      { reagent: 'Block (Normal Serum)', duration: '30 min', concentration: '5%' },
      { reagent: 'Primary Antibody Incubation', duration: '60 min', concentration: 'per marker' },
      { reagent: 'PBS Wash (x3)', duration: '5 min each', concentration: '1X' },
      { reagent: 'Fluorochrome-conjugated Secondary Ab', duration: '45 min', concentration: 'per marker' },
      { reagent: 'PBS Wash (x3)', duration: '5 min each', concentration: '1X' },
      { reagent: 'DAPI Counterstain', duration: '5 min', concentration: '1 µg/mL' },
      { reagent: 'Mount with Aqueous Anti-Fade Medium', duration: '—', concentration: 'N/A' },
    ],
  },
];

const defaultSettings: AppSettings = {
  idPrefix: 'HBX',
  visibleColumns: {
    hospitalNumber: true, patientName: true,
    natureOfSample: true, typeOfSample: true, patientType: true,
  },
  uniqueIdentifierColumn: 'hospitalNumber',
  variables: {
    natureOfSamples: defaultNatureOfSamples,
    typesOfSamples: defaultTypesOfSamples,
    nationalities: defaultNationalities,
    qcCriteriaHistology: defaultQcCriteriaHistology,
    qcCriteriaCytology: defaultQcCriteriaCytology,
    reportTypes: defaultReportTypes,
    reportLocations: defaultReportLocations,
    maintenanceTemplates: defaultTemplates,
    stainTypes: defaultStainTypes,
    stainCategories: defaultStainCategories,
    residentDoctors: [],
    mlsOnCall: [],
    requestTypes: defaultRequestTypes,
    hospitalPrefixes: [
      { id: crypto.randomUUID(), hospitalUnit: 'Ife Hospital Unit', prefix: 'H' },
      { id: crypto.randomUUID(), hospitalUnit: 'Wesley Guide Hospital', prefix: 'WH' },
      { id: crypto.randomUUID(), hospitalUnit: 'Ife Dental Unit', prefix: 'DEN' },
    ],
    labSupplyTypes: ['Embalming Fluid', 'Formalin', 'Xylene', 'Alcohol', 'Paraffin Wax'],
    labSupplyParams: ['Location', 'Received By', 'Date Received', 'Quantity', 'Supplier', 'Batch Number'],
    protocols: defaultProtocols,
    
  },
  roles: (() => {
    const cached = loadCachedRoles();
    if (!cached) return defaultRoles;
    const cachedById = new Map(cached.map(r => [r.id, r]));
    const merged = defaultRoles.map(r => cachedById.get(r.id) ?? r);
    const mergedIds = new Set(merged.map(r => r.id));
    for (const r of cached) if (!mergedIds.has(r.id)) merged.push(r);
    return merged;
  })(),
  defaultRoleId: 'role-default',
};

const mergeSettingsWithDefaults = (settings?: Partial<AppSettings>): AppSettings => {
  const variables: Partial<AppSettings['variables']> = settings?.variables ?? {};

  // Ensure built-in roles always exist (merge by id)
  const incomingRoles = settings?.roles ?? [];
  // Strip the deprecated Novice role if it was persisted previously
  const mergedRoles: SystemRole[] = incomingRoles.filter(
    (r) => r.id !== 'role-novice' && r.name !== 'Novice'
  );
  defaultRoles.forEach(dr => {
    const existing = mergedRoles.find(r => r.id === dr.id);
    if (!existing) {
      mergedRoles.push(dr);
    } else {
      // Ensure any newly-added default permissions are merged into persisted roles
      const missing = dr.permissions.filter(p => !existing.permissions.includes(p));
      if (missing.length) existing.permissions = [...existing.permissions, ...missing];
    }
  });

  // Migrate the retired generic 'add_slide_movement' permission to the
  // task-specific permissions it used to gate, so roles that already had
  // access keep it after the split.
  mergedRoles.forEach(r => {
    if (r.permissions.includes('add_slide_movement' as any)) {
      const additions = ['mark_slide_movement', 'confirm_slide_movement'].filter(p => !r.permissions.includes(p));
      if (additions.length) r.permissions = [...r.permissions, ...additions];
    }
  });

  // Migrate the retired generic Microscopy CRUD permissions and the legacy
  // 'microscopy_review' flag to the task-specific permissions that now gate
  // the Review/Submit actions, so roles that already had access keep it.
  mergedRoles.forEach(r => {
    if (
      r.permissions.includes('microscopy_review' as any) ||
      r.permissions.includes('add_microscopy' as any) ||
      r.permissions.includes('edit_microscopy' as any)
    ) {
      const additions = ['view_microscopy', 'submit_microscopy'].filter(p => !r.permissions.includes(p));
      if (additions.length) r.permissions = [...r.permissions, ...additions];
    }
    // Drop the retired keys so they don't linger unused in persisted roles.
    r.permissions = r.permissions.filter(p =>
      !['add_microscopy', 'edit_microscopy', 'delete_microscopy', 'microscopy_review'].includes(p)
    );
  });


  return {
    ...defaultSettings,
    ...settings,
    variables: {
      ...defaultSettings.variables,
      ...variables,
      protocols: (() => {
        const existing = variables.protocols?.length ? [...variables.protocols] : [];
        // Ensure all built-in default protocols are present (merge by id)
        defaultSettings.variables.protocols?.forEach(dp => {
          if (!existing.some(p => p.id === dp.id)) existing.push(dp);
        });
        return existing.length ? existing : defaultSettings.variables.protocols;
      })(),
    },
    roles: mergedRoles.length ? mergedRoles : defaultSettings.roles,
    defaultRoleId:
      settings?.defaultRoleId && settings.defaultRoleId !== 'role-novice'
        ? settings.defaultRoleId
        : defaultSettings.defaultRoleId,
  };
};

// Migrate any users still on the deprecated Novice role to the default role.
// System users are now sourced live from the `system_users` Supabase table
// (see fetchSystemUsers action) — no hardcoded seed user is injected here.
const ensureSystemUsers = (users?: SystemUser[]): SystemUser[] => {
  const current = users?.length ? users : [];
  return current.map((u) =>
    u.roleId === 'role-novice' ? { ...u, roleId: 'role-default' } : u
  );
};

const normalizePhoneForMatch = (value: string) => value.replace(/\D/g, '');

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  cases: sampleCases,
  reports: [],
  equipment: [],
  requests: [],
  queryCases: [],
  systemUsers: ensureSystemUsers([]),
  settings: mergeSettingsWithDefaults(defaultSettings),
  sidebarOpen: true,
  darkMode: false,
  _hasHydrated: false,

  // New module data
  reagents: [],
  consumables: [],
  manuals: [],
  immunoReagents: [],
  immunoRuns: [],
  labSupplies: [],
  exams: [],
  examSubmissions: [],
  examBank: [],
  rosters: [],
  miscTabs: [],
  miscItems: [],
  miscLabels: [],
  qualityControls: [],

  login: (user) => set({ currentUser: user, isAuthenticated: true }),

  loginWithCredentials: (identifier, password) => {
    const users = get().systemUsers;
    const normalizedIdentifier = normalizePhoneForMatch(identifier);
    const found = users.find(u =>
      u.isActive && (
        normalizePhoneForMatch(u.phone) === normalizedIdentifier ||
        u.raNumber === identifier
      ) && u.password === password
    );
    if (found) {
      const user: User = { id: found.id, name: found.name, phone: found.phone, role: found.roleId, raNumber: found.raNumber };
      set({ currentUser: user, isAuthenticated: true });
      return user;
    }
    return null;
  },

  logout: () => set({ currentUser: null, isAuthenticated: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDarkMode: (dark) => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ darkMode: dark });
  },

  addCase: (entry) => {
    set((state) => ({ cases: [entry, ...state.cases] }));
    insertCase(entry).catch((err) => {
      console.error('[cases] insert failed', err);
      toast.error('Failed to save case to server');
    });
  },

  updateCase: (id, updates) => {
    let updated: CaseEntry | undefined;
    set((state) => ({
      cases: state.cases.map(c => {
        if (c.id !== id) return c;
        updated = { ...c, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) {
      updateCaseRow(id, updated).catch((err) => {
        console.error('[cases] update failed', err);
        toast.error('Failed to save case update to server');
      });
    }
  },

  addLog: (caseId, log) => {
    let updated: CaseEntry | undefined;
    set((state) => ({
      cases: state.cases.map(c => {
        if (c.id !== caseId) return c;
        updated = { ...c, logs: [...c.logs, { ...log, id: crypto.randomUUID() }] };
        return updated;
      }),
    }));
    if (updated) {
      updateCaseRow(caseId, updated).catch((err) => {
        console.error('[cases] log update failed', err);
        toast.error('Failed to save log to server');
      });
    }
  },

  fetchCases: async () => {
    try {
      const cases = await fetchCasesApi();
      set({ cases });
    } catch (err) {
      console.warn('[store] fetchCases failed', err);
    }
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      // Enforce: the unique identifier column is always visible sitewide.
      const uid = merged.uniqueIdentifierColumn;
      if (uid && merged.visibleColumns && (merged.visibleColumns as any)[uid] === false) {
        merged.visibleColumns = { ...merged.visibleColumns, [uid]: true };
      }
      return { settings: merged };
    });
    // Persist settings to app_settings table (debounced — handles rapid mutations)
    scheduleSettingsSave();
  },

  addVariable: (category, value) => {
    set((state) => {
      const current = state.settings.variables[category];
      if (Array.isArray(current)) {
        return {
          settings: {
            ...state.settings,
            variables: { ...state.settings.variables, [category]: [...current, value] },
          },
        };
      }
      // If key doesn't exist yet, create array with the value
      return {
        settings: {
          ...state.settings,
          variables: { ...state.settings.variables, [category]: [value] },
        },
      };
    });
    scheduleSettingsSave();
  },

  removeVariable: (category, value) => {
    set((state) => {
      const current = state.settings.variables[category];
      if (Array.isArray(current) && typeof value === 'string') {
        return {
          settings: {
            ...state.settings,
            variables: { ...state.settings.variables, [category]: current.filter((v: any) => typeof v === 'string' ? v !== value : v.id !== value) },
          },
        };
      }
      return state;
    });
    scheduleSettingsSave();
  },

  getCasesByStep: (step) => get().cases.filter(c => c.currentStep === step),
  getMountedCases: () => get().cases.filter(c => c.currentStatus === 'Mounted'),
  getQueryCases: () => get().cases.filter(c => c.isQuery),

  addReport: (report) => {
    set((state) => ({ reports: [report, ...state.reports] }));
    upsertReport(report).catch(e => console.error('[reports] upsert failed', e));
  },
  updateReport: (id, updates) => {
    let updated: Report | undefined;
    set((state) => ({
      reports: state.reports.map(r => {
        if (r.id !== id) return r;
        updated = { ...r, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) upsertReport(updated).catch(e => console.error('[reports] update failed', e));
  },
  addReportLog: (reportId, log) => {
    let updated: Report | undefined;
    set((state) => ({
      reports: state.reports.map(r => {
        if (r.id !== reportId) return r;
        updated = { ...r, logs: [...r.logs, { ...log, id: crypto.randomUUID() }] };
        return updated;
      }),
    }));
    if (updated) upsertReport(updated).catch(e => console.error('[reports] log failed', e));
  },
  deleteReport: (id) => {
    set((state) => ({ reports: state.reports.filter(r => r.id !== id) }));
    deleteReportRow(id).catch(e => console.error('[reports] delete failed', e));
  },

  addEquipment: (eq) => {
    set((state) => ({ equipment: [...state.equipment, eq] }));
    upsertEquipment(eq).catch(e => console.error('[equipment] upsert failed', e));
  },
  updateEquipment: (id, updates) => {
    let updated: Equipment | undefined;
    set((state) => ({
      equipment: state.equipment.map(e => {
        if (e.id !== id) return e;
        updated = { ...e, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) upsertEquipment(updated).catch(e => console.error('[equipment] update failed', e));
  },
  addMaintenanceLog: (equipmentId, log) => {
    let updated: Equipment | undefined;
    set((state) => ({
      equipment: state.equipment.map(e => {
        if (e.id !== equipmentId) return e;
        updated = { ...e, maintenanceLogs: [...e.maintenanceLogs, log] };
        return updated;
      }),
    }));
    if (updated) upsertEquipment(updated).catch(e => console.error('[equipment] maintenance log failed', e));
  },
  deleteEquipment: (id) => {
    set((state) => ({ equipment: state.equipment.filter(e => e.id !== id) }));
    deleteEquipmentRow(id).catch(e => console.error('[equipment] delete failed', e));
  },

  getDisplayId: (id: string) => {
    const prefix = get().settings.idPrefix;
    return `${prefix}${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  },

  addRequest: (req) => {
    set((state) => ({ requests: [req, ...state.requests] }));
    upsertRequest(req).catch(e => console.error('[requests] upsert failed', e));
  },
  updateRequest: (id, updates) => {
    let updated: SpecialRequest | undefined;
    set((state) => ({
      requests: state.requests.map(r => {
        if (r.id !== id) return r;
        updated = { ...r, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) upsertRequest(updated).catch(e => console.error('[requests] update failed', e));
  },
  deleteRequest: (id) => {
    set((state) => ({ requests: state.requests.filter(r => r.id !== id) }));
    deleteRequestRow(id).catch(e => console.error('[requests] delete failed', e));
  },

  addQueryCase: (qc) => {
    set((state) => ({ queryCases: [qc, ...state.queryCases] }));
    upsertQueryCase(qc).catch(e => console.error('[queryCases] upsert failed', e));
  },
  updateQueryCase: (id, updates) => {
    let updated: QueryCase | undefined;
    set((state) => ({
      queryCases: state.queryCases.map(q => {
        if (q.id !== id) return q;
        updated = { ...q, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) upsertQueryCase(updated).catch(e => console.error('[queryCases] update failed', e));
  },
  deleteQueryCase: (id) => {
    set((state) => ({ queryCases: state.queryCases.filter(q => q.id !== id) }));
    deleteQueryCaseRow(id).catch(e => console.error('[queryCases] delete failed', e));
  },

  addSystemUser: async (user) => {
    set((state) => ({ systemUsers: ensureSystemUsers([...state.systemUsers, user]) }));
    try {
      await insertSystemUser(user);
    } catch (err) {
      console.error('[system_users] insert failed', err);
      toast.error('Failed to save user to server');
    }
  },
  updateSystemUser: (id, updates) => {
    let updated: SystemUser | undefined;
    set((state) => ({
      systemUsers: state.systemUsers.map(u => {
        if (u.id !== id) return u;
        updated = { ...u, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) {
      updateSystemUserRow(id, updated).catch((err) => {
        console.error('[system_users] update failed', err);
        toast.error('Failed to save user update to server');
      });
    }
  },
  deleteSystemUser: (id) => {
    set((state) => ({ systemUsers: state.systemUsers.filter(u => u.id !== id) }));
    deleteSystemUserRow(id).catch((err) => {
      console.error('[system_users] delete failed', err);
      toast.error('Failed to delete user on server');
    });
  },

  fetchSystemUsers: async () => {
    try {
      const systemUsers = await fetchSystemUsersApi();
      set({ systemUsers: ensureSystemUsers(systemUsers) });
    } catch (err) {
      console.warn('[store] fetchSystemUsers failed', err);
    }
  },

  addRole: (role) => {
    set((state) => ({
      settings: { ...state.settings, roles: [...state.settings.roles, role] },
    }));
    saveCachedRoles(get().settings.roles);
    upsertSystemRole(role).catch((err) => {
      console.error('[system_roles] insert failed', err);
      toast.error('Failed to save role to server');
    });
  },
  updateRole: (id, updates) => {
    let updated: SystemRole | undefined;
    set((state) => ({
      settings: {
        ...state.settings,
        roles: state.settings.roles.map(r => {
          if (r.id !== id) return r;
          updated = { ...r, ...updates };
          return updated;
        }),
      },
    }));
    saveCachedRoles(get().settings.roles);
    if (updated) {
      upsertSystemRole(updated).catch((err) => {
        console.error('[system_roles] update failed', err);
        toast.error('Failed to save role update to server');
      });
    }
  },
  removeRole: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        roles: state.settings.roles.filter(r => r.id !== id),
      },
    }));
    saveCachedRoles(get().settings.roles);
    deleteSystemRoleRow(id).catch((err) => {
      console.error('[system_roles] delete failed', err);
      toast.error('Failed to delete role on server');
    });
  },
  setDefaultRole: (id) => {
    const allRoleIds = get().settings.roles.map(r => r.id);
    set((state) => ({
      settings: {
        ...state.settings,
        defaultRoleId: id,
        roles: state.settings.roles.map(r => ({ ...r, isDefault: r.id === id })),
      },
    }));
    saveCachedRoles(get().settings.roles);
    setDefaultSystemRoleRow(id, allRoleIds).catch((err) => {
      console.error('[system_roles] set default failed', err);
      toast.error('Failed to save default role on server');
    });
  },

  // Flags
  addFlag: (caseId, flag) => {
    let updated: CaseEntry | undefined;
    set((state) => ({
      cases: state.cases.map(c => {
        if (c.id !== caseId) return c;
        updated = { ...c, flags: [...(c.flags || c.issues || []), flag], issues: undefined, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) {
      updateCaseRow(caseId, updated).catch((err) => {
        console.error('[cases] flag update failed', err);
        toast.error('Failed to save flag to server');
      });
    }
  },
  fixFlag: (caseId, flagId, fixedBy) => {
    let updated: CaseEntry | undefined;
    set((state) => ({
      cases: state.cases.map(c => {
        if (c.id !== caseId) return c;
        updated = {
          ...c,
          flags: (c.flags || c.issues || []).map(i => i.id === flagId ? { ...i, isFixed: true, fixedAt: new Date(), fixedBy } : i),
          issues: undefined,
          updatedAt: new Date(),
        };
        return updated;
      }),
    }));
    if (updated) {
      updateCaseRow(caseId, updated).catch((err) => {
        console.error('[cases] flag fix failed', err);
        toast.error('Failed to save flag fix to server');
      });
    }
  },
  addIssue: (caseId, flag) => { get().addFlag(caseId, flag); },
  fixIssue: (caseId, flagId, fixedBy) => { get().fixFlag(caseId, flagId, fixedBy); },

  // Stain categories
  addStainCategory: (cat) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        stainCategories: [...state.settings.variables.stainCategories, cat],
        stainTypes: [...state.settings.variables.stainTypes, ...cat.stains],
      },
    },
  })),
  updateStainCategory: (id, updates) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        stainCategories: state.settings.variables.stainCategories.map(c => c.id === id ? { ...c, ...updates } : c),
      },
    },
  })),
  removeStainCategory: (id) => set((state) => {
    const cat = state.settings.variables.stainCategories.find(c => c.id === id);
    const removedStains = cat?.stains || [];
    return {
      settings: {
        ...state.settings,
        variables: {
          ...state.settings.variables,
          stainCategories: state.settings.variables.stainCategories.filter(c => c.id !== id),
          stainTypes: state.settings.variables.stainTypes.filter(s => !removedStains.includes(s)),
        },
      },
    };
  }),
  addStainToCategory: (catId, stain) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        stainCategories: state.settings.variables.stainCategories.map(c =>
          c.id === catId ? { ...c, stains: [...c.stains, stain] } : c
        ),
        stainTypes: [...state.settings.variables.stainTypes, stain],
      },
    },
  })),
  removeStainFromCategory: (catId, stain) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        stainCategories: state.settings.variables.stainCategories.map(c =>
          c.id === catId ? { ...c, stains: c.stains.filter(s => s !== stain) } : c
        ),
        stainTypes: state.settings.variables.stainTypes.filter(s => s !== stain),
      },
    },
  })),

  addQcCriteriaCategory: (cat) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        qcCriteriaCategories: [...(state.settings.variables.qcCriteriaCategories || []), cat],
      },
    },
  })),
  removeQcCriteriaCategory: (id) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        qcCriteriaCategories: (state.settings.variables.qcCriteriaCategories || []).filter(c => c.id !== id),
      },
    },
  })),
  addQcCriteriaItem: (catId, item) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        qcCriteriaCategories: (state.settings.variables.qcCriteriaCategories || []).map(c =>
          c.id === catId ? { ...c, items: [...c.items, item] } : c
        ),
      },
    },
  })),
  removeQcCriteriaItem: (catId, item) => set((state) => ({
    settings: {
      ...state.settings,
      variables: {
        ...state.settings.variables,
        qcCriteriaCategories: (state.settings.variables.qcCriteriaCategories || []).map(c =>
          c.id === catId ? { ...c, items: c.items.filter(i => i !== item) } : c
        ),
      },
    },
  })),

  deleteCase: (id) => {
    set((state) => ({ cases: state.cases.filter(c => c.id !== id) }));
    deleteCaseRow(id).catch((err) => {
      console.error('[cases] delete failed', err);
      toast.error('Failed to delete case on server');
    });
  },

  resetToDefaults: () => set({
    cases: sampleCases,
    reports: [],
    equipment: [],
    requests: [],
    queryCases: [],
    systemUsers: ensureSystemUsers([]),
    settings: mergeSettingsWithDefaults(defaultSettings),
    reagents: [],
    consumables: [],
    manuals: [],
    immunoReagents: [],
    immunoRuns: [],
    labSupplies: [],
    exams: [],
    examSubmissions: [],
    examBank: [],
    rosters: [],
    qualityControls: [],
  }),

  // Module setters — update local state AND sync changed items to Supabase
  setReagents: (reagents) => {
    const old = get().reagents;
    set({ reagents });
    syncCollectionToDb(old, reagents, upsertReagent, deleteReagent, 'reagents');
  },
  setConsumables: (consumables) => {
    const old = get().consumables;
    set({ consumables });
    syncCollectionToDb(old, consumables, upsertConsumable, deleteConsumable, 'consumables');
  },
  setManuals: (manuals) => {
    const old = get().manuals;
    set({ manuals });
    syncCollectionToDb(old, manuals, upsertManual, deleteManual, 'manuals');
  },
  setImmunoReagents: (immunoReagents) => {
    const old = get().immunoReagents;
    set({ immunoReagents });
    syncCollectionToDb(old, immunoReagents, upsertImmunoReagent, deleteImmunoReagent, 'immuno_reagents');
  },
  setImmunoRuns: (immunoRuns) => {
    const old = get().immunoRuns;
    set({ immunoRuns });
    syncCollectionToDb(old, immunoRuns, upsertImmunoRun, deleteImmunoRun, 'immuno_runs');
  },
  setLabSupplies: (labSupplies) => {
    const old = get().labSupplies;
    set({ labSupplies });
    syncCollectionToDb(old, labSupplies, upsertLabSupply, deleteLabSupply, 'lab_supplies');
  },
  setExams: (exams) => {
    const old = get().exams;
    set({ exams });
    syncCollectionToDb(old, exams, upsertExam, deleteExamRow, 'exams');
  },
  setExamSubmissions: (examSubmissions) => {
    const old = get().examSubmissions;
    set({ examSubmissions });
    // Only sync new/changed submissions (no delete — submissions are permanent)
    const oldMap = new Map(old.map(s => [s.id, s]));
    const toUpsert = examSubmissions.filter(s => !oldMap.has(s.id) || oldMap.get(s.id) !== s);
    if (toUpsert.length) {
      Promise.all(toUpsert.map(upsertExamSubmission)).catch(e => console.error('[exam_submissions] sync failed', e));
    }
  },
  setExamBank: (examBank) => {
    const old = get().examBank;
    set({ examBank });
    syncCollectionToDb(old, examBank, upsertExamBankQuestion, deleteExamBankQuestion, 'exam_bank');
  },
  setRosters: (rosters) => {
    const old = get().rosters;
    set({ rosters });
    syncCollectionToDb(old, rosters, upsertRoster, deleteRosterRow, 'rosters');
  },
  setMiscTabs: (miscTabs) => {
    const old = (get() as any).miscTabs ?? [];
    set({ miscTabs } as any);
    syncCollectionToDb(old, miscTabs, upsertMiscTab, deleteMiscTab, 'misc_tabs');
  },
  setMiscItems: (miscItems) => {
    const old = (get() as any).miscItems ?? [];
    set({ miscItems } as any);
    syncCollectionToDb(old, miscItems, upsertMiscItem, deleteMiscItem, 'misc_items');
  },
  setMiscLabels: (miscLabels: MiscLabel[]) => {
    const old = (get() as any).miscLabels ?? [];
    set({ miscLabels } as any);
    syncCollectionToDb(old, miscLabels, upsertMiscLabel, deleteMiscLabel, 'misc_labels');
  },

  addQualityControl: (qc) => {
    set((state) => ({ qualityControls: [qc, ...state.qualityControls] }));
    upsertQualityControl(qc).catch(e => console.error('[quality_controls] upsert failed', e));
  },
  updateQualityControl: (id, updates) => {
    let updated: any;
    set((state) => ({
      qualityControls: state.qualityControls.map(q => {
        if (q.id !== id) return q;
        updated = { ...q, ...updates, updatedAt: new Date() };
        return updated;
      }),
    }));
    if (updated) upsertQualityControl(updated).catch(e => console.error('[quality_controls] update failed', e));
  },
  deleteQualityControl: (id) => {
    set((state) => ({
      qualityControls: state.qualityControls.filter(q => q.id !== id),
    }));
    deleteQualityControlRow(id).catch(e => console.error('[quality_controls] delete failed', e));
  },

  // Permission helper
  hasPermission: (permission) => {
    const state = get();
    if (!state.currentUser) return false;
    const role = state.settings.roles.find(r => r.id === state.currentUser!.role);
    return role?.permissions.includes(permission) ?? false;
  },

  loadSettingsFromDB: async () => {
    try {
      const sb = supabase as any;
      // Load app_settings from Supabase
      const { data: settingsRow, error: settingsErr } = await sb
        .from('app_settings')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();

      // Load system_roles from Supabase
      const { data: rolesRows, error: rolesErr } = await sb
        .from('system_roles')
        .select('*');

      if (settingsErr) console.warn('[store] app_settings load error:', settingsErr.message);
      if (rolesErr) console.warn('[store] system_roles load error:', rolesErr.message);

      let dbRoles: SystemRole[] = (rolesRows ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        isDefault: r.is_default,
        permissions: r.permissions ?? [],
      }));

      // First-run bootstrap: if the system_roles table is empty, seed it with
      // the built-in role set so the DB becomes the source of truth going forward.
      if (!rolesErr && dbRoles.length === 0) {
        try {
          dbRoles = await seedSystemRolesIfEmpty(defaultRoles);
        } catch (seedErr) {
          console.warn('[store] system_roles seed failed', seedErr);
        }
      }

      const dbSettings: Partial<AppSettings> = {};

      if (settingsRow) {
        const vars = (settingsRow.variables ?? {}) as Record<string, any>;
        dbSettings.idPrefix = settingsRow.id_prefix || undefined;
        dbSettings.defaultRoleId = settingsRow.default_role_id || undefined;
        // Restore uniqueIdentifierColumn from variables if saved there
        if (vars.uniqueIdentifierColumn) {
          (dbSettings as any).uniqueIdentifierColumn = vars.uniqueIdentifierColumn;
        }
        // Restore visibleColumns
        if (settingsRow.visible_columns && Object.keys(settingsRow.visible_columns).length > 0) {
          dbSettings.visibleColumns = settingsRow.visible_columns;
        }
        // Merge remaining variables from DB into settings
        const { uniqueIdentifierColumn: _uid, ...restVars } = vars;
        if (Object.keys(restVars).length > 0) {
          dbSettings.variables = restVars as any;
        }
      }

      // Merge: DB wins over current store for role list; settings are deep-merged
      const currentSettings = useStore.getState().settings;
      const mergedSettings = mergeSettingsWithDefaults({
        ...currentSettings,
        ...dbSettings,
        variables: {
          ...currentSettings.variables,
          ...(dbSettings.variables ?? {}),
        },
      });

      // If DB has roles, use them; otherwise fall back to existing store roles
      let finalRoles = dbRoles.length > 0
        ? dbRoles
        : mergedSettings.roles;

      // Local edits made in this browser take precedence over the DB copy:
      // Supabase writes for system_roles can fail (e.g. RLS rejects writes
      // from unauthenticated/anon sessions), and without this override a
      // refresh would silently discard permission changes made in Settings
      // by re-pulling the stale/never-updated DB row. Roles that only exist
      // in the DB (created elsewhere) are still picked up.
      const cachedRoles = loadCachedRoles();
      if (cachedRoles) {
        const cachedById = new Map(cachedRoles.map(r => [r.id, r]));
        finalRoles = finalRoles.map(r => cachedById.get(r.id) ?? r);
        const finalIds = new Set(finalRoles.map(r => r.id));
        for (const r of cachedRoles) {
          if (!finalIds.has(r.id)) finalRoles.push(r);
        }
      }
      saveCachedRoles(finalRoles);

      useStore.setState({
        settings: { ...mergedSettings, roles: finalRoles },
      });
    } catch (err) {
      console.warn('[store] loadSettingsFromDB failed (offline?)', err);
    }
  },

  saveSettingsToDB: async () => {
    try {
      const { settings } = useStore.getState();
      // Save idPrefix, defaultRoleId, visibleColumns, and uniqueIdentifierColumn to app_settings.
      // variables in app_settings is used for settings that don't have their own column.
      const existingVars = (settings.variables as any) ?? {};
      // Persist ALL variables to Supabase so hospital prefixes, maintenance templates,
      // stain categories, protocols, patient types, etc. survive a browser refresh.
      // uniqueIdentifierColumn is stored inside variables for round-trip compatibility.
      const row = {
        id: 'main',
        id_prefix: settings.idPrefix ?? 'HBX',
        default_role_id: settings.defaultRoleId ?? 'role-default',
        visible_columns: settings.visibleColumns ?? {},
        // Store uniqueIdentifierColumn inside variables so it survives DB round-trips
        variables: {
          ...existingVars,
          uniqueIdentifierColumn: settings.uniqueIdentifierColumn,
        },
          uniqueIdentifierColumn: settings.uniqueIdentifierColumn,
        },
        updated_at: new Date().toISOString(),
      };
      const sb = supabase as any;
      const { error } = await sb.from('app_settings').upsert(row);
      if (error) console.error('[settings] saveSettingsToDB error:', error.message);
      else console.log('[settings] Saved to Supabase OK');
    } catch (err) {
      console.error('[settings] saveSettingsToDB failed', err);
    }
  },

  fetchAll: async () => {
    try {
      const [
        reports, equipment, requests, queryCases,
        reagents, consumables, manuals,
        immunoReagents, immunoRuns, labSupplies,
        exams, examSubmissions, examBank,
        rosters, miscTabs, miscLabels, miscItems,
        qualityControls,
      ] = await Promise.allSettled([
        fetchReports(), fetchEquipment(), fetchRequests(), fetchQueryCases(),
        fetchReagents(), fetchConsumables(), fetchManuals(),
        fetchImmunoReagents(), fetchImmunoRuns(), fetchLabSupplies(),
        fetchExams(), fetchExamSubmissions(), fetchExamBank(),
        fetchRosters(), fetchMiscTabs(), fetchMiscLabels(), fetchMiscItems(),
        fetchQualityControls(),
      ]);

      // Apply each result only if it succeeded; log failures but don't crash.
      const partial: Partial<AppState> = {};
      const ok = <T>(r: PromiseSettledResult<T>, key: string): T | undefined => {
        if (r.status === 'fulfilled') return r.value;
        console.warn(`[fetchAll] ${key} failed:`, (r as any).reason?.message ?? r);
        return undefined;
      };
      if (ok(reports, 'reports') !== undefined) partial.reports = ok(reports, 'reports')!;
      if (ok(equipment, 'equipment') !== undefined) partial.equipment = ok(equipment, 'equipment')!;
      if (ok(requests, 'requests') !== undefined) partial.requests = ok(requests, 'requests')!;
      if (ok(queryCases, 'queryCases') !== undefined) partial.queryCases = ok(queryCases, 'queryCases')!;
      if (ok(reagents, 'reagents') !== undefined) partial.reagents = ok(reagents, 'reagents')!;
      if (ok(consumables, 'consumables') !== undefined) partial.consumables = ok(consumables, 'consumables')!;
      if (ok(manuals, 'manuals') !== undefined) partial.manuals = ok(manuals, 'manuals')!;
      if (ok(immunoReagents, 'immunoReagents') !== undefined) partial.immunoReagents = ok(immunoReagents, 'immunoReagents')!;
      if (ok(immunoRuns, 'immunoRuns') !== undefined) partial.immunoRuns = ok(immunoRuns, 'immunoRuns')!;
      if (ok(labSupplies, 'labSupplies') !== undefined) partial.labSupplies = ok(labSupplies, 'labSupplies')!;
      if (ok(exams, 'exams') !== undefined) partial.exams = ok(exams, 'exams')!;
      if (ok(examSubmissions, 'examSubmissions') !== undefined) partial.examSubmissions = ok(examSubmissions, 'examSubmissions')!;
      if (ok(examBank, 'examBank') !== undefined) partial.examBank = ok(examBank, 'examBank')!;
      if (ok(rosters, 'rosters') !== undefined) partial.rosters = ok(rosters, 'rosters')!;
      const tabsResult = ok(miscTabs, 'miscTabs');
      if (tabsResult !== undefined) (partial as any).miscTabs = tabsResult;
      const labelsResult = ok(miscLabels, 'miscLabels');
      if (labelsResult !== undefined) (partial as any).miscLabels = labelsResult;
      const itemsResult = ok(miscItems, 'miscItems');
      if (itemsResult !== undefined) (partial as any).miscItems = itemsResult;
      const qcResult = ok(qualityControls, 'qualityControls');
      if (qcResult !== undefined && (qcResult as any[]).length > 0) partial.qualityControls = qcResult as any;

      // Set state directly (bypassing syncCollectionToDb since this is a load)
      useStore.setState(partial as any);
    } catch (err) {
      console.warn('[store] fetchAll failed', err);
    }
  },
}),
    {
      name: 'histobox-store',
      storage: createJSONStorage(() => supabaseStorage),
      partialize: (state) => ({
        // Blob sync is now a thin fallback layer. All critical entities are
        // fetched fresh from individual Supabase tables on every login via
        // fetchAll(). Only qualityControls (no live table) and darkMode stay here.
        settings: state.settings,
        darkMode: state.darkMode,
        qualityControls: state.qualityControls,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state && !error) {
          useStore.setState({
            settings: mergeSettingsWithDefaults(state.settings),
          });
          useStore.setState({ _hasHydrated: true });
          markHydrationSucceeded();
          // Pull authoritative settings, roles, cases, users & all module
          // entities from Supabase on every session start.
          useStore.getState().loadSettingsFromDB();
          useStore.getState().fetchCases();
          useStore.getState().fetchSystemUsers();
          useStore.getState().fetchAll();
          subscribeToCloudState('histobox-store', (value) => {
            const remoteState = value?.state;
            if (!remoteState) return;
            // Strip all DB-table-backed entities so the blob-sync channel
            // can't clobber them. Also strip settings.roles and
            // settings.defaultRoleId — those come from system_roles table
            // (loaded by loadSettingsFromDB) and must not be overwritten
            // by a stale blob copy (this prevents the admin-removal bug).
            const {
              cases: _rc, systemUsers: _rsu,
              reports: _rr, equipment: _req, requests: _rreq, queryCases: _rqc,
              reagents: _rrg, consumables: _rco, manuals: _rma,
              immunoReagents: _rir, immunoRuns: _riru, labSupplies: _rls,
              exams: _rex, examSubmissions: _res, examBank: _reb,
              rosters: _rro, miscTabs: _rmt, miscItems: _rmi, miscLabels: _rml,
              ...restRemoteState
            } = remoteState as any;

            // Preserve DB-loaded roles in the merge
            const currentRoles = useStore.getState().settings.roles;
            const mergedSettings = mergeSettingsWithDefaults(remoteState.settings);
            // Restore DB roles (don't let blob overwrite them)
            if (currentRoles.length > 0) {
              mergedSettings.roles = currentRoles;
            }

            applyRemoteStateWithoutEcho(() => {
              useStore.setState({
                ...restRemoteState,
                settings: mergedSettings,
                currentUser: useStore.getState().currentUser,
                isAuthenticated: useStore.getState().isAuthenticated,
                _hasHydrated: true,
              });
            });
          });
          if (state.darkMode) {
            document.documentElement.classList.add('dark');
          }
        } else {
          // Hydration FAILED. Do NOT mark hydration as succeeded — this blocks
          // any subsequent writes from overwriting real cloud data with defaults.
          if (error) {
            console.error('[store] hydration failed; cloud writes are blocked until reload', error);
          }
          useStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);

export { stepToIngStatus };
