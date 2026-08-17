import { useState, FormEvent, ChangeEvent, DragEvent, useRef } from 'react';
import { PartItem, CatalogMetadata } from '../types';
import {
  Search,
  Plus,
  Trash2,
  X,
  Database,
  Check,
  FileUp,
  Download,
  Upload,
  RotateCcw,
  Edit2,
  AlertCircle,
  HardDrive,
  Save,
  FileSpreadsheet
} from 'lucide-react';
import { parseCatalogFileContent, exportCatalogToCsv } from '../partsData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  catalog: PartItem[];
  catalogMeta: CatalogMetadata;
  onAddPart: (item: PartItem) => void;
  onUpdatePart: (index: number, updatedItem: PartItem) => void;
  onDeletePart: (partNumber: string, internalId: string) => void;
  onReplaceCatalog: (items: PartItem[], sourceDescription?: string) => void;
  onMergeCatalog: (items: PartItem[]) => void;
  onResetCatalog: () => void;
}

export function CatalogModal({
  isOpen,
  onClose,
  catalog,
  catalogMeta,
  onAddPart,
  onUpdatePart,
  onDeletePart,
  onReplaceCatalog,
  onMergeCatalog,
  onResetCatalog
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'import' | 'add'>('browse');

  // Single add form state
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newInternalId, setNewInternalId] = useState('');
  const [newClass, setNewClass] = useState('COMPONENTS');
  const [newType, setNewType] = useState('Assembly/Bill of Materials');
  const [addMessage, setAddMessage] = useState('');

  // Bulk / File Import state
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [parsedPreview, setParsedPreview] = useState<PartItem[]>([]);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editInternalId, setEditInternalId] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editType, setEditType] = useState('');

  // Reset confirmation
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const filteredCatalog = catalog.filter(item => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.partNumber.toLowerCase().includes(s) ||
      item.internalId.toLowerCase().includes(s) ||
      (item.class && item.class.toLowerCase().includes(s)) ||
      (item.type && item.type.toLowerCase().includes(s))
    );
  });

  const handleStartEdit = (item: PartItem, key: string) => {
    setEditingKey(key);
    setEditPartNumber(item.partNumber);
    setEditInternalId(item.internalId);
    setEditClass(item.class || 'COMPONENTS');
    setEditType(item.type || 'Assembly/Bill of Materials');
  };

  const handleSaveEdit = (originalIndex: number) => {
    if (!editPartNumber.trim() || !editInternalId.trim()) return;
    onUpdatePart(originalIndex, {
      partNumber: editPartNumber.trim(),
      internalId: editInternalId.trim(),
      class: editClass.trim(),
      type: editType.trim()
    });
    setEditingKey(null);
  };

  const handleSingleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!newPartNumber.trim() || !newInternalId.trim()) return;
    onAddPart({
      partNumber: newPartNumber.trim(),
      internalId: newInternalId.trim(),
      class: newClass.trim(),
      type: newType.trim()
    });
    setAddMessage(`Added "${newPartNumber.trim()}" (ID: ${newInternalId.trim()}) to database.`);
    setNewPartNumber('');
    setNewInternalId('');
    setTimeout(() => {
      setAddMessage('');
      setActiveTab('browse');
    }, 1200);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setImportError('');
    setImportSuccess('');
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        const { items } = parseCatalogFileContent(content);
        if (items.length > 0) {
          setParsedPreview(items);
        } else {
          setImportError('No valid part mappings could be detected from this file. Expected at least Part Number and Internal ID columns.');
          setParsedPreview([]);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setImportText(text);
    setImportError('');
    setImportSuccess('');
    if (text.trim()) {
      const { items } = parseCatalogFileContent(text);
      setParsedPreview(items);
    } else {
      setParsedPreview([]);
    }
  };

  const handleCommitImport = () => {
    if (parsedPreview.length === 0) {
      setImportError('Please provide valid CSV/TSV data or select a file to import.');
      return;
    }

    if (importMode === 'replace') {
      onReplaceCatalog(parsedPreview, `Imported dataset (${parsedPreview.length} items)`);
      setImportSuccess(`Database updated! Replaced entire database with ${parsedPreview.length} items. This will remain active moving forward.`);
    } else {
      onMergeCatalog(parsedPreview);
      setImportSuccess(`Database updated! Merged ${parsedPreview.length} items into existing database. This will remain active moving forward.`);
    }

    setTimeout(() => {
      setImportText('');
      setParsedPreview([]);
      setImportSuccess('');
      setActiveTab('browse');
    }, 1500);
  };

  const handleExportBackup = () => {
    const csvContent = exportCatalogToCsv(catalog);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `netsuite_parts_database_backup_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Part Number & Internal ID Database</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  catalogMeta.isCustom
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {catalogMeta.isCustom ? 'Active Imported Database' : 'System Default Database'}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <HardDrive className="w-3 h-3 text-slate-400" />
                <span>{catalog.length.toLocaleString()} indexed part records saved locally across sessions</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              title="Download full database as CSV backup"
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'browse'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Browse & Edit Catalog ({catalog.length.toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'import'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              Import / Replace Database
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'add'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Single Item
            </button>
          </div>

          {/* Reset to Default Button */}
          {catalogMeta.isCustom && (
            <div>
              {confirmReset ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-[11px] font-bold text-red-600">Restore default catalog?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetCatalog();
                      setConfirmReset(false);
                    }}
                    className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-[11px] text-slate-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to default
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Browse & In-Table Edit */}
        {activeTab === 'browse' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by part number, internal ID, class, or type..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span>Showing {filteredCatalog.length.toLocaleString()} matching</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                  ✓ Saved as active database
                </span>
              </div>
            </div>

            {/* Catalog Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10 shadow-2xs">
                  <tr>
                    <th className="px-4 py-2.5">Item Name / Part Number</th>
                    <th className="px-4 py-2.5 text-indigo-700">Internal ID</th>
                    <th className="px-4 py-2.5">Class</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono divide-y divide-slate-100 text-slate-700">
                  {filteredCatalog.slice(0, 400).map((item, index) => {
                    const rowKey = `${item.partNumber}-${item.internalId}-${index}`;
                    const isEditing = editingKey === rowKey;
                    const originalCatalogIndex = catalog.findIndex(
                      c => c.partNumber === item.partNumber && c.internalId === item.internalId
                    );

                    if (isEditing) {
                      return (
                        <tr key={rowKey} className="bg-indigo-50/70">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editPartNumber}
                              onChange={e => setEditPartNumber(e.target.value)}
                              className="w-full bg-white border border-indigo-400 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editInternalId}
                              onChange={e => setEditInternalId(e.target.value)}
                              className="w-full bg-white border border-indigo-400 rounded px-2 py-1 text-xs font-bold text-indigo-700 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editClass}
                              onChange={e => setEditClass(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editType}
                              onChange={e => setEditType(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(originalCatalogIndex)}
                                className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingKey(null)}
                                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 rounded text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rowKey} className="hover:bg-slate-50/80 group transition-colors">
                        <td className="px-4 py-2 font-bold text-slate-900">{item.partNumber}</td>
                        <td className="px-4 py-2 font-bold text-indigo-600">{item.internalId}</td>
                        <td className="px-4 py-2 text-slate-500">{item.class || '—'}</td>
                        <td className="px-4 py-2 text-slate-400 text-[11px] font-sans truncate max-w-[200px]">
                          {item.type || 'Assembly/Bill of Materials'}
                        </td>
                        <td className="px-4 py-2 text-right font-sans">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item, rowKey)}
                              title="Edit item mapping"
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePart(item.partNumber, item.internalId)}
                              title="Delete from database"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCatalog.length > 400 && (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200 font-sans">
                  Showing first 400 of {filteredCatalog.length.toLocaleString()} items. Use search to find specific part numbers.
                </div>
              )}

              {filteredCatalog.length === 0 && (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No matching parts found</p>
                  <p className="text-xs text-slate-400">Try changing your search term or import new part numbers.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Import / Replace Database */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-950 flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Use Custom Imported Database</h3>
                <p className="mt-0.5 text-slate-600">
                  Import your NetSuite items export (CSV, TSV, or tab-delimited paste). Once imported, this database is automatically stored locally and used for all future lookups unless updated again.
                </p>
              </div>
            </div>

            {/* Import Mode Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Import Action
                </label>
                <p className="text-xs text-slate-500">Choose how the imported file will be applied</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-md border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                    importMode === 'replace'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Replace Entire Database
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`px-3 py-1.5 rounded font-bold cursor-pointer transition-colors ${
                    importMode === 'merge'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Merge / Update Existing
                </button>
              </div>
            </div>

            {/* Drag & Drop File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  Drop your NetSuite CSV / TSV file here, or <span className="text-indigo-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports NetSuite standard export format (Internal ID, Type, Class, Item Name/Number) or 2-column (Part Number, Internal ID)
                </p>
              </div>
            </div>

            {/* Paste Raw Text Option */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Or Paste CSV / TSV Table Text
              </label>
              <textarea
                value={importText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={'Internal ID,Type,Class,Item Name/Number\n18323,Assembly/Bill of Materials,ACCESSORIES,LSE100\n19025,Assembly/Bill of Materials,ACCESSORIES,RWLB\n7861,Assembly/Bill of Materials,ACCESSORIES,ARB-ASHD'}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>

            {/* Feedback Messages */}
            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* Preview of Parsed Items */}
            {parsedPreview.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Parsed {parsedPreview.length.toLocaleString()} Valid Part Records</span>
                  <span className="text-[11px] font-semibold text-indigo-700">Ready to save</span>
                </div>
                <div className="max-h-36 overflow-auto bg-white p-2">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-1">Part Number</th>
                        <th className="p-1">Internal ID</th>
                        <th className="p-1">Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="p-1 font-bold text-slate-800">{item.partNumber}</td>
                          <td className="p-1 text-indigo-600 font-bold">{item.internalId}</td>
                          <td className="p-1 text-slate-500">{item.class || 'COMPONENTS'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedPreview.length > 5 && (
                    <p className="text-[10px] text-slate-400 text-center py-1">
                      ...and {parsedPreview.length - 5} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setImportText('');
                  setParsedPreview([]);
                  setActiveTab('browse');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedPreview.length === 0}
                onClick={handleCommitImport}
                className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
                  parsedPreview.length > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {importMode === 'replace'
                    ? `Save & Replace Database (${parsedPreview.length})`
                    : `Merge & Save Items (${parsedPreview.length})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Add Single Item */}
        {activeTab === 'add' && (
          <div className="flex-1 p-6 max-w-xl mx-auto w-full">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Add Part Number to Database</h3>
            <p className="text-xs text-slate-500 mb-5">
              Add a new part number and internal ID mapping. It will be immediately saved into your active database.
            </p>

            <form onSubmit={handleSingleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Item Name / Part Number *
                </label>
                <input
                  type="text"
                  required
                  value={newPartNumber}
                  onChange={e => setNewPartNumber(e.target.value)}
                  placeholder="e.g. LSE300, RLB, RK106"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Internal ID *
                </label>
                <input
                  type="text"
                  required
                  value={newInternalId}
                  onChange={e => setNewInternalId(e.target.value)}
                  placeholder="e.g. 18323, 7861"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Class (Optional)
                </label>
                <input
                  type="text"
                  value={newClass}
                  onChange={e => setNewClass(e.target.value)}
                  placeholder="COMPONENTS, ACCESSORIES, LEGS, etc."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Item Type (Optional)
                </label>
                <input
                  type="text"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  placeholder="Assembly/Bill of Materials"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {addMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{addMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to Database</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            Active: <strong className="text-slate-800">{catalog.length.toLocaleString()} items</strong> in database
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

