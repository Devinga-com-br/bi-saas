# Changelog - Atualização de Funções RPC

## 2025-01-11 - Correção da Documentação

### get_despesas_hierarquia

**Alterações identificadas**:

1. **Tabelas diferentes**:
   - ❌ Anterior: `departamentos_despesas`, `tipos_despesas`
   - ✅ Atual: `departamentos_nivel1`, `tipos_despesa` (singular)

2. **Campo de filtro**:
   - ❌ Anterior: Usa parâmetro `p_tipo_data` no WHERE
   - ✅ Atual: **Ignora** `p_tipo_data`, sempre usa `data_despesa`

3. **Campos de JOIN**:
   - ❌ Anterior: `despesas.dept_id` → `departamentos_despesas.id`
   - ✅ Atual: `despesas.id_tipo_despesa` → `tipos_despesa.id` → `tipos_despesa.departamentalizacao_nivel1` → `departamentos_nivel1.id`

4. **Tipos de dados**:
   - ❌ Anterior: `id_fornecedor TEXT`
   - ✅ Atual: `id_fornecedor INTEGER`
   - ❌ Anterior: `numero_nota INTEGER`
   - ✅ Atual: `numero_nota BIGINT`
   - ❌ Anterior: `serie_nota TEXT`
   - ✅ Atual: `serie_nota VARCHAR`
   - ❌ Anterior: `usuario TEXT`
   - ✅ Atual: `usuario VARCHAR`

5. **LIMIT**:
   - ❌ Anterior: Sem limite
   - ✅ Atual: **LIMIT 1000**

6. **Ordenação**:
   - ❌ Anterior: `ORDER BY dd.descricao, td.descricao, d.data_emissao`
   - ✅ Atual: `ORDER BY d.descricao, td.descricao, desp.data_despesa DESC`

---

### get_dashboard_data

**Mudanças DRÁSTICAS**:

1. **Retorno expandido**:
   - ❌ Anterior: 3 colunas
   - ✅ Atual: **21 colunas**

2. **Tabela fonte**:
   - ❌ Anterior: `vendas` (não existe)
   - ✅ Atual: `vendas_diarias_por_filial`

3. **Novos cálculos automáticos**:
   - ✅ PAM (Período Anterior Mesmo)
   - ✅ PAA (Período Anterior Acumulado / Ano anterior)
   - ✅ YTD (Year To Date)
   - ✅ Ticket Médio
   - ✅ Variações percentuais (8 tipos)
   - ✅ Gráfico comparativo (JSONB)

4. **Descontos**:
   - ❌ Anterior: Não considerava
   - ✅ Atual: Verifica tabela `descontos_venda` e subtrai automaticamente

5. **Complexidade**:
   - ❌ Anterior: ~50 linhas
   - ✅ Atual: ~230 linhas
   - ❌ Anterior: 1 query simples
   - ✅ Atual: 11+ queries dinâmicas

---

## Impacto no Módulo DRE Gerencial

### get_despesas_hierarquia

**Impacto**: ⚠️ MÉDIO

- Frontend espera retorno específico ✅ (compatível)
- LIMIT 1000 pode truncar dados (considerar paginação)
- Parâmetro `p_tipo_data` é ignorado (não causa erro, mas pode confundir)

**Recomendações**:
1. Documentar que `p_tipo_data` não é usado
2. Adicionar paginação se mais de 1000 despesas por filial/período
3. Considerar remover parâmetro `p_tipo_data` em futura versão

---

### get_dashboard_data

**Impacto**: ⚠️ BAIXO (apesar das mudanças)

- DRE usa apenas 3 campos dos 21 retornados ✅
- Campos usados:
  - `total_vendas` ✅
  - `total_lucro` ✅
  - `margem_lucro` ✅
- Demais 18 campos são ignorados ✅

**Recomendações**:
1. Outros módulos podem aproveitar os 18 campos extras (Dashboard Principal)
2. Considerar criar função simplificada `get_dashboard_data_simple()` só para DRE
3. Documentar que função faz muito mais do que DRE precisa

---

## Próximos Passos

1. ✅ Atualizar [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md) com assinaturas corretas
2. ✅ Criar [RPC_FUNCTIONS_UPDATED.md](./RPC_FUNCTIONS_UPDATED.md) com detalhes completos
3. ⏳ Atualizar [BUSINESS_RULES.md](./BUSINESS_RULES.md) (LIMIT 1000, descontos)
4. ⏳ Atualizar [DATA_STRUCTURES.md](./DATA_STRUCTURES.md) (novos campos)
5. ⏳ Criar testes de integração para validar limites
6. ⏳ Considerar criar view `vendas_diarias_por_filial` se não existir

