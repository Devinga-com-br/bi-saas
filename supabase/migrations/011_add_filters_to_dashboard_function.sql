-- Description: Updates the get_dashboard_data function to support dynamic date ranges and multi-branch filtering.

CREATE OR REPLACE FUNCTION get_dashboard_data(
    schema_name TEXT,
    p_data_inicio DATE,
    p_data_fim DATE,
    p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    total_vendas NUMERIC, total_lucro NUMERIC, ticket_medio NUMERIC, margem_lucro NUMERIC,
    variacao_vendas_mes NUMERIC, variacao_lucro_mes NUMERIC, variacao_ticket_mes NUMERIC, variacao_margem_mes NUMERIC,
    variacao_vendas_ano NUMERIC, variacao_lucro_ano NUMERIC, variacao_ticket_ano NUMERIC, variacao_margem_ano NUMERIC,
    grafico_vendas JSONB
) AS $$
DECLARE
    -- Date ranges based on parameters
    periodo_dias INT := p_data_fim - p_data_inicio;
    data_inicio_mes_ant DATE := p_data_inicio - interval '1 month';
    data_fim_mes_ant DATE := data_inicio_mes_ant + periodo_dias;
    data_inicio_ano_ant DATE := p_data_inicio - interval '1 year';
    data_fim_ano_ant DATE := data_inicio_ano_ant + periodo_dias;

    -- Metric variables
    v_vendas_atual NUMERIC; v_lucro_atual NUMERIC; v_transacoes_atual BIGINT;
    v_ticket_medio_atual NUMERIC; v_margem_lucro_atual NUMERIC;
    v_vendas_mes_ant NUMERIC; v_lucro_mes_ant NUMERIC; v_transacoes_mes_ant BIGINT;
    v_ticket_medio_mes_ant NUMERIC; v_margem_lucro_mes_ant NUMERIC;
    v_vendas_ano_ant NUMERIC; v_lucro_ano_ant NUMERIC; v_transacoes_ano_ant BIGINT;
    v_ticket_medio_ano_ant NUMERIC; v_margem_lucro_ano_ant NUMERIC;
    v_grafico_vendas JSONB;
    
    -- Dynamic filter clause
    filter_clause TEXT;
