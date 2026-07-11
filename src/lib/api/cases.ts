import { supabase } from '@/integrations/supabase/client';
import type { CaseEntry } from '@/types';

// Untyped table accessor — `cases` isn't in the generated Database types.
const sb = supabase as any;

function toRow(entry: CaseEntry) {
  return {
    id: entry.id,
    lab_number: entry.labNumber ?? '',
    hospital_number: entry.hospitalNumber ?? '',
    surname: entry.surname ?? '',
    first_name: entry.firstName ?? '',
    middle_name: entry.middleName ?? null,
    care_of: entry.careOf ?? null,
    age: entry.age ?? 0,
    gender: entry.gender,
    nationality: entry.nationality ?? '',
    occupation: entry.occupation ?? '',
    ward: entry.ward ?? '',
    consultant: entry.consultant ?? '',
    is_external_block: entry.isExternalBlock ?? false,
    external_source: entry.externalSource ?? null,
    type_of_sample: entry.typeOfSample,
    nature_of_sample: entry.natureOfSample,
    patient_type: entry.patientType ?? '',
    examination: entry.examination ?? '',
    provisional_diagnosis: entry.provisionalDiagnosis ?? '',
    clinical_details: entry.clinicalDetails ?? '',
    gross: entry.gross ?? '',
    case_type: entry.caseType,
    total_cassettes: entry.totalCassettes ?? null,
    cassette_labels: entry.cassetteLabels ?? null,
    cytology_details: entry.cytologyDetails ?? null,
    cyto_analysis_methods: entry.cytoAnalysisMethods ?? null,
    current_status: entry.currentStatus,
    current_step: entry.currentStep,
    fixation_status: entry.fixationStatus ?? null,
    processing_status: entry.processingStatus ?? null,
    embedding_status: entry.embeddingStatus ?? null,
    microtomy_status: entry.microtomyStatus ?? null,
    cyto_analysis_status: entry.cytoAnalysisStatus ?? null,
    staining_status: entry.stainingStatus ?? null,
    mounting_status: entry.mountingStatus ?? null,
    qc_status: entry.qcStatus ?? null,
    qc_comment: entry.qcComment ?? null,
    qc_criteria: entry.qcCriteria ?? null,
    qc_return_info: entry.qcReturnInfo ?? null,
    sign_out_status: entry.signOutStatus ?? null,
    sign_out_comment: entry.signOutComment ?? null,
    is_query: entry.isQuery ?? false,
    query_count: entry.queryCount ?? 0,
    flags: entry.flags ?? [],
    logs: entry.logs ?? [],
    comments: entry.comments ?? {},
    sub_items: entry.subItems ?? null,
    stain_runs: entry.stainRuns ?? null,
    resident_doctor: entry.residentDoctor ?? null,
    resident_doctor_name: entry.residentDoctorName ?? null,
    mls_on_call: entry.mlsOnCall ?? null,
    mls_on_call_name: entry.mlsOnCallName ?? null,
    resident_doctors: entry.residentDoctors ?? null,
    mls_on_calls: entry.mlsOnCalls ?? null,
    mls_in_charge: entry.mlsInCharge ?? null,
    mls_on_bench_list: entry.mlsOnBenchList ?? null,
    decal: entry.decal ?? false,
    hospital_unit: entry.hospitalUnit ?? null,
    protocol_id: entry.protocolId ?? null,
    protocol_override: entry.protocolOverride ?? false,
    protocol_override_by: entry.protocolOverrideBy ?? null,
    reagent_checks: entry.reagentChecks ?? null,
    step_parameters: entry.stepParameters ?? null,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: any): CaseEntry {
  const logs = (row.logs ?? []).map((l: any) => ({
    ...l,
    timestamp: l.timestamp ? new Date(l.timestamp) : new Date(),
  }));
  return {
    id: row.id,
    labNumber: row.lab_number ?? '',
    hospitalNumber: row.hospital_number ?? '',
    surname: row.surname ?? '',
    firstName: row.first_name ?? '',
    middleName: row.middle_name ?? undefined,
    careOf: row.care_of ?? undefined,
    age: row.age ?? 0,
    gender: row.gender,
    nationality: row.nationality ?? '',
    occupation: row.occupation ?? '',
    ward: row.ward ?? '',
    consultant: row.consultant ?? '',
    isExternalBlock: row.is_external_block ?? false,
    externalSource: row.external_source ?? undefined,
    typeOfSample: row.type_of_sample,
    natureOfSample: row.nature_of_sample,
    patientType: row.patient_type ?? '',
    examination: row.examination ?? '',
    provisionalDiagnosis: row.provisional_diagnosis ?? '',
    clinicalDetails: row.clinical_details ?? '',
    gross: row.gross ?? '',
    caseType: row.case_type,
    totalCassettes: row.total_cassettes ?? undefined,
    cassetteLabels: row.cassette_labels ?? undefined,
    cytologyDetails: row.cytology_details ?? undefined,
    cytoAnalysisMethods: row.cyto_analysis_methods ?? undefined,
    currentStatus: row.current_status,
    currentStep: row.current_step,
    fixationStatus: row.fixation_status ?? undefined,
    processingStatus: row.processing_status ?? undefined,
    embeddingStatus: row.embedding_status ?? undefined,
    microtomyStatus: row.microtomy_status ?? undefined,
    cytoAnalysisStatus: row.cyto_analysis_status ?? undefined,
    stainingStatus: row.staining_status ?? undefined,
    mountingStatus: row.mounting_status ?? undefined,
    qcStatus: row.qc_status ?? undefined,
    qcComment: row.qc_comment ?? undefined,
    qcCriteria: row.qc_criteria ?? undefined,
    qcReturnInfo: row.qc_return_info ?? undefined,
    signOutStatus: row.sign_out_status ?? undefined,
    signOutComment: row.sign_out_comment ?? undefined,
    isQuery: row.is_query ?? false,
    queryCount: row.query_count ?? 0,
    flags: row.flags ?? [],
    logs,
    comments: row.comments ?? {},
    subItems: row.sub_items ?? undefined,
    stainRuns: row.stain_runs ?? undefined,
    residentDoctor: row.resident_doctor ?? undefined,
    residentDoctorName: row.resident_doctor_name ?? undefined,
    mlsOnCall: row.mls_on_call ?? undefined,
    mlsOnCallName: row.mls_on_call_name ?? undefined,
    residentDoctors: row.resident_doctors ?? undefined,
    mlsOnCalls: row.mls_on_calls ?? undefined,
    mlsInCharge: row.mls_in_charge ?? undefined,
    mlsOnBenchList: row.mls_on_bench_list ?? undefined,
    decal: row.decal ?? false,
    hospitalUnit: row.hospital_unit ?? undefined,
    protocolId: row.protocol_id ?? undefined,
    protocolOverride: row.protocol_override ?? undefined,
    protocolOverrideBy: row.protocol_override_by ?? undefined,
    reagentChecks: row.reagent_checks ?? undefined,
    stepParameters: row.step_parameters ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  } as CaseEntry;
}

export async function fetchCases(): Promise<CaseEntry[]> {
  const { data, error } = await sb.from('cases').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function insertCase(entry: CaseEntry): Promise<void> {
  const { error } = await sb.from('cases').insert(toRow(entry));
  if (error) throw error;
}

export async function updateCaseRow(id: string, entry: CaseEntry): Promise<void> {
  const { error } = await sb.from('cases').update(toRow(entry)).eq('id', id);
  if (error) throw error;
}

export async function deleteCaseRow(id: string): Promise<void> {
  const { error } = await sb.from('cases').delete().eq('id', id);
  if (error) throw error;
}
