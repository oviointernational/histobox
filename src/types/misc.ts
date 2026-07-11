export type MiscFieldType = 'text' | 'textarea' | 'date' | 'dropdown' | 'number';

export interface MiscLog {
  id: string;
  event: string;
  user: string;
  timestamp: Date;
  details?: string;
}

export interface MiscFieldDef {
  id: string;
  label: string;
  type: MiscFieldType;
  options?: string[]; // for dropdown
  required?: boolean;
}

export interface MiscTab {
  id: string;
  name: string;
  fields: MiscFieldDef[];
  subFields: MiscFieldDef[];
  /** If true, sub-item values must be numeric and contribute to subtotal/total.
   *  If false, the total is entered manually and values can be any text. */
  calculateSubItem?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  logs?: MiscLog[];
}

export interface MiscLabel {
  id: string;
  tabId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  logs?: MiscLog[];
}

export interface MiscComment {
  id: string;
  text: string;
  user: string;
  timestamp: Date;
}

export interface MiscItem {
  id: string;
  tabId: string;
  labelId?: string;
  values: Record<string, string>;
  subItems: MiscSubItem[];
  /** Manual total when the tab does NOT calculate sub-items. */
  manualTotal?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  logs?: MiscLog[];
  comments?: MiscComment[];
}

export interface MiscSubItem {
  id: string;
  values: Record<string, string>;
  createdAt: Date;
  createdBy?: string;
  comments?: MiscComment[];
}
