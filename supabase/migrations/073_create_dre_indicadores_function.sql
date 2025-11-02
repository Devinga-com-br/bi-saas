-- Migration: Create get_dre_indicadores function
-- Description: Busca indicadores de receita, lucro e CMV para o DRE Gerencial
-- Author: System
-- Date: 2025-11-01

CREATE OR REPLACE FUNCTION get_dre_indicadores(
    schema_name TEXT,
    p_data_inicio DATE,
    p_data_fim DATE,
    p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    receita_bruta NUMERIC,
    lucro_bruto NUMERIC,
    cmv NUMERIC,
    total_transacoes INTEGER
) AS $$
DECLARE
    filter_clause TEXT := '';
BEGIN
    -- Build filter clause for branches if provided
    IF p_filiais_ids IS NOT NULL AND array_length(p_filiais_ids, 1) > 0 THEN
        filter_clause := format('AND filial_id = ANY(ARRAY[%s]::TEXT[])', 
                               array_to_string(p_filiais_ids, ','));
    END IF;

    -- Execute dynamic query to get aggregated data
    RETURN QUERY EXECUTE format('
        SELECT 
            COALESCE(SUM(valor_total), 0)::NUMERIC as receita_bruta,
            COALESCE(SUM(total_lucro), 0)::NUMERIC as lucro_bruto,
            COALESCE(SUM(valor_total) - SUM(total_lucro), 0)::NUMERIC as cmv,
            COALESCE(SUM(total_transacoes), 0)::INTEGER as total_transacoes
        FROM %I.vendas_diarias_por_filial
        WHERE data_venda BETWEEN %L AND %L %s
    ', schema_name, p_data_inicio, p_data_fim, filter_clause);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dre_indicadores(TEXT, DATE, DATE, TEXT[]) TO authenticated;

COMMENT ON FUNCTION get_dre_indicadores IS 'Busca indicadores agregados de vendas para o DRE Gerencial com filtro opcional por filiais';
