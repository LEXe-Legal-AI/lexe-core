/**
 * LEO Frontend - Reusable DataTable Component
 *
 * A fully-featured, generic data table with:
 * - TypeScript generics for row data
 * - Sorting (single column)
 * - Pagination with configurable page size
 * - Row selection (optional)
 * - Loading state with skeleton
 * - Empty state with customizable message
 * - Tailwind styling matching existing UI components
 */

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

/**
 * Column definition for the DataTable
 */
export interface Column<T> {
  /** Unique identifier for the column */
  id: string
  /** Header text to display */
  header: string
  /** Property key or function to extract cell value */
  accessor: keyof T | ((row: T) => React.ReactNode)
  /** Whether this column is sortable (default: false) */
  sortable?: boolean
  /** Additional CSS classes for the column cells */
  className?: string
  /** Additional CSS classes for the header cell */
  headerClassName?: string
  /** Text alignment for the column */
  align?: "left" | "center" | "right"
  /** Minimum width for the column */
  minWidth?: string
}

/**
 * Sort configuration
 */
export interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

/**
 * DataTable component props
 */
export interface DataTableProps<T> {
  /** Array of data to display */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Loading state indicator */
  isLoading?: boolean
  /** Message to display when data is empty */
  emptyMessage?: string
  /** Number of rows per page (default: 10) */
  pageSize?: number
  /** Available page size options */
  pageSizeOptions?: number[]
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void
  /** Function to get unique ID for a row */
  getRowId?: (row: T) => string
  /** Currently selected row ID */
  selectedRowId?: string
  /** Enable row selection with checkboxes */
  enableRowSelection?: boolean
  /** Selected row IDs (for multi-select) */
  selectedRowIds?: Set<string>
  /** Callback when row selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void
  /** External sort config for controlled sorting */
  sortConfig?: SortConfig | null
  /** Callback when sort changes (for controlled sorting) */
  onSortChange?: (config: SortConfig | null) => void
  /** Additional CSS classes for the table container */
  className?: string
  /** Additional CSS classes for the table */
  tableClassName?: string
  /** Whether to show pagination (default: true) */
  showPagination?: boolean
  /** Whether to use compact styling */
  compact?: boolean
  /** Whether table rows are striped */
  striped?: boolean
  /** Whether to show borders between rows */
  bordered?: boolean
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Skeleton row for loading state
 */
function SkeletonRow({
  columns,
  compact,
}: {
  columns: number
  compact?: boolean
}) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td
          key={i}
          className={cn("border-b border-border", compact ? "px-3 py-2" : "px-4 py-3")}
        >
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Checkbox component for row selection
 */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false
    }
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className={cn(
        "h-4 w-4 rounded border-input bg-background text-primary",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  )
}

/**
 * Sort indicator icon
 */
