'use client'

import { Bar } from 'react-chartjs-2'
import { ChartData, ChartOptions } from 'chart.js'
import { barChartOptions } from '@/lib/chart-config'

// Chart.js é registrado automaticamente ao importar barChartOptions
// (via side-effect no módulo chart-config.ts)

interface BarChartProps {
  data: ChartData<'bar'>
  options?: ChartOptions<'bar'>
  height?: number
}

export function BarChart({ data, options, height = 350 }: BarChartProps) {
  const mergedOptions: ChartOptions<'bar'> = {
    ...barChartOptions,
    ...options,
  }

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  )
}
