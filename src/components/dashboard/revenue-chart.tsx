'use client'

import { AreaChart } from '@/components/charts/area-chart'
import { createAreaDataset, chartColorsRGBA } from '@/lib/chart-config'
import { useMemo } from 'react'

/**
 * Componente de gráfico de receita mensal
 * Exemplo de uso de AreaChart com dados mock
 */
export function RevenueChart() {
  const chartData = useMemo(() => {
    // Labels dos meses
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']

    // Dados mock - em produção, viriam de uma API/database
    const revenueData = [45231, 52189, 48765, 61234, 59012, 72450]
    const expensesData = [32100, 35890, 33200, 41000, 39500, 48300]

    return {
      labels,
      datasets: [
        createAreaDataset(
          'Receita',
          revenueData,
          chartColorsRGBA.primary,
          chartColorsRGBA.primaryLight
        ),
        createAreaDataset(
          'Despesas',
          expensesData,
          chartColorsRGBA.error,
          chartColorsRGBA.errorLight
        ),
      ],
    }
  }, [])

  return <AreaChart data={chartData} height={350} />
}
