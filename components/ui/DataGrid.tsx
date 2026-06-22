"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Table, type Column } from "./Table";
import { cn } from "@/lib/cn";

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir } | null;

export function DataGrid<T>({
  columns, rows, rowKey, ...rest
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
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort, columns]);

  const withSortIndicators = columns.map(c => ({
    ...c,
    header: c.sortable ? (
      <button
        type="button"
        onClick={() => setSort(prev => {
          if (!prev || prev.key !== c.key) return { key: c.key, dir: "asc" };
          if (prev.dir === "asc") return { key: c.key, dir: "desc" };
          return null;
        })}
        className={cn("inline-flex items-center gap-1 hover:text-slate-900")}
      >
        {c.header}
        {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    ) : c.header
  }));

  return <Table columns={withSortIndicators} rows={sorted} rowKey={rowKey} {...rest} />;
}
