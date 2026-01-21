'use client'

import {
  Bar,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/chart-config'

interface SalesChartData {
  mes: string
  // PDV data
  total_vendas: number
  total_vendas_ano_anterior: number
  total_despesas?: number
  total_despesas_ano_anterior?: number
  total_lucro?: number
  total_lucro_ano_anterior?: number
  // Faturamento data
  total_faturamento?: number
  total_faturamento_ano_anterior?: number
  total_lucro_faturamento?: number
  total_lucro_faturamento_ano_anterior?: number
}

// Tipo de venda para o filtro
type SalesType = 'complete' | 'pdv' | 'faturamento'
type FilterType = 'month' | 'year' | 'custom'

interface ChartVendasProps {
  data: SalesChartData[]
  salesType?: SalesType
  filterType?: FilterType
  periodStart?: Date
}

export function ChartVendas({ data = [], salesType = 'complete', filterType = 'year', periodStart }: ChartVendasProps) {
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
    const sign = value < 0 ? '-' : ''
    if (absValue >= 1000000) {
      return `${sign}R$${(absValue / 1000000).toFixed(0)}Mi`
    } else if (absValue >= 1000) {
      return `${sign}R$${(absValue / 1000).toFixed(0)}k`
    }
    return `${sign}R$${absValue.toFixed(0)}`
  }

  // Transform data: receita (positivo), despesa (negativo), lucro
  // Considera o tipo de venda selecionado: complete (PDV + Faturamento), pdv, faturamento
  const chartData = data.map((d) => {
    // Valores PDV
    const receitaPdv = d.total_vendas || 0
    const lucroPdv = d.total_lucro || 0

    // Valores Faturamento
    const receitaFaturamento = d.total_faturamento || 0
    const lucroFaturamento = d.total_lucro_faturamento || 0

    // Despesas (sempre as mesmas, independente do tipo de venda)
    const despesaAbsoluta = d.total_despesas || 0

    // Calcular valores baseado no tipo de venda selecionado
    let receita: number
    let lucro: number

    switch (salesType) {
      case 'pdv':
        receita = receitaPdv
        lucro = lucroPdv
        break
      case 'faturamento':
        receita = receitaFaturamento
        lucro = lucroFaturamento
        break
      case 'complete':
      default:
        receita = receitaPdv + receitaFaturamento
        lucro = lucroPdv + lucroFaturamento
        break
    }

    return {
      name: d.mes.toUpperCase(),
      receita: receita,
      despesa: -despesaAbsoluta, // Negativo para aparecer para baixo
      lucro: lucro === 0 ? null : lucro, // null para meses sem dados (não desenha linha)
    }
  })

  const maxPositiveValue = chartData.reduce((max, item) => {
    const values = [item.receita ?? 0, item.lucro ?? 0].filter((v) => v > 0)
    const localMax = values.length > 0 ? Math.max(...values) : 0
    return Math.max(max, localMax)
  }, 0)

  const maxNegativeAbsValue = chartData.reduce((max, item) => {
    const values = [item.despesa ?? 0, item.lucro ?? 0, item.receita ?? 0].filter((v) => v < 0)
    const localMax = values.length > 0 ? Math.max(...values.map((v) => Math.abs(v))) : 0
    return Math.max(max, localMax)
  }, 0)

  const maxAbsValue = Math.max(maxPositiveValue, maxNegativeAbsValue)

  const stepReference = 1_000_000
  const maxReference = Math.ceil(maxAbsValue / stepReference) * stepReference
  const hasNegative = maxNegativeAbsValue > 0
  const referenceLines = []
  for (let value = stepReference; value <= maxReference; value += stepReference) {
    referenceLines.push(value)
    if (hasNegative) referenceLines.push(-value)
  }

  return (
    <div className="w-full h-[400px] min-h-[350px] max-h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
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
            domain={[-maxNegativeAbsValue, maxPositiveValue]}
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#888' }}
            tickLine={{ stroke: '#888' }}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(Math.abs(value))}
            labelFormatter={(label) => {
              if (filterType === 'month' && periodStart) {
                const day = Number(label)
                if (!Number.isNaN(day)) {
                  const date = new Date(periodStart.getFullYear(), periodStart.getMonth(), day)
                  return format(date, 'dd/MM/yyyy')
                }
              }
              return String(label)
            }}
            labelStyle={{ color: '#000' }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Legend />
          {referenceLines.map((value) => (
            <ReferenceLine key={`ref-${value}`} y={value} stroke="rgba(0, 0, 0, 0.15)" strokeWidth={0.5} />
          ))}
          <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
          <Bar dataKey="receita" fill="#1cca5b" stackId="stack" name="Receita" />
          <Bar dataKey="despesa" fill="#ef4343" stackId="stack" name="Despesa" />
          <Bar
            dataKey="lucro"
            fill="#3b82f6"
            name="Lucro Bruto"
            barSize={12}
            opacity={0.7}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
