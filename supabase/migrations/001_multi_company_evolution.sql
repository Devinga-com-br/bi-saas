-- =====================================================
-- Migration: Multi-Company and Multi-Branch Evolution
-- Description: Evolução do sistema para suporte multi-empresa
-- Author: Sistema BI SaaS
-- Date: 2025-10-11
-- =====================================================

-- =======================================
-- 1. ATUALIZAR TABELA TENANTS (EMPRESAS)
-- ==========================================

-- Adicionar novos campos para empresas
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18) UNIQUE,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(15),
  ADD COLUMN IF NOT EXISTS supabase_schema VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS tenant_type VARCHAR(20) DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Comentários das colunas
COMMENT ON COLUMN tenants.cnpj IS 'CNPJ da empresa (formato: 00.000.000/0000-00)';
COMMENT ON COLUMN tenants.phone IS 'Telefone da empresa com DDD (formato: (11) 98765-4321)';
COMMENT ON COLUMN tenants.supabase_schema IS 'Nome do schema Supabase onde estão os dados financeiros desta empresa';
COMMENT ON COLUMN tenants.tenant_type IS 'Tipo do tenant: company (matriz) ou branch (filial)';
COMMENT ON COLUMN tenants.parent_tenant_id IS 'ID da empresa matriz (para filiais). NULL para matrizes.';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tenants_cnpj ON tenants(cnpj);
CREATE INDEX IF NOT EXISTS idx_tenants_schema ON tenants(supabase_schema);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(tenant_type);

-- ==========================================
-- 2. ATUALIZAR TABELA USER_PROFILES (ROLES)
-- ==========================================

-- Remover constraint antiga de role se existir
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Adicionar nova constraint com superadmin
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'user', 'viewer'));

-- Adicionar coluna para controle de troca de tenants
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS can_switch_tenants BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.can_switch_tenants IS 'Se TRUE, usuário pode trocar entre diferentes tenants (geralmente superadmins)';

-- Criar índice no role para queries de permissão
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ==========================================
-- 3. CRIAR TABELA USER_TENANT_ACCESS
-- ==========================================

-- Tabela para gerenciar acesso de superadmins a múltiplas empresas
CREATE TABLE IF NOT EXISTS user_tenant_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Comentários
COMMENT ON TABLE user_tenant_access IS 'Controla quais tenants cada usuário superadmin pode acessar';
COMMENT ON COLUMN user_tenant_access.user_id IS 'ID do usuário (geralmente superadmin)';
COMMENT ON COLUMN user_tenant_access.tenant_id IS 'ID do tenant que o usuário pode acessar';
COMMENT ON COLUMN user_tenant_access.granted_by IS 'ID do usuário que concedeu o acesso';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_access_user ON user_tenant_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_access_tenant ON user_tenant_access(tenant_id);

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- ============ TENANTS TABLE ============

-- Habilitar RLS na tabela tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Superadmins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
DROP POLICY IF EXISTS "Superadmins can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Superadmins can update tenants" ON tenants;
DROP POLICY IF EXISTS "Superadmins can delete tenants" ON tenants;

-- Policy: Superadmins podem ver todos os tenants
CREATE POLICY "Superadmins can view all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Usuários normais podem ver apenas seu próprio tenant
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Policy: Superadmins podem inserir novos tenants
CREATE POLICY "Superadmins can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Superadmins podem atualizar tenants
CREATE POLICY "Superadmins can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Superadmins podem deletar tenants (soft delete recomendado)
CREATE POLICY "Superadmins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- ============ USER_TENANT_ACCESS TABLE ============

-- Habilitar RLS
ALTER TABLE user_tenant_access ENABLE ROW LEVEL SECURITY;

-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Superadmins can view all access records" ON user_tenant_access;
DROP POLICY IF EXISTS "Users can view own access records" ON user_tenant_access;
DROP POLICY IF EXISTS "Superadmins can manage access records" ON user_tenant_access;

