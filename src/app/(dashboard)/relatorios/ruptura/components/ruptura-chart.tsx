'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type RupturaData } from '../types'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface RupturaChartProps {
  data?: RupturaData[]
}

export function RupturaChart({ data = [] }: RupturaChartProps) {
  // Agrupa dados por departamento
  const departamentos = data.reduce((acc, item) => {
    if (!acc[item.departamento_nome]) {
      acc[item.departamento_nome] = 0
    }
    acc[item.departamento_nome]++
    return acc
  }, {} as Record<string, number>)

  const chartData = {
    labels: Object.keys(departamentos),
    datasets: [
      {
        label: 'Produtos em Ruptura',
        data: Object.values(departamentos),
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ruptura por Departamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}