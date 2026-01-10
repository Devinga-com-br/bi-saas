# 📊 Arquitetura da Tabela "Vendas por Filial" - Dashboard 360

**Última Atualização:** 2026-01-10  
**Versão da Função RPC:** `get_vendas_por_filial` (2025-12-18)

---

## 🎯 Visão Geral

Tabela interativa com **ordenação client-side**, **consolidação PDV+Faturamento** e **exportação PDF** que exibe análise comparativa de vendas por filial com 7 métricas principais e dados de **Entradas (Compras)**.

---

## 📐 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Client)                        │
│  /app/(dashboard)/dashboard/page.tsx                        │
├─────────────────────────────────────────────────────────────┤
│  • Estado: sortColumn, sortDirection                        │
│  • useSWR: vendasPorFilial, faturamentoPorFilialData       │
│  • useMemo: sortedVendasPorFilial, faturamentoPorFilialMap │
│  • Renderização: Table shadcn/ui                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP GET
┌─────────────────────────────────────────────────────────────┐
│                    API ROUTES (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  /api/dashboard/vendas-por-filial/route.ts                 │
│  • Auth check + schema validation                          │
│  • Branch authorization filter                             │
│  • RPC call: get_vendas_por_filial()                       │
├─────────────────────────────────────────────────────────────┤
│  /api/faturamento/route.ts?por_filial=true                 │
│  • Busca NF-e (Notas Fiscais) por filial                   │
│  • Retorna: receita, CMV, lucro bruto                       │
└─────────────────────────────────────────────────────────────┘
                            ↓ Supabase RPC
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL/Supabase)                 │
│  Schema: {tenant}.get_vendas_por_filial()                  │
├─────────────────────────────────────────────────────────────┤
│  **Fontes de Dados:**                                       │
│  • vendas_diarias_por_filial (PDV)                         │
│  • descontos_venda (abatimentos)                            │
│  • entradas (compras - WHERE transacao IN ('P','V'))       │
│                                                             │
│  **Retorna por Filial (25 colunas):**                       │
│  • Período Atual: valor, custo, lucro, margem, entradas    │
│  • Período Anterior: mesmos campos (PA)                     │
│  • Deltas: variações absolutas e percentuais                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Estrutura de Dados

### **Interface TypeScript**

```typescript
interface VendaPorFilial {
  // Identificação
  filial_id: number
  
  // ========== PERÍODO ATUAL ==========
  valor_total: number         // Receita bruta (PDV)
  custo_total: number         // CMV (PDV)
  total_lucro: number         // Lucro bruto (PDV)
  quantidade_total: number    // Qtd produtos vendidos
  total_transacoes: number    // Nº de vendas (tickets)
  ticket_medio: number        // Receita / Transações
  margem_lucro: number        // (Lucro / Receita) * 100
  total_entradas: number      // Compras (transacao P/V)
  
  // ========== PERÍODO ANTERIOR (PA) ==========
  pa_valor_total: number
  pa_custo_total: number
  pa_total_lucro: number
  pa_total_transacoes: number
  pa_ticket_medio: number
  pa_margem_lucro: number
  pa_total_entradas: number
  
  // ========== VARIAÇÕES (DELTAS) ==========
  // Receita
  delta_valor: number              // Valor absoluto
  delta_valor_percent: number      // %
  
  // Custo
  delta_custo: number
  delta_custo_percent: number
  
  // Lucro
  delta_lucro: number
  delta_lucro_percent: number
  
  // Margem
  delta_margem: number             // Pontos percentuais (p.p.)
  
  // Entradas (Compras)
  delta_entradas: number
  delta_entradas_percent: number
}
```

---

## 🗂️ Função RPC PostgreSQL

### **Assinatura**

```sql
CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema TEXT,           -- Nome do schema do tenant
  p_data_inicio DATE,      -- Data início do período
  p_data_fim DATE,         -- Data fim do período
  p_filiais TEXT DEFAULT 'all',  -- 'all' ou '1,3,7'
  p_filter_type TEXT DEFAULT 'year'  -- 'month' | 'year' | 'custom'
)
RETURNS TABLE (
  filial_id BIGINT,
  -- 7 colunas período atual
  valor_total NUMERIC(15,2),
  custo_total NUMERIC(15,2),
  total_lucro NUMERIC(15,2),
  quantidade_total NUMERIC(15,2),
  total_transacoes NUMERIC,
  ticket_medio NUMERIC(15,2),
  margem_lucro NUMERIC(10,2),
  -- 6 colunas período anterior
  pa_valor_total NUMERIC(15,2),
  pa_custo_total NUMERIC(15,2),
  pa_total_lucro NUMERIC(15,2),
  pa_total_transacoes NUMERIC,
  pa_ticket_medio NUMERIC(15,2),
  pa_margem_lucro NUMERIC(10,2),
  -- 7 colunas de variação
  delta_valor NUMERIC(15,2),
  delta_valor_percent NUMERIC(10,2),
  delta_custo NUMERIC(15,2),
  delta_custo_percent NUMERIC(10,2),
  delta_lucro NUMERIC(15,2),
  delta_lucro_percent NUMERIC(10,2),
  delta_margem NUMERIC(10,2),
  -- 4 colunas de entradas
  total_entradas NUMERIC(15,2),
  pa_total_entradas NUMERIC(15,2),
  delta_entradas NUMERIC(15,2),
  delta_entradas_percent NUMERIC(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
```

### **Lógica de Período Anterior**

