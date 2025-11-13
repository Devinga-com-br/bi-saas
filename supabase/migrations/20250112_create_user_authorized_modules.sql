-- Migration: Sistema de Módulos Autorizados por Usuário
-- Descrição: Permite controlar acesso de usuários (role = user) a módulos específicos do sistema
-- Data: 2025-01-12

-- Criar tipo ENUM para módulos do sistema
CREATE TYPE public.system_module AS ENUM (
  'dashboard',
  'dre_gerencial',
  'metas_mensal',
  'metas_setor',
  'relatorios_ruptura_abcd',
  'relatorios_venda_curva',
  'relatorios_ruptura_60d'
);

-- Criar tabela de módulos autorizados por usuário
CREATE TABLE public.user_authorized_modules (
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module system_module NOT NULL,
  created_at timestamp with time zone DEFAULT now(),

  -- PK composta (usuário + módulo)
  PRIMARY KEY (user_id, module)
);

-- Comentários
COMMENT ON TABLE public.user_authorized_modules IS 'Armazena os módulos autorizados para cada usuário. Apenas usuários com role = user precisam de configuração. Superadmin e Admin têm acesso full automático.';
COMMENT ON COLUMN public.user_authorized_modules.user_id IS 'UUID do usuário (FK para user_profiles)';
COMMENT ON COLUMN public.user_authorized_modules.module IS 'Identificador do módulo do sistema';

-- Índices para performance
CREATE INDEX idx_user_authorized_modules_user_id ON public.user_authorized_modules(user_id);
CREATE INDEX idx_user_authorized_modules_module ON public.user_authorized_modules(module);

-- RLS (Row Level Security)
ALTER TABLE public.user_authorized_modules ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios módulos
CREATE POLICY "Users can view their own authorized modules"
  ON public.user_authorized_modules
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins e Superadmins podem ver todos os módulos
CREATE POLICY "Admins can view all authorized modules"
  ON public.user_authorized_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Policy: Admins e Superadmins podem inserir módulos
CREATE POLICY "Admins can insert authorized modules"
  ON public.user_authorized_modules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Policy: Admins e Superadmins podem deletar módulos
CREATE POLICY "Admins can delete authorized modules"
  ON public.user_authorized_modules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Função helper para verificar se usuário tem acesso a um módulo
CREATE OR REPLACE FUNCTION public.user_has_module_access(
  p_user_id uuid,
  p_module system_module
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_has_access boolean;
BEGIN
  -- Obter role do usuário
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = p_user_id;

  -- Superadmin e Admin sempre têm acesso
  IF v_role IN ('superadmin', 'admin') THEN
    RETURN true;
  END IF;

  -- Para role = user, verificar na tabela
  IF v_role = 'user' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_authorized_modules
      WHERE user_id = p_user_id
      AND module = p_module
    ) INTO v_has_access;

    RETURN v_has_access;
  END IF;

  -- Viewer não tem acesso por padrão (ou pode ter lógica específica)
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.user_has_module_access IS 'Verifica se um usuário tem acesso a um módulo específico. Superadmin e Admin sempre têm acesso full.';

-- Inserir exemplo (comentado - apenas para referência)
-- INSERT INTO public.user_authorized_modules (user_id, module) VALUES
--   ('USER_UUID_AQUI', 'dashboard'),
--   ('USER_UUID_AQUI', 'dre_gerencial');
