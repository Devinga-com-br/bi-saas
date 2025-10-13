-- DEBUG VERSION: This function counts records instead of summing values to help diagnose data fetching issues.

CREATE OR REPLACE FUNCTION get_dashboard_data(
    schema_name TEXT, 
    p_filial_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_vendas NUMERIC, total_lucro NUMERIC, ticket_medio NUMERIC, margem_lucro NUMERIC,
    variacao_vendas_mes NUMERIC, variacao_lucro_mes NUMERIC, variacao_ticket_mes NUMERIC, variacao_margem_mes NUMERIC,
    variacao_vendas_ano NUMERIC, variacao_lucro_ano NUMERIC, variacao_ticket_ano NUMERIC, variacao_margem_ano NUMERIC,
    grafico_vendas JSONB
) AS $$
DECLARE
    -- Date ranges
    data_inicio_atual DATE := date_trunc('month', now());
    data_fim_atual DATE := now()::DATE;
    data_inicio_mes_ant DATE := data_inicio_atual - interval '1 month';
    data_fim_mes_ant DATE := data_inicio_mes_ant + (data_fim_atual - data_inicio_atual);
    data_inicio_ano_ant DATE := data_inicio_atual - interval '1 year';
    data_fim_ano_ant DATE := data_inicio_ano_ant + (data_fim_atual - data_inicio_atual);
    
    -- Count variables
    v_contagem_atual BIGINT;
    v_contagem_mes_ant BIGINT;
    v_contagem_ano_ant BIGINT;
BEGIN
    -- Count Current Period
    EXECUTE format('SELECT COUNT(*) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)', schema_name, data_inicio_atual, data_fim_atual, p_filial_id, p_filial_id) INTO v_contagem_atual;

    -- Count Previous Month
    EXECUTE format('SELECT COUNT(*) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)', schema_name, data_inicio_mes_ant, data_fim_mes_ant, p_filial_id, p_filial_id) INTO v_contagem_mes_ant;

    -- Count Previous Year
    EXECUTE format('SELECT COUNT(*) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)', schema_name, data_inicio_ano_ant, data_fim_ano_ant, p_filial_id, p_filial_id) INTO v_contagem_ano_ant;

    -- Return counts in the main fields for debugging
    total_vendas := v_contagem_atual;
    total_lucro := v_contagem_mes_ant;
    ticket_medio := v_contagem_ano_ant;
    
    -- Zero out the rest to avoid errors
    margem_lucro := 0;
    variacao_vendas_mes := 0; variacao_lucro_mes := 0; variacao_ticket_mes := 0; variacao_margem_mes := 0;
    variacao_vendas_ano := 0; variacao_lucro_ano := 0; variacao_ticket_ano := 0; variacao_margem_ano := 0;
    grafico_vendas := '[]'::jsonb;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;