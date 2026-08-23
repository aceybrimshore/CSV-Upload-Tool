import { useState, useMemo, useEffect } from 'react';
import { PartItem, ExportRow, ExporterConfig, CatalogMetadata } from './types';
import {
  DEFAULT_PARTS_CATALOG,
  lookupPart,
  loadPersistedCatalog,
  savePersistedCatalog,
  resetPersistedCatalog
} from './partsData';
import { SidebarConfig } from './components/SidebarConfig';
import { CsvTablePreview } from './components/CsvTablePreview';
import { CatalogModal } from './components/CatalogModal';
import { FileSpreadsheet, Database, Check, Download, Layers, ShieldCheck, HardDrive } from 'lucide-react';

const SAMPLE_INPUT = `LSE100\t150
RWLB\t144
ARB-ASHD\t144
SP360\t10
RSB03B\t72
RRS-2\t19
DK138\t5
RSK01\t100`;

export default function App() {
  // Load initially from localStorage if user previously imported or modified the database
  const [catalogState, setCatalogState] = useState<{
    catalog: PartItem[];
    meta: CatalogMetadata;
  }>(() => {
    const loaded = loadPersistedCatalog();
    return {
      catalog: loaded.catalog,
      meta: {
        isCustom: loaded.isCustom,
        itemCount: loaded.catalog.length,
        lastUpdated: loaded.lastUpdated || new Date().toISOString(),
        sourceDescription: loaded.sourceDescription
      }
    };
  });

  const catalog = catalogState.catalog;
  const catalogMeta = catalogState.meta;

  const [rawInput, setRawInput] = useState<string>(SAMPLE_INPUT);
  const [copied, setCopied] = useState<boolean>(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);

  // Exporter Configuration defaults matching user specification with localStorage persistence
  const [config, setConfig] = useState<ExporterConfig>(() => {
    const defaultConfig: ExporterConfig = {
      subsidiary_id: '7',
      location: '25',
      start_date: '28/08/2026',
      end_date: '28/08/2026',
      default_quantity: 100,
      memo: 'W34 - CSO TU',
      delimiter: 'comma',
      includeHeader: true
    };
    try {
      const saved = localStorage.getItem('csv_exporter_config_v2');
      if (saved) {
        return { ...defaultConfig, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load saved config', e);
    }
    return defaultConfig;
  });

  // Save config changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('csv_exporter_config_v2', JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save config to localStorage', e);
    }
  }, [config]);

  // Manual row overrides if user manually edits on table
  const [manualOverrides, setManualOverrides] = useState<Record<string, Partial<ExportRow>>>({});

  // Parse lines and compute export rows in real time
  const rows: ExportRow[] = useMemo(() => {
    if (!rawInput.trim()) return [];

    const lines = rawInput.split(/\r?\n/);
    const parsedRows: ExportRow[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract part and optional line quantity/memo if provided in paste
      // e.g. "LSE100 150" or "LSE100\t150" or "LSE100, 150, W34 - CSO TU"
      const delimiters = /[\t,;]/;
      let inputPart = trimmed;
      let lineQty: number | string = config.default_quantity;
      let lineMemo = config.memo;

      if (delimiters.test(trimmed)) {
        const parts = trimmed.split(delimiters).map(p => p.trim());
        if (parts.length > 0) {
          inputPart = parts[0];
        }
        if (parts.length > 1 && parts[1] && !isNaN(Number(parts[1]))) {
          lineQty = Number(parts[1]);
        }
        if (parts.length > 2 && parts[2]) {
          lineMemo = parts.slice(2).join(' ');
        }
      }

      // Lookup internal ID against current active persistent catalog
      const matched = lookupPart(inputPart, catalog);
      const rowId = `row-${index}-${inputPart}`;

      let itemId = '';
      let status: 'matched' | 'not_found' | 'manual' = 'not_found';
      let partName = inputPart;
      let matchedClass: string | undefined;
      let matchedType: string | undefined;

      if (matched) {
        itemId = matched.internalId;
        status = 'matched';
        partName = matched.partNumber;
        matchedClass = matched.class;
        matchedType = matched.type;
      } else if (/^\d+$/.test(inputPart.trim())) {
        // If the user already entered an internal ID directly
        itemId = inputPart.trim();
        status = 'manual';
      }

      // Apply any manual table overrides
      const override = manualOverrides[rowId] || {};

      parsedRows.push({
        id: rowId,
        inputPart,
        subsidiary_id: override.subsidiary_id ?? config.subsidiary_id,
        item_id: override.item_id ?? itemId,
        part_name: partName,
        location: override.location ?? config.location,
        start_date: override.start_date ?? config.start_date,
        end_date: override.end_date ?? config.end_date,
        quantity: override.quantity ?? lineQty,
        memo: override.memo ?? lineMemo,
        status: override.status ?? status,
        matchedClass,
        matchedType
      });
    });

    return parsedRows;
  }, [rawInput, config, catalog, manualOverrides]);

  const handleUpdateRow = (id: string, field: keyof ExportRow, value: any) => {
    setManualOverrides(prev => {
      const current = prev[id] || {};
      if (field === 'start_date') {
        return {
          ...prev,
          [id]: {
            ...current,
            start_date: value,
            end_date: value
          }
        };
      }
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleRemoveRow = (id: string) => {
    // optional remove row
  };

  // Generate CSV / TSV text formatted exactly as user requested
  const generateExportText = (): string => {
    const sep = config.delimiter === 'tab' ? '\t' : ',';
    const outputLines: string[] = [];

    if (config.includeHeader) {
      outputLines.push(
        ['subsidiary_id', 'item_id', 'location', 'start_date', 'end_date', 'quantity', 'memo'].join(sep)
      );
    }

    rows.forEach(r => {
      const escape = (val: string | number) => {
        const str = String(val ?? '');
        if (config.delimiter === 'comma' && (str.includes(',') || str.includes('"') || str.includes('\n'))) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      outputLines.push(
        [
          escape(r.subsidiary_id),
          escape(r.item_id),
          escape(r.location),
          escape(r.start_date),
          escape(r.end_date),
          escape(r.quantity),
          escape(r.memo)
        ].join(sep)
      );
    });

    return outputLines.join('\n');
  };

  const handleExportDownload = () => {
    if (rows.length === 0) return;
    const content = generateExportText();
    const isTab = config.delimiter === 'tab';
    const blob = new Blob([content], { type: isTab ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `part_export_${new Date().toISOString().slice(0, 10)}.${isTab ? 'tsv' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    if (rows.length === 0) return;
    const content = generateExportText();
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClear = () => {
    setRawInput('');
    setManualOverrides({});
  };

  const handleLoadSample = () => {
    setRawInput(SAMPLE_INPUT);
    setManualOverrides({});
  };

  // Database operations with automatic local storage persistence
  const handleAddPart = (newPart: PartItem) => {
    const updated = [newPart, ...catalog.filter(p => p.partNumber.toUpperCase() !== newPart.partNumber.toUpperCase())];
    savePersistedCatalog(updated, true, 'User Added Part');
    setCatalogState({
      catalog: updated,
      meta: {
        isCustom: true,
        itemCount: updated.length,
        lastUpdated: new Date().toISOString(),
        sourceDescription: 'User Added Part'
      }
    });
  };

  const handleUpdatePart = (index: number, updatedItem: PartItem) => {
    const updated = [...catalog];
    if (index >= 0 && index < updated.length) {
      updated[index] = updatedItem;
    } else {
      updated.unshift(updatedItem);
    }
    savePersistedCatalog(updated, true, 'User Edited Part');
    setCatalogState({
      catalog: updated,
      meta: {
        isCustom: true,
        itemCount: updated.length,
        lastUpdated: new Date().toISOString(),
        sourceDescription: 'User Edited Part'
      }
    });
  };

  const handleDeletePart = (partNumber: string, internalId: string) => {
    const updated = catalog.filter(
      item => !(item.partNumber === partNumber && item.internalId === internalId)
    );
    savePersistedCatalog(updated, true, 'User Deleted Part');
    setCatalogState({
      catalog: updated,
      meta: {
        isCustom: true,
        itemCount: updated.length,
        lastUpdated: new Date().toISOString(),
        sourceDescription: 'User Deleted Part'
      }
    });
  };

  const handleReplaceCatalog = (newItems: PartItem[], sourceDescription?: string) => {
    savePersistedCatalog(newItems, true, sourceDescription || 'Imported Database');
    setCatalogState({
      catalog: newItems,
      meta: {
        isCustom: true,
        itemCount: newItems.length,
        lastUpdated: new Date().toISOString(),
        sourceDescription: sourceDescription || 'Imported Database'
      }
    });
  };

  const handleMergeCatalog = (newItems: PartItem[]) => {
    const map = new Map<string, PartItem>();
    // Add existing
    catalog.forEach(item => {
      map.set(item.partNumber.toUpperCase(), item);
    });
    // Merge new / update
    newItems.forEach(item => {
      map.set(item.partNumber.toUpperCase(), item);
    });
    const merged = Array.from(map.values());
    savePersistedCatalog(merged, true, 'Merged Database');
    setCatalogState({
      catalog: merged,
      meta: {
        isCustom: true,
        itemCount: merged.length,
        lastUpdated: new Date().toISOString(),
        sourceDescription: 'Merged Database'
      }
    });
  };

  const handleResetCatalog = () => {
    const defaultData = resetPersistedCatalog();
    setCatalogState({
      catalog: defaultData,
      meta: {
        isCustom: false,
        itemCount: defaultData.length,
        lastUpdated: new Date().toISOString(),
        sourceDescription: 'Default System Catalog'
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-slate-900 font-sans border-t-4 border-indigo-600">
      {/* Top Application Header */}
      <header className="flex items-center justify-between px-6 lg:px-8 py-3.5 bg-white border-b border-slate-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Bulk Part Number CSV Exporter
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide">
              Internal ID Mapper & NetSuite Inventory CSV Exporter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              catalogMeta.isCustom
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{catalog.length.toLocaleString()} Parts Database</span>
            {catalogMeta.isCustom && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Custom Imported Database Active" />
            )}
          </button>
        </div>
      </header>

      {/* Main Working Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-5 lg:gap-6">
        {/* Left: Input & Configuration */}
        <SidebarConfig
          rawInput={rawInput}
          setRawInput={setRawInput}
          config={config}
          setConfig={setConfig}
          onClear={handleClear}
          onLoadSample={handleLoadSample}
          onExportDownload={handleExportDownload}
          onCopyClipboard={handleCopyClipboard}
          copied={copied}
          rows={rows}
          totalPartsIndexed={catalog.length}
          catalogMeta={catalogMeta}
          onOpenCatalog={() => setIsCatalogOpen(true)}
        />

        {/* Right: CSV Preview & Interactive Editor Table */}
        <CsvTablePreview
          rows={rows}
          onUpdateRow={handleUpdateRow}
          onRemoveRow={handleRemoveRow}
        />
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 lg:px-8 py-2.5 bg-slate-900 text-slate-400 text-[11px] flex items-center justify-between font-medium shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Part Number CSV Exporter — Ready for NetSuite Import</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Active Database: {catalogMeta.isCustom ? 'Custom Imported' : 'System Default'} ({catalog.length} parts)</span>
          <span>Delimiter: {config.delimiter === 'tab' ? 'Tab (\\t)' : 'Comma (,)'}</span>
        </div>
      </footer>

      {/* Catalog Search & Add Modal */}
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        catalog={catalog}
        catalogMeta={catalogMeta}
        onAddPart={handleAddPart}
        onUpdatePart={handleUpdatePart}
        onDeletePart={handleDeletePart}
        onReplaceCatalog={handleReplaceCatalog}
        onMergeCatalog={handleMergeCatalog}
        onResetCatalog={handleResetCatalog}
      />
    </div>
  );
}

