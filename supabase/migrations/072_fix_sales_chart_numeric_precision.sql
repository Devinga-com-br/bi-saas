-- Migration: Corrige precisão numérica no gráfico de vendas mensais
--
-- Problema: A função get_sales_by_month_chart estava usando numeric(10,2) que suporta
-- valores de até 99.999.999,99. Quando vendas anuais ultrapassam esse valor,
-- ocorre erro "numeric field overflow".
--
-- Solução: Aumentar precisão de numeric(10,2) para numeric(15,2), permitindo
-- valores de até 9.999.999.999.999,99 (9 trilhões).

CREATE OR REPLACE FUNCTION get_sales_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  filial_filter TEXT;
BEGIN
  -- Construir filtro de filiais
  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    -- Converter string '1,2,3' para condição SQL
    -- p_filiais contém branch_codes como string separada por vírgulas
    filial_filter := format('AND vdf.filial_id IN (%s)', p_filiais);
  ELSE
    -- NULL, 'all' ou vazio = sem filtro (todas as filiais)
    filial_filter := '';
  END IF;

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
        COALESCE(SUM(CASE
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN vdf.valor_total
          ELSE 0
        END), 0)::numeric(15, 2) AS total_vendas,
        COALESCE(SUM(CASE
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
          THEN vdf.valor_total
          ELSE 0
        END), 0)::numeric(15, 2) AS total_vendas_ano_anterior
      FROM
        meses m
      LEFT JOIN
        %I.vendas_diarias_por_filial vdf ON m.mes_num = EXTRACT(MONTH FROM vdf.data_venda)
                                         AND (EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
                                          OR EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1)
                                         %s
      GROUP BY
        m.mes_num, m.mes_nome
      ORDER BY
        m.mes_num
    ) t;
    $q$,
    schema_name,
    filial_filter
  ) INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Comentário sobre a alteração:
-- Mudança de numeric(10,2) para numeric(15,2) nas linhas 48 e 53
-- Isso permite valores muito maiores sem comprometer a precisão de 2 casas decimais
--
-- Comparação:
-- numeric(10,2) = até 99.999.999,99 (99 milhões)
-- numeric(15,2) = até 9.999.999.999.999,99 (9 trilhões)
