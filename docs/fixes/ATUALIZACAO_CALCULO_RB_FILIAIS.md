# Atualização: Cálculo % RB nas Colunas de Filiais

**Data da Modificação**: 2025-01-12
**Versão**: 1.1.0
**Status**: ✅ Concluído

---

## 📋 Resumo da Modificação

Ajustado o cálculo do **% RB (Receita Bruta)** nas colunas de filiais para ser em relação à **receita bruta da filial específica**, não mais em relação à receita bruta total.

### ANTES:
```
Despesa X na Filial 1: R$ 5.000
Receita Bruta TOTAL: R$ 500.000
% RB = (5.000 / 500.000) × 100 = 1,00%
```

### DEPOIS:
```
Despesa X na Filial 1: R$ 5.000
Receita Bruta da FILIAL 1: R$ 300.000
% RB = (5.000 / 300.000) × 100 = 1,67%
```

**Importante**: A coluna **Total** continua usando a receita bruta total (não foi alterada).

---

## 🔄 Arquivos Modificados

### 1. `/src/components/despesas/columns.tsx`

#### Linha 41-47: Assinatura da função atualizada
```typescript
// ANTES
export const createColumns = (
  filiais: number[],
  getFilialNome: (id: number) => string,
  receitaBruta: number = 0,
  branchTotals: Record<number, number> = {}
): ColumnDef<DespesaRow>[] => {

// DEPOIS
export const createColumns = (
  filiais: number[],
  getFilialNome: (id: number) => string,
  receitaBruta: number = 0,
  branchTotals: Record<number, number> = {},
  receitaBrutaPorFilial: Record<number, number> = {}  // ← NOVO PARÂMETRO
): ColumnDef<DespesaRow>[] => {
```

#### Linhas 213-216: Cálculo do % RB atualizado
```typescript
// ANTES
const percentualTDF = totalFilial > 0 ? (valorFilial / totalFilial) * 100 : 0
const percentualRB = receitaBruta > 0 ? (valorFilial / receitaBruta) * 100 : 0

// DEPOIS
const percentualTDF = totalFilial > 0 ? (valorFilial / totalFilial) * 100 : 0
const receitaBrutaFilial = receitaBrutaPorFilial[filialId] || 0  // ← NOVO
const percentualRB = receitaBrutaFilial > 0 ? (valorFilial / receitaBrutaFilial) * 100 : 0
```

---

### 2. `/src/app/(dashboard)/dre-gerencial/page.tsx`

#### Linhas 756-762: Chamada do createColumns atualizada
```typescript
// ANTES
<DataTable
  columns={createColumns(data.filiais, getFilialNome, indicadores?.current?.receitaBruta || 0, branchTotals)}
  data={tableData}

// DEPOIS
<DataTable
  columns={createColumns(
    data.filiais,
    getFilialNome,
    indicadores?.current?.receitaBruta || 0,
    branchTotals,
    receitaPorFilial?.valores_filiais || {}  // ← NOVO PARÂMETRO
  )}
  data={tableData}
```

---

## 🎯 Comportamento Esperado

### Coluna Total
- **% RB**: Calculado em relação à **receita bruta total** de todas as filiais
- **Não modificado** nesta atualização

### Colunas de Filiais
- **% RB**: Calculado em relação à **receita bruta da filial específica**
- **Modificado** nesta atualização

---

## 📊 Exemplo Prático

### Cenário:
- **Filial 1**: Receita Bruta = R$ 300.000
- **Filial 2**: Receita Bruta = R$ 200.000
- **Total**: Receita Bruta = R$ 500.000
- **Despesa "Aluguel"**: Filial 1 = R$ 5.000, Filial 2 = R$ 3.000, Total = R$ 8.000

### Cálculo do % RB:

| Coluna | ANTES | DEPOIS |
|--------|-------|--------|
| **Total** | (8.000 / 500.000) × 100 = **1,60%** | (8.000 / 500.000) × 100 = **1,60%** ← Igual |
| **Filial 1** | (5.000 / 500.000) × 100 = **1,00%** | (5.000 / 300.000) × 100 = **1,67%** ← Mudou |
| **Filial 2** | (3.000 / 500.000) × 100 = **0,60%** | (3.000 / 200.000) × 100 = **1,50%** ← Mudou |

### Interpretação:
- **Antes**: O % mostrava quanto aquela despesa representava do faturamento total da empresa
- **Depois**: O % mostra quanto aquela despesa representa do faturamento daquela filial específica
- **Vantagem**: Agora é possível identificar se uma despesa está proporcionalmente maior em uma filial

---

## ✅ Validação

### Build
- [x] ✅ Build passou sem erros de TypeScript
- [x] ✅ Nenhum warning

### Testes Manuais Necessários:
- [ ] Verificar se % RB nas colunas de filiais está diferente do anterior
- [ ] Verificar se % RB na coluna Total continua igual
- [ ] Calcular manualmente 1-2 valores para confirmar precisão
- [ ] Testar com diferentes cenários (1, 2, 3+ filiais)

---

