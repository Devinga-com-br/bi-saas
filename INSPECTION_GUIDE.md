# Guia de Inspeção - Antes de Alterar Schema Demo

## 🎯 Objetivo

Analisar o estado atual das funções e tabelas **ANTES** de aplicar qualquer alteração, garantindo que não quebramos o que já funciona.

---

## 📋 Opção 1: Supabase Dashboard (Recomendado)

### Passo 1: Estrutura da Tabela

Cole no **SQL Editor**:

```sql
SELECT 
    table_schema,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'metas_mensais'
  AND table_schema IN ('demo', 'okilao', 'saoluiz', 'paraiso', 'lucia', 'sol')
ORDER BY table_schema, ordinal_position;
```

**O que verificar:**
- ✅ Schemas `okilao`, `saoluiz`, `paraiso`, `lucia`, `sol` devem TER `custo_realizado` e `lucro_realizado`
- ❌ Schema `demo` NÃO deve ter essas colunas (confirmando o problema)

---

### Passo 2: Função `atualizar_valores_realizados_metas`

Cole no **SQL Editor**:

```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'atualizar_valores_realizados_metas'
  AND n.nspname = 'public';
```

**O que verificar:**
- Função **já deve mencionar** `custo_realizado` e `lucro_realizado`
- Se não mencionar, a migration não foi aplicada nos schemas antigos

---

### Passo 3: Função `get_metas_mensais_report`

Cole no **SQL Editor**:

```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_metas_mensais_report'
  AND n.nspname = 'public';
```

**O que verificar:**
- Função **deve retornar** `total_custo`, `total_lucro`, `margem_bruta`
- SELECT deve incluir `m.custo_realizado`, `m.lucro_realizado`

---

### Passo 4: Listar Todas as Funções de Metas

Cole no **SQL Editor**:

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (p.proname LIKE '%meta%' OR p.proname LIKE '%Meta%')
  AND n.nspname = 'public'
ORDER BY p.proname;
```

**O que verificar:**
- Deve aparecer: `atualizar_valores_realizados_metas`, `get_metas_mensais_report`, `update_meta_mensal`
- Anote se existem outras funções que mencionam "meta"

---

## 📋 Opção 2: Via Linha de Comando (psql)

Se você tem acesso ao PostgreSQL:

```bash
# Configure a conexão
export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres'

# Execute o script de backup e análise
./backup-and-inspect.sh
```

**O script vai:**
1. Criar diretório `backup_funcoes_[DATA_HORA]`
2. Salvar definições de todas as funções
3. Salvar estrutura da tabela em cada schema
4. Criar backup para restauração se der problema

---

## 📋 Opção 3: Usar Arquivo SQL de Inspeção

Execute o arquivo `inspect-current-functions.sql` no **SQL Editor**:

```bash
# Copie o conteúdo de:
cat inspect-current-functions.sql
```

Cole tudo no SQL Editor e execute. Vai gerar 6 seções de análise.

---

## ✅ Checklist de Verificação

Antes de aplicar a migration `FIX_DEMO_SCHEMA_MANUAL.sql`, confirme:

### 1. Estrutura da Tabela
- [ ] Schema `demo` **NÃO** tem `custo_realizado` e `lucro_realizado`
- [ ] Outros schemas (okilao, saoluiz, etc) **TÊM** essas colunas
- [ ] A tabela `metas_mensais` existe em **todos** os schemas

### 2. Funções PostgreSQL
- [ ] `atualizar_valores_realizados_metas` existe e menciona `custo_realizado`
- [ ] `get_metas_mensais_report` existe e retorna campos de custo/lucro
- [ ] `update_meta_mensal` existe

### 3. Dados Existentes
- [ ] Não há metas cadastradas no schema `demo` (ou não tem problema perder)
- [ ] OU: Você fez backup dos dados existentes

---

## ⚠️ Situações de Alerta

### 🚨 Se as funções NÃO mencionam `custo_realizado`:

Significa que a migration `20251216_add_lucro_margem_metas_mensais.sql` **não foi aplicada** em produção.

**Ação:**
1. Aplicar primeiro a migration completa em **todos** os schemas
2. Depois adicionar schema `demo` à lista

### 🚨 Se schema `demo` já tem as colunas:

Não precisa fazer nada! O problema já foi resolvido.

### 🚨 Se outros schemas não têm as colunas:

Sistema todo está sem lucro/margem. Precisa aplicar migration completa.

---

## 📊 Resultado Esperado

### Estrutura Atual (ANTES do fix):

```
Schema     | Coluna            | Tem?
-----------|-------------------|------
okilao     | custo_realizado   | ✅ SIM
okilao     | lucro_realizado   | ✅ SIM
saoluiz    | custo_realizado   | ✅ SIM
saoluiz    | lucro_realizado   | ✅ SIM
demo       | custo_realizado   | ❌ NÃO
demo       | lucro_realizado   | ❌ NÃO
```

### Estrutura DEPOIS do fix:

```
Schema     | Coluna            | Tem?
-----------|-------------------|------
demo       | custo_realizado   | ✅ SIM
demo       | lucro_realizado   | ✅ SIM
```

---

## 🎯 Após Análise

1. **Se tudo confere**: Execute `FIX_DEMO_SCHEMA_MANUAL.sql`
2. **Se algo estranho**: Me envie o output das queries
3. **Se schemas antigos não têm as colunas**: Avise antes de prosseguir

---

## 📁 Arquivos para Análise

1. `inspect-current-functions.sql` - SQL completo para análise
2. `backup-and-inspect.sh` - Script bash com backup automático
3. `INSPECTION_GUIDE.md` - Este guia

Execute **UM** deles antes de aplicar `FIX_DEMO_SCHEMA_MANUAL.sql`!
