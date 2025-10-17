# 🚨 SOLUÇÃO RÁPIDA - Erro PGRST106 (Schema não exposto)

## Problema
```
Error PGRST106: The schema must be one of the following: public, graphql_public, okilao, saoluiz, paraiso
```

O schema `lucia` existe no banco, mas **não está configurado como "exposto"** no Supabase.

---

## ✅ SOLUÇÃO (2 minutos)

### 1. Acesse o Supabase Dashboard
```
https://supabase.com/dashboard/project/[seu-project-id]
```

### 2. Vá para Settings → API
- Menu lateral esquerdo
- Clique em **"Settings"**
- Clique em **"API"**

### 3. Encontre "Exposed schemas"
- Role a página para baixo
- Procure pela seção **"API Settings"**
- Encontre o campo **"Exposed schemas"** ou **"DB Schemas"**

### 4. Adicione o Schema "lucia"
**Antes:**
```
public, graphql_public, okilao, saoluiz, paraiso
```

**Depois:**
```
public, graphql_public, okilao, saoluiz, paraiso, lucia
```

### 5. Salve
- Clique no botão **"Save"** ou **"Update"**
- Aguarde 1-2 minutos para propagar

### 6. Teste
- Recarregue a página `/configuracoes/setores`
- O erro deve desaparecer

---

## 🔧 Se o Erro Persistir

### Opção A: Verificar Permissões no PostgreSQL
Execute no SQL Editor do Supabase:

```sql
-- Dar permissões ao schema lucia
GRANT USAGE ON SCHEMA lucia TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA lucia TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA lucia TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA lucia TO anon, authenticated, service_role;
```

### Opção B: Verificar Nome do Schema
Confirme que o nome está igual em todos os lugares:

```sql
-- 1. Verificar se o schema existe
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'lucia';

-- 2. Verificar na tabela tenants
SELECT name, supabase_schema FROM public.tenants WHERE supabase_schema = 'lucia';
```

### Opção C: Limpar Cache
1. Feche todas as abas do navegador
2. Abra em modo anônimo
3. Faça login novamente
4. Teste a funcionalidade

---

## 📋 Checklist Completo para Novo Tenant

Quando criar um novo tenant, sempre seguir esta ordem:

- [ ] 1. Criar schema no PostgreSQL (`CREATE SCHEMA lucia;`)
- [ ] 2. Criar tabelas no schema
- [ ] 3. Criar funções RPC necessárias
- [ ] 4. Configurar permissões (GRANT)
- [ ] 5. Inserir registro na tabela `public.tenants`
- [ ] 6. **ADICIONAR SCHEMA AOS "EXPOSED SCHEMAS" NO SUPABASE** ← CRÍTICO!
- [ ] 7. Aguardar 1-2 minutos
- [ ] 8. Testar via API/Interface

---

## 📁 Arquivos Úteis

### Documentação Completa
- `/docs/SUPABASE_SCHEMA_CONFIGURATION.md` - Guia detalhado

### Script SQL para Preparar Schema
- `/supabase/migrations/999_create_lucia_tenant_schema.sql` - Template completo

---

## 🎯 Resumo Ultra-Rápido

**O que fazer:**
1. Supabase Dashboard → Settings → API
2. Encontrar "Exposed schemas"
3. Adicionar `, lucia` no final
4. Salvar
5. Aguardar 1-2 min
6. Testar

**Tempo estimado:** 2 minutos

---

**Status:** ✅ Solução Pronta  
**Urgência:** Alta  
**Complexidade:** Baixa (apenas configuração)
