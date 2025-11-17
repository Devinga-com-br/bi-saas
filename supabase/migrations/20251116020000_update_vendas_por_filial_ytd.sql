-- =====================================================
-- Migration: Aplica lógica YTD em get_vendas_por_filial
-- Created: 2025-11-16
-- Description: Atualiza a função para usar YTD (Year-to-Date)
--              quando filter_type = 'year' E o ano é o ano atual
-- =====================================================

-- Drop função existente
DROP FUNCTION IF EXISTS public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT);

-- Criar nova versão com lógica MTD + YTD
CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all',
  p_filter_type TEXT DEFAULT 'year'  -- 'month', 'year', 'custom'
)
RETURNS TABLE (
  filial_id BIGINT,
  valor_total NUMERIC(15,2),
  custo_total NUMERIC(15,2),
  total_lucro NUMERIC(15,2),
  quantidade_total NUMERIC(15,2),
  total_transacoes NUMERIC,
  ticket_medio NUMERIC(15,2),
  margem_lucro NUMERIC(5,2),
  pa_valor_total NUMERIC(15,2),
  pa_custo_total NUMERIC(15,2),
  pa_total_lucro NUMERIC(15,2),
  pa_total_transacoes NUMERIC,
  pa_ticket_medio NUMERIC(15,2),
  pa_margem_lucro NUMERIC(5,2),
  delta_valor NUMERIC(15,2),
  delta_valor_percent NUMERIC(5,2),
  delta_custo NUMERIC(15,2),
  delta_custo_percent NUMERIC(5,2),
  delta_lucro NUMERIC(15,2),
  delta_lucro_percent NUMERIC(5,2),
  delta_margem NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pa_data_inicio DATE;
  v_pa_data_fim DATE;
  v_filiais_condition TEXT;
  v_current_day INTEGER;
  v_mtd_end_day INTEGER;
  v_last_day_previous_month INTEGER;
BEGIN
  -- =====================================================
  -- CÁLCULO DO PERÍODO ANTERIOR BASEADO NO TIPO DE FILTRO
  -- =====================================================

  IF p_filter_type = 'month' THEN
    -- Filtro por Mês: MTD (Month-to-Date)
    -- Compara período do início do mês até o dia atual com o MESMO MÊS DO ANO ANTERIOR
    -- Exemplo: Hoje 16/11/2025, filtro Nov/2025
    --   Atual: 01/11/2025 a 16/11/2025
    --   PA: 01/11/2024 a 16/11/2024 (mesmo mês ano anterior, mesmos dias)

    -- Dia atual do mês
    v_current_day := EXTRACT(DAY FROM CURRENT_DATE);

    -- Mesmo mês, ano anterior
    v_pa_data_inicio := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 year')::DATE;

    -- Último dia do mesmo mês no ano anterior
    v_last_day_previous_month := EXTRACT(DAY FROM ((DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 year') + INTERVAL '1 month' - INTERVAL '1 day')::DATE);

    -- Usa o mínimo entre o dia atual e o último dia do mês no ano anterior
    v_mtd_end_day := LEAST(v_current_day, v_last_day_previous_month);

    -- Data fim do mesmo mês ano anterior MTD
    v_pa_data_fim := (v_pa_data_inicio + (v_mtd_end_day - 1) * INTERVAL '1 day')::DATE;

  ELSIF p_filter_type = 'custom' THEN
    -- Filtro Customizado: usa mesmo intervalo do ano anterior
    -- Exemplo: 01/11/2025 a 16/11/2025 → 01/11/2024 a 16/11/2024
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';

  ELSE -- p_filter_type = 'year' (ou qualquer outro valor)
    -- Verifica se é o ano atual para aplicar YTD
    IF EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM CURRENT_DATE) THEN
      -- Filtro por Ano Atual: YTD (Year-to-Date)
      -- Compara período do início do ano até o dia/mês atual com o mesmo período do ano anterior
      -- Exemplo: Hoje 16/11/2025, filtro Ano 2025
      --   Atual: 01/01/2025 a 16/11/2025
      --   PA: 01/01/2024 a 16/11/2024 (mesmo período do ano anterior)

      -- Ano anterior, início do ano
      v_pa_data_inicio := (DATE_TRUNC('year', p_data_inicio) - INTERVAL '1 year')::DATE;

      -- Mesmo dia e mês do ano anterior
      v_pa_data_fim := (CURRENT_DATE - INTERVAL '1 year')::DATE;
    ELSE
      -- Filtro por Ano Passado: usa ano anterior completo (comportamento original)
      -- Exemplo: 01/01/2024 a 31/12/2024 → 01/01/2023 a 31/12/2023
      v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
      v_pa_data_fim := p_data_fim - INTERVAL '1 year';
    END IF;
  END IF;

  -- Condição de filiais
  IF p_filiais = 'all' OR p_filiais IS NULL THEN
    v_filiais_condition := '';
  ELSE
    v_filiais_condition := format(' AND filial_id IN (%s)', p_filiais);
  END IF;

  -- =====================================================
  -- QUERY PRINCIPAL COM CTEs
  -- =====================================================
  RETURN QUERY EXECUTE format('
    WITH periodo_atual AS (
      SELECT
        filial_id,
        SUM(valor_total) as valor_total_bruto,
        SUM(custo_total) as custo_total_bruto,
        SUM(total_lucro) as total_lucro_bruto,
        SUM(quantidade_total) as quantidade_total,
        SUM(total_transacoes)::NUMERIC as total_transacoes
      FROM %I.vendas_diarias_por_filial
      WHERE data_venda BETWEEN $1 AND $2
      %s
      GROUP BY filial_id
    ),
    descontos_periodo_atual AS (
      SELECT
        filial_id,
        SUM(valor_desconto) as total_desconto_venda,
        SUM(desconto_custo) as total_desconto_custo
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
      %s
      GROUP BY filial_id
    ),
    periodo_atual_com_desconto AS (
      SELECT
        pa.filial_id,
        -- Vendas líquidas (vendas - desconto venda)
        pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as valor_total,
        -- Custo líquido (custo - desconto custo)
        pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as custo_total,
        -- Lucro bruto = vendas líquidas - custo líquido
        (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
        (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as total_lucro,
        pa.quantidade_total,
        pa.total_transacoes,
        -- Ticket médio
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0))::NUMERIC / pa.total_transacoes::NUMERIC
          ELSE 0
        END as ticket_medio,
        -- Margem de lucro
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
          THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
                 (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
                (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0))::NUMERIC) * 100
          ELSE 0
        END as margem_lucro
      FROM periodo_atual pa
      LEFT JOIN descontos_periodo_atual dpa ON pa.filial_id = dpa.filial_id
    ),
    periodo_anterior AS (
      SELECT
        filial_id,
        SUM(valor_total) as valor_total_bruto,
        SUM(custo_total) as custo_total_bruto,
        SUM(total_lucro) as total_lucro_bruto,
        SUM(total_transacoes)::NUMERIC as total_transacoes
      FROM %I.vendas_diarias_por_filial
      WHERE data_venda BETWEEN $3 AND $4
      %s
      GROUP BY filial_id
    ),
    descontos_periodo_anterior AS (
      SELECT
        filial_id,
        SUM(valor_desconto) as total_desconto_venda,
        SUM(desconto_custo) as total_desconto_custo
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $3 AND $4
      %s
      GROUP BY filial_id
    ),
    periodo_anterior_com_desconto AS (
      SELECT
        pa.filial_id,
        -- Vendas líquidas PA
        pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as pa_valor_total,
        -- Custo líquido PA
        pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as pa_custo_total,
        -- Lucro bruto PA = vendas líquidas - custo líquido
        (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
        (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as pa_total_lucro,
        pa.total_transacoes as pa_total_transacoes,
        -- Ticket médio PA
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0))::NUMERIC / pa.total_transacoes::NUMERIC
          ELSE 0
        END as pa_ticket_medio,
        -- Margem de lucro PA
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
          THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
                 (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
                (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0))::NUMERIC) * 100
          ELSE 0
        END as pa_margem_lucro
      FROM periodo_anterior pa
      LEFT JOIN descontos_periodo_anterior dpa ON pa.filial_id = dpa.filial_id
    )
    SELECT
      COALESCE(pc.filial_id, pa.filial_id)::BIGINT as filial_id,
      COALESCE(pc.valor_total, 0)::NUMERIC(15,2) as valor_total,
      COALESCE(pc.custo_total, 0)::NUMERIC(15,2) as custo_total,
      COALESCE(pc.total_lucro, 0)::NUMERIC(15,2) as total_lucro,
      COALESCE(pc.quantidade_total, 0)::NUMERIC(15,2) as quantidade_total,
      COALESCE(pc.total_transacoes, 0)::NUMERIC as total_transacoes,
      COALESCE(pc.ticket_medio, 0)::NUMERIC(15,2) as ticket_medio,
      COALESCE(pc.margem_lucro, 0)::NUMERIC(5,2) as margem_lucro,
      COALESCE(pa.pa_valor_total, 0)::NUMERIC(15,2) as pa_valor_total,
      COALESCE(pa.pa_custo_total, 0)::NUMERIC(15,2) as pa_custo_total,
      COALESCE(pa.pa_total_lucro, 0)::NUMERIC(15,2) as pa_total_lucro,
      COALESCE(pa.pa_total_transacoes, 0)::NUMERIC as pa_total_transacoes,
      COALESCE(pa.pa_ticket_medio, 0)::NUMERIC(15,2) as pa_ticket_medio,
      COALESCE(pa.pa_margem_lucro, 0)::NUMERIC(5,2) as pa_margem_lucro,
      -- Deltas
      (COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0))::NUMERIC(15,2) as delta_valor,
      CASE
        WHEN COALESCE(pa.pa_valor_total, 0) > 0
        THEN ((COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0)) / pa.pa_valor_total * 100)::NUMERIC(5,2)
        ELSE 0
      END as delta_valor_percent,
      (COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0))::NUMERIC(15,2) as delta_custo,
      CASE
        WHEN COALESCE(pa.pa_custo_total, 0) > 0
        THEN ((COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0)) / pa.pa_custo_total * 100)::NUMERIC(5,2)
        ELSE 0
      END as delta_custo_percent,
      (COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0))::NUMERIC(15,2) as delta_lucro,
      CASE
        WHEN COALESCE(pa.pa_total_lucro, 0) > 0
        THEN ((COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0)) / pa.pa_total_lucro * 100)::NUMERIC(5,2)
        ELSE 0
      END as delta_lucro_percent,
      (COALESCE(pc.margem_lucro, 0) - COALESCE(pa.pa_margem_lucro, 0))::NUMERIC(5,2) as delta_margem
    FROM periodo_atual_com_desconto pc
    FULL OUTER JOIN periodo_anterior_com_desconto pa ON pc.filial_id = pa.filial_id
    ORDER BY valor_total DESC NULLS LAST
  ',
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition
  )
  USING p_data_inicio, p_data_fim, v_pa_data_inicio, v_pa_data_fim;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_vendas_por_filial IS
