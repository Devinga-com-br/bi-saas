-- Migration: Adicionar colunas de lucro e margem ao schema demo
-- Data: 2026-01-15
-- Descrição: Adiciona campos custo_realizado e lucro_realizado na tabela metas_mensais do schema demo

-- ============================================================================
-- FASE 1: ALTER TABLE - Adicionar colunas no schema demo
-- ============================================================================

-- Schema: demo
ALTER TABLE demo.metas_mensais
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON COLUMN demo.metas_mensais.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN demo.metas_mensais.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';
