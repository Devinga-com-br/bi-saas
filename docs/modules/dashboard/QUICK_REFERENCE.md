# Guia de Referência Rápida - Dashboard Principal

**Versão**: 2.0.2  
**Para**: Desenvolvedores

---

## 🚀 Como Usar Este Módulo

### Acessar o Dashboard
```
URL: /dashboard
Rota Física: src/app/(dashboard)/dashboard/page.tsx
Proteção: Middleware de autenticação
```

### Fazer Modificações

```bash
# 1. Frontend (React)
src/app/(dashboard)/dashboard/page.tsx         # Página principal
src/components/dashboard/card-metric.tsx       # Cards de KPI
src/components/dashboard/dashboard-filter.tsx  # Filtros

# 2. Backend (Next.js API)
src/app/api/dashboard/route.ts                 # API principal
src/app/api/dashboard/ytd-metrics/route.ts     # API YTD

# 3. Database (PostgreSQL)
supabase/migrations/dre_gerencial_rpc_functions.sql  # Funções RPC
```

---

## 📊 Buscar Dados do Dashboard

### 1. Via API (Recomendado para Frontend)

```typescript
// Usando SWR (método atual do código)
import useSWR from 'swr'

const { data, error, isLoading } = useSWR<DashboardData>(
  `/api/dashboard?schema=${schema}&data_inicio=${start}&data_fim=${end}&filiais=${filiais}`,
  fetcher
)

// Fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json())
```

### 2. Via RPC Direto (Backend/Scripts)

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()

const { data, error } = await supabase.rpc('get_dashboard_data', {
  schema_name: 'okilao',
  p_data_inicio: '2025-01-01',
  p_data_fim: '2025-01-31',
  p_filiais_ids: ['1', '3', '5'] // ou null para todas
})
```

### 3. Buscar Dados YTD (Lucro e Margem)

```typescript
// Apenas quando filtro = Ano + Ano Atual
const { data: ytdData } = useSWR<YTDMetrics>(
  `/api/dashboard/ytd-metrics?schema=${schema}&data_inicio=${start}&data_fim=${end}&filiais=${filiais}`,
  fetcher
)
```

---

## 🔧 Adicionar Novo Indicador

### Passo 1: Atualizar Interface TypeScript

```typescript
// src/app/(dashboard)/dashboard/page.tsx
interface DashboardData {
  // ... campos existentes ...
  
  // NOVO INDICADOR
  novo_indicador: number
  pa_novo_indicador: number
  variacao_novo_indicador: number
}
```

### Passo 2: Modificar Função RPC

```sql
-- supabase/migrations/YYYYMMDD_add_novo_indicador.sql

CREATE OR REPLACE FUNCTION public.get_dashboard_data(...)
RETURNS TABLE (
  -- ... campos existentes ...
  novo_indicador NUMERIC,
  pa_novo_indicador NUMERIC,
  variacao_novo_indicador NUMERIC
)
AS $$
DECLARE
  v_novo_indicador NUMERIC := 0;
  v_pa_novo_indicador NUMERIC := 0;
BEGIN
  -- Calcular período atual
  SELECT SUM(campo) INTO v_novo_indicador
  FROM ...
  WHERE ...;
  
  -- Calcular período anterior
  SELECT SUM(campo) INTO v_pa_novo_indicador
  FROM ...
  WHERE ...;
  
  -- Retornar
  RETURN QUERY SELECT
    ...,
    v_novo_indicador,
    v_pa_novo_indicador,
    CASE WHEN v_pa_novo_indicador > 0 
      THEN ((v_novo_indicador - v_pa_novo_indicador) / v_pa_novo_indicador) * 100
      ELSE 0
    END AS variacao_novo_indicador
  ;
END;
$$;
```

### Passo 3: Criar Card no Frontend

```typescript
// src/app/(dashboard)/dashboard/page.tsx

<CardMetric
  title="Novo Indicador"
  value={formatValue(data.novo_indicador)}
  previousValue={formatValue(data.pa_novo_indicador)}
  variationPercent={`${data.variacao_novo_indicador >= 0 ? '+' : ''}${data.variacao_novo_indicador.toFixed(2)}%`}
  isPositive={data.variacao_novo_indicador >= 0}
  comparisonLabel={getComparisonLabel()}
