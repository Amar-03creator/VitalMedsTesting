import { useState } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Loading from './Loading.jsx';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  pagination = null,
  onSort,
  onRowClick,
  emptyMessage = 'No records found.',
  rowKey = '_id',
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir]     = useState('asc');

  const handleSort = (field) => {
    const dir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDir(dir);
    if (onSort) onSort(field, dir);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUpIcon className={`w-3 h-3 ${sortField === col.key && sortDir === 'asc' ? 'text-teal-600' : 'text-gray-300'}`} />
                        <ChevronDownIcon className={`w-3 h-3 -mt-1 ${sortField === col.key && sortDir === 'desc' ? 'text-teal-600' : 'text-gray-300'}`} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row[rowKey] || idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Showing{' '}
            <strong>{(pagination.page - 1) * pagination.pageSize + 1}</strong>–
            <strong>{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong>
            {' '}of <strong>{pagination.total}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = Math.max(1, pagination.page - 2) + i;
              if (page > pagination.totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => pagination.onChange(page)}
                  className={`w-8 h-8 rounded text-sm font-medium
                    ${pagination.page === page ? 'bg-teal-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => pagination.onChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
