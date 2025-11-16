# Explicação dos Campos dos Cards - Dashboard Principal

**Versão**: 2.0.2  
**Última Atualização**: 2025-11-15  
**Módulo**: Dashboard Principal

---

## Visão Geral

Este documento explica em detalhes o significado de cada campo exibido nos cards do Dashboard Principal, incluindo como são calculados, quando aparecem, e o que significam as comparações.

---

## Estrutura dos Cards

Cada card do dashboard possui a seguinte estrutura:

```
┌─────────────────────────────────────┐
│ [Título do Card]         text-lg    │  ← Título (ex: "Receita Bruta")
├─────────────────────────────────────┤
│ R$ 217.962.983,06      text-2xl     │  ← Valor Principal
│                                     │
│ 2024 YTD: R$ 206.395.292,53        │  ← Comparação YTD (se aplicável)
│ (↑ +5.60%)                          │     Sempre positivo/negativo
│                                     │
│ 2024: R$ 238.064.366,16            │  ← Comparação com Período Anterior
│ (↓ -8.44%)                          │     Com tooltip de variação anual
└─────────────────────────────────────┘
```

---

## Card 1: Receita Bruta

### Título
**"Receita Bruta"** (text-lg)
- Nomenclatura atualizada em v2.0 (antes: "Total de Vendas")
- Representa o faturamento total do período selecionado

### Valor Principal
**Fórmula**: `SUM(vendas_diarias_por_filial.valor_total) - SUM(descontos_venda.valor_desconto)`

**Exemplo**: R$ 217.962.983,06

**Descrição**: Soma de todas as vendas do período selecionado, subtraindo os descontos concedidos (quando a tabela `descontos_venda` existe).