-- Policy: Superadmins podem ver todos os acessos
CREATE POLICY "Superadmins can view all access records"
  ON user_tenant_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Usuários podem ver seus próprios acessos
CREATE POLICY "Users can view own access records"
  ON user_tenant_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Superadmins podem gerenciar acessos
CREATE POLICY "Superadmins can manage access records"
  ON user_tenant_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- ============ USER_PROFILES TABLE (Atualizar) ============

-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Admins can create users in own tenant" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update users in own tenant" ON user_profiles;

-- Policy: Admins podem criar usuários no seu próprio tenant
CREATE POLICY "Admins can create users in own tenant"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmins podem criar em qualquer tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
    )
    OR
    -- Admins podem criar apenas no seu tenant
    (
      tenant_id IN (
        SELECT tenant_id FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- Policy: Admins podem atualizar usuários do seu tenant
CREATE POLICY "Admins can update users in own tenant"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    -- Superadmins podem atualizar qualquer usuário
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
    )
    OR
    -- Admins podem atualizar usuários do seu tenant
    (
      tenant_id IN (
        SELECT tenant_id FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
    OR
    -- Usuários podem atualizar a si mesmos
    id = auth.uid()
  );

-- ==========================================
-- 5. FUNÇÕES AUXILIARES
-- ==========================================

-- Função para verificar se usuário é superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter tenants acessíveis por um usuário
CREATE OR REPLACE FUNCTION get_accessible_tenants(user_id UUID)
RETURNS SETOF tenants AS $$
BEGIN
  -- Se for superadmin, retorna todos os tenants que ele tem acesso
  IF is_superadmin(user_id) THEN
    RETURN QUERY
    SELECT t.* FROM tenants t
    INNER JOIN user_tenant_access uta ON uta.tenant_id = t.id
    WHERE uta.user_id = user_id;
  ELSE
    -- Senão, retorna apenas o tenant do usuário
    RETURN QUERY
    SELECT t.* FROM tenants t
    INNER JOIN user_profiles up ON up.tenant_id = t.id
    WHERE up.id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar CNPJ (básica)
CREATE OR REPLACE FUNCTION validate_cnpj_format(cnpj TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica formato: XX.XXX.XXX/XXXX-XX
  RETURN cnpj ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

-- Trigger para atualizar updated_at em tenants
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger se existir antes de criar
DROP TRIGGER IF EXISTS trigger_update_tenants_timestamp ON tenants;

CREATE TRIGGER trigger_update_tenants_timestamp
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_tenants_updated_at();

-- Trigger para garantir que superadmins tenham can_switch_tenants = true
CREATE OR REPLACE FUNCTION ensure_superadmin_can_switch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'superadmin' THEN
    NEW.can_switch_tenants = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger se existir antes de criar
DROP TRIGGER IF EXISTS trigger_superadmin_switch_tenants ON user_profiles;

CREATE TRIGGER trigger_superadmin_switch_tenants
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_superadmin_can_switch();

-- ==========================================
-- 7. DADOS INICIAIS (OPCIONAL)
-- ==========================================

-- Exemplo de empresa inicial (comentado - descomentar se necessário)
/*
INSERT INTO tenants (name, slug, cnpj, phone, supabase_schema, is_active)
VALUES (
  'Empresa Demo',
  'empresa-demo',
  '00.000.000/0000-00',
  '(11) 98765-4321',
  'empresa_demo_schema',
  true
)
ON CONFLICT (slug) DO NOTHING;
*/

-- ==========================================
-- 8. GRANTS E PERMISSÕES
-- ==========================================

-- Garantir que authenticated users possam acessar as funções
GRANT EXECUTE ON FUNCTION is_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_tenants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_cnpj_format(TEXT) TO authenticated;

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================

-- Comentário final
COMMENT ON TABLE user_tenant_access IS 'Migration 001: Sistema multi-empresa implementado - 2025-10-11';
