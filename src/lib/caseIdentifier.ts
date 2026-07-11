/**
 * caseIdentifier.ts
 *
 * Returns the configured unique identifier value for a case.
 * Reads `settings.uniqueIdentifierColumn` to decide which field to show as the
 * primary case identifier throughout the workflow UI (BenchFlow, Microscopy,
 * CaseLog, etc.). Falls back to labNumber if the configured column is missing.
 */
import type { CaseEntry, AppSettings } from '@/types';

export function getCaseIdentifier(c: CaseEntry, settings: Pick<AppSettings, 'uniqueIdentifierColumn'>): string {
  const col = settings.uniqueIdentifierColumn ?? 'hospitalNumber';
  switch (col) {
    case 'patientName':     return `${c.surname ?? ''} ${c.firstName ?? ''}`.trim() || c.hospitalNumber;
    case 'natureOfSample':  return c.natureOfSample || c.hospitalNumber;
    case 'typeOfSample':    return c.typeOfSample || c.hospitalNumber;
    case 'patientType':     return c.patientType || c.hospitalNumber;
    case 'hospitalNumber':
    default:                return c.hospitalNumber;
  }
}

/** Column header label for the identifier column */
export function getCaseIdentifierLabel(settings: Pick<AppSettings, 'uniqueIdentifierColumn'>): string {
  const col = settings.uniqueIdentifierColumn ?? 'hospitalNumber';
  const labels: Record<string, string> = {
    hospitalNumber: 'Lab No.',
    patientName: 'Patient',
    natureOfSample: 'Nature',
    typeOfSample: 'Type',
    patientType: 'Patient Type',
  };
  return labels[col] ?? 'Lab No.';
}
