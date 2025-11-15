# Fluxo de Integração - Dashboard Principal

**Versão**: 1.0.0  
**Última Atualização**: 2025-01-14  
**Módulo**: Dashboard Principal

---

## Índice

1. [Diagrama de Fluxo Geral](#diagrama-de-fluxo-geral)
2. [Fluxo de Carregamento Inicial](#fluxo-de-carregamento-inicial)
3. [Fluxo de Aplicação de Filtros](#fluxo-de-aplicação-de-filtros)
4. [Fluxo de Dados do Dashboard](#fluxo-de-dados-do-dashboard)
5. [Fluxo de Dados por Filial](#fluxo-de-dados-por-filial)
6. [Fluxo de Dados do Gráfico](#fluxo-de-dados-do-gráfico)
7. [Fluxo de Autorização](#fluxo-de-autorização)
8. [Fluxo de Auditoria](#fluxo-de-auditoria)
9. [Tratamento de Erros](#tratamento-de-erros)

---

## Diagrama de Fluxo Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUÁRIO ACESSA /dashboard                      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE DE AUTENTICAÇÃO                       │
│  - Verifica se usuário está autenticado                                 │
│  - Redireciona para /login se não autenticado                           │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ ✓ Autenticado
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DASHBOARD PAGE COMPONENT                            │
│  Arquivo: src/app/(dashboard)/dashboard/page.tsx                        │
│                                                                          │
│  1. Obtém Tenant Context (currentTenant, userProfile)                   │
│  2. Inicializa Estados (dataInicio, dataFim, filiaisSelecionadas)       │
│  3. Registra Log de Auditoria                                           │
│  4. Calcula apiParams automaticamente                                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┬────────────────┐
                │                             │                │
                ▼                             ▼                ▼
┌───────────────────────┐  ┌──────────────────────────┐  ┌────────────────┐
│  SWR: Dashboard Data  │  │ SWR: Vendas por Filial   │  │ SWR: Chart Data│
│  /api/dashboard       │  │ /api/dashboard/vendas..  │  │ /api/charts/.. │
└───────┬───────────────┘  └──────────┬───────────────┘  └───────┬────────┘
        │                             │                          │
        ▼                             ▼                          ▼
┌───────────────────────┐  ┌──────────────────────────┐  ┌────────────────┐
│  API Route Handler    │  │  API Route Handler       │  │ API Route      │
│  Validação (Zod)      │  │  Validação (Zod)         │  │ Validação      │
│  Autorização Schema   │  │  Autorização Filiais     │  │ Auth Filiais   │
└───────┬───────────────┘  └──────────┬───────────────┘  └───────┬────────┘
        │                             │                          │
        ▼                             ▼                          ▼
┌───────────────────────┐  ┌──────────────────────────┐  ┌────────────────┐
│  RPC Function         │  │  RPC Function            │  │ RPC Functions  │
│  get_dashboard_data   │  │  get_vendas_por_filial   │  │ get_sales_by_  │
│                       │  │                          │  │ month_chart    │
└───────┬───────────────┘  └──────────┬───────────────┘  └───────┬────────┘
        │                             │                          │
        ▼                             ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            POSTGRESQL DATABASE                           │
│  - vendas_diarias_por_filial                                            │
│  - descontos_venda (opcional)                                           │
│  - despesas                                                             │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESPOSTA JSON PARA FRONTEND                      │
│  - Cards de Métricas (CardMetric)                                       │
│  - Gráfico de Vendas (ChartVendas)                                      │
│  - Tabela de Vendas por Filial (Table)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Carregamento Inicial

### Etapa 1: Montagem do Componente

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx`

```typescript
export default function DashboardPage() {
  const { currentTenant, userProfile } = useTenantContext()
  
  // 1. Define estados iniciais
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()))
  const [dataFim, setDataFim] = useState<Date>(subDays(new Date(), 1))
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<
    { value: string; label: string }[]
  >([])
  
  // 2. Estado para parâmetros da API
  const [apiParams, setApiParams] = useState({
    schema: currentTenant?.supabase_schema,
    data_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    data_fim: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    filiais: 'all',
  })
  
  // ... continua
}
```

**Valores Padrão**:
- **Data Início**: Primeiro dia do mês atual
- **Data Fim**: Dia anterior (ontem)
- **Filiais**: Todas ('all')

---

### Etapa 2: Log de Auditoria

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 99-115)

```typescript
useEffect(() => {
  const logAccess = async () => {
    if (currentTenant && userProfile) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Log module access
      logModuleAccess({
        module: 'dashboard',
        tenantId: currentTenant.id,
        userName: userProfile.full_name,
        userEmail: user?.email || ''
      })
    }
  }
  logAccess()
}, [currentTenant, userProfile])
```

**Sequência**:
1. Verifica se `currentTenant` e `userProfile` existem
2. Obtém dados do usuário autenticado
3. Chama `logModuleAccess` com dados do módulo
4. Função RPC `insert_audit_log` é executada
5. Registro criado na tabela de auditoria

---

### Etapa 3: Construção Automática de Parâmetros

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 118-131)

```typescript
useEffect(() => {
  if (!currentTenant?.supabase_schema || !dataInicio || !dataFim) return

  const filiaisParam = filiaisSelecionadas.length === 0 
    ? 'all' 
    : filiaisSelecionadas.map(f => f.value).join(',');

  setApiParams({
    schema: currentTenant.supabase_schema,
    data_inicio: format(dataInicio, 'yyyy-MM-dd'),
    data_fim: format(dataFim, 'yyyy-MM-dd'),
    filiais: filiaisParam,
  })
}, [currentTenant?.supabase_schema, dataInicio, dataFim, filiaisSelecionadas])
```

**Lógica**:
- Se nenhuma filial selecionada → `filiais = 'all'`
- Se filiais selecionadas → `filiais = '1,3,5'` (IDs separados por vírgula)
- Datas formatadas para `YYYY-MM-DD`

---

### Etapa 4: Chamadas SWR (Paralelas)

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 133-149)

```typescript
// 1. Dados principais do dashboard
const apiUrl = apiParams.schema
  ? `/api/dashboard?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
  : null

const { data, error, isLoading } = useSWR<DashboardData>(
  apiUrl, 
  fetcher, 
  { refreshInterval: 0 }
)

// 2. Dados do gráfico
const chartApiUrl = apiParams.schema
  ? `/api/charts/sales-by-month?schema=${apiParams.schema}&filiais=${apiParams.filiais}`
  : null

const { data: chartData, isLoading: isChartLoading } = useSWR(
  chartApiUrl, 
  fetcher, 
  { refreshInterval: 0 }
)

// 3. Dados de vendas por filial
const vendasFilialUrl = apiParams.schema
  ? `/api/dashboard/vendas-por-filial?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
  : null

const { data: vendasPorFilial, isLoading: isLoadingVendasFilial } = useSWR<VendaPorFilial[]>(
  vendasFilialUrl, 
  fetcher, 
  { refreshInterval: 0 }
)
```

**Características**:
- Três chamadas executadas **em paralelo**
- SWR gerencia cache automaticamente
- `refreshInterval: 0` = sem auto-refresh
- `null` como URL = não faz chamada (aguarda params)

---

## Fluxo de Aplicação de Filtros

### Sequência de Eventos

```
Usuário altera filtro
        │
        ▼
┌────────────────────────┐
│ PeriodFilter ou        │
│ MultiSelect onChange   │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Estado local atualizado│
│ (dataInicio/dataFim ou │
│  filiaisSelecionadas)  │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ useEffect detecta      │
│ mudança nos estados    │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Reconstrói apiParams   │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ SWR detecta mudança    │
│ na URL (key changed)   │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Nova requisição HTTP   │
│ para as 3 APIs         │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ UI atualizada com      │
│ novos dados            │
└────────────────────────┘
```

---

## Fluxo de Dados do Dashboard

### Frontend → API

**Requisição HTTP**:
```http
GET /api/dashboard?schema=okilao&data_inicio=2025-01-01&data_fim=2025-01-31&filiais=all
```

### API → Validação

**Arquivo**: `src/app/api/dashboard/route.ts` (linhas 12-68)

```typescript
// 1. Validação com Zod
const querySchema = z.object({
  schema: z.string().min(1),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filiais: z.string().optional(),
})

const validation = querySchema.safeParse(queryParams)
if (!validation.success) {
  return NextResponse.json({ 
    error: 'Invalid query parameters', 
    details: validation.error.flatten() 
  }, { status: 400 })
}

// 2. Verificação de autenticação
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// 3. Validação de acesso ao schema
const hasAccess = await validateSchemaAccess(supabase, user, requestedSchema)
if (!hasAccess) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### API → Autorização de Filiais

**Arquivo**: `src/app/api/dashboard/route.ts` (linhas 77-95)

```typescript
// Get user's authorized branches
const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

// Determine which filiais to use based on authorization
let finalFiliais: string[] | null = null

if (authorizedBranches === null) {
  // User has no restrictions - use requested value
  finalFiliais = (filiais && filiais !== 'all') ? filiais.split(',') : null
} else if (!filiais || filiais === 'all') {
  // User requested all but has restrictions - use authorized branches
  finalFiliais = authorizedBranches
} else {
  // User requested specific filiais - filter by authorized
  const requestedFiliais = filiais.split(',')
  const allowedFiliais = requestedFiliais.filter(f => authorizedBranches.includes(f))
  
  // If none of requested filiais are authorized, use all authorized
  finalFiliais = allowedFiliais.length > 0 ? allowedFiliais : authorizedBranches
}
```

**Lógica de Autorização**:

| Situação | Filiais Solicitadas | Filiais Autorizadas | Resultado Final |
|----------|---------------------|---------------------|-----------------|
| Admin sem restrição | `all` | `null` | `null` (todas) |
| Admin sem restrição | `1,3` | `null` | `[1,3]` |
| Usuário restrito | `all` | `[1,3,5]` | `[1,3,5]` |
| Usuário restrito | `3,5,7` | `[1,3,5]` | `[3,5]` (interseção) |
| Usuário restrito | `7,9` | `[1,3,5]` | `[1,3,5]` (nenhuma match, usa todas autorizadas) |

---

### API → RPC Function

**Arquivo**: `src/app/api/dashboard/route.ts` (linhas 98-116)

```typescript
// Prepara os parâmetros para a função RPC
const rpcParams = {
  schema_name: requestedSchema,
  p_data_inicio: data_inicio,
  p_data_fim: data_fim,
  p_filiais_ids: finalFiliais  // Array ou null
}

// Usa cliente direto (sem cache) para garantir dados atualizados
const { createClient: createDirectClient } = await import('@supabase/supabase-js')
const directSupabase = createDirectClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const { data, error } = await directSupabase.rpc(
  'get_dashboard_data', 
  rpcParams
).single()
```

**Por que usar Direct Client?**
- Evita problemas de cache do Next.js
- Garante dados sempre atualizados
- Usa `service_role` quando disponível (mais permissões)

---

### RPC Function → Database

**Arquivo**: `supabase/migrations/dre_gerencial_rpc_functions.sql` (linhas 121-478)

```sql
CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  schema_name TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  total_vendas NUMERIC,
  total_lucro NUMERIC,
  -- ... 19 campos adicionais
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Calcula datas de comparação (PAM, PAA, YTD)
  v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
  v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;
  
  -- 2. Busca dados do período atual
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0),
      COALESCE(SUM(total_lucro), 0),
      COALESCE(SUM(total_transacoes), 0)
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING p_data_inicio, p_data_fim, p_filiais_ids
  INTO v_total_vendas, v_total_lucro, v_total_transacoes;
  
  -- 3. Subtrai descontos (se tabela existir)
  IF v_table_exists THEN
    -- ... subtração de descontos
  END IF;
  
  -- 4. Calcula métricas (ticket médio, margem)
  IF v_total_transacoes > 0 THEN
    v_ticket_medio := v_total_vendas / v_total_transacoes;
  END IF;
  
  -- 5. Busca dados do PAM e PAA
  -- ... queries similares para períodos anteriores
  
  -- 6. Calcula variações percentuais
  IF v_pa_vendas > 0 THEN
    v_variacao_vendas_mes := ((v_total_vendas - v_pa_vendas) / v_pa_vendas) * 100;
  END IF;
  
  -- 7. Retorna todos os dados
  RETURN QUERY SELECT
    v_total_vendas,
    v_total_lucro,
    v_ticket_medio,
    -- ... demais campos
  ;
END;
$$;
```

---

### Database → Response → Frontend

**Fluxo de Retorno**:
```
Database Result
    ↓
RPC Function (monta estrutura)
    ↓
API Route (NextResponse.json)
    ↓
SWR (atualiza cache local)
    ↓
React State (data)
    ↓
UI Components (CardMetric, Table, Chart)
```

---

## Fluxo de Dados por Filial

### Frontend → API

**Requisição**:
```http
GET /api/dashboard/vendas-por-filial?schema=okilao&data_inicio=2025-01-01&data_fim=2025-01-31&filiais=1,3
```

### API → RPC

**Arquivo**: `src/app/api/dashboard/vendas-por-filial/route.ts` (linhas 71-76)

```typescript
const { data, error } = await directSupabase.rpc('get_vendas_por_filial', {
  p_schema: schema,
  p_data_inicio: dataInicio,
  p_data_fim: dataFim,
  p_filiais: finalFiliais  // "1,3" ou "all"
})
```

### RPC → Database

**Nota**: Esta função RPC não foi encontrada nos arquivos SQL fornecidos, mas esperamos que ela:

1. Busque dados de `vendas_diarias_por_filial` agrupados por `filial_id`
2. Calcule dados do período anterior (PAM)
3. Calcule variações (deltas)
4. Retorne array de registros (um por filial)

**Estrutura Esperada**:
```sql
CREATE OR REPLACE FUNCTION get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  filial_id INTEGER,
  valor_total NUMERIC,
  -- ... demais campos
)
```

---

## Fluxo de Dados do Gráfico

### Frontend → API

**Requisição**:
```http
GET /api/charts/sales-by-month?schema=okilao&filiais=all
```

**Observação**: Não usa filtro de data pois busca o ano inteiro (12 meses)

---

### API → Múltiplas RPCs

**Arquivo**: `src/app/api/charts/sales-by-month/route.ts` (linhas 77-110)

```typescript
// 1. Busca dados de vendas
const { data: salesData, error: salesError } = await directSupabase.rpc(
  'get_sales_by_month_chart',
  {
    schema_name: requestedSchema,
    p_filiais: finalFiliais || 'all'
  }
)

// 2. Busca dados de despesas
const { data: expensesData, error: expensesError } = await directSupabase.rpc(
  'get_expenses_by_month_chart',
  {
    schema_name: requestedSchema,
    p_filiais: finalFiliais || 'all'
  }
)

// 3. Busca dados de lucro
const { data: lucroData, error: lucroError } = await directSupabase.rpc(
  'get_lucro_by_month_chart',
  {
    schema_name: requestedSchema,
    p_filiais: finalFiliais || 'all'
  }
)
```

**Observação**: Erros nas funções de despesas e lucro são tolerados (continuam sem esses dados).

---

### API → Merge de Dados

**Arquivo**: `src/app/api/charts/sales-by-month/route.ts` (linhas 123-135)

```typescript
// Merge sales, expenses and lucro data by month
const mergedData = (salesData || []).map((sale) => {
  const expense = expensesData?.find((exp) => exp.mes === sale.mes)
  const lucro = lucroData?.find((luc) => luc.mes === sale.mes)
  
  return {
    mes: sale.mes,
    total_vendas: sale.total_vendas,
    total_vendas_ano_anterior: sale.total_vendas_ano_anterior,
    total_despesas: expense?.total_despesas || 0,
    total_despesas_ano_anterior: expense?.total_despesas_ano_anterior || 0,
    total_lucro: lucro?.total_lucro || 0,
    total_lucro_ano_anterior: lucro?.total_lucro_ano_anterior || 0,
  }
})
```

**Lógica de Merge**:
- Loop pelos dados de vendas (array base)
- Para cada mês, busca dados correspondentes em despesas e lucro
- Se não encontrar, usa `0` como padrão
- Retorna array unificado com 12 registros

---

### Frontend → Renderização do Gráfico

**Componente**: `ChartVendas`  
**Arquivo**: `src/components/dashboard/chart-vendas.tsx` (linhas 169-237)

```typescript
// Transform data: receita (positivo), despesa (negativo), lucro (linha)
const chartData = data.map((d) => {
  const receita = d.total_vendas
  const despesaAbsoluta = d.total_despesas || 0
  const lucro = d.total_lucro || 0

  return {
    name: d.mes.toUpperCase(),
    receita: receita,
    despesa: -despesaAbsoluta,  // Negativo para aparecer para baixo
    lucro: lucro === 0 ? null : lucro,  // null para não desenhar linha
  }
})

return (
  <ComposedChart data={chartData}>
    <Bar dataKey="receita" fill="#1cca5b" stackId="stack" name="Receita" />
    <Bar dataKey="despesa" fill="#ef4343" stackId="stack" name="Despesa" />
    <Line dataKey="lucro" stroke="#f59e0b" strokeWidth={4} name="Lucro Bruto" />
  </ComposedChart>
)
```

**Características**:
- **ComposedChart**: Combina barras e linha
- **Receita**: Barra verde para cima
- **Despesa**: Barra vermelha para baixo (valor negativo)
- **Lucro**: Linha laranja conectando pontos
- **stackOffset="sign"**: Permite valores positivos e negativos

---

## Fluxo de Autorização

### Diagrama Detalhado

```
┌─────────────────────────────────────────────────────────────┐
│                    API Route Handler                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  getUserAuthorizedBranchCodes(supabase, user.id)            │
│  Arquivo: src/lib/authorized-branches.ts                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Query user_profiles WHERE id = user.id                     │
│  SELECT: branch_access                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐     ┌───────────────────┐
│ branch_access =  │     │ branch_access =   │
│ null             │     │ ["1", "3", "5"]   │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌───────────────────┐
│ return null      │     │ return ["1","3","5"]│
│ (sem restrição)  │     │ (restrito)        │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         └────────────┬───────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Lógica de Interseção (API Route)                           │
│  - Se null: usa filiais solicitadas                         │
│  - Se array: intersecta com filiais solicitadas             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  finalFiliais enviado para RPC Function                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Auditoria

### Sequência Completa

```
┌─────────────────────────────────────────────────────────────┐
│  useEffect no Dashboard Page                                │
│  Executado uma vez após montagem                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  logModuleAccess({ module, tenantId, userName, userEmail }) │
│  Arquivo: src/lib/audit.ts                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  createClient() + supabase.auth.getUser()                   │
│  Obtém dados do usuário autenticado                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  supabase.rpc('insert_audit_log', {                         │
│    p_module: 'dashboard',                                   │
│    p_tenant_id: currentTenant.id,                           │
│    p_user_name: userProfile.full_name,                      │
│    p_user_email: user.email,                                │
│    p_action: 'access',                                      │
│    p_metadata: {}                                           │
│  })                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  RPC Function: insert_audit_log                             │
│  INSERT INTO audit_log (...)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Registro criado na tabela audit_log                        │
│  - timestamp automático                                     │
│  - dados do usuário e módulo                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Tratamento de Erros

### Níveis de Erro

#### 1. Erro de Validação (400)

**Cenário**: Parâmetros inválidos na URL

**Exemplo**:
```typescript
// URL: /api/dashboard?schema=okilao&data_inicio=invalid-date
{
  "error": "Invalid query parameters",
  "details": {
    "fieldErrors": {
      "data_inicio": ["Formato de data inválido, esperado YYYY-MM-DD"]
    }
  }
}
```

**Tratamento no Frontend**: Exibir mensagem de erro genérica

---

#### 2. Erro de Autenticação (401)

**Cenário**: Usuário não autenticado

**Exemplo**:
```typescript
{
  "error": "Unauthorized"
}
```

**Tratamento**: Middleware redireciona para `/login` automaticamente

---

#### 3. Erro de Autorização (403)

**Cenário**: Usuário não tem acesso ao schema solicitado

**Exemplo**:
```typescript
{
  "error": "Forbidden"
}
```

**Tratamento no Frontend**: Exibir mensagem "Acesso negado"

---

#### 4. Erro de RPC (500)

**Cenário**: Erro na execução da função RPC

**Exemplo**:
```typescript
{
  "error": "Error fetching dashboard data",
  "details": "relation \"okilao.vendas_diarias_por_filial\" does not exist"
}
```

**Tratamento no Frontend**:
- SWR captura erro em `error` state
- Exibir mensagem: "Erro ao carregar dados do dashboard"
- Log no console do navegador

---

#### 5. Erro de Rede

**Cenário**: Falha na conexão ou timeout

**Tratamento**:
- SWR retenta automaticamente (configurável)
- Exibir mensagem de erro
- Botão para tentar novamente

---

### Frontend Error Handling

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx`

```typescript
const { data, error, isLoading } = useSWR<DashboardData>(apiUrl, fetcher)

// Durante carregamento
if (isLoading) {
  return <Skeleton />
}

// Em caso de erro
if (error) {
  return (
    <div className="text-center text-muted-foreground">
      {error ? 'Erro ao carregar dados do gráfico.' : 'Nenhum dado para exibir.'}
    </div>
  )
}

// Dados OK
if (data) {
  return <CardMetric {...data} />
}
```

---

## Estados de Carregamento

### Skeleton Loaders

**Durante o carregamento, são exibidos**:

1. **Cards de Métricas**: 4 skeleton cards
2. **Gráfico**: Skeleton com barras animadas
3. **Tabela**: 3 linhas de skeleton

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 195-309)

```typescript
{isDataLoading ? (
  <>
    {[1, 2, 3, 4].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </CardContent>
      </Card>
    ))}
  </>
) : data ? (
  <CardMetric {...} />
) : null}
```

---

## Performance e Otimizações

### 1. SWR Cache

- Dados ficam em cache após primeira busca
- Próximas visitas são instantâneas
- `refreshInterval: 0` = sem auto-refresh

### 2. Dynamic Routes

```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

- Força execução dinâmica (sem cache de build)
- Sempre busca dados atualizados

### 3. Parallel Requests

- Três APIs são chamadas em paralelo
- Não bloqueia renderização
- Cada parte da UI carrega independentemente

### 4. Agregações no Banco

- Cálculos feitos no PostgreSQL (mais rápido)
- Menos dados trafegados pela rede
- Frontend apenas renderiza

---

**Versão**: 1.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-01-14  
**Diagramas**: 8  
**Fluxos Documentados**: 9
