# DRE Gerencial - Índice de Funções e Componentes

Este documento lista TODAS as funções, componentes, hooks e APIs utilizadas no módulo DRE Gerencial.

## Funções RPC (Supabase PostgreSQL)

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `get_despesas_hierarquia` | SQL Migration | Busca despesas com hierarquia (Dept→Tipo→Despesa) por período e filial |
| `get_dashboard_data` | SQL Migration | Busca indicadores de vendas e lucros (Receita Bruta, Lucro Bruto, Margem) |

**Detalhes**: [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)

---

## API Routes (Next.js)

| Rota | Método | Arquivo | Linha | Descrição |
|------|--------|---------|-------|-----------|
| `/api/dre-gerencial/hierarquia` | GET | [route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | 5-251 | Retorna hierarquia de despesas processada |
| `/api/dashboard` | GET | [route.ts](../../../src/app/api/dashboard/route.ts) | 52-131 | Retorna indicadores do dashboard |

---

## Páginas (Next.js App Router)

| Rota | Arquivo | Linha | Descrição |
|------|---------|-------|-----------|
| `/dre-gerencial` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 92-690 | Página principal do módulo DRE Gerencial |

---

## Componentes React

### Componentes de UI

| Componente | Arquivo | Linha | Responsabilidade |
|------------|---------|-------|------------------|
| `DespesasFilters` | [filters.tsx](../../../src/components/despesas/filters.tsx) | 43-184 | Filtros de filiais, mês e ano com aplicação manual |
| `IndicatorsCards` | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | 34-346 | Cards de indicadores financeiros com comparações PAM/PAA |
| `DataTable` | [data-table.tsx](../../../src/components/despesas/data-table.tsx) | - | Tabela hierárquica expansível com TanStack Table |
| `EmptyState` | [empty-state.tsx](../../../src/components/despesas/empty-state.tsx) | - | Estados vazios (sem dados, sem filtros, erro) |
| `LoadingState` | [loading-state.tsx](../../../src/components/despesas/loading-state.tsx) | - | Estado de carregamento com skeleton |

### Funções de Configuração

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `createColumns` | [columns.tsx](../../../src/components/despesas/columns.tsx) | 53-224 | Factory de colunas dinâmicas para DataTable |

---

## Hooks

### Hooks de Contexto

| Hook | Arquivo | Retorno | Descrição |
|------|---------|---------|-----------|
| `useTenantContext` | [tenant-context.tsx](../../../src/contexts/tenant-context.tsx) | `{ currentTenant, userProfile }` | Contexto do tenant e usuário atual |

### Hooks de Dados

| Hook | Arquivo | Retorno | Descrição |
|------|---------|---------|-----------|
| `useBranchesOptions` | [use-branches.ts](../../../src/hooks/use-branches.ts) | `{ branchOptions, isLoading }` | Busca lista de filiais disponíveis |

---

## Funções Principais da Página

### Funções de Busca de Dados

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `handleFilter` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 138-178 | Coordena busca de despesas e indicadores |
| `fetchDespesasPeriodo` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 183-223 | Busca despesas de múltiplas filiais em paralelo |
| `fetchIndicadores` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 226-330 | Busca indicadores de dashboard com comparações |

### Funções de Processamento

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `consolidateData` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 350-491 | Consolida dados de múltiplas filiais em hierarquia |
| `processIndicadores` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 285-310 | Calcula indicadores financeiros derivados |
| `transformToTableData` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 517-597 | Transforma hierarquia em formato para DataTable |

### Funções Auxiliares

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `getDatasMesAno` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 341-348 | Calcula data inicial e final de um mês/ano |
| `getFilialNome` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 511-514 | Retorna nome da filial pelo ID |

---

## Funções de Formatação (Componentes)

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `formatCurrency` | [columns.tsx](../../../src/components/despesas/columns.tsx) | 24-29 | Formata número para moeda brasileira (R$) |
| `formatDate` | [columns.tsx](../../../src/components/despesas/columns.tsx) | 31-38 | Formata string de data para DD/MM/YYYY |
| `calculateDifference` | [columns.tsx](../../../src/components/despesas/columns.tsx) | 41-51 | Calcula diferença percentual vs média |
| `formatCurrency` (IndicatorsCards) | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | 35-40 | Formata número para moeda brasileira |
| `calculateVariation` | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | 46-53 | Calcula variação percentual entre períodos |

---

## Funções da API

### API: Hierarquia

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `GET` (handler) | [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | 5-251 | Handler principal da rota |
| Validação de autenticação | [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | 10-13 | Verifica se usuário está autenticado |
| Validação de parâmetros | [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | 23-28 | Valida parâmetros obrigatórios |
| Validação de autorização | [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | 30-94 | Verifica acesso do usuário à filial |
| Processamento hierárquico | [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | 125-203 | Processa dados RPC em hierarquia |

### API: Dashboard

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `GET` (handler) | [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | 52-131 | Handler principal da rota |
| `validateSchemaAccess` | [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | 19-50 | Valida acesso do usuário ao schema |

---

## Funções de Utilidade (Lib)

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `getUserAuthorizedBranchCodes` | [authorized-branches.ts](../../../src/lib/authorized-branches.ts) | Retorna códigos de filiais autorizadas para o usuário |
| `logModuleAccess` | [audit.ts](../../../src/lib/audit.ts) | Registra log de acesso ao módulo |

---

## Interfaces TypeScript

### Interfaces Principais

| Interface | Arquivo | Linha | Descrição |
|-----------|---------|-------|-----------|
| `DespesaPorFilial` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 21-30 | Despesa individual com valores por filial |
| `TipoPorFilial` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 32-37 | Tipo de despesa com despesas agrupadas |
| `DepartamentoPorFilial` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 39-44 | Departamento com tipos agrupados |
| `GraficoData` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 46-49 | Dados do gráfico mensal |
| `ReportData` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 51-62 | Estrutura completa do relatório |
| `IndicadoresData` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 64-72 | Indicadores financeiros calculados |
| `DashboardData` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 74-78 | Dados brutos do dashboard |
| `ComparacaoIndicadores` | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 80-90 | Comparação temporal de indicadores |

### Interfaces de Componentes

| Interface | Arquivo | Linha | Descrição |
|-----------|---------|-------|-----------|
| `DespesaRow` | [columns.tsx](../../../src/components/despesas/columns.tsx) | 8-22 | Linha da tabela hierárquica |
| `FilialOption` | [filters.tsx](../../../src/components/filters/index.ts) | - | Opção de filial no multi-select |
| `IndicadoresData` (IndicatorsCards) | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | 7-15 | Indicadores financeiros |
| `ComparacaoIndicadores` (IndicatorsCards) | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | 17-27 | Comparação temporal |
| `IndicatorsCardsProps` | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | 29-32 | Props do componente |

---

## Tipos TypeScript

| Tipo | Arquivo | Linha | Descrição |
|------|---------|-------|-----------|
| `DespesaRow` (type) | [columns.tsx](../../../src/components/despesas/columns.tsx) | 8 | Linha da tabela (também usado como interface) |

---

## Constantes

| Constante | Arquivo | Linha | Valor | Descrição |
|-----------|---------|-------|-------|-----------|
| `MESES` | [filters.tsx](../../../src/components/despesas/filters.tsx) | 11-24 | Array de objetos | Lista de meses (Janeiro a Dezembro) |

---

## Funções de Geração

| Função | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `getAnosDisponiveis` | [filters.tsx](../../../src/components/despesas/filters.tsx) | 26-29 | Gera lista dos últimos 5 anos |

---

## Estados React (useState)

### Estados da Página Principal

| Estado | Tipo | Valor Inicial | Descrição |
|--------|------|---------------|-----------|
| `filiaisSelecionadas` | `FilialOption[]` | `[]` | Filiais selecionadas nos filtros |
| `mes` | `number` | mês anterior | Mês selecionado (0-11) |
| `ano` | `number` | ano do mês anterior | Ano selecionado |
| `data` | `ReportData \| null` | `null` | Dados do período atual |
| `dataPam` | `ReportData \| null` | `null` | Dados do PAM (mês anterior) |
| `dataPaa` | `ReportData \| null` | `null` | Dados do PAA (ano anterior) |
| `indicadores` | `ComparacaoIndicadores \| null` | `null` | Indicadores com comparações |
| `loading` | `boolean` | `false` | Loading de despesas |
| `loadingIndicadores` | `boolean` | `false` | Loading de indicadores |
| `error` | `string` | `''` | Mensagem de erro |

### Estados dos Filtros

| Estado | Tipo | Valor Inicial | Descrição |
|--------|------|---------------|-----------|
| `localFiliais` | `FilialOption[]` | `filiaisSelecionadas` | Filiais selecionadas localmente (não aplicadas) |
| `localMes` | `number` | `mes` | Mês selecionado localmente |
| `localAno` | `number` | `ano` | Ano selecionado localmente |

---

## Efeitos React (useEffect)

| useEffect | Arquivo | Linha | Dependências | Descrição |
|-----------|---------|-------|--------------|-----------|
| Pré-seleção de filiais | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 119-123 | `[isLoadingBranches, branches, filiaisSelecionadas.length]` | Seleciona todas as filiais ao carregar |
| Log de acesso | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 126-135 | `[userProfile?.id, currentTenant?.id, userProfile?.full_name]` | Registra acesso ao módulo |
| Carregamento inicial | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | 333-338 | `[currentTenant?.supabase_schema, filiaisSelecionadas.length, isLoadingBranches, data]` | Busca dados inicialmente |
| Sincronizar filiais (Filtros) | [filters.tsx](../../../src/components/despesas/filters.tsx) | 60-62 | `[filiaisSelecionadas]` | Sincroniza filiais locais com globais |
| Sincronizar mês (Filtros) | [filters.tsx](../../../src/components/despesas/filters.tsx) | 64-66 | `[mes]` | Sincroniza mês local com global |
| Sincronizar ano (Filtros) | [filters.tsx](../../../src/components/despesas/filters.tsx) | 68-70 | `[ano]` | Sincroniza ano local com global |

---

## Schemas de Validação (Zod)

| Schema | Arquivo | Linha | Descrição |
|--------|---------|-------|-----------|
| `querySchema` | [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | 12-17 | Valida parâmetros da API dashboard |

---

## Exportações

### Componentes Exportados

| Exportação | Arquivo | Tipo | Descrição |
|------------|---------|------|-----------|
| `default` (DespesasPage) | [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | Component | Página principal do DRE |
| `DespesasFilters` | [filters.tsx](../../../src/components/despesas/filters.tsx) | Component | Componente de filtros |
| `IndicatorsCards` | [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | Component | Cards de indicadores |
| `createColumns` | [columns.tsx](../../../src/components/despesas/columns.tsx) | Function | Factory de colunas |
| `DespesaRow` | [columns.tsx](../../../src/components/despesas/columns.tsx) | Type | Tipo de linha da tabela |

### API Handlers Exportados

| Exportação | Arquivo | Tipo | Descrição |
|------------|---------|------|-----------|
| `GET` | [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | Function | Handler GET da hierarquia |
| `GET` | [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | Function | Handler GET do dashboard |
| `dynamic` | [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | Config | Configuração de rota dinâmica |
| `revalidate` | [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | Config | Configuração de revalidação |

---

## Resumo Estatístico

### Total por Categoria

| Categoria | Quantidade |
|-----------|------------|
| Funções RPC | 2 |
| API Routes | 2 |
| Páginas | 1 |
| Componentes React | 5 |
| Hooks | 2 |
| Funções de Processamento | 6 |
| Funções de Formatação | 5 |
| Interfaces | 13 |
| Estados React | 13 |
| useEffect | 6 |
| Schemas Zod | 1 |

### Linhas de Código (aproximado)

| Arquivo | Linhas |
|---------|--------|
| [page.tsx](../../../src/app/(dashboard)/dre-gerencial/page.tsx) | ~690 |
| [hierarquia/route.ts](../../../src/app/api/dre-gerencial/hierarquia/route.ts) | ~250 |
| [dashboard/route.ts](../../../src/app/api/dashboard/route.ts) | ~130 |
| [columns.tsx](../../../src/components/despesas/columns.tsx) | ~225 |
| [indicators-cards.tsx](../../../src/components/despesas/indicators-cards.tsx) | ~347 |
| [filters.tsx](../../../src/components/despesas/filters.tsx) | ~185 |
| **Total** | **~1827 linhas** |

---

## Navegação Rápida

- [Funções RPC Detalhadas](./RPC_FUNCTIONS.md)
- [Regras de Negócio](./BUSINESS_RULES.md)
- [Estruturas de Dados](./DATA_STRUCTURES.md)
- [Fluxo de Integração](./INTEGRATION_FLOW.md)
- [Visão Geral](./README.md)

---

## Manutenção

**Última atualização**: 2025-01-11
**Versão**: 1.0.0

Este índice deve ser atualizado sempre que:
- Nova função for adicionada
- Componente for criado/removido
- Interface for modificada
- API route for alterada
