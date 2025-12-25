import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

const DIRECTION_CYCLE: Record<NonNullable<SortDirection> | 'null', SortDirection> = {
  asc: 'desc',
  desc: null,
  null: 'asc',
};

const SORT_ICONS: Record<NonNullable<SortDirection>, React.ReactNode> = {
  asc: <ArrowUp className="h-4 w-4 text-foreground" />,
  desc: <ArrowDown className="h-4 w-4 text-foreground" />,
};

const DEFAULT_SORT_ICON = <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
  onSort?: (key: string, direction: SortDirection) => void;
  rowKey: (item: T) => string | number;
  emptyMessage?: string;
  maxHeight?: string;
}

export function SortableTable<T>({
  data,
  columns,
  defaultSortKey,
  defaultSortDirection = 'asc',
  onSort,
  rowKey,
  emptyMessage = 'No data available',
  maxHeight,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const handleSort = (key: string) => {
    const newDirection = sortKey === key 
      ? DIRECTION_CYCLE[sortDirection ?? 'null'] 
      : 'asc';

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey || !sortDirection) return DEFAULT_SORT_ICON;
    return SORT_ICONS[sortDirection];
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto"
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <table className="w-full">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`py-3 px-2 font-medium text-sm ${column.headerClassName || 'text-left'} ${
                  column.sortable ? 'cursor-pointer hover:bg-muted/50 transition-colors select-none' : ''
                }`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.header}</span>
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={rowKey(item)} className="border-b hover:bg-muted/50 transition-colors">
              {columns.map((column) => (
                <td key={column.key} className={`py-3 px-2 ${column.className || ''}`}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
