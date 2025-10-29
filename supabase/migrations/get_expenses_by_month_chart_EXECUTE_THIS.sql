CREATE OR REPLACE FUNCTION public.get_expenses_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  mes TEXT,
  total_despesas NUMERIC,
  total_despesas_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query TEXT;
  current_year INT;
  previous_year INT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  previous_year := current_year - 1;

  query := format('
    WITH meses_base AS (
      SELECT
        TO_CHAR(DATE ''2000-01-01'' + (n || '' months'')::INTERVAL, ''Mon'') as mes,
        n + 1 as mes_num
      FROM generate_series(0, 11) n
    ),
    despesas_ano_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_emissao)::INT as mes_num,
        SUM(valor) as total
      FROM %I.despesas
      WHERE
        EXTRACT(YEAR FROM data_emissao) = %s
        AND (%L = ''all'' OR filial_id::TEXT = ANY(string_to_array(%L, '',''))::TEXT[])
      GROUP BY EXTRACT(MONTH FROM data_emissao)
    ),
    despesas_ano_anterior AS (
      SELECT
        EXTRACT(MONTH FROM data_emissao)::INT as mes_num,
        SUM(valor) as total
      FROM %I.despesas
      WHERE
        EXTRACT(YEAR FROM data_emissao) = %s
        AND (%L = ''all'' OR filial_id::TEXT = ANY(string_to_array(%L, '',''))::TEXT[])
      GROUP BY EXTRACT(MONTH FROM data_emissao)
    )
    SELECT
      m.mes::TEXT,
      COALESCE(da.total, 0)::NUMERIC as total_despesas,
      COALESCE(daa.total, 0)::NUMERIC as total_despesas_ano_anterior
    FROM meses_base m
    LEFT JOIN despesas_ano_atual da ON m.mes_num = da.mes_num
    LEFT JOIN despesas_ano_anterior daa ON m.mes_num = daa.mes_num
    ORDER BY m.mes_num
  ',
    schema_name,
    current_year,
    p_filiais,
    p_filiais,
    schema_name,
    previous_year,
    p_filiais,
    p_filiais
  );

  RETURN QUERY EXECUTE query;
END;
$$;