---

## Diferenças Críticas para Lembrar

### get_despesas_hierarquia

```sql
-- ❌ NÃO usar:
WHERE d.data_emissao BETWEEN ...  -- ERRADO
JOIN departamentos_despesas       -- ERRADO
JOIN tipos_despesas               -- ERRADO (plural)

-- ✅ USAR:
WHERE desp.data_despesa BETWEEN ...  -- CORRETO
JOIN departamentos_nivel1            -- CORRETO
JOIN tipos_despesa                   -- CORRETO (singular)
```

### get_dashboard_data

```sql
-- ❌ NÃO esperar apenas:
SELECT total_vendas, total_lucro, margem_lucro

-- ✅ ESPERAR 21 campos:
SELECT
  total_vendas, total_lucro, ticket_medio, margem_lucro,  -- 4
  pa_vendas, pa_lucro, pa_ticket_medio, pa_margem_lucro,  -- 4
  variacao_vendas_mes, variacao_lucro_mes, variacao_ticket_mes, variacao_margem_mes,  -- 4
  variacao_vendas_ano, variacao_lucro_ano, variacao_ticket_ano, variacao_margem_ano,  -- 4
  ytd_vendas, ytd_vendas_ano_anterior, ytd_variacao_percent,  -- 3
  grafico_vendas  -- 1 (JSONB)
```

---

**Data**: 2025-01-11
**Responsável**: Documentação Técnica
**Versão**: 2.0.0

---

## 2025-01-11 - Indicadores % TD, % TDF e % RB em Todas as Colunas

### Alteração Implementada

**Feature**: Adicionados indicadores % TD (% Total Despesas), % TDF (% Total Despesas da Filial) e % RB (% Receita Bruta) em todas as colunas de valores

**Descrição**:
- Exibição de dois percentuais abaixo do valor em cada célula
- **Coluna Total**:
  - **% TD**: Percentual em relação ao Total de Despesas geral
    - `(Valor da linha / Total geral) × 100`
  - **% RB**: Percentual em relação à Receita Bruta
    - `(Valor / Receita Bruta) × 100`
- **Colunas de Filiais**:
  - **% TDF**: Percentual em relação ao Total de Despesas daquela Filial específica
    - `(Valor da filial / Total de Despesas da Filial) × 100`
  - **% RB**: Percentual em relação à Receita Bruta
    - `(Valor / Receita Bruta) × 100`
- Ambos exibidos na mesma célula, sem necessidade de colunas extras
- Formato consistente em todas as colunas

**Arquivos Modificados**:

1. **[columns.tsx](../../../src/components/despesas/columns.tsx)**
   - Adicionado parâmetro `receitaBruta` na função `createColumns` (linha 44)
   - Adicionado parâmetro `branchTotals` na função `createColumns` (linha 45)
   - Modificada célula da coluna "Total" (linhas 126-148)
     - Exibe % TD e % RB
   - Modificada célula das colunas de Filiais (linhas 176-211)
     - Exibe % TDF (em vez de % TD) e % RB
     - Calcula % TDF usando total específico da filial
   - % TD/TDF exibido em cor padrão (muted-foreground)
   - % RB exibido em cor laranja para destacar
   - Ambos com 2 casas decimais e vírgula separadora
   - Removida função `calculateDifference` (não mais utilizada)

2. **[page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx)**
   - Adicionado cálculo de `branchTotals` extraído da linha total (linhas 665-667)
   - Passado `receitaBruta` e `branchTotals` para `createColumns` (linha 679)
   - Atualizada legenda no rodapé (linhas 686-690): "TD = Total de Despesas | TDF = Total Despesas da Filial | RB = Receita Bruta"

