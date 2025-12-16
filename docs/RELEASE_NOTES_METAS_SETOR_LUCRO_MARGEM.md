# Release Notes - Módulo Metas por Setor

## Versão 1.1.0 - Lucro Bruto e Margem Bruta

**Data:** 16 de Dezembro de 2025

---

## Resumo

Adição de informações de **Lucro Bruto** e **Margem Bruta** no módulo de Metas por Setor, seguindo a mesma implementação feita em Metas Mensais.

---

## Novas Funcionalidades

### 1. Novo Card "Lucro e Margem"

Adicionado um terceiro card na seção de resumo do período, exibindo:

- **Lucro Bruto**: Valor total do lucro no período (Receita Líquida - Custo)
- **Margem Bruta**: Percentual de margem sobre a receita líquida
- **Custo Total**: Valor total do custo das mercadorias vendidas

O layout dos cards foi ajustado de 2 para 3 colunas para acomodar o novo card.

### 2. Novas Colunas na Tabela de Metas

Duas novas colunas foram adicionadas ao final da tabela de acompanhamento:

| Coluna | Descrição |
|--------|-----------|
| **Lucro B.** | Lucro Bruto do dia (Receita - Custo) |
| **Margem B.%** | Margem Bruta percentual do dia |

As colunas aparecem tanto na linha agregada por data quanto nas sub-linhas por filial.

### 3. Cálculo Automático de Custo e Lucro

O sistema agora calcula automaticamente ao clicar em "Atualizar Valores":

- **Custo Realizado**: `SUM(quantidade × custo_compra)` da tabela de vendas (filtrado por departamentos do setor)
- **Lucro Realizado**: `valor_realizado - custo_realizado`
- **Margem Bruta**: `(lucro_realizado / valor_realizado) × 100`

---

## Fórmulas Utilizadas

```
Receita Líquida = Vendas - Descontos
Custo = SUM(quantidade × custo_compra) [filtrado por departamentos do setor]
Lucro Bruto = Receita Líquida - Custo
Margem Bruta (%) = (Lucro Bruto / Receita Líquida) × 100
```

---

## Alterações no Banco de Dados

### Novas Colunas

Adicionadas 2 novas colunas na tabela `metas_setor` em todos os schemas:

```sql
custo_realizado NUMERIC(15, 2) DEFAULT 0
lucro_realizado NUMERIC(15, 2) DEFAULT 0
```

### Funções RPC Atualizadas

1. **`atualizar_valores_realizados_metas_setor`**
   - CTE `vendas_por_data_filial` atualizada para calcular `total_custo` e `total_lucro`
   - UPDATE agora persiste `custo_realizado` e `lucro_realizado`
   - Mantém filtro por departamentos do setor via `departments_level_1`

2. **`get_metas_setor_report_optimized`**
   - JSON de cada filial agora inclui `custo_realizado` e `lucro_realizado`

---

## Arquivos Modificados

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| `supabase/migrations/20251216_add_lucro_margem_metas_setor.sql` | SQL | Nova migration |
| `src/app/(dashboard)/metas/setor/page.tsx` | TSX | Interfaces, Card, Tabela, Cálculos |

---

## Como Usar

1. **Visualizar Lucro e Margem do Período**
   - Acesse o módulo Metas > Por Setor
   - Selecione um setor e filiais
   - O novo card "Lucro e Margem" exibe os totais consolidados do setor

2. **Acompanhar por Dia**
   - Na tabela de metas, as colunas "Lucro B." e "Margem B.%" mostram os valores diários
   - Expanda uma data (clicando na linha) para ver o detalhamento por filial

3. **Atualizar Valores**
   - Clique no botão "Atualizar Valores" para recalcular custo e lucro com base nas vendas mais recentes

---

## Diferenças em Relação a Metas Mensais

| Aspecto | Metas Mensais | Metas por Setor |
|---------|---------------|-----------------|
| Estrutura dados | Array simples | Agrupado por data → filiais |
| Filtro | Por filial | Por setor (departamentos) |
| JOIN vendas | Direto | Via produtos → departments_level_1 |
| Cálculo custo | Todas as vendas | Apenas vendas dos departamentos do setor |

---

## Observações Técnicas

- Os valores de Lucro e Margem são exibidos com cor padrão (sem indicadores verde/vermelho)
- Dias futuros ou sem vendas exibem "-" nas colunas de Lucro e Margem
- O cálculo de custo considera apenas as vendas dos departamentos associados ao setor selecionado
- A CTE existente foi otimizada para incluir os novos campos sem impacto na performance

---

## Requisitos de Implantação

Para ativar esta funcionalidade, execute a migration SQL no banco de dados:

```bash
# Via Supabase Dashboard > SQL Editor
# Cole o conteúdo de: supabase/migrations/20251216_add_lucro_margem_metas_setor.sql
```

A migration irá:
1. Adicionar as colunas em todos os schemas (okilao, saoluiz, paraiso, lucia, sol)
2. Atualizar a função `atualizar_valores_realizados_metas_setor`
3. Atualizar a função `get_metas_setor_report_optimized`

---

## Compatibilidade

- **Versão mínima Next.js**: 15.5.x
- **Versão mínima Supabase**: Compatível com versão atual
- **Schemas suportados**: okilao, saoluiz, paraiso, lucia, sol
