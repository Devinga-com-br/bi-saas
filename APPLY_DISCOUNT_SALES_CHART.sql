-- ================================================================
-- APLICAR DESCONTOS NO GRÁFICO DE VENDAS MENSAIS
-- ================================================================
-- Execute este script no Supabase SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_sales_by_month_chart(
  schema_name text,
  p_filiais text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result json;
  filial_filter TEXT;
BEGIN
  -- Construir filtro de filiais (sem alias, será usado em diferentes contextos)
  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    filial_filter := format('AND filial_id IN (%s)', p_filiais);
  ELSE
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
      ),
      vendas_ano_atual AS (
        SELECT
          EXTRACT(MONTH FROM data_venda)::INTEGER as mes_num,
          SUM(valor_total) as total_vendas
        FROM %I.vendas_diarias_por_filial
        WHERE EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
        %s
        GROUP BY EXTRACT(MONTH FROM data_venda)
      ),
      vendas_ano_anterior AS (
        SELECT
          EXTRACT(MONTH FROM data_venda)::INTEGER as mes_num,
          SUM(valor_total) as total_vendas
        FROM %I.vendas_diarias_por_filial
        WHERE EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
        %s
        GROUP BY EXTRACT(MONTH FROM data_venda)
      ),
      descontos_ano_atual AS (
        SELECT
          EXTRACT(MONTH FROM data_desconto)::INTEGER as mes_num,
          SUM(valor_desconto) as total_descontos
        FROM %I.descontos_venda
        WHERE EXTRACT(YEAR FROM data_desconto) = EXTRACT(YEAR FROM CURRENT_DATE)
        %s
        GROUP BY EXTRACT(MONTH FROM data_desconto)
      ),
      descontos_ano_anterior AS (
        SELECT
          EXTRACT(MONTH FROM data_desconto)::INTEGER as mes_num,
          SUM(valor_desconto) as total_descontos
        FROM %I.descontos_venda
        WHERE EXTRACT(YEAR FROM data_desconto) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
        %s
        GROUP BY EXTRACT(MONTH FROM data_desconto)
      )
      SELECT
        m.mes_nome AS mes,
        (COALESCE(va.total_vendas, 0) - COALESCE(da.total_descontos, 0))::numeric(15, 2) AS total_vendas,
        (COALESCE(vaa.total_vendas, 0) - COALESCE(daa.total_descontos, 0))::numeric(15, 2) AS total_vendas_ano_anterior
      FROM meses m
      LEFT JOIN vendas_ano_atual va ON m.mes_num = va.mes_num
      LEFT JOIN vendas_ano_anterior vaa ON m.mes_num = vaa.mes_num
      LEFT JOIN descontos_ano_atual da ON m.mes_num = da.mes_num
      LEFT JOIN descontos_ano_anterior daa ON m.mes_num = daa.mes_num
      ORDER BY m.mes_num
    ) t;
    $q$,
    schema_name,
    filial_filter,
    schema_name,
    filial_filter,
    schema_name,
    filial_filter,
    schema_name,
    filial_filter
  ) INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;

COMMENT ON FUNCTION public.get_sales_by_month_chart(text, text) IS
'Retorna vendas mensais por ano com descontos aplicados da tabela descontos_venda';

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- Teste manual (exemplo com schema saoluiz)
-- SELECT * FROM get_sales_by_month_chart('saoluiz', 'all');
