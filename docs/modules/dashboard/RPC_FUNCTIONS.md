# Funções RPC - Dashboard Principal

**Versão**: 1.0.0  
**Última Atualização**: 2025-01-14  
**Módulo**: Dashboard Principal

---

## Índice

1. [get_dashboard_data](#1-get_dashboard_data)
2. [get_vendas_por_filial](#2-get_vendas_por_filial)
3. [get_sales_by_month_chart](#3-get_sales_by_month_chart)
4. [get_expenses_by_month_chart](#4-get_expenses_by_month_chart)
5. [get_lucro_by_month_chart](#5-get_lucro_by_month_chart)
6. [Índices Recomendados](#índices-recomendados)

---

## 1. get_dashboard_data

### Descrição

Função principal que retorna todos os indicadores KPI do dashboard com comparações temporais automáticas (PAM, PAA, YTD).

### Assinatura SQL

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
  ticket_medio NUMERIC,
  margem_lucro NUMERIC,
  pa_vendas NUMERIC,
  pa_lucro NUMERIC,
  pa_ticket_medio NUMERIC,
  pa_margem_lucro NUMERIC,
  variacao_vendas_mes NUMERIC,
  variacao_lucro_mes NUMERIC,
  variacao_ticket_mes NUMERIC,
  variacao_margem_mes NUMERIC,
  variacao_vendas_ano NUMERIC,
  variacao_lucro_ano NUMERIC,
  variacao_ticket_ano NUMERIC,
  variacao_margem_ano NUMERIC,
  ytd_vendas NUMERIC,
  ytd_vendas_ano_anterior NUMERIC,
  ytd_variacao_percent NUMERIC,
  grafico_vendas JSONB,
  reserved TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `schema_name` | TEXT | Sim | Nome do schema do tenant | `'okilao'` |
| `p_data_inicio` | DATE | Sim | Data inicial do período | `'2025-01-01'` |
| `p_data_fim` | DATE | Sim | Data final do período | `'2025-01-31'` |
| `p_filiais_ids` | TEXT[] | Não | Array de IDs de filiais ou NULL para todas | `ARRAY['1','3','5']` ou `NULL` |

### Retorno

Retorna **uma única linha** com 21 campos:

#### Período Atual (4 campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `total_vendas` | NUMERIC | Soma de `valor_total` - descontos |
| `total_lucro` | NUMERIC | Soma de `total_lucro` - descontos |
| `ticket_medio` | NUMERIC | `total_vendas / total_transacoes` |
| `margem_lucro` | NUMERIC | `(total_lucro / total_vendas) × 100` |

#### PAM - Período Anterior Mesmo (4 campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pa_vendas` | NUMERIC | Vendas do mês anterior |
| `pa_lucro` | NUMERIC | Lucro do mês anterior |
| `pa_ticket_medio` | NUMERIC | Ticket médio do mês anterior |
| `pa_margem_lucro` | NUMERIC | Margem do mês anterior |

#### Variações MoM - Month over Month (4 campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `variacao_vendas_mes` | NUMERIC | `((atual - pam) / pam) × 100` |
| `variacao_lucro_mes` | NUMERIC | `((atual - pam) / pam) × 100` |
| `variacao_ticket_mes` | NUMERIC | `((atual - pam) / pam) × 100` |
| `variacao_margem_mes` | NUMERIC | `margem_atual - margem_pam` (pontos percentuais) |

#### Variações YoY - Year over Year (4 campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `variacao_vendas_ano` | NUMERIC | `((atual - paa) / paa) × 100` |
| `variacao_lucro_ano` | NUMERIC | `((atual - paa) / paa) × 100` |
| `variacao_ticket_ano` | NUMERIC | `((atual - paa) / paa) × 100` |
| `variacao_margem_ano` | NUMERIC | `margem_atual - margem_paa` (pontos percentuais) |

#### YTD - Year to Date (3 campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `ytd_vendas` | NUMERIC | Vendas acumuladas do início do ano até `p_data_fim` |
| `ytd_vendas_ano_anterior` | NUMERIC | Vendas acumuladas do ano anterior (mesmo período) |
| `ytd_variacao_percent` | NUMERIC | `((ytd_atual - ytd_anterior) / ytd_anterior) × 100` |

#### Gráfico (1 campo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `grafico_vendas` | JSONB | Array de objetos `{mes, ano_atual, ano_anterior}` |

#### Reservado (1 campo)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `reserved` | TEXT | Campo reservado (sempre `NULL`) |

### Tabelas Utilizadas

- `{schema}.vendas_diarias_por_filial` - Dados agregados de vendas
- `{schema}.descontos_venda` (opcional) - Descontos aplicados

### Cálculos Internos

#### 1. Datas de Comparação

```sql
-- PAM: Período Anterior Mesmo (mês anterior)
v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;

-- PAA: Período Anterior do Ano (ano anterior)
v_data_inicio_paa := (p_data_inicio - INTERVAL '1 year')::DATE;
v_data_fim_paa := (p_data_fim - INTERVAL '1 year')::DATE;

-- YTD: Year to Date
v_data_inicio_ytd := DATE_TRUNC('year', p_data_inicio)::DATE;
v_data_fim_ytd := p_data_fim;
v_data_inicio_ytd_ano_anterior := (v_data_inicio_ytd - INTERVAL '1 year')::DATE;
v_data_fim_ytd_ano_anterior := (v_data_fim_ytd - INTERVAL '1 year')::DATE;
```

#### 2. Dados do Período Atual

```sql
SELECT
  COALESCE(SUM(valor_total), 0),
  COALESCE(SUM(total_lucro), 0),
  COALESCE(SUM(total_transacoes), 0)
FROM {schema}.vendas_diarias_por_filial
WHERE data_venda BETWEEN p_data_inicio AND p_data_fim
  AND (p_filiais_ids IS NULL OR filial_id = ANY(p_filiais_ids::INTEGER[]))
```

#### 3. Subtração de Descontos (se tabela existir)

```sql
-- Verifica se tabela existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = schema_name AND table_name = 'descontos_venda'
)

-- Se existir, subtrai descontos
IF v_table_exists THEN
  SELECT COALESCE(SUM(valor_desconto), 0)
  FROM {schema}.descontos_venda
  WHERE data_desconto BETWEEN p_data_inicio AND p_data_fim
    AND (p_filiais_ids IS NULL OR filial_id = ANY(p_filiais_ids::INTEGER[]))
  
  v_total_vendas := v_total_vendas - v_descontos_periodo;
  v_total_lucro := v_total_lucro - v_descontos_periodo;
END IF
```

#### 4. Cálculo de Métricas

```sql
-- Ticket Médio
IF v_total_transacoes > 0 THEN
  v_ticket_medio := v_total_vendas / v_total_transacoes;
END IF;

-- Margem de Lucro
IF v_total_vendas > 0 THEN
  v_margem_lucro := (v_total_lucro / v_total_vendas) * 100;
END IF;
```

#### 5. Variações Percentuais

```sql
-- MoM (Month over Month)
IF v_pa_vendas > 0 THEN
  v_variacao_vendas_mes := ((v_total_vendas - v_pa_vendas) / v_pa_vendas) * 100;
END IF;

-- YoY (Year over Year)
IF v_paa_vendas > 0 THEN
  v_variacao_vendas_ano := ((v_total_vendas - v_paa_vendas) / v_paa_vendas) * 100;
END IF;

-- Margem (diferença em pontos percentuais)
v_variacao_margem_mes := v_margem_lucro - v_pa_margem_lucro;
v_variacao_margem_ano := v_margem_lucro - v_paa_margem_lucro;
```

#### 6. Geração do Gráfico

```sql
SELECT COALESCE(
  jsonb_agg(
    jsonb_build_object(
      'mes', TO_CHAR(data_venda, 'DD/MM'),
      'ano_atual', vendas_atual,
      'ano_anterior', vendas_anterior
    ) ORDER BY data_venda
  ),
  '[]'::JSONB
)
FROM (
  SELECT
    v1.data_venda,
    COALESCE(SUM(v1.valor_total), 0) as vendas_atual,
    COALESCE(SUM(v2.valor_total), 0) as vendas_anterior
  FROM {schema}.vendas_diarias_por_filial v1
  LEFT JOIN {schema}.vendas_diarias_por_filial v2
    ON v2.data_venda = (v1.data_venda - INTERVAL '1 year')::DATE
    AND (p_filiais_ids IS NULL OR v2.filial_id = ANY(p_filiais_ids::INTEGER[]))
  WHERE v1.data_venda BETWEEN p_data_inicio AND p_data_fim
    AND (p_filiais_ids IS NULL OR v1.filial_id = ANY(p_filiais_ids::INTEGER[]))
  GROUP BY v1.data_venda
) dados
```

### Exemplo de Uso

#### TypeScript (via Supabase)

```typescript
const { data, error } = await supabase.rpc('get_dashboard_data', {
  schema_name: 'okilao',
  p_data_inicio: '2025-01-01',
  p_data_fim: '2025-01-31',
  p_filiais_ids: ['1', '3', '5']  // ou null para todas
}).single()
```

#### SQL Direto

```sql
SELECT * FROM public.get_dashboard_data(
  'okilao',
  '2025-01-01'::DATE,
  '2025-01-31'::DATE,
  ARRAY['1', '3', '5']
);
```

### Exemplo de Resposta

```json
{
  "total_vendas": 352847.89,
  "total_lucro": 105854.37,
  "ticket_medio": 176.42,
  "margem_lucro": 30.01,
  "pa_vendas": 328456.12,
  "pa_lucro": 98536.84,
  "pa_ticket_medio": 172.87,
  "pa_margem_lucro": 30.00,
  "variacao_vendas_mes": 7.43,
  "variacao_lucro_mes": 7.42,
  "variacao_ticket_mes": 2.05,
  "variacao_margem_mes": 0.01,
  "variacao_vendas_ano": 15.67,
  "variacao_lucro_ano": 14.89,
  "variacao_ticket_ano": 8.32,
  "variacao_margem_ano": -0.35,
  "ytd_vendas": 1058478.43,
  "ytd_vendas_ano_anterior": 915234.56,
  "ytd_variacao_percent": 15.65,
  "grafico_vendas": [
    {"mes": "01/01", "ano_atual": 10234.56, "ano_anterior": 9876.54},
    {"mes": "02/01", "ano_atual": 11456.78, "ano_anterior": 10234.56}
  ],
  "reserved": null
}
```

### Observações Importantes

1. **SECURITY DEFINER**: Função executa com permissões do criador (não do caller)
2. **Descontos Opcionais**: Se tabela `descontos_venda` não existir, continua sem erro
3. **Proteção contra Divisão por Zero**: Todos os cálculos verificam divisor > 0
4. **Filtro de Filiais**: `NULL` = todas as filiais, `ARRAY['1','3']` = filiais específicas
5. **Schema Dinâmico**: Usa `format()` para queries dinâmicas por schema

### Arquivo de Origem

- **Caminho**: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- **Linhas**: 121-478

---

## 2. get_vendas_por_filial

### Descrição

Retorna análise detalhada de vendas por filial com comparações automáticas com período anterior (PAM).

### Assinatura SQL

```sql
CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  filial_id INTEGER,
  valor_total NUMERIC,
  custo_total NUMERIC,
  total_lucro NUMERIC,
  quantidade_total INTEGER,
  total_transacoes INTEGER,
  ticket_medio NUMERIC,
  margem_lucro NUMERIC,
  pa_valor_total NUMERIC,
  pa_custo_total NUMERIC,
  pa_total_lucro NUMERIC,
  pa_total_transacoes INTEGER,
  pa_ticket_medio NUMERIC,
  pa_margem_lucro NUMERIC,
  delta_valor NUMERIC,
  delta_valor_percent NUMERIC,
  delta_custo NUMERIC,
  delta_custo_percent NUMERIC,
  delta_lucro NUMERIC,
  delta_lucro_percent NUMERIC,
  delta_margem NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `p_schema` | TEXT | Sim | Nome do schema do tenant | `'okilao'` |
| `p_data_inicio` | DATE | Sim | Data inicial do período | `'2025-01-01'` |
| `p_data_fim` | DATE | Sim | Data final do período | `'2025-01-31'` |
| `p_filiais` | TEXT | Não | IDs separados por vírgula ou 'all' | `'1,3,5'` ou `'all'` |

### Retorno

Retorna **múltiplas linhas**, uma para cada filial.

### Exemplo de Uso

#### TypeScript

```typescript
const { data, error } = await supabase.rpc('get_vendas_por_filial', {
  p_schema: 'okilao',
  p_data_inicio: '2025-01-01',
  p_data_fim: '2025-01-31',
  p_filiais: '1,3,5'  // ou 'all'
})
```

### Observações

**Status**: Função não encontrada no arquivo SQL fornecido, mas é chamada pela API.

**Ação Recomendada**: Criar migration com implementação desta função.

**Implementação Sugerida**: Agregar dados de `vendas_diarias_por_filial` por `filial_id` com cálculos de PAM e deltas.

---

## 3. get_sales_by_month_chart

### Descrição

Retorna dados de vendas mensais para o gráfico, comparando ano atual com ano anterior.

### Assinatura SQL (Esperada)

```sql
CREATE OR REPLACE FUNCTION public.get_sales_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  mes VARCHAR(3),
  total_vendas NUMERIC,
  total_vendas_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `schema_name` | TEXT | Sim | Nome do schema do tenant | `'okilao'` |
| `p_filiais` | TEXT | Não | IDs separados por vírgula ou 'all' | `'1,3,5'` ou `'all'` |

### Retorno

Retorna **12 linhas** (uma para cada mês do ano).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mes` | VARCHAR(3) | Mês abreviado ('JAN', 'FEV', etc.) |
| `total_vendas` | NUMERIC | Soma de vendas do mês atual |
| `total_vendas_ano_anterior` | NUMERIC | Soma de vendas do ano anterior (mesmo mês) |

### Exemplo de Uso

```typescript
const { data, error } = await supabase.rpc('get_sales_by_month_chart', {
  schema_name: 'okilao',
  p_filiais: 'all'
})
```

### Exemplo de Resposta

```json
[
  {"mes": "JAN", "total_vendas": 352847.89, "total_vendas_ano_anterior": 305123.45},
  {"mes": "FEV", "total_vendas": 378456.12, "total_vendas_ano_anterior": 318765.43},
  {"mes": "MAR", "total_vendas": 0, "total_vendas_ano_anterior": 0},
  ...
]
```

### Observações

**Status**: Função não encontrada no arquivo SQL fornecido.

**Ação Recomendada**: Criar migration com implementação desta função.

---

## 4. get_expenses_by_month_chart

### Descrição

Retorna dados de despesas mensais para o gráfico, comparando ano atual com ano anterior.

### Assinatura SQL (Esperada)

```sql
CREATE OR REPLACE FUNCTION public.get_expenses_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  mes VARCHAR(3),
  total_despesas NUMERIC,
  total_despesas_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
```

### Parâmetros

Similar a `get_sales_by_month_chart`.

### Retorno

Retorna **12 linhas** (uma para cada mês do ano).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mes` | VARCHAR(3) | Mês abreviado |
| `total_despesas` | NUMERIC | Soma de despesas do mês atual |
| `total_despesas_ano_anterior` | NUMERIC | Soma de despesas do ano anterior (mesmo mês) |

### Tabelas Utilizadas

- `{schema}.despesas` - Tabela de despesas

### Observações

**Status**: Função não encontrada no arquivo SQL fornecido.

**Ação Recomendada**: Criar migration com implementação desta função.

---

## 5. get_lucro_by_month_chart

### Descrição

Retorna dados de lucro mensal para o gráfico (usado como linha no chart).

### Assinatura SQL (Esperada)

```sql
CREATE OR REPLACE FUNCTION public.get_lucro_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  mes VARCHAR(3),
  total_lucro NUMERIC,
  total_lucro_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
```

### Parâmetros

Similar às funções anteriores de chart.

### Retorno

Retorna **12 linhas** (uma para cada mês do ano).

### Cálculo

```sql
total_lucro = total_vendas - total_custos - total_despesas
```

### Observações

**Status**: Função não encontrada no arquivo SQL fornecido.

**Ação Recomendada**: Criar migration com implementação desta função.

---

## Índices Recomendados

### vendas_diarias_por_filial

```sql
-- Índice composto para queries de período + filial
CREATE INDEX IF NOT EXISTS idx_vendas_diarias_data_filial 
  ON {schema}.vendas_diarias_por_filial(data_venda, filial_id);

-- Índice para queries apenas por filial
CREATE INDEX IF NOT EXISTS idx_vendas_diarias_filial 
  ON {schema}.vendas_diarias_por_filial(filial_id);

-- Índice apenas para data (usado em queries de todas as filiais)
CREATE INDEX IF NOT EXISTS idx_vendas_diarias_data 
  ON {schema}.vendas_diarias_por_filial(data_venda);
```

### descontos_venda

```sql
-- Índice composto para queries de período + filial
CREATE INDEX IF NOT EXISTS idx_descontos_data_filial 
  ON {schema}.descontos_venda(data_desconto, filial_id);

-- Índice apenas para data
CREATE INDEX IF NOT EXISTS idx_descontos_data 
  ON {schema}.descontos_venda(data_desconto);
```

### despesas

```sql
-- Índice composto para queries de período + filial
CREATE INDEX IF NOT EXISTS idx_despesas_data_filial 
  ON {schema}.despesas(data_despesa, filial_id);

-- Índice para tipo de despesa (usado em agregações)
CREATE INDEX IF NOT EXISTS idx_despesas_tipo 
  ON {schema}.despesas(id_tipo_despesa);
```

---

## Permissões

Todas as funções RPC devem ter permissões concedidas:

```sql
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(TEXT, DATE, DATE, TEXT[]) 
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT) 
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_sales_by_month_chart(TEXT, TEXT) 
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_expenses_by_month_chart(TEXT, TEXT) 
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_lucro_by_month_chart(TEXT, TEXT) 
  TO anon, authenticated, service_role;
```

---

## Troubleshooting

### Erro: "function does not exist"

**Causa**: Função RPC não foi criada ou nome/parâmetros estão errados.

**Solução**:
1. Verificar se migration foi executada
2. Verificar nome exato da função no Supabase Dashboard
3. Verificar tipos de parâmetros

### Erro: "relation does not exist"

**Causa**: Tabela referenciada não existe no schema.

**Solução**:
1. Verificar se schema está nos "Exposed schemas" do Supabase
2. Verificar se tabelas foram criadas no schema correto
3. Executar migrations no schema do tenant

### Performance lenta

**Causa**: Falta de índices adequados.

**Solução**:
1. Criar índices recomendados acima
2. Usar `EXPLAIN ANALYZE` para identificar gargalos
3. Considerar particionamento para tabelas muito grandes

---

**Versão**: 1.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-01-14  
**Funções Documentadas**: 5  
**Funções Implementadas**: 1 (get_dashboard_data)  
**Funções Pendentes**: 4 (get_vendas_por_filial, get_sales_by_month_chart, get_expenses_by_month_chart, get_lucro_by_month_chart)
