-- ============================================
-- Migration 031: Adicionar detalhes de filiais
-- ============================================
-- Data: 2025-10-15
-- Descrição: Adiciona campos de descrição e endereço às filiais

-- Adicionar colunas de detalhes da filial
ALTER TABLE public.branches 
  ADD COLUMN IF NOT EXISTS descricao VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
  ADD COLUMN IF NOT EXISTS rua VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Comentários para documentação
COMMENT ON COLUMN public.branches.descricao IS 'Nome/descrição da filial';
COMMENT ON COLUMN public.branches.cep IS 'CEP do endereço da filial';
COMMENT ON COLUMN public.branches.rua IS 'Rua/Logradouro da filial';
COMMENT ON COLUMN public.branches.numero IS 'Número do endereço da filial';
COMMENT ON COLUMN public.branches.bairro IS 'Bairro da filial';
COMMENT ON COLUMN public.branches.cidade IS 'Cidade da filial';
COMMENT ON COLUMN public.branches.estado IS 'UF/Estado da filial';
