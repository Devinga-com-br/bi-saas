-- ============================================
-- Migration 007: Criar tabela de filiais
-- ============================================
-- Data: 2025-10-13
-- Descrição: Adiciona tabela branches (filiais) para cada tenant

-- Criar tabela branches
CREATE TABLE IF NOT EXISTS public.branches (
  -- Primary key: código da filial
  branch_code VARCHAR(50) NOT NULL PRIMARY KEY,

  -- Relacionamento com tenant (empresa)
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Código da loja (opcional)
  store_code VARCHAR(50),

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON public.branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_store_code ON public.branches(store_code) WHERE store_code IS NOT NULL;

-- Comentários para documentação
COMMENT ON TABLE public.branches IS
'Filiais de cada empresa (tenant). Cada filial é identificada por um código único.';

COMMENT ON COLUMN public.branches.branch_code IS
'Código da filial (Primary Key)';

COMMENT ON COLUMN public.branches.tenant_id IS
'ID da empresa (tenant) dona desta filial';

COMMENT ON COLUMN public.branches.store_code IS
'Código da loja (opcional)';

-- RLS Policies
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmin pode ver todas as filiais
CREATE POLICY "Superadmin can view all branches"
  ON public.branches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Admin/User pode ver filiais da própria empresa
CREATE POLICY "Users can view branches from their tenant"
  ON public.branches
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Policy: Superadmin pode inserir filiais em qualquer empresa
CREATE POLICY "Superadmin can insert branches"
  ON public.branches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Admin pode inserir filiais na própria empresa
CREATE POLICY "Admin can insert branches in their tenant"
  ON public.branches
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Superadmin pode atualizar qualquer filial
CREATE POLICY "Superadmin can update all branches"
  ON public.branches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Admin pode atualizar filiais da própria empresa
CREATE POLICY "Admin can update branches in their tenant"
  ON public.branches
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Superadmin pode deletar qualquer filial
CREATE POLICY "Superadmin can delete all branches"
  ON public.branches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Admin pode deletar filiais da própria empresa
CREATE POLICY "Admin can delete branches in their tenant"
  ON public.branches
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_branches_updated_at();
