# Referencias de padrao (base atual)

Use estas fontes ao padronizar UI ou iniciar novos modulos:

## Tokens e tema
- `src/app/globals.css` (tokens, cores, radius, sombras)

## Toasts (Metas)
- `src/app/(dashboard)/metas/mensal/page.tsx` (exemplos de `toast.success` e `toast.error`)
- Provider: `src/app/layout.tsx` (Sonner)

## Filters Bar (Dashboard 360)
- `src/components/dashboard/dashboard-filter.tsx` (periodo month/year/custom)
- `src/app/(dashboard)/dashboard/page.tsx` (composicao com filiais + tipo de venda)
- `src/components/ui/multi-select.tsx` (MultiSelect usado no Dashboard 360)
- `src/components/filters/multi-filial-filter.tsx` (alternativa com busca e select all)

## DataTable (Vendas por Filial)
- `src/app/(dashboard)/dashboard/page.tsx` (tabela + sort + variacao)

## EmptyState
- `src/components/despesas/empty-state.tsx`

## Documentos base
- `docs/DESIGN_SYSTEM_BASE.md`
- `docs/MODULE_STARTER_KIT.md`
