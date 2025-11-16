# Dashboard Principal

> **Status**: ✅ Implementado  
> **Versão Atual**: 2.0.2  
> **Última Atualização**: 2025-11-15

## Visão Geral

O Dashboard Principal é o módulo central do BI SaaS, oferecendo uma visão executiva consolidada dos principais indicadores de desempenho do negócio. Apresenta métricas de **Receita Bruta**, **Lucro Bruto**, **Margem Bruta** e **Ticket Médio** com comparações temporais inteligentes (período anterior, ano anterior completo e YTD), além de análise detalhada por filial.

**Propósito**: Fornecer aos usuários uma visão rápida e acionável do desempenho do negócio através de KPIs financeiros, com comparações automáticas entre períodos e análise de tendências.

**Diferenciais v2.0**:
- Sistema de filtros inteligente com 3 modos mutuamente exclusivos
- Comparação YTD automática para análise do ano corrente
- Subtração automática de descontos na Receita e Lucro Bruto  
- Labels de comparação dinâmicos baseados no contexto do filtro
- Interface responsiva com consistência visual (larguras fixas desktop)

## Funcionalidades

- ✅ **Indicadores KPI**: Receita Bruta, Lucro Bruto, Margem Bruta, Ticket Médio
- ✅ **Comparações Inteligentes**: 
  - Comparação com ano anterior completo
  - YTD (Year to Date): Compara período equivalente do ano anterior
  - Ajuste automático baseado no tipo de filtro aplicado
- ✅ **Filtros Avançados**: 
  - Filtro por Mês (seletor de mês + ano)
  - Filtro por Ano (ano completo)
  - Período Customizado (datas livres)
  - Seleção múltipla de filiais com largura de 600px
- ✅ **Gráfico de Vendas**: Visualização com comparativo ano atual vs. ano anterior
- ✅ **Análise por Filial**: Tabela detalhada com métricas por filial e variações
- ✅ **YTD para Lucro e Margem**: Métricas YTD calculadas separadamente via função dedicada
- ✅ **Auditoria**: Log de acesso ao módulo
- ✅ **Autorização por Filial**: Respeita restrições de acesso do usuário
- ✅ **Descontos**: Subtração automática de descontos da receita e lucro

## Componentes Principais

### Frontend

- **Página Principal**: [src/app/(dashboard)/dashboard/page.tsx](../../../src/app/(dashboard)/dashboard/page.tsx)
- **Componentes**:
  - `CardMetric`: [src/components/dashboard/card-metric.tsx](../../../src/components/dashboard/card-metric.tsx) - Card com suporte a YTD
  - `ChartVendas`: [src/components/dashboard/chart-vendas.tsx](../../../src/components/dashboard/chart-vendas.tsx)
  - `DashboardShell`: [src/components/dashboard/dashboard-shell.tsx](../../../src/components/dashboard/dashboard-shell.tsx)
  - `DashboardFilter`: [src/components/dashboard/dashboard-filter.tsx](../../../src/components/dashboard/dashboard-filter.tsx) - **NOVO** Filtro inteligente (Mês/Ano/Customizado)
  - `MultiSelect`: Seleção múltipla de filiais com largura 600px
- **Hooks**:
  - `useTenantContext`: Contexto do tenant
  - `useBranchesOptions`: Opções de filiais
  - `useSWR`: Cache e atualização de dados

### Backend

- **API Routes**:
  - `/api/dashboard` - Dados principais do dashboard: [src/app/api/dashboard/route.ts](../../../src/app/api/dashboard/route.ts)
  - `/api/dashboard/vendas-por-filial` - Análise detalhada por filial: [src/app/api/dashboard/vendas-por-filial/route.ts](../../../src/app/api/dashboard/vendas-por-filial/route.ts)
  - `/api/dashboard/ytd-metrics` - **NOVO** Métricas YTD de Lucro e Margem: [src/app/api/dashboard/ytd-metrics/route.ts](../../../src/app/api/dashboard/ytd-metrics/route.ts)
  - `/api/charts/sales-by-month` - Dados do gráfico: [src/app/api/charts/sales-by-month/route.ts](../../../src/app/api/charts/sales-by-month/route.ts)

### Database

