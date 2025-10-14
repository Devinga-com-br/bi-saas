-- Migration: Adiciona comparação ano anterior no gráfico de vendas mensais
-- 
-- Esta migração atualiza a função get_sales_by_month_chart para retornar
-- tanto as vendas do ano atual quanto do ano anterior, permitindo comparação
-- mês a mês no gráfico.

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
        COALESCE(SUM(CASE 
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) 
          THEN vdf.valor_total 
          ELSE 0 
        END), 0)::numeric(10, 2) AS total_vendas,
        COALESCE(SUM(CASE 
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1 
          THEN vdf.valor_total 
          ELSE 0 
        END), 0)::numeric(10, 2) AS total_vendas_ano_anterior
      FROM
        meses m
      LEFT JOIN
        %I.vendas_diarias_por_filial vdf ON m.mes_num = EXTRACT(MONTH FROM vdf.data_venda)
                                         AND (EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
                                          OR EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1)
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

-- Comentário sobre o que foi alterado:
-- 1. Adicionado campo total_vendas_ano_anterior no SELECT
-- 2. Usamos CASE WHEN para separar vendas do ano atual e ano anterior
-- 3. O LEFT JOIN agora inclui tanto ano atual quanto ano anterior
-- 4. A comparação permite visualizar crescimento mês a mês
