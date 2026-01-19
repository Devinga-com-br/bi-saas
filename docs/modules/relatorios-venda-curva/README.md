# Vendas por Curva

> Status: ✅ Implementado

## Visão Geral

Relatório que consolida as vendas do mês por produto e exibe a classificação por **curva de venda** e **curva de lucro**, organizadas em hierarquia de departamentos (nível 3 → nível 2 → nível 1 → produto).

## Funcionalidades

- ✅ Filtro por mês, ano e filiais (multi-seleção)
- ✅ Respeito às filiais autorizadas do usuário
- ✅ Hierarquia de departamentos com totais e margem
- ✅ Filtro por produto (código ou descrição, com debounce)
- ✅ Exportação em PDF
- ✅ Paginação por departamento nível 3

## Componentes Principais

### Frontend
- **Página Principal**: `src/app/(dashboard)/relatorios/venda-curva/page.tsx`
- **Componentes**: `MultiSelect`, `Collapsible`, `Table`, `Pagination`, `Badge`
- **Hooks**: `useBranchesOptions`, `useTenantContext`

### Backend
- **API Route**: `src/app/api/relatorios/venda-curva/route.ts`
- **RPC Function**: `public.get_venda_curva_report`

### Database
- **Tabelas**:
  - `demo.vendas`
  - `demo.produtos`
  - `demo.departments_level_1`
  - `demo.departments_level_2`
  - `demo.departments_level_3`

## Acesso Rápido

- 🔗 **Rota**: `/relatorios/venda-curva`
- 📄 **Regras de Negócio**: `docs/modules/relatorios-venda-curva/BUSINESS_RULES.md`
- 🗂️ **Estruturas de Dados**: `docs/modules/relatorios-venda-curva/DATA_STRUCTURES.md`
- 🔄 **Fluxo de Integração**: `docs/modules/relatorios-venda-curva/INTEGRATION_FLOW.md`

## Permissões

- Controle via **módulo autorizado**: `relatorios_venda_curva`
- Filiais são filtradas por `getUserAuthorizedBranchCodes` na API

## Versão

**Versão Atual**: 1.0.0
**Última Atualização**: 2026-01-19
