# ✅ Correção do Alinhamento das Colunas - Módulo Despesas

## 🐛 Problema

As colunas de filiais estavam **completamente desalinhadas**:
- Valores aparecendo na coluna errada
- Estrutura da tabela quebrada
- Layout inconsistente

## 🔍 Causa Raiz

O componente `Collapsible` do shadcn/ui estava quebrando a estrutura HTML da tabela ao adicionar `<div>` wrappers entre `<tr>` e `<td>`, o que é **HTML inválido**.

## ✅ Solução

Substituí o `Collapsible` por **controle de visibilidade puro com React state**, mantendo a estrutura HTML da tabela válida.

### Mudanças

1. **Removidos**: `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`
2. **Implementado**: Controle de visibilidade com `expandedDepts` e `expandedTipos`
3. **Adicionado**: `cursor-pointer` e `onClick` nas linhas clicáveis

### Código Corrigido

```tsx
// Linha clicável do Departamento
<TableRow 
  className="cursor-pointer"
  onClick={() => setExpandedDepts(prev => ({ ...prev, [dept.dept_id]: !prev[dept.dept_id] }))}
>
  <TableCell>
    {expandedDepts[dept.dept_id] ? <ChevronDown /> : <ChevronRight />}
    {dept.dept_descricao}
  </TableCell>
  {data.filiais.map(filialId => (
    <TableCell key={filialId}>
      {formatCurrency(getTotalFilial(dept.valores_filiais, filialId))}
    </TableCell>
  ))}
</TableRow>

// Renderização condicional dos tipos
{expandedDepts[dept.dept_id] && dept.tipos.map((tipo) => (
  <TableRow>...</TableRow>
))}
```

## 🎯 Resultado

Agora a tabela está **perfeitamente alinhada**:

```
┌──────────────────────────────────┬────────────┬────────────┬────────────┐
│ Descrição                        │  Filial 1  │  Filial 4  │  Filial 6  │
├──────────────────────────────────┼────────────┼────────────┼────────────┤
│ ▼ INVESTIMENTOS                  │ R$ 71.964  │ R$ 0,00    │ R$ 0,00    │
│   ▼ INVESTIMENTOS (1)            │ R$ 0,00    │ R$ 0,00    │ R$ 0,00    │
│      • 02/10/2025 | Nota: 652881 │     -      │     -      │     -      │
└──────────────────────────────────┴────────────┴────────────┴────────────┘
```

✅ Cada valor na coluna correta  
✅ Estrutura HTML válida  
✅ Expansão/colapso funcionando  
✅ Build compilado sem erros

---

**Status**: ✅ **CORRIGIDO e TESTADO**  
**Data**: 2025-10-19