- **RPC Functions**:
  - `get_dashboard_data` - Indicadores principais com comparações temporais e detecção de ano completo
  - `get_dashboard_ytd_metrics` - **NOVO** Cálculo dedicado de YTD para Lucro e Margem
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
- **RN-TEMP-002**: Cálculo automático de PAA (Período Anterior do Ano) com detecção de ano completo
- **RN-YTD-001**: Year to Date - acumulado do início do ano até data atual
- **RN-YTD-002**: YTD para Lucro e Margem calculado via função dedicada
- **RN-FILT-NEW-001**: Filtro inteligente com 3 modos (Mês/Ano/Customizado)
- **RN-FILT-NEW-002**: Seleção de mês com ano independente
- **RN-FILT-NEW-003**: Filtro de ano completo (01/Jan a 31/Dez)
- **RN-FILT-004**: Filtro múltiplo de filiais com largura fixa 600px
- **RN-AUTH-001**: Autorização por filiais do usuário
- **RN-CALC-NEW-001**: Descontos subtraídos de Receita e Lucro Bruto

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

### Documentos Principais (Seguem Padrão de Documentação)

1. **[README.md](./README.md)** - Visão geral do módulo (este arquivo)
2. **[BUSINESS_RULES.md](./BUSINESS_RULES.md)** - Regras de negócio detalhadas (34 regras)
3. **[DATA_STRUCTURES.md](./DATA_STRUCTURES.md)** - Estruturas de dados e tipos TypeScript
4. **[INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md)** - Fluxo completo de integração
5. **[RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)** - Documentação das funções RPC do PostgreSQL
6. **[CHANGELOG_FUNCTIONS.md](./CHANGELOG_FUNCTIONS.md)** - Histórico de alterações (v1.0 a v2.0.2)

### Documentos Complementares

7. **[CARD_FIELDS_EXPLANATION.md](./CARD_FIELDS_EXPLANATION.md)** - **NOVO v2.0.2** Explicação detalhada de cada campo dos cards
8. **[MODULE_SUMMARY.md](./MODULE_SUMMARY.md)** - **NOVO** Resumo executivo completo do módulo
9. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - **NOVO** Guia de referência rápida para desenvolvedores
10. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Guia de solução de problemas
11. **[YTD_FIX_SUMMARY.md](./YTD_FIX_SUMMARY.md)** - Resumo da correção YTD v2.0.2
12. **[FILTER_UPDATE_FINAL.md](./FILTER_UPDATE_FINAL.md)** - Detalhes da atualização de filtros v2.0

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

### Erro: "COALESCE could not convert type jsonb to json"
- **Causa**: Tipo incompatível na função `get_dashboard_data`
- **Solução**: Aplicar SQL em `fix_dashboard_jsonb_NOW.sql`
- **Detalhes**: Linha 334 da função usa `jsonb` mas deveria ser `json`

### YTD não aparece para Lucro/Margem
- Verificar se função `get_dashboard_ytd_metrics` existe
- Verificar API: `/api/dashboard/ytd-metrics`
- Garantir que filtro está configurado como "Ano"

## Referências

- [Padrão de Filtros](../../FILTER_PATTERN_STANDARD.md)
- [Configuração de Schemas](../../SUPABASE_SCHEMA_CONFIGURATION.md)
- [Guia de Desenvolvimento](../../CLAUDE.md)

---

**Versão**: 2.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-11-15  
**Autor**: Documentação Técnica  
**Módulo**: Dashboard Principal

## Mudanças na Versão 2.0.0 (2025-11-15)

### 🆕 Novo Sistema de Filtros
- Substituição do componente `PeriodFilter` por `DashboardFilter`
- 3 modos de filtro: Mês, Ano, Período Customizado
- Seletor de mês independente do ano
- Filtro de filiais com largura fixa de 600px no desktop
- Largura do filtro "Filtrar por" fixada em 250px

### 🆕 Métricas YTD Aprimoradas
- Nova função `get_dashboard_ytd_metrics` dedicada
- YTD para Lucro Bruto e Margem Bruta
- Comparação inteligente (mesmo período do ano anterior)
- Exibição apenas quando filtro por "Ano" está ativo

### 🔄 Alterações de Nomenclatura
- "Total de Vendas" → "Receita Bruta"
- "Total de Lucro" → "Lucro Bruto"
- "Margem de Lucro" → "Margem Bruta"
- Removido card "Total Vendas (Acum. Ano)"
- Fonte dos títulos dos cards alterada para `text-lg`

### 🐛 Correções
- Fix: Tipo JSONB/JSON incompatível em `get_dashboard_data`
- Fix: Cálculo YTD para Lucro e Margem agora correto
- Fix: Comparação de ano completo (01/Jan a 31/Dez)
- Fix: Larguras dos filtros agora são consistentes

### 📚 Documentação
- Atualização completa seguindo `DOCUMENTATION_STANDARDS.md`
- Novos arquivos: `FILTER_UPDATE_FINAL.md`
- Atualização de `BUSINESS_RULES.md` com novas regras
- Atualização de `RPC_FUNCTIONS.md` com `get_dashboard_ytd_metrics`
- Atualização de `DATA_STRUCTURES.md` com `YTDMetrics`
