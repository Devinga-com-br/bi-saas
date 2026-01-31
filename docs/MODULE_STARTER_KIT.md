# Kit de Inicio de Modulo (base atual)

Objetivo: oferecer um ponto de partida padrao usando somente componentes que ja existem no projeto (Dashboard 360, Metas e shadcn/ui).

## O que este kit cobre

- PageHeader padrao (titulo + descricao)
- FiltersBar no estilo do Dashboard 360
- DataTable no estilo "Vendas por Filial"
- EmptyState padrao (usado em Despesas)
- Toasts no estilo Metas (Sonner)

## Template pronto

Arquivo de template:
- `docs/templates/module-starter-dashboard.tsx`

Como usar:
1) Copie o template para o novo modulo em `src/app/(dashboard)/<modulo>/page.tsx`.
2) Substitua `mockData`, colunas e textos.
3) Mantenha o layout e classes para consistencia visual.

## Padroes aplicados (referencias reais)

- Toasts: `src/app/(dashboard)/metas/mensal/page.tsx`
- FiltersBar: `src/app/(dashboard)/dashboard/page.tsx`
- DataTable: `src/app/(dashboard)/dashboard/page.tsx` (secao "Vendas por Filial")
- EmptyState: `src/components/despesas/empty-state.tsx`

## Observacoes

- Evite hex solto e use tokens do tema (ver `src/app/globals.css`).
- Prefira `DashboardFilter` quando o filtro de periodo for igual ao Dashboard 360.
- Para multi-filiais, use `MultiSelect` do Dashboard ou `MultiFilialFilter` quando precisar de busca + select all.
