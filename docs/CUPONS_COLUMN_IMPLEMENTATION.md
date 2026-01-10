# 🎫 Implementação da Coluna "Cupons" - Dashboard 360

**Data de Criação:** 2026-01-10  
**Versão:** 1.0  
**Status:** 📋 Planejamento

---

## 🎯 Objetivo

Adicionar uma nova coluna **"Cupons"** na tabela "Vendas por Filial" que representa o **número de cupons fiscais distintos** (transações únicas) no período filtrado.

### **Diferença entre Cupons e Transações**

| Métrica | Origem | Descrição |
|---------|--------|-----------|
| **Total Transações** | `vendas_diarias_por_filial` | Agregado diário (pode ter duplicatas/consolidações) |
| **Cupons** | `vendas_hoje` | Cupons distintos (PK: filial_id + cupom) |

---

## �� Fonte de Dados

### **Tabela: `{schema}.vendas_hoje`**

```sql
CREATE TABLE {schema}.vendas_hoje (
  filial_id INTEGER NOT NULL,
  cupom INTEGER NOT NULL,
  caixa INTEGER NULL,
  horario TIME WITHOUT TIME ZONE NULL,
  cancelada BOOLEAN NULL DEFAULT false,
  valor_total NUMERIC(15, 2) NULL DEFAULT 0,
  data_extracao DATE NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  
  CONSTRAINT vendas_hoje_pkey PRIMARY KEY (filial_id, cupom)
);

-- Índices existentes
CREATE INDEX idx_vendas_hoje_filial ON {schema}.vendas_hoje (filial_id);
CREATE INDEX idx_vendas_hoje_caixa ON {schema}.vendas_hoje (caixa);
CREATE INDEX idx_vendas_hoje_cancelada ON {schema}.vendas_hoje (cancelada);
```

### **Índice Adicional Recomendado**

```sql
-- Para otimizar queries de período
CREATE INDEX idx_vendas_hoje_data_extracao 
  ON {schema}.vendas_hoje (data_extracao, filial_id);
```

---

## 🏗️ Arquitetura da Implementação

### **Camadas Afetadas**

```
┌─────────────────────────────────────────────────────────┐
│ 1. DATABASE (PostgreSQL)                                │
│    • Modificar RPC: get_vendas_por_filial()             │
│    • Adicionar CTE: cupons                              │
│    • Retornar: total_cupons, pa_total_cupons, deltas    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. API ROUTE (Next.js)                                  │
│    • /api/dashboard/vendas-por-filial/route.ts          │
│    • Sem alterações (apenas passa dados do RPC)         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. FRONTEND (React/TypeScript)                          │
│    • Interface: VendaPorFilial (adicionar 4 campos)     │
│    • SortColumn: adicionar 'total_cupons'               │
│    • Tabela: renderizar nova coluna                     │
│    • Totalização: somar cupons de todas filiais         │
│    • Exportação PDF: adicionar coluna                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Passo 1: Modificar Função RPC

### **Arquivo:** `supabase/migrations/20260110_add_cupons_to_vendas_por_filial.sql`

```sql
-- =====================================================
-- Migration: Add Cupons to get_vendas_por_filial
-- Created: 2026-01-10
-- Description: Adiciona coluna de Total de Cupons (cupons distintos) por filial
--              Usa tabela vendas_hoje com COUNT(DISTINCT cupom)
--              Filtra apenas vendas não canceladas (cancelada = false)
-- =====================================================

-- Drop função existente
DROP FUNCTION IF EXISTS public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT);

