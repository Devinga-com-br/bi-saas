-- =====================================================
-- Migration: Add relatorios_produtos_sem_vendas to system_module enum
-- Created: 2026-01-14
-- Description: Adiciona 'relatorios_produtos_sem_vendas' ao enum system_module
-- =====================================================

-- Adicionar relatorios_produtos_sem_vendas (após relatorios_perdas)
ALTER TYPE public.system_module ADD VALUE IF NOT EXISTS 'relatorios_produtos_sem_vendas';

-- Verificar os valores do enum após a alteração
-- SELECT enum_range(NULL::public.system_module);

-- Comentário de documentação atualizado
COMMENT ON TYPE public.system_module IS 'Enum de módulos do sistema BI SaaS.
Valores atuais:
- dashboard: Dashboard 360 principal
- dashboard_tempo_real: Dashboard Tempo Real
- dre_gerencial: DRE Gerencial
- dre_comparativo: DRE Comparativo
- metas_mensal: Metas mensais por filial
- metas_setor: Metas por setor
- relatorios_previsao_ruptura: Previsão de Ruptura
- relatorios_ruptura_abcd: Relatório de Ruptura ABCD
- relatorios_venda_curva: Relatório de Venda por Curva
- relatorios_ruptura_60d: Relatório de Ruptura 60 dias (Dias sem Giro)
- relatorios_perdas: Relatório de Perdas
- relatorios_produtos_sem_vendas: Produtos sem Vendas (adicionado em 2026-01-14)';
