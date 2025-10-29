-- Função RPC para obter despesas mensais para o gráfico do Dashboard
-- Retorna despesas agrupadas por mês para o ano atual e ano anterior

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
  -- Obter ano atual e anterior
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  previous_year := current_year - 1;

  -- Construir query dinâmica para acessar schema do tenant
  query := format('
    WITH meses_base AS (
      -- Garantir que temos todos os 12 meses
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

  -- Executar query e retornar resultados
  RETURN QUERY EXECUTE query;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.get_expenses_by_month_chart(TEXT, TEXT) IS
'Retorna despesas mensais agrupadas por mês para o ano atual e ano anterior.
Parâmetros:
  - schema_name: Nome do schema do tenant (ex: okilao, saoluiz)
  - p_filiais: IDs das filiais separados por vírgula (ex: 1,4,6) ou ''all'' para todas
Retorna:
  - mes: Abreviação do mês (Jan, Fev, Mar, etc)
  - total_despesas: Soma das despesas do mês no ano atual
  - total_despesas_ano_anterior: Soma das despesas do mês no ano anterior';

-- Exemplos de uso:
-- SELECT * FROM public.get_expenses_by_month_chart('okilao', 'all');
-- SELECT * FROM public.get_expenses_by_month_chart('okilao', '1,4,6');
-- SELECT * FROM public.get_expenses_by_month_chart('saoluiz', '1');