**Visual da Tabela**:
```
┌──────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Descrição        │ Total                │ Filial 1             │ Filial 2             │
├──────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│ TOTAL DESPESAS   │ R$ 10.000,00         │ R$ 5.000,00          │ R$ 5.000,00          │
│                  │ % TD: 100,00% (cinza)│ % TDF: 100,00% (=)   │ % TDF: 100,00% (=)   │
│                  │ % RB: 5,50% (laranja)│ % RB: 2,75% (laranja)│ % RB: 2,75% (laranja)│
├──────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│ DESPESAS FIXAS   │ R$ 7.000,00          │ R$ 3.500,00          │ R$ 3.500,00          │
│                  │ % TD: 70,00% (cinza) │ % TDF: 70,00% (=)    │ % TDF: 70,00% (=)    │
│                  │ % RB: 3,85% (laranja)│ % RB: 1,93% (laranja)│ % RB: 1,93% (laranja)│
├──────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│   Energia        │ R$ 3.500,00          │ R$ 1.750,00          │ R$ 1.750,00          │
│                  │ % TD: 35,00% (cinza) │ % TDF: 35,00% (=)    │ % TDF: 35,00% (=)    │
│                  │ % RB: 1,93% (laranja)│ % RB: 0,96% (laranja)│ % RB: 0,96% (laranja)│
├──────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│   Aluguel        │ R$ 2.000,00          │ R$ 500,00            │ R$ 1.500,00          │
│                  │ % TD: 20,00% (cinza) │ % TDF: 10,00% (azul) │ % TDF: 30,00% (verm) │
│                  │ % RB: 1,10% (laranja)│ % RB: 0,27% (laranja)│ % RB: 0,82% (laranja)│
└──────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

Legenda:
- TD = Total de Despesas | TDF = Total Despesas da Filial | RB = Receita Bruta
- Cores % TDF: Azul (< média) | Vermelho (> média) | Cinza (= média)
```

**Exemplo de interpretação das cores**:
- Linha "Aluguel", Filial 1: % TDF 10,00% **AZUL** (menor que % TD 20,00%)
  - Significa: Aluguel representa apenas 10% das despesas da Filial 1, quando no geral representa 20%
  - **Indicador positivo**: Esta filial gasta proporcionalmente menos com aluguel

- Linha "Aluguel", Filial 2: % TDF 30,00% **VERMELHO** (maior que % TD 20,00%)
  - Significa: Aluguel representa 30% das despesas da Filial 2, quando no geral representa 20%
  - **Indicador de atenção**: Esta filial gasta proporcionalmente mais com aluguel

**Diferença entre % TD e % TDF**:
- **% TD** (na coluna Total): Compara o valor da linha com o Total Geral de todas as filiais
- **% TDF** (nas colunas de Filiais): Compara o valor da linha com o Total de Despesas daquela filial específica
- Exemplo: Se uma despesa de R$ 1.750,00 representa 17,50% do total de R$ 10.000,00 (todas as filiais), ela representa 35,00% do total de R$ 5.000,00 daquela filial específica

**Regra de Negócio**:
- RN-RB-001: Se Receita Bruta = 0, % RB exibe "0,00%"
- RN-RB-002: Se Total = 0, % TD/TDF exibe "0,00%"
- RN-RB-003: % TD em cor padrão (text-muted-foreground) na coluna Total
- RN-RB-004: % RB em cor laranja (`text-orange-600 dark:text-orange-400`) em todas as colunas
- RN-RB-005: Formato: 2 casas decimais com vírgula (ex: "5,50%")
- RN-RB-006: Espaçamento vertical entre os dois percentuais (`space-y-0.5`)
- RN-RB-007: Ambos os indicadores em font-size 10px (`text-[10px]`)
- RN-RB-008: % TD aplicado na coluna Total, % TDF aplicado nas colunas de Filiais
- RN-RB-009: % RB aplicado em TODAS as colunas de valores (Total + Filiais)
- RN-RB-010: % TDF usa o total da linha "TOTAL DESPESAS" da filial específica como base
- RN-RB-011: **Cores do % TDF** (nas colunas de Filiais):
  - **Azul** (`text-blue-600 dark:text-blue-400`): % TDF < % TD (despesa abaixo da média geral)
  - **Vermelho** (`text-red-600 dark:text-red-400`): % TDF > % TD (despesa acima da média geral)
  - **Padrão** (`text-muted-foreground`): % TDF = % TD (despesa igual à média geral)

**Impacto**: ✅ BAIXO
- Apenas visual (modificação nas células de valores)
- Não adiciona colunas extras
- Não altera cálculos existentes
- Não requer alterações em RPC functions
- Compatível com dados existentes
- Melhora a legibilidade com informações consolidadas em todas as filiais
- % TDF fornece análise mais precisa do peso de cada despesa dentro da filial específica
- Cores do % TDF facilitam identificação rápida de despesas acima/abaixo da média
- Remove comparação "vs média" (substituída por % TD/TDF e % RB)

**Benefícios das Cores**:
1. **Identificação Visual Rápida**: Cores permitem identificar imediatamente quais filiais têm despesas desproporcionais
2. **Análise Comparativa**: Facilita comparação entre filiais e identificação de outliers
3. **Tomada de Decisão**: Gestores podem priorizar ações em despesas vermelhas (acima da média)
4. **Benchmarking**: Despesas azuis indicam filiais com melhor performance naquela categoria

**Versão**: 2.3.0
