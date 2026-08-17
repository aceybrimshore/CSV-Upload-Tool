export interface PartItem {
  internalId: string;
  type?: string;
  class?: string;
  partNumber: string;
}

export interface CatalogMetadata {
  isCustom: boolean;
  itemCount: number;
  lastUpdated: string;
  sourceDescription?: string;
}

export interface ExportRow {
  id: string;
  inputPart: string;
  subsidiary_id: string;
  item_id: string;
  part_name: string;
  location: string;
  start_date: string;
  end_date: string;
  quantity: number | string;
  memo: string;
  status: 'matched' | 'not_found' | 'manual';
  matchedClass?: string;
  matchedType?: string;
}

export interface ExporterConfig {
  subsidiary_id: string;
  location: string;
  start_date: string;
  end_date: string;
  default_quantity: number;
  memo: string;
  delimiter: 'comma' | 'tab';
  includeHeader: boolean;
}
