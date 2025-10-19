# Módulo de Despesas - Implementação com Percentuais

**Data:** 2025-10-19

## Visão Geral

Módulo completo de análise de despesas com visualização hierárquica, comparação entre filiais e cálculo de percentuais de participação.

## Funcionalidades Implementadas

### 1. Filtros Automáticos
- **Filiais**: Seleção múltipla com todas as filiais marcadas por padrão
- **Data Inicial e Final**: Seleção de período via calendário
- **Atualização Automática**: Dados recarregam ao alterar qualquer filtro (sem botão "Aplicar")

### 2. Gráfico de Despesas por Mês
- Exibe todos os 12 meses do ano corrente
- Barras com dados preenchidos conforme período selecionado
- Cores: Verde neon padrão do dashboard (`hsl(142, 76%, 45%)`)
- Legendas em português: Janeiro, Fevereiro, Março, etc.
- Tooltip com valor formatado em reais

### 3. Cards Totalizadores
- **Total de Despesas**: Valor total e quantidade de registros
- **Departamentos**: Quantidade de departamentos e tipos de despesa
- **Média por Departamento**: Distribuição média
- **Filiais Selecionadas**: Quantidade de filiais na comparação

### 4. Tabela de Comparação com Percentuais

#### Estrutura de Colunas
```
┌────────────────┬─────────┬──────────┬──────────┬──────────┐
│ Descrição      │ Total   │ Filial 1 │ Filial 2 │ Filial 3 │
│                │ + %     │  + %     │  + %     │  + %     │
└────────────────┴─────────┴──────────┴──────────┴──────────┘
```

#### Hierarquia de 3 Níveis
1. **Departamento** (expansível)
   - Valor total e % do total geral
   - % por filial do total da filial

2. **Tipo de Despesa** (expansível dentro do departamento)
   - Valor total e % do total geral
   - % por filial do total da filial

3. **Despesa Individual**
   - Data, descrição, nota fiscal
   - Valor total e % do total geral
   - % por filial do total da filial

#### Cálculo de Percentuais
- **Coluna Total**: Percentual em relação ao **Total Geral de Despesas**
- **Colunas de Filial**: Percentual em relação ao **Total da Filial**
- Formato: `XX,XX%` (duas casas decimais)

#### Linha Destacada "TOTAL DESPESAS"
- Primeira linha da tabela
- Background: `bg-primary/10`
- Exibe:
  - Valor total geral
  - Valor total por filial
- Referência de 100% para os cálculos

#### Estilização Visual
- **Coluna Descrição**: Fundo padrão (background)
- **Coluna Total**: Fundo padrão (background), valores alinhados à direita
- **Colunas de Filiais**: Alternância entre:
  - Par (0, 2, 4...): `bg-[hsl(142,76%,45%)]/20` (verde neon 20% opacidade)
  - Ímpar (1, 3, 5...): Fundo padrão
- **Fontes**: Mesmo estilo da tabela do Dashboard (text-sm, text-xs)
- **Sticky Columns**: Descrição e Total fixas ao scroll horizontal

### 5. Ordenação
- **Departamentos**: Ordenados por valor total (maior → menor)
- **Tipos de Despesa**: Ordenados por valor total dentro do departamento
- **Despesas Individuais**: Ordenadas por valor total dentro do tipo

## Estrutura de Arquivos

```
src/
├── app/(dashboard)/despesas/
│   └── page.tsx                      # Página principal do módulo
├── components/despesas/
│   └── chart-despesas.tsx            # Componente do gráfico
└── api/despesas/
    └── hierarquia/route.ts           # API endpoint
```

## Queries SQL

### Função RPC: `get_despesas_hierarquia`
```sql
CREATE OR REPLACE FUNCTION {schema}.get_despesas_hierarquia(
  p_filial_id INTEGER,
  p_data_inicial DATE,
  p_data_final DATE
)
RETURNS TABLE (
  -- Departamento
  dept_id INTEGER,
  dept_descricao TEXT,
  -- Tipo
  tipo_id INTEGER,
  tipo_descricao TEXT,
  -- Despesa
  data_despesa DATE,
  data_emissao DATE,
  descricao_despesa TEXT,
  fornecedor_id TEXT,
  numero_nota BIGINT,
  serie_nota TEXT,
  valor NUMERIC,
  observacao TEXT
)
```

## Cálculos de Percentuais

### Exemplo Prático
**Total Geral:** R$ 1.000.000,00
**Total Filial 1:** R$ 300.000,00
**Despesa X:** R$ 50.000,00 (na Filial 1)

- **Coluna Total:** 50.000 / 1.000.000 = 5,00%
- **Coluna Filial 1:** 50.000 / 300.000 = 16,67%

## Responsividade

- **Desktop**: Scroll horizontal para muitas filiais
- **Mobile**: Colunas fixas (Descrição e Total) mantêm contexto
- **Tablet**: Layout adaptável com espaçamento reduzido

## Performance

- **Consolidação no Frontend**: Dados de múltiplas filiais são consolidados em memória
- **Lazy Loading**: Despesas só são renderizadas quando tipos são expandidos
- **Memoização**: Cálculos de totais e percentuais são otimizados

## Melhorias Futuras Sugeridas

1. **Exportação Excel**
   - Incluir percentuais nas colunas
   - Manter hierarquia com indentação

2. **Filtros Adicionais**
   - Departamento específico
   - Tipo de despesa específico
   - Faixa de valor

3. **Gráficos Adicionais**
   - Pizza por departamento
   - Comparativo ano a ano
   - Evolução mensal por departamento

4. **Drill-down**
   - Detalhes da nota fiscal
   - Histórico do fornecedor

## Troubleshooting

### Problema: Percentuais incorretos
- Verificar se `calculatePercentage` está usando o total correto
- Total Geral: `data.totalizador.valorTotal`
- Total Filial: Soma de todos departamentos daquela filial

### Problema: Colunas desalinhadas
- Verificar ordem do array `data.filiais` (deve ser consistente)
- Garantir que `valores_filiais` tem as mesmas chaves

### Problema: Dados não carregam
- Verificar se schema está exposto no Supabase
- Verificar se função RPC existe no schema correto
- Verificar nomes das colunas (usar `id_tipo_despesa` não `tipo_despesa_id`)

## Checklist de Implementação

- [x] Filtros automáticos (sem botão Aplicar)
- [x] Gráfico com 12 meses do ano em PT-BR
- [x] Cores padrão do dashboard
- [x] Tabela hierárquica (3 níveis)
- [x] Coluna Total com valores somados
- [x] Linha destacada "TOTAL DESPESAS"
- [x] Cálculo de percentuais
- [x] Percentual na coluna Total (% do total geral)
- [x] Percentual nas colunas de filiais (% do total da filial)
- [x] Estilização com colunas listradas
- [x] Responsividade mobile/tablet/desktop
- [x] Sticky columns (Descrição e Total)

---

**Status:** ✅ Implementação Completa