/>
```

---

## 🎨 Personalizar Filtros

### Adicionar Nova Opção no Filtro "Filtrar por"

```typescript
// src/components/dashboard/dashboard-filter.tsx

// 1. Adicionar tipo
type FilterType = 'month' | 'year' | 'custom' | 'novo_tipo'

// 2. Adicionar no Select
<SelectContent>
  <SelectItem value="month">Mês</SelectItem>
  <SelectItem value="year">Ano</SelectItem>
  <SelectItem value="custom">Período Customizado</SelectItem>
  <SelectItem value="novo_tipo">Novo Tipo</SelectItem> {/* NOVO */}
</SelectContent>

// 3. Implementar lógica
const handleFilterTypeChange = (value: FilterType) => {
  setFilterType(value)
  
  if (value === 'novo_tipo') {
    // Lógica do novo filtro
    const start = ... // calcular data inicial
    const end = ...   // calcular data final
    onPeriodChange(start, end)
  }
}

// 4. Adicionar UI condicional
{filterType === 'novo_tipo' && (
  <div>
    {/* Componentes do novo filtro */}
  </div>
)}
```

---

## 📈 Adicionar Novo Gráfico

### Criar Componente do Gráfico

```typescript
// src/components/dashboard/chart-novo.tsx
'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ChartNovoProps {
  data: Array<{
    label: string
    value: number
  }>
}