```sql
-- Declaração de variáveis
DECLARE
  v_pa_data_inicio DATE;
  v_pa_data_fim DATE;
  v_filiais_condition TEXT;
BEGIN
  -- Calcular PA baseado no tipo de filtro
  IF p_filter_type = 'month' THEN
    -- Mês: comparar com mesmo mês do ano anterior
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
    
  ELSIF p_filter_type = 'year' THEN
    -- Ano: comparar com mesmo período do ano anterior
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
    
  ELSE
    -- Custom: período equivalente anterior (deslocamento)
    v_pa_data_inicio := p_data_inicio - (p_data_fim - p_data_inicio + 1);
    v_pa_data_fim := p_data_inicio - INTERVAL '1 day';
  END IF;

  -- Construir filtro de filiais
  IF p_filiais IS NULL OR p_filiais = 'all' OR p_filiais = '' THEN
    v_filiais_condition := '1=1';  -- Sem filtro
  ELSE
    v_filiais_condition := 'filial_id IN (' || p_filiais || ')';
  END IF;
```

### **CTEs Principais**

#### **1. vendas_diarias**
```sql
vendas_diarias AS (
  SELECT
    filial_id,
    data_venda,
    valor_total,
    custo_total,
    total_lucro,
    quantidade_total,
    total_transacoes
  FROM %I.vendas_diarias_por_filial  -- Schema dinâmico
  WHERE %s  -- v_filiais_condition
)
```

#### **2. descontos**
```sql
descontos AS (
  SELECT
    filial_id,
    data_desconto,
    valor_desconto,      -- Abatimento na receita
    desconto_custo       -- Abatimento no custo
  FROM %I.descontos_venda
  WHERE %s  -- v_filiais_condition
)
```

#### **3. entradas (NOVO)**
```sql
entradas AS (
  SELECT
    filial_id,
    data_entrada,
    valor_total
  FROM %I.entradas
  WHERE transacao IN ('P', 'V')  -- P=Pedido, V=Venda (compras)
    AND %s  -- v_filiais_condition
)
```

#### **4. periodo_atual**
```sql
periodo_atual AS (
  SELECT
    v.filial_id,
    SUM(v.valor_total) as valor_total_bruto,
    SUM(v.custo_total) as custo_total_bruto,
    SUM(v.total_lucro) as total_lucro_bruto,
    SUM(v.quantidade_total) as quantidade_total,
    SUM(v.total_transacoes)::NUMERIC as total_transacoes
  FROM vendas_diarias v
  WHERE v.data_venda BETWEEN $1 AND $2  -- p_data_inicio, p_data_fim
  GROUP BY v.filial_id
)
```

#### **5. descontos_periodo_atual**
```sql
descontos_periodo_atual AS (
  SELECT
    d.filial_id,
    COALESCE(SUM(d.valor_desconto), 0) as total_desconto_venda,
    COALESCE(SUM(d.desconto_custo), 0) as total_desconto_custo
  FROM descontos d
  WHERE d.data_desconto BETWEEN $1 AND $2
  GROUP BY d.filial_id
)
```

#### **6. entradas_periodo_atual (NOVO)**
```sql
entradas_periodo_atual AS (
  SELECT
    e.filial_id,
    COALESCE(SUM(e.valor_total), 0) as total_entradas
  FROM entradas e
  WHERE e.data_entrada BETWEEN $1 AND $2
  GROUP BY e.filial_id
)
```

#### **7. periodo_atual_com_desconto**
```sql
periodo_atual_com_desconto AS (
  SELECT
    pa.filial_id,
    -- Valor líquido (bruto - descontos)
    pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as valor_total,
    pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as custo_total,
    (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
    (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as total_lucro,
    pa.quantidade_total,
    pa.total_transacoes,
    -- Ticket Médio
    CASE
      WHEN pa.total_transacoes > 0
      THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) / pa.total_transacoes
      ELSE 0
    END as ticket_medio,
    -- Margem Bruta %
    CASE
      WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
      THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
             (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
            (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) * 100)
      ELSE 0
    END as margem_lucro
  FROM periodo_atual pa
  LEFT JOIN descontos_periodo_atual dpa ON pa.filial_id = dpa.filial_id
)
```

#### **8-13. Período Anterior (Mesma Lógica)**
```sql
-- periodo_anterior
-- descontos_periodo_anterior
-- entradas_periodo_anterior
-- periodo_anterior_com_desconto
-- (Estrutura idêntica, mas filtra BETWEEN $3 AND $4)
```

#### **14. todas_filiais (UNION)**
```sql
todas_filiais AS (
  -- Garantir que filiais apareçam mesmo se só tiverem dados em um período
  SELECT DISTINCT filial_id FROM periodo_atual_com_desconto
  UNION
  SELECT DISTINCT filial_id FROM periodo_anterior_com_desconto
  UNION
  SELECT DISTINCT filial_id FROM entradas_periodo_atual
  UNION
  SELECT DISTINCT filial_id FROM entradas_periodo_anterior
)
```

### **SELECT Final (JOIN de Tudo)**

