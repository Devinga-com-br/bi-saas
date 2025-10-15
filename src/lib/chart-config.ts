/**
 * Chart.js Configuration Utilities
 *
 * Este arquivo contém configurações padrão e helpers para Chart.js
 * seguindo as melhores práticas de performance e acessibilidade.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  BarController,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

// Registrar todos os elementos necessários do Chart.js
// Isso habilita tree-shaking e reduz o bundle size
// IMPORTANTE: Registro acontece automaticamente ao importar este módulo
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  BarController,
  ChartDataLabels
)

// Função mantida para compatibilidade (agora é no-op)
export function registerChartJS() {
  // Registro já foi feito no nível do módulo
}

/**
 * Configurações padrão para todos os gráficos
 * Tema moderno dark com verde neon
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defaultChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 15,
        font: {
          size: 12,
          family: "'Inter', sans-serif",
        },
        color: 'rgba(242, 242, 242, 0.9)', // #F2F2F2 - textSecondary
      },
    },
    tooltip: {
      backgroundColor: '#181818', // Fundo #181818 conforme spec
      padding: 12,
      titleFont: {
        size: 14,
        weight: 'bold',
      },
      bodyFont: {
        size: 13,
      },
      titleColor: '#FFFFFF', // Texto branco
      bodyColor: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      displayColors: true,
      usePointStyle: true,
    },
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
}

/**
 * Paleta de cores do tema moderno dark com verde neon
 */
export const chartColors = {
  primary: 'hsl(142, 76%, 45%)', // Verde neon principal
  secondary: 'hsl(142, 76%, 60%)', // Verde claro
  tertiary: 'hsl(142, 50%, 35%)', // Verde escuro
  quaternary: 'hsl(0, 0%, 60%)', // Cinza médio
  quinary: 'hsl(0, 0%, 40%)', // Cinza escuro
  success: 'hsl(142, 76%, 45%)', // Verde neon
  warning: 'hsl(38, 92%, 50%)', // Laranja
  error: 'hsl(0, 84%, 60%)', // Vermelho
  muted: 'hsl(0, 0%, 60%)', // Cinza
}

/**
 * Cores em formato rgba para transparência (verde neon theme)
 */
export const chartColorsRGBA = {
  primary: 'rgba(30, 197, 106, 1)', // #1EC56A - Verde neon
  primaryLight: 'rgba(30, 197, 106, 0.1)',
  secondary: 'rgba(153, 153, 153, 1)', // Cinza
  secondaryLight: 'rgba(153, 153, 153, 0.1)',
  success: 'rgba(30, 197, 106, 1)', // Verde neon
  successLight: 'rgba(30, 197, 106, 0.1)',
  warning: 'rgba(251, 146, 60, 1)', // Laranja
  warningLight: 'rgba(251, 146, 60, 0.1)',
  error: 'rgba(240, 68, 56, 1)', // Vermelho
  errorLight: 'rgba(240, 68, 56, 0.1)',
}

/**
 * Opções específicas para Line Charts (incluindo Area Charts)
 * Tema dark com eixos sutis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lineChartOptions: any = {
  ...defaultChartOptions,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
        color: 'rgba(153, 153, 153, 0.9)', // #999999 - textSecondary
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)', // Eixos sutis
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)', // Linhas sutis conforme spec
      },
      ticks: {
        font: {
          size: 11,
        },
        color: 'rgba(153, 153, 153, 0.9)', // #999999 - textSecondary
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)', // Eixos sutis
      },
    },
  },
}

/**
 * Opções específicas para Bar Charts
 * Tema dark com eixos sutis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const barChartOptions: any = {
  ...defaultChartOptions,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: 'rgba(153, 153, 153, 0.9)', // #999999 - textSecondary
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)', // Eixos sutis
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)', // Linhas sutis conforme spec
      },
      ticks: {
        color: 'rgba(153, 153, 153, 0.9)', // #999999 - textSecondary
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)', // Eixos sutis
      },
    },
  },
}

/**
 * Helper para criar dataset de Area Chart
 */
export function createAreaDataset(
  label: string,
  data: number[],
  color: string = chartColorsRGBA.primary,
  fillColor: string = chartColorsRGBA.primaryLight
) {
  return {
    label,
    data,
    fill: true,
    backgroundColor: fillColor,
    borderColor: color,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    tension: 0.4, // Smooth curves
  }
}

/**
 * Helper para criar dataset de Line Chart
 */
export function createLineDataset(
  label: string,
  data: number[],
  color: string = chartColorsRGBA.primary
) {
  return {
    label,
    data,
    fill: false,
    borderColor: color,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    tension: 0.4,
  }
}

/**
 * Helper para criar dataset de Bar Chart
 */
export function createBarDataset(
  label: string,
  data: number[],
  color: string = chartColorsRGBA.primary
) {
  return {
    label,
    data,
    backgroundColor: color,
    borderColor: color,
    borderWidth: 0,
    borderRadius: 6,
    borderSkipped: false,
  }
}

/**
 * Formatar números para exibição em tooltips
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || typeof value === 'undefined') {
    return '0.0%'
  }
  return `${value.toFixed(1)}%`
}

/**
 * Formatar valores grandes de forma resumida (Mi, Bi, etc)
 */
export function formatValueShort(value: number): string {
  const absValue = Math.abs(value)
  
  if (absValue >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toFixed(1)} Bi`
  } else if (absValue >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)} Mi`
  } else if (absValue >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)} K`
  }
  
  return formatCurrency(value)
}
