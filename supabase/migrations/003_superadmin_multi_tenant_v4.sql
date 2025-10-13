-- =====================================================
-- Migration: Superadmin Multi-Tenant Support (v4 - Public Schema)
-- Description: Permite superadmins acessarem múltiplas empresas
-- Author: Sistema BI SaaS
-- Date: 2025-10-12
-- Version: 4 (Usando public schema para funções helper)
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
-- PASSO 3: CRIAR FUNÇÕES HELPER (NO SCHEMA PUBLIC)
-- ==========================================

-- Função que retorna o role do usuário atual de forma eficiente
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Função que retorna o tenant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==========================================
-- PASSO 4: DROPAR POLICIES ANTIGAS
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
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

-- ==========================================
-- PASSO 5: CRIAR NOVAS POLICIES OTIMIZADAS
-- ==========================================

-- ============ POLICY: SELECT ============

CREATE POLICY "user_profiles_select_policy"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    -- Pode sempre ver a si mesmo
    id = auth.uid()
    OR
    -- Superadmins podem ver todos
    public.get_my_role() = 'superadmin'
    OR
    -- Admins e usuários podem ver outros do mesmo tenant (exceto superadmins)
    (
      public.get_my_tenant_id() = tenant_id
      AND role != 'superadmin'
    )
  );

-- ============ POLICY: INSERT ============

CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmins podem criar qualquer usuário
    public.get_my_role() = 'superadmin'
    OR
    -- Admins podem criar usuários no seu tenant (exceto superadmins)
    (
      public.get_my_role() = 'admin'
      AND public.get_my_tenant_id() = tenant_id
      AND role != 'superadmin'
    )
  );

-- ============ POLICY: UPDATE ============

CREATE POLICY "user_profiles_update_policy"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    -- Pode sempre atualizar a si mesmo
    id = auth.uid()
    OR
    -- Superadmins podem atualizar qualquer usuário
    public.get_my_role() = 'superadmin'
    OR
    -- Admins podem atualizar usuários do seu tenant (exceto superadmins)
    (
      public.get_my_role() = 'admin'
      AND public.get_my_tenant_id() = tenant_id
      AND role != 'superadmin'
    )
  );

-- ============ POLICY: DELETE ============

CREATE POLICY "user_profiles_delete_policy"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    -- Superadmins podem deletar qualquer usuário
    public.get_my_role() = 'superadmin'
    OR
    -- Admins podem deletar usuários do seu tenant (exceto superadmins)
    (
      public.get_my_role() = 'admin'
      AND public.get_my_tenant_id() = tenant_id
      AND role != 'superadmin'
    )
  );

-- ==========================================
-- PASSO 6: ATUALIZAR FUNÇÃO get_accessible_tenants
-- ==========================================

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
-- PASSO 7: ATUALIZAR USUÁRIOS SUPERADMIN EXISTENTES
-- ==========================================

UPDATE user_profiles
SET tenant_id = NULL
WHERE role = 'superadmin'
AND tenant_id IS NOT NULL;

-- ==========================================
-- PASSO 8: CRIAR ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role_tenant
  ON user_profiles(role, tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_id
  ON user_profiles(id);

-- ==========================================
-- PASSO 9: GRANTS
-- ==========================================

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================

DO $$
DECLARE
  superadmin_count INT;
  total_users INT;
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO superadmin_count
  FROM user_profiles
  WHERE role = 'superadmin' AND tenant_id IS NULL;

  SELECT COUNT(*) INTO total_users
  FROM user_profiles;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 003 v4 concluída com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Superadmins com tenant_id NULL: %', superadmin_count;
  RAISE NOTICE 'RLS Policies ativas: %', policy_count;
  RAISE NOTICE 'Funções helper: public.get_my_role(), public.get_my_tenant_id()';
  RAISE NOTICE '========================================';
END $$;
