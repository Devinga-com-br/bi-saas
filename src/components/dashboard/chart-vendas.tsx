'use client'

import {
  Bar,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

interface ChartVendasProps {
  data: SalesChartData[]
  salesType?: SalesType
}

export function ChartVendas({ data = [], salesType = 'complete' }: ChartVendasProps) {
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

  // Custom label renderer for negative bars (despesa) with background
  const renderCustomLabel = (props: {
    x?: string | number
    y?: string | number
    width?: string | number
    height?: string | number
    value?: string | number
  }) => {
    const { x, y, width, height, value } = props
    if (!value || value === 0 || x === undefined || y === undefined || width === undefined || height === undefined) return null

    const absValue = Math.abs(Number(value))
    const formattedValue = formatBarLabel(absValue)

    // Convert to numbers
    const xNum = Number(x)
    const yNum = Number(y)
    const widthNum = Number(width)
    const heightNum = Number(height)

    // Para valores negativos, colocar o label abaixo da barra (y + height + offset)
    const labelY = Number(value) < 0 ? yNum + heightNum + 15 : yNum - 5

    // Calcular dimensões do fundo
    const textWidth = formattedValue.length * 7.5 // Aproximação
    const padding = 4

    return (
      <g>
        {/* Fundo do label */}
        <rect
          x={xNum + widthNum / 2 - textWidth / 2 - padding}
          y={labelY - 8}
          width={textWidth + padding * 2}
          height={16}
          fill="rgba(0, 0, 0, 0.75)"
          rx={3}
        />
        {/* Texto */}
        <text
          x={xNum + widthNum / 2}
          y={labelY}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '12px', fontWeight: 'bold' }}
        >
          {formattedValue}
        </text>
      </g>
    )
  }

  // Custom label renderer for positive bars (receita) with background
  const renderReceitaLabel = (props: {
    x?: string | number
    y?: string | number
    width?: string | number
    value?: string | number
  }) => {
    const { x, y, width, value } = props
    if (!value || value === 0 || x === undefined || y === undefined || width === undefined) return null

    const formattedValue = formatBarLabel(Number(value))

    // Convert to numbers
    const xNum = Number(x)
    const yNum = Number(y)
    const widthNum = Number(width)

    const labelY = yNum - 5

    // Calcular dimensões do fundo
    const textWidth = formattedValue.length * 7.5
    const padding = 4

    return (
      <g>
        {/* Fundo do label */}
        <rect
          x={xNum + widthNum / 2 - textWidth / 2 - padding}
          y={labelY - 8}
          width={textWidth + padding * 2}
          height={16}
          fill="rgba(0, 0, 0, 0.75)"
          rx={3}
        />
        {/* Texto */}
        <text
          x={xNum + widthNum / 2}
          y={labelY}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '12px', fontWeight: 'bold' }}
        >
          {formattedValue}
        </text>
      </g>
    )
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
              content={renderReceitaLabel}
            />
          </Bar>
          <Bar dataKey="despesa" fill="#ef4343" stackId="stack" name="Despesa">
            <LabelList
              dataKey="despesa"
              content={renderCustomLabel}
            />
          </Bar>
          <Line
            type="monotone"
            dataKey="lucro"
            stroke="#f59e0b"
            strokeWidth={4}
            dot={{ fill: '#f59e0b', r: 6, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 8 }}
            connectNulls={false}
            name="Lucro Bruto"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
