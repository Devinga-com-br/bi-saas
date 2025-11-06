# Correção do Filtro de Filiais - Metas Mensais

## Problema Identificado

No módulo **Metas/Mensal**, o filtro de filiais apresentava comportamento inconsistente:

### Sintomas
1. **Erro ao atualizar valores**: `Error updating filial: 1 undefined`
2. **Filtro se perdendo** ao carregar a página pela primeira vez
3. **Opção "Todas as Filiais"** causava confusão:
   - Aparecia como uma opção selecionável junto com filiais individuais
   - Não ficava claro se era um filtro ou todas as filiais selecionadas
   - Causava erro ao tentar processar `value: 'all'` como número

### Causa Raiz

**1. Opção "all" Misturada com Filiais Reais**
```typescript
// ❌ ANTES: "all" era tratado como uma filial
options: [
  { value: 'all', label: 'Todas as Filiais' },
  { value: '1', label: 'Filial 1' },
  { value: '4', label: 'Filial 4' },
  // ...
]
```

**2. Filtragem Inconsistente**
```typescript
// ❌ Precisava filtrar "all" em vários lugares
const filialIds = filiaisSelecionadas
  .filter(f => f.value !== 'all')  // Esquecia de filtrar às vezes
  .map(f => f.value)
```

**3. Conversão para Número Falhava**
```typescript
// ❌ parseInt('all') = NaN
const filialIds = filiaisSelecionadas.map(f => parseInt(f.value))
```

## Solução Implementada

### 1. Remover Opção "all" da Lista