**Regra de Negócio**: [RN-CALC-001](./BUSINESS_RULES.md#rn-calc-001-cálculo-de-receita-bruta)

### Comparação YTD (Year to Date)
**Formato**: `2024 YTD: R$ 206.395.292,53 (↑ +5.60%)`

**Quando aparece**: 
- Apenas quando filtro = "Ano" E ano selecionado = ano atual
- Exemplo: Hoje é 15/11/2025 e filtro é "Ano 2025"

**O que significa**:
- **Label**: `2024 YTD` (ano anterior + "YTD")
- **Valor**: Receita acumulada do ano anterior de 01/Janeiro até **mesma data do ano atual**
  - Hoje é 15/11/2025 → YTD = 01/01/2024 a 15/11/2024
- **Variação**: `((Receita 2025 até hoje - Receita 2024 até mesma data) / Receita 2024) × 100`
- **Cor**: Verde (↑) se positivo, Vermelho (↓) se negativo

**Por que YTD?**: Permite comparação justa entre os anos, considerando apenas o mesmo número de dias.

**Regra de Negócio**: [RN-YTD-001](./BUSINESS_RULES.md#rn-ytd-001-cálculo-de-ytd-year-to-date---v202-atualizado)

### Comparação com Período Anterior (PA)
**Formato Dinâmico**:
- Filtro Ano: `2024: R$ 238.064.366,16 (↓ -8.44%)`
- Filtro Mês: `Out/2024: R$ 159.880.724,20 (↑ +11.24%)`
- Filtro Customizado: `PA: R$ 159.880.724,20 (↑ +11.24%)`

**O que significa**:

#### Quando filtro = Ano
- **Label**: Ano anterior completo (ex: "2024")
- **Valor**: Receita do ano anterior **completo** (01/Jan a 31/Dez)
- **Variação**: `((Receita ano atual - Receita ano anterior completo) / Receita ano anterior) × 100`
- **Interpretação**: Compara ano inteiro com ano inteiro, independente da data atual

#### Quando filtro = Mês
- **Label**: Mês anterior (ex: "Out/2024")
- **Valor**: Receita do mês anterior completo
  - Filtro = Nov/2025 → PA = Out/2025 (01/10 a 31/10)
- **Variação**: `((Receita mês atual - Receita mês anterior) / Receita mês anterior) × 100`
- **Interpretação**: Comparação mês a mês (MoM - Month over Month)

#### Quando filtro = Período Customizado
- **Label**: "PA" (Período Anterior)
- **Valor**: Mesmo intervalo de dias deslocado para trás
  - Filtro = 15/03/2025 a 20/11/2025 → PA = 15/03/2024 a 20/11/2024
- **Variação**: Comparação do período customizado com mesmo período no ano anterior
- **Interpretação**: Comparação período a período

**Tooltip**: Ao passar o mouse, exibe a variação anual (YoY) com texto explicativo.

**Cor da Variação**:
- ↑ Verde: Crescimento de receita (positivo para o negócio)
- ↓ Vermelho: Queda de receita (negativo para o negócio)

**Regra de Negócio**: [RN-TEMP-001 a RN-TEMP-004](./BUSINESS_RULES.md#regras-de-comparação-temporal)

---

## Card 2: Lucro Bruto

### Título
**"Lucro Bruto"** (text-lg)
- Nomenclatura atualizada em v2.0 (antes: "Total de Lucro")
- Representa o lucro antes de despesas operacionais

### Valor Principal
**Fórmula**: `SUM(vendas_diarias_por_filial.total_lucro) - SUM(descontos_venda.valor_desconto)`

**Exemplo**: R$ 55.871.679,52

**Descrição**: Soma do lucro de todas as vendas (Receita - Custo Mercadoria Vendida), subtraindo os descontos.

**Observação**: Descontos são subtraídos tanto da Receita quanto do Lucro Bruto.

**Regra de Negócio**: [RN-CALC-002](./BUSINESS_RULES.md#rn-calc-002-cálculo-de-lucro-bruto)

### Comparação YTD (Year to Date)
**Formato**: `2024 YTD: R$ 47.644.528,53 (↑ +17.27%)`

**Quando aparece**: 
- Apenas quando filtro = "Ano" E ano selecionado = ano atual
- Busca dados via `/api/dashboard/ytd-metrics`

**O que significa**:
- **Valor**: Lucro acumulado do ano anterior de 01/Janeiro até mesma data do ano atual
- **Variação**: `((Lucro YTD atual - Lucro YTD anterior) / Lucro YTD anterior) × 100`
- **Cor**: Verde (↑) se positivo, Vermelho (↓) se negativo

**Função RPC**: `get_dashboard_ytd_metrics` (campo `ytd_lucro_ano_anterior`)

### Comparação com Período Anterior
**Comportamento**: Idêntico ao card de Receita Bruta (ver acima)
- Label dinâmica baseada no filtro
- Variação calculada entre período atual e período anterior

**Cor da Variação**:
- ↑ Verde: Crescimento de lucro (positivo)
- ↓ Vermelho: Queda de lucro (negativo)

---

## Card 3: Margem Bruta

### Título
**"Margem Bruta"** (text-lg)
- Nomenclatura atualizada em v2.0 (antes: "Margem de Lucro")
- Representa a % de lucro sobre a receita

### Valor Principal
**Fórmula**: `(Lucro Bruto / Receita Bruta) × 100`

**Exemplo**: 25.6%

**Descrição**: Percentual que representa quanto de cada real vendido se transforma em lucro bruto.

**Interpretação**:
- 25.6% significa: A cada R$ 100,00 vendidos, R$ 25,60 é lucro bruto
- Quanto maior, melhor (mais eficiente é a operação)

**Condição Especial**: Se Receita Bruta = 0, então Margem = 0%

**Regra de Negócio**: [RN-CALC-004](./BUSINESS_RULES.md#rn-calc-004-cálculo-de-margem-bruta)

### Comparação YTD (Year to Date)
**Formato**: `2024 YTD: 26.8% (-1.15p.p.)`

**Quando aparece**: 
- Apenas quando filtro = "Ano" E ano selecionado = ano atual

**O que significa**:
- **Valor**: Margem média do ano anterior de 01/Janeiro até mesma data do ano atual
- **Variação**: Diferença em **pontos percentuais** (não percentual!)
  - Exemplo: 25.6% - 26.8% = -1.2 p.p. (não -4.48%!)
- **Cor**: Verde se margem atual > margem YTD, Vermelho se menor

**Observação Importante**: Margem usa **pontos percentuais** (p.p.) na variação, não percentual.

### Comparação com Período Anterior
**Formato com Pontos Percentuais**:
- Filtro Ano: `2024: 25.7% (-0.07p.p.)`
- Filtro Mês: `Out/2024: 26.8% (-1.2p.p.)`

**O que significa**:
- **Valor**: Margem do período anterior
- **Variação**: Diferença em pontos percentuais
  - Cálculo: `Margem Atual - Margem Anterior`
  - Exemplo: 25.6% - 25.7% = -0.1 p.p.

**Interpretação**:
- Positivo (+0.5p.p.): Margem aumentou 0.5 pontos percentuais
- Negativo (-0.5p.p.): Margem diminuiu 0.5 pontos percentuais

**Cor da Variação**:
- ↑ Verde: Margem aumentou (melhor eficiência)
- ↓ Vermelho: Margem diminuiu (pior eficiência)

**Regra de Negócio**: [RN-TEMP-003 e RN-TEMP-004](./BUSINESS_RULES.md#regras-de-comparação-temporal)

---

## Card 4: Ticket Médio

### Título
**"Ticket Médio"** (text-sm)
- Representa o valor médio por transação

### Valor Principal
**Fórmula**: `Receita Bruta / Total de Transações`

**Exemplo**: R$ 53,30

**Descrição**: Valor médio de cada venda/transação realizada no período.

**Interpretação**:
- R$ 53,30 significa: Cada cliente gasta em média R$ 53,30 por compra
- Indicador de comportamento do consumidor

**Condição Especial**: Se Total Transações = 0, então Ticket Médio = R$ 0,00

**Regra de Negócio**: [RN-CALC-003](./BUSINESS_RULES.md#rn-calc-003-cálculo-de-ticket-médio)

### Comparação (SEM YTD)
**Formato**: `Out/2024: R$ 46,35 (↑ +15.00%)`

**Observação**: Ticket Médio **NÃO possui comparação YTD**, apenas comparação com período anterior.

**O que significa**:
- **Valor**: Ticket médio do período anterior
- **Variação**: `((Ticket atual - Ticket anterior) / Ticket anterior) × 100`

**Cor da Variação**:
- ↑ Verde: Ticket médio aumentou (clientes gastando mais)
- ↓ Vermelho: Ticket médio diminuiu (clientes gastando menos)

**Tooltip**: Mostra variação anual (YoY) ao passar o mouse.

---

## Resumo: Quando Cada Comparação Aparece

| Filtro | Valor Principal | YTD | PA (Período Anterior) |
|--------|----------------|-----|----------------------|
| **Ano 2025** (ano atual) | 01/01/2025 a 31/12/2025 | ✅ 2024 YTD (01/01 a 15/11) | ✅ 2024 (ano completo) |
| **Ano 2024** (ano passado) | 01/01/2024 a 31/12/2024 | ❌ Não aparece | ✅ 2023 (ano completo) |
| **Mês Nov/2025** | 01/11/2025 a 30/11/2025 | ❌ Não aparece | ✅ Out/2025 (mês anterior) |
| **Período Customizado** | Datas selecionadas | ❌ Não aparece | ✅ PA (mesmo período ano anterior) |

---

## Cores e Ícones

### Variação Positiva (↑)
- **Cor**: `text-emerald-500` (verde)
- **Ícone**: `ArrowUp`
- **Quando**: Valor atual > Valor comparativo
- **Significado**: Crescimento/Melhoria

### Variação Negativa (↓)
- **Cor**: `text-red-500` (vermelho)
- **Ícone**: `ArrowDown`
- **Quando**: Valor atual < Valor comparativo
- **Significado**: Queda/Piora

### Observações sobre Interpretação
- **Receita e Lucro**: ↑ Verde sempre é bom, ↓ Vermelho sempre é ruim
- **Margem**: ↑ Verde é bom (mais eficiência), ↓ Vermelho é ruim
- **Ticket Médio**: ↑ Verde pode ser bom (mais receita) ou neutro (clientes comprando menos mas gastando mais)

---

## Campos Presentes em Cada Card

### Receita Bruta
```typescript
{
  title: "Receita Bruta",                          // text-lg
  value: "R$ 217.962.983,06",                     // text-2xl (principal)
  
  // YTD (se filtro = Ano + ano atual)
  ytdValue: "R$ 206.395.292,53",
  ytdVariationPercent: "+5.60%",
  ytdLabel: "2024 YTD",
  ytdIsPositive: true,
  
  // PA (sempre presente)
  previousValue: "R$ 238.064.366,16",
  variationPercent: "-8.44%",
  comparisonLabel: "2024",  // ou "Out/2024" ou "PA"
  isPositive: false,
  variationYear: "+5.60%"   // para tooltip
}
```

### Lucro Bruto
```typescript
{
  title: "Lucro Bruto",
  value: "R$ 55.871.679,52",
  
  // YTD (se filtro = Ano + ano atual)
  ytdValue: "R$ 47.644.528,53",
  ytdVariationPercent: "+17.27%",
  ytdLabel: "2024 YTD",
  ytdIsPositive: true,
  
  // PA
  previousValue: "R$ 61.179.684,21",
  variationPercent: "-8.68%",
  comparisonLabel: "2024",
  isPositive: false
}
```

### Margem Bruta
```typescript
{
  title: "Margem Bruta",
  value: "25.6%",
  
  // YTD (se filtro = Ano + ano atual)
  ytdValue: "26.8%",
  ytdVariationPercent: "-1.15p.p.",  // pontos percentuais!
  ytdLabel: "2024 YTD",
  ytdIsPositive: false,
  
  // PA
  previousValue: "25.7%",
  variationPercent: "-0.07p.p.",     // pontos percentuais!
  comparisonLabel: "2024",
  isPositive: false
}
```

### Ticket Médio
```typescript
{
  title: "Ticket Médio",
  value: "R$ 53,30",
  
  // SEM YTD
  
  // PA
  previousValue: "R$ 46,35",
  variationPercent: "+15.00%",
  comparisonLabel: "Out/2024",
  isPositive: true
}
```

---

## Fontes de Dados

### Dados Principais (Valor + PA)
- **API**: `/api/dashboard`
- **Função RPC**: `get_dashboard_data`
- **Arquivo**: [src/app/api/dashboard/route.ts](../../../src/app/api/dashboard/route.ts)
- **Migração**: [supabase/migrations/20251115150000_fix_dashboard_comparison_values.sql](../../../supabase/migrations/20251115150000_fix_dashboard_comparison_values.sql)

### Dados YTD (Lucro e Margem)
- **API**: `/api/dashboard/ytd-metrics`
- **Função RPC**: `get_dashboard_ytd_metrics`
- **Arquivo**: [src/app/api/dashboard/ytd-metrics/route.ts](../../../src/app/api/dashboard/ytd-metrics/route.ts)
- **Migração**: [supabase/migrations/20251115084345_add_ytd_metrics_function.sql](../../../supabase/migrations/20251115084345_add_ytd_metrics_function.sql)

---

## Componente Responsável

**Componente**: `CardMetric`
**Arquivo**: [src/components/dashboard/card-metric.tsx](../../../src/components/dashboard/card-metric.tsx)

**Props**:
```typescript
interface CardMetricProps {
  title: string                    // Título do card
  value: string                    // Valor principal (formatado)
  
  // Comparação PA
  previousValue?: string           // Valor do período anterior (formatado)
  variationPercent?: string        // Variação % ou p.p. (formatado com +/-)
  variationYear?: string           // Variação anual para tooltip
  isPositive?: boolean             // Define cor da variação
  comparisonLabel?: string         // Label dinâmica (PA, 2024, Out/2024)
  
  // Comparação YTD
  ytdValue?: string                // Valor YTD (formatado)
  ytdVariationPercent?: string     // Variação YTD (formatado com +/-)
  ytdLabel?: string                // Label YTD (ex: "2024 YTD")
  ytdIsPositive?: boolean          // Define cor da variação YTD
}
```

---

## Exemplos Visuais

### Exemplo 1: Filtro Ano 2025 (Ano Atual)

```
┌────────────────────────────────────────┐
│ Receita Bruta                   text-lg│
├────────────────────────────────────────┤
│ R$ 217.962.983,06            text-2xl  │
│                                        │
│ 2024 YTD: R$ 206.395.292,53           │ ← YTD aparece
│ (↑ +5.60%)                  text-emerald│
│                                        │
│ 2024: R$ 238.064.366,16               │ ← Ano completo
│ (↓ -8.44%)                     text-red│
└────────────────────────────────────────┘
```

### Exemplo 2: Filtro Mês Nov/2025

```
┌────────────────────────────────────────┐
│ Receita Bruta                   text-lg│
├────────────────────────────────────────┤
│ R$ 20.234.567,89             text-2xl  │
│                                        │
│                                        │ ← YTD NÃO aparece
│                                        │
│ Out/2025: R$ 18.500.000,00            │ ← Mês anterior
│ (↑ +9.38%)                 text-emerald│
└────────────────────────────────────────┘
```

### Exemplo 3: Filtro Período Customizado

```
┌────────────────────────────────────────┐
│ Margem Bruta                    text-lg│
├────────────────────────────────────────┤
│ 26.8%                        text-2xl  │
│                                        │
│                                        │ ← YTD NÃO aparece
│                                        │
│ PA: 26.8%                             │ ← Período anterior genérico
│ (-0.05p.p.)                    text-red│ ← Pontos percentuais
└────────────────────────────────────────┘
```

---

## Regras de Negócio Relacionadas

- [RN-CALC-001: Cálculo de Receita Bruta](./BUSINESS_RULES.md#rn-calc-001-cálculo-de-receita-bruta)
- [RN-CALC-002: Cálculo de Lucro Bruto](./BUSINESS_RULES.md#rn-calc-002-cálculo-de-lucro-bruto)
- [RN-CALC-003: Cálculo de Ticket Médio](./BUSINESS_RULES.md#rn-calc-003-cálculo-de-ticket-médio)
- [RN-CALC-004: Cálculo de Margem Bruta](./BUSINESS_RULES.md#rn-calc-004-cálculo-de-margem-bruta)
- [RN-TEMP-001 a 004: Comparações Temporais](./BUSINESS_RULES.md#regras-de-comparação-temporal)
- [RN-YTD-001: Cálculo de YTD](./BUSINESS_RULES.md#rn-ytd-001-cálculo-de-ytd-year-to-date---v202-atualizado)
- [RN-EXB-001 a 003: Formatação e Cores](./BUSINESS_RULES.md#regras-de-exibição)

---

**Versão**: 2.0.2  
**Data de Criação**: 2025-11-15  
**Última Atualização**: 2025-11-15  
**Autor**: Documentação Técnica - Dashboard Module
