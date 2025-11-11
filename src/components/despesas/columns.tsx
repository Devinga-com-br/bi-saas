"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"

export type DespesaRow = {
  id: string
  tipo: 'total' | 'departamento' | 'tipo' | 'despesa'
  descricao: string
  data_despesa?: string
  data_emissao?: string
  numero_nota?: number | null
  serie_nota?: string | null
  observacao?: string | null
  total: number
  percentual: number
  valores_filiais: Record<number, number>
  filiais: number[]
  subRows?: DespesaRow[]
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return format(date, 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

const calculateDifference = (valorFilial: number, valorTotal: number, qtdFiliais: number) => {
  if (qtdFiliais === 0 || valorTotal === 0) return { diff: 0, isPositive: false }
  
  const media = valorTotal / qtdFiliais
  const diff = ((valorFilial - media) / media) * 100
  
  return {
    diff: Math.abs(diff),
    isPositive: valorFilial > media
  }
}

export const createColumns = (
  filiais: number[],
  getFilialNome: (id: number) => string
): ColumnDef<DespesaRow>[] => {
  const columns: ColumnDef<DespesaRow>[] = [
    {
      id: "descricao",
      accessorKey: "descricao",
      header: "Descrição",
      cell: ({ row }) => {
        const canExpand = row.getCanExpand()
        const tipo = row.original.tipo
        
        let paddingClass = "pl-3"
        if (tipo === 'tipo') paddingClass = "pl-10"
        if (tipo === 'despesa') paddingClass = "pl-16"
        
        let fontClass = "font-medium"
        let textSize = "text-sm"
        
        if (tipo === 'total') {
          fontClass = "font-bold"
          textSize = "text-base"
        }
        if (tipo === 'departamento') {
          fontClass = "font-semibold"
        }
        if (tipo === 'despesa') {
          fontClass = "font-normal"
          textSize = "text-xs"
        }
        
        return (
          <div className={`flex items-start gap-2 ${paddingClass} py-1`}>
            {canExpand ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-muted rounded-sm"
                onClick={() => row.toggleExpanded()}
              >
                {row.getIsExpanded() ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : tipo === 'despesa' ? (
              <div className="h-5 w-5 flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              </div>
            ) : null}
            
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className={`${fontClass} ${textSize} ${tipo === 'total' ? 'text-primary' : ''}`}>
                {row.original.descricao}
              </span>
              {tipo === 'despesa' && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(row.original.data_emissao)}
                  {row.original.numero_nota && ` • Nota: ${row.original.numero_nota}`}
                  {row.original.serie_nota && `-${row.original.serie_nota}`}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "total",
      accessorKey: "total",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="h-8 p-0 hover:bg-transparent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total
            {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
          </Button>
        )
      },
      cell: ({ row }) => {
        const tipo = row.original.tipo
        const fontClass = tipo === 'total' || tipo === 'departamento' ? 'font-bold' : 
                         tipo === 'tipo' ? 'font-semibold' : 'font-normal'
        const textSize = tipo === 'despesa' ? 'text-xs' : 'text-sm'
        
        return (
          <div className="text-left">
            <div className={`${fontClass} ${textSize}`}>
              {formatCurrency(row.original.total)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {row.original.percentual.toFixed(2).replace('.', ',')}%
            </div>
          </div>
        )
      },
    },
  ]

  // Adicionar coluna para cada filial com cores alternadas
  filiais.forEach((filialId, index) => {
    // Cores alternadas: índice par (0,2,4...) usa cor 1, ímpar (1,3,5...) usa cor 2
    const bgColorClass = index % 2 === 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-slate-50/50 dark:bg-slate-900/20'
    const hoverBgClass = index % 2 === 0 ? 'hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
    
    columns.push({
      id: `filial_${filialId}`,
      accessorFn: (row) => row.valores_filiais[filialId] || 0,
      header: ({ column }) => {
        return (
          <div className={`${bgColorClass}`}>
            <Button
              variant="ghost"
              className={`h-8 p-0 hover:bg-transparent ${hoverBgClass}`}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {getFilialNome(filialId)}
              {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const valorFilial = row.original.valores_filiais[filialId] || 0
        const totalGeral = row.original.total
        const qtdFiliais = row.original.filiais.length
        const { diff, isPositive } = calculateDifference(valorFilial, totalGeral, qtdFiliais)
        
        const tipo = row.original.tipo
        const fontClass = tipo === 'total' ? 'font-bold' : 
                         tipo === 'departamento' ? 'font-medium' : 
                         tipo === 'tipo' ? 'font-normal' : 'font-normal'
        const textSize = tipo === 'despesa' ? 'text-xs' : 'text-sm'
        
        if (valorFilial === 0 && tipo === 'despesa') {
          return (
            <div className={`text-left text-xs text-muted-foreground ${bgColorClass} px-2 py-1`}>
              -
            </div>
          )
        }
        
        return (
          <div className={`text-left ${bgColorClass} px-2 py-1`}>
            <div className={`${fontClass} ${textSize}`}>
              {formatCurrency(valorFilial)}
            </div>
            {valorFilial > 0 && tipo !== 'total' && (
              <div 
                className={`text-[10px] font-medium ${
                  isPositive ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {isPositive ? '+' : '-'}{diff.toFixed(1)}%
              </div>
            )}
          </div>
        )
      },
      meta: {
        className: bgColorClass, // Adiciona classe de fundo na meta da coluna
      },
    })
  })

  return columns
}
