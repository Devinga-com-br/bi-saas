-- Drop todas as versões duplicadas da função
DROP FUNCTION IF EXISTS get_metas_mensais_report(TEXT, INT, INT, INT, INT[]);
DROP FUNCTION IF EXISTS get_metas_mensais_report(TEXT, INT, INT, INT);
DROP FUNCTION IF EXISTS get_metas_mensais_report(TEXT, INT, INT);

-- Criar função corrigida (sem locale no to_char, usando CASE para dias da semana)
CREATE OR REPLACE FUNCTION get_metas_mensais_report(
    p_schema TEXT,
    p_mes INT,
    p_ano INT,
    p_filial_id INT DEFAULT NULL,
    p_filial_ids INT[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_query TEXT;
    v_filial_filter TEXT;
    v_data_inicio DATE;
    v_data_fim DATE;
BEGIN
    -- Validar schema
    IF p_schema IS NULL OR p_schema = '' THEN
        RAISE EXCEPTION 'Schema não informado';
    END IF;

    -- Calcular data de início e fim do mês (SEMPRE do dia 1 ao último dia)
    v_data_inicio := make_date(p_ano, p_mes, 1);
    v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Montar filtro de filial
    IF p_filial_ids IS NOT NULL AND array_length(p_filial_ids, 1) > 0 THEN
        v_filial_filter := format('AND m.filial_id = ANY($1)');
    ELSIF p_filial_id IS NOT NULL THEN
        v_filial_filter := format('AND m.filial_id = %s', p_filial_id);
    ELSE
        v_filial_filter := '';
    END IF;

    -- Query principal
    v_query := format($query$
        WITH metas_periodo AS (
            SELECT 
                m.id,
                m.filial_id,
                m.data,
                CASE EXTRACT(DOW FROM m.data)
                    WHEN 0 THEN 'Domingo'
                    WHEN 1 THEN 'Segunda'
                    WHEN 2 THEN 'Terça'
                    WHEN 3 THEN 'Quarta'
                    WHEN 4 THEN 'Quinta'
                    WHEN 5 THEN 'Sexta'
                    WHEN 6 THEN 'Sábado'
                END as dia_semana,
                m.meta_percentual,
                m.data_referencia,
                m.valor_referencia,
                m.valor_meta,
                COALESCE(m.valor_realizado, 0) as valor_realizado,
                (COALESCE(m.valor_realizado, 0) - m.valor_meta) as diferenca,
                CASE 
                    WHEN m.valor_meta > 0 THEN 
                        ((COALESCE(m.valor_realizado, 0) - m.valor_meta) / m.valor_meta * 100)
                    ELSE 0 
                END as diferenca_percentual
            FROM %I.metas_mensais m
            WHERE m.data >= $2
              AND m.data <= $3
              %s
            ORDER BY m.data, m.filial_id
        ),
        totais AS (
            SELECT 
                COALESCE(SUM(valor_realizado), 0) as total_realizado,
                COALESCE(SUM(valor_meta), 0) as total_meta,
                CASE 
                    WHEN SUM(valor_meta) > 0 THEN 
                        (SUM(valor_realizado) / SUM(valor_meta) * 100)
                    ELSE 0 
                END as percentual_atingido
            FROM metas_periodo
        )
        SELECT json_build_object(
            'metas', COALESCE((SELECT json_agg(row_to_json(metas_periodo)) FROM metas_periodo), '[]'::json),
            'total_realizado', (SELECT total_realizado FROM totais),
            'total_meta', (SELECT total_meta FROM totais),
            'percentual_atingido', (SELECT percentual_atingido FROM totais)
        )
    $query$, p_schema, v_filial_filter);

    -- Executar query
    IF p_filial_ids IS NOT NULL AND array_length(p_filial_ids, 1) > 0 THEN
        EXECUTE v_query INTO v_result USING p_filial_ids, v_data_inicio, v_data_fim;
    ELSE
        EXECUTE v_query INTO v_result USING v_data_inicio, v_data_fim;
    END IF;

    RETURN COALESCE(v_result, json_build_object(
        'metas', '[]'::json,
        'total_realizado', 0,
        'total_meta', 0,
        'percentual_atingido', 0
    ));

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao buscar metas: %', SQLERRM;
END;
$$;

-- Garantir que a função é acessível
GRANT EXECUTE ON FUNCTION get_metas_mensais_report(TEXT, INT, INT, INT, INT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metas_mensais_report(TEXT, INT, INT, INT, INT[]) TO service_role;

-- Comentário explicativo
COMMENT ON FUNCTION get_metas_mensais_report IS 'Retorna relatório de metas mensais com valores realizados. SEMPRE inicia do dia 1 do mês até o último dia, independentemente dos filtros de filial aplicados.';
