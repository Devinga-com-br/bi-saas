# Guia de Componentes Reutilizáveis

**Data:** 2025-11-10  
**Módulo Origem:** Despesas

## 📦 Componentes Genéricos Criados

Os componentes criados para o módulo Despesas foram projetados para serem **reutilizáveis** em outros módulos. Este guia mostra como adaptá-los.

---

## 1. DataTable Genérico

### Localização
`/src/components/despesas/data-table.tsx`

### Como Tornar 100% Genérico

**Passo 1:** Mova para pasta compartilhada
```bash
mv src/components/despesas/data-table.tsx src/components/shared/data-table.tsx
```

**Passo 2:** Use em qualquer módulo
```tsx
import { DataTable } from '@/components/shared/data-table'
import { ColumnDef } from '@tanstack/react-table'

// Defina suas colunas
const columns: ColumnDef<YourDataType>[] = [
  {
    accessorKey: "name",
    header: "Nome",
  },
  {
    accessorKey: "value",
    header: "Valor",
    cell: ({ row }) => formatCurrency(row.getValue("value")),
  },
]

// Use o DataTable
<DataTable
  columns={columns}
  data={yourData}
  searchPlaceholder="Buscar..."
  onExport={handleExport}
/>
```

---

## 2. Filters Component Pattern

### Padrão de Implementação

Cada módulo deve ter seu próprio componente de filtros, mas seguindo o mesmo padrão:

```tsx
// src/components/vendas/filters.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Filter, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface VendasFiltersProps {
  // Seus filtros específicos
  categoria: string
  setCategoria: (val: string) => void
  periodo: string
  setPeriodo: (val: string) => void
  // ... outros filtros
}

export function VendasFilters({
  categoria,
  setCategoria,
  periodo,
  setPeriodo,
}: VendasFiltersProps) {
  const handleClearFilters = () => {
    setCategoria('')
    setPeriodo('')
  }

  const hasActiveFilters = categoria || periodo

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Configure os filtros para análise de vendas
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seus filtros aqui */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cat1">Categoria 1</SelectItem>
                <SelectItem value="cat2">Categoria 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Regras do Padrão:**
- ✅ Sempre usar `Card` como container
- ✅ Header com ícone `Filter` e descrição
- ✅ Botão "Limpar" condicional
- ✅ Grid responsivo (1 → 3 → 4 colunas)
- ✅ Altura fixa `h-10` em inputs
- ✅ Labels descritivas

---

## 3. Summary Stats Pattern

### Template Genérico

```tsx
// src/components/[modulo]/summary-stats.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface Stat {
  title: string
  value: string | number
  icon: LucideIcon
  description: string
  color: string
  bgColor: string
}

interface SummaryStatsProps {
  stats: Stat[]
}

export function SummaryStats({ stats }: SummaryStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

**Uso:**
```tsx
import { DollarSign, TrendingUp, Users } from 'lucide-react'

const stats = [
  {
    title: "Receita Total",
    value: "R$ 1.234.567",
    icon: DollarSign,
    description: "Este mês",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  // ... mais stats
]

<SummaryStats stats={stats} />
```

---

## 4. Empty State Pattern

### Template Genérico

```tsx
// src/components/shared/empty-state.tsx

import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 5. Loading State Pattern

### Template Genérico

```tsx
// src/components/shared/loading-skeleton.tsx

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSkeletonProps {
  type: "stats" | "table" | "list" | "grid"
  count?: number
}

export function LoadingSkeleton({ type, count = 5 }: LoadingSkeletonProps) {
  if (type === "stats") {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "table") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  // ... outros tipos
}
```

---

## 6. Page Header Pattern

### Template Padrão

```tsx
// Em qualquer página do módulo

import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { Separator } from '@/components/ui/separator'
import { YourIcon } from 'lucide-react'

<div className="flex flex-col gap-6 pb-8">
  {/* Page Header */}
  <div className="space-y-2">
    <PageBreadcrumb />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2">
        <YourIcon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Título do Módulo</h1>
        <p className="text-muted-foreground">
          Descrição do que o módulo faz
        </p>
      </div>
    </div>
  </div>

  <Separator />

  {/* Resto do conteúdo */}
</div>
```

---

## 🎨 Paleta de Cores para Stats

Use cores consistentes em todos os módulos:

```tsx
const COLOR_PALETTE = {
  blue: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/20"
  },
  green: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/20"
  },
  purple: {
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/20"
  },
  orange: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/20"
  },
  indigo: {
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/20"
  },
  red: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/20"
  },
  yellow: {
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/20"
  },
  pink: {
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-100 dark:bg-pink-900/20"
  },
}
```

---

## 📏 Espaçamentos Padronizados

Use sempre o mesmo scale:

```tsx
// Gap entre seções principais
className="flex flex-col gap-6 pb-8"

// Gap entre cards de stats
className="grid gap-4"

// Gap interno em cards
className="space-y-4"

// Gap entre label e input
className="space-y-2"

// Gap entre elementos inline
className="gap-2" ou "gap-3"
```

---

## 🚀 Exemplo Completo: Módulo de Vendas

```tsx
// src/app/(dashboard)/vendas/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart } from 'lucide-react'
import { VendasFilters } from '@/components/vendas/filters'
import { SummaryStats } from '@/components/vendas/summary-stats'
import { DataTable } from '@/components/shared/data-table'
import { columns } from '@/components/vendas/columns'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'

export default function VendasPage() {
  const { currentTenant } = useTenantContext()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // ... lógica de negócio

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <PageBreadcrumb />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
            <p className="text-muted-foreground">
              Análise de vendas por período e categoria
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Filtros */}
      <VendasFilters {...filterProps} />

      {/* Estados */}
      {loading && <LoadingSkeleton type="stats" />}
      {error && <EmptyState type="error" message={error} />}
      {!data && <EmptyState type="no-data" />}

      {/* Dados */}
      {data && (
        <>
          <SummaryStats stats={data.stats} />
          <DataTable columns={columns} data={data.items} />
        </>
      )}
    </div>
  )
}
```

---

## ✅ Checklist para Novos Módulos

Ao criar um novo módulo, siga este checklist:

- [ ] Criar componente de Filtros seguindo padrão
- [ ] Criar Stats cards com ícones temáticos
- [ ] Definir colunas tipadas para DataTable
- [ ] Implementar empty states (3 tipos)
- [ ] Adicionar loading skeleton
- [ ] Criar header com ícone e descrição
- [ ] Usar Separator após header
- [ ] Estrutura flex flex-col gap-6 pb-8
- [ ] Grid responsivo em stats (1→2→3→5)
- [ ] Altura h-10 em todos os inputs
- [ ] Dark mode testado
- [ ] Mobile testado

---

## 🎓 Boas Práticas

1. **Sempre** use componentes shadcn/ui
2. **Nunca** crie HTML puro para elementos que existem no shadcn
3. **Sempre** siga o sistema de espaçamento (gap-2, gap-4, gap-6)
4. **Sempre** torne componentes genéricos quando possível
5. **Sempre** documente props com TypeScript
6. **Sempre** teste em mobile e dark mode

---

**Com esses padrões, todos os módulos terão consistência visual e de código!** 🎨
