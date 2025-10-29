-- Função para buscar lucro mensal da tabela vendas_diarias_por_filial
-- Retorna o total de lucro por mês para o ano atual e ano anterior

CREATE OR REPLACE FUNCTION public.get_lucro_by_month_chart(
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
          THEN vdf.total_lucro
          ELSE 0
        END), 0)::numeric(15, 2) AS total_lucro,
        COALESCE(SUM(CASE
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
          THEN vdf.total_lucro
          ELSE 0
        END), 0)::numeric(15, 2) AS total_lucro_ano_anterior
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

-- Comentário sobre a função:
-- Esta função busca o campo 'total_lucro' diretamente da tabela vendas_diarias_por_filial
-- Retorna todos os 12 meses com o total de lucro para o ano atual e ano anterior
-- O total_lucro já está calculado na tabela (valor_total - custo_total)
