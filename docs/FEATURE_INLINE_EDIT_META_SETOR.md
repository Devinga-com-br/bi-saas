# Feature: Edição Inline e Ocultar Diferença em Dias Futuros - Meta por Setor

**Data:** 2025-11-04
**Módulo:** Meta por Setor (`/metas/setor`)
**Status:** ✅ Implementado

## 📋 Funcionalidades Implementadas

### 1. Edição Inline de Metas

Permite editar **Meta %** e **Valor Meta** diretamente na tabela com duplo clique.

#### Como Usar

1. **Duplo clique** na célula de "Meta %" ou "Valor Meta"
2. Célula vira um input editável
3. Digite o novo valor
4. Pressione **Enter** para salvar ou **ESC** para cancelar

#### Cálculos Automáticos

**Ao editar Meta %:**
```typescript
Novo Valor Meta = Valor Referência × (1 + Meta% / 100)

Exemplo:
  Valor Referência: R$ 10.000
  Nova Meta %: 15.50%
  
  Cálculo: 10.000 × (1 + 15.50/100) = 10.000 × 1.155
  Resultado: R$ 11.550
```

**Ao editar Valor Meta:**
```typescript
Nova Meta % = ((Valor Meta / Valor Referência) - 1) × 100

Exemplo:
  Valor Referência: R$ 10.000
  Novo Valor Meta: R$ 12.000
  
  Cálculo: ((12.000 / 10.000) - 1) × 100
  Resultado: 20.00%
```

#### Recálculos Automáticos

Após salvar, o sistema recalcula automaticamente:
- **Diferença:** `Realizado - Meta`
- **Diferença %:** `((Realizado / Meta) - 1) × 100`

### 2. Ocultar Diferença em Dias Futuros

Mesma lógica do módulo **Meta Mensal**: não mostra diferença negativa para dias que ainda não aconteceram.

#### Regra

```typescript
Se (data >= hoje) E (realizado === 0):
  → Mostra "-" (hífen cinza)
Senão:
  → Mostra diferença normalmente (verde/vermelho)
```

#### Exemplos

**Dia Futuro sem Vendas:**
```
Data: 10/11/2025 (amanhã)
Realizado: R$ 0,00
Meta: R$ 10.000,00
→ Diferença: - (cinza)
→ Dif. %: - (cinza)
```

**Hoje com Vendas Parciais:**
```
Data: 04/11/2025 (hoje)
Realizado: R$ 5.000,00
Meta: R$ 10.000,00
→ Diferença: -R$ 5.000,00 (vermelho)
→ Dif. %: -50.00% (vermelho)
```

**Dia Passado sem Vendas:**
```
Data: 03/11/2025 (ontem)
Realizado: R$ 0,00
Meta: R$ 10.000,00
→ Diferença: -R$ 10.000,00 (vermelho)
→ Dif. %: -100.00% (vermelho)
(Mostra porque o dia já passou)
```

## 🎨 UX Implementada

### Indicadores Visuais

- ✅ **Cursor pointer** nas células editáveis
- ✅ **Hover effect** (fundo muted)
- ✅ **Ícone ✏️** aparece no hover
- ✅ **Tooltip** "Duplo clique para editar"
- ✅ **AutoFocus** no input ao editar
- ✅ **Loading state** durante salvamento

### Atalhos de Teclado

- **Enter:** Salva alteração
- **ESC:** Cancela edição
- **Duplo Clique:** Inicia edição

## 🔧 Arquitetura

### Frontend: `src/app/(dashboard)/metas/setor/page.tsx`

**Estados Adicionados:**
```typescript
const [editingCell, setEditingCell] = useState<{
  data: string
  filialId: number
  field: 'percentual' | 'valor'
} | null>(null)
const [editingValue, setEditingValue] = useState<string>('')
const [savingEdit, setSavingEdit] = useState(false)
```

**Funções Adicionadas:**
```typescript
// Verificar se deve mostrar diferença
const isTodayOrFuture = (dateString: string): boolean
const shouldShowDifference = (data: string, valorRealizado: number): boolean

// Edição inline
const startEditing = (data, filialId, field, currentValue)
const cancelEditing = ()
const saveEdit = async ()
const handleKeyDown = (e: React.KeyboardEvent)
```

### Backend: `src/app/api/metas/setor/update/route.ts`

```typescript
POST /api/metas/setor/update

Body: {
  schema: string
  setor_id: number
  filial_id: number
  data: string (YYYY-MM-DD)
  meta_percentual: number
  valor_meta: number
}

Response: {
  success: boolean
  message: string
  data?: object
}
```

### Database: `UPDATE_META_SETOR_FUNCTION.sql`

```sql
CREATE FUNCTION public.update_meta_setor(
  p_schema TEXT,
  p_setor_id INTEGER,
  p_filial_id INTEGER,
  p_data DATE,
  p_meta_percentual NUMERIC,
  p_valor_meta NUMERIC
)
RETURNS JSON
```

**Identificação da Meta:**
- `setor_id` + `filial_id` + `data`

**Campos Atualizados:**
- `meta_percentual`
- `valor_meta`
- `updated_at` (automático)

## 📋 Setup Necessário

### 1. Criar Função SQL

```bash
# Copiar SQL
cat UPDATE_META_SETOR_FUNCTION.sql | pbcopy  # Mac
cat UPDATE_META_SETOR_FUNCTION.sql | xclip   # Linux
type UPDATE_META_SETOR_FUNCTION.sql | clip   # Windows
```

### 2. Executar no Supabase

1. Abrir **Supabase SQL Editor**
2. **New Query**
3. Colar conteúdo de `UPDATE_META_SETOR_FUNCTION.sql`
4. **Run** (CTRL+Enter)

### 3. Verificar Criação