export function ChartNovo({ data }: ChartNovoProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Usar no Dashboard

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { ChartNovo } from '@/components/dashboard/chart-novo'

<Card>
  <CardHeader>
    <CardTitle>Novo Gráfico</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartNovo data={chartData} />
  </CardContent>
</Card>
```

---

## 🔒 Validar Permissões

### Restringir Acesso por Função

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { usePermissions } from '@/hooks/use-permissions'

const { canManageUsers } = usePermissions()

// Condicional
{canManageUsers && (
  <Button>Ação Restrita</Button>
)}
```

### Restringir Acesso por Filial

```typescript
// Backend: src/app/api/dashboard/route.ts
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

if (authorizedBranches === null) {
  // Usuário tem acesso a todas as filiais
} else {
  // Filtrar apenas filiais autorizadas
  finalFiliais = requestedFiliais.filter(f => authorizedBranches.includes(f))
}
```

---

## 🐛 Debug

### Ativar Logs de Debug

```typescript
// src/app/(dashboard)/dashboard/page.tsx

// 1. Adicionar useEffect para debug
useEffect(() => {
  console.log('[DEBUG Dashboard]', {
    dataInicio,
    dataFim,
    filiaisSelecionadas,
    apiParams,
    data,
    error,
    isLoading
  })
}, [dataInicio, dataFim, filiaisSelecionadas, apiParams, data, error, isLoading])

// 2. Backend: Ver logs no terminal
console.log('[API/DASHBOARD] RPC Params:', JSON.stringify(rpcParams, null, 2))
```

### Verificar Dados da RPC

```sql
-- Executar direto no Supabase SQL Editor
SELECT * FROM public.get_dashboard_data(
  'okilao',
  '2025-01-01'::DATE,
  '2025-01-31'::DATE,
  ARRAY['1','3','5']::TEXT[]
);
```

### Verificar Dados YTD

```sql
SELECT * FROM public.get_dashboard_ytd_metrics(
  'okilao',
  '2025-01-01'::DATE,
  '2025-12-31'::DATE,
  ARRAY['1','3','5']::TEXT[]
);
```

---

## 🧪 Testar Localmente

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Rodar em Desenvolvimento
```bash
npm run dev
```

### 4. Acessar Dashboard
```
http://localhost:3000/dashboard
```

### 5. Testar Diferentes Filtros

**Teste 1: Filtro Ano Atual**
- Filtrar por: Ano
- Escolha o ano: 2025 (ano atual)
- Verificar: YTD deve aparecer nos 3 primeiros cards

**Teste 2: Filtro Mês**
- Filtrar por: Mês
- Escolha o mês: Novembro
- Verificar: Label de comparação deve ser "Out/2025"

**Teste 3: Filtro Customizado**
- Filtrar por: Período Customizado
- Data Inicial: 01/01/2025
- Data Final: 31/03/2025
- Verificar: Label de comparação deve ser "PA"

---

## 📝 Convenções de Código

### Nomenclatura

```typescript
// Variáveis: camelCase
const dataInicio = new Date()
const filiaisSelecionadas = []

// Interfaces: PascalCase
interface DashboardData {}
interface YTDMetrics {}

// Componentes: PascalCase
function CardMetric() {}
function DashboardFilter() {}

// Constantes: UPPER_SNAKE_CASE
const API_TIMEOUT = 30000
const MAX_RESULTS = 1000

// Funções: camelCase
function formatCurrency() {}
function calculateVariation() {}
```

### Comentários

```typescript
// ✅ BOM: Comenta o "por quê", não o "o quê"
// YTD só é calculado para o ano atual para garantir comparação justa
if (isCurrentYear) {
  fetchYTDData()
}

// ❌ RUIM: Comenta o óbvio
// Define a data inicial como hoje
const dataInicio = new Date()
```

### Formatação

```typescript
// Usar Prettier (configurado no projeto)
npm run format

// Usar ESLint
npm run lint
```

---

## 🔗 Referências Rápidas

### Tipos de Data

```typescript
// Date → String (formato API)
import { format } from 'date-fns'
const dateStr = format(new Date(), 'yyyy-MM-dd')  // "2025-11-15"

// String → Date (parsing)
import { parse } from 'date-fns'
const date = parse('15/11/2025', 'dd/MM/yyyy', new Date())

// Primeiro dia do mês
import { startOfMonth } from 'date-fns'
const first = startOfMonth(new Date())

// Último dia do mês
import { endOfMonth } from 'date-fns'
const last = endOfMonth(new Date())
```

### Formatação de Valores

```typescript
// Moeda
import { formatCurrency } from '@/lib/chart-config'
formatCurrency(123456.78)  // "R$ 123.456,78"

// Percentual
import { formatPercentage } from '@/lib/chart-config'
formatPercentage(12.34)    // "12,34%"

// Número
const num = 1234567.89
num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })  // "1.234.567,89"
```

### Cores Tailwind (Cards)

```typescript
// Verde (positivo)
className="text-emerald-500"

// Vermelho (negativo)
className="text-red-500"

// Cinza (neutro)
className="text-muted-foreground"

// Texto principal
className="text-foreground"

// Título
className="text-lg font-medium"

// Valor grande
className="text-2xl font-bold"
```

---

## 📚 Links Úteis

### Documentação Completa
- [README.md](./README.md) - Visão geral
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Regras de negócio
- [CARD_FIELDS_EXPLANATION.md](./CARD_FIELDS_EXPLANATION.md) - Explicação dos campos
- [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md) - Fluxo de integração
- [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md) - Funções do banco
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Solução de problemas

### Bibliotecas Externas
- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)
- [SWR](https://swr.vercel.app)
- [date-fns](https://date-fns.org)

---

## ❓ FAQ

**P: Como adicionar um novo filtro?**  
R: Ver seção "Personalizar Filtros" acima.

**P: YTD não aparece, por quê?**  
R: YTD só aparece quando filtro = Ano + Ano Atual. Verifique `shouldShowYTD()`.

**P: Como alterar largura dos filtros?**  
R: Editar classes `w-[XXXpx]` em `dashboard-filter.tsx`.

**P: Como testar funções RPC?**  
R: Usar SQL Editor do Supabase (ver seção "Debug").

**P: Erro PGRST106?**  
R: Schema não exposto. Adicionar aos "Exposed schemas" no Supabase Dashboard.

**P: Como fazer deploy?**  
R: `npm run build` → Deploy no Vercel ou plataforma de escolha.

---

**Última Atualização**: 2025-11-15  
**Versão**: 2.0.2  
**Mantenedor**: Equipe de Desenvolvimento
