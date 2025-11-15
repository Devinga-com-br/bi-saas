# Dashboard Principal

> Status: ✅ Implementado | Versão: 1.0.0 | Última Atualização: 2025-01-14

## Visão Geral

O Dashboard Principal é o módulo central do BI SaaS, oferecendo uma visão consolidada dos principais indicadores de desempenho do negócio. Apresenta métricas de vendas, lucro, margem e ticket médio com comparações temporais automáticas (mês anterior e ano anterior), além de análise detalhada por filial.

## Funcionalidades

- ✅ **Indicadores KPI**: Vendas totais, lucro, margem e ticket médio
- ✅ **Comparações Temporais**: Automático vs. Período Anterior Mesmo (PAM) e Período Anterior do Ano (PAA)
- ✅ **YTD (Year to Date)**: Acumulado do ano atual vs. ano anterior
- ✅ **Gráfico de Vendas**: Visualização mensal com vendas, despesas e lucro
- ✅ **Análise por Filial**: Tabela detalhada com métricas por filial e variações
- ✅ **Filtros Dinâmicos**: Período customizável e seleção múltipla de filiais
- ✅ **Auditoria**: Log de acesso ao módulo
- ✅ **Autorização por Filial**: Respeita restrições de acesso do usuário

## Componentes Principais

### Frontend

- **Página Principal**: [src/app/(dashboard)/dashboard/page.tsx](../../../src/app/(dashboard)/dashboard/page.tsx)
- **Componentes**:
  - `CardMetric`: [src/components/dashboard/card-metric.tsx](../../../src/components/dashboard/card-metric.tsx)
  - `ChartVendas`: [src/components/dashboard/chart-vendas.tsx](../../../src/components/dashboard/chart-vendas.tsx)
  - `DashboardShell`: [src/components/dashboard/dashboard-shell.tsx](../../../src/components/dashboard/dashboard-shell.tsx)
  - `PeriodFilter`: [src/components/despesas/period-filter.tsx](../../../src/components/despesas/period-filter.tsx)
- **Hooks**:
  - `useTenantContext`: Contexto do tenant
  - `useBranchesOptions`: Opções de filiais
  - `useSWR`: Cache e atualização de dados

### Backend

- **API Routes**:
  - `/api/dashboard` - Dados principais do dashboard: [src/app/api/dashboard/route.ts](../../../src/app/api/dashboard/route.ts)
  - `/api/dashboard/vendas-por-filial` - Análise detalhada por filial: [src/app/api/dashboard/vendas-por-filial/route.ts](../../../src/app/api/dashboard/vendas-por-filial/route.ts)
  - `/api/charts/sales-by-month` - Dados do gráfico: [src/app/api/charts/sales-by-month/route.ts](../../../src/app/api/charts/sales-by-month/route.ts)

### Database

- **RPC Functions**:
  - `get_dashboard_data` - Indicadores principais com comparações temporais
  - `get_vendas_por_filial` - Análise detalhada por filial
  - `get_sales_by_month_chart` - Dados de vendas mensais para gráfico
  - `get_expenses_by_month_chart` - Dados de despesas mensais para gráfico
  - `get_lucro_by_month_chart` - Dados de lucro mensal para gráfico
  - `insert_audit_log` - Log de auditoria

- **Tabelas Utilizadas**:
  - `{schema}.vendas_diarias_por_filial` - Dados agregados de vendas
  - `{schema}.descontos_venda` - Descontos aplicados (opcional)
  - `{schema}.despesas` - Despesas do período
  - `public.user_profiles` - Perfil e permissões do usuário
  - `public.tenants` - Informações do tenant

## Estrutura de Dados

Ver detalhes completos em [DATA_STRUCTURES.md](./DATA_STRUCTURES.md)

Principais interfaces:
- `DashboardData` - Resposta da API principal (21 campos)
- `VendaPorFilial` - Dados de vendas por filial (18 campos)
- `SalesChartData` - Dados do gráfico mensal

## Fluxo de Integração

Ver diagrama completo em [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md)

```
Usuário → Dashboard Page → SWR → API Routes → RPC Functions → Database → Response
```

## Regras de Negócio

Ver detalhes completos em [BUSINESS_RULES.md](./BUSINESS_RULES.md)

Principais regras:
- **RN-TEMP-001**: Cálculo automático de PAM (Período Anterior Mesmo)
- **RN-TEMP-002**: Cálculo automático de PAA (Período Anterior do Ano)
- **RN-YTD-001**: Year to Date - acumulado do início do ano
- **RN-FILT-001**: Filtro por período customizável
- **RN-FILT-002**: Filtro múltiplo de filiais
- **RN-AUTH-001**: Autorização por filiais do usuário

## Funções RPC

Ver documentação completa em [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)

Funções principais:
1. `get_dashboard_data` - Busca todos os indicadores KPI
2. `get_vendas_por_filial` - Análise detalhada por filial
3. `get_sales_by_month_chart` - Dados para gráfico de vendas

## Permissões

| Ação | Permissão Necessária | Função |
|------|---------------------|--------|
| Visualizar Dashboard | Usuário autenticado | Todos |
| Filtrar por Filial | Filiais autorizadas | `getUserAuthorizedBranchCodes` |
| Visualizar Todas as Filiais | `branch_access = null` | Admin/Gestor |
| Log de Auditoria | Automático | Sistema |

## Navegação

- **Rota**: `/dashboard`
- **Proteção**: Middleware de autenticação
- **Breadcrumb**: Dashboard

## Índice de Documentação

1. [README.md](./README.md) - Visão geral (este arquivo)
2. [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Regras de negócio detalhadas
3. [DATA_STRUCTURES.md](./DATA_STRUCTURES.md) - Estruturas de dados e tipos
4. [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md) - Fluxo completo de integração
5. [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md) - Documentação das funções RPC
6. [CHANGELOG_FUNCTIONS.md](./CHANGELOG_FUNCTIONS.md) - Histórico de alterações

## Tecnologias

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Recharts
- **Estado**: React Hooks, SWR
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL, RPC Functions

## Performance

- **SWR Cache**: Dados em cache com `refreshInterval: 0`
- **Dynamic Routes**: `export const dynamic = 'force-dynamic'`
- **Lazy Loading**: Skeleton loaders durante carregamento
- **Otimização**: Queries otimizadas com agregações no banco

## Troubleshooting

### Erro: "Não autorizado"
- Verificar autenticação do usuário
- Verificar se o tenant está ativo

### Erro: "Schema não encontrado"
- Verificar se o schema está nos "Exposed schemas" do Supabase
- Ver: `docs/SUPABASE_SCHEMA_CONFIGURATION.md`

### Dados não aparecem
- Verificar se existem dados em `vendas_diarias_por_filial`
- Verificar filtros de data e filial aplicados
- Verificar console do navegador para erros

### Gráfico não carrega
- Verificar se as funções RPC de gráfico existem
- Verificar logs da API: `/api/charts/sales-by-month`

## Referências

- [Padrão de Filtros](../../FILTER_PATTERN_STANDARD.md)
- [Configuração de Schemas](../../SUPABASE_SCHEMA_CONFIGURATION.md)
- [Guia de Desenvolvimento](../../CLAUDE.md)

---

**Versão**: 1.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-01-14  
**Autor**: Documentação Técnica  
**Módulo**: Dashboard Principal
