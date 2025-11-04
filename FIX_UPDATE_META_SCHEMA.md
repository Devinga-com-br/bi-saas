# Fix: Erro ao Atualizar Meta - Schema Table

**Data:** 2025-11-04
**Erro:** `Could not find the table 'public.okilao.metas_mensais' in the schema cache`

## 🐛 Problema

A API de atualização tentava acessar a tabela usando `.from('schema.table')`, mas o Supabase client não suporta esse formato para schemas customizados.

**Código com erro:**
```typescript
const { error } = await supabase
  .from(`${schema}.metas_mensais`)  // ❌ Não funciona
  .update({ ... })
```

## ✅ Solução

Criar uma função SQL (RPC) que executa o UPDATE no schema correto.

### Passo 1: Criar Função SQL

**Arquivo:** `UPDATE_META_MENSAL_FUNCTION.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_meta_mensal(
  p_schema TEXT,
  p_meta_id INTEGER,
  p_valor_meta NUMERIC,
  p_meta_percentual NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_result JSON;
BEGIN
  v_sql := format('
    UPDATE %I.metas_mensais
    SET 
      valor_meta = $1,
      meta_percentual = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING id, valor_meta, meta_percentual
  ', p_schema);

  EXECUTE v_sql
  USING p_valor_meta, p_meta_percentual, p_meta_id
  INTO v_result;

  RETURN json_build_object(
    'success', true,
    'message', 'Meta atualizada com sucesso',
    'data', v_result
  );
END;
$$;
```

### Passo 2: Aplicar no Supabase

1. **Abrir Supabase Dashboard**
2. **SQL Editor** (menu lateral)
3. **New Query**
4. **Copiar conteúdo** de `UPDATE_META_MENSAL_FUNCTION.sql`
5. **Colar** no editor
6. **Run** (ou CTRL+Enter)

### Passo 3: Verificar Criação

```sql
-- Verificar se função existe
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname = 'update_meta_mensal';

-- Deve retornar 1 linha
```

### Passo 4: Testar Função

```sql
-- Teste com dados reais (ajuste os valores)
SELECT public.update_meta_mensal(
  'okilao',        -- schema
  1,               -- meta_id (ID de uma meta existente)
  15000.00,        -- novo valor_meta
  12.50            -- novo meta_percentual
);

-- Resultado esperado:
{
  "success": true,
  "message": "Meta atualizada com sucesso",
  "data": { "id": 1, "valor_meta": 15000.00, "meta_percentual": 12.50 }
}
```

## 🔧 API Atualizada

**src/app/api/metas/update/route.ts**

```typescript
// Atualizar meta individual usando RPC
const { data, error } = await supabase.rpc('update_meta_mensal', {
  p_schema: schema,
  p_meta_id: metaId,
  p_valor_meta: valorMeta,
  p_meta_percentual: metaPercentual
})

if (error) {
  return NextResponse.json({ 
    error: error.message,
    hint: 'Verifique se a função update_meta_mensal está criada'
  }, { status: 500 })
}
```

## 🧪 Testar Aplicação

```bash
npm run dev
```

1. Acesse `/metas/mensal`
2. Selecione 1 filial
3. Busque metas
4. **Duplo clique** em Meta % ou Valor Meta
5. Digite novo valor e Enter
6. ✅ Deve salvar sem erro!

## ⚠️ Troubleshooting

### Erro: "function update_meta_mensal does not exist"

**Causa:** Função não foi criada no banco

**Solução:**
1. Verificar se copiou TODO o conteúdo do SQL
2. Verificar se executou sem erros
3. Conferir se está no database correto no Supabase

### Erro: "permission denied for schema"

**Causa:** Usuário não tem permissão para acessar o schema

**Solução:**
```sql
-- Dar permissões necessárias
GRANT USAGE ON SCHEMA okilao TO authenticated;
GRANT UPDATE ON okilao.metas_mensais TO authenticated;
```

### Erro: "column updated_at does not exist"

**Causa:** Tabela não tem coluna `updated_at`

**Solução:**
```sql
-- Adicionar coluna se não existir
ALTER TABLE okilao.metas_mensais 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

## 📋 Checklist de Deploy

- [ ] Criar função SQL no Supabase
- [ ] Testar função com dados reais
- [ ] Verificar permissões (GRANT EXECUTE)
- [ ] Testar edição inline na aplicação
- [ ] Verificar logs no console (sucesso)
- [ ] Confirmar que valores foram atualizados no banco

## 🎯 Schemas que Precisam da Função

Como a função está em `public`, ela funciona para TODOS os schemas:
- ✅ okilao
- ✅ saoluiz
- ✅ paraiso
- ✅ lucia
- ✅ Qualquer novo schema

**Nota:** A função usa `format('%I', p_schema)` que protege contra SQL injection.

## 📝 Comando Rápido

```bash
# Copiar função para clipboard (Mac)
cat UPDATE_META_MENSAL_FUNCTION.sql | pbcopy

# Copiar função para clipboard (Linux)
cat UPDATE_META_MENSAL_FUNCTION.sql | xclip -selection clipboard

# Copiar função para clipboard (Windows)
type UPDATE_META_MENSAL_FUNCTION.sql | clip
```

Depois é só colar no SQL Editor do Supabase e executar!

---

**Status:** ✅ Solução Implementada  
**Arquivo SQL:** `UPDATE_META_MENSAL_FUNCTION.sql`  
**API:** `src/app/api/metas/update/route.ts`  
**Testado:** Aguardando criação da função no banco
