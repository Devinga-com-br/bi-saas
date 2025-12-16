# Release Notes - Módulo Metas Mensais

## Versão 1.1.0 - Lucro Bruto e Margem Bruta

**Data:** 16 de Dezembro de 2025

---

## Resumo

Adição de informações de **Lucro Bruto** e **Margem Bruta** no módulo de Metas Mensais, permitindo acompanhamento completo da rentabilidade junto com as metas de vendas.

---

## Novas Funcionalidades

### 1. Novo Card "Lucro e Margem"

Adicionado um terceiro card na seção de resumo do período, exibindo:

- **Lucro Bruto**: Valor total do lucro no período (Receita Líquida - Custo)
- **Margem Bruta**: Percentual de margem sobre a receita líquida
- **Custo Total**: Valor total do custo das mercadorias vendidas

O layout dos cards foi ajustado de 2 para 3 colunas para acomodar o novo card.

### 2. Novas Colunas na Tabela de Metas Diárias

Duas novas colunas foram adicionadas ao final da tabela de acompanhamento diário:

| Coluna | Descrição |
|--------|-----------|
| **Lucro B.** | Lucro Bruto do dia (Receita - Custo) |
| **Margem B.%** | Margem Bruta percentual do dia |

As colunas aparecem tanto na visualização de múltiplas filiais (agrupada por data) quanto na visualização de filial única.

### 3. Cálculo Automático de Custo e Lucro

O sistema agora calcula automaticamente ao clicar em "Atualizar Valores":

- **Custo Realizado**: `SUM(quantidade × custo_compra)` da tabela de vendas
- **Lucro Realizado**: `valor_realizado - custo_realizado`
- **Margem Bruta**: `(lucro_realizado / valor_realizado) × 100`

---

## Fórmulas Utilizadas

```
Receita Líquida = Vendas - Descontos
Custo = SUM(quantidade × custo_compra)
Lucro Bruto = Receita Líquida - Custo
Margem Bruta (%) = (Lucro Bruto / Receita Líquida) × 100
```

---

## Alterações no Banco de Dados

### Novas Colunas

Adicionadas 2 novas colunas na tabela `metas_mensais` em todos os schemas:

```sql
custo_realizado NUMERIC(15, 2) DEFAULT 0
lucro_realizado NUMERIC(15, 2) DEFAULT 0
```

### Funções RPC Atualizadas

1. **`atualizar_valores_realizados_metas`**
   - Agora calcula e persiste `custo_realizado` e `lucro_realizado`
   - Busca custo da tabela `vendas` usando `quantidade × custo_compra`

2. **`get_metas_mensais_report`**
   - Retorna novos campos por meta: `custo_realizado`, `lucro_realizado`
   - Retorna novos totais: `total_custo`, `total_lucro`, `margem_bruta`

---

## Arquivos Modificados

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| `supabase/migrations/20251216_add_lucro_margem_metas_mensais.sql` | SQL | Nova migration |
| `src/app/(dashboard)/metas/mensal/page.tsx` | TSX | Interfaces, Card e Tabelas |

---

## Como Usar

1. **Visualizar Lucro e Margem do Período**
   - Acesse o módulo Metas > Mensal
   - O novo card "Lucro e Margem" exibe os totais consolidados

2. **Acompanhar por Dia**
   - Na tabela "Metas Diárias", as colunas "Lucro B." e "Margem B.%" mostram os valores diários
   - Expanda uma data (clicando na linha) para ver o detalhamento por filial

3. **Atualizar Valores**
   - Clique no botão "Atualizar Valores" para recalcular custo e lucro com base nas vendas mais recentes

---

## Observações Técnicas

- Os valores de Lucro e Margem são exibidos com cor padrão (sem indicadores verde/vermelho)
- Dias futuros ou sem vendas exibem "-" nas colunas de Lucro e Margem
- O cálculo considera os descontos de venda (já subtraídos do `valor_realizado`)
- A margem é calculada sobre a Receita Líquida (após descontos)

---

## Requisitos de Implantação

Para ativar esta funcionalidade, execute a migration SQL no banco de dados:

```bash
# Via Supabase Dashboard > SQL Editor
# Cole o conteúdo de: supabase/migrations/20251216_add_lucro_margem_metas_mensais.sql
```

A migration irá:
1. Adicionar as colunas em todos os schemas (okilao, saoluiz, paraiso, lucia, sol)
2. Atualizar a função `atualizar_valores_realizados_metas`
3. Atualizar a função `get_metas_mensais_report`

---

## Compatibilidade

- **Versão mínima Next.js**: 15.5.x
- **Versão mínima Supabase**: Compatível com versão atual
- **Schemas suportados**: okilao, saoluiz, paraiso, lucia, sol
