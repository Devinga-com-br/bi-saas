
CREATE OR REPLACE FUNCTION get_sales_by_month_chart(schema_name TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE format(
    $q$
    SELECT json_agg(t)
    FROM (
      WITH meses AS (
        SELECT * FROM (VALUES
            (1, 'Jan'), (2, 'Fev'), (3, 'Mar'), (4, 'Abr'),
            (5, 'Mai'), (6, 'Jun'), (7, 'Jul'), (8, 'Ago'),
            (9, 'Set'), (10, 'Out'), (11, 'Nov'), (12, 'Dez')
        ) AS t (mes_num, mes_nome)
      )
      SELECT
        m.mes_nome AS mes,
        COALESCE(SUM(vdf.valor_total), 0)::numeric(10, 2) AS total_vendas
      FROM
        meses m
      LEFT JOIN
        %I.vendas_diarias_por_filial vdf ON m.mes_num = EXTRACT(MONTH FROM vdf.data_venda)
                                         AND EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY
        m.mes_num, m.mes_nome
      ORDER BY
        m.mes_num
    ) t;
    $q$,
    schema_name
  ) INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
