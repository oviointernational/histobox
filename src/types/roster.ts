export interface RosterFeed {
  id: string;
  name: string;
}

export interface RosterRow {
  id: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  values: Record<string, string>; // feedId -> text value for that cell
}

export interface RosterEntry {
  id: string;
  title: string;
  designedBy: string;
  approvedBy: string;
  rows: RosterRow[];
  /** @deprecated use rows */
  feeds?: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
  logs: RosterLog[];
}

export interface RosterLog {
  id: string;
  event: string;
  timestamp: Date;
  user: string;
  details?: string;
}