BEGIN
    -- Build the branch filter clause dynamically
    IF p_filiais_ids IS NOT NULL AND array_length(p_filiais_ids, 1) > 0 THEN
        filter_clause := format('AND filial_id::TEXT = ANY(%L)', p_filiais_ids);
    ELSE
        filter_clause := ''; -- Empty string if no branches are selected, effectively selecting all
    END IF;

    -- Aggregate metrics queries
    EXECUTE format('SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(total_lucro),0), COALESCE(SUM(total_transacoes),0) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L %s', schema_name, p_data_inicio, p_data_fim, filter_clause) INTO v_vendas_atual, v_lucro_atual, v_transacoes_atual;
    EXECUTE format('SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(total_lucro),0), COALESCE(SUM(total_transacoes),0) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L %s', schema_name, data_inicio_mes_ant, data_fim_mes_ant, filter_clause) INTO v_vendas_mes_ant, v_lucro_mes_ant, v_transacoes_mes_ant;
    EXECUTE format('SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(total_lucro),0), COALESCE(SUM(total_transacoes),0) FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L %s', schema_name, data_inicio_ano_ant, data_fim_ano_ant, filter_clause) INTO v_vendas_ano_ant, v_lucro_ano_ant, v_transacoes_ano_ant;

    -- Chart data query
    EXECUTE format(
        $CHART_QUERY$
        WITH days AS (SELECT generate_series(%L::DATE, %L::DATE, '1 day')::DATE as dia),
        vendas_atuais AS (SELECT data_venda, SUM(valor_total) as total FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L %s GROUP BY data_venda),
        vendas_ano_anterior AS (SELECT data_venda, SUM(valor_total) as total FROM %I.vendas_diarias_por_filial WHERE data_venda BETWEEN %L AND %L %s GROUP BY data_venda)
        SELECT jsonb_agg(jsonb_build_object('mes', to_char(d.dia, 'DD/MM'), 'ano_atual', COALESCE(va.total, 0), 'ano_anterior', COALESCE(vaa.total, 0)) ORDER BY d.dia)
        FROM days d LEFT JOIN vendas_atuais va ON d.dia = va.data_venda LEFT JOIN vendas_ano_anterior vaa ON d.dia = (vaa.data_venda + interval '1 year')
        $CHART_QUERY$,
        p_data_inicio, p_data_fim, schema_name, p_data_inicio, p_data_fim, filter_clause, schema_name, data_inicio_ano_ant, data_fim_ano_ant, filter_clause
    ) INTO v_grafico_vendas;

    -- Calculate metrics
    v_ticket_medio_atual := CASE WHEN v_transacoes_atual > 0 THEN v_vendas_atual / v_transacoes_atual ELSE 0 END;
    v_margem_lucro_atual := CASE WHEN v_vendas_atual > 0 THEN (v_lucro_atual / v_vendas_atual) * 100 ELSE 0 END;
    v_ticket_medio_mes_ant := CASE WHEN v_transacoes_mes_ant > 0 THEN v_vendas_mes_ant / v_transacoes_mes_ant ELSE 0 END;
    v_margem_lucro_mes_ant := CASE WHEN v_vendas_mes_ant > 0 THEN (v_lucro_mes_ant / v_vendas_mes_ant) * 100 ELSE 0 END;
    v_ticket_medio_ano_ant := CASE WHEN v_transacoes_ano_ant > 0 THEN v_vendas_ano_ant / v_transacoes_ano_ant ELSE 0 END;
    v_margem_lucro_ano_ant := CASE WHEN v_vendas_ano_ant > 0 THEN (v_lucro_ano_ant / v_vendas_ano_ant) * 100 ELSE 0 END;

    -- Final assignment
    total_vendas := v_vendas_atual; total_lucro := v_lucro_atual; ticket_medio := v_ticket_medio_atual; margem_lucro := v_margem_lucro_atual;
    variacao_vendas_mes := CASE WHEN v_vendas_mes_ant > 0 THEN ((v_vendas_atual - v_vendas_mes_ant) / v_vendas_mes_ant) * 100 ELSE 0 END;
    variacao_lucro_mes := CASE WHEN v_lucro_mes_ant > 0 THEN ((v_lucro_atual - v_lucro_mes_ant) / v_lucro_mes_ant) * 100 ELSE 0 END;
    variacao_ticket_mes := CASE WHEN v_ticket_medio_mes_ant > 0 THEN ((v_ticket_medio_atual - v_ticket_medio_mes_ant) / v_ticket_medio_mes_ant) * 100 ELSE 0 END;
    variacao_margem_mes := v_margem_lucro_atual - v_margem_lucro_mes_ant;
    variacao_vendas_ano := CASE WHEN v_vendas_ano_ant > 0 THEN ((v_vendas_atual - v_vendas_ano_ant) / v_vendas_ano_ant) * 100 ELSE 0 END;
    variacao_lucro_ano := CASE WHEN v_lucro_ano_ant > 0 THEN ((v_lucro_atual - v_lucro_ano_ant) / v_lucro_ano_ant) * 100 ELSE 0 END;
    variacao_ticket_ano := CASE WHEN v_ticket_medio_ano_ant > 0 THEN ((v_ticket_medio_atual - v_ticket_medio_ano_ant) / v_ticket_medio_ano_ant) * 100 ELSE 0 END;
    variacao_margem_ano := v_margem_lucro_atual - v_margem_lucro_ano_ant;
    grafico_vendas := COALESCE(v_grafico_vendas, '[]'::jsonb);

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
