
'use client'

import { Bar } from 'react-chartjs-2'
import { barChartOptions, createBarDataset, chartColors, formatValueShort } from '@/lib/chart-config'
import { useTheme } from '@/contexts/theme-context'

interface SalesChartData {
  mes: string
  total_vendas: number
}

interface ChartVendasProps {
  data: SalesChartData[]
}

export function ChartVendas({ data = [] }: ChartVendasProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

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
        'Vendas do Ano Atual',
        data.map((d) => d.total_vendas),
        chartColors.primary
      ),
    ],
  }

  const customOptions = {
    ...barChartOptions,
    plugins: {
      ...barChartOptions.plugins,
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        backgroundColor: isDark ? 'rgba(200, 200, 200, 0.95)' : 'rgba(240, 240, 240, 0.95)',
        color: '#000000',
        borderRadius: 4,
        font: {
          size: 11,
          weight: 'bold' as const,
          family: "'Inter', sans-serif",
        },
        formatter: (value: number) => formatValueShort(value),
        padding: {
          top: 4,
          bottom: 4,
          left: 6,
          right: 6,
        },
      },
    },
  }

  return (
    <div className="h-[350px] w-full">
      <Bar data={chartData} options={customOptions} />
    </div>
  )
}
