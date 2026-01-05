# Fix: Erro ao Editar Metas Mensais

**Data:** 2026-01-05  
**Problema:** Erro "Dados inválidos" ao tentar editar (inclusive zerar) metas mensais

## 🐛 Problema Identificado

### Sintomas
- Erro ao duplo-clicar e editar qualquer meta
- Erro específico ao tentar zerar meta de dias sem venda
- Console mostra: `[METAS] Erro ao atualizar: {}`
- API retorna: `Dados inválidos`

### Causa Raiz

**1. Tipo de Dado Incorreto na Validação**
- A tabela `metas_mensais` usa `id BIGINT` (número inteiro)
- A validação da API esperava `UUID` (string)
- Incompatibilidade causava falha na validação Zod

**2. Problema na Função RPC `update_meta_mensal`**
- A função tentava armazenar um RECORD em variável JSON
- `EXECUTE ... INTO v_result` não funciona corretamente com JSON
- Faltava cálculo de diferença e diferença_percentual no update

## ✅ Solução Implementada

### 1. Correção da Validação (API)

**Arquivo:** `src/app/api/metas/update/route.ts`

```typescript
// ANTES:
metaId: z.string().uuid('ID da meta deve ser um UUID válido')

// DEPOIS:
metaId: z.union([z.string(), z.number()])
  .transform(val => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val
    if (isNaN(num) || num <= 0) {
      throw new Error('ID da meta deve ser um número positivo válido')
    }
    return num
  })
```

### 2. Correção da Função RPC

**Arquivo:** `supabase/migrations/20260105_fix_update_meta_mensal.sql`

**Mudanças principais:**
- ✅ Buscar `valor_realizado`, `custo_realizado` e `lucro_realizado` ANTES do update
- ✅ Calcular `diferenca` e `diferenca_percentual` corretamente
- ✅ Armazenar valores individuais ao invés de tentar usar JSON direto
- ✅ Retornar JSON estruturado com `success`, `message`, `data` e `calculated`
- ✅ Tratamento de erro quando meta não existe
- ✅ Verificação de rows_updated

### 3. Melhorias no Frontend

**Arquivo:** `src/app/(dashboard)/metas/mensal/page.tsx`

- ✅ Validação de valores negativos (sugere usar 0)
- ✅ Logs detalhados antes e depois do request
- ✅ Mensagens de erro mais descritivas
- ✅ Tratamento quando meta não é encontrada

**Arquivo:** `src/app/(dashboard)/metas/setor/page.tsx`
- ✅ Mesmas melhorias aplicadas para consistência

## 📋 Como Aplicar

### Passo 1: Aplicar Migration

```bash
./apply-fix-update-meta.sh
```

Ou manualmente no Supabase SQL Editor:
```sql
-- Copiar conteúdo de supabase/migrations/20260105_fix_update_meta_mensal.sql
-- Colar e executar
```

### Passo 2: Rebuild do Projeto

```bash
npm run build
```

### Passo 3: Testar

1. Acessar `/metas/mensal`
2. Duplo-clique em qualquer meta
3. Digitar `0` e pressionar Enter
4. Verificar console para logs: `[METAS] 📤 Enviando para API:`
5. Confirmar que meta foi atualizada com sucesso

## 🔍 Debugging

Se ainda houver erros, verificar:

1. **Console do Browser:**
   - `[METAS] 📤 Enviando para API:` → Ver valores enviados
   - `[METAS] ❌ Erro ao atualizar:` → Ver resposta da API

2. **Logs da API:**
   - `[API/METAS/UPDATE] 📥 Request received:` → Ver o que chegou
   - `[API/METAS/UPDATE] Validation result:` → Ver se passou validação
   - `[API/METAS/UPDATE] RPC Response:` → Ver retorno da função

3. **Logs do Supabase:**
   - Verificar se função foi criada: `\df update_meta_mensal`
   - Testar função diretamente:
     ```sql
     SELECT update_meta_mensal('okilao', 123, 1000.00, 5.0);
     ```

## 📊 Estrutura de Retorno da Função

```json
{
  "success": true,
  "message": "Meta atualizada com sucesso",
  "data": {
    "id": 123,
    "valor_meta": 1000.00,
    "meta_percentual": 5.0,
    "diferenca": -500.00,
    "diferenca_percentual": -33.33
  },
  "calculated": {
    "valor_realizado": 500.00,
    "custo_realizado": 300.00,
    "lucro_realizado": 200.00
  }
}
```

## ✨ Benefícios

- ✅ Permite editar qualquer meta (inclusive zerar)
- ✅ Validação robusta de tipos
- ✅ Logs detalhados para debugging
- ✅ Mensagens de erro claras
- ✅ Cálculo automático de diferenças
- ✅ Consistência entre metas mensais e por setor

## 🎯 Casos de Uso Suportados

| Caso | Antes | Depois |
|------|-------|--------|
| Editar meta normal | ❌ Erro | ✅ Funciona |
| Zerar meta | ❌ Erro | ✅ Funciona |
| Meta sem valor de referência | ❌ Erro | ✅ Funciona |
| Meta com valor_realizado = 0 | ❌ Erro | ✅ Funciona |
| Valor negativo | N/A | ✅ Bloqueado com mensagem clara |

## 📝 Arquivos Modificados

1. `src/app/api/metas/update/route.ts` - Validação e tratamento de resposta
2. `src/app/(dashboard)/metas/mensal/page.tsx` - Logs e validações
3. `src/app/(dashboard)/metas/setor/page.tsx` - Logs e validações
4. `supabase/migrations/20260105_fix_update_meta_mensal.sql` - **NOVA** função corrigida
5. `apply-fix-update-meta.sh` - **NOVO** script de aplicação