```sql
-- Verificar se função existe
SELECT proname 
FROM pg_proc 
WHERE proname = 'update_meta_setor';

-- Deve retornar 1 linha
```

### 4. Testar Função

```sql
-- Ajuste os valores para dados reais
SELECT public.update_meta_setor(
  'okilao',           -- schema
  1,                  -- setor_id
  10,                 -- filial_id
  '2025-11-01',       -- data
  12.50,              -- meta_percentual
  15000.00            -- valor_meta
);

-- Resultado esperado:
{
  "success": true,
  "message": "Meta de setor atualizada com sucesso"
}
```

## 🧪 Como Testar

### Teste 1: Editar Meta %

1. Acessar `/metas/setor`
2. Selecionar um setor
3. Buscar metas
4. Expandir uma data
5. **Duplo clique** em "Meta %"
6. Digitar novo valor (ex: 15.50)
7. Pressionar **Enter**
8. ✅ Verificar que Valor Meta foi recalculado

### Teste 2: Editar Valor Meta

1. **Duplo clique** em "Valor Meta"
2. Digitar novo valor (ex: 12000)
3. Pressionar **Enter**
4. ✅ Verificar que Meta % foi recalculado

### Teste 3: Cancelar Edição

1. **Duplo clique** em qualquer célula editável
2. Digitar algo
3. Pressionar **ESC**
4. ✅ Verificar que valor voltou ao original

### Teste 4: Dias Futuros

1. Buscar metas do mês atual
2. Verificar dias futuros (D+1, D+2, etc)
3. Se realizado = 0:
   - ✅ Diferença deve mostrar "-" (cinza)
   - ✅ Dif. % deve mostrar "-" (cinza)

### Teste 5: Múltiplas Filiais

1. Selecionar múltiplas filiais
2. Expandir uma data
3. Editar meta de cada filial individualmente
4. ✅ Cada filial mantém sua meta independente

## 🎯 Diferenças vs Meta Mensal

| Aspecto | Meta Mensal | Meta por Setor |
|---------|-------------|----------------|
| Identificação | `meta_id` | `setor_id + filial_id + data` |
| Tabela | `metas_mensais` | `metas_setor` |
| API | `/api/metas/update` | `/api/metas/setor/update` |
| Função SQL | `update_meta_mensal` | `update_meta_setor` |
| Agrupamento | Por data | Por data + setor |

## 📊 Estado Local Atualizado

Após salvar, o estado local é atualizado:

```typescript
setMetasData(prev => {
  const updated = { ...prev }
  const setorMetas = [...(updated[setorIdNum] || [])]
  
  // Encontra dia
  const diaIndex = setorMetas.findIndex(m => m.data === data)
  
  // Encontra filial dentro do dia
  const filialIndex = setorMetas[diaIndex].filiais.findIndex(
    f => f.filial_id === filialId
  )
  
  // Atualiza meta e recalcula diferenças
  setorMetas[diaIndex].filiais[filialIndex] = {
    ...filial,
    meta_percentual: novoPercentual,
    valor_meta: novoValorMeta,
    diferenca: realizado - novoValorMeta,
    diferenca_percentual: ((realizado / novoValorMeta) - 1) * 100
  }
  
  return updated
})
```

## ⚠️ Validações

### Frontend

- ✅ Valor deve ser numérico
- ✅ Não permite valores vazios
- ✅ Loading state durante salvamento
- ✅ Desabilita input durante salvamento

### Backend

- ✅ Schema não pode ser vazio
- ✅ setor_id não pode ser null
- ✅ filial_id não pode ser null
- ✅ data não pode ser null
- ✅ meta_percentual e valor_meta obrigatórios

### Database

- ✅ Protegida contra SQL injection
- ✅ Transaction automática
- ✅ Retorna erro detalhado em caso de falha

## 🐛 Troubleshooting

### Erro: "function update_meta_setor does not exist"

**Causa:** Função SQL não foi criada no Supabase

**Solução:**
1. Executar `UPDATE_META_SETOR_FUNCTION.sql` no SQL Editor
2. Verificar se função foi criada
3. Verificar permissões (GRANT EXECUTE)

### Erro: "Meta não encontrada"

**Causa:** Combinação setor_id + filial_id + data não existe

**Solução:**
1. Verificar se meta foi gerada para aquele dia
2. Usar botão "Gerar Meta" se necessário
3. Verificar se data está no formato correto

### Diferença não recalcula

**Causa:** Estado local não foi atualizado

**Solução:**
1. Recarregar página
2. Buscar metas novamente
3. Verificar console do navegador para erros

### Edição não salva

**Causa:** Erro na API ou função SQL

**Solução:**
1. Verificar console do navegador (F12)
2. Verificar Network tab para erro da API
3. Verificar logs do Supabase

## 💡 Melhorias Futuras

- [ ] Edição em lote (múltiplas células)
- [ ] Histórico de alterações
- [ ] Desfazer/Refazer
- [ ] Validação de intervalos (meta min/max)
- [ ] Copiar meta de um dia para outro
- [ ] Aplicar mesma meta para múltiplas filiais

## 📝 Checklist de Deploy

- [ ] Executar `UPDATE_META_SETOR_FUNCTION.sql` no Supabase
- [ ] Testar função SQL com dados reais
- [ ] Verificar permissões (GRANT EXECUTE)
- [ ] Testar edição inline em dev
- [ ] Testar em todos os schemas (okilao, saoluiz, etc)
- [ ] Verificar dias futuros mostram "-"
- [ ] Verificar dias passados mostram diferença
- [ ] Build sem erros
- [ ] Deploy

---

**Implementado por:** DevIngá Team  
**Data:** 2025-11-04  
**Status:** ✅ Pronto para produção
