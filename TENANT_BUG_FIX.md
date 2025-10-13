# 🐛 Bug: Criação Automática de Tenants ao Criar Usuários

## 📋 Resumo do Problema

Ao criar um novo usuário no sistema, um registro **tenant (empresa)** era criado automaticamente na tabela `tenants` com o nome do usuário, causando:

- ❌ Empresas falsas aparecendo no módulo de Empresas
- ❌ Nomes de usuários listados como empresas
- ❌ Tenants sem CNPJ, sem telefone, com slug genérico

---

## 🔍 Causa Raiz

### Trigger Problemático

Existia um **trigger no banco de dados** que executava automaticamente ao criar usuários:

```sql
-- Trigger na tabela auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Função Problemática

A função `handle_new_user()` fazia:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_var UUID;
BEGIN
  -- ❌ PROBLEMA: Cria um tenant automaticamente
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Empresa'),
    'tenant-' || NEW.id
  )
  RETURNING id INTO tenant_id_var;

  -- Cria user_profile vinculado ao tenant criado
  INSERT INTO public.user_profiles (id, tenant_id, full_name, role)
  VALUES (
    NEW.id,
    tenant_id_var,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fluxo Causando o Bug

```
1. Admin cria usuário via /api/users/create
   ↓
2. API cria auth.user com nome "João Silva"
   ↓
3. ❌ Trigger on_auth_user_created dispara automaticamente
   ↓
4. ❌ Função handle_new_user() executa:
   - Cria tenant com name="João Silva", slug="tenant-uuid"
   - Cria user_profile vinculado a esse tenant
   ↓
5. API tenta criar/atualizar user_profile
   ↓
6. Resultado: "João Silva" aparece como empresa!
```

---

## 📊 Dados Afetados

### Empresas Legítimas (Criadas Manualmente)
| ID | Nome | CNPJ | Status |
|----|------|------|--------|
| `030bc3ce...` | Okilao Supermercado | 00.000.000/0000-00 | ✅ Manter |
| `9402d6f1...` | Paraiso | 81.900.227/0001-95 | ✅ Manter |

### "Empresas" Criadas Automaticamente (Bug)
| ID | Nome | Criado em | Status |
|----|------|-----------|--------|
| `addac972...` | O Kilao Usuario | 2025-10-12 23:46 | ❌ Deletar |
| `7cf11964...` | paraiso usuario | 2025-10-12 19:06 | ❌ Deletar |
| `59c1e5ba...` | paraiso user | 2025-10-12 18:59 | ❌ Deletar |
| `4b8368be...` | paraiso admin | 2025-10-12 12:32 | ❌ Deletar |
| `db6f2fb3...` | paraiso admin (dup) | 2025-10-12 12:23 | ❌ Deletar |
| `f806015a...` | samuel dutra | 2025-10-10 21:11 | ❌ Deletar |

**Padrão dos Registros Inválidos:**
- ❌ `cnpj IS NULL`
- ❌ `phone IS NULL`
- ❌ `slug LIKE 'tenant-%'` (gerado automaticamente)
- ❌ Nome parece nome de pessoa (não empresa)

---

## ✅ Solução Implementada

### 1. Remover o Trigger

**Arquivo:** `supabase/migrations/004_fix_tenant_auto_creation_bug.sql`

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove função
DROP FUNCTION IF EXISTS handle_new_user();
```

**Por que remover:**
- ✅ Já temos API `/api/users/create` que gerencia usuários corretamente
- ✅ Módulo de Empresas separado para criar tenants manualmente
- ✅ Controle total sobre quem cria o quê
- ✅ Evita duplicações e conflitos

### 2. Adicionar Validação

```sql
-- Garantir que tenants tenham CNPJ ou sejam filiais
ALTER TABLE tenants
ADD CONSTRAINT tenants_must_have_cnpj_or_parent
CHECK (
  cnpj IS NOT NULL
  OR parent_tenant_id IS NOT NULL
);
```

**Benefício:**
- ✅ Impede criar tenants sem CNPJ (exceto filiais)
- ✅ Previne o problema de acontecer novamente

### 3. Limpar Dados Incorretos

**Arquivo:** `supabase/fix_tenant_cleanup_manual.sql`

**Passos:**
1. ✅ Fazer backup de `tenants` e `user_profiles`
2. ✅ Identificar tenants inválidos
3. ✅ Reatribuir usuários para tenants corretos
4. ✅ Deletar tenants inválidos
5. ✅ Verificar resultado final

---

## 📝 Como Aplicar a Correção

### Passo 1: Executar Migration Principal

No **Supabase SQL Editor**, execute:

```bash
# Copie o conteúdo de:
supabase/migrations/004_fix_tenant_auto_creation_bug.sql
```

Isso vai:
- ✅ Criar backups automáticos
- ✅ Remover o trigger problemático
- ✅ Identificar tenants inválidos
- ✅ Listar usuários afetados
- ✅ Adicionar constraint de validação

### Passo 2: Reatribuir Usuários Manualmente

No **Supabase SQL Editor**, execute queries do arquivo:

```bash
# Use o arquivo:
supabase/fix_tenant_cleanup_manual.sql
```

**Decisões necessárias:**

