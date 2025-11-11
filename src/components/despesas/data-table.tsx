"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
  getExpandedRowModel,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  getRowCanExpand?: (row: Row<TData>) => boolean
  getSubRows?: (row: TData) => TData[] | undefined
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowCanExpand,
  getSubRows,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    getRowCanExpand,
    getSubRows,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
    },
  })

  // Expandir primeiro nível (departamentos) ao carregar dados
  React.useEffect(() => {
    if (data.length > 0 && Object.keys(expanded).length === 0) {
      const firstLevelExpanded: ExpandedState = {}
      table.getRowModel().rows.forEach((row) => {
        // Expandir apenas o primeiro nível (departamentos)
        if (row.depth === 0) {
          firstLevelExpanded[row.id] = true
        }
      })
      setExpanded(firstLevelExpanded)
    }
  }, [data, table, expanded])

  return (
    <div className="space-y-4">
      {/* Table with Horizontal Scroll */}
      <div className="rounded-md border">
        <div className="overflow-x-auto max-w-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const isFirstColumn = index === 0
                    const isSecondColumn = index === 1
                    
                    let stickyClass = ""
                    if (isFirstColumn) {
                      stickyClass = "sticky left-0 z-20 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[250px] max-w-[400px]"
                    } else if (isSecondColumn) {
                      stickyClass = "sticky left-[250px] z-20 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[130px]"
                    } else {
                      stickyClass = "min-w-[150px]"
                    }
                    
                    return (
                      <TableHead 
                        key={header.id}
                        className={stickyClass}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell, index) => {
                      const isFirstColumn = index === 0
                      const isSecondColumn = index === 1
                      
                      let stickyClass = ""
                      if (isFirstColumn) {
                        stickyClass = "sticky left-0 z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[250px] max-w-[400px]"
                      } else if (isSecondColumn) {
                        stickyClass = "sticky left-[250px] z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[130px]"
                      } else {
                        stickyClass = "min-w-[150px]"
                      }
                      
                      return (
                        <TableCell 
                          key={cell.id}
                          className={stickyClass}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
