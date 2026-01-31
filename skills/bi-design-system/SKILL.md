---
name: bi-design-system
description: "Padronizar UI e iniciar novos modulos usando os componentes reais do projeto (Dashboard 360, Metas e shadcn/ui). Use quando o usuario pedir padroes de design, base de componentes, kit de inicio de modulo, catalogo interno de UI, ou consolidacao de estilos existentes."
---

# BI Design System

Consolidar os padroes reais do projeto para acelerar novos modulos, sem inventar UI nova.

## Fluxo recomendado

1) Identificar os componentes base ja existentes no projeto para o pedido.
   - Ler `references/patterns.md` e abrir os arquivos citados.

2) Atualizar/gerar a base de documentacao.
   - Preferir `docs/DESIGN_SYSTEM_BASE.md` e `docs/MODULE_STARTER_KIT.md`.

3) Atualizar os templates padrao.
   - Usar `assets/module-starter-dashboard.tsx` como base do template.
   - Se precisar de catalogo, usar `assets/design-system-page.tsx`.

4) Garantir consistencia visual.
   - Usar tokens de `src/app/globals.css`.
   - Evitar hex solto e evitar componentes fora do padrao.

5) Entregar com caminho claro de uso.
   - Informar onde copiar o template e como acessar o catalogo.

## O que reutilizar (padroes oficiais)

- Toasts estilo Metas (Sonner)
- Filters Bar do Dashboard 360 (MultiSelect + DashboardFilter)
- DataTable estilo Vendas por Filial (Card + Table + sort)
- EmptyState de Despesas

## Recursos

### references/
Use `references/patterns.md` para localizar a fonte real de cada padrao.

### assets/
- `assets/module-starter-dashboard.tsx` (template pronto)
- `assets/design-system-page.tsx` (catalogo interno)
