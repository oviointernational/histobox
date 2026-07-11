export type ImmunoReagentType = 'Detection Kit' | 'Marker';
export type ImmunoReagentStatus = 'Unused [New & Sealed]' | 'In use [Active]' | 'Not in use [expired]' | 'Used [exhausted]';

export interface ImmunoReagentLog {
  id: string;
  parentId: string;
  name: string;
  status: ImmunoReagentStatus;
  dateReceived: Date;
  temperatureReceived: string;
  receivedBy: string;
  reconstitutedBy: string;
  validatedBy: string;
  storageTemperature: string;
  lot: string;
  clone: string;
  expiration: Date;
  numberOfSlides: number;
  slidesUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImmunoReagent {
  id: string;
  name: string;
  type: ImmunoReagentType;
  available: boolean;
  quantity: number;
  logs: ImmunoReagentLog[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImmunoRun {
  id: string;
  reagentId: string;
  reagentName: string;
  date: Date;
  doneBy: string[];
  numberOfSlides: number;
  createdAt: Date;
}
