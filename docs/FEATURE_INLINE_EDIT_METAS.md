# Feature: Edição Inline de Metas

**Data:** 2025-11-04
**Módulo:** Meta Mensal (`/metas/mensal`)
**Status:** ✅ Implementado

## 📋 Resumo

Implementada edição inline para permitir que usuários alterem individualmente os valores de **Meta %** e **Valor Meta** diretamente nas linhas da tabela, com recálculo automático.

## ✨ Funcionalidades Implementadas

### 1. Edição de Meta Percentual
- **Como usar:** Duplo clique na célula "Meta %"
- **Comportamento:** 
  - Input numérico aparece
  - Usuário digita novo percentual (ex: 15.50)
  - Sistema calcula: `valor_meta = valor_referencia * (1 + novo_percentual / 100)`
  - Salva ambos os valores (percentual e valor calculado)

### 2. Edição de Valor Meta
- **Como usar:** Duplo clique na célula "Valor Meta"
- **Comportamento:**
  - Input numérico aparece
  - Usuário digita novo valor (ex: 12000.00)
  - Sistema calcula: `meta_percentual = ((novo_valor / valor_referencia) - 1) * 100`
  - Salva ambos os valores (valor e percentual calculado)

### 3. Recálculo Automático
- **Diferença:** `realizado - meta`
- **Diferença %:** `(diferenca / meta) * 100`
- **Totalizadores:** Recalculados automaticamente
- **Percentual Atingido:** Atualizado em tempo real

## 🎯 UX/UI

### Indicadores Visuais
- ✅ Cursor pointer nas células editáveis
- ✅ Hover effect (fundo muted/50)
- ✅ Tooltip: "Duplo clique para editar"
- ✅ Input autoFocus quando entra em modo edição
- ✅ Loading state durante salvamento

### Controles
- **Enter:** Salvar alteração
- **ESC:** Cancelar edição
- **Blur (clicar fora):** Salvar alteração
- **Duplo clique:** Ativar edição

### Estados
```typescript
interface EditingCell {
  id: number                     // ID da meta sendo editada
  field: 'percentual' | 'valor'  // Qual campo está sendo editado
}

editingCell: EditingCell | null   // Célula atual em edição
editingValue: string               // Valor sendo digitado
savingEdit: boolean                // Loading durante save
```

## 📊 Cálculos

### Quando altera Meta %
```typescript
const metaPercentual = 15.50  // Novo valor digitado
const valorMeta = valor_referencia * (1 + metaPercentual / 100)

Exemplo:
valor_referencia = 10.000
metaPercentual = 15.50

valorMeta = 10.000 * (1 + 15.50/100)
valorMeta = 10.000 * 1.155
valorMeta = 11.550
```

### Quando altera Valor Meta
```typescript
const valorMeta = 12000  // Novo valor digitado
const metaPercentual = ((valorMeta / valor_referencia) - 1) * 100

Exemplo:
valorMeta = 12.000
valor_referencia = 10.000

metaPercentual = ((12.000 / 10.000) - 1) * 100
metaPercentual = (1.2 - 1) * 100
metaPercentual = 0.2 * 100
metaPercentual = 20.00
```

### Recálculo de Diferenças
```typescript
const diferenca = valor_realizado - valorMeta
const diferenca_percentual = (diferenca / valorMeta) * 100

Exemplo:
valor_realizado = 13.000
valorMeta = 12.000 (atualizado)

diferenca = 13.000 - 12.000 = 1.000
diferenca_percentual = (1.000 / 12.000) * 100 = 8.33%
```

## 🔌 API Update

### Endpoint
`POST /api/metas/update`

### Request (Edição Individual)
```json
{
  "schema": "saoluiz",
  "metaId": 123,
  "valorMeta": 12000.00,
  "metaPercentual": 20.00
}
```

### Response
```json
{
  "message": "Meta atualizada com sucesso",
  "success": true
}
```

### Lógica Backend
```typescript
// Atualizar registro específico
UPDATE {schema}.metas_mensais
SET 
  valor_meta = valorMeta,
  meta_percentual = metaPercentual,
  updated_at = NOW()
WHERE id = metaId
```

**Nota:** A diferença e diferença_percentual são calculadas no frontend e depois recalculadas quando o relatório é recarregado.

## 🎨 Implementação

### Estados Adicionados
```typescript
// src/app/(dashboard)/metas/mensal/page.tsx

const [editingCell, setEditingCell] = useState<{
  id: number
  field: 'percentual' | 'valor'
} | null>(null)

const [editingValue, setEditingValue] = useState<string>('')
const [savingEdit, setSavingEdit] = useState(false)
```

### Funções Principais

#### startEditing
```typescript
const startEditing = (
  metaId: number, 
  field: 'percentual' | 'valor', 
  currentValue: number
) => {
  setEditingCell({ id: metaId, field })
  setEditingValue(currentValue.toFixed(2))
}
```

#### saveEdit
```typescript
const saveEdit = async () => {
  // 1. Validar valor
  const newValue = parseFloat(editingValue)
  if (isNaN(newValue)) return

  // 2. Calcular valores
  let valorMeta, metaPercentual
  if (field === 'percentual') {
    metaPercentual = newValue
    valorMeta = valor_referencia * (1 + metaPercentual / 100)
  } else {
    valorMeta = newValue
    metaPercentual = ((valorMeta / valor_referencia) - 1) * 100
  }

  // 3. Salvar no banco
  await fetch('/api/metas/update', {
    method: 'POST',
    body: JSON.stringify({
      schema, metaId, valorMeta, metaPercentual
    })
  })

  // 4. Atualizar estado local
  setReport(prev => ({
    ...prev,
    metas: prev.metas.map(m => 
      m.id === metaId 
        ? { ...m, valor_meta: valorMeta, meta_percentual: metaPercentual }
        : m
    )
  }))

  // 5. Limpar estado de edição
  setEditingCell(null)
}
```