```sql
SELECT
  tf.filial_id as filial_id,
  
  -- ========== PERÍODO ATUAL ==========
  COALESCE(pc.valor_total, 0)::NUMERIC(15,2) as valor_total,
  COALESCE(pc.custo_total, 0)::NUMERIC(15,2) as custo_total,
  COALESCE(pc.total_lucro, 0)::NUMERIC(15,2) as total_lucro,
  COALESCE(pc.quantidade_total, 0)::NUMERIC(15,2) as quantidade_total,
  COALESCE(pc.total_transacoes, 0)::NUMERIC as total_transacoes,
  COALESCE(pc.ticket_medio, 0)::NUMERIC(15,2) as ticket_medio,
  COALESCE(pc.margem_lucro, 0)::NUMERIC(10,2) as margem_lucro,
  
  -- ========== PERÍODO ANTERIOR ==========
  COALESCE(pa.pa_valor_total, 0)::NUMERIC(15,2) as pa_valor_total,
  COALESCE(pa.pa_custo_total, 0)::NUMERIC(15,2) as pa_custo_total,
  COALESCE(pa.pa_total_lucro, 0)::NUMERIC(15,2) as pa_total_lucro,
  COALESCE(pa.pa_total_transacoes, 0)::NUMERIC as pa_total_transacoes,
  COALESCE(pa.pa_ticket_medio, 0)::NUMERIC(15,2) as pa_ticket_medio,
  COALESCE(pa.pa_margem_lucro, 0)::NUMERIC(10,2) as pa_margem_lucro,
  
  -- ========== DELTAS (VARIAÇÕES) ==========
  -- Receita
  (COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0))::NUMERIC(15,2) 
    as delta_valor,
  CASE
    WHEN COALESCE(pa.pa_valor_total, 0) > 0
    THEN LEAST(
      ((COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0)) 
       / pa.pa_valor_total * 100),
      99999999.99  -- Proteção contra overflow
    )::NUMERIC(10,2)
    ELSE 0
  END as delta_valor_percent,
  
  -- Custo
  (COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0))::NUMERIC(15,2) 
    as delta_custo,
  CASE
    WHEN COALESCE(pa.pa_custo_total, 0) > 0
    THEN LEAST(
      ((COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0)) 
       / pa.pa_custo_total * 100),
      99999999.99
    )::NUMERIC(10,2)
    ELSE 0
  END as delta_custo_percent,
  
  -- Lucro
  (COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0))::NUMERIC(15,2) 
    as delta_lucro,
  CASE
    WHEN COALESCE(pa.pa_total_lucro, 0) > 0
    THEN LEAST(
      ((COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0)) 
       / pa.pa_total_lucro * 100),
      99999999.99
    )::NUMERIC(10,2)
    ELSE 0
  END as delta_lucro_percent,
  
  -- Margem (diferença em pontos percentuais)
  (COALESCE(pc.margem_lucro, 0) - COALESCE(pa.pa_margem_lucro, 0))::NUMERIC(10,2) 
    as delta_margem,
  
  -- ========== ENTRADAS (COMPRAS) ==========
  COALESCE(epa.total_entradas, 0)::NUMERIC(15,2) as total_entradas,
  COALESCE(epan.pa_total_entradas, 0)::NUMERIC(15,2) as pa_total_entradas,
  (COALESCE(epa.total_entradas, 0) - COALESCE(epan.pa_total_entradas, 0))::NUMERIC(15,2) 
    as delta_entradas,
  CASE
    WHEN COALESCE(epan.pa_total_entradas, 0) > 0
    THEN LEAST(
      ((COALESCE(epa.total_entradas, 0) - COALESCE(epan.pa_total_entradas, 0)) 
       / epan.pa_total_entradas * 100),
      99999999.99
    )::NUMERIC(10,2)
    ELSE 0
  END as delta_entradas_percent
  
FROM todas_filiais tf
LEFT JOIN periodo_atual_com_desconto pc ON tf.filial_id = pc.filial_id
LEFT JOIN periodo_anterior_com_desconto pa ON tf.filial_id = pa.filial_id
LEFT JOIN entradas_periodo_atual epa ON tf.filial_id = epa.filial_id
LEFT JOIN entradas_periodo_anterior epan ON tf.filial_id = epan.filial_id

WHERE COALESCE(pc.valor_total, 0) > 0 OR COALESCE(epa.total_entradas, 0) > 0
ORDER BY COALESCE(pc.valor_total, 0) DESC NULLS LAST
```

### **Parâmetros de Execução**

```sql
USING 
  p_data_inicio,      -- $1
  p_data_fim,         -- $2
  v_pa_data_inicio,   -- $3
  v_pa_data_fim       -- $4
```

---

## 🔄 Fluxo de Dados no Frontend

### **1. Busca de Dados (Paralela)**

```typescript
// API Route 1: Vendas PDV por filial
const vendasPorFilial = useSWR<VendaPorFilial[]>(
  `/api/dashboard/vendas-por-filial?schema=${schema}&data_inicio=${...}&data_fim=${...}&filiais=${...}&filter_type=${...}`,
  fetcher,
  { refreshInterval: 0 }
)

// API Route 2: Faturamento (NF-e) por filial
const faturamentoPorFilial = useSWR<FaturamentoPorFilial[]>(
  `/api/faturamento?schema=${schema}&...&por_filial=true`,
  fetcher,
  { refreshInterval: 0 }
)
```

### **2. Transformação de Dados**

```typescript
// Criar Map para lookup O(1)
const faturamentoPorFilialMap = useMemo(() => {
  const map = new Map<number, FaturamentoPorFilial>()
  if (Array.isArray(faturamentoPorFilialData)) {
    faturamentoPorFilialData.forEach(f => map.set(f.filial_id, f))
  }
  return map
}, [faturamentoPorFilialData])
```

### **3. Ordenação Client-Side**

