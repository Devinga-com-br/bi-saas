"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ProdutoSemVenda {
  filial_id: number
  produto_id: number
  descricao: string
  estoque_atual: number
  data_ultima_venda: string | null
  preco_custo: number
  curva_abcd: string | null
  curva_lucro: string | null
  dias_sem_venda: number
  total_count?: number
}

export const createColumns = (
  getFilialNome: (filialId: number) => string
): ColumnDef<ProdutoSemVenda>[] => [
  {
    accessorKey: "filial_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Filial
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {getFilialNome(row.getValue("filial_id"))}
        </div>
      )
    },
  },
  {
    accessorKey: "produto_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Código
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "descricao",
    header: "Descrição",
    cell: ({ row }) => {
      return (
        <div className="max-w-[300px] truncate" title={row.getValue("descricao")}>
          {row.getValue("descricao")}
        </div>
      )
    },
  },
  {
    accessorKey: "estoque_atual",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-end"
        >
          Estoque
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const estoque = parseFloat(row.getValue("estoque_atual"))
      return (
        <div className="text-right">
          {estoque.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "data_ultima_venda",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Últ. Venda
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const data = row.getValue("data_ultima_venda") as string | null
      return data ? (
        format(new Date(data), 'dd/MM/yyyy')
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: "preco_custo",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-end"
        >
          Custo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const custo = parseFloat(row.getValue("preco_custo"))
      return (
        <div className="text-right">
          R$ {custo.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "curva_abcd",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
          Curva Venda
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const curva = row.getValue("curva_abcd") as string | null
      return (
        <div className="text-center">
          {curva ? (
            <Badge variant={
              curva === 'A' ? 'default' :
              curva === 'B' ? 'secondary' :
              'outline'
            }>
              {curva}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "curva_lucro",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
          Curva Lucro
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const curva = row.getValue("curva_lucro") as string | null
      return (
        <div className="text-center">
          {curva ? (
            <Badge variant="outline">{curva}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "dias_sem_venda",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-end"
        >
          Dias
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dias = row.getValue("dias_sem_venda") as number
      return (
        <div className="text-right">
          <Badge variant={dias > 90 ? 'destructive' : 'secondary'}>
            {dias}
          </Badge>
        </div>
      )
    },
  },
]