-- Criar nova versão com Total de Cupons
CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all',
  p_filter_type TEXT DEFAULT 'year'
)
RETURNS TABLE (
  filial_id BIGINT,
  valor_total NUMERIC(15,2),
  custo_total NUMERIC(15,2),
  total_lucro NUMERIC(15,2),
  quantidade_total NUMERIC(15,2),
  total_transacoes NUMERIC,
  ticket_medio NUMERIC(15,2),
  margem_lucro NUMERIC(10,2),
  pa_valor_total NUMERIC(15,2),
  pa_custo_total NUMERIC(15,2),
  pa_total_lucro NUMERIC(15,2),
  pa_total_transacoes NUMERIC,
  pa_ticket_medio NUMERIC(15,2),
  pa_margem_lucro NUMERIC(10,2),
  delta_valor NUMERIC(15,2),
  delta_valor_percent NUMERIC(10,2),
  delta_custo NUMERIC(15,2),
  delta_custo_percent NUMERIC(10,2),
  delta_lucro NUMERIC(15,2),
  delta_lucro_percent NUMERIC(10,2),
  delta_margem NUMERIC(10,2),
  total_entradas NUMERIC(15,2),
  pa_total_entradas NUMERIC(15,2),
  delta_entradas NUMERIC(15,2),
  delta_entradas_percent NUMERIC(10,2),
  -- NOVOS CAMPOS: Total de Cupons
  total_cupons BIGINT,
  pa_total_cupons BIGINT,
  delta_cupons BIGINT,
  delta_cupons_percent NUMERIC(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pa_data_inicio DATE;
  v_pa_data_fim DATE;
  v_filiais_condition TEXT;
BEGIN
  -- Calcular período anterior baseado no tipo de filtro
  IF p_filter_type = 'month' THEN
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  ELSIF p_filter_type = 'year' THEN
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  ELSE
    v_pa_data_inicio := p_data_inicio - (p_data_fim - p_data_inicio + 1);
    v_pa_data_fim := p_data_inicio - INTERVAL '1 day';
  END IF;

  -- Construir condição de filiais
  IF p_filiais IS NULL OR p_filiais = 'all' OR p_filiais = '' THEN
    v_filiais_condition := '1=1';
  ELSE
    v_filiais_condition := 'filial_id IN (' || p_filiais || ')';
  END IF;

  RETURN QUERY EXECUTE format('
    WITH vendas_diarias AS (
      SELECT
        filial_id,
        data_venda,
        valor_total,
        custo_total,
        total_lucro,
        quantidade_total,
        total_transacoes
      FROM %I.vendas_diarias_por_filial
      WHERE %s
    ),
    descontos AS (
      SELECT
        filial_id,
        data_desconto,
        valor_desconto,
        desconto_custo
      FROM %I.descontos_venda
      WHERE %s
    ),
    entradas AS (
      SELECT
        filial_id,
        data_entrada,
        valor_total
      FROM %I.entradas
      WHERE transacao IN (''P'', ''V'')
        AND %s
    ),
    -- NOVO: Cupons (cupons distintos não cancelados)
    cupons AS (
      SELECT
        filial_id,
        data_extracao,
        cupom
      FROM %I.vendas_hoje
      WHERE cancelada = false  -- Apenas cupons não cancelados
        AND %s
    ),
    -- Período Atual
    periodo_atual AS (
      SELECT
        v.filial_id,
        SUM(v.valor_total) as valor_total_bruto,
        SUM(v.custo_total) as custo_total_bruto,
        SUM(v.total_lucro) as total_lucro_bruto,
        SUM(v.quantidade_total) as quantidade_total,
        SUM(v.total_transacoes)::NUMERIC as total_transacoes
      FROM vendas_diarias v
      WHERE v.data_venda BETWEEN $1 AND $2
      GROUP BY v.filial_id
    ),
    descontos_periodo_atual AS (
      SELECT
        d.filial_id,
        COALESCE(SUM(d.valor_desconto), 0) as total_desconto_venda,
        COALESCE(SUM(d.desconto_custo), 0) as total_desconto_custo
      FROM descontos d
      WHERE d.data_desconto BETWEEN $1 AND $2
      GROUP BY d.filial_id
    ),
    entradas_periodo_atual AS (
      SELECT
        e.filial_id,
        COALESCE(SUM(e.valor_total), 0) as total_entradas
      FROM entradas e
      WHERE e.data_entrada BETWEEN $1 AND $2
      GROUP BY e.filial_id
    ),
    -- NOVO: Cupons período atual
    cupons_periodo_atual AS (
      SELECT
        c.filial_id,
        COUNT(DISTINCT c.cupom) as total_cupons
      FROM cupons c
      WHERE c.data_extracao BETWEEN $1 AND $2
      GROUP BY c.filial_id
    ),
    periodo_atual_com_desconto AS (
      SELECT
        pa.filial_id,
        pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as valor_total,
        pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as custo_total,
        (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
        (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as total_lucro,
        pa.quantidade_total,
        pa.total_transacoes,
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) / pa.total_transacoes
          ELSE 0
        END as ticket_medio,
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
          THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
                 (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
                (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) * 100)
          ELSE 0
        END as margem_lucro
      FROM periodo_atual pa
      LEFT JOIN descontos_periodo_atual dpa ON pa.filial_id = dpa.filial_id
    ),
    -- Período Anterior
    periodo_anterior AS (
      SELECT
        v.filial_id,
        SUM(v.valor_total) as valor_total_bruto,
        SUM(v.custo_total) as custo_total_bruto,
        SUM(v.total_lucro) as total_lucro_bruto,
        SUM(v.total_transacoes)::NUMERIC as total_transacoes
      FROM vendas_diarias v
      WHERE v.data_venda BETWEEN $3 AND $4
      GROUP BY v.filial_id
    ),
    descontos_periodo_anterior AS (
      SELECT
        d.filial_id,
        COALESCE(SUM(d.valor_desconto), 0) as total_desconto_venda,
        COALESCE(SUM(d.desconto_custo), 0) as total_desconto_custo
      FROM descontos d
      WHERE d.data_desconto BETWEEN $3 AND $4
      GROUP BY d.filial_id
    ),
    entradas_periodo_anterior AS (
      SELECT
        e.filial_id,
        COALESCE(SUM(e.valor_total), 0) as pa_total_entradas
      FROM entradas e
      WHERE e.data_entrada BETWEEN $3 AND $4
      GROUP BY e.filial_id
    ),
    -- NOVO: Cupons período anterior
    cupons_periodo_anterior AS (
      SELECT
        c.filial_id,
        COUNT(DISTINCT c.cupom) as pa_total_cupons
      FROM cupons c
      WHERE c.data_extracao BETWEEN $3 AND $4
      GROUP BY c.filial_id
    ),
    periodo_anterior_com_desconto AS (
      SELECT
        pa.filial_id,
        pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as pa_valor_total,
        pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as pa_custo_total,
        (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
        (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as pa_total_lucro,
        pa.total_transacoes as pa_total_transacoes,
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) / pa.total_transacoes
          ELSE 0
        END as pa_ticket_medio,
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
          THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
                 (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
                (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) * 100)
          ELSE 0
        END as pa_margem_lucro
      FROM periodo_anterior pa
      LEFT JOIN descontos_periodo_anterior dpa ON pa.filial_id = dpa.filial_id
    ),
    -- Todas as filiais (UNION de todas as fontes)
    todas_filiais AS (
      SELECT DISTINCT filial_id FROM periodo_atual_com_desconto
      UNION
      SELECT DISTINCT filial_id FROM periodo_anterior_com_desconto
      UNION
      SELECT DISTINCT filial_id FROM entradas_periodo_atual
      UNION
      SELECT DISTINCT filial_id FROM entradas_periodo_anterior
      UNION
      SELECT DISTINCT filial_id FROM cupons_periodo_atual
      UNION
      SELECT DISTINCT filial_id FROM cupons_periodo_anterior
    )
    SELECT
      tf.filial_id as filial_id,
      COALESCE(pc.valor_total, 0)::NUMERIC(15,2) as valor_total,
      COALESCE(pc.custo_total, 0)::NUMERIC(15,2) as custo_total,
      COALESCE(pc.total_lucro, 0)::NUMERIC(15,2) as total_lucro,
      COALESCE(pc.quantidade_total, 0)::NUMERIC(15,2) as quantidade_total,
      COALESCE(pc.total_transacoes, 0)::NUMERIC as total_transacoes,
      COALESCE(pc.ticket_medio, 0)::NUMERIC(15,2) as ticket_medio,
      COALESCE(pc.margem_lucro, 0)::NUMERIC(10,2) as margem_lucro,
      COALESCE(pa.pa_valor_total, 0)::NUMERIC(15,2) as pa_valor_total,
      COALESCE(pa.pa_custo_total, 0)::NUMERIC(15,2) as pa_custo_total,
      COALESCE(pa.pa_total_lucro, 0)::NUMERIC(15,2) as pa_total_lucro,
      COALESCE(pa.pa_total_transacoes, 0)::NUMERIC as pa_total_transacoes,
      COALESCE(pa.pa_ticket_medio, 0)::NUMERIC(15,2) as pa_ticket_medio,
      COALESCE(pa.pa_margem_lucro, 0)::NUMERIC(10,2) as pa_margem_lucro,
      -- Deltas
      (COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0))::NUMERIC(15,2) as delta_valor,
      CASE
        WHEN COALESCE(pa.pa_valor_total, 0) > 0
        THEN LEAST(((COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0)) / pa.pa_valor_total * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_valor_percent,
      (COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0))::NUMERIC(15,2) as delta_custo,
      CASE
        WHEN COALESCE(pa.pa_custo_total, 0) > 0
        THEN LEAST(((COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0)) / pa.pa_custo_total * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_custo_percent,
      (COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0))::NUMERIC(15,2) as delta_lucro,
      CASE
        WHEN COALESCE(pa.pa_total_lucro, 0) > 0
        THEN LEAST(((COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0)) / pa.pa_total_lucro * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_lucro_percent,
      (COALESCE(pc.margem_lucro, 0) - COALESCE(pa.pa_margem_lucro, 0))::NUMERIC(10,2) as delta_margem,
      -- Entradas
      COALESCE(epa.total_entradas, 0)::NUMERIC(15,2) as total_entradas,
      COALESCE(epan.pa_total_entradas, 0)::NUMERIC(15,2) as pa_total_entradas,
      (COALESCE(epa.total_entradas, 0) - COALESCE(epan.pa_total_entradas, 0))::NUMERIC(15,2) as delta_entradas,
      CASE
        WHEN COALESCE(epan.pa_total_entradas, 0) > 0
        THEN LEAST(((COALESCE(epa.total_entradas, 0) - COALESCE(epan.pa_total_entradas, 0)) / epan.pa_total_entradas * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_entradas_percent,
      -- NOVO: Cupons
      COALESCE(cpa.total_cupons, 0)::BIGINT as total_cupons,
      COALESCE(cpan.pa_total_cupons, 0)::BIGINT as pa_total_cupons,
      (COALESCE(cpa.total_cupons, 0) - COALESCE(cpan.pa_total_cupons, 0))::BIGINT as delta_cupons,
      CASE
        WHEN COALESCE(cpan.pa_total_cupons, 0) > 0
        THEN LEAST(((COALESCE(cpa.total_cupons, 0) - COALESCE(cpan.pa_total_cupons, 0))::NUMERIC / cpan.pa_total_cupons * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_cupons_percent
    FROM todas_filiais tf
    LEFT JOIN periodo_atual_com_desconto pc ON tf.filial_id = pc.filial_id
    LEFT JOIN periodo_anterior_com_desconto pa ON tf.filial_id = pa.filial_id
    LEFT JOIN entradas_periodo_atual epa ON tf.filial_id = epa.filial_id
    LEFT JOIN entradas_periodo_anterior epan ON tf.filial_id = epan.filial_id
    LEFT JOIN cupons_periodo_atual cpa ON tf.filial_id = cpa.filial_id
    LEFT JOIN cupons_periodo_anterior cpan ON tf.filial_id = cpan.filial_id
    WHERE COALESCE(pc.valor_total, 0) > 0 
       OR COALESCE(epa.total_entradas, 0) > 0
       OR COALESCE(cpa.total_cupons, 0) > 0
    ORDER BY COALESCE(pc.valor_total, 0) DESC NULLS LAST
  ',
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition
  )
  USING p_data_inicio, p_data_fim, v_pa_data_inicio, v_pa_data_fim;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_vendas_por_filial IS 
  'Retorna vendas por filial com dados de PDV, entradas, cupons e comparação com período anterior';
```

---

## 📝 Passo 2: Atualizar Interface TypeScript

### **Arquivo:** `/src/app/(dashboard)/dashboard/page.tsx`

```typescript
interface VendaPorFilial {
  filial_id: number
  valor_total: number
  custo_total: number
  total_lucro: number
  quantidade_total: number
  total_transacoes: number
  ticket_medio: number
  margem_lucro: number
  pa_valor_total: number
  pa_custo_total: number
  pa_total_lucro: number
  pa_total_transacoes: number
  pa_ticket_medio: number
  pa_margem_lucro: number
  delta_valor: number
  delta_valor_percent: number
  delta_custo: number
  delta_custo_percent: number
  delta_lucro: number
  delta_lucro_percent: number
  delta_margem: number
  total_entradas: number
  pa_total_entradas: number
  delta_entradas: number
  delta_entradas_percent: number
  // NOVOS CAMPOS: Cupons
  total_cupons: number
  pa_total_cupons: number
  delta_cupons: number
  delta_cupons_percent: number
}

// Adicionar 'total_cupons' ao tipo de ordenação
type SortColumn = 
  | 'filial_id' 
  | 'valor_total' 
  | 'ticket_medio' 
  | 'custo_total' 
  | 'total_lucro' 
  | 'margem_lucro' 
  | 'total_entradas'
  | 'total_cupons'  // NOVO
```

---

## 📝 Passo 3: Adicionar Coluna na Tabela

### **Localização:** Mesma linha onde está "Total Entradas"

```typescript
// No useMemo de sortedVendasPorFilial, adicionar case
const sortedVendasPorFilial = useMemo(() => {
  // ... código existente
  
  switch (sortColumn) {
    // ... cases existentes
    case 'total_entradas':
      aValue = a.total_entradas || 0
      bValue = b.total_entradas || 0
      break
    case 'total_cupons':  // NOVO
      aValue = a.total_cupons || 0
      bValue = b.total_cupons || 0
      break
    default:
      return 0
  }
  
  // ... resto do código
}, [vendasPorFilial, sortColumn, sortDirection])
```

### **TableHeader (Cabeçalho)**

```typescript
<TableHead className="text-right">
  <Button
    variant="ghost"
    size="sm"
    className="h-8 px-2 hover:bg-accent ml-auto"
    onClick={() => handleSort('total_cupons')}
  >
    Cupons
    <SortIcon column="total_cupons" />
  </Button>
</TableHead>
```

### **TableBody (Dados)**

```typescript
{/* Cupons */}
<TableCell className="text-right">
  <div className="font-medium">
    {venda.total_cupons?.toLocaleString('pt-BR') || '0'}
  </div>
  <div className={`flex items-center justify-end gap-1 text-xs ${
    (venda.delta_cupons_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
  }`}>
    {(venda.delta_cupons_percent || 0) >= 0 ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )}
    <span>
      {(venda.delta_cupons_percent || 0) >= 0 ? '+' : ''}
      {(venda.delta_cupons_percent || 0).toFixed(2)}%
    </span>
  </div>
  <div className="text-xs text-muted-foreground">
    {venda.pa_total_cupons?.toLocaleString('pt-BR') || '0'}
  </div>
</TableCell>
```

---

## 📝 Passo 4: Atualizar Linha de Totalização

### **Cálculo do Total de Cupons**

```typescript
{sortedVendasPorFilial && sortedVendasPorFilial.length > 0 && (() => {
  // ... código existente de totais
  
  // Somar cupons de todas as filiais
  const totaisCupons = sortedVendasPorFilial.reduce((acc, venda) => ({
    total_cupons: acc.total_cupons + (venda.total_cupons || 0),
    pa_total_cupons: acc.pa_total_cupons + (venda.pa_total_cupons || 0),
  }), {
    total_cupons: 0,
    pa_total_cupons: 0,
  })
  
  // Calcular delta
  const delta_cupons = totaisCupons.total_cupons - totaisCupons.pa_total_cupons
  const delta_cupons_percent = totaisCupons.pa_total_cupons > 0
    ? ((totaisCupons.total_cupons - totaisCupons.pa_total_cupons) / totaisCupons.pa_total_cupons) * 100
    : 0
  
  return (
    <TableRow className="bg-muted/30 font-bold border-t-2">
      {/* ... outras colunas ... */}
      
      {/* Cupons */}
      <TableCell className="text-right">
        <div>
          {totaisCupons.total_cupons.toLocaleString('pt-BR')}
        </div>
        <div className={`flex items-center justify-end gap-1 text-xs ${
          delta_cupons_percent >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {delta_cupons_percent >= 0 ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          <span>
            {delta_cupons_percent >= 0 ? '+' : ''}{delta_cupons_percent.toFixed(2)}%
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {totaisCupons.pa_total_cupons.toLocaleString('pt-BR')}
        </div>
      </TableCell>
    </TableRow>
  )
})()}
```

---

## 📝 Passo 5: Atualizar Exportação PDF

### **TableHead**

```typescript
const tableHead = [[
  'Filial',
  'Receita Bruta', 'Δ%',
  'Ticket Médio', 'Δ%',
  'Custo', 'Δ%',
  'Lucro Bruto', 'Δ%',
  'Margem', 'Δ%',
  'Entradas', 'Δ%',
  'Cupons', 'Δ%'  // NOVO
]]
```

### **TableBody (Dados)**

```typescript
const tableBody: string[][] = sortedVendasPorFilial.map((venda) => {
  // ... código existente
  
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
    formatDelta(venda.delta_entradas_percent || 0),
    (venda.total_cupons || 0).toLocaleString('pt-BR'),  // NOVO
    formatDelta(venda.delta_cupons_percent || 0)        // NOVO
  ]
})
```

### **Total Row**

```typescript
// Calcular totais de cupons (mesma lógica da totalização)
const totaisCupons = sortedVendasPorFilial.reduce((acc, venda) => ({
  total_cupons: acc.total_cupons + (venda.total_cupons || 0),
  pa_total_cupons: acc.pa_total_cupons + (venda.pa_total_cupons || 0),
}), { total_cupons: 0, pa_total_cupons: 0 })

const delta_cupons_percent = totaisCupons.pa_total_cupons > 0
  ? ((totaisCupons.total_cupons - totaisCupons.pa_total_cupons) / totaisCupons.pa_total_cupons) * 100
  : 0

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
  formatDelta(delta_entradas_total),
  totaisCupons.total_cupons.toLocaleString('pt-BR'),  // NOVO
  formatDelta(delta_cupons_percent)                     // NOVO
]
```

### **Atualizar deltaColumns**

```typescript
// Índices das colunas de variação (Δ%)
const deltaColumns = [2, 4, 6, 8, 10, 12, 14]  // +14 (cupons)
const custoColumn = 6  // Mantém igual
```

---

## 🎯 Resultado Esperado

### **Tabela "Vendas por Filial"**

| Filial | Receita | Δ% | Ticket | Δ% | Custo | Δ% | Lucro | Δ% | Margem | Δ% | Entradas | Δ% | **Cupons** | **Δ%** |
|--------|---------|-------|--------|-----|-------|-----|-------|-----|--------|-----|----------|-----|-----------|--------|
| 1 | R$ 150k | +5% | R$ 85 | +2% | R$ 90k | +3% | R$ 60k | +8% | 40% | +2p.p. | R$ 50k | +10% | **1.750** | **+5%** |
| 3 | R$ 200k | +12% | R$ 95 | +5% | R$ 120k | +8% | R$ 80k | +18% | 40% | +4p.p. | R$ 70k | +15% | **2.100** | **+12%** |
| 7 | R$ 120k | -3% | R$ 75 | -1% | R$ 72k | -2% | R$ 48k | -4% | 40% | -1p.p. | R$ 40k | +5% | **1.600** | **-2%** |
| **=** | **R$ 470k** | **+6%** | **R$ 85** | **+2%** | **R$ 282k** | **+5%** | **R$ 188k** | **+10%** | **40%** | **+2p.p.** | **R$ 160k** | **+11%** | **5.450** | **+6%** |

### **Características da Coluna "Cupons"**

✅ **Formato:** Número inteiro com separador de milhares (ex: 1.750)  
✅ **Ordenável:** Clique no cabeçalho para ordenar  
✅ **3 linhas por célula:**
   - Linha 1: Cupons atuais (destaque)
   - Linha 2: Variação % com seta (verde/vermelho)
   - Linha 3: Cupons PA (referência)  
✅ **Totalização:** Soma de todas as filiais  
✅ **Exportação PDF:** Incluída no relatório  

---

## 📋 Checklist de Implementação

### **Backend**
- [ ] Criar migration `20260110_add_cupons_to_vendas_por_filial.sql`
- [ ] Adicionar CTE `cupons` filtrando `cancelada = false`
- [ ] Adicionar CTE `cupons_periodo_atual`
- [ ] Adicionar CTE `cupons_periodo_anterior`
- [ ] Adicionar UNION em `todas_filiais`
- [ ] Adicionar LEFT JOIN no SELECT final
- [ ] Adicionar 4 colunas no RETURNS TABLE
- [ ] Atualizar WHERE final com `OR COALESCE(cpa.total_cupons, 0) > 0`
- [ ] Criar índice `idx_vendas_hoje_data_extracao`
- [ ] Testar migration em ambiente de desenvolvimento

### **Frontend**
- [ ] Atualizar interface `VendaPorFilial` (4 campos)
- [ ] Adicionar `'total_cupons'` ao type `SortColumn`
- [ ] Adicionar case no `sortedVendasPorFilial` useMemo
- [ ] Adicionar `<TableHead>` com botão de ordenação
- [ ] Adicionar `<TableCell>` no map de vendas
- [ ] Atualizar cálculo da linha de totalização
- [ ] Adicionar colunas no PDF (tableHead + tableBody)
- [ ] Atualizar `deltaColumns` array para `[2, 4, 6, 8, 10, 12, 14]`
- [ ] Testar ordenação por Cupons
- [ ] Testar exportação PDF

### **Testes**
- [ ] Verificar contagem de cupons distintos
- [ ] Validar filtro `cancelada = false`
- [ ] Testar com período sem cupons (retornar 0)
- [ ] Testar variação % positiva e negativa
- [ ] Validar totalização (soma de todas filiais)
- [ ] Testar ordenação ascendente/descendente
- [ ] Verificar cores (verde para +, vermelho para -)
- [ ] Exportar PDF e validar formatação

---

## 🔍 Pontos de Atenção

### **1. Campo `data_extracao` vs `data_venda`**

**Questão:** A tabela `vendas_hoje` usa `data_extracao` (data de importação) ao invés de `data_venda`.

**Impacto:**
- Se os cupons forem extraídos com atraso, pode haver discrepância
- Cupons de 10/01 extraídos em 11/01 aparecerão em 11/01

**Solução Recomendada:**
```sql
-- Opção 1: Usar data_extracao (mais rápido, mas pode ter desalinhamento)
WHERE c.data_extracao BETWEEN $1 AND $2

-- Opção 2: Adicionar coluna data_venda à tabela vendas_hoje
ALTER TABLE {schema}.vendas_hoje ADD COLUMN data_venda DATE;
-- Depois usar: WHERE c.data_venda BETWEEN $1 AND $2
```

### **2. Cupons Cancelados**

**Filtro:** `WHERE cancelada = false`

**Validação:** Garantir que cupons cancelados NÃO sejam contados.

### **3. Performance com Grandes Volumes**

**Cenário:** Schema com milhões de cupons.

**Otimização:**
```sql
-- Índice composto recomendado
CREATE INDEX idx_vendas_hoje_data_cancelada_filial 
  ON {schema}.vendas_hoje (data_extracao, cancelada, filial_id)
  WHERE cancelada = false;
```

### **4. Diferença entre Cupons e Transações**

| Métrica | Valor Exemplo | Origem |
|---------|---------------|--------|
| Total Transações | 2.000 | `vendas_diarias_por_filial` (agregado) |
| Total Cupons | 1.750 | `vendas_hoje` (cupons únicos) |

**Por que diferente?**
- `total_transacoes` pode ser somado de múltiplos dias (duplicatas)
- `total_cupons` é sempre COUNT DISTINCT (único)

---

## 📊 Query de Teste Manual

### **Testar CTE de Cupons**

```sql
-- Cupons por filial no período
SELECT
  filial_id,
  COUNT(DISTINCT cupom) as total_cupons,
  COUNT(*) as total_registros,
  SUM(CASE WHEN cancelada THEN 1 ELSE 0 END) as cupons_cancelados
FROM okilao.vendas_hoje
WHERE data_extracao BETWEEN '2025-12-01' AND '2025-12-31'
  AND filial_id IN (1, 3, 7)
GROUP BY filial_id
ORDER BY filial_id;
```

### **Testar Função RPC Completa**

```sql
SELECT * FROM get_vendas_por_filial(
  'okilao',                    -- schema
  '2025-12-01'::DATE,          -- data_inicio
  '2025-12-31'::DATE,          -- data_fim
  '1,3,7',                     -- filiais
  'month'                      -- filter_type
)
ORDER BY total_cupons DESC;
```

---

## 📚 Referências

- **Tabela:** `{schema}.vendas_hoje`
- **Migration:** `supabase/migrations/20260110_add_cupons_to_vendas_por_filial.sql`
- **Componente:** `/app/(dashboard)/dashboard/page.tsx`
- **Documentação Base:** `docs/VENDAS_POR_FILIAL_ARCHITECTURE.md`

---

**Status:** 📋 Pronto para implementação  
**Próximo Passo:** Criar migration SQL e testar em dev

