# ✅ Auto-Load - Apenas Primeira Vez

**Comportamento:** Carrega automaticamente SOMENTE no primeiro acesso. Depois, usuário precisa clicar em "Buscar".

## Como Funciona

### 1️⃣ Primeiro Acesso (Auto)

**Usuário abre:** `/relatorios/produtos-sem-vendas`

**Sistema executa:**
1. Carrega filiais (ORDER BY codigo)
2. Auto-seleciona primeira filial (ex: "10 - Matriz")
3. **Executa busca AUTOMATICAMENTE** com valores default
4. Marca `initialLoadDone = true`

**Resultado:**
- ✅ Dados aparecem automaticamente
- ✅ Filial pré-selecionada
- ✅ Range: 15-90 dias
- ✅ Usuário vê resultados imediatamente

### 2️⃣ Mudanças Posteriores (Manual)

**Usuário muda qualquer filtro:**
- Seleciona outra filial
- Altera dias mínimo/máximo
- Muda curva ABC
- Troca filtro de departamento

**Sistema NÃO executa automaticamente**
- ❌ Não busca automaticamente
- ✅ Aguarda usuário clicar em "Buscar"

**Motivo:** `initialLoadDone = true` (já foi feito)

## Implementação

### Estado de Controle

```typescript
const [initialLoadDone, setInitialLoadDone] = useState(false)
```

### UseEffect com Flag

```typescript
useEffect(() => {
  // Condições para executar APENAS uma vez:
  // 1. Primeira filial já foi selecionada
  // 2. Initial load ainda não foi feito
  // 3. Não está carregando
  if (selectedBranches.length > 0 && !initialLoadDone && !loading) {
    setInitialLoadDone(true)  // ← Marca como feito
    fetchData(1)
  }
}, [selectedBranches, initialLoadDone, loading])
```

### Fluxo de Execução

```
Página abre
  ↓
Carrega filiais
  ↓
Auto-seleciona primeira (selectedBranches muda)
  ↓
useEffect detecta mudança
  ↓
Verifica: initialLoadDone = false? ✅
  ↓
Marca: initialLoadDone = true
  ↓
Executa: fetchData(1)
  ↓
Mostra resultados
  ↓
[USUÁRIO MUDA FILTRO]
  ↓
useEffect detecta mudança
  ↓
Verifica: initialLoadDone = false? ❌ (é true)
  ↓
NÃO executa fetchData
  ↓
Aguarda clique em "Buscar"
```

## Comparação

| Ação | Antes | Depois |
|------|-------|--------|
| Abrir página | ❌ Vazio | ✅ Auto-carrega |
| Mudar filial | ✅ Auto-carrega | ❌ Precisa clicar |
| Mudar dias | ✅ Auto-carrega | ❌ Precisa clicar |
| Mudar curva | ✅ Auto-carrega | ❌ Precisa clicar |
| Clicar "Buscar" | ✅ Funciona | ✅ Funciona |

## Vantagens

1. **UX no primeiro acesso:**
   - Dados aparecem automaticamente
   - Usuário não precisa configurar nada
   - Menos fricção

2. **Controle posterior:**
   - Usuário tem controle total
   - Evita chamadas desnecessárias
   - Performance otimizada

3. **Previsível:**
   - Sempre carrega primeira filial
   - Sempre mesmo range (15-90)
   - Comportamento consistente

## Casos de Uso

### Usuário abre pela primeira vez
```
1. Abre página
2. Vê loading
3. Dados aparecem (filial 10, 15-90 dias)
4. Pode navegar paginação
```

### Usuário quer ver outra filial
```
1. Seleciona filial 15
2. Clica em "Buscar"
3. Vê novos dados
```

### Usuário quer mudar range
```
1. Altera Min: 30, Max: 180
2. Clica em "Buscar"
3. Vê produtos 30-180 dias
```

### Usuário recarrega página (F5)
```
1. Página recarrega
2. initialLoadDone volta para false
3. Auto-carrega primeira filial novamente
```

## Testes

### ✅ Teste 1: Primeiro Acesso
1. Abra: `/relatorios/produtos-sem-vendas`
2. **Esperado:** Loading → Dados aparecem automaticamente
3. **Filial:** Pré-selecionada (primeira)

### ✅ Teste 2: Mudar Filial
1. Selecione outra filial
2. **Esperado:** Nada acontece
3. Clique "Buscar"
4. **Esperado:** Dados da nova filial

### ✅ Teste 3: Mudar Dias
1. Altere Min/Max
2. **Esperado:** Nada acontece
3. Clique "Buscar"
4. **Esperado:** Dados com novo range

### ✅ Teste 4: Reload (F5)
1. Pressione F5
2. **Esperado:** Auto-carrega novamente
3. **Motivo:** initialLoadDone resetou

## Build Status

✅ **Compilado com sucesso**  
✅ **Lógica implementada**  
✅ **Pronto para testar**

---

**Flag de controle:** `initialLoadDone`  
**Executa apenas 1x por sessão:** ✅  
**Depois exige clique:** ✅