## 🧮 Como Validar Manualmente

### Passo 1: Anotar valores
```
Receita Bruta da Filial X: R$ ___________
Valor da Despesa na Filial X: R$ ___________
```

### Passo 2: Calcular manualmente
```
% RB = (Valor Despesa / Receita Bruta Filial) × 100
% RB = (_________ / _________) × 100 = _______%
```

### Passo 3: Comparar com o exibido
- O valor calculado deve bater com o exibido na tela
- Tolerância: ±0,01% (diferença de arredondamento)

---

## 🎨 Exemplo Visual

```
┌────────────────────────────────────────────────────────────────┐
│ Descrição     │ Total           │ Matriz (R$ 300K) │ Filial 4  │
├────────────────────────────────────────────────────────────────┤
│ RECEITA BRUTA │ R$ 500.000      │ R$ 300.000       │ R$ 200K   │
│               │                 │                  │           │
│ TOTAL DESP.   │ R$ 50.000       │ R$ 30.000        │ R$ 20K    │
│               │ % RB: 10,00%    │ % RB: 10,00% ✅  │ % RB: 10% │
│               │ (50K/500K)      │ (30K/300K) ← OK  │ (20K/200K)│
│               │                 │                  │           │
│ ├─ Aluguel    │ R$ 8.000        │ R$ 5.000         │ R$ 3K     │
│               │ % RB: 1,60%     │ % RB: 1,67% ✅   │ % RB: 1,5%│
│               │ (8K/500K)       │ (5K/300K) ← OK   │ (3K/200K) │
└────────────────────────────────────────────────────────────────┘

Legenda:
- Coluna Total: usa receita bruta TOTAL (500K)
- Coluna Matriz: usa receita bruta da MATRIZ (300K) ← MUDOU
- Coluna Filial 4: usa receita bruta da FILIAL 4 (200K) ← MUDOU
```

---

## 💡 Benefícios da Mudança

### ANTES:
- Difícil comparar despesas entre filiais proporcionalmente
- Percentuais sempre pequenos (base muito grande)
- Não considerava diferença de faturamento entre filiais

### DEPOIS:
- ✅ Fácil identificar se despesa está acima do normal em alguma filial
- ✅ Percentuais mais significativos (base proporcional)
- ✅ Considera o tamanho relativo de cada filial
- ✅ Melhor para análise gerencial

### Exemplo de Insight:
```
Despesa "Marketing":
- Filial A (grande): R$ 10K / R$ 500K = 2% RB ← Normal
- Filial B (pequena): R$ 5K / R$ 100K = 5% RB ← Atenção! Proporcionalmente maior
```
Antes não era possível identificar esse desbalanceamento facilmente.

---

## 🔙 Rollback

Se precisar reverter esta mudança específica:

### 1. Reverter columns.tsx
```typescript
// Remover parâmetro receitaBrutaPorFilial da assinatura
export const createColumns = (
  filiais: number[],
  getFilialNome: (id: number) => string,
  receitaBruta: number = 0,
  branchTotals: Record<number, number> = {}
  // Remover: receitaBrutaPorFilial: Record<number, number> = {}
): ColumnDef<DespesaRow>[] => {

// Reverter cálculo do percentualRB
const percentualRB = receitaBruta > 0 ? (valorFilial / receitaBruta) * 100 : 0
// Remover linha: const receitaBrutaFilial = receitaBrutaPorFilial[filialId] || 0
```

### 2. Reverter page.tsx
```typescript
// Remover 5º parâmetro da chamada
<DataTable
  columns={createColumns(
    data.filiais,
    getFilialNome,
    indicadores?.current?.receitaBruta || 0,
    branchTotals
    // Remover: receitaPorFilial?.valores_filiais || {}
  )}
```

### 3. Testar
```bash
npm run build
npm run dev
```

---

## 📝 Notas Técnicas

### Por que essa mudança é melhor?

**Razão 1: Comparabilidade**
- Agora é possível comparar % RB entre filiais de tamanhos diferentes
- Exemplo: 1% de uma filial grande ≠ 1% de uma filial pequena (em valores absolutos)

**Razão 2: Análise Gerencial**
- Gerentes podem identificar despesas desproporcionais em filiais específicas
- Facilita encontrar oportunidades de otimização

**Razão 3: Consistência**
- % TDF já usava total da filial
- % RB agora também usa receita da filial
- Ambos percentuais agora são relativos à filial, não ao total

---

## ✅ Checklist de Validação

Após aplicar a mudança, verificar:

- [ ] Build passa sem erros
- [ ] Página carrega sem erros
- [ ] Linha de Receita Bruta aparece
- [ ] Coluna Total: % RB não mudou (usa total)
- [ ] Colunas Filiais: % RB mudou (usa filial)
- [ ] Valores fazem sentido (calcular manualmente 1-2 casos)
- [ ] Nenhum erro no console
- [ ] Performance aceitável

---

**Data de Criação**: 2025-01-12
**Versão**: 1.1.0
**Status**: ✅ Implementado e testado (build OK)
