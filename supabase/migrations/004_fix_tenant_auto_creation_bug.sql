-- =====================================================
-- Migration: Fix Tenant Auto-Creation Bug
-- Description: Remove trigger que cria tenants automaticamente
-- Author: Sistema BI SaaS
-- Date: 2025-10-12
-- Issue: Trigger on_auth_user_created estava criando tenant para cada usuário
-- =====================================================

-- ==========================================
-- PASSO 1: FAZER BACKUP DAS TABELAS
-- ==========================================

-- Backup da tabela tenants
CREATE TABLE IF NOT EXISTS tenants_backup_20251012 AS
SELECT * FROM tenants;

-- Backup da tabela user_profiles
CREATE TABLE IF NOT EXISTS user_profiles_backup_20251012 AS
SELECT * FROM user_profiles;

-- Confirmar backups
DO $$
DECLARE
  tenants_backup_count INT;
  profiles_backup_count INT;
BEGIN
  SELECT COUNT(*) INTO tenants_backup_count FROM tenants_backup_20251012;
  SELECT COUNT(*) INTO profiles_backup_count FROM user_profiles_backup_20251012;

  RAISE NOTICE 'Backup criado: % tenants, % profiles', tenants_backup_count, profiles_backup_count;
END $$;

-- ==========================================
-- PASSO 2: REMOVER TRIGGER PROBLEMÁTICO
-- ==========================================

-- Remover trigger que cria tenant automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover função que cria tenant automaticamente
DROP FUNCTION IF EXISTS handle_new_user();

RAISE NOTICE 'Trigger on_auth_user_created removido com sucesso';

-- ==========================================
-- PASSO 3: IDENTIFICAR TENANTS INVÁLIDOS
-- ==========================================

-- Mostrar tenants que serão considerados inválidos
DO $$
DECLARE
  invalid_tenant RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TENANTS INVÁLIDOS IDENTIFICADOS:';
  RAISE NOTICE '========================================';

  FOR invalid_tenant IN
    SELECT
      id,
      name,
      slug,
      created_at
    FROM tenants
    WHERE cnpj IS NULL
      AND slug LIKE 'tenant-%'
      AND id NOT IN (
        '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',  -- Okilao Supermercado (manter)
        '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'   -- Paraiso (manter)
      )
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE 'ID: % | Nome: % | Criado em: %',
      invalid_tenant.id,
      invalid_tenant.name,
      invalid_tenant.created_at;
  END LOOP;
END $$;

-- ==========================================
-- PASSO 4: VERIFICAR USUÁRIOS VINCULADOS
-- ==========================================

-- Mostrar usuários que estão vinculados aos tenants inválidos
DO $$
DECLARE
  affected_user RECORD;
  user_count INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'USUÁRIOS AFETADOS:';
  RAISE NOTICE '========================================';

  FOR affected_user IN
    SELECT
      up.id as user_id,
      up.full_name,
      up.role,
      up.tenant_id,
      t.name as tenant_name
    FROM user_profiles up
    INNER JOIN tenants t ON t.id = up.tenant_id
    WHERE up.tenant_id IN (
      SELECT id FROM tenants
      WHERE cnpj IS NULL
        AND slug LIKE 'tenant-%'
        AND id NOT IN (
          '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
          '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
        )
    )
  LOOP
    user_count := user_count + 1;
    RAISE NOTICE 'Usuário: % | Role: % | Tenant Inválido: %',
      affected_user.full_name,
      affected_user.role,
      affected_user.tenant_name;
  END LOOP;

  IF user_count = 0 THEN
    RAISE NOTICE 'Nenhum usuário vinculado aos tenants inválidos';
  ELSE
    RAISE NOTICE 'Total de usuários afetados: %', user_count;
    RAISE WARNING 'ATENÇÃO: Reatribua esses usuários antes de deletar os tenants!';
  END IF;
END $$;

-- ==========================================
-- PASSO 5: REATRIBUIR USUÁRIOS (MANUAL)
-- ==========================================

-- IMPORTANTE: Execute as queries abaixo MANUALMENTE após revisar
-- Descomente e ajuste conforme necessário

