export type SampleType = string;
export type NatureOfSample = string;
export type Gender = 'Male' | 'Female';
export type PatientType = string;

export type CaseType = 'Histology' | 'Cytology' | 'Post Mortem';

export type FixationStatus = 'Room Fixing' | 'Heat Fixing' | 'ReFixing' | 'Decalcifying' | 'Fixed';
export type ProcessingStatus = 'Processing' | 'Processed';
export type EmbeddingStatus = 'Embedding' | 'Embedded';
export type MicrotomyStatus = 'Microtomy' | 'Microtomed';
export type StainingStatus = 'Staining' | 'Stained';
export type MountingStatus = 'Mounting' | 'Mounted';
export type CytoAnalysisStatus = 'Analysing' | 'Analysed';
export type QCStatus = 'Passed' | 'Failed';
export type SignOutStatus = 'Approved' | 'Unapproved';

export type BenchStep = 'Fixation' | 'Processing' | 'Embedding' | 'Microtomy' | 'Cyto Analysis' | 'Staining' | 'Mounting';
export type CaseStatus = 'Entered' | 'Fixing' | 'Fixed' | 'Processing' | 'Processed' | 'Embedding' | 'Embedded' | 'Microtomy' | 'Microtomed' | 'Analysing' | 'Analysed' | 'Staining' | 'Stained' | 'Mounting' | 'Mounted' | 'QC Passed' | 'QC Failed' | 'Done' | 'Returned' | 'Approved' | 'Unapproved' | 'Query' | 'Signed Out' | 'Decalcifying';

export interface CassetteLabel {
  label: string;
  number: number;
}

export interface CytologyDetail {
  label: string;
  value: string;
}

export interface LogEntry {
  id: string;
  caseId: string;
  event: string;
  timestamp: Date;
  user: string;
  details?: string;
}

export interface StainRun {
  id: string;
  stainTypes: string[];
  status: 'Staining' | 'Stained' | 'Mounting' | 'Mounted' | 'Done';
  createdAt: Date;
  isDefault: boolean;
}

export interface Personnel {
  id: string;
  name: string;
  initials: string;
}

export interface QCReturnInfo {
  failedSteps: string[];
  failedCriteria?: string[];
  comment?: string;
  returnedAt: Date;
  returnCount: number;
}

// Renamed from CaseIssue → CaseFlag
export interface CaseFlag {
  id: string;
  description: string;
  isFixed: boolean;
  createdAt: Date;
  fixedAt?: Date;
  fixedBy?: string;
  createdBy: string;
}

// Keep backward compat alias
export type CaseIssue = CaseFlag;

export interface StainCategory {
  id: string;
  name: string;
  stains: string[];
}

export interface QCCriteriaCategory {
  id: string;
  name: string;
  items: string[];
}

export interface SpecialRequest {
  id: string;
  caseId: string;
  requestType: string;
  selectedBlocks: string[];
  selectedStains?: string[];
  status: 'Pending' | 'In Progress' | 'Completed';
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
  logs: LogEntry[];
}

export interface QueryCase {
  id: string;
  labNumber: string;
  patientName: string;
  residentDoctor: string;
  residentDoctorInitials: string;
  mls: string;
  mlsInitials: string;
  status: 'Open' | 'Resolved';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  logs: LogEntry[];
}

export interface SystemRole {
  id: string;
  name: string;
  isDefault: boolean;
  permissions: string[];
}

export type OfficeType = 'MLS' | 'IMLS' | 'MLT' | 'MLA';

