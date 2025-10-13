
'use client'

import { Bar } from 'react-chartjs-2'
import { barChartOptions, createBarDataset, chartColors } from '@/lib/chart-config'

interface SalesChartData {
  mes: string
  ano_atual: number
  ano_anterior: number
}

interface ChartVendasProps {
  data: SalesChartData[]
}

export function ChartVendas({ data = [] }: ChartVendasProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Dados para o gráfico de vendas estarão disponíveis em breve.
        </p>
      </div>
    )
  }

  const chartData = {
    labels: data.map((d) => d.mes),
    datasets: [
      createBarDataset(
        'Ano Anterior',
        data.map((d) => d.ano_anterior),
        chartColors.quaternary
      ),
      createBarDataset(
        'Ano Atual',
        data.map((d) => d.ano_atual),
        chartColors.primary
      ),
    ],
  }

  return (
    <div className="h-[350px] w-full">
      <Bar data={chartData} options={barChartOptions} />
    </div>
  )
}
