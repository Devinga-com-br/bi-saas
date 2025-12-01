-- =====================================================
-- Migration: Add new modules to system_module enum
-- Created: 2025-12-01
-- Description: Adiciona 'dre_comparativo' e 'relatorios_perdas' ao enum system_module
--              para sincronizar com os módulos disponíveis no frontend
-- =====================================================

-- Adicionar novos valores ao enum
-- NOTA: ALTER TYPE ... ADD VALUE não pode ser executado dentro de uma transação
-- por isso cada comando deve ser executado separadamente

-- Adicionar dre_comparativo (após dre_gerencial)
ALTER TYPE public.system_module ADD VALUE IF NOT EXISTS 'dre_comparativo' AFTER 'dre_gerencial';

-- Adicionar relatorios_perdas (no final)
ALTER TYPE public.system_module ADD VALUE IF NOT EXISTS 'relatorios_perdas';

-- Verificar os valores do enum após a alteração
-- SELECT enum_range(NULL::public.system_module);

-- Comentário de documentação
COMMENT ON TYPE public.system_module IS 'Enum de módulos do sistema BI SaaS.
Valores atuais:
- dashboard: Dashboard principal
- dre_gerencial: DRE Gerencial
- dre_comparativo: DRE Comparativo (adicionado em 2025-12-01)
- metas_mensal: Metas mensais por filial
- metas_setor: Metas por setor
- relatorios_ruptura_abcd: Relatório de Ruptura ABCD
- relatorios_venda_curva: Relatório de Venda por Curva
- relatorios_ruptura_60d: Relatório de Ruptura 60 dias
- relatorios_perdas: Relatório de Perdas (adicionado em 2025-12-01)';
