import React, { useState, useEffect, useMemo } from 'react';
import { ExportRow } from '../types';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Check,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  GripVertical
} from 'lucide-react';

interface Props {
  rows: ExportRow[];
  onUpdateRow: (id: string, field: keyof ExportRow, value: any) => void;
  onRemoveRow: (id: string) => void;
}

export interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  tooltip?: string;
}

export const TABLE_COLUMNS: ColumnDef[] = [
  { key: 'index', label: '#', defaultWidth: 46, minWidth: 38, align: 'center' },
  { key: 'inputPart', label: 'Input Part', defaultWidth: 170, minWidth: 100 },
  { key: 'quantity', label: 'Quantity', defaultWidth: 105, minWidth: 80, headerClassName: 'text-slate-800 bg-slate-100/80' },
  { key: 'subsidiary_id', label: 'subsidiary_id', defaultWidth: 115, minWidth: 80, headerClassName: 'text-indigo-700 bg-indigo-50/60' },
  { key: 'item_id', label: 'item_id (Internal ID)', defaultWidth: 175, minWidth: 110, headerClassName: 'text-indigo-700 bg-indigo-50/60' },
  { key: 'location', label: 'location', defaultWidth: 95, minWidth: 70 },
  { key: 'start_date', label: 'start_date', defaultWidth: 115, minWidth: 85 },
  { key: 'end_date', label: 'end_date', defaultWidth: 115, minWidth: 85 },
  { key: 'memo', label: 'memo', defaultWidth: 210, minWidth: 100 },
  { key: 'status', label: 'Status', defaultWidth: 110, minWidth: 80, align: 'right' },
];

const COLUMN_STORAGE_KEY = 'csv_exporter_col_widths_v2';

const getDefaultWidths = (): Record<string, number> => {
  const map: Record<string, number> = {};
  TABLE_COLUMNS.forEach(col => {
    map[col.key] = col.defaultWidth;
  });
  return map;
};

