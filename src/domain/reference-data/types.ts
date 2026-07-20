import type { ReferenceSetKey } from "@/domain/reference-data/set-keys";

export interface ReferenceDataSet {
  key: ReferenceSetKey;
  name: string;
  description: string | null;
  isAdminManaged: boolean;
}

export interface ReferenceDataItem {
  id: string;
  setKey: ReferenceSetKey;
  code: string;
  label: string;
  parentCode: string | null;
  searchText: string;
  sortOrder: number;
  isEnabled: boolean;
  isArchived: boolean;
  metadata: Record<string, unknown>;
}

export interface ReferenceDataItemInput {
  code: string;
  label: string;
  parentCode?: string | null;
  searchTerms?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface ReferenceDataOption {
  code: string;
  label: string;
  parentCode?: string | null;
  searchText: string;
  metadata?: Record<string, unknown>;
}
