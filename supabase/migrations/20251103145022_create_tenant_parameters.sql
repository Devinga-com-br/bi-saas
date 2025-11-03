-- ================================================================
-- CREATE TABLE: tenant_parameters
-- ================================================================
-- Tabela para armazenar parâmetros configuráveis por tenant
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tenant_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL,
  parameter_value BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, parameter_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_parameters_tenant_id ON public.tenant_parameters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_parameters_key ON public.tenant_parameters(parameter_key);
CREATE INDEX IF NOT EXISTS idx_tenant_parameters_tenant_key ON public.tenant_parameters(tenant_id, parameter_key);

-- RLS Policies
ALTER TABLE public.tenant_parameters ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmins podem ver todos os parâmetros
CREATE POLICY "Superadmins can view all parameters"
  ON public.tenant_parameters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy: Usuários podem ver parâmetros do seu tenant
CREATE POLICY "Users can view their tenant parameters"
  ON public.tenant_parameters
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Policy: Superadmins e Admins podem inserir parâmetros
CREATE POLICY "Admins can insert parameters"
  ON public.tenant_parameters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('superadmin', 'admin')
      AND (
        user_profiles.role = 'superadmin'
        OR user_profiles.tenant_id = tenant_id
      )
    )
  );

-- Policy: Superadmins e Admins podem atualizar parâmetros
CREATE POLICY "Admins can update parameters"
  ON public.tenant_parameters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('superadmin', 'admin')
      AND (
        user_profiles.role = 'superadmin'
        OR user_profiles.tenant_id = tenant_id
      )
    )
  );

-- Policy: Apenas Superadmins podem deletar parâmetros
CREATE POLICY "Superadmins can delete parameters"
  ON public.tenant_parameters
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_parameters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_parameters_updated_at
  BEFORE UPDATE ON public.tenant_parameters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_parameters_updated_at();

-- Comentário
COMMENT ON TABLE public.tenant_parameters IS 'Parâmetros configuráveis por tenant para controlar features e comportamentos do sistema';
COMMENT ON COLUMN public.tenant_parameters.parameter_key IS 'Chave do parâmetro (ex: enable_descontos_venda)';
COMMENT ON COLUMN public.tenant_parameters.parameter_value IS 'Valor booleano do parâmetro';

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
