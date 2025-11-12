# Adendo - Atualização das Funções RPC

Este arquivo contém as atualizações das seções de parâmetros e retorno da função `get_dashboard_data` que precisam ser integradas ao [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md).

---

## get_dashboard_data - Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `schema_name` | TEXT | ✅ | Nome do schema do tenant | `'okilao'` |
| `p_data_inicio` | DATE | ✅ | Data inicial do período | `'2024-10-01'` |
| `p_data_fim` | DATE | ✅ | Data final do período | `'2024-10-31'` |
| `p_filiais_ids` | TEXT[] | ❌ (default: NULL) | Array de IDs de filiais como TEXT | `ARRAY['1','4','7']` ou `NULL` |

**Observações**:
- Se `p_filiais_ids` = `NULL`, retorna dados de **TODAS** as filiais
- IDs de filiais devem ser TEXT (são convertidos internamente)
- Usa tabela `vendas_diarias_por_filial` (tabela agregada)
- Usa tabela `descontos_venda` (se existir)

---

## get_dashboard_data - Retorno

**Tipo**: TABLE (registro único com 21 colunas)

**Colunas retornadas**:

### Período Atual (4 colunas)

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `total_vendas` | NUMERIC | Total de vendas (valor_total - descontos) | `500000.00` |
| `total_lucro` | NUMERIC | Total de lucro (total_lucro - descontos) | `150000.00` |
| `ticket_medio` | NUMERIC | Ticket médio (vendas / transações) | `85.50` |
| `margem_lucro` | NUMERIC | Margem de lucro % | `30.00` |

### PAM - Período Anterior Mesmo (4 colunas)

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `pa_vendas` | NUMERIC | Vendas do mês anterior | `480000.00` |
| `pa_lucro` | NUMERIC | Lucro do mês anterior | `140000.00` |
| `pa_ticket_medio` | NUMERIC | Ticket médio do mês anterior | `82.00` |
| `pa_margem_lucro` | NUMERIC | Margem do mês anterior % | `29.17` |

### Variações vs Mês Anterior (4 colunas)

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `variacao_vendas_mes` | NUMERIC | Variação % de vendas vs mês anterior | `4.17` |
| `variacao_lucro_mes` | NUMERIC | Variação % de lucro vs mês anterior | `7.14` |
| `variacao_ticket_mes` | NUMERIC | Variação % de ticket médio vs mês anterior | `4.27` |
| `variacao_margem_mes` | NUMERIC | Diferença absoluta de margem (pontos %) | `0.83` |

### Variações vs Ano Anterior (4 colunas)

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `variacao_vendas_ano` | NUMERIC | Variação % de vendas vs ano anterior | `11.11` |
| `variacao_lucro_ano` | NUMERIC | Variação % de lucro vs ano anterior | `15.38` |
| `variacao_ticket_ano` | NUMERIC | Variação % de ticket médio vs ano anterior | `8.23` |
| `variacao_margem_ano` | NUMERIC | Diferença absoluta de margem vs ano anterior | `2.50` |

### YTD - Year To Date (3 colunas)

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `ytd_vendas` | NUMERIC | Vendas acumuladas no ano até hoje | `5500000.00` |
| `ytd_vendas_ano_anterior` | NUMERIC | Vendas acumuladas no ano anterior (mesmo período) | `5000000.00` |
| `ytd_variacao_percent` | NUMERIC | Variação % YTD | `10.00` |

### Gráfico (1 coluna)

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `grafico_vendas` | JSONB | Array JSON com dados diários para gráfico | Ver abaixo |

**Estrutura do `grafico_vendas`**:
```json
[
  {
    "mes": "01/10",
    "ano_atual": 15000.00,
    "ano_anterior": 14000.00
  },
  {
    "mes": "02/10",
    "ano_atual": 16500.00,
    "ano_anterior": 15200.00
  },
  ...
]
```

---

## get_dashboard_data - Cálculos

### Fórmulas Principais

