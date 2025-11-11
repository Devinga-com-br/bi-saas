"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, FileText, FolderOpen, Layers, DollarSign } from "lucide-react"

interface SummaryStatsProps {
  valorTotal: number
  qtdRegistros: number
  qtdDepartamentos: number
  qtdTipos: number
  mediaDepartamento: number
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function SummaryStats({
  valorTotal,
  qtdRegistros,
  qtdDepartamentos,
  qtdTipos,
  mediaDepartamento,
}: SummaryStatsProps) {
  const stats = [
    {
      title: "Total de Despesas",
      value: formatCurrency(valorTotal),
      icon: DollarSign,
      description: "Valor total do período",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Registros",
      value: qtdRegistros.toString(),
      icon: FileText,
      description: "Despesas lançadas",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Departamentos",
      value: qtdDepartamentos.toString(),
      icon: FolderOpen,
      description: "Com movimentação",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Tipos de Despesa",
      value: qtdTipos.toString(),
      icon: Layers,
      description: "Categorias utilizadas",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Média por Departamento",
      value: formatCurrency(mediaDepartamento),
      icon: TrendingUp,
      description: "Distribuição média",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
