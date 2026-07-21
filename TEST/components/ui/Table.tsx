"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

export function Table<T>({
  columns, rows, rowKey, onRowClick, emptyState, selectable, selected, onSelectionChange
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}) {
  const all = rows.length;
  const sel = selected ?? new Set<string>();
  const allSelected = selectable && all > 0 && rows.every(r => sel.has(rowKey(r)));
  const someSelected = selectable && sel.size > 0 && !allSelected;
  return (
    <div className="bg-navy-100 border border-navy-400 rounded-[10px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="bg-navy-100 border-b border-navy-400">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={!!allSelected}
                    ref={el => { if (el) el.indeterminate = !!someSelected; }}
                    onChange={e => {
                      const next = new Set(sel);
                      if (e.target.checked) rows.forEach(r => next.add(rowKey(r)));
                      else rows.forEach(r => next.delete(rowKey(r)));
                      onSelectionChange?.(next);
                    }}
                  />
                </th>
              )}
              {columns.map(c => (
                <th key={c.key} style={c.width ? { width: c.width } : undefined} className={cn("text-left text-[10.5px] uppercase tracking-[0.08em] font-semibold text-navy-600 px-3 py-3", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyState ?? null}</td></tr>
            ) : rows.map(r => {
              const id = rowKey(r);
              const isSel = sel.has(id);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(r)}
                  className={cn("border-b border-navy-400/60 last:border-0 transition-colors", onRowClick && "cursor-pointer hover:bg-[rgba(42,42,42,0.5)]", isSel && "bg-emerald-400/10")}
                >
                  {selectable && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${id}`}
                        checked={isSel}
                        onChange={e => {
                          const next = new Set(sel);
                          if (e.target.checked) next.add(id); else next.delete(id);
                          onSelectionChange?.(next);
                        }}
                      />
                    </td>
                  )}
                  {columns.map(c => (
                    <td key={c.key} className={cn("px-3 py-3 text-cream", c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
