# 🔍 Teste do Auto-Load

## Comportamento Esperado

### Primeira vez que abre a página:
1. Página carrega
2. Filial 10 aparece selecionada (primeira)
3. **Loading aparece AUTOMATICAMENTE**
4. Dados carregam
5. `initialLoadDone = true`

### Usuário muda a filial depois:
1. Usuário clica no dropdown de filiais
2. Seleciona filial 15
3. **Nada acontece** (sem loading)
4. Precisa clicar em "Buscar"

## Fluxo Correto

```
MOUNT
  ↓
useEffect (carregar filiais) executa
  ↓
setSelectedBranches([filial 10])
  ↓
useEffect (auto-load) detecta mudança em selectedBranches
  ↓
initialLoadDone = false? ✅ SIM
  ↓
setInitialLoadDone(true)
fetchData(1)
  ↓
[DADOS CARREGADOS]

[USUÁRIO MUDA FILIAL]
  ↓
setSelectedBranches([filial 15])
  ↓
useEffect (auto-load) detecta mudança em selectedBranches
  ↓
initialLoadDone = false? ❌ NÃO (é true agora)
  ↓
NÃO executa fetchData
  ↓
[AGUARDA CLIQUE EM BUSCAR]
```

## Debug

Se ainda estiver executando ao mudar filial, adicione um console.log:

```typescript
useEffect(() => {
  console.log('🔍 Auto-load check:', {
    selectedBranches: selectedBranches.length,
    initialLoadDone,
    willRun: selectedBranches.length > 0 && !initialLoadDone
  })
  
  if (selectedBranches.length > 0 && !initialLoadDone) {
    console.log('✅ Executando auto-load')
    setInitialLoadDone(true)
    fetchData(1)
  }
}, [selectedBranches])
```

Abra o console e veja o que está sendo logado.
