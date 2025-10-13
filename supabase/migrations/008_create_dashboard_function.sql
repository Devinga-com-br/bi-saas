-- Description: Updates the get_dashboard_data function to include data for the sales chart,
-- comparing daily sales of the current period against the same period last year.

CREATE OR REPLACE FUNCTION get_dashboard_data(
    schema_name TEXT,
    p_filial_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_vendas NUMERIC,
    total_lucro NUMERIC,
    ticket_medio NUMERIC,
    margem_lucro NUMERIC,
    variacao_vendas_mes NUMERIC,
    variacao_lucro_mes NUMERIC,
    variacao_ticket_mes NUMERIC,
    variacao_margem_mes NUMERIC,
    variacao_vendas_ano NUMERIC,
    variacao_lucro_ano NUMERIC,
    variacao_ticket_ano NUMERIC,
    variacao_margem_ano NUMERIC,
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

    -- Metrics variables (current, previous month, previous year)
    v_vendas_atual NUMERIC; v_lucro_atual NUMERIC; v_transacoes_atual BIGINT;
    v_ticket_medio_atual NUMERIC; v_margem_lucro_atual NUMERIC;
    v_vendas_mes_ant NUMERIC; v_lucro_mes_ant NUMERIC; v_transacoes_mes_ant BIGINT;
    v_ticket_medio_mes_ant NUMERIC; v_margem_lucro_mes_ant NUMERIC;
    v_vendas_ano_ant NUMERIC; v_lucro_ano_ant NUMERIC; v_transacoes_ano_ant BIGINT;
    v_ticket_medio_ano_ant NUMERIC; v_margem_lucro_ano_ant NUMERIC;

    -- Chart data variable
    v_grafico_vendas JSONB;
BEGIN
    -- Helper function for safe division
    CREATE OR REPLACE FUNCTION safe_divide(dividend NUMERIC, divisor NUMERIC) RETURNS NUMERIC AS
    'SELECT CASE WHEN divisor = 0 THEN 0 ELSE dividend / divisor END;'
    LANGUAGE SQL IMMUTABLE;

    -- Aggregate metrics queries (current, prev month, prev year)
    EXECUTE format('SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(total_lucro),0), COALESCE(SUM(total_transacoes),0) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)', schema_name, data_inicio_atual, data_fim_atual, p_filial_id, p_filial_id) INTO v_vendas_atual, v_lucro_atual, v_transacoes_atual;
    EXECUTE format('SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(total_lucro),0), COALESCE(SUM(total_transacoes),0) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)', schema_name, data_inicio_mes_ant, data_fim_mes_ant, p_filial_id, p_filial_id) INTO v_vendas_mes_ant, v_lucro_mes_ant, v_transacoes_mes_ant;
    EXECUTE format('SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(total_lucro),0), COALESCE(SUM(total_transacoes),0) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)', schema_name, data_inicio_ano_ant, data_fim_ano_ant, p_filial_id, p_filial_id) INTO v_vendas_ano_ant, v_lucro_ano_ant, v_transacoes_ano_ant;

    -- Chart data query
    EXECUTE format('
        WITH days AS (
            SELECT generate_series(%L::DATE, %L::DATE, ''1 day'')::DATE as dia
        ),
        vendas_atuais AS (
            SELECT data_venda, SUM(valor_total) as total FROM %I.vendas_diarias_por_filial
            WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)
            GROUP BY data_venda
        ),
        vendas_ano_anterior AS (
            SELECT data_venda, SUM(valor_total) as total FROM %I.vendas_diarias_por_filial
            WHERE data_venda BETWEEN %L AND %L AND (%L IS NULL OR filial_id::TEXT = %L)
            GROUP BY data_venda
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                ''mes'', to_char(d.dia, ''DD/MM''),
                ''ano_atual'', COALESCE(va.total, 0),
                ''ano_anterior'', COALESCE(vaa.total, 0)
            ) ORDER BY d.dia
        )
        FROM days d
        LEFT JOIN vendas_atuais va ON d.dia = va.data_venda
        LEFT JOIN vendas_ano_anterior vaa ON d.dia = (vaa.data_venda + interval ''1 year'');',
        data_inicio_atual, data_fim_atual, schema_name, data_inicio_atual, data_fim_atual, p_filial_id, p_filial_id, schema_name, data_inicio_ano_ant, data_fim_ano_ant, p_filial_id, p_filial_id
    ) INTO v_grafico_vendas;

    -- Calculate metrics
    v_ticket_medio_atual := safe_divide(v_vendas_atual, v_transacoes_atual);
    v_margem_lucro_atual := safe_divide(v_lucro_atual, v_vendas_atual) * 100;
    v_ticket_medio_mes_ant := safe_divide(v_vendas_mes_ant, v_transacoes_mes_ant);
    v_margem_lucro_mes_ant := safe_divide(v_lucro_mes_ant, v_vendas_mes_ant) * 100;
    v_ticket_medio_ano_ant := safe_divide(v_vendas_ano_ant, v_transacoes_ano_ant);
    v_margem_lucro_ano_ant := safe_divide(v_lucro_ano_ant, v_vendas_ano_ant) * 100;

    -- Final assignment
    total_vendas := v_vendas_atual; total_lucro := v_lucro_atual; ticket_medio := v_ticket_medio_atual; margem_lucro := v_margem_lucro_atual;
    variacao_vendas_mes := safe_divide(v_vendas_atual - v_vendas_mes_ant, v_vendas_mes_ant) * 100;
    variacao_lucro_mes := safe_divide(v_lucro_atual - v_lucro_mes_ant, v_lucro_mes_ant) * 100;
    variacao_ticket_mes := safe_divide(v_ticket_medio_atual - v_ticket_medio_mes_ant, v_ticket_medio_mes_ant) * 100;
    variacao_margem_mes := v_margem_lucro_atual - v_margem_lucro_mes_ant;
    variacao_vendas_ano := safe_divide(v_vendas_atual - v_vendas_ano_ant, v_vendas_ano_ant) * 100;
    variacao_lucro_ano := safe_divide(v_lucro_atual - v_lucro_ano_ant, v_lucro_ano_ant) * 100;
    variacao_ticket_ano := safe_divide(v_ticket_medio_atual - v_ticket_medio_ano_ant, v_ticket_medio_ano_ant) * 100;
    variacao_margem_ano := v_margem_lucro_atual - v_margem_lucro_ano_ant;
    grafico_vendas := COALESCE(v_grafico_vendas, '[]'::jsonb);

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;