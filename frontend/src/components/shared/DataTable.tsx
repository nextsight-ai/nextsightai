import React from 'react';

export interface Column<T> {
  /**
   * Column header label
   */
  label: string;
  /**
   * Accessor key for the data
   */
  key: keyof T | string;
  /**
   * Custom render function
   */
  render?: (row: T) => React.ReactNode;
  /**
   * Column width (CSS value)
   */
  width?: string;
  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  /**
   * Column definitions
   */
  columns: Column<T>[];
  /**
   * Data rows
   */
  data: T[];
  /**
   * Optional row click handler
   */
  onRowClick?: (row: T) => void;
  /**
   * Empty state message
   */
  emptyMessage?: string;
  /**
   * Whether to show hover effect
   */
  hoverable?: boolean;
}

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

/**
 * DataTable - Minimal table component with linear design
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { label: 'Name', key: 'name' },
 *     { label: 'Status', key: 'status', render: (row) => <StatusDot status={row.status} /> },
 *   ]}
 *   data={pods}
 *   onRowClick={(pod) => console.log(pod)}
 * />
 * ```
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  hoverable = true,
}: DataTableProps<T>) {
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
        gap: 16,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {columns.map((col, i) => (
          <div
            key={i}
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#525252',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              textAlign: col.align || 'left',
            }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {data.length === 0 ? (
        <div style={{
          padding: '32px 0',
          textAlign: 'center',
          color: '#404040',
          fontSize: 12
        }}>
          {emptyMessage}
        </div>
      ) : (
        <div>
          {data.map((row, rowIndex) => (
            <div
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              style={{
                display: 'grid',
                gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
                gap: 16,
                padding: '12px 0',
                borderBottom: rowIndex < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                if (hoverable) e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                if (hoverable) e.currentTarget.style.opacity = '1';
              }}
            >
              {columns.map((col, colIndex) => (
                <div
                  key={colIndex}
                  style={{
                    fontSize: 12,
                    color: '#fafafa',
                    textAlign: col.align || 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    ...(col.render ? {} : mono),
                  }}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';
