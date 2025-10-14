
'use client'

import { Chart } from 'react-chartjs-2'
import { barChartOptions, createBarDataset, createLineDataset, chartColors, formatValueShort, formatCurrency } from '@/lib/chart-config'
import { useTheme } from '@/contexts/theme-context'

interface SalesChartData {
  mes: string
  total_vendas: number
  total_vendas_ano_anterior: number
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

  // Cor azul para a linha do ano anterior
  const blueColor = 'rgba(59, 130, 246, 1)' // Azul vibrante

  const chartData = {
    labels: data.map((d) => d.mes),
    datasets: [
      {
        ...createLineDataset(
          'Vendas do Ano Anterior',
          data.map((d) => d.total_vendas_ano_anterior),
          blueColor
        ),
        type: 'line' as const,
        yAxisID: 'y',
        order: 1, // Ordem menor = desenha por cima
        datalabels: {
          display: false,
        },
      },
      {
        ...createBarDataset(
          'Vendas do Ano Atual',
          data.map((d) => d.total_vendas),
          chartColors.primary
        ),
        order: 2, // Ordem maior = desenha por baixo
      },
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
        formatter: (value: number, context: { datasetIndex: number }) => {
          // datasetIndex 0 = linha (não mostrar), datasetIndex 1 = barras (mostrar)
          if (context.datasetIndex === 0) return null
          return formatValueShort(value)
        },
        padding: {
          top: 4,
          bottom: 4,
          left: 6,
          right: 6,
        },
      },
      tooltip: {
        ...barChartOptions.plugins.tooltip,
        callbacks: {
          label: function(context: { dataset: { label: string }, parsed: { y: number } }) {
            // Mostrar valor completo sem abreviação no tooltip
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          },
        },
      },
    },
  }

  return (
    <div className="h-[350px] w-full">
      <Chart type="bar" data={chartData} options={customOptions} />
    </div>
  )
}
