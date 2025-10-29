'use client'

import {
  Bar,
  BarChart,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency, formatValueShort } from '@/lib/chart-config'

interface SalesChartData {
  mes: string
  total_vendas: number
  total_vendas_ano_anterior: number
  total_despesas?: number
  total_despesas_ano_anterior?: number
}

interface ChartVendasProps {
  data: SalesChartData[]
}

export function ChartVendas({ data = [] }: ChartVendasProps) {
  // Validate data is an array
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Dados para o gráfico de vendas estarão disponíveis em breve.
        </p>
      </div>
    )
  }

  // Format function for Y axis: converts to "00M" format
  const formatYAxis = (value: number): string => {
    const absValue = Math.abs(value)
    if (absValue >= 1000000) {
      return `${(absValue / 1000000).toFixed(0)}M`
    } else if (absValue >= 1000) {
      return `${(absValue / 1000).toFixed(0)}K`
    }
    return absValue.toString()
  }

  // Format function for bar labels: converts to "3.5M" format with one decimal
  const formatBarLabel = (value: number): string => {
    const absValue = Math.abs(value)
    if (absValue === 0) return ''
    if (absValue >= 1000000) {
      return `${(absValue / 1000000).toFixed(1)}M`
    } else if (absValue >= 1000) {
      return `${(absValue / 1000).toFixed(1)}K`
    }
    return absValue.toString()
  }

  // Custom label renderer for negative bars (despesa)
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props
    if (!value || value === 0) return null

    const absValue = Math.abs(value)
    const formattedValue = formatBarLabel(absValue)

    // Para valores negativos, colocar o label abaixo da barra (y + height + offset)
    const labelY = value < 0 ? y + height + 15 : y - 5

    return (
      <text
        x={x + width / 2}
        y={labelY}
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: '12px', fontWeight: 'bold' }}
      >
        {formattedValue}
      </text>
    )
  }

  // Transform data: receita (positivo), despesa (negativo)
  const chartData = data.map((d) => ({
    name: d.mes.toUpperCase(),
    receita: d.total_vendas,
    despesa: -(d.total_despesas || 0), // Negativo para aparecer para baixo
  }))

  // Debug: Log data to console
  console.log('[ChartVendas] Total de registros recebidos:', data.length)
  console.log('[ChartVendas] Meses recebidos:', data.map(d => d.mes).join(', '))
  console.log('[ChartVendas] Dados transformados:', chartData.length, 'registros')
  console.log('[ChartVendas] Dados completos:', JSON.stringify(chartData, null, 2))

  return (
    <div className="w-full h-[400px] min-h-[350px] max-h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          stackOffset="sign"
          margin={{ top: 30, right: 5, left: 5, bottom: 30 }}
        >
          <XAxis
            dataKey="name"
            axisLine={{ stroke: '#888' }}
            tickLine={{ stroke: '#888' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#888' }}
            tickLine={{ stroke: '#888' }}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(Math.abs(value))}
            labelStyle={{ color: '#000' }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
          <Bar dataKey="receita" fill="#1cca5b" stackId="stack" name="Receita">
            <LabelList
              dataKey="receita"
              position="top"
              formatter={formatBarLabel}
              style={{ fontSize: '12px', fontWeight: 'bold', fill: 'currentColor' }}
            />
          </Bar>
          <Bar dataKey="despesa" fill="#ef4343" stackId="stack" name="Despesa">
            <LabelList
              dataKey="despesa"
              content={renderCustomLabel}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
