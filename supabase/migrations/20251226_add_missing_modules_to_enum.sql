-- =====================================================
-- Migration: Add missing modules to system_module enum
-- Created: 2025-12-26
-- Description: Adiciona 'dashboard_tempo_real' e 'relatorios_previsao_ruptura'
--              ao enum system_module para sincronizar com o frontend
-- =====================================================

-- Adicionar dashboard_tempo_real (após dashboard)
ALTER TYPE public.system_module ADD VALUE IF NOT EXISTS 'dashboard_tempo_real' AFTER 'dashboard';

-- Adicionar relatorios_previsao_ruptura (antes de relatorios_ruptura_abcd)
ALTER TYPE public.system_module ADD VALUE IF NOT EXISTS 'relatorios_previsao_ruptura' AFTER 'metas_setor';

-- Verificar os valores do enum após a alteração
-- SELECT enum_range(NULL::public.system_module);

-- Comentário de documentação atualizado
COMMENT ON TYPE public.system_module IS 'Enum de módulos do sistema BI SaaS.
Valores atuais:
- dashboard: Dashboard 360 principal
- dashboard_tempo_real: Dashboard Tempo Real (adicionado em 2025-12-26)
- dre_gerencial: DRE Gerencial
- dre_comparativo: DRE Comparativo
- metas_mensal: Metas mensais por filial
- metas_setor: Metas por setor
- relatorios_previsao_ruptura: Previsão de Ruptura (adicionado em 2025-12-26)
- relatorios_ruptura_abcd: Relatório de Ruptura ABCD
- relatorios_venda_curva: Relatório de Venda por Curva
- relatorios_ruptura_60d: Relatório de Ruptura 60 dias (Dias sem Giro)
- relatorios_perdas: Relatório de Perdas';