/*
-- Exemplo: Reatribuir usuários com tenant inválido para tenant correto

-- Caso 1: Usuários que deveriam estar no tenant "Paraiso"
UPDATE user_profiles
SET tenant_id = '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'  -- Paraiso
WHERE tenant_id IN (
  '7cf11964-22d9-4a78-a6ff-ab8b82f20e27',  -- paraiso usuario
  '59c1e5ba-930b-479d-af05-f9984a0d7559',  -- paraiso user
  '4b8368be-7d23-4941-881e-ffc71f90d7e7',  -- paraiso admin
  'db6f2fb3-330d-4b2f-b299-c9e938e1ad5b'   -- paraiso admin (duplicado)
);

-- Caso 2: Usuários que deveriam estar no tenant "Okilao Supermercado"
UPDATE user_profiles
SET tenant_id = '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2'  -- Okilao Supermercado
WHERE tenant_id IN (
  'addac972-cea2-4250-b8ac-a853f429844e'   -- O Kilao Usuario
);

-- Caso 3: Usuários específicos (ajustar conforme necessário)
-- UPDATE user_profiles
-- SET tenant_id = 'TENANT_ID_CORRETO'
-- WHERE id = 'USER_ID';
*/

-- ==========================================
-- PASSO 6: DELETAR TENANTS INVÁLIDOS
-- ==========================================

-- ATENÇÃO: Só execute após verificar que não há usuários vinculados!
-- Descomente a linha abaixo quando estiver pronto

/*
DELETE FROM tenants
WHERE cnpj IS NULL
  AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',  -- Okilao Supermercado (manter)
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'   -- Paraiso (manter)
  );
*/

-- ==========================================
-- PASSO 7: ADICIONAR VALIDAÇÕES (PREVENÇÃO)
-- ==========================================

-- Adicionar constraint para garantir que empresas tenham CNPJ
-- (ou sejam filiais com parent_tenant_id)
ALTER TABLE tenants
DROP CONSTRAINT IF EXISTS tenants_must_have_cnpj_or_parent;

ALTER TABLE tenants
ADD CONSTRAINT tenants_must_have_cnpj_or_parent
CHECK (
  cnpj IS NOT NULL
  OR parent_tenant_id IS NOT NULL
);

COMMENT ON CONSTRAINT tenants_must_have_cnpj_or_parent ON tenants IS
  'Garante que todo tenant seja uma empresa com CNPJ ou uma filial com parent_tenant_id';

-- ==========================================
-- PASSO 8: VERIFICAÇÃO FINAL
-- ==========================================

DO $$
DECLARE
  valid_tenants_count INT;
  invalid_tenants_count INT;
  users_without_tenant INT;
BEGIN
  -- Contar tenants válidos
  SELECT COUNT(*) INTO valid_tenants_count
  FROM tenants
  WHERE cnpj IS NOT NULL OR parent_tenant_id IS NOT NULL;

  -- Contar tenants inválidos restantes
  SELECT COUNT(*) INTO invalid_tenants_count
  FROM tenants
  WHERE cnpj IS NULL
    AND slug LIKE 'tenant-%'
    AND parent_tenant_id IS NULL;

  -- Contar usuários sem tenant (exceto superadmins)
  SELECT COUNT(*) INTO users_without_tenant
  FROM user_profiles
  WHERE tenant_id IS NULL
    AND role != 'superadmin';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tenants válidos: %', valid_tenants_count;
  RAISE NOTICE 'Tenants inválidos restantes: %', invalid_tenants_count;
  RAISE NOTICE 'Usuários sem tenant (não-superadmins): %', users_without_tenant;
  RAISE NOTICE '========================================';

  IF invalid_tenants_count > 0 THEN
    RAISE WARNING 'Ainda existem % tenants inválidos. Revise PASSO 5 e 6!', invalid_tenants_count;
  END IF;

  IF users_without_tenant > 0 THEN
    RAISE WARNING 'Existem % usuários sem tenant. Revise!', users_without_tenant;
  END IF;
END $$;

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================

RAISE NOTICE '========================================';
RAISE NOTICE 'Migration 004 concluída!';
RAISE NOTICE 'Próximos passos MANUAIS:';
RAISE NOTICE '1. Revisar usuários afetados (PASSO 4)';
RAISE NOTICE '2. Reatribuir usuários (PASSO 5)';
RAISE NOTICE '3. Deletar tenants inválidos (PASSO 6)';
RAISE NOTICE '========================================';
