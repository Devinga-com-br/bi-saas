# Melhorias de UI - Filtros e Botões (Meta Mensal e Meta Setor)

## Alterações Implementadas

### 1. MultiSelect Component - Botão "Todas" Interno

**Arquivo**: [src/components/ui/multi-select.tsx](../src/components/ui/multi-select.tsx)

#### Novas Props:
```typescript
interface MultiSelectProps {
  // ... props existentes
  showSelectAll?: boolean      // Mostrar botão "Todas"
  onSelectAll?: () => void      // Callback ao clicar "Todas"
}
```

#### Mudanças Visuais:
- ✅ Botão "Todas" agora aparece **dentro** do campo MultiSelect no canto direito
- ✅ Estilo: texto roxo (primary), hover com fundo accent
- ✅ Posicionamento: flex com gap-2, badges à esquerda, botão à direita

**Antes**:
```tsx
<div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
  {badges}
  {input}
</div>
```

**Depois**:
```tsx
<div className="flex items-center gap-2">
  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto flex-1">
    {badges}
    {input}
  </div>
  {showSelectAll && (
    <button className="text-xs text-primary hover:text-primary/80 ...">
      Todas
    </button>
  )}
</div>
```

---

### 2. Meta Mensal - Ajustes de Filtros e Botões

**Arquivo**: [src/app/(dashboard)/metas/mensal/page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx)

#### Mudanças:

**A) Remoção do Botão "Limpar"** (linhas 555-567)
- ❌ Removido botão "Limpar" que estava fora do MultiSelect
- ❌ Removido container `flex items-center justify-between`

**B) Altura do Campo Filiais** (linha 556)
- ✅ Adicionado `<div className="h-10">` ao redor do MultiSelect
- ✅ Adicionado `className="h-10"` ao MultiSelect
- ✅ Agora tem **mesma altura** dos filtros Mês e Ano

**C) Cor dos Badges de Filiais** (linha 564)
- ✅ Adicionado `variant="default"` ao MultiSelect
- ✅ Badges agora usam cor **roxa (primary)** com texto escuro
- ✅ Mesmo estilo visual do botão "Cadastrar Meta"

**D) Botão "Todas" Movido** (linhas 565-566)
- ✅ Agora aparece **dentro** do MultiSelect (canto direito)
- ✅ Props: `showSelectAll={true}` e `onSelectAll={() => setFiliaisSelecionadas(branches)}`

**E) Altura dos Botões de Ação** (linhas 427, 438)
- ✅ "Atualizar Valores": `className="h-10"`
- ✅ "Cadastrar Meta": `className="h-10"`
- ✅ Ambos com **mesma altura**

#### Estrutura Final:
```tsx
{/* FILIAIS */}
<div className="flex flex-col gap-2 flex-1 min-w-0">
  <Label>Filiais</Label>
  <div className="h-10">
    <MultiSelect
      options={branches}
      value={filiaisSelecionadas}
      onValueChange={setFiliaisSelecionadas}
      className="w-full h-10"
      variant="default"
      showSelectAll={true}
      onSelectAll={() => setFiliaisSelecionadas(branches)}
    />
  </div>
</div>
```

---

### 3. Meta Setor - Mesmas Melhorias

**Arquivo**: [src/app/(dashboard)/metas/setor/page.tsx](../src/app/(dashboard)/metas/setor/page.tsx)

#### Mudanças Idênticas ao Meta Mensal:

**A) Filtro de Filiais** (linhas 747-762)
- ❌ Removido botão "Limpar"
- ❌ Removido botão "Todas" externo
- ✅ Adicionado `<div className="h-10">` ao redor
- ✅ MultiSelect com `className="h-10"` e `variant="default"`
- ✅ Botão "Todas" interno: `showSelectAll={true}`

**B) Botões de Ação** (linhas 475-486)
- ✅ "Atualizar Valores": `className="h-10"`
- ✅ "Gerar Meta": `className="h-10"`

---

## Comparação Visual

### Antes

#### Filtro de Filiais:
```
┌─────────────────────────────────────────────┐
│ Filiais              [Todas] [Limpar]       │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [Filial 1] [Filial 4] [Filial 6]       │ │
│ │ [Filial 7] [Filial 9]                  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```
- Badges cinzas (secondary)
- Botões fora do campo
- Altura inconsistente

#### Botões:
```
[Atualizar Valores]  (altura padrão)
[Cadastrar Meta]     (altura padrão)
```

---

### Depois

#### Filtro de Filiais:
```
┌─────────────────────────────────────────────┐
│ Filiais                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ [Filial 1] [Filial 4] [Filial 6]       │ │
│ │ [Filial 7] [Filial 9]          [Todas] │ │  ← Botão interno
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```
- ✅ Badges **roxos** com texto escuro
- ✅ Botão "Todas" **dentro** do campo (canto direito)
- ✅ Sem botão "Limpar"
- ✅ Altura **h-10** (mesma do Mês e Ano)

#### Botões:
```
[Atualizar Valores]  (h-10)  ← Mesma altura
[Cadastrar Meta]     (h-10)  ← Mesma altura
```

---

## Benefícios

