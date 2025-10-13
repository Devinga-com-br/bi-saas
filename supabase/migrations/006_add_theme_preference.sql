-- ============================================
-- Migration 006: Adicionar preferência de tema
-- ============================================
-- Data: 2025-10-13
-- Descrição: Adiciona coluna theme_preference na tabela user_profiles

-- Adicionar coluna theme_preference
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT CHECK (theme_preference IN ('light', 'dark'));

-- Adicionar comentário
COMMENT ON COLUMN user_profiles.theme_preference IS
'Preferência de tema do usuário: light ou dark. NULL usa preferência do sistema.';

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_user_profiles_theme_preference
ON user_profiles(theme_preference)
WHERE theme_preference IS NOT NULL;