```typescript
const sortedVendasPorFilial = useMemo(() => {
  if (!vendasPorFilial || !Array.isArray(vendasPorFilial) || vendasPorFilial.length === 0) 
    return []
  
  return [...vendasPorFilial].sort((a, b) => {
    let aValue: number
    let bValue: number
    
    switch (sortColumn) {
      case 'filial_id':
        aValue = a.filial_id
        bValue = b.filial_id
        break
      case 'valor_total':
        aValue = a.valor_total
        bValue = b.valor_total
        break
      case 'ticket_medio':
        aValue = a.ticket_medio
        bValue = b.ticket_medio
        break
      case 'custo_total':
        aValue = a.custo_total
        bValue = b.custo_total
        break
      case 'total_lucro':
        aValue = a.total_lucro
        bValue = b.total_lucro
        break
      case 'margem_lucro':
        aValue = a.margem_lucro
        bValue = b.margem_lucro
        break
      case 'total_entradas':
        aValue = a.total_entradas || 0
        bValue = b.total_entradas || 0
        break
      default:
        return 0
    }
    
    return sortDirection === 'asc' 
      ? aValue - bValue 
      : bValue - aValue
  })
}, [vendasPorFilial, sortColumn, sortDirection])
```

---

## 📊 Colunas da Tabela

| # | Coluna | Origem Dados | Cálculo Runtime | Ordenável | Observações |
|---|--------|--------------|-----------------|-----------|-------------|
| 1 | **Filial** | `filial_id` | - | ✅ | ID numérico da filial |
| 2 | **Receita Bruta** | PDV + Faturamento | `switch(salesType)` | ✅ | Consolidação dinâmica |
| 3 | **Ticket Médio** | `ticket_medio` (PDV) | - | ✅ | Apenas PDV (transações) |
| 4 | **Custo** | PDV + Faturamento | `switch(salesType)` | ✅ | CMV consolidado |
| 5 | **Lucro Bruto** | PDV + Faturamento | `switch(salesType)` | ✅ | Receita - Custo |
| 6 | **Margem Bruta** | Calculado | `(lucro/receita)*100` | ✅ | % dinâmica |
| 7 | **Total Entradas** | `total_entradas` (PDV) | - | ✅ | Compras (transacao P/V) |

---

## 🎨 Renderização de Células

Cada célula exibe **3 linhas** com informação contextual:

```typescript
<TableCell className="text-right">
  {/* 1. Valor Atual (destaque) */}
  <div className="font-medium">
    {formatCurrency(receitaFilial)}
  </div>
  
  {/* 2. Variação % com ícone direcional + cor semântica */}
  <div className={`flex items-center justify-end gap-1 text-xs ${
    deltaReceitaFilial >= 0 ? 'text-green-600' : 'text-red-600'
  }`}>
    {deltaReceitaFilial >= 0 ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )}
    <span>
      {deltaReceitaFilial >= 0 ? '+' : ''}{deltaReceitaFilial.toFixed(2)}%
    </span>
  </div>
  
  {/* 3. Valor do Período Anterior (referência) */}
  <div className="text-xs text-muted-foreground">
    {formatCurrency(venda.pa_valor_total)}
  </div>
</TableCell>
```

### **Lógica Invertida para Custo**

```typescript
// Custo: aumento é ruim (vermelho), diminuição é bom (verde)
<div className={`flex items-center justify-end gap-1 text-xs ${
  deltaCustoFilial >= 0 ? 'text-red-600' : 'text-green-600'
}`}>
  {deltaCustoFilial >= 0 ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  )}
  <span>
    {deltaCustoFilial >= 0 ? '+' : ''}{deltaCustoFilial.toFixed(2)}%
  </span>
</div>
```

---

## 🧮 Lógica de Consolidação

### **Tipos de Venda (Switch)**

```typescript
// Filtro de tipo de venda controlado por <Select>
type SalesType = 'complete' | 'pdv' | 'faturamento'

// Para cada filial, calcular valores baseados no filtro
switch (salesType) {
  case 'pdv':
    receitaFilial = venda.valor_total
    lucroFilial = venda.total_lucro
    custoFilial = venda.custo_total
    break
    
  case 'faturamento':
    const fatFilial = faturamentoPorFilialMap.get(venda.filial_id)
    receitaFilial = fatFilial?.receita_faturamento || 0
    lucroFilial = fatFilial?.lucro_bruto_faturamento || 0
    custoFilial = fatFilial?.cmv_faturamento || 0
    break
    
  case 'complete': // PADRÃO
    const fatFilial = faturamentoPorFilialMap.get(venda.filial_id)
    receitaFilial = venda.valor_total + (fatFilial?.receita_faturamento || 0)
    lucroFilial = venda.total_lucro + (fatFilial?.lucro_bruto_faturamento || 0)
    custoFilial = venda.custo_total + (fatFilial?.cmv_faturamento || 0)
    break
}
```

### **Cálculos Derivados**

```typescript
// Margem baseada nos valores consolidados
const margemFilial = receitaFilial > 0 
  ? (lucroFilial / receitaFilial) * 100 
  : 0

// Variações baseadas no PA (apenas PDV, pois faturamento PA não disponível)
const deltaReceitaFilial = venda.pa_valor_total > 0
  ? ((receitaFilial - venda.pa_valor_total) / venda.pa_valor_total) * 100
  : 0

const deltaLucroFilial = venda.pa_total_lucro > 0
  ? ((lucroFilial - venda.pa_total_lucro) / venda.pa_total_lucro) * 100
  : 0

const deltaCustoFilial = venda.pa_custo_total > 0
  ? ((custoFilial - venda.pa_custo_total) / venda.pa_custo_total) * 100
  : 0

// Delta da margem em pontos percentuais
const deltaMargemFilial = margemFilial - venda.pa_margem_lucro
```

---

## 🔐 Autorização de Filiais

### **API Route: Branch Authorization**

