# ✅ SOLUÇÃO APLICADA - Baseado em Venda por Curva

## O que aprendi do módulo Venda por Curva

### 1. Usa `useBranchesOptions` Hook
```typescript
const { branchOptions: branches, isLoading: isLoadingBranches } = useBranchesOptions({
  tenantId: currentTenant?.id,
  enabled: !!currentTenant,
  includeAll: false,  // Sem opção "Todas"
})
```

**Benefícios:**
- ✅ Hook já busca filiais corretamente do schema public
- ✅ Já formata como { value, label }
- ✅ Já filtra por tenant_id
- ✅ Loading state incluído

### 2. Flag `defaultFilialSet` para controle
```typescript
const [defaultFilialSet, setDefaultFilialSet] = useState(false)
```

### 3. Auto-seleção quando branches carregam
```typescript
useEffect(() => {
  if (branches.length > 0 && !defaultFilialSet) {
    const sortedFiliais = [...branches].sort((a, b) => {
      const idA = parseInt(a.value)
      const idB = parseInt(b.value)
      return idA - idB
    })
    setSelectedBranches([sortedFiliais[0]])  // Primeira filial
    setDefaultFilialSet(true)  // Marca como feito
  }
}, [branches, defaultFilialSet])
```

### 4. Auto-load quando tudo pronto
```typescript
useEffect(() => {
  if (currentTenant?.supabase_schema && selectedBranches.length > 0 && !loading && defaultFilialSet) {
    fetchData(1)  // Executa automaticamente
  }
}, [currentTenant, selectedBranches, defaultFilialSet])
```

## Mudanças Aplicadas

### ANTES (não funcionava):
```typescript
// ❌ Buscava filiais manualmente do banco
// ❌ Tinha lógica complexa de auto-load
// ❌ Flag initialLoadDone causava confusão
```

### DEPOIS (igual Venda por Curva):
```typescript
// ✅ Usa useBranchesOptions hook
// ✅ Flag defaultFilialSet clara
// ✅ Auto-select quando branches carregam
// ✅ Auto-load quando defaultFilialSet = true
```

## Comportamento Esperado

1. **Página abre** → useBranchesOptions busca filiais
2. **Branches carregam** → Auto-seleciona primeira
3. **defaultFilialSet = true** → Auto-executa fetchData
4. **Usuário muda filtro** → defaultFilialSet continua true, mas useEffect não re-executa (dependencies não mudam)
5. **Usuário clica "Buscar"** → fetchData manual

## Build

✅ Compilado com sucesso
✅ Seguindo padrão do Venda por Curva
✅ Pronto para testar
