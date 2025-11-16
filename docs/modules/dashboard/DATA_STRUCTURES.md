# Estruturas de Dados - Dashboard Principal

**Versão**: 2.0.2  
**Última Atualização**: 2025-11-15  
**Módulo**: Dashboard Principal

---

## Índice

1. [Tipos TypeScript do Frontend](#tipos-typescript-do-frontend)
2. [Estruturas de Resposta da API](#estruturas-de-resposta-da-api)
3. [Parâmetros de Requisição](#parâmetros-de-requisição)
4. [Estruturas do Banco de Dados](#estruturas-do-banco-de-dados)
5. [Exemplos de Dados Reais](#exemplos-de-dados-reais)

---

## Tipos TypeScript do Frontend

### DashboardData

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 23-48)

Interface principal que representa os dados retornados pela API `/api/dashboard`.

```typescript
interface DashboardData {
  // Métricas do Período Atual
  total_vendas: number           // Total de vendas do período
  total_lucro: number            // Total de lucro do período
  ticket_medio: number           // Ticket médio (vendas / transações)
  margem_lucro: number           // Margem de lucro em % (lucro / vendas * 100)
  
  // Métricas do PAM (Período Anterior Mesmo - mês anterior)
  pa_vendas: number              // Vendas do mês anterior
  pa_lucro: number               // Lucro do mês anterior
  pa_ticket_medio: number        // Ticket médio do mês anterior
  pa_margem_lucro: number        // Margem do mês anterior
  
  // Variações MoM (Month over Month)
  variacao_vendas_mes: number    // % de variação de vendas vs mês anterior
  variacao_lucro_mes: number     // % de variação de lucro vs mês anterior
  variacao_ticket_mes: number    // % de variação de ticket vs mês anterior
  variacao_margem_mes: number    // Variação em pontos percentuais de margem
  
  // Variações YoY (Year over Year)
  variacao_vendas_ano: number    // % de variação de vendas vs ano anterior
  variacao_lucro_ano: number     // % de variação de lucro vs ano anterior
  variacao_ticket_ano: number    // % de variação de ticket vs ano anterior
  variacao_margem_ano: number    // Variação em pontos percentuais de margem
  
  // YTD (Year to Date - Acumulado do Ano)
  ytd_vendas: number             // Vendas acumuladas do início do ano até hoje
  ytd_vendas_ano_anterior: number // Vendas acumuladas do ano anterior (mesmo período)
  ytd_variacao_percent: number   // % de variação YTD vs ano anterior
  
  // Dados para Gráficos
  grafico_vendas: Array<{
    mes: string                  // Nome do mês (ex: "JAN", "FEV")
    ano_atual: number            // Valor do ano atual
    ano_anterior: number         // Valor do ano anterior
  }>
}
```

**Observações**:
- Total de 21 campos + 1 array
- Todos os valores monetários são `number` (sem formatação)
- Percentuais são valores absolutos (ex: 15.5 = 15.5%)
- Variações de margem são em pontos percentuais (p.p.)

---

### VendaPorFilial

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 50-72)

Interface que representa dados de vendas detalhados por filial.

```typescript
interface VendaPorFilial {
  // Identificação
  filial_id: number              // ID da filial
  
  // Métricas do Período Atual
  valor_total: number            // Total de vendas da filial
  custo_total: number            // Total de custos da filial
  total_lucro: number            // Total de lucro (valor_total - custo_total)
  quantidade_total: number       // Quantidade de itens vendidos
  total_transacoes: number       // Número de transações (vendas)
  ticket_medio: number           // Ticket médio (valor_total / total_transacoes)
  margem_lucro: number           // Margem em % (total_lucro / valor_total * 100)
  
  // Métricas do PAM (Período Anterior)
  pa_valor_total: number         // Vendas do período anterior
  pa_custo_total: number         // Custos do período anterior
  pa_total_lucro: number         // Lucro do período anterior
  pa_total_transacoes: number    // Transações do período anterior
  pa_ticket_medio: number        // Ticket médio do período anterior
  pa_margem_lucro: number        // Margem do período anterior
  
  // Deltas (Variações Absolutas e Percentuais)
  delta_valor: number            // Variação absoluta em R$ (valor_total - pa_valor_total)
  delta_valor_percent: number    // Variação percentual de valor
  delta_custo: number            // Variação absoluta de custo
  delta_custo_percent: number    // Variação percentual de custo
  delta_lucro: number            // Variação absoluta de lucro
  delta_lucro_percent: number    // Variação percentual de lucro
  delta_margem: number           // Variação de margem em pontos percentuais
}
```

**Observações**:
- Total de 25 campos
- Campos calculados automaticamente pela RPC function
- Deltas já vêm calculados do backend
- Usado na tabela de "Vendas por Filial"

---

### YTDMetrics (NOVO v2.0.2)

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx` (linhas 50-61)

Interface que representa métricas YTD (Year to Date) para Receita, Lucro e Margem Bruta. Retornada pela API `/api/dashboard/ytd-metrics`.

```typescript
interface YTDMetrics {
  // YTD da Receita Bruta
  ytd_vendas: number                    // Receita acumulada do ano atual até hoje
  ytd_vendas_ano_anterior: number       // Receita acumulada do ano anterior (mesmo período)
  ytd_variacao_vendas_percent: number   // % de variação YTD de receita
  
  // YTD do Lucro Bruto
  ytd_lucro: number                     // Lucro acumulado do ano atual até hoje
  ytd_lucro_ano_anterior: number        // Lucro acumulado do ano anterior (mesmo período)
  ytd_variacao_lucro_percent: number    // % de variação YTD de lucro
  
  // YTD da Margem Bruta
  ytd_margem: number                    // Margem média do ano atual até hoje
  ytd_margem_ano_anterior: number       // Margem média do ano anterior (mesmo período)
  ytd_variacao_margem: number           // Variação em pontos percentuais de margem YTD
}
```

**Quando é usado**:
- Apenas quando filtro = "Ano" E ano selecionado = ano atual
- Exemplo: Hoje é 15/11/2025 e usuário filtra por Ano 2025
  - `ytd_vendas`: Vendas de 01/01/2025 até 15/11/2025
  - `ytd_vendas_ano_anterior`: Vendas de 01/01/2024 até 15/11/2024
  - `ytd_variacao_vendas_percent`: Variação entre os dois períodos

**Observações**:
- Função RPC dedicada: `get_dashboard_ytd_metrics`
- Comparação justa: Mesmo número de dias em ambos os anos
- Fix v2.0.2: Corrige cálculo YTD para anos passados
- Exibida em linha separada nos cards (antes da comparação PA)

---

### SalesChartData

**Arquivo**: `src/components/dashboard/chart-vendas.tsx` (linhas 17-25)

Interface para dados do gráfico de vendas mensais.

```typescript
interface SalesChartData {
  mes: string                           // Mês abreviado (ex: "JAN", "FEV", "MAR")
  total_vendas: number                  // Total de vendas do mês atual
  total_vendas_ano_anterior: number     // Total de vendas do ano anterior (mesmo mês)
  total_despesas?: number               // Total de despesas do mês (opcional)
  total_despesas_ano_anterior?: number  // Despesas do ano anterior (opcional)
  total_lucro?: number                  // Lucro bruto do mês (opcional)
  total_lucro_ano_anterior?: number     // Lucro do ano anterior (opcional)
}
```

**Observações**:
- Campos de despesas e lucro são opcionais
- Dados são agregados por mês (12 registros por ano)
- Usado no componente `ChartVendas`

---

### CardMetricProps

**Arquivo**: `src/components/dashboard/card-metric.tsx` (linhas 16-23)

Props do componente de card de métrica.

```typescript
interface CardMetricProps {
  title: string                  // Título do card (ex: "Total de Vendas")
  value: string                  // Valor principal formatado (ex: "R$ 150.000,00")
  previousValue?: string         // Valor do período anterior formatado
  variationPercent?: string      // Variação percentual formatada (ex: "+15,5%")
  variationYear?: string         // Variação anual formatada (ex: "+20,3%")
  isPositive?: boolean          // Se a variação é positiva (para cor)
}
```

---

## Estruturas de Resposta da API

### GET /api/dashboard

**Parâmetros de Query**:
```typescript
{
  schema: string           // Nome do schema do tenant (ex: "okilao")
  data_inicio: string      // Data inicial no formato YYYY-MM-DD
  data_fim: string         // Data final no formato YYYY-MM-DD
  filiais?: string         // IDs das filiais separados por vírgula (ex: "1,3,5") ou "all"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "total_vendas": 150000.50,
  "total_lucro": 45000.15,
  "ticket_medio": 250.75,
  "margem_lucro": 30.00,
  "pa_vendas": 140000.00,
  "pa_lucro": 42000.00,
  "pa_ticket_medio": 245.00,
  "pa_margem_lucro": 30.00,
  "variacao_vendas_mes": 7.14,
  "variacao_lucro_mes": 7.14,
  "variacao_ticket_mes": 2.35,
  "variacao_margem_mes": 0.00,
  "variacao_vendas_ano": 12.50,
  "variacao_lucro_ano": 10.25,
  "variacao_ticket_ano": 5.00,
  "variacao_margem_ano": -0.50,
  "ytd_vendas": 450000.00,
  "ytd_vendas_ano_anterior": 400000.00,
  "ytd_variacao_percent": 12.50,
  "grafico_vendas": [
    {
      "mes": "JAN",
      "ano_atual": 150000.50,
      "ano_anterior": 135000.00
    },
    // ... mais 11 meses
  ]
}
```

**Resposta de Erro (400)**:
```json
{
  "error": "Invalid query parameters",
  "details": {
    "fieldErrors": {
      "data_inicio": ["Formato de data inválido, esperado YYYY-MM-DD"]
    }
  }
}
```

**Resposta de Erro (401)**:
```json
{
  "error": "Unauthorized"
}
```

**Resposta de Erro (403)**:
```json
{
  "error": "Forbidden"
}
```

---

### GET /api/dashboard/vendas-por-filial

**Parâmetros de Query**:
```typescript
{
  schema: string           // Nome do schema do tenant
  data_inicio: string      // Data inicial no formato YYYY-MM-DD
  data_fim: string         // Data final no formato YYYY-MM-DD
  filiais?: string         // IDs das filiais ou "all"
}
```

**Resposta de Sucesso (200)**:
```json
[
  {
    "filial_id": 1,
    "valor_total": 50000.00,
    "custo_total": 35000.00,
    "total_lucro": 15000.00,
    "quantidade_total": 5000,
    "total_transacoes": 200,
    "ticket_medio": 250.00,
    "margem_lucro": 30.00,
    "pa_valor_total": 45000.00,
    "pa_custo_total": 32000.00,
    "pa_total_lucro": 13000.00,
    "pa_total_transacoes": 180,
    "pa_ticket_medio": 250.00,
    "pa_margem_lucro": 28.89,
    "delta_valor": 5000.00,
    "delta_valor_percent": 11.11,
    "delta_custo": 3000.00,
    "delta_custo_percent": 9.38,
    "delta_lucro": 2000.00,
    "delta_lucro_percent": 15.38,
    "delta_margem": 1.11
  },
  // ... mais filiais
]
```

---

### GET /api/charts/sales-by-month

**Parâmetros de Query**:
```typescript
{
  schema: string      // Nome do schema do tenant
  filiais?: string    // IDs das filiais ou "all"
}
```

**Resposta de Sucesso (200)**:
```json
[
  {
    "mes": "JAN",
    "total_vendas": 150000.00,
    "total_vendas_ano_anterior": 135000.00,
    "total_despesas": 80000.00,
    "total_despesas_ano_anterior": 75000.00,
    "total_lucro": 70000.00,
    "total_lucro_ano_anterior": 60000.00
  },
  {
    "mes": "FEV",
    "total_vendas": 160000.00,
    "total_vendas_ano_anterior": 145000.00,
    "total_despesas": 85000.00,
    "total_despesas_ano_anterior": 78000.00,
    "total_lucro": 75000.00,
    "total_lucro_ano_anterior": 67000.00
  }
  // ... 10 meses restantes
]
```

---

## Parâmetros de Requisição

### Filtros da Página Dashboard

**Estado Local (React)**:
```typescript
// Datas
const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()))
const [dataFim, setDataFim] = useState<Date>(subDays(new Date(), 1))

// Filiais selecionadas (array de objetos com value e label)
const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<
  { value: string; label: string }[]
>([])

// Parâmetros enviados à API (montados automaticamente)
const [apiParams, setApiParams] = useState({
  schema: string,        // Schema do tenant atual
  data_inicio: string,   // Formato YYYY-MM-DD
  data_fim: string,      // Formato YYYY-MM-DD
  filiais: string,       // "all" ou "1,3,5"
})
```

---

## Estruturas do Banco de Dados

### Tabela: vendas_diarias_por_filial

**Schema**: `{tenant_schema}` (ex: `okilao`, `saoluiz`)

```sql
CREATE TABLE vendas_diarias_por_filial (
  id SERIAL PRIMARY KEY,
  data_venda DATE NOT NULL,
  filial_id INTEGER NOT NULL,
  valor_total NUMERIC(15, 2) NOT NULL,        -- Total de vendas
  custo_total NUMERIC(15, 2) NOT NULL,        -- Total de custos
  total_lucro NUMERIC(15, 2) NOT NULL,        -- Lucro (valor - custo)
  quantidade_total INTEGER NOT NULL,           -- Quantidade de itens
  total_transacoes INTEGER NOT NULL,           -- Número de transações
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX idx_vendas_diarias_data_filial 
  ON vendas_diarias_por_filial(data_venda, filial_id);

CREATE INDEX idx_vendas_diarias_filial 
  ON vendas_diarias_por_filial(filial_id);
```

---

### Tabela: descontos_venda (Opcional)

**Schema**: `{tenant_schema}`

```sql
CREATE TABLE descontos_venda (
  id SERIAL PRIMARY KEY,
  data_desconto DATE NOT NULL,
  filial_id INTEGER NOT NULL,
  valor_desconto NUMERIC(15, 2) NOT NULL,
  tipo_desconto VARCHAR(50),                   -- Ex: "promocional", "negociacao"
  descricao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX idx_descontos_data_filial 
  ON descontos_venda(data_desconto, filial_id);
```

---

### Tabela: despesas

**Schema**: `{tenant_schema}`

```sql
CREATE TABLE despesas (
  id SERIAL PRIMARY KEY,
  filial_id INTEGER NOT NULL,
  id_tipo_despesa INTEGER NOT NULL,
  data_emissao DATE NOT NULL,
  data_despesa DATE NOT NULL,
  descricao TEXT,
  id_fornecedor INTEGER,
  numero_nota BIGINT,
  serie_nota VARCHAR(10),
  valor NUMERIC(15, 2) NOT NULL,
  usuario VARCHAR(100),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX idx_despesas_data_filial 
  ON despesas(data_despesa, filial_id);

CREATE INDEX idx_despesas_tipo 
  ON despesas(id_tipo_despesa);
```

---

## Exemplos de Dados Reais

### Exemplo: DashboardData Completo

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
    { "mes": "JAN", "ano_atual": 352847.89, "ano_anterior": 305123.45 },
    { "mes": "FEV", "ano_atual": 378456.12, "ano_anterior": 318765.43 },
    { "mes": "MAR", "ano_atual": 327174.42, "ano_anterior": 291345.68 },
    { "mes": "ABR", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "MAI", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "JUN", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "JUL", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "AGO", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "SET", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "OUT", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "NOV", "ano_atual": 0, "ano_anterior": 0 },
    { "mes": "DEZ", "ano_atual": 0, "ano_anterior": 0 }
  ]
}
```

---

### Exemplo: VendaPorFilial (Múltiplas Filiais)

```json
[
  {
    "filial_id": 1,
    "valor_total": 176423.94,
    "custo_total": 123496.76,
    "total_lucro": 52927.18,
    "quantidade_total": 15234,
    "total_transacoes": 1000,
    "ticket_medio": 176.42,
    "margem_lucro": 30.01,
    "pa_valor_total": 164228.06,
    "pa_custo_total": 114959.64,
    "pa_total_lucro": 49268.42,
    "pa_total_transacoes": 950,
    "pa_ticket_medio": 172.87,
    "pa_margem_lucro": 30.00,
    "delta_valor": 12195.88,
    "delta_valor_percent": 7.43,
    "delta_custo": 8537.12,
    "delta_custo_percent": 7.43,
    "delta_lucro": 3658.76,
    "delta_lucro_percent": 7.43,
    "delta_margem": 0.01
  },
  {
    "filial_id": 3,
    "valor_total": 176423.95,
    "custo_total": 123496.77,
    "total_lucro": 52927.18,
    "quantidade_total": 15234,
    "total_transacoes": 1000,
    "ticket_medio": 176.42,
    "margem_lucro": 30.01,
    "pa_valor_total": 164228.06,
    "pa_custo_total": 114959.64,
    "pa_total_lucro": 49268.42,
    "pa_total_transacoes": 950,
    "pa_ticket_medio": 172.87,
    "pa_margem_lucro": 30.00,
    "delta_valor": 12195.89,
    "delta_valor_percent": 7.43,
    "delta_custo": 8537.13,
    "delta_custo_percent": 7.43,
    "delta_lucro": 3658.76,
    "delta_lucro_percent": 7.43,
    "delta_margem": 0.01
  }
]
```

---

### Exemplo: SalesChartData (12 meses)

```json
[
  {
    "mes": "JAN",
    "total_vendas": 352847.89,
    "total_vendas_ano_anterior": 305123.45,
    "total_despesas": 187234.56,
    "total_despesas_ano_anterior": 172345.67,
    "total_lucro": 105854.37,
    "total_lucro_ano_anterior": 91234.56
  },
  {
    "mes": "FEV",
    "total_vendas": 378456.12,
    "total_vendas_ano_anterior": 318765.43,
    "total_despesas": 198765.43,
    "total_despesas_ano_anterior": 185432.10,
    "total_lucro": 112345.67,
    "total_lucro_ano_anterior": 98765.43
  },
  {
    "mes": "MAR",
    "total_vendas": 327174.42,
    "total_vendas_ano_anterior": 291345.68,
    "total_despesas": 175432.10,
    "total_despesas_ano_anterior": 165234.56,
    "total_lucro": 98234.56,
    "total_lucro_ano_anterior": 85234.56
  }
  // ... demais meses (ABR a DEZ podem ter valores 0 se ainda não ocorreram)
]
```

---

## Relacionamentos

### Diagrama de Relacionamento de Dados

```
┌─────────────────────────────┐
│ vendas_diarias_por_filial   │
├─────────────────────────────┤
│ - data_venda                │
│ - filial_id                 │
│ - valor_total               │◄────────────┐
│ - custo_total               │             │
│ - total_lucro               │             │
│ - quantidade_total          │             │
│ - total_transacoes          │             │ Agregação
└─────────────────────────────┘             │ por período
                                            │ e filial
┌─────────────────────────────┐             │
│ descontos_venda (opcional)  │             │
├─────────────────────────────┤             │
│ - data_desconto             │             │
│ - filial_id                 │─────────────┤
│ - valor_desconto            │             │
└─────────────────────────────┘             │
                                            │
┌─────────────────────────────┐             │
│ despesas                    │             │
├─────────────────────────────┤             │
│ - data_despesa              │             │
│ - filial_id                 │─────────────┘
│ - valor                     │
│ - id_tipo_despesa           │
└─────────────────────────────┘
```

---

## Tipos de Auditoria

### AuditLogParams

**Arquivo**: `src/lib/audit.ts`

```typescript
interface AuditLogParams {
  module: AuditModule                      // Nome do módulo acessado
  subModule?: string                       // Sub-módulo (opcional)
  tenantId?: string                        // ID do tenant
  userName?: string                        // Nome do usuário
  userEmail?: string                       // Email do usuário
  action?: string                          // Ação executada (default: 'access')
  metadata?: Record<string, unknown>       // Dados adicionais (JSON)
}

type AuditModule = 
  | 'dashboard' 
  | 'usuarios' 
  | 'relatorios' 
  | 'configuracoes' 
  | 'metas' 
  | 'despesas' 
  | 'dre-gerencial' 
  | 'descontos_venda'
```

---

**Versão**: 1.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-01-14  
**Total de Estruturas Documentadas**: 15
