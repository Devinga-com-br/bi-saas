# 📊 Guia de Gráficos - Chart.js

**Status:** ✅ Configurado e Pronto para Uso
**Biblioteca:** Chart.js v4 + react-chartjs-2
**Documentação Oficial:** https://www.chartjs.org/docs/latest/

---

## 🚀 Quick Start

### 1. Importar Componente de Gráfico

```typescript
import { AreaChart } from '@/components/charts/area-chart'
import { createAreaDataset, chartColorsRGBA } from '@/lib/chart-config'
```

### 2. Criar Dados do Gráfico

```typescript
const chartData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
  datasets: [
    createAreaDataset(
      'Receita',
      [45231, 52189, 48765, 61234, 59012, 72450],
      chartColorsRGBA.primary,
      chartColorsRGBA.primaryLight
    ),
  ],
}
```

### 3. Renderizar

```typescript
<AreaChart data={chartData} height={350} />
```

---

## 📦 Componentes Disponíveis

### AreaChart
**Uso:** Tendências ao longo do tempo com ênfase em volume
**Exemplo:** Receita, usuários ativos, vendas

```typescript
import { AreaChart } from '@/components/charts/area-chart'

<AreaChart data={data} height={350} />
```

### LineChart
**Uso:** Comparar múltiplas métricas ao longo do tempo
**Exemplo:** Performance de produtos, comparação de períodos

```typescript
import { LineChart } from '@/components/charts/line-chart'

<LineChart data={data} height={350} />
```

### BarChart
**Uso:** Comparar valores entre categorias
**Exemplo:** Vendas por categoria, performance por região

```typescript
import { BarChart } from '@/components/charts/bar-chart'

<BarChart data={data} height={350} />
```

---

## 🎨 Paleta de Cores

Cores pré-configuradas do design system:

```typescript
import { chartColorsRGBA } from '@/lib/chart-config'

chartColorsRGBA.primary         // Blue - #3B82F6
chartColorsRGBA.primaryLight    // Blue Light (10% opacity)

chartColorsRGBA.secondary       // Purple - #6366F1
chartColorsRGBA.secondaryLight  // Purple Light

chartColorsRGBA.success         // Green - #22C55E
chartColorsRGBA.successLight    // Green Light

chartColorsRGBA.warning         // Orange - #FB923C
chartColorsRGBA.warningLight    // Orange Light

chartColorsRGBA.error           // Red - #EF4444
chartColorsRGBA.errorLight      // Red Light
```

---

## 🛠️ Helpers para Datasets

### createAreaDataset()
Para gráficos de área com preenchimento

```typescript
import { createAreaDataset } from '@/lib/chart-config'

createAreaDataset(
  'Nome do Dataset',
  [100, 200, 150, 300],           // Dados
  chartColorsRGBA.primary,        // Cor da linha
  chartColorsRGBA.primaryLight    // Cor do preenchimento
)
```

### createLineDataset()
Para gráficos de linha sem preenchimento

```typescript
import { createLineDataset } from '@/lib/chart-config'

createLineDataset(
  'Vendas',
  [100, 200, 150, 300],
  chartColorsRGBA.primary
)
```

### createBarDataset()
Para gráficos de barras

```typescript
import { createBarDataset } from '@/lib/chart-config'

createBarDataset(
  'Categorias',
  [50, 100, 75, 125],
  chartColorsRGBA.success
)
```

---

## 🔢 Formatadores

### formatCurrency()
Formata valores monetários em Real (BRL)

```typescript
import { formatCurrency } from '@/lib/chart-config'

formatCurrency(45231.89)  // "R$ 45.231,89"
```

### formatNumber()
Formata números com separadores

```typescript
import { formatNumber } from '@/lib/chart-config'

formatNumber(1234567)  // "1.234.567"
```

### formatPercentage()
Formata percentuais

```typescript
import { formatPercentage } from '@/lib/chart-config'

formatPercentage(12.5)  // "12.5%"
```

**Uso em Tooltips:**

```typescript
options: {
  plugins: {
    tooltip: {
      callbacks: {
        label: (context) => {
          return formatCurrency(context.parsed.y)
        }
      }
    }
  }
}
```

---

## ⚙️ Customização de Opções

### Override de Opções Padrão

```typescript
<AreaChart
  data={chartData}
  options={{
    plugins: {
      legend: {
        position: 'bottom',  // Mover legenda para baixo
      },
      tooltip: {
        callbacks: {
          label: (context) => formatCurrency(context.parsed.y)
        }
      }
    },
    scales: {
      y: {
        max: 100000,  // Definir máximo do eixo Y
        ticks: {
          callback: (value) => formatCurrency(Number(value))
        }
      }
    }
  }}
/>
```

### Customização Comum

**1. Ocultar Legenda:**
```typescript
options: {
  plugins: {
    legend: { display: false }
  }
}
```

**2. Formato de Eixo Y como Moeda:**
```typescript
options: {
  scales: {
    y: {
      ticks: {
        callback: (value) => formatCurrency(Number(value))
      }
    }
  }
}
```

**3. Grid Vertical:**
```typescript
options: {
  scales: {
    x: {
      grid: {
        display: true,  // Mostrar linhas verticais
        color: 'rgba(0, 0, 0, 0.05)'
      }
    }
  }
}
```

---

## 📈 Exemplos Práticos

