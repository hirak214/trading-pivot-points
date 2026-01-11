import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatPrice, formatDateTime, cn, getSignalBgClass } from '../lib/utils';

interface PivotData {
  datetime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi: number | null;
  atr: number | null;
  ama: number | null;
  upper: number | null;
  lower: number | null;
  pivotHigh: boolean;
  pivotLow: boolean;
  signal: 'Buy' | 'Sell' | 'Hold';
}

interface DataTableProps {
  data: PivotData[];
  isLoading: boolean;
  currency?: string;
}

type SortField = 'datetime' | 'open' | 'high' | 'low' | 'close' | 'rsi' | 'signal';
type SortDirection = 'asc' | 'desc';

export function DataTable({ data, isLoading, currency = 'USD' }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>('datetime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Safely ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

  // Sort data
  const sortedData = useMemo(() => {
    if (safeData.length === 0) return [];
    return [...safeData].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'datetime':
          comparison = new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
          break;
        case 'open':
          comparison = a.open - b.open;
          break;
        case 'high':
          comparison = a.high - b.high;
          break;
        case 'low':
          comparison = a.low - b.low;
          break;
        case 'close':
          comparison = a.close - b.close;
          break;
        case 'rsi':
          comparison = (a.rsi ?? 0) - (b.rsi ?? 0);
          break;
        case 'signal':
          const signalOrder = { Buy: 1, Hold: 2, Sell: 3 };
          comparison = (signalOrder[a.signal] ?? 2) - (signalOrder[b.signal] ?? 2);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [safeData, sortField, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-400" />
    );
  };

  if (isLoading && safeData.length === 0) {
    return (
      <div className="h-full flex flex-col bg-slate-900/50">
        <div className="p-3 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">Pivot Points Data</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">Pivot Points Data</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Rows:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="flex-1 overflow-auto hidden md:block">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('datetime')}
              >
                <div className="flex items-center gap-1">
                  Date/Time
                  <SortIcon field="datetime" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('open')}
              >
                <div className="flex items-center justify-end gap-1">
                  Open
                  <SortIcon field="open" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('high')}
              >
                <div className="flex items-center justify-end gap-1">
                  High
                  <SortIcon field="high" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('low')}
              >
                <div className="flex items-center justify-end gap-1">
                  Low
                  <SortIcon field="low" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('close')}
              >
                <div className="flex items-center justify-end gap-1">
                  Close
                  <SortIcon field="close" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Upper
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Lower
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('rsi')}
              >
                <div className="flex items-center justify-end gap-1">
                  RSI
                  <SortIcon field="rsi" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('signal')}
              >
                <div className="flex items-center justify-center gap-1">
                  Signal
                  <SortIcon field="signal" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedData.map((row, index) => (
              <tr
                key={`${row.datetime}-${index}`}
                className={cn(
                  'hover:bg-slate-800/50 transition-colors',
                  row.signal === 'Buy' && 'bg-emerald-500/5',
                  row.signal === 'Sell' && 'bg-red-500/5'
                )}
              >
                <td className="px-4 py-2 text-sm text-slate-300 whitespace-nowrap">
                  {formatDateTime(row.datetime)}
                </td>
                <td className="px-4 py-2 text-sm text-slate-300 text-right font-mono">
                  {formatPrice(row.open, currency)}
                </td>
                <td className="px-4 py-2 text-sm text-emerald-400 text-right font-mono">
                  {formatPrice(row.high, currency)}
                </td>
                <td className="px-4 py-2 text-sm text-red-400 text-right font-mono">
                  {formatPrice(row.low, currency)}
                </td>
                <td className="px-4 py-2 text-sm text-slate-100 text-right font-mono font-medium">
                  {formatPrice(row.close, currency)}
                </td>
                <td className="px-4 py-2 text-sm text-orange-400 text-right font-mono">
                  {row.upper !== null ? formatPrice(row.upper, currency) : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-blue-400 text-right font-mono">
                  {row.lower !== null ? formatPrice(row.lower, currency) : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-slate-300 text-right font-mono">
                  {row.rsi !== null ? row.rsi.toFixed(2) : '-'}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 text-xs font-medium rounded border',
                      getSignalBgClass(row.signal)
                    )}
                  >
                    {row.signal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="flex-1 overflow-auto md:hidden p-2 space-y-2">
        {paginatedData.map((row, index) => (
          <div
            key={`${row.datetime}-${index}`}
            className={cn(
              'card p-3 space-y-2',
              row.signal === 'Buy' && 'border-emerald-500/30',
              row.signal === 'Sell' && 'border-red-500/30'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{formatDateTime(row.datetime)}</span>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded border',
                  getSignalBgClass(row.signal)
                )}
              >
                {row.signal}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xs text-slate-500">Open</div>
                <div className="text-sm font-mono text-slate-300">{formatPrice(row.open, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">High</div>
                <div className="text-sm font-mono text-emerald-400">{formatPrice(row.high, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Low</div>
                <div className="text-sm font-mono text-red-400">{formatPrice(row.low, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Close</div>
                <div className="text-sm font-mono text-slate-100 font-medium">{formatPrice(row.close, currency)}</div>
              </div>
            </div>
            {row.rsi !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">RSI: {row.rsi.toFixed(2)}</span>
                <span className="text-orange-400">Upper: {row.upper !== null ? formatPrice(row.upper, currency) : '-'}</span>
                <span className="text-blue-400">Lower: {row.lower !== null ? formatPrice(row.lower, currency) : '-'}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-3 border-t border-slate-800">
        <div className="text-sm text-slate-400">
          {sortedData.length === 0 ? (
            'No entries'
          ) : (
            <>
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-sm text-slate-300">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
