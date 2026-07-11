export interface LabSupplyEntry {
  id: string;
  supplyId: string;
  type: 'input' | 'output';
  quantity: number;
  parameters: Record<string, string>;
  createdAt: Date;
}

export interface LabSupply {
  id: string;
  name: string;
  unit: string;
  storeLocation?: string;
  entries: LabSupplyEntry[];
  createdAt: Date;
  updatedAt: Date;
}
