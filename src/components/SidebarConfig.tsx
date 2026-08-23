import { useState, Dispatch, SetStateAction } from 'react';
import { PartItem, ExportRow, ExporterConfig, CatalogMetadata, LOCATION_PRESETS, LocationPreset } from '../types';
import { DateWidget } from './DateWidget';
import {
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Search,
  AlertCircle,
  FileSpreadsheet,
  Settings,
  Database,
  Plus,
  Trash2,
  Edit2,
  HardDrive,
  CheckCircle2,
  Calendar,
  MapPin
} from 'lucide-react';

interface Props {
  rawInput: string;
  setRawInput: (val: string) => void;
  config: ExporterConfig;
  setConfig: Dispatch<SetStateAction<ExporterConfig>>;
  onClear: () => void;
  onLoadSample: () => void;
  onExportDownload: () => void;
  onCopyClipboard: () => void;
  copied: boolean;
  rows: ExportRow[];
  totalPartsIndexed: number;
  catalogMeta: CatalogMetadata;
  onOpenCatalog: () => void;
}

export function SidebarConfig({
  rawInput,
  setRawInput,
  config,
  setConfig,
  onClear,
  onLoadSample,
  onExportDownload,
  onCopyClipboard,
  copied,
  rows,
  totalPartsIndexed,
  catalogMeta,
  onOpenCatalog
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: keyof ExporterConfig, value: any) => {
    if (field === 'start_date') {
      // Sync start_date to end_date
      setConfig(prev => ({ ...prev, start_date: value, end_date: value }));
    } else {
      setConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDateChange = (val: string) => {
    setConfig(prev => ({ ...prev, start_date: val, end_date: val }));
  };

  const lineCount = rawInput.trim() ? rawInput.trim().split(/\r?\n/).filter(l => l.trim().length > 0).length : 0;
  const matchedCount = rows.filter(r => r.status === 'matched').length;
  const missingCount = rows.filter(r => r.status === 'not_found').length;

  return (
    <div className="w-full lg:w-[380px] xl:w-[410px] flex flex-col gap-4 shrink-0">
      {/* Input Configuration Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Input Configuration</span>
            {lineCount > 0 && (
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onLoadSample}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            Load Sample
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Part Numbers / Item Lines
            </label>
            <textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              className="w-full h-36 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
              placeholder={'Enter part numbers or "Part, Qty" per line:\nLSE100\nRWLB\t144\nARB-ASHD\t144\nSP360\t10\nRSB03B\t72\nRRS-2\t19\nDK138\t5\nRSK01\t100'}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tip: Supports part names (e.g. <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">LSE100</code>) or direct internal IDs. You can append quantity after tab or comma.
            </p>
          </div>

          {/* Location & Site Preset Auto-Fill */}
          <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/90 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Location Preset</span>
              </label>
              {(() => {
                const active = LOCATION_PRESETS.find(
                  p => p.subsidiary_id === config.subsidiary_id && p.location === config.location
                );
                return active ? (
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    {active.name}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    Custom ID
                  </span>
                );
              })()}
            </div>

            {/* Quick Auto-Fill Chips */}
            <div className="grid grid-cols-3 gap-1.5">
              {LOCATION_PRESETS.map(preset => {
                const isSelected =
                  config.subsidiary_id === preset.subsidiary_id &&
                  config.location === preset.location;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        subsidiary_id: preset.subsidiary_id,
                        location: preset.location
                      }));
                    }}
                    className={`px-2 py-1.5 rounded-md text-left transition-all cursor-pointer flex flex-col border text-xs ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 font-medium'
                    }`}
                  >
                    <span className="truncate leading-tight">{preset.name}</span>
                    <span
                      className={`text-[9.5px] font-mono mt-0.5 ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      Sub {preset.subsidiary_id} · Loc {preset.location}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Direct Input Fields */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Subsidiary ID
                </label>
                <input
                  type="text"
                  value={config.subsidiary_id}
                  onChange={e => handleInputChange('subsidiary_id', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                  placeholder="7"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Location ID
                </label>
                <input
                  type="text"
                  value={config.location}
                  onChange={e => handleInputChange('location', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                  placeholder="25"
                />
              </div>
            </div>
          </div>

          {/* Unified Date Widget (Typeable + Calendar Widget, Start Date = End Date) */}
          <DateWidget
            dateValue={config.start_date}
            onChangeDate={handleDateChange}
            label="Export Date (Start & End Date)"
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Memo Reference
              </label>
              <input
                type="text"
                value={config.memo}
                onChange={e => handleInputChange('memo', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="W34 - CSO TU"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Def. Qty
              </label>
              <input
                type="number"
                min="1"
                value={config.default_quantity}
                onChange={e => handleInputChange('default_quantity', parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Collapsible Format Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>{showAdvanced ? 'Hide Format Options' : 'Delimiter & Export Format'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Delimiter:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="delimiter"
                        checked={config.delimiter === 'comma'}
                        onChange={() => handleInputChange('delimiter', 'comma')}
                        className="text-indigo-600"
                      />
                      <span>Comma (CSV)</span>
                    </label>
                    <label className="flex items-center gap-1 text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="delimiter"
                        checked={config.delimiter === 'tab'}
                        onChange={() => handleInputChange('delimiter', 'tab')}
                        className="text-indigo-600"
                      />
                      <span>Tab (TSV)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-600">Include Header Line:</span>
                  <input
                    type="checkbox"
                    checked={config.includeHeader}
                    onChange={e => handleInputChange('includeHeader', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onExportDownload}
          disabled={rows.length === 0}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download {config.delimiter === 'comma' ? 'CSV' : 'TSV'} Export</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCopyClipboard}
            disabled={rows.length === 0}
            className="py-2.5 px-3 bg-white text-slate-700 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Data</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="py-2.5 px-3 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Inputs</span>
          </button>
        </div>
      </div>

      {/* Catalog status badge card */}
      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold ${
              catalogMeta.isCustom
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
            }`}>
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>{totalPartsIndexed.toLocaleString()} Parts in Database</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${catalogMeta.isCustom ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                <span>{catalogMeta.isCustom ? 'Active Imported Database' : 'System Default Database'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors cursor-pointer"
          >
            Manage
          </button>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
          <span>Persisted in local storage</span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Auto-saved
          </span>
        </div>
      </div>
    </div>
  );
}
