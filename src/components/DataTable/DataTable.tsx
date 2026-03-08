import React from 'react'
import styles from './DataTable.module.css'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

function DataTable<T extends { _id?: string }>({ 
  data, 
  columns, 
  onRowClick,
  emptyMessage = 'No hay datos para mostrar'
}: DataTableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className={styles.th}
                  style={{ 
                    width: column.width,
                    textAlign: column.align || 'left'
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.emptyCell}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr 
                  key={item._id || index} 
                  className={styles.tr}
                  onClick={() => onRowClick?.(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((column) => (
                    <td 
                      key={column.key} 
                      className={styles.td}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {column.render 
                        ? column.render(item) 
                        : (item as any)[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