### Gráfico de Receita vs Despesas

```typescript
'use client'

import { AreaChart } from '@/components/charts/area-chart'
import { createAreaDataset, chartColorsRGBA } from '@/lib/chart-config'

export function RevenueVsExpenses() {
  const data = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      createAreaDataset(
        'Receita',
        [45000, 52000, 48000, 61000, 59000, 72000],
        chartColorsRGBA.success,
        chartColorsRGBA.successLight
      ),
      createAreaDataset(
        'Despesas',
        [32000, 35000, 33000, 41000, 39000, 48000],
        chartColorsRGBA.error,
        chartColorsRGBA.errorLight
      ),
    ],
  }

  return <AreaChart data={data} height={350} />
}
```

### Gráfico de Barras com Múltiplos Datasets

```typescript
'use client'

import { BarChart } from '@/components/charts/bar-chart'
import { createBarDataset, chartColorsRGBA } from '@/lib/chart-config'

export function SalesByCategory() {
  const data = {
    labels: ['Eletrônicos', 'Roupas', 'Alimentos', 'Livros'],
    datasets: [
      createBarDataset(
        '2023',
        [120, 90, 150, 80],
        chartColorsRGBA.primary
      ),
      createBarDataset(
        '2024',
        [150, 110, 180, 95],
        chartColorsRGBA.secondary
      ),
    ],
  }

  return <BarChart data={data} height={350} />
}
```

### Gráfico de Linha Comparativo

```typescript
'use client'

import { LineChart } from '@/components/charts/line-chart'
import { createLineDataset, chartColorsRGBA } from '@/lib/chart-config'

export function ProductPerformance() {
  const data = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [
      createLineDataset(
        'Produto A',
        [30, 45, 38, 52],
        chartColorsRGBA.primary
      ),
      createLineDataset(
        'Produto B',
        [25, 35, 42, 48],
        chartColorsRGBA.secondary
      ),
      createLineDataset(
        'Produto C',
        [40, 30, 35, 40],
        chartColorsRGBA.warning
      ),
    ],
  }

  return <LineChart data={data} height={300} />
}
```

---

## 🔥 Dicas de Performance

1. **Memoize Data:** Use `useMemo` para evitar recriação desnecessária
   ```typescript
   const chartData = useMemo(() => ({
     labels: [...],
     datasets: [...]
   }), [dependencies])
   ```

2. **Lazy Loading:** Importe charts dinamicamente se não forem críticos
   ```typescript
   const AreaChart = dynamic(() =>
     import('@/components/charts/area-chart').then(mod => mod.AreaChart),
     { ssr: false }
   )
   ```

3. **Decimation:** Para datasets muito grandes, use decimation
   ```typescript
   options: {
     parsing: false,
     plugins: {
       decimation: {
         enabled: true,
         algorithm: 'lttb',
       }
     }
   }
   ```

---

## 🐛 Troubleshooting

### Erro: "Category is not a registered scale"

**Causa:** Chart.js elements não foram registrados antes do componente renderizar.

**Solução:**
O registro do Chart.js acontece **automaticamente** ao importar qualquer configuração de `@/lib/chart-config`. Os componentes wrapper garantem isso:

```typescript
// ✅ CORRETO - Registro automático
import { AreaChart } from '@/components/charts/area-chart'
import { LineChart } from '@/components/charts/line-chart'

// ❌ EVITAR - Requer registro manual
import { Line } from 'react-chartjs-2'
```

**Como funciona:**
- `src/lib/chart-config.ts` registra todos os elementos no nível do módulo (module-level side effect)
- Os wrappers importam automaticamente as configurações, ativando o registro
- Não é necessário chamar `registerChartJS()` manualmente

**Se ainda não funcionar:**
1. Limpar cache: `npm run clean && npm run dev`
2. Hard refresh: `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows)

### Gráfico não aparece

**Verificar:**
1. Dados estão no formato correto?
2. Labels e datasets têm o mesmo tamanho?
3. Component está em um Client Component (`'use client'`)?
4. Console do browser mostra algum erro? (F12)

### TypeScript Errors

**Solução:** Importar tipos corretos:
```typescript
import { ChartData, ChartOptions } from 'chart.js'

// Para tipos específicos:
interface MyChartProps {
  data: ChartData<'line'>      // ou 'bar', 'pie', etc
  options?: ChartOptions<'line'>
}
```

---

## 📚 Recursos Adicionais

- **Chart.js Docs:** https://www.chartjs.org/docs/latest/
- **react-chartjs-2 Docs:** https://react-chartjs-2.js.org/
- **Chart.js Examples:** https://www.chartjs.org/docs/latest/samples/
- **Configuração Local:** [src/lib/chart-config.ts](src/lib/chart-config.ts)

---

## ✅ Checklist para Novos Gráficos

- [ ] Importar componente correto (AreaChart, LineChart, BarChart)
- [ ] Usar helper functions (createAreaDataset, etc)
- [ ] Aplicar cores do design system (chartColorsRGBA)
- [ ] Usar formatadores (formatCurrency, formatNumber)
- [ ] Memoizar dados com useMemo
- [ ] Adicionar `'use client'` se necessário
- [ ] Testar responsividade
- [ ] Verificar acessibilidade (tooltips, labels)

---

**🎉 Tudo pronto para criar gráficos incríveis!**