```typescript
// /api/dashboard/vendas-por-filial/route.ts
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

let finalFiliais: string

if (authorizedBranches === null) {
  // Sem restrições (admin/superadmin)
  finalFiliais = requestedFiliais
  
} else if (requestedFiliais === 'all') {
  // User tem restrições e pediu 'all' → usar apenas suas filiais
  finalFiliais = authorizedBranches.join(',')
  
} else {
  // User pediu filiais específicas → filtrar pelas autorizadas
  const requestedArray = requestedFiliais.split(',').map(f => f.trim())
  const allowedFiliais = requestedArray.filter(f => authorizedBranches.includes(f))
  
  // Se nenhuma das pedidas é autorizada, usar todas as autorizadas
  finalFiliais = allowedFiliais.length > 0
    ? allowedFiliais.join(',')
    : authorizedBranches.join(',')
}

// Passar para RPC
const { data } = await directSupabase.rpc('get_vendas_por_filial', {
  p_schema: schema,
  p_data_inicio: dataInicio,
  p_data_fim: dataFim,
  p_filiais: finalFiliais,  // '1,3,7' ou 'all'
  p_filter_type: filterType
})
```

---

## 📥 Linha de Totalização

### **Renderização Condicional**

```typescript
{sortedVendasPorFilial && sortedVendasPorFilial.length > 0 && (() => {
  // 1. Somar PDV de todas as filiais
  const totaisPdv = sortedVendasPorFilial.reduce((acc, venda) => ({
    valor_total: acc.valor_total + venda.valor_total,
    pa_valor_total: acc.pa_valor_total + venda.pa_valor_total,
    total_transacoes: acc.total_transacoes + venda.total_transacoes,
    pa_total_transacoes: acc.pa_total_transacoes + venda.pa_total_transacoes,
    custo_total: acc.custo_total + venda.custo_total,
    pa_custo_total: acc.pa_custo_total + venda.pa_custo_total,
    total_lucro: acc.total_lucro + venda.total_lucro,
    pa_total_lucro: acc.pa_total_lucro + venda.pa_total_lucro,
    total_entradas: acc.total_entradas + (venda.total_entradas || 0),
    pa_total_entradas: acc.pa_total_entradas + (venda.pa_total_entradas || 0),
  }), {
    valor_total: 0,
    pa_valor_total: 0,
    total_transacoes: 0,
    pa_total_transacoes: 0,
    custo_total: 0,
    pa_custo_total: 0,
    total_lucro: 0,
    pa_total_lucro: 0,
    total_entradas: 0,
    pa_total_entradas: 0,
  })
  
  // 2. Somar faturamento total (das APIs)
  const totalFaturamentoReceita = faturamentoData?.receita_faturamento || 0
  const totalFaturamentoLucro = faturamentoData?.lucro_bruto_faturamento || 0
  const totalFaturamentoCmv = faturamentoData?.cmv_faturamento || 0
  
  // 3. Aplicar switch(salesType) IGUAL às linhas individuais
  let receitaTotal: number
  let lucroTotal: number
  let custoTotal: number
  
  switch (salesType) {
    case 'pdv':
      receitaTotal = totaisPdv.valor_total
      lucroTotal = totaisPdv.total_lucro
      custoTotal = totaisPdv.custo_total
      break
    case 'faturamento':
      receitaTotal = totalFaturamentoReceita
      lucroTotal = totalFaturamentoLucro
      custoTotal = totalFaturamentoCmv
      break
    case 'complete':
    default:
      receitaTotal = totaisPdv.valor_total + totalFaturamentoReceita
      lucroTotal = totaisPdv.total_lucro + totalFaturamentoLucro
      custoTotal = totaisPdv.custo_total + totalFaturamentoCmv
      break
  }
  
  // 4. Calcular métricas derivadas
  const ticket_medio_total = totaisPdv.total_transacoes > 0 
    ? totaisPdv.valor_total / totaisPdv.total_transacoes 
    : 0
    
  const pa_ticket_medio_total = totaisPdv.pa_total_transacoes > 0 
    ? totaisPdv.pa_valor_total / totaisPdv.pa_total_transacoes 
    : 0
    
  const margem_total = receitaTotal > 0 
    ? (lucroTotal / receitaTotal) * 100 
    : 0
    
  const pa_margem_total = totaisPdv.pa_valor_total > 0 
    ? (totaisPdv.pa_total_lucro / totaisPdv.pa_valor_total) * 100 
    : 0
  
  // 5. Calcular variações
  const delta_receita_percent = totaisPdv.pa_valor_total > 0 
    ? ((receitaTotal - totaisPdv.pa_valor_total) / totaisPdv.pa_valor_total) * 100 
    : 0
    
  const delta_custo_percent = totaisPdv.pa_custo_total > 0 
    ? ((custoTotal - totaisPdv.pa_custo_total) / totaisPdv.pa_custo_total) * 100 
    : 0
    
  const delta_lucro_percent = totaisPdv.pa_total_lucro > 0 
    ? ((lucroTotal - totaisPdv.pa_total_lucro) / totaisPdv.pa_total_lucro) * 100 
    : 0
    
  const delta_margem_total = margem_total - pa_margem_total
  
  const delta_entradas_percent = totaisPdv.pa_total_entradas > 0
    ? ((totaisPdv.total_entradas - totaisPdv.pa_total_entradas) / totaisPdv.pa_total_entradas) * 100
    : 0
  
  // 6. Renderizar linha especial
  return (
    <TableRow className="bg-muted/30 font-bold border-t-2">
      <TableCell>=</TableCell>  {/* Símbolo de total */}
      
      {/* Receita Bruta */}
      <TableCell className="text-right">
        <div>{formatCurrency(receitaTotal)}</div>
        <div className={delta_receita_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
          {delta_receita_percent >= 0 ? <ArrowUp /> : <ArrowDown />}
          {delta_receita_percent >= 0 ? '+' : ''}{delta_receita_percent.toFixed(2)}%
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(totaisPdv.pa_valor_total)}
        </div>
      </TableCell>
      
      {/* ... outras colunas ... */}
    </TableRow>
  )
})()}
```