export interface SystemUser {
  id: string;
  name: string;
  gender: Gender;
  raNumber: string;
  phone: string;
  email: string;
  office: OfficeType;
  designation: string;
  roleId: string;
  isActive: boolean;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Protocol types
export interface ProtocolStep {
  reagent: string;
  duration: string;
  concentration: string;
  temperature?: string;
}

export interface ProcessingProtocol {
  id: string;
  name: string;
  sampleTypes: string[]; // auto-linked to these sample types
  steps: ProtocolStep[];
}

export interface ProtocolReagentCheck {
  checkedAt: Date;
  checkedBy: string;
  adjustments?: Record<number, { concentration?: string; notes?: string }>;
}

export interface CaseEntry {
  id: string;
  labNumber: string;
  hospitalNumber: string;
  surname: string;
  firstName: string;
  middleName?: string;
  /** Person responsible for the case when patient details are unknown */
  careOf?: string;
  age: number;
  gender: Gender;
  nationality: string;
  occupation: string;
  ward: string;
  consultant: string;
  /** External tissue block — already embedded, skips to staining */
  isExternalBlock?: boolean;
  externalSource?: string;
  typeOfSample: SampleType;
  natureOfSample: NatureOfSample;
  patientType: string;
  examination: string;
  provisionalDiagnosis: string;
  clinicalDetails: string;
  gross: string;
  caseType: CaseType;
  totalCassettes?: number;
  cassetteLabels?: CassetteLabel[];
  cytologyDetails?: CytologyDetail[];
  cytoAnalysisMethods?: string[];
  currentStatus: CaseStatus;
  currentStep: BenchStep | 'Microscopy' | 'Slide Movement' | 'SignOut' | 'Done';
  fixationStatus?: string;
  processingStatus?: string;
  embeddingStatus?: string;
  microtomyStatus?: string;
  cytoAnalysisStatus?: string;
  stainingStatus?: string;
  mountingStatus?: string;
  qcStatus?: QCStatus;
  qcComment?: string;
  qcCriteria?: string[];
  qcReturnInfo?: QCReturnInfo;
  signOutStatus?: SignOutStatus;
  signOutComment?: string;
  /** Slide movement fields — populated when case transitions through the Slide Movement step */
  slideMovedBy?: string;
  slideMovedAt?: string;
  slideMovementNotes?: string;
  isQuery?: boolean;
  queryCount?: number;
  flags?: CaseFlag[];
  /** @deprecated use flags */
  issues?: CaseFlag[];
  logs: LogEntry[];
  createdAt: Date;
  updatedAt: Date;
  comments: Record<string, string[]>;
  subItems?: SubItem[];
  stainRuns?: StainRun[];
  residentDoctor?: string;
  residentDoctorName?: string;
  mlsOnCall?: string;
  mlsOnCallName?: string;
  /** Multi-select personnel (initials & names, parallel arrays) */
  residentDoctors?: { initials: string; name: string }[];
  mlsOnCalls?: { initials: string; name: string }[];
  mlsInCharge?: string;
  mlsOnBenchList?: string[];
  decal?: boolean;
  hospitalUnit?: string;
  /** Protocol */
  protocolId?: string;
  protocolOverride?: boolean;
  protocolOverrideBy?: string;
  /** Reagent condition checks per bench step */
  reagentChecks?: Record<string, ProtocolReagentCheck>;
  /** Per-step key-value parameters */
  stepParameters?: Record<string, Record<string, string>>;
  caseDetails?: { key: string; value: string }[];
}

export interface SubItem {
  id: string;
  label: string;
  currentStep: BenchStep | 'Microscopy' | 'Done';
  currentStatus: string;
  selected?: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  raNumber?: string;
}

export type UserRole = 'superuser' | 'admin' | 'pathologist' | 'scientist' | 'technician' | 'viewer';

export interface Report {
  id: string;
  serialNumber: number;
  title: string;
  category: 'Incident' | 'Occurrence';
  type: string;
  reportedBy: string;
  mlsInCharge: string;
  superiorReported: string;
  location: string;
  description: string;
  immediateAction: string;
  rootCauseAnalysis: string;
  correctiveActions: string;
  createdAt: Date;
  updatedAt: Date;
  logs: LogEntry[];
}

export interface MaintenanceLog {
  id: string;
  date: Date;
  performedBy: string;
  notes: string;
  checklistCompleted: Record<string, boolean>;
}

export interface Equipment {
  id: string;
  name: string;
  imageUrl?: string;
  commissioned: boolean;
  templateId: string;
  maintenanceLogs: MaintenanceLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceTemplate {
  id: string;
  name: string;
  checklist: string[];
}

export interface HospitalPrefix {
  id: string;
  hospitalUnit: string;
  prefix: string;
}

export interface AppSettings {
  idPrefix: string;
  supportLink?: string;
  visibleColumns: {
    hospitalNumber: boolean;
    patientName: boolean;
    natureOfSample: boolean;
    typeOfSample: boolean;
    patientType: boolean;
  };
  /** The one column that is treated as the site-wide unique identifier for cases. Always visible everywhere. */
  uniqueIdentifierColumn?: 'hospitalNumber' | 'patientName' | 'natureOfSample' | 'typeOfSample' | 'patientType';
  variables: {
    natureOfSamples: string[];
    typesOfSamples: string[];
    nationalities: string[];
    qcCriteriaHistology: string[];
    qcCriteriaCytology: string[];
    reportTypes: string[];
    reportLocations: string[];
    maintenanceTemplates: MaintenanceTemplate[];
    stainTypes: string[];
    stainCategories: StainCategory[];
    residentDoctors: Personnel[];
    mlsOnCall: Personnel[];
    requestTypes: string[];
    hospitalPrefixes: HospitalPrefix[];
    labSupplyTypes: string[];
    labSupplyParams: string[];
    patientTypes?: string[];
    detailKeys?: string[];
    protocols?: ProcessingProtocol[];
    examSchools?: string[];
    examLevels?: string[];
    examInternSets?: string[];
    examDifficulties?: string[];
    storageUnits?: string[];
    rosterFeeds?: { id: string; name: string }[];
    qcCriteriaCategories?: QCCriteriaCategory[];
    qcParameters?: string[];
    natureOfSampleTypes?: Record<string, string[]>;
    fieldConfig?: Record<string, { required: boolean; enabled: boolean }>;
  };
  roles: SystemRole[];
  defaultRoleId: string;
  dbSyncUrl?: string;
  dbSyncEnabled?: boolean;
  siteName?: string;
  immunoDepletionThreshold?: number;
  /** Days before a case is considered delayed */
  delayedDays?: number;
  /** Hours before stain is considered delayed (default 48) */
  stainDelayHours?: number;
}

// All system-wide permissions
export const ALL_PERMISSIONS = [
  // Overview
  'view_overview',
  // Cases & Entry
  'view_cases', 'add_entry', 'edit_entry', 'delete_entry',
  // Bench Flow
  'bench_fixation', 'bench_processing', 'bench_embedding', 'bench_microtomy', 'bench_cyto_analysis', 'bench_staining', 'bench_mounting',
  // Microscopy
  'view_microscopy', 'submit_microscopy',
  // Slide Movement
  'view_slide_movement', 'mark_slide_movement', 'confirm_slide_movement', 'raise_slide_movement_issue',
  // Case Sign Out
  'view_signout', 'add_signout', 'edit_signout', 'signout_approve',
  // Quality Control
  'view_qc', 'add_qc', 'edit_qc', 'delete_qc',
  // Reports
  'view_reports', 'add_reports', 'edit_reports', 'delete_reports',
  // Maintenance
  'view_maintenance', 'add_maintenance', 'edit_maintenance', 'delete_maintenance',
  // Reagent
  'view_reagent', 'add_reagent', 'edit_reagent', 'delete_reagent',
  // Immuno Reagent
  'view_immuno_reagent', 'add_immuno_reagent', 'edit_immuno_reagent', 'delete_immuno_reagent',
  // Immuno Manual
  'view_immuno_manual', 'add_immuno_manual', 'edit_immuno_manual', 'delete_immuno_manual',
  // Lab Inventory
  'view_lab_supply', 'add_lab_supply', 'edit_lab_supply', 'delete_lab_supply',
  // Request
  'view_requests', 'add_requests', 'edit_requests', 'delete_requests', 'manage_requests',
  // Query
  'view_query', 'add_query', 'edit_query', 'delete_query', 'manage_query',
  // Exam
  'view_exam', 'add_exam', 'edit_exam', 'delete_exam',
  // Attendance
  'view_attendance', 'add_attendance', 'edit_attendance', 'delete_attendance',
  // Roster
  'view_roster', 'add_roster', 'edit_roster', 'delete_roster',
  // Misc
  'view_misc', 'add_misc', 'edit_misc', 'delete_misc',
  // Misc → Labels
  'view_misc_label', 'add_misc_label', 'edit_misc_label', 'delete_misc_label',
  // Misc → Sub-Items
  'view_misc_subitem', 'add_misc_subitem', 'edit_misc_subitem', 'delete_misc_subitem',
  // Stain Data
  'view_stain_data', 'add_stain_data', 'edit_stain_data', 'delete_stain_data',
  // Delayed & Flagged Cases
  'view_delayed_cases', 'manage_delayed_cases',
  'view_flagged_cases', 'manage_flagged_cases',
  // Administration
  'manage_settings', 'manage_roles', 'manage_users', 'register_users', 'manage_db_sync',
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  // Overview
  'view_overview': 'View Overview',
  // Cases & Entry
  'view_cases': 'View Cases',
  'add_entry': 'Add Case Entry',
  'edit_entry': 'Edit Case Entry',
  'delete_entry': 'Delete Case Entry',
  // Bench Flow
  'bench_fixation': 'Bench: Fixation',
  'bench_processing': 'Bench: Processing',
  'bench_embedding': 'Bench: Embedding',
  'bench_microtomy': 'Bench: Microtomy',
  'bench_cyto_analysis': 'Bench: Cyto Analysis',
  'bench_staining': 'Bench: Staining',
  'bench_mounting': 'Bench: Mounting',
  // Microscopy
  'view_microscopy': 'Can View',
  'submit_microscopy': 'Can Submit',
  // Slide Movement
  'view_slide_movement': 'View Slide Movement',
  'mark_slide_movement': 'Can Mark Move',
  'confirm_slide_movement': 'Can Confirm Move',
  'raise_slide_movement_issue': 'Can Raise Issue',
  // Case Sign Out
  'view_signout': 'View Sign Out',
  'add_signout': 'Submit Sign Out',
  'edit_signout': 'Edit Sign Out',
  'signout_approve': 'Sign Out Approval (Legacy)',
  // Quality Control
  'view_qc': 'View Quality Control',
  'add_qc': 'Add Quality Control',
  'edit_qc': 'Edit Quality Control',
  'delete_qc': 'Delete Quality Control',
  // Reports
  'view_reports': 'View Reports',
  'add_reports': 'Add Reports',
  'edit_reports': 'Edit Reports',
  'delete_reports': 'Delete Reports',
  // Maintenance
  'view_maintenance': 'View Maintenance',
  'add_maintenance': 'Add Maintenance',
  'edit_maintenance': 'Edit Maintenance',
  'delete_maintenance': 'Delete Maintenance',
  // Reagent
  'view_reagent': 'View Reagent',
  'add_reagent': 'Add Reagent',
  'edit_reagent': 'Edit Reagent',
  'delete_reagent': 'Delete Reagent',
  // Immuno Reagent
  'view_immuno_reagent': 'View Immuno Reagent',
  'add_immuno_reagent': 'Add Immuno Reagent',
  'edit_immuno_reagent': 'Edit Immuno Reagent',
  'delete_immuno_reagent': 'Delete Immuno Reagent',
  // Immuno Manual
  'view_immuno_manual': 'View Immuno Manual',
  'add_immuno_manual': 'Add Immuno Manual',
  'edit_immuno_manual': 'Edit Immuno Manual',
  'delete_immuno_manual': 'Delete Immuno Manual',
  // Lab Inventory
  'view_lab_supply': 'View Lab Inventory',
  'add_lab_supply': 'Add Lab Inventory',
  'edit_lab_supply': 'Edit Lab Inventory',
  'delete_lab_supply': 'Delete Lab Inventory',
  // Request
  'view_requests': 'View Requests',
  'add_requests': 'Add Request',
  'edit_requests': 'Edit Request',
  'delete_requests': 'Delete Request',
  'manage_requests': 'Manage Requests (Full)',
  // Query
  'view_query': 'View Query',
  'add_query': 'Add Query',
  'edit_query': 'Edit Query',
  'delete_query': 'Delete Query',
  'manage_query': 'Manage Queries (Full)',
  // Exam
  'view_exam': 'View Exam',
  'add_exam': 'Add Exam',
  'edit_exam': 'Edit Exam',
  'delete_exam': 'Delete Exam',
  // Attendance
  'view_attendance': 'View Attendance',
  'add_attendance': 'Add Attendance',
  'edit_attendance': 'Edit Attendance',
  'delete_attendance': 'Delete Attendance',
  // Roster
  'view_roster': 'View Roster',
  'add_roster': 'Add Roster',
  'edit_roster': 'Edit Roster',
  'delete_roster': 'Delete Roster',
  // Misc
  'view_misc': 'View Misc',
  'add_misc': 'Add Misc',
  'edit_misc': 'Edit Misc',
  'delete_misc': 'Delete Misc',
  // Misc → Labels
  'view_misc_label': 'View Misc Label',
  'add_misc_label': 'Add Misc Label',
  'edit_misc_label': 'Edit Misc Label',
  'delete_misc_label': 'Delete Misc Label',
  // Misc → Sub-Items
  'view_misc_subitem': 'View Misc Sub-Item',
  'add_misc_subitem': 'Add Misc Sub-Item',
  'edit_misc_subitem': 'Edit Misc Sub-Item',
  'delete_misc_subitem': 'Delete Misc Sub-Item',
  // Stain Data
  'view_stain_data': 'View Stain Data',
  'add_stain_data': 'Add Stain Data',
  'edit_stain_data': 'Edit Stain Data',
  'delete_stain_data': 'Delete Stain Data',
  // Delayed & Flagged Cases
  'view_delayed_cases': 'View Delayed Cases',
  'manage_delayed_cases': 'Manage Delayed Cases',
  'view_flagged_cases': 'View Flagged Cases',
  'manage_flagged_cases': 'Manage Flagged Cases',
  // Administration
  'manage_settings': 'Manage Settings',
  'manage_roles': 'Manage Roles',
  'manage_users': 'Manage Users',
  'register_users': 'Register New Users',
  'manage_db_sync': 'Manage DB Sync',
};

export interface QCCheck {
  id: string;
  parameter: string;
  timeValue: string;
  timeUnit: 'h' | 'm' | 's';
  result: 'pass' | 'fail' | '';
}

export interface QualityControl {
  id: string;
  serialNumber: number;
  sample: string;
  stainType: string;
  checks: QCCheck[];
  doneBy: string[];
  approvedBy: string[];
  comments: string[];
  createdAt: Date;
  updatedAt: Date;
}
