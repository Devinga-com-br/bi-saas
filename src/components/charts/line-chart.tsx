'use client'

import { Line } from 'react-chartjs-2'
import { ChartData, ChartOptions } from 'chart.js'
import { lineChartOptions } from '@/lib/chart-config'

// Chart.js é registrado automaticamente ao importar lineChartOptions
// (via side-effect no módulo chart-config.ts)

interface LineChartProps {
  data: ChartData<'line'>
  options?: ChartOptions<'line'>
  height?: number
}

export function LineChart({ data, options, height = 350 }: LineChartProps) {
  const mergedOptions: ChartOptions<'line'> = {
    ...lineChartOptions,
    ...options,
  }

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Line data={data} options={mergedOptions} />
    </div>
  )
}
