import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyMessage = "No records found.",
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-200 bg-cream-50">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-4 py-3 font-semibold text-ink-600 text-xs uppercase tracking-wide ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-cream-100 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-4 bg-cream-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16">
                <div className="flex flex-col items-center gap-2 text-ink-600">
                  <Inbox size={28} className="opacity-40" />
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}

          {!isLoading &&
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-cream-100 last:border-0 transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-cream-50" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-ink-800 ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
