-- =====================================================
-- Migration: Fix Row Level Security for user_profiles
-- Description: Remove TODAS as policies e cria policies simples
-- Author: Sistema BI SaaS
-- Date: 2025-10-12
-- Issue: Recursão infinita em policies
-- =====================================================

-- ==========================================
-- PASSO 1: DESABILITAR RLS COMPLETAMENTE
-- ==========================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- PASSO 2: DROPAR TODAS AS POLICIES (FORCE)
-- ==========================================

-- Dropar policies que conhecemos
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop através de todas as policies da tabela user_profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
    END LOOP;
END $$;

-- ==========================================
-- PASSO 3: DROPAR FUNÇÕES QUE PODEM CAUSAR PROBLEMAS
-- ==========================================

DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.get_user_tenant_id();
DROP FUNCTION IF EXISTS auth.user_role();
DROP FUNCTION IF EXISTS auth.user_tenant_id();

-- ==========================================
-- PASSO 4: REABILITAR RLS
-- ==========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PASSO 5: CRIAR POLICIES SIMPLES - SEM RECURSÃO
-- ==========================================

-- Policy SELECT: Permite todos autenticados lerem
CREATE POLICY "allow_select_authenticated"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT: Permite todos autenticados inserirem
CREATE POLICY "allow_insert_authenticated"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy UPDATE: Permite todos autenticados atualizarem
CREATE POLICY "allow_update_authenticated"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy DELETE: Permite todos autenticados deletarem
CREATE POLICY "allow_delete_authenticated"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (true);

-- ==========================================
-- PASSO 6: VERIFICAÇÃO
-- ==========================================

-- Listar todas as policies criadas
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Policies ativas em user_profiles:';
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles')
    LOOP
        RAISE NOTICE '  - %', r.policyname;
    END LOOP;
END $$;
