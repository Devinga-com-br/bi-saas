# Regras de Negócio - Vendas por Curva

> Status: ✅ Implementado

## Objetivo

Definir as regras de negócio do relatório **Vendas por Curva**, incluindo critérios de seleção, cálculos, hierarquia e ordenação dos resultados.

## Escopo do Relatório

O relatório consolida vendas por produto e exibe a classificação por **curva de venda** e **curva de lucro**, organizando os dados em hierarquia de departamentos (nível 3 → nível 2 → nível 1 → produto).

## Regras de Negócio

### RN-VAL-001 — Período obrigatório (mês e ano)
- O relatório sempre trabalha com **um mês fechado**.
- Intervalo de dados: do **primeiro dia do mês** até **o primeiro dia do mês seguinte** (exclusivo).
  - **Exceção**: quando o filtro é o **mês/ano atual**, o comparativo do ano anterior considera apenas o período já fechado (D-1), espelhando o corte atual.

### RN-VAL-002 — Filial obrigatória
- Deve existir **ao menos uma filial** selecionada.
- Se o usuário possui restrição de filiais, o relatório retorna apenas as filiais autorizadas.

### RN-VAL-003 — Vendas válidas
- Apenas vendas com **valor_vendas > 0** entram no cálculo.
- Apenas produtos **ativos** são considerados.

### RN-HIER-001 — Hierarquia de departamentos
- O agrupamento segue:
  - **Nível 3**: `departments_level_3`
  - **Nível 2**: `departments_level_2`
  - **Nível 1**: `departments_level_1`
  - **Produto**
- Quando não há descrição para nível 2 ou 3, usar fallback:
  - Nível 3: `Sem Nível 3`
  - Nível 2: `Sem Nível 2`

### RN-CALC-001 — Quantidade vendida
- **Quantidade** do produto = `SUM(vendas.quantidade)` no período.

### RN-CALC-002 — Valor de vendas
- **Valor Vendas** do produto = `SUM(vendas.valor_vendas)` no período.

### RN-CALC-003 — Lucro bruto
- **Lucro** do produto = `SUM(valor_vendas - (custo_compra * quantidade))`.

### RN-CALC-004 — Percentual de lucro
- **% Lucro** = `(lucro / valor_vendas) * 100`.
- Se `valor_vendas = 0`, o percentual é **0**.

### RN-CURVA-001 — Curva de venda
- A curva de venda é lida de `produtos.curva_abcd`.
- Se o campo estiver **nulo**, usar **'D'**.
- **Não existe cálculo de curva ABC** no relatório — é dado cadastral.

### RN-CURVA-002 — Curva de lucro
- A curva de lucro é lida de `produtos.curva_lucro`.
- Se o campo estiver **nulo**, usar **'D'**.
- **Não existe cálculo de curva de lucro** no relatório — é dado cadastral.

### RN-COMP-001 — Comparativo de ano anterior (mês atual)
- Se o mês/ano filtrado for **igual ao mês vigente**, o comparativo do ano anterior usa **somente o período já fechado** (D-1).
- Exemplo em 2026-01-19:
  - Período atual: 2026-01-01 a 2026-01-18
  - Comparativo: 2025-01-01 a 2025-01-18

### RN-CALC-005 — Totais por nível
- Para cada nível (3, 2 e 1), somar:
  - **total_vendas** = soma dos produtos
  - **total_lucro** = soma dos produtos
  - **margem** = `(total_lucro / total_vendas) * 100`

### RN-ORD-001 — Ordenação de departamentos
- Nível 3, 2 e 1 são ordenados por **total_vendas DESC**.

### RN-ORD-002 — Ordenação de produtos
- Dentro do nível 1, ordenar por:
  1. `curva_venda` na sequência **A → B → C → D → outros**
  2. `total_valor_vendas DESC`

### RN-PAG-001 — Paginação por departamento nível 3
- A paginação é feita com base no total de **departamentos nível 3**.
- Somente os **deptos nível 3** da página atual são retornados com seus produtos.

## Casos Especiais e Exceções

- Produto sem curva definida recebe `D`.
- Departamentos nível 2 ou 3 inexistentes recebem o label `Sem Nível 2/3`.
- Vendas sem valor positivo são ignoradas.

## Exemplos

### Exemplo 1 — Curva definida
- Produto: `curva_abcd = 'A'`, `curva_lucro = 'B'`
- Resultado: curva_venda = `A`, curva_lucro = `B`

### Exemplo 2 — Curva ausente
- Produto: `curva_abcd = null`
- Resultado: curva_venda = `D`

### Exemplo 3 — Percentual de lucro
- Vendas = 1.000,00
- Lucro = 250,00
- % Lucro = 25,00%

## Tabelas Envolvidas

- `demo.vendas`
- `demo.produtos`
- `demo.departments_level_1`
- `demo.departments_level_2`
- `demo.departments_level_3`

## Funções Envolvidas

- `public.get_venda_curva_report`

## Arquivos Relacionados

- API: `src/app/api/relatorios/venda-curva/route.ts`
- UI: `src/app/(dashboard)/relatorios/venda-curva/page.tsx`
