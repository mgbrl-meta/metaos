'use client';

import { useState } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  sortFn?: (a: T, b: T) => number;
  className?: string;
}

export default function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  searchPlaceholder = 'Search…',
  searchKeys,
  defaultSortKey,
  pageSize = 50,
}: {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  defaultSortKey?: string;
  pageSize?: number;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>(defaultSortKey || columns[0]?.key || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  let filtered = rows;
  if (search && searchKeys?.length) {
    const q = search.toLowerCase();
    filtered = rows.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q))
    );
  }

  const sortCol = columns.find((c) => c.key === sortKey);
  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol.sortFn) cmp = sortCol.sortFn(a, b);
      else {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av || '').localeCompare(String(bv || ''));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const pageStart = page * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  function exportCsv() {
    const headers = columns.map((c) => c.label).join(',');
    const lines = filtered.map((r) =>
      columns
        .map((c) => {
          const v = r[c.key];
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    );
    const blob = new Blob([headers + '\n' + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
        {searchKeys?.length && (
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="text-sm border border-slate-300 rounded px-2 py-1 w-64"
          />
        )}
        <div className="flex-1 text-xs text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'row' : 'rows'}
        </div>
        <button onClick={exportCsv} className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 border border-slate-300 rounded">
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => {
                    if (sortKey === c.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortKey(c.key);
                      setSortDir('desc');
                    }
                  }}
                  className={`px-3 py-2 font-medium text-[11px] uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${c.className || ''}`}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1 text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 tabular-nums ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.className || ''}`}
                    >
                      {c.render ? c.render(r) : String(r[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            >
              ←
            </button>
            <span className="px-2 py-1">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