function SortIndicator({
  direction,
  active,
}: {
  direction?: "asc" | "desc"
  active: boolean
}) {
  if (!active) {
    return (
      <span className="ml-1 inline-flex flex-col opacity-30">
        <ChevronUp className="h-3 w-3 -mb-1" />
        <ChevronDown className="h-3 w-3" />
      </span>
    )
  }

  return (
    <span className="ml-1">
      {direction === "asc" ? (
        <ChevronUp className="h-4 w-4 inline" />
      ) : (
        <ChevronDown className="h-4 w-4 inline" />
      )}
    </span>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "Nessun dato disponibile",
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  onRowClick,
  getRowId,
  selectedRowId,
  enableRowSelection = false,
  selectedRowIds = new Set(),
  onSelectionChange,
  sortConfig: externalSortConfig,
  onSortChange,
  className,
  tableClassName,
  showPagination = true,
  compact = false,
  striped = false,
  bordered = true,
}: DataTableProps<T>) {
  // Internal state (used when not controlled externally)
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  // Use external or internal sort config
  const sortConfig = externalSortConfig !== undefined ? externalSortConfig : internalSortConfig

  // Get row ID helper
  const getRowIdValue = useCallback(
    (row: T, index: number): string => {
      if (getRowId) {
        return getRowId(row)
      }
      // Fallback: try to find an 'id' property
      const rowAny = row as Record<string, unknown>
      if ("id" in rowAny && (typeof rowAny.id === "string" || typeof rowAny.id === "number")) {
        return String(rowAny.id)
      }
      return String(index)
    },
    [getRowId]
  )

  // Get cell value from accessor
  const getCellValue = useCallback((row: T, accessor: Column<T>["accessor"]): React.ReactNode => {
    if (typeof accessor === "function") {
      return accessor(row)
    }
    const value = row[accessor]
    // Handle common value types
    if (value === null || value === undefined) {
      return "-"
    }
    if (typeof value === "boolean") {
      return value ? "Si" : "No"
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("it-IT")
    }
    return String(value)
  }, [])

  // Get raw value for sorting
  const getSortValue = useCallback((row: T, accessor: Column<T>["accessor"]): unknown => {
    if (typeof accessor === "function") {
      // For function accessors, try to get a comparable value
      const result = accessor(row)
      if (React.isValidElement(result)) {
        // Can't sort React elements, return empty string
        return ""
      }
      return result
    }
    return row[accessor]
  }, [])

  // Handle sort click
  const handleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((c) => c.id === columnId)
      if (!column?.sortable) return

      let newConfig: SortConfig | null = null

      if (sortConfig?.key === columnId) {
        if (sortConfig.direction === "asc") {
          newConfig = { key: columnId, direction: "desc" }
        } else {
          // Third click removes sort
          newConfig = null
        }
      } else {
        newConfig = { key: columnId, direction: "asc" }
      }

      if (onSortChange) {
        onSortChange(newConfig)
      } else {
        setInternalSortConfig(newConfig)
      }

      // Reset to first page when sorting changes
      setCurrentPage(0)
    },
    [columns, sortConfig, onSortChange]
  )

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    const column = columns.find((c) => c.id === sortConfig.key)
    if (!column) return data

    return [...data].sort((a, b) => {
      const aValue = getSortValue(a, column.accessor)
      const bValue = getSortValue(b, column.accessor)

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === "asc" ? -1 : 1
      if (bValue == null) return sortConfig.direction === "asc" ? 1 : -1

      // Compare values
      let comparison = 0
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue, "it-IT", { sensitivity: "base" })
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortConfig.direction === "asc" ? comparison : -comparison
    })
  }, [data, sortConfig, columns, getSortValue])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData
    const start = currentPage * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, showPagination])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const totalItems = sortedData.length

  // Ensure current page is valid
  React.useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    }
  }, [currentPage, totalPages])

  // Selection handlers
  const isAllSelected = useMemo(() => {
    if (!enableRowSelection || paginatedData.length === 0) return false
    return paginatedData.every((row, i) => selectedRowIds.has(getRowIdValue(row, i)))
  }, [enableRowSelection, paginatedData, selectedRowIds, getRowIdValue])

  const isSomeSelected = useMemo(() => {
    if (!enableRowSelection || paginatedData.length === 0) return false
    const selectedCount = paginatedData.filter((row, i) =>
      selectedRowIds.has(getRowIdValue(row, i))
    ).length
    return selectedCount > 0 && selectedCount < paginatedData.length
  }, [enableRowSelection, paginatedData, selectedRowIds, getRowIdValue])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return

      const newSelection = new Set(selectedRowIds)
      paginatedData.forEach((row, i) => {
        const id = getRowIdValue(row, i)
        if (checked) {
          newSelection.add(id)
        } else {
          newSelection.delete(id)
        }
      })
      onSelectionChange(newSelection)
    },
    [paginatedData, selectedRowIds, onSelectionChange, getRowIdValue]
  )

  const handleSelectRow = useCallback(
    (rowId: string, checked: boolean) => {
      if (!onSelectionChange) return

      const newSelection = new Set(selectedRowIds)
      if (checked) {
        newSelection.add(rowId)
      } else {
        newSelection.delete(rowId)
      }
      onSelectionChange(newSelection)
    },
    [selectedRowIds, onSelectionChange]
  )

  // Page size change handler
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value)
      setPageSize(newSize)
      setCurrentPage(0)
    },
    []
  )

  // Render table header
  const renderHeader = () => (
    <thead className="bg-muted/50">
      <tr>
        {enableRowSelection && (
          <th className={cn("border-b border-border", compact ? "px-3 py-2" : "px-4 py-3", "w-10")}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={handleSelectAll}
              disabled={isLoading || paginatedData.length === 0}
            />
          </th>
        )}
        {columns.map((column) => {
          const isSorted = sortConfig?.key === column.id
          const alignClass =
            column.align === "center"
              ? "text-center"
              : column.align === "right"
              ? "text-right"
              : "text-left"

          return (
            <th
              key={column.id}
              className={cn(
                "border-b border-border font-medium text-muted-foreground",
                compact ? "px-3 py-2" : "px-4 py-3",
                alignClass,
                column.sortable && "cursor-pointer select-none hover:bg-muted/80 transition-colors",
                column.headerClassName
              )}
              style={{ minWidth: column.minWidth }}
              onClick={() => column.sortable && handleSort(column.id)}
            >
              <span className="inline-flex items-center">
                {column.header}
                {column.sortable && (
                  <SortIndicator
                    direction={isSorted ? sortConfig?.direction : undefined}
                    active={isSorted}
                  />
                )}
              </span>
            </th>
          )
        })}
      </tr>
    </thead>
  )

  // Render table body
  const renderBody = () => {
    // Loading state
    if (isLoading) {
      return (
        <tbody>
          {Array.from({ length: Math.min(5, pageSize) }).map((_, i) => (
            <SkeletonRow
              key={i}
              columns={columns.length + (enableRowSelection ? 1 : 0)}
              compact={compact}
            />
          ))}
        </tbody>
      )
    }

    // Empty state
    if (paginatedData.length === 0) {
      return (
        <tbody>
          <tr>
            <td
              colSpan={columns.length + (enableRowSelection ? 1 : 0)}
              className="text-center text-muted-foreground py-12"
            >
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="h-12 w-12 text-muted-foreground/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <span className="text-sm">{emptyMessage}</span>
              </div>
            </td>
          </tr>
        </tbody>
      )
    }

    // Data rows
    return (
      <tbody>
        {paginatedData.map((row, rowIndex) => {
          const globalIndex = currentPage * pageSize + rowIndex
          const rowId = getRowIdValue(row, globalIndex)
          const isSelected = selectedRowId === rowId || selectedRowIds.has(rowId)
          const isClickable = !!onRowClick

          return (
            <tr
              key={rowId}
              className={cn(
                "transition-colors",
                bordered && "border-b border-border",
                striped && rowIndex % 2 === 1 && "bg-muted/30",
                isSelected && "bg-primary/10",
                isClickable && "cursor-pointer hover:bg-muted/50",
                !isClickable && "hover:bg-muted/30"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {enableRowSelection && (
                <td
                  className={cn(compact ? "px-3 py-2" : "px-4 py-3", "w-10")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedRowIds.has(rowId)}
                    onChange={(checked) => handleSelectRow(rowId, checked)}
                  />
                </td>
              )}
              {columns.map((column) => {
                const alignClass =
                  column.align === "center"
                    ? "text-center"
                    : column.align === "right"
                    ? "text-right"
                    : "text-left"

                return (
                  <td
                    key={column.id}
                    className={cn(
                      compact ? "px-3 py-2" : "px-4 py-3",
                      alignClass,
                      column.className
                    )}
                    style={{ minWidth: column.minWidth }}
                  >
                    {getCellValue(row, column.accessor)}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    )
  }

  // Render pagination
  const renderPagination = () => {
    if (!showPagination) return null

    const startItem = totalItems === 0 ? 0 : currentPage * pageSize + 1
    const endItem = Math.min((currentPage + 1) * pageSize, totalItems)

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        {/* Left side: Page size selector and info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Righe per pagina:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={isLoading}
              className={cn(
                "h-8 rounded-md border border-input bg-background px-2",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Caricamento...
              </span>
            ) : (
              <span>
                {startItem}-{endItem} di {totalItems} risultati
              </span>
            )}
          </div>
        </div>

        {/* Right side: Pagination controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(0)}
            disabled={isLoading || currentPage === 0}
            title="Prima pagina"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={isLoading || currentPage === 0}
            title="Pagina precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm text-muted-foreground">
              Pagina{" "}
              <span className="font-medium text-foreground">{currentPage + 1}</span> di{" "}
              <span className="font-medium text-foreground">{Math.max(1, totalPages)}</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={isLoading || currentPage >= totalPages - 1}
            title="Pagina successiva"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={isLoading || currentPage >= totalPages - 1}
            title="Ultima pagina"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full rounded-lg border border-border bg-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", tableClassName)}>
          {renderHeader()}
          {renderBody()}
        </table>
      </div>
      {renderPagination()}
    </div>
  )
}

// ============================================================================
// Utility Types for consumers
// ============================================================================

/**
 * Helper type to create column definitions with proper typing
 */
export type ColumnDef<T> = Column<T>

/**
 * Helper function to create type-safe columns
 */
export function createColumns<T>(columns: Column<T>[]): Column<T>[] {
  return columns
}
