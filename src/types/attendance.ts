/**
 * attendance.ts — Type definitions for the Attendance module.
 *
 * Flow:
 *  1. Admin creates an Attendance record with a title + dynamic fields
 *     (name + type: text/number/dropdown). An `accessCode` is auto-generated.
 *     A unique registration link is derived from the attendance id.
 *  2. A user opens the registration link, fills the required fields, enters
 *     the access code, and registers. A unique per-user `accessLink` is
 *     generated; the attendee uses this link to mark attendance thereafter.
 *  3. The access code can be regenerated (e.g. after registration closes).
 *  4. Attendance can be toggled on/off. When on, registered attendees can
 *     mark attendance; when off, no one can mark.
 *  5. Anyone with a registered link can see all attendees' performance.
 */

export type AttendanceFieldType = 'Text' | 'Number' | 'Dropdown';

export interface AttendanceField {
  id: string;
  label: string;
  type: AttendanceFieldType;
  required: boolean;
  options?: string[]; // for Dropdown
}

export interface AttendanceAttendee {
  id: string;
  attendanceId: string;
  /** Per-attendee access link token (used in the marking URL) */
  accessLink: string;
  /** Registration field answers keyed by field label */
  details: Record<string, string>;
  registeredAt: Date;
  /** Attendance mark records: date string (ISO) → timestamp of mark */
  marks: Record<string, string>; // YYYY-MM-DD -> ISO timestamp
}

export interface AttendanceLogEntry {
  id: string;
  event: string;
  timestamp: Date;
  user: string;
  details?: string;
}

export interface Attendance {
  id: string;
  title: string;
  /** Admin-generated code required to register */
  accessCode: string;
  /** Whether the attendance is open for marking */
  isOpen: boolean;
  /** Dynamic fields configured during creation */
  fields: AttendanceField[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  logs: AttendanceLogEntry[];
}