export function CsvTablePreview({ rows, onUpdateRow }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'not_found'>('all');
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  // Column widths with persistent localStorage
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const defaults = getDefaultWidths();
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load column widths from localStorage', e);
    }
    return getDefaultWidths();
  });

  // Check if any column width has been changed from default
  const isWidthsCustomized = useMemo(() => {
    const defaults = getDefaultWidths();
    return Object.keys(defaults).some(key => colWidths[key] !== defaults[key]);
  }, [colWidths]);

  // Handle Drag Resizing of Columns
  const handleStartResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 100;
    const colDef = TABLE_COLUMNS.find(c => c.key === colKey);
    const minWidth = colDef?.minWidth || 40;

    setResizingCol(colKey);

    let latestWidth = startWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, Math.round(startWidth + delta));
      latestWidth = newWidth;

      setColWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const onMouseUp = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      setColWidths(prev => {
        const updated = { ...prev, [colKey]: latestWidth };
        try {
          localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed to save column widths to localStorage', err);
        }
        return updated;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Reset a single column on double-click
  const handleResetSingleCol = (colKey: string) => {
    const colDef = TABLE_COLUMNS.find(c => c.key === colKey);
    if (!colDef) return;

    setColWidths(prev => {
      const updated = { ...prev, [colKey]: colDef.defaultWidth };
      try {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
  };

  // Reset all column widths to default
  const handleResetAllWidths = () => {
    const defaults = getDefaultWidths();
    setColWidths(defaults);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(defaults));
    } catch (err) {
      console.warn(err);
    }
  };

  const filteredRows = rows.filter(r => {
    if (filterStatus === 'matched' && r.status !== 'matched') return false;
    if (filterStatus === 'not_found' && r.status !== 'not_found') return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      r.inputPart.toLowerCase().includes(s) ||
      r.item_id.toLowerCase().includes(s) ||
      r.part_name.toLowerCase().includes(s) ||
      r.memo.toLowerCase().includes(s)
    );
  });

  const matchedCount = rows.filter(r => r.status === 'matched').length;
  const missingCount = rows.filter(r => r.status === 'not_found').length;
  const totalQty = rows.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const totalTableWidth = useMemo(() => {
    return TABLE_COLUMNS.reduce((sum, col) => sum + (colWidths[col.key] || col.defaultWidth), 0);
  }, [colWidths]);

  return (
    <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden select-none">
      {/* Header Bar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>CSV Preview (Auto-Generated)</span>
          </h2>
          <span className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded shadow-2xs">
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </span>
          {missingCount > 0 && (
            <span className="text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {missingCount} unmapped
            </span>
          )}
        </div>

        {/* Filter & Column controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Reset column width button */}
          {isWidthsCustomized && (
            <button
              type="button"
              onClick={handleResetAllWidths}
              title="Reset all column widths to defaults"
              className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Column Widths</span>
            </button>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search table..."
              className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none w-36 sm:w-44 select-text"
            />
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'all' ? 'bg-indigo-600 text-white font-bold' : 'hover:text-slate-900 cursor-pointer'}`}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('matched')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'matched' ? 'bg-indigo-600 text-white font-bold' : 'hover:text-slate-900 cursor-pointer'}`}
            >
              Mapped ({matchedCount})
            </button>
            {missingCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus('not_found')}
                className={`px-2 py-0.5 rounded ${filterStatus === 'not_found' ? 'bg-amber-600 text-white font-bold' : 'hover:text-slate-900 cursor-pointer text-amber-700'}`}
              >
                Missing ({missingCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto select-text">
        {rows.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No Part Numbers Loaded</p>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Enter part numbers into the left configuration panel or click "Load Sample" to generate the export preview.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="h-full min-h-[250px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-600">No matching records found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or filter.</p>
          </div>
        ) : (
          <table
            className="border-collapse text-left"
            style={{
              width: '100%',
              minWidth: `${totalTableWidth}px`,
              tableLayout: 'fixed'
            }}
          >
            <colgroup>
              {TABLE_COLUMNS.map(col => (
                <col
                  key={col.key}
                  style={{ width: `${colWidths[col.key] || col.defaultWidth}px` }}
                />
              ))}
            </colgroup>

            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-2xs">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {TABLE_COLUMNS.map(col => {
                  const isResizingThis = resizingCol === col.key;

                  return (
                    <th
                      key={col.key}
                      className={`relative px-3 py-2.5 group select-none ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${col.headerClassName || ''}`}
                    >
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <span className="truncate" title={col.label}>
                          {col.label}
                        </span>
                      </div>

                      {/* Resizer Handle */}
                      <div
                        onMouseDown={e => handleStartResize(e, col.key)}
                        onDoubleClick={() => handleResetSingleCol(col.key)}
                        title="Drag to resize column (Double-click to reset)"
                        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none flex items-center justify-center transition-colors z-20 ${
                          isResizingThis
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-indigo-400/80 active:bg-indigo-600'
                        }`}
                      >
                        <div
                          className={`w-0.5 h-3.5 rounded-full ${
                            isResizingThis ? 'bg-white' : 'bg-slate-300 group-hover:bg-indigo-200'
                          }`}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="text-xs font-mono divide-y divide-slate-100">
              {filteredRows.map((row, idx) => {
                const isEditing = editingRowId === row.id;

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      row.status === 'not_found'
                        ? 'bg-amber-50/30'
                        : idx % 2 === 1
                        ? 'bg-slate-50/30'
                        : 'bg-white'
                    }`}
                  >
                    {/* Index */}
                    <td className="px-3 py-2.5 text-center text-slate-400 text-[11px] font-sans overflow-hidden truncate">
                      {idx + 1}
                    </td>

                    {/* Input Part reference */}
                    <td className="px-3 py-2.5 font-sans font-semibold text-slate-800 overflow-hidden">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{row.inputPart}</span>
                        {row.matchedClass && (
                          <span className="text-[9px] font-semibold uppercase bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-sans shrink-0">
                            {row.matchedClass}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* quantity */}
                    <td className="px-3 py-2.5 font-bold text-slate-800 bg-slate-50/50 overflow-hidden">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={e => onUpdateRow(row.id, 'quantity', e.target.value)}
                        className="w-full max-w-[85px] bg-white hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800 transition-colors shadow-2xs"
                      />
                    </td>

                    {/* subsidiary_id */}
                    <td className="px-3 py-2.5 font-bold text-indigo-600 bg-indigo-50/30 overflow-hidden truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.subsidiary_id}
                          onChange={e => onUpdateRow(row.id, 'subsidiary_id', e.target.value)}
                          className="w-full bg-white border border-indigo-300 rounded px-1 py-0.5 text-xs font-mono font-bold"
                        />
                      ) : (
                        row.subsidiary_id
                      )}
                    </td>

                    {/* item_id (Internal ID) */}
                    <td className="px-3 py-2.5 font-bold bg-indigo-50/30 overflow-hidden truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.item_id}
                          onChange={e => {
                            onUpdateRow(row.id, 'item_id', e.target.value);
                            if (e.target.value.trim() !== '' && row.status === 'not_found') {
                              onUpdateRow(row.id, 'status', 'manual');
                            }
                          }}
                          className="w-full bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-indigo-800"
                        />
                      ) : row.status === 'not_found' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded text-[11px] font-sans font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Not Found
                        </span>
                      ) : (
                        <span className="text-indigo-900 font-bold bg-indigo-100/60 px-1.5 py-0.5 rounded">
                          {row.item_id}
                        </span>
                      )}
                    </td>

                    {/* location */}
                    <td className="px-3 py-2.5 text-slate-700 overflow-hidden truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.location}
                          onChange={e => onUpdateRow(row.id, 'location', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-mono"
                        />
                      ) : (
                        row.location
                      )}
                    </td>

                    {/* start_date */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap overflow-hidden truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.start_date}
                          onChange={e => onUpdateRow(row.id, 'start_date', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-mono"
                        />
                      ) : (
                        row.start_date
                      )}
                    </td>

                    {/* end_date */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap overflow-hidden truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={row.end_date}
                          onChange={e => onUpdateRow(row.id, 'end_date', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-mono"
                        />
                      ) : (
                        row.end_date
                      )}
                    </td>

                    {/* memo */}
                    <td className="px-3 py-2.5 text-slate-500 italic overflow-hidden">
                      <input
                        type="text"
                        value={row.memo}
                        onChange={e => onUpdateRow(row.id, 'memo', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-400 rounded px-1.5 py-0.5 text-xs text-slate-700 italic transition-colors truncate"
                      />
                    </td>

                    {/* Status / Quick Action */}
                    <td className="px-3 py-2.5 text-right font-sans overflow-hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status === 'matched' ? (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            OK
                          </span>
                        ) : row.status === 'manual' ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            Manual ID
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Missing
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingRowId(isEditing ? null : row.id)}
                          title={isEditing ? 'Done Editing' : 'Edit Row Values'}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer shrink-0"
                        >
                          {isEditing ? (
                            <Check className="w-3.5 h-3.5 text-indigo-600 font-bold" />
                          ) : (
                            <Edit3 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-bold text-slate-700 uppercase tracking-tight">Mapper Engine: Active</span>
          </div>
          <div className="h-3.5 w-px bg-slate-200"></div>
          <div>Total Quantity: <strong className="text-slate-800 font-mono">{totalQty.toLocaleString()}</strong></div>
          <div className="h-3.5 w-px bg-slate-200"></div>
          <div>Matched Rate: <strong className="text-slate-800">{rows.length > 0 ? Math.round((matchedCount / rows.length) * 100) : 100}%</strong></div>
        </div>

        <div className="text-[11px] text-slate-400 font-sans">
          Tip: Drag column edges to resize. Double-click to auto-reset.
        </div>
      </div>
    </div>
  );
}