---

## 📄 Exportação PDF

### **Implementação Completa**

```typescript
const handleExportVendasPorFilialPdf = async () => {
  if (!sortedVendasPorFilial || sortedVendasPorFilial.length === 0) {
    alert('Não há dados para exportar.')
    return
  }
  
  setIsExportingPdf(true)
  
  try {
    // Dynamic imports (evita bundle bloat)
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default
    
    // Criar documento PDF A4 Landscape
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    
    // Definir cores
    const greenColor: [number, number, number] = [22, 163, 74]  // text-green-600
    const redColor: [number, number, number] = [220, 38, 38]    // text-red-600
    const headerBg: [number, number, number] = [241, 245, 249]  // slate-100
    const totalRowBg: [number, number, number] = [226, 232, 240] // slate-200
    
    // Cabeçalho do PDF
    const tenantName = currentTenant?.name || 'Empresa'
    const periodoLabel = `${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}`
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Vendas por Filial', 14, 15)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Empresa: ${tenantName}`, 14, 22)
    doc.text(`Período: ${periodoLabel}`, 14, 27)
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 32)
    
    // Cabeçalho da tabela
    const tableHead = [[
      'Filial',
      'Receita Bruta', 'Δ%',
      'Ticket Médio', 'Δ%',
      'Custo', 'Δ%',
      'Lucro Bruto', 'Δ%',
      'Margem', 'Δ%',
      'Entradas', 'Δ%'
    ]]
    
    // Função auxiliar para formatar variação
    const formatDelta = (value: number, suffix: string = '%') => {
      const sign = value >= 0 ? '+' : ''
      return `${sign}${value.toFixed(2)}${suffix}`
    }
    
    // Preparar linhas de dados
    const tableBody: string[][] = sortedVendasPorFilial.map((venda) => {
      const delta_ticket_percent = venda.pa_ticket_medio > 0
        ? ((venda.ticket_medio - venda.pa_ticket_medio) / venda.pa_ticket_medio) * 100
        : 0
      
      return [
        venda.filial_id.toString(),
        formatCurrency(venda.valor_total),
        formatDelta(venda.delta_valor_percent),
        formatCurrency(venda.ticket_medio),
        formatDelta(delta_ticket_percent),
        formatCurrency(venda.custo_total),
        formatDelta(venda.delta_custo_percent),
        formatCurrency(venda.total_lucro),
        formatDelta(venda.delta_lucro_percent),
        `${venda.margem_lucro.toFixed(2)}%`,
        formatDelta(venda.delta_margem, 'p.p.'),
        formatCurrency(venda.total_entradas || 0),
        formatDelta(venda.delta_entradas_percent || 0)
      ]
    })
    
    // Calcular linha de total (mesma lógica do frontend)
    const totais = sortedVendasPorFilial.reduce((acc, venda) => ({
      valor_total: acc.valor_total + venda.valor_total,
      pa_valor_total: acc.pa_valor_total + venda.pa_valor_total,
      total_transacoes: acc.total_transacoes + venda.total_transacoes,
      pa_total_transacoes: acc.pa_total_transacoes + venda.pa_total_transacoes,
      custo_total: acc.custo_total + venda.custo_total,
      pa_custo_total: acc.pa_custo_total + venda.pa_custo_total,
      total_lucro: acc.total_lucro + venda.total_lucro,
      pa_total_lucro: acc.pa_total_lucro + venda.pa_total_lucro,
      total_entradas: acc.total_entradas + (venda.total_entradas || 0),
      pa_total_entradas: acc.pa_total_entradas + (venda.pa_total_entradas || 0),
    }), {
      valor_total: 0,
      pa_valor_total: 0,
      total_transacoes: 0,
      pa_total_transacoes: 0,
      custo_total: 0,
      pa_custo_total: 0,
      total_lucro: 0,
      pa_total_lucro: 0,
      total_entradas: 0,
      pa_total_entradas: 0,
    })
    
    const ticket_medio_total = totais.total_transacoes > 0 
      ? totais.valor_total / totais.total_transacoes 
      : 0
    const pa_ticket_medio_total = totais.pa_total_transacoes > 0 
      ? totais.pa_valor_total / totais.pa_total_transacoes 
      : 0
    const delta_ticket_total = pa_ticket_medio_total > 0 
      ? ((ticket_medio_total - pa_ticket_medio_total) / pa_ticket_medio_total) * 100 
      : 0
      
    const margem_total = totais.valor_total > 0 
      ? (totais.total_lucro / totais.valor_total) * 100 
      : 0
    const pa_margem_total = totais.pa_valor_total > 0 
      ? (totais.pa_total_lucro / totais.pa_valor_total) * 100 
      : 0
      
    const delta_valor_total = totais.pa_valor_total > 0 
      ? ((totais.valor_total - totais.pa_valor_total) / totais.pa_valor_total) * 100 
      : 0
    const delta_custo_total = totais.pa_custo_total > 0 
      ? ((totais.custo_total - totais.pa_custo_total) / totais.pa_custo_total) * 100 
      : 0
    const delta_lucro_total = totais.pa_total_lucro > 0 
      ? ((totais.total_lucro - totais.pa_total_lucro) / totais.pa_total_lucro) * 100 
      : 0
    const delta_margem_total = margem_total - pa_margem_total
    const delta_entradas_total = totais.pa_total_entradas > 0 
      ? ((totais.total_entradas - totais.pa_total_entradas) / totais.pa_total_entradas) * 100 
      : 0
    
    // Adicionar linha de total
    const totalRow = [
      'TOTAL',
      formatCurrency(totais.valor_total),
      formatDelta(delta_valor_total),
      formatCurrency(ticket_medio_total),
      formatDelta(delta_ticket_total),
      formatCurrency(totais.custo_total),
      formatDelta(delta_custo_total),
      formatCurrency(totais.total_lucro),
      formatDelta(delta_lucro_total),
      `${margem_total.toFixed(2)}%`,
      formatDelta(delta_margem_total, 'p.p.'),
      formatCurrency(totais.total_entradas),
      formatDelta(delta_entradas_total)
    ]
    tableBody.push(totalRow)
    
    // Índices das colunas de variação (Δ%)
    const deltaColumns = [2, 4, 6, 8, 10, 12]
    const custoColumn = 6  // Coluna de custo tem lógica invertida
    
    // Gerar tabela
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 38,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'right',
        valign: 'middle',
      },
      headStyles: {
        fillColor: headerBg,
        textColor: [30, 41, 59], // slate-800
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' }, // Filial
      },
      didParseCell: (data) => {
        // Aplicar cor nas colunas de variação
        if (data.section === 'body' && deltaColumns.includes(data.column.index)) {
          const cellText = data.cell.text[0] || ''
          const value = parseFloat(cellText.replace(/[+%p.]/g, '').replace(',', '.'))
          
          if (!isNaN(value)) {
            // Para custo, lógica invertida (aumento é ruim)
            if (data.column.index === custoColumn) {
              data.cell.styles.textColor = value >= 0 ? redColor : greenColor
            } else {
              data.cell.styles.textColor = value >= 0 ? greenColor : redColor
            }
          }
        }
        
        // Estilo da linha de total (última linha)
        if (data.section === 'body' && data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = totalRowBg
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    
    // Salvar PDF
    const tenantSlug = tenantName.toLowerCase().replace(/\s+/g, '-')
    const periodoSlug = `${format(dataInicio, 'yyyyMMdd')}-${format(dataFim, 'yyyyMMdd')}`
    const nomeArquivo = `vendas-por-filial-${tenantSlug}-${periodoSlug}.pdf`
    doc.save(nomeArquivo)
    
  } catch (err) {
    console.error('[PDF Export] Erro ao exportar PDF:', err)
    alert(`Erro ao exportar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
  } finally {
    setIsExportingPdf(false)
  }
}
```

### **Características**

- ✅ **Formato:** A4 Landscape (297x210mm)
- ✅ **Dynamic Import:** Reduz bundle inicial ~200KB
- ✅ **Cores dinâmicas:** Verde (positivo) / Vermelho (negativo)
- ✅ **Lógica invertida:** Coluna Custo (↑ vermelho, ↓ verde)
- ✅ **Linha de total:** Background cinza + negrito
- ✅ **Proteção contra overflow:** `LEAST(..., 99999999.99)`
- ✅ **Nome arquivo:** `vendas-por-filial-{tenant}-{YYYYMMDD-YYYYMMDD}.pdf`

---

## 🎛️ Estados e Controles

### **Estados de Ordenação**

```typescript
// Tipos possíveis de ordenação
type SortColumn = 'filial_id' | 'valor_total' | 'ticket_medio' | 'custo_total' | 'total_lucro' | 'margem_lucro' | 'total_entradas'
type SortDirection = 'asc' | 'desc'

// Estados
const [sortColumn, setSortColumn] = useState<SortColumn>('filial_id')
const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
const [isExportingPdf, setIsExportingPdf] = useState(false)
```

### **Handler de Ordenação**

```typescript
const handleSort = (column: SortColumn) => {
  if (sortColumn === column) {
    // Se já está ordenando por esta coluna, inverte a direção
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    // Se é uma nova coluna, ordena ascendente
    setSortColumn(column)
    setSortDirection('asc')
  }
}
```

### **Componente de Ícone**

```typescript
const SortIcon = ({ column }: { column: SortColumn }) => {
  if (sortColumn !== column) {
    // Não está ordenado por esta coluna
    return <ArrowUpDown className="ml-1 h-3 w-3 inline" />
  }
  
  // Mostra direção atual
  return sortDirection === 'asc'
    ? <ChevronUp className="ml-1 h-3 w-3 inline" />
    : <ChevronDown className="ml-1 h-3 w-3 inline" />
}

// Uso no TableHead
<Button
  variant="ghost"
  size="sm"
  className="h-8 px-2 hover:bg-accent"
  onClick={() => handleSort('valor_total')}
>
  Receita Bruta
  <SortIcon column="valor_total" />
</Button>
```

---

## ⚡ Otimizações

### **Performance**

1. **useMemo para sorting:** 
   - Evita re-ordenação desnecessária
   - Dependências: `[vendasPorFilial, sortColumn, sortDirection]`

2. **Map para faturamento:** 
   - Lookup O(1) vs O(n)
   - `faturamentoPorFilialMap.get(filial_id)`

3. **SWR caching:** 
   - Dedupe automático de requests
   - `refreshInterval: 0` (sem polling)

4. **Dynamic import PDF:** 
   - Reduz bundle inicial ~200KB
   - Carregado apenas ao exportar

5. **SECURITY DEFINER RPC:**
   - Executa com privilégios elevados
   - Bypass RLS para performance

### **Índices PostgreSQL Recomendados**

```sql
-- vendas_diarias_por_filial
CREATE INDEX idx_vendas_diarias_filial_data 
  ON {schema}.vendas_diarias_por_filial(filial_id, data_venda);

-- descontos_venda
CREATE INDEX idx_descontos_filial_data 
  ON {schema}.descontos_venda(filial_id, data_desconto);

-- entradas (para compras)
CREATE INDEX idx_entradas_filial_data_transacao 
  ON {schema}.entradas(filial_id, data_entrada, transacao);
```

---

## 🎯 Casos de Uso

| Cenário | Comportamento |
|---------|---------------|
| **Admin visualiza todas** | `authorizedBranches = null` → RPC recebe `p_filiais = 'all'` |
| **Manager filiais 1,3** | `authorizedBranches = ['1','3']` → RPC recebe `p_filiais = '1,3'` |
| **User pede filial não autorizada** | Filtrado pela API → retorna apenas autorizadas |
| **Filtro: Complete** | Soma PDV + Faturamento na renderização |
| **Filtro: PDV** | Ignora dados de faturamento (usa apenas RPC) |
| **Filtro: Faturamento** | Usa apenas API `/api/faturamento` |
| **Ordenar por Lucro** | Re-ordena array client-side (useMemo) |
| **Exportar PDF** | Usa `sortedVendasPorFilial` + cores + total |
| **Sem vendas mas tem entradas** | Filial aparece com receita = 0, entradas > 0 |
| **Filter Type: Month** | PA = mesmo mês do ano anterior |
| **Filter Type: Year** | PA = mesmo período do ano anterior |
| **Filter Type: Custom** | PA = período equivalente anterior (deslocamento) |

---

## 📋 Checklist de Manutenção

Ao modificar a tabela "Vendas por Filial":

### **Backend (PostgreSQL)**
- [ ] Atualizar função RPC `get_vendas_por_filial()`
- [ ] Adicionar novas colunas no `RETURNS TABLE`
- [ ] Modificar CTEs conforme necessário
- [ ] Criar migration SQL (`supabase/migrations/`)
- [ ] Testar com diferentes `p_filter_type`
- [ ] Validar proteção contra overflow (`LEAST(...)`)
- [ ] Atualizar índices se necessário

### **Frontend (TypeScript)**
- [ ] Atualizar interface `VendaPorFilial`
- [ ] Modificar `SortColumn` type (se nova coluna ordenável)
- [ ] Ajustar `sortedVendasPorFilial` useMemo
- [ ] Atualizar renderização de `<TableHead>`
- [ ] Modificar renderização de `<TableRow>`
- [ ] Atualizar cálculo de totalização
- [ ] Ajustar lógica de `switch(salesType)` se necessário

### **Exportação PDF**
- [ ] Adicionar coluna em `tableHead`
- [ ] Mapear dados em `tableBody`
- [ ] Atualizar cálculo da linha de total
- [ ] Ajustar `deltaColumns` array (se coluna de variação)
- [ ] Testar cores condicionais

### **Testes**
- [ ] Testar com `salesType` = 'pdv' | 'faturamento' | 'complete'
- [ ] Validar cores de variação (verde/vermelho)
- [ ] Testar ordenação em todas as colunas
- [ ] Verificar linha de total (valores corretos)
- [ ] Exportar PDF e validar layout
- [ ] Testar com diferentes roles (admin/manager/user)
- [ ] Validar autorização de filiais
- [ ] Testar com datas de período anterior corretas

---

## 🔍 Troubleshooting

### **Problema: Valores diferentes entre tabela e cards**

**Causa:** Filtro de tipo de venda (`salesType`) não está sendo aplicado corretamente.

**Solução:** Verificar se a lógica `switch(salesType)` está consistente em:
- Cards superiores (`consolidatedTotals`)
- Linhas individuais da tabela
- Linha de totalização

### **Problema: Ordenação não funciona**

**Causa:** `sortColumn` não está no `switch` do `useMemo`.

**Solução:** Adicionar case no `sortedVendasPorFilial`:
```typescript
case 'nova_coluna':
  aValue = a.nova_coluna
  bValue = b.nova_coluna
  break
```

### **Problema: Linha de total com valores errados**

**Causa:** Esqueceu de aplicar `switch(salesType)` na totalização.

**Solução:** Garantir que a totalização use a mesma lógica das linhas:
```typescript
switch (salesType) {
  case 'pdv': ...
  case 'faturamento': ...
  case 'complete': ...
}
```

### **Problema: PDF com cores erradas**

**Causa:** Índice de coluna incorreto em `deltaColumns`.

**Solução:** Contar colunas manualmente (começa do 0):
```typescript
const deltaColumns = [2, 4, 6, 8, 10, 12]  // Índices de Δ%
const custoColumn = 6  // Índice da coluna de custo
```

### **Problema: Período anterior incorreto**

**Causa:** `p_filter_type` não está sendo passado corretamente.

**Solução:** Verificar na API Route:
```typescript
const filterType = searchParams.get('filter_type') || 'month'
// ...
p_filter_type: filterType
```

### **Problema: Entradas não aparecem**

**Causa:** Filtro `transacao IN ('P', 'V')` não retorna dados.

**Solução:** Verificar valores na tabela `{schema}.entradas`:
```sql
SELECT DISTINCT transacao FROM {schema}.entradas LIMIT 20;
```

---

## 📚 Referências

- **Migration:** `supabase/migrations/20251218_add_entradas_to_vendas_por_filial.sql`
- **API Route:** `/api/dashboard/vendas-por-filial/route.ts`
- **Componente:** `/app/(dashboard)/dashboard/page.tsx`
- **Interface:** Linhas 86-112
- **Ordenação:** Linhas 1005-1049
- **Exportação PDF:** Linhas 813-1003
- **Documentação:** `.github/copilot-instructions.md`

---

**Última Revisão:** 2026-01-10  
**Versão da Documentação:** 2.0  
**Status:** ✅ Atualizado com arquitetura real