#### handleKeyDown
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') saveEdit()
  if (e.key === 'Escape') cancelEditing()
}
```

### Células Editáveis

```tsx
{/* Meta % - Editável */}
<TableCell 
  className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
  onDoubleClick={() => startEditing(meta.id, 'percentual', meta.meta_percentual)}
  title="Duplo clique para editar"
>
  {isEditingPercentual ? (
    <Input
      type="number"
      step="0.01"
      value={editingValue}
      onChange={(e) => setEditingValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={saveEdit}
      autoFocus
      disabled={savingEdit}
      className="h-9 text-right"
    />
  ) : (
    <span>{meta.meta_percentual.toFixed(2)}%</span>
  )}
</TableCell>

{/* Valor Meta - Editável */}
<TableCell 
  className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
  onDoubleClick={() => startEditing(meta.id, 'valor', meta.valor_meta)}
  title="Duplo clique para editar"
>
  {isEditingValor ? (
    <Input
      type="number"
      step="0.01"
      value={editingValue}
      onChange={(e) => setEditingValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={saveEdit}
      autoFocus
      disabled={savingEdit}
      className="h-9 text-right"
    />
  ) : (
    <span>{formatCurrency(meta.valor_meta)}</span>
  )}
</TableCell>
```

## 📍 Onde Está Disponível

### ✅ Visualização de Filial Única
- Quando seleciona UMA filial nos filtros
- Tabela mostra todos os dias do mês
- Cada linha é editável

### ✅ Visualização Expandida por Data
- Quando seleciona múltiplas ou nenhuma filial
- Linha principal agregada (não editável)
- Linhas expandidas por filial (editáveis)

## 🧪 Como Testar

### Teste 1: Editar Meta %
1. Selecionar UMA filial nos filtros
2. Buscar relatório
3. Duplo clique em qualquer célula "Meta %"
4. Digitar novo valor (ex: 15.50)
5. Pressionar Enter
6. Verificar:
   - ✅ Valor Meta recalculado automaticamente
   - ✅ Diferenças atualizadas
   - ✅ Totalizador atualizado

### Teste 2: Editar Valor Meta
1. Selecionar UMA filial
2. Duplo clique em "Valor Meta"
3. Digitar novo valor (ex: 12000)
4. Pressionar Enter
5. Verificar:
   - ✅ Meta % recalculado automaticamente
   - ✅ Diferenças atualizadas

### Teste 3: Cancelar Edição
1. Duplo clique para editar
2. Digitar algo
3. Pressionar ESC
4. Verificar: valor volta ao original

### Teste 4: Múltiplas Filiais
1. Selecionar 2+ filiais
2. Expandir um dia
3. Duplo clique em linha de filial específica
4. Editar e salvar
5. Verificar: apenas aquela linha atualiza

## ⚠️ Validações

### Frontend
- ✅ Verifica se valor é numérico
- ✅ Impede NaN
- ✅ Formata com 2 casas decimais

### Backend
- ✅ Valida autenticação do usuário
- ✅ Valida presença de parâmetros
- ✅ Usa prepared statements (previne SQL injection)

## 🔄 Sincronização

### Estado Local vs Banco
1. **Edição:** Atualiza estado local imediatamente após salvar
2. **Reload:** Botão "Atualizar Valores" busca dados frescos do banco
3. **Navegação:** Ao mudar filtros, dados são recarregados

### Concorrência
- Se dois usuários editarem a mesma meta, última escrita vence
- Recomendação: Implementar lock otimista (versioning) no futuro

## 📈 Melhorias Futuras

- [ ] Indicador visual de "salvando..."
- [ ] Histórico de alterações (audit log)
- [ ] Undo/Redo
- [ ] Edição em lote (selecionar múltiplas linhas)
- [ ] Validação de limites (ex: meta não pode ser negativa)
- [ ] Confirmação antes de salvar valores muito diferentes
- [ ] Lock otimista para prevenir edições concorrentes
- [ ] Animação de sucesso ao salvar
- [ ] Suporte a teclado (Tab entre células)

## 🐛 Troubleshooting

### Edição não salva
- Verificar console do browser
- Verificar network tab (status code da API)
- Verificar permissões no banco de dados

### Valores não recalculam
- Verificar se `valor_referencia` não é zero
- Verificar logs do frontend (console.log nos cálculos)
- Verificar se estado está sendo atualizado

### Input não aparece
- Verificar se `editingCell` está sendo setado
- Verificar condicional `isEditingPercentual`
- Verificar se duplo clique está funcionando

## 📝 Arquivos Modificados

1. **src/app/(dashboard)/metas/mensal/page.tsx**
   - Adicionados estados: editingCell, editingValue, savingEdit
   - Adicionadas funções: startEditing, saveEdit, cancelEditing, handleKeyDown
   - Modificadas células: Meta % e Valor Meta agora são editáveis

2. **src/app/api/metas/update/route.ts**
   - Adicionada lógica para atualização individual
   - Aceita parâmetros: metaId, valorMeta, metaPercentual
   - Mantém compatibilidade com atualização em lote

---

**Implementado por:** DevIngá Team  
**Data:** 2025-11-04  
**Build:** ✅ Pronto para teste
