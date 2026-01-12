# ✅ Auto-Load - Produtos Sem Vendas

**Data:** 2026-01-12
**Funcionalidade:** Carregamento automático com primeira filial ao abrir página

## Mudanças Implementadas

### 1. Auto-seleção da Primeira Filial

**Quando carregar filiais:**
- Ordena por `codigo` (ORDER BY codigo)
- Seleciona automaticamente a filial com menor código
- Exemplo: Se tem filiais 10, 15, 20 → Seleciona filial 10

**Código:**
```typescript
if (filiaisData && filiaisData.length > 0) {
  setFiliais(filiaisData)
  
  // Auto-selecionar primeira filial (menor código)
  const primeiraFilial = filiaisData[0]
  setSelectedBranches([{
    value: primeiraFilial.id.toString(),
    label: `${primeiraFilial.codigo} - ${primeiraFilial.nome}`
  }])
}
```

### 2. Auto-execução do Relatório

**Quando primeira filial for selecionada:**
- Detecta que `selectedBranches` mudou
- Verifica se produtos ainda não foram carregados
- Executa `fetchData(1)` automaticamente

**Código:**
```typescript
useEffect(() => {
  // Só executa se:
  // 1. Tem filial selecionada
  // 2. Produtos ainda não foram carregados (primeira vez)
  if (selectedBranches.length > 0 && produtos.length === 0 && !loading) {
    fetchData(1)
  }
}, [selectedBranches])
```

## Comportamento na Abertura

### Fluxo Completo:

1. **Usuário acessa página** → `/relatorios/produtos-sem-vendas`

2. **Sistema carrega filiais** → ORDER BY codigo

3. **Auto-seleciona primeira filial** → Ex: "10 - Matriz"

4. **Auto-executa busca** com valores default:
   - Filial: **10 (primeira)**
   - Dias Min: **15**
   - Dias Max: **90**
   - Curva: **Todas**
   - Filtro: **Todos os produtos**

5. **Mostra resultados** → Paginação com 100 produtos/página

### Tempo Estimado:
- Carregamento inicial: **2-5 segundos** (com índices)
- Usuário vê dados imediatamente ao abrir a página

## Valores Default

| Campo | Valor | Motivo |
|-------|-------|--------|
| Filial | Primeira (menor código) | Performance e relevância |
| Dias Min | 15 | Produtos recém parados |
| Dias Max | 90 | Range útil (15-90 dias) |
| Curva ABC | Todas | Visão completa |
| Filtro Tipo | Todos | Sem restrição inicial |
| Page Size | 100 | Balanceamento performance/UX |

## Vantagens

1. **UX Melhorada:**
   - Usuário não precisa clicar em "Buscar"
   - Dados aparecem automaticamente
   - Menos cliques = mais produtividade

2. **Performance:**
   - Carrega UMA filial (rápido)
   - Não todas as filiais (poderia dar timeout)

3. **Previsível:**
   - Sempre mesma filial inicial
   - Valores default úteis
   - Comportamento consistente

## Casos Especiais

### Usuário quer mudar filial?
- Basta selecionar outra no dropdown
- Clicar em "Buscar"
- Normal workflow continua funcionando

### Usuário quer todas as filiais?
- Limpar seleção de filiais
- Será "all" (todas)
- Pode demorar mais (aguardar índices)

### Não tem filiais?
- Nada acontece
- Mostra tela vazia
- Aguarda cadastro de filiais

## Teste

1. **Abra:** `/relatorios/produtos-sem-vendas`
2. **Observe:**
   - Filial já vem selecionada (primeira)
   - Loading aparece automaticamente
   - Dados carregam em poucos segundos
3. **Resultado:**
   - Produtos da primeira filial
   - Range 15-90 dias
   - Paginação funcionando

## Build Status

✅ **Compilado com sucesso**
✅ **Type-safe** (TypeScript)
✅ **Pronto para uso**

---

**Implementado em:** `src/app/(dashboard)/relatorios/produtos-sem-vendas/page.tsx`
**Lines:** ~103-157
