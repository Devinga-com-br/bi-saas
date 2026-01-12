# 🐛 DEBUG - Auto-Seleção de Filial

## Problema Identificado

Filial NÃO está sendo pré-selecionada ao carregar a página.

## Logs Adicionados

Agora você verá no console:

### 1. Quando componente monta
```
📦 [Carregar Filiais] currentTenant: okilao
```
Se aparecer `undefined`, significa que `currentTenant` ainda não carregou.

### 2. Ao buscar filiais
```
🔍 [Carregar Filiais] Buscando filiais...
```

### 3. Resultado da busca
```
📋 [Carregar Filiais] Resultado: {
  count: 3,
  primeira: { id: 1, codigo: "001", nome: "Matriz" },
  error: null
}
```

### 4. Auto-seleção
```
✅ [Carregar Filiais] Auto-selecionando: {
  value: "1",
  label: "001 - Matriz"
}
```

### 5. Depois, auto-load
```
🔍 [Auto-load] Check: {
  selectedBranches: 1,
  initialLoadDone: false,
  willRun: true
}
✅ [Auto-load] Executando fetchData
```

## Como Testar

1. **Recarregue a página** (F5)
2. **Abra o Console** (F12)
3. **Observe a sequência de logs**

## Possíveis Problemas

### ❌ Não aparece "Auto-selecionando"
**Causa:** Filiais não foram carregadas ou está vazio

**Verificar:**
- Log `📋 [Carregar Filiais] Resultado` mostra count > 0?
- Tem filiais ativas no banco?

### ❌ Aparece "Auto-selecionando" mas campo fica vazio
**Causa:** Problema no MultiSelect ou estado não atualiza

**Verificar:**
- `selectedBranches` está sendo setado?
- MultiSelect está recebendo o valor?

### ❌ Aparece "currentTenant: undefined"
**Causa:** TenantContext ainda não carregou

**Solução:** Adicionar loading state até context carregar

## Próximo Teste

Depois de recarregar, me envie a sequência completa de logs que aparecer.
