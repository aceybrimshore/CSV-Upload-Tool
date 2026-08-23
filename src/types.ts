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

export interface LocationPreset {
  id: string;
  name: string;
  subsidiary_id: string;
  location: string;
  description?: string;
}

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'sydney',
    name: 'Sydney',
    subsidiary_id: '7',
    location: '25',
    description: 'Sub: 7 | Loc: 25'
  },
  {
    id: 'syd-maxtrax',
    name: 'Syd - Maxtrax',
    subsidiary_id: '23',
    location: '95',
    description: 'Sub: 23 | Loc: 95'
  },
  {
    id: 'syd-tred',
    name: 'Syd - Tred',
    subsidiary_id: '25',
    location: '94',
    description: 'Sub: 25 | Loc: 94'
  }
];

