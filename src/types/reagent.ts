export interface ReagentUsageLog {
  id: string;
  reagentId: string;
  date: Date;
  usedBy: string[];
  amountUsed: number;
  notes?: string;
}

export interface ReagentPreparation {
  id: string;
  reagentId: string;
  preparedBy: string;
  assistedBy: string[];
  validatedBy: string;
  datePrepared: Date;
  quantity: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Reagent {
  id: string;
  name: string;
  available: boolean;
  totalStock: number;
  unit: string;
  preparations: ReagentPreparation[];
  usageLogs: ReagentUsageLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsumableEntry {
  id: string;
  consumableId: string;
  lotNumber: string;
  receivedDate: Date;
  expiration: Date;
  quantity: number;
  dispensed: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ReagentConsumable {
  id: string;
  name: string;
  available: boolean;
  unit: string;
  entries: ConsumableEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ManualStep {
  id: string;
  action: string;
  duration: string; // empty = comment
  children: ManualStep[];
}

export interface SOPEntry {
  id: string;
  manualId: string;
  steps: ManualStep[];
  authoredBy: string;
  approvedBy: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReagentManual {
  id: string;
  name: string;
  available: boolean;
  sops: SOPEntry[];
  createdAt: Date;
  updatedAt: Date;
}