```sql
-- Ticket Médio
ticket_medio = total_vendas / total_transacoes

-- Margem de Lucro
margem_lucro = (total_lucro / total_vendas) × 100

-- Variação Percentual
variacao_percent = ((valor_atual - valor_anterior) / valor_anterior) × 100

-- Variação de Margem (pontos percentuais)
variacao_margem = margem_atual - margem_anterior

-- YTD Variação
ytd_variacao = ((ytd_vendas - ytd_vendas_ant) / ytd_vendas_ant) × 100
```

### Tratamento de Descontos

Se a tabela `descontos_venda` existir:
```sql
vendas_liquidas = valor_total - SUM(valor_desconto)
lucro_liquido = total_lucro - SUM(valor_desconto)
```

---

## get_dashboard_data - Tabelas Utilizadas

| Tabela | Colunas Usadas | Descrição |
|--------|----------------|-----------|
| `vendas_diarias_por_filial` | `data_venda`, `valor_total`, `total_lucro`, `total_transacoes`, `filial_id` | Tabela agregada de vendas diárias |
| `descontos_venda` (opcional) | `data_desconto`, `valor_desconto`, `filial_id` | Descontos aplicados |

---

## get_dashboard_data - Exemplo de Retorno Completo

```json
{
  "total_vendas": 500000.00,
  "total_lucro": 150000.00,
  "ticket_medio": 85.50,
  "margem_lucro": 30.00,

  "pa_vendas": 480000.00,
  "pa_lucro": 140000.00,
  "pa_ticket_medio": 82.00,
  "pa_margem_lucro": 29.17,

  "variacao_vendas_mes": 4.17,
  "variacao_lucro_mes": 7.14,
  "variacao_ticket_mes": 4.27,
  "variacao_margem_mes": 0.83,

  "variacao_vendas_ano": 11.11,
  "variacao_lucro_ano": 15.38,
  "variacao_ticket_ano": 8.23,
  "variacao_margem_ano": 2.50,

  "ytd_vendas": 5500000.00,
  "ytd_vendas_ano_anterior": 5000000.00,
  "ytd_variacao_percent": 10.00,

  "grafico_vendas": [
    {"mes": "01/10", "ano_atual": 15000, "ano_anterior": 14000},
    {"mes": "02/10", "ano_atual": 16500, "ano_anterior": 15200},
    ...
  ]
}
```

---

## get_dashboard_data - Índices Recomendados

```sql
-- Tabela vendas_diarias_por_filial
CREATE INDEX idx_vendas_diarias_data_filial
ON {schema}.vendas_diarias_por_filial(data_venda, filial_id);

CREATE INDEX idx_vendas_diarias_data
ON {schema}.vendas_diarias_por_filial(data_venda);

-- Tabela descontos_venda (se existir)
CREATE INDEX idx_descontos_venda_data_filial
ON {schema}.descontos_venda(data_desconto, filial_id);
```

---

## Diferenças Importantes vs Documentação Anterior

### ❌ Documentado anteriormente (INCORRETO):
- Retornava apenas 3 colunas (total_vendas, total_lucro, margem_lucro)
- Usava tabela `vendas` (não existe)
- Não calculava comparações temporais
- Não considerava descontos

### ✅ Função real:
- Retorna **21 colunas** com comparações completas
- Usa `vendas_diarias_por_filial` (tabela agregada)
- Calcula automaticamente PAM, PAA, YTD
- Considera descontos se tabela existir
- Gera gráfico comparativo em JSONB
- Muito mais complexa e poderosa

---

## Uso no Módulo DRE Gerencial

O módulo DRE Gerencial **NÃO USA TODOS OS CAMPOS** retornados por esta função. Ele extrai apenas:
- `total_vendas` → usado como `receitaBruta`
- `total_lucro` → usado como `lucroBruto`
- `margem_lucro` → usado como `margemLucroBruto`

**Os demais campos (PAM, YTD, gráfico) não são utilizados no DRE**, mas estão disponíveis para outros módulos (como Dashboard Principal).

---

**Data da atualização**: 2025-01-11
**Versão**: 2.0.0 (atualizada)
