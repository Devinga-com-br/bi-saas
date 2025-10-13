-- =====================================================
-- Migration: Superadmin Multi-Tenant Support (Idempotent)
-- Description: Permite superadmins acessarem múltiplas empresas
-- Author: Sistema BI SaaS
-- Date: 2025-10-12
-- Version: 2 (Idempotent - pode ser executado múltiplas vezes)
-- =====================================================

-- ==========================================
-- PASSO 1: TORNAR TENANT_ID NULLABLE PARA SUPERADMINS
-- ==========================================

-- Remover constraint NOT NULL de tenant_id (se existir)
DO $$
BEGIN
  ALTER TABLE user_profiles ALTER COLUMN tenant_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Adicionar constraint para garantir que apenas superadmins podem ter tenant_id NULL
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_tenant_id_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_tenant_id_role_check
  CHECK (
    (tenant_id IS NOT NULL) OR (role = 'superadmin')
  );

-- ==========================================
-- PASSO 2: TRIGGER PARA AUTOMATIZAR TENANT_ID = NULL EM SUPERADMINS
-- ==========================================

-- Função para definir tenant_id = NULL quando role = superadmin
CREATE OR REPLACE FUNCTION set_superadmin_tenant_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'superadmin' THEN
    NEW.tenant_id = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger se existir e criar novo
DROP TRIGGER IF EXISTS trigger_set_superadmin_tenant_null ON user_profiles;

CREATE TRIGGER trigger_set_superadmin_tenant_null
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_superadmin_tenant_null();

-- ==========================================
-- PASSO 3: ATUALIZAR RLS POLICIES PARA OCULTAR SUPERADMINS DE ADMINS
-- ==========================================

-- Dropar TODAS as policies antigas de user_profiles
DROP POLICY IF EXISTS "allow_select_authenticated" ON user_profiles;
DROP POLICY IF EXISTS "allow_insert_authenticated" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_authenticated" ON user_profiles;
DROP POLICY IF EXISTS "allow_delete_authenticated" ON user_profiles;
DROP POLICY IF EXISTS "superadmins_can_view_all_users" ON user_profiles;
DROP POLICY IF EXISTS "admins_can_view_tenant_users_except_superadmins" ON user_profiles;
DROP POLICY IF EXISTS "users_can_view_own_tenant_except_superadmins" ON user_profiles;
DROP POLICY IF EXISTS "users_can_view_self" ON user_profiles;
DROP POLICY IF EXISTS "superadmins_can_insert_any_user" ON user_profiles;
DROP POLICY IF EXISTS "admins_can_insert_tenant_users_except_superadmins" ON user_profiles;
DROP POLICY IF EXISTS "superadmins_can_update_any_user" ON user_profiles;
DROP POLICY IF EXISTS "admins_can_update_tenant_users_except_superadmins" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_self" ON user_profiles;
DROP POLICY IF EXISTS "superadmins_can_delete_any_user" ON user_profiles;
DROP POLICY IF EXISTS "admins_can_delete_tenant_users_except_superadmins" ON user_profiles;
DROP POLICY IF EXISTS "Admins can create users in own tenant" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update users in own tenant" ON user_profiles;

-- ============ POLICY: SELECT ============

-- Superadmins podem ver todos os usuários
CREATE POLICY "superadmins_can_view_all_users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
    )
  );

-- Admins podem ver usuários do seu tenant, EXCETO superadmins
CREATE POLICY "admins_can_view_tenant_users_except_superadmins"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.tenant_id = user_profiles.tenant_id
      AND user_profiles.role != 'superadmin'
    )
  );

-- Usuários normais podem ver usuários do seu tenant, EXCETO superadmins
CREATE POLICY "users_can_view_own_tenant_except_superadmins"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.tenant_id = user_profiles.tenant_id
      AND user_profiles.role != 'superadmin'
    )
  );

-- Usuários podem sempre ver a si mesmos
CREATE POLICY "users_can_view_self"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============ POLICY: INSERT ============

-- Superadmins podem criar qualquer tipo de usuário
CREATE POLICY "superadmins_can_insert_any_user"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
    )
  );

-- Admins podem criar usuários no seu tenant, EXCETO superadmins
CREATE POLICY "admins_can_insert_tenant_users_except_superadmins"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.tenant_id = user_profiles.tenant_id
      AND user_profiles.role != 'superadmin'
    )
  );

-- ============ POLICY: UPDATE ============

-- Superadmins podem atualizar qualquer usuário
CREATE POLICY "superadmins_can_update_any_user"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
    )
  );

-- Admins podem atualizar usuários do seu tenant, EXCETO superadmins
CREATE POLICY "admins_can_update_tenant_users_except_superadmins"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.tenant_id = user_profiles.tenant_id
      AND user_profiles.role != 'superadmin'
    )
  );

-- Usuários podem atualizar a si mesmos
CREATE POLICY "users_can_update_self"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============ POLICY: DELETE ============

-- Superadmins podem deletar qualquer usuário
CREATE POLICY "superadmins_can_delete_any_user"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
    )
  );

-- Admins podem deletar usuários do seu tenant, EXCETO superadmins
CREATE POLICY "admins_can_delete_tenant_users_except_superadmins"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.tenant_id = user_profiles.tenant_id
      AND user_profiles.role != 'superadmin'
    )
  );

-- ==========================================
-- PASSO 4: ATUALIZAR FUNÇÃO get_accessible_tenants
-- ==========================================

-- Atualizar função para retornar todos os tenants para superadmins
CREATE OR REPLACE FUNCTION get_accessible_tenants(user_id UUID)
RETURNS SETOF tenants AS $$
BEGIN
  -- Se for superadmin, retorna TODOS os tenants ativos
  IF is_superadmin(user_id) THEN
    RETURN QUERY
    SELECT t.* FROM tenants t
    WHERE t.is_active = true
    ORDER BY t.name;
  ELSE
    -- Senão, retorna apenas o tenant do usuário
    RETURN QUERY
    SELECT t.* FROM tenants t
    INNER JOIN user_profiles up ON up.tenant_id = t.id
    WHERE up.id = user_id
    AND t.is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PASSO 5: ATUALIZAR USUÁRIOS SUPERADMIN EXISTENTES
-- ==========================================

-- Definir tenant_id = NULL para superadmins existentes
UPDATE user_profiles
SET tenant_id = NULL
WHERE role = 'superadmin'
AND tenant_id IS NOT NULL;

-- ==========================================
-- PASSO 6: CRIAR ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índice para queries que filtram por role e tenant_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_tenant
  ON user_profiles(role, tenant_id);

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================

-- Verificar e exibir resultado
DO $$
DECLARE
  superadmin_count INT;
BEGIN
  SELECT COUNT(*) INTO superadmin_count
  FROM user_profiles
  WHERE role = 'superadmin' AND tenant_id IS NULL;

  RAISE NOTICE 'Migration 003 concluída com sucesso!';
  RAISE NOTICE 'Superadmins com tenant_id NULL: %', superadmin_count;
END $$;
