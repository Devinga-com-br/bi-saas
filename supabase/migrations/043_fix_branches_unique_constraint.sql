-- ============================================
-- Migration 043: Corrigir constraint única de branches
-- ============================================
-- Data: 2025-10-16
-- Descrição: Permitir que diferentes empresas tenham a mesma numeração de filial
--            Adiciona ID como PK e cria constraint única composta (tenant_id + branch_code)

-- 1. Adicionar coluna ID (UUID) como nova primary key
ALTER TABLE public.branches ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- 2. Remover a constraint PRIMARY KEY antiga
ALTER TABLE public.branches DROP CONSTRAINT branches_pkey;

-- 3. Definir ID como NOT NULL e nova PRIMARY KEY
ALTER TABLE public.branches ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.branches ADD PRIMARY KEY (id);

-- 4. Alterar branch_code para não ser mais a chave primária
-- (já foi feito acima ao remover branches_pkey)

-- 5. Criar constraint única composta (tenant_id + branch_code)
-- Isso permite que empresas diferentes tenham o mesmo branch_code
ALTER TABLE public.branches ADD CONSTRAINT branches_tenant_branch_code_key 
  UNIQUE (tenant_id, branch_code);

-- 6. Recriar índice em branch_code (já que não é mais PK)
CREATE INDEX IF NOT EXISTS idx_branches_branch_code ON public.branches(branch_code);

-- Comentário explicativo
COMMENT ON CONSTRAINT branches_tenant_branch_code_key ON public.branches IS
'Garante que branch_code seja único apenas dentro de cada tenant/empresa';

COMMENT ON COLUMN public.branches.id IS
'ID único da filial (UUID)';