### 1. Consistência Visual
- ✅ Todos os filtros (Filiais, Mês, Ano) com **mesma altura** (h-10)
- ✅ Todos os botões de ação com **mesma altura** (h-10)
- ✅ Badges de filiais com **mesma cor** do botão principal (roxo/primary)

### 2. Melhor UX
- ✅ Botão "Todas" mais acessível (dentro do campo, sempre visível)
- ✅ Menos poluição visual (removido botão "Limpar")
- ✅ Interface mais limpa e profissional

### 3. Reutilização
- ✅ Componente MultiSelect agora suporta botão interno
- ✅ Pode ser usado em outros módulos com mesma experiência
- ✅ Props opcionais: não quebra uso em outros lugares

---

## Arquivos Modificados

1. ✅ [src/components/ui/multi-select.tsx](../src/components/ui/multi-select.tsx)
   - Adicionadas props `showSelectAll` e `onSelectAll`
   - Layout alterado para suportar botão interno
   - Estilização do botão "Todas"

2. ✅ [src/app/(dashboard)/metas/mensal/page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx)
   - Removido botão "Limpar" (linhas 555-567)
   - Adicionada altura h-10 ao campo Filiais
   - Adicionado `variant="default"` aos badges
   - Botões de ação com h-10
   - Botão "Todas" movido para dentro do MultiSelect

3. ✅ [src/app/(dashboard)/metas/setor/page.tsx](../src/app/(dashboard)/metas/setor/page.tsx)
   - Mesmas alterações do Meta Mensal
   - Filtros e botões padronizados

---

## Comportamento

### Filtro de Filiais

#### Ao Carregar Página
- **Ação**: Seleciona automaticamente TODAS as filiais
- **Estado**: `filiaisSelecionadas = [filial1, filial4, filial6, ...]`
- **Visual**: Badges roxas visíveis, botão "Todas" no canto direito

#### Clicar no Botão "Todas" (Interno)
- **Ação**: `setFiliaisSelecionadas(branches)`
- **Resultado**: Seleciona todas as filiais disponíveis
- **Visual**: Botão mantém estilo roxo, sempre visível

#### Remover Filial Individual
- **Ação**: Clicar no X de um badge
- **Resultado**: Remove filial da seleção
- **Estado**: `filiaisSelecionadas = filiaisSelecionadas.filter(...)`

#### Limpar Todas (Manual)
- **Ação**: Usuário remove badges um a um
- **Alternativa**: Pode usar backspace no campo de input
- **Nota**: Sem botão "Limpar" dedicado (simplificação)

---

## Compatibilidade

### Outros Módulos que Usam MultiSelect
- ✅ Props `showSelectAll` e `onSelectAll` são **opcionais**
- ✅ Comportamento padrão mantido se não passadas
- ✅ Não há breaking changes

### Exemplo de Uso Antigo (ainda funciona):
```tsx
<MultiSelect
  options={options}
  value={value}
  onValueChange={setValue}
/>
```

### Exemplo de Novo Uso:
```tsx
<MultiSelect
  options={branches}
  value={selected}
  onValueChange={setSelected}
  variant="default"
  showSelectAll={true}
  onSelectAll={() => setSelected(branches)}
/>
```

---

## Observações

1. **Altura h-10**: Equivalente a 40px (Tailwind h-10 = 2.5rem = 40px)
2. **Cor Primary**: Definida em `tailwind.config.ts` como roxo (#8B5CF6 ou similar)
3. **Badge Variant Default**: Usa `bg-primary text-primary-foreground` ([badge.tsx:13](../src/components/ui/badge.tsx#L13))
4. **Scroll Interno**: MultiSelect mantém `max-h-24 overflow-y-auto` para muitas seleções
5. **Responsividade**: Layout mantém `flex-col` em mobile, `flex-row` em desktop

---

## Screenshots (Referência do Usuário)

O usuário enviou screenshot mostrando:
- ✅ Filiais deve ter mesma altura de Mês e Ano (h-10)
- ✅ Botão "Todas" deve estar dentro do campo (canto direito)
- ✅ Remover botão "Limpar"
- ✅ Badges roxos (mesma cor do botão Cadastrar Meta)
- ✅ Botões de ação com mesma altura

---

## Troubleshooting

### Problema: Botão "Todas" não aparece

**Causa**: Props não passadas ao MultiSelect

**Solução**:
```tsx
<MultiSelect
  showSelectAll={true}
  onSelectAll={() => setFiliaisSelecionadas(branches)}
  // ... outras props
/>
```

---

### Problema: Badges ainda aparecem cinzas

**Causa**: Falta prop `variant="default"`

**Solução**:
```tsx
<MultiSelect
  variant="default"  // ← Adicionar esta linha
  // ... outras props
/>
```

---

### Problema: Altura do campo inconsistente

**Causa**: Falta `className="h-10"` no MultiSelect ou wrapper

**Solução**:
```tsx
<div className="h-10">
  <MultiSelect className="w-full h-10" />
</div>
```

---

## Status

✅ **Implementado e Testado**
- Data: 2025-11-06
- Módulos: Meta Mensal e Meta Setor
- Componente: MultiSelect
- Breaking Changes: Nenhum