#### Usuários relacionados a "Paraiso"
```sql
-- Mover para tenant "Paraiso" (ID: 9402d6f1...)
UPDATE user_profiles
SET tenant_id = '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
WHERE tenant_id IN (
  '7cf11964-22d9-4a78-a6ff-ab8b82f20e27',  -- paraiso usuario
  '59c1e5ba-930b-479d-af05-f9984a0d7559',  -- paraiso user
  '4b8368be-7d23-4941-881e-ffc71f90d7e7',  -- paraiso admin
  'db6f2fb3-330d-4b2f-b299-c9e938e1ad5b'   -- paraiso admin (dup)
);
```

#### Usuários relacionados a "Okilao"
```sql
-- Mover para tenant "Okilao Supermercado" (ID: 030bc3ce...)
UPDATE user_profiles
SET tenant_id = '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2'
WHERE tenant_id IN (
  'addac972-cea2-4250-b8ac-a853f429844e'   -- O Kilao Usuario
);
```

#### Usuário "samuel dutra"
**Escolha uma opção:**

**Opção A:** Mover para Paraiso
```sql
UPDATE user_profiles
SET tenant_id = '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
WHERE tenant_id = 'f806015a-5efd-44fa-b43b-9e8ff29d17be';
```

**Opção B:** Mover para Okilao
```sql
UPDATE user_profiles
SET tenant_id = '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2'
WHERE tenant_id = 'f806015a-5efd-44fa-b43b-9e8ff29d17be';
```

**Opção C:** Tornar superadmin (sem tenant)
```sql
UPDATE user_profiles
SET tenant_id = NULL, role = 'superadmin', can_switch_tenants = TRUE
WHERE tenant_id = 'f806015a-5efd-44fa-b43b-9e8ff29d17be';
```

### Passo 3: Verificar Antes de Deletar

```sql
-- DEVE retornar 0 linhas
SELECT COUNT(*) FROM user_profiles up
INNER JOIN tenants t ON t.id = up.tenant_id
WHERE up.tenant_id IN (
  SELECT id FROM tenants
  WHERE cnpj IS NULL AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
  )
);
```

### Passo 4: Deletar Tenants Inválidos

**⚠️ Só execute após verificar que não há usuários vinculados!**

```sql
DELETE FROM tenants
WHERE cnpj IS NULL
  AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
  );
```

### Passo 5: Verificação Final

```sql
-- Deve mostrar apenas 2 tenants (Okilao e Paraiso)
SELECT COUNT(*) FROM tenants;

-- Não deve ter usuários sem tenant (exceto superadmins)
SELECT COUNT(*) FROM user_profiles
WHERE tenant_id IS NULL AND role != 'superadmin';
```

---

## 🛡️ Prevenção Futura

### No Banco de Dados

✅ **Constraint adicionada:**
```sql
ALTER TABLE tenants
ADD CONSTRAINT tenants_must_have_cnpj_or_parent
CHECK (cnpj IS NOT NULL OR parent_tenant_id IS NOT NULL);
```

### Na Aplicação

**Recomendações:**

1. **Formulário de Empresa:**
   - ✅ Tornar CNPJ obrigatório na UI
   - ✅ Validar formato do CNPJ
   - ✅ Não permitir slugs genéricos `tenant-{uuid}`

2. **API de Criação:**
   - ✅ Já está correta (`/api/users/create`)
   - ✅ Não cria tenants, apenas user_profiles

3. **Documentação:**
   - ✅ Documentar que tenants são criados APENAS no módulo de Empresas
   - ✅ Usuários são vinculados a tenants existentes

---

## 🔄 Rollback (Se Necessário)

Se algo der errado durante a limpeza:

```sql
-- Restaurar tenants do backup
TRUNCATE TABLE tenants CASCADE;
INSERT INTO tenants SELECT * FROM tenants_backup_20251012;

-- Restaurar user_profiles do backup
TRUNCATE TABLE user_profiles CASCADE;
INSERT INTO user_profiles SELECT * FROM user_profiles_backup_20251012;
```

---

## ✅ Checklist de Verificação

Antes de considerar resolvido, verifique:

- [ ] Trigger `on_auth_user_created` foi removido
- [ ] Função `handle_new_user()` foi removida
- [ ] Backup criado (`tenants_backup_20251012`, `user_profiles_backup_20251012`)
- [ ] Todos os usuários reatribuídos para tenants corretos
- [ ] Nenhum usuário (exceto superadmins) sem tenant
- [ ] Apenas 2 tenants na tabela (Okilao e Paraiso)
- [ ] Constraint `tenants_must_have_cnpj_or_parent` adicionada
- [ ] Criar novo usuário NÃO cria tenant automaticamente
- [ ] Módulo de Empresas mostra apenas empresas reais

---

## 📚 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/004_fix_tenant_auto_creation_bug.sql` | Migration automática (backup + remove trigger) |
| `supabase/fix_tenant_cleanup_manual.sql` | Queries manuais para limpeza |
| `TENANT_BUG_FIX.md` | Este documento |

---

## 🎯 Resultado Esperado

**Antes:**
- ❌ 8 tenants (2 válidos + 6 inválidos)
- ❌ Usuários aparecem como empresas
- ❌ Trigger cria tenant automaticamente

**Depois:**
- ✅ 2 tenants válidos (Okilao e Paraiso)
- ✅ Todos os usuários vinculados corretamente
- ✅ Trigger removido
- ✅ Constraint previne problema futuro
- ✅ Criar usuário não cria mais tenant

---

**Data da Correção:** 2025-10-12
**Status:** ✅ Solução documentada e pronta para execução
