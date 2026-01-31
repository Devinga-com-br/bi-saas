# Base de UI (componentes existentes)

Objetivo: consolidar padroes reais ja usados no projeto para acelerar novos modulos, sem criar nada novo. Esta base aponta para os componentes e telas que ja existem e que devem ser o "default" ao iniciar um modulo.

## Fonte da verdade (referencias)

- Tokens e tema: `src/app/globals.css`
- Toasts (Sonner): `src/app/layout.tsx`, `src/app/(dashboard)/metas/mensal/page.tsx`
- Filtro periodo (Dashboard 360): `src/components/dashboard/dashboard-filter.tsx`
- Data table Vendas por Filial (Dashboard 360): `src/app/(dashboard)/dashboard/page.tsx`
- UI base shadcn: `src/components/ui/`

## 1) Toasts (padrao usado em Metas)

Uso: Sonner com `toast.success` e `toast.error`, sempre com titulo curto + `description` explicativa quando necessario.

Referencias:
- Provider global: `src/app/layout.tsx`
- Uso real: `src/app/(dashboard)/metas/mensal/page.tsx`

Exemplo real (Metas):

```tsx
toast.error('Campos obrigatorios', {
  description: 'Preencha todos os campos para gerar as metas'
})

toast.success('Metas geradas com sucesso', {
  description: data.message || `${data.metas_criadas || 31} metas criadas para o periodo`
})
```

Padrao recomendado:
- Mensagem principal curta (acao/resultado).
- `description` para contexto de erro ou detalhe da operacao.
- Usar `toast.error` em falhas de validacao e erros de API.

## 2) Filtro de periodo (Dashboard 360)

Componente base: `DashboardFilter` em `src/components/dashboard/dashboard-filter.tsx`

O que padroniza:
- Tipos de filtro: `month | year | custom`
- Layout responsivo: coluna no mobile e linha no desktop
- Inputs com largura padrao (ex.: `sm:w-[250px]` para selects e `sm:w-[140px]` para datas)
- DatePicker com `Popover` e `Calendar` (mesmo visual e comportamento)
- Aplicacao automatica ao alterar selecao

Estrutura base:

```tsx
<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
  <div className="flex flex-col gap-2 w-full sm:w-[250px] flex-shrink-0">
    <Label className="text-sm">Filtrar por</Label>
    <Select>...</Select>
  </div>
  {/* Mes / Ano / Periodo customizado */}
</div>
```

Quando iniciar um novo modulo com filtros de periodo:
- Reutilizar `DashboardFilter` quando a logica for por periodo.
- Manter as larguras e espaçamentos para consistencia visual.
- Se precisar de filtros adicionais (filiais, departamentos), manter o mesmo grid e altura `h-10`.

## 3) Data table padrao (Vendas por Filial - Dashboard 360)

Tela referencia: `src/app/(dashboard)/dashboard/page.tsx` (secao "Vendas por Filial")

Padrao visual e de interacao:
- `Card` com header e acao (ex.: Exportar PDF)
- Skeleton durante carregamento
- Tabela dentro de `div` com `rounded-md border overflow-x-auto`
- Headers como `Button` para ordenacao (sort)
- Celdas financeiras: valor principal, delta com seta e baseline em muted

Estrutura base:

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <div>
      <CardTitle>Vendas por Filial</CardTitle>
      <CardDescription>...</CardDescription>
    </div>
    <Button variant="outline" size="sm" className="gap-2">Exportar</Button>
  </CardHeader>
  <CardContent>
    {isLoading ? <Skeleton /> : (
      <div className="rounded-md border overflow-x-auto">
        <Table>...</Table>
      </div>
    )}
  </CardContent>
</Card>
```

Padrao de celula numerica (referencia real):

```tsx
<TableCell className="text-right">
  <div className="font-medium">{formatCurrency(valor)}</div>
  <div className={`flex items-center justify-end gap-1 text-xs ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
    <span>{delta >= 0 ? '+' : ''}{delta.toFixed(2)}%</span>
  </div>
  <div className="text-xs text-muted-foreground">{formatCurrency(referencia)}</div>
</TableCell>
```

## 4) Checklist de uso em novos modulos

- Usar tokens semanticos de `src/app/globals.css` (evitar hex solto).
- Reutilizar `DashboardFilter` para periodo e `MultiFilialFilter` quando houver filtro de filiais.
- Padronizar tabelas com `Card + Table + Skeleton + sort header`.
- Padronizar feedback com `toast.success`/`toast.error`.

## 5) Kit e catalogo

- Kit de inicio: `docs/MODULE_STARTER_KIT.md`
- Template pronto: `docs/templates/module-starter-dashboard.tsx`
- Pagina interna (catalogo): `src/app/(dashboard)/design-system/page.tsx` (rota `/design-system`)

---

Se quiser, posso transformar esta base em:
- Um "kit de inicio de modulo" com exemplos prontos de `PageHeader`, `FiltersBar`, `DataTable` e `EmptyState`.
- Uma pagina interna de "catalogo de componentes" mostrando cada padrao com exemplos reais.