'Retorna vendas detalhadas por filial com comparação temporal MTD/YTD.
Parâmetros:
- p_schema: schema do tenant
- p_data_inicio: data inicial do período
- p_data_fim: data final do período
- p_filiais: IDs separados por vírgula ou ''all''
- p_filter_type: tipo de filtro (''month'', ''year'', ''custom'')
  * ''month'': MTD - compara com mesmo mês do ano anterior MTD (mesmo período de dias)
  * ''year'' (ano atual): YTD - compara com mesmo período do ano anterior (01/Jan a dia/mês atual)
  * ''year'' (ano passado): compara com ano anterior completo
  * ''custom'': compara com mesmo intervalo do ano anterior
Exemplos:
- Filtro Mês (Hoje 16/11/2025, Nov/2025): Atual: 01/11-16/11/2025 → PA: 01/11-16/11/2024
- Filtro Ano Atual (Hoje 16/11/2025, Ano 2025): Atual: 01/01-16/11/2025 → PA: 01/01-16/11/2024 (YTD)
- Filtro Ano Passado (Ano 2024): Atual: 01/01-31/12/2024 → PA: 01/01-31/12/2023 (ano completo)
- Filtro Custom: 01/11/2025-16/11/2025 → PA: 01/11/2024-16/11/2024';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT) TO authenticated;