**Arquivo**: [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx#L61-L65)

**Antes**:
```typescript
const { options: todasAsFiliais, branchOptions: branches } = useBranchesOptions({
  tenantId: currentTenant?.id,
  enabled: !!currentTenant
  // includeAll: true (padrão)
})
```

**Depois**:
```typescript
const { branchOptions: branches } = useBranchesOptions({
  tenantId: currentTenant?.id,
  enabled: !!currentTenant,
  includeAll: false  // ✅ Não incluir opção "Todas as Filiais"
})
```

### 2. Adicionar Botões "Todas" e "Limpar"

**Arquivo**: [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx#L613-L646)

**Interface Melhorada**:
```tsx
<div className="flex items-center justify-between">
  <Label>Filiais</Label>
  <div className="flex gap-1">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setFiliaisSelecionadas(branches)}  // ✅ Seleciona TODAS
    >
      Todas
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setFiliaisSelecionadas([])}  // ✅ Limpa seleção
    >
      Limpar
    </Button>
  </div>
</div>
<MultiSelect
  options={branches}  // ✅ Apenas filiais reais, sem "all"
  value={filiaisSelecionadas}
  onValueChange={setFiliaisSelecionadas}
/>
```

### 3. Simplificar Lógica de Filtragem

**Arquivo**: [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx)

**loadReport** (linhas 126-134):
```typescript
// ✅ DEPOIS: Não precisa mais filtrar "all"
if (filiaisSelecionadas.length > 0) {
  const filialIds = filiaisSelecionadas
    .map(f => f.value)  // Sem filter de "all"
    .join(',')

  params.append('filial_id', filialIds)
}
```

**handleUpdateValues** (linhas 216-218):
```typescript
// ✅ DEPOIS: Conversão direta para número
const filialIds = filiaisSelecionadas.length > 0
  ? filiaisSelecionadas.map(f => parseInt(f.value))  // Sem filter de "all"
  : [null]
```

### 4. Inicialização Correta

**Arquivo**: [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx#L108-L113)

**Antes**:
```typescript
useEffect(() => {
  if (!isLoadingBranches && todasAsFiliais.length > 0) {
    setFiliaisSelecionadas(todasAsFiliais)  // ❌ Incluía "all"
  }
}, [isLoadingBranches, todasAsFiliais])
```

**Depois**:
```typescript
useEffect(() => {
  if (!isLoadingBranches && branches && branches.length > 0) {
    setFiliaisSelecionadas(branches)  // ✅ Apenas filiais reais
  }
}, [isLoadingBranches, branches])
```

### 5. Melhor Tratamento de Erros

**Arquivo**: [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx#L220-L261)

```typescript
const errors: string[] = []

for (const filialId of filialIds) {
  try {
    // ... chamada API
    if (response.ok && data.success) {
      successCount++
    } else {
      errorCount++
      const errorMsg = data.error || 'Erro desconhecido'
      errors.push(`Filial ${filialId}: ${errorMsg}`)  // ✅ Mensagem clara
    }
  } catch (error) {
    errorCount++
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
    errors.push(`Filial ${filialId}: ${errorMsg}`)  // ✅ Mensagem clara
  }
}

// ✅ Exibir até 3 erros detalhados
if (errorCount > 0) {
  const errorList = errors.slice(0, 3).join('\n')
  const moreErrors = errors.length > 3 ? `\n... e mais ${errors.length - 3} erros` : ''
  alert(`Atualização concluída com erros.\n${errorList}${moreErrors}`)
}
```

## Resultado

### Antes da Correção
```
❌ Opção "all" misturada com filiais
❌ Erro: "Error updating filial: 1 undefined"
❌ Filtro se perdia ao carregar página
❌ Comportamento inconsistente
```

### Depois da Correção
```
✅ Apenas filiais reais no MultiSelect
✅ Botões "Todas" e "Limpar" claros
✅ Filtro mantido ao carregar página
✅ Erros detalhados e claros
✅ Lógica simplificada (sem filter de "all")
```

## Interface Visual

### Antes
```
┌─────────────────────────────┐
│ Filiais                     │
├─────────────────────────────┤
│ ☑ Todas as Filiais          │  ← Confuso!
│ ☑ Filial 1 - Loja A         │
│ ☑ Filial 4 - Loja B         │
└─────────────────────────────┘
```

### Depois
```
┌─────────────────────────────┐
│ Filiais    [Todas] [Limpar] │  ← Claro!
├─────────────────────────────┤
│ ☑ Filial 1 - Loja A         │
│ ☑ Filial 4 - Loja B         │
│ ☐ Filial 6 - Loja C         │
└─────────────────────────────┘
```

## Comportamento Detalhado

### 1. Ao Carregar a Página
- **Ação**: Seleciona automaticamente TODAS as filiais
- **Estado**: `filiaisSelecionadas = [filial1, filial4, filial6, ...]`
- **Exibição**: Todas as badges visíveis no MultiSelect

### 2. Botão "Todas"
- **Ação**: `setFiliaisSelecionadas(branches)`
- **Resultado**: Seleciona todas as filiais disponíveis
- **Uso**: Atalho rápido para selecionar tudo

### 3. Botão "Limpar"
- **Ação**: `setFiliaisSelecionadas([])`
- **Resultado**: Remove todas as seleções
- **API**: Quando vazio, busca/atualiza TODAS (comportamento padrão)

### 4. Seleção Individual
- **Ação**: Clicar em uma filial no dropdown
- **Resultado**: Adiciona/remove filial da seleção
- **Estado**: `filiaisSelecionadas = [filial1, filial4]`

## Vantagens da Nova Abordagem

### 1. Clareza
- ✅ Separação clara entre ações (botões) e dados (filiais)
- ✅ Não há confusão sobre "Todas as Filiais" ser ou não uma filial

### 2. Simplicidade
- ✅ Sem necessidade de filtrar "all" em múltiplos lugares
- ✅ Conversão direta de string para número sem validações extras

### 3. Consistência
- ✅ Mesmo comportamento em todos os lugares do código
- ✅ Estado sempre válido (apenas filiais reais)

### 4. Manutenibilidade
- ✅ Menos código condicional
- ✅ Mais fácil de entender e debugar

## Compatibilidade

### Outros Módulos
Esta correção **NÃO afeta** outros módulos porque:
- ✅ Mudança apenas em `metas/mensal/page.tsx`
- ✅ Hook `useBranchesOptions` mantém parâmetro `includeAll`
- ✅ Outros módulos podem continuar usando `includeAll: true`

### Exemplo: Meta por Setor
```typescript
// Continua funcionando normalmente
const { options } = useBranchesOptions({
  tenantId: currentTenant?.id,
  includeAll: true  // Ainda pode usar opção "all" se precisar
})
```

## Observações

1. **Filiais Vazias**: Se `filiaisSelecionadas.length === 0`, a API busca/atualiza **TODAS**
2. **Performance**: Carregar todas as filiais não tem impacto negativo (processamento paralelo)
3. **UX**: Botões "Todas"/"Limpar" são mais intuitivos que opção "all" na lista

## Troubleshooting

### Problema: Botões "Todas"/"Limpar" não aparecem

**Causa**: CSS ou componente Button não importado

**Solução**:
- Verifique import: `import { Button } from '@/components/ui/button'`
- Verifique estilos Tailwind

### Problema: Ao clicar "Todas", não seleciona todas

**Causa**: `branches` está vazio ou undefined

**Solução**:
- Verifique se `branches` tem dados
- Adicione log: `console.log('branches:', branches)`
- Aguarde `isLoadingBranches === false`

### Problema: Erro "Cannot read property 'value' of undefined"

**Causa**: Tentando mapear array vazio

**Solução**:
- Sempre verifique: `if (filiaisSelecionadas.length > 0)`
- Use fallback: `filiaisSelecionadas || []`

## Arquivos Modificados

- ✅ [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx)
  - Linha 61-65: Hook sem `includeAll`
  - Linha 108-113: Inicialização correta
  - Linha 126-134: Filtragem simplificada em `loadReport`
  - Linha 209-270: Tratamento de erros em `handleUpdateValues`
  - Linha 609-646: Nova interface com botões
