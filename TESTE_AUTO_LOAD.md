# 🧪 TESTE - Auto-Load (Apenas Primeira Vez)

## Como Testar

### 1. Abra o Console do Navegador
- Pressione F12
- Aba "Console"

### 2. Acesse a Página
```
http://localhost:3000/relatorios/produtos-sem-vendas
```

### 3. Observe os Logs

**Primeira vez (AUTO):**
```
🔍 [Auto-load] Check: {
  selectedBranches: 1,
  initialLoadDone: false,
  willRun: true
}
✅ [Auto-load] Executando fetchData
[API/PRODUTOS-SEM-VENDAS] Params: { ... }
```

**Resultado esperado:** Loading aparece → Dados carregam

### 4. Mude a Filial

**Selecione outra filial no dropdown**

**Logs esperados:**
```
🔍 [Auto-load] Check: {
  selectedBranches: 1,
  initialLoadDone: true,  ← AGORA É TRUE
  willRun: false          ← NÃO VAI EXECUTAR
}
⏭️  [Auto-load] Pulando (initialLoadDone=true ou sem filiais)
```

**Resultado esperado:** NADA acontece (sem loading)

### 5. Clique em "Buscar"

**Resultado esperado:** 
- Loading aparece
- Dados da nova filial carregam

## Problemas Possíveis

### ❌ Ainda carrega ao mudar filial?

**Possível causa:** `initialLoadDone` não está persistindo

**Debug:**
Verifique se no segundo log aparece `initialLoadDone: false` (errado!)

### ❌ Não carrega nem na primeira vez?

**Possível causa:** Condição não está sendo satisfeita

**Debug:**
Verifique o primeiro log:
- `selectedBranches` deve ser > 0
- `initialLoadDone` deve ser false
- `willRun` deve ser true

## Comportamento Correto

| Ação | initialLoadDone | Executa fetchData? | Console Log |
|------|-----------------|-------------------|-------------|
| Abrir página | false → true | ✅ SIM | ✅ Executando |
| Mudar filial | true (mantém) | ❌ NÃO | ⏭️  Pulando |
| Mudar dias | true (mantém) | ❌ NÃO | ⏭️  Pulando |
| Clicar "Buscar" | true (mantém) | ✅ SIM | (via onClick) |
| Reload (F5) | false → true | ✅ SIM | ✅ Executando |

## Remover Logs (Depois)

Quando confirmar que está funcionando, remova os console.log:

```typescript
useEffect(() => {
  if (selectedBranches.length > 0 && !initialLoadDone) {
    setInitialLoadDone(true)
    fetchData(1)
  }
}, [selectedBranches])
```

## Status

✅ Build: SUCCESS  
⏳ Aguardando: Teste no navegador com console aberto  
📋 Logs: Adicionados para debug
