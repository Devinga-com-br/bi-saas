-- Rollback para restaurar o comportamento atual (Ano Atual fixo)

create or replace function public.get_expenses_by_month_chart(
  schema_name text,
  p_filiais text
) returns table (
  mes text,
  total_despesas numeric,
  total_despesas_ano_anterior numeric
)
language plpgsql
as $$
DECLARE
  v_query TEXT;
  v_where_clause TEXT := '';
  v_year_atual INT;
  v_year_anterior INT;
BEGIN
  v_year_atual := EXTRACT(YEAR FROM CURRENT_DATE);
  v_year_anterior := v_year_atual - 1;

  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    v_where_clause := format('AND d.filial_id IN (%s)', p_filiais);
  END IF;

  v_query := format($fmt$
    WITH meses_abreviados AS (
      SELECT
        unnest(ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]) as mes_num,
        unnest(ARRAY['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']) as mes_abrev
    ),
    despesas_ano_atual AS (
      SELECT
        EXTRACT(MONTH FROM d.data_despesa)::integer as mes_num,
        COALESCE(SUM(d.valor), 0) as total
      FROM %I.despesas d
      WHERE EXTRACT(YEAR FROM d.data_despesa) = %s
        AND d.data_despesa IS NOT NULL
        AND d.valor IS NOT NULL
        %s
      GROUP BY EXTRACT(MONTH FROM d.data_despesa)
    ),
    despesas_ano_anterior AS (
      SELECT
        EXTRACT(MONTH FROM d.data_despesa)::integer as mes_num,
        COALESCE(SUM(d.valor), 0) as total
      FROM %I.despesas d
      WHERE EXTRACT(YEAR FROM d.data_despesa) = %s
        AND d.data_despesa IS NOT NULL
        AND d.valor IS NOT NULL
        %s
      GROUP BY EXTRACT(MONTH FROM d.data_despesa)
    )
    SELECT
      ma.mes_abrev as mes,
      COALESCE(da.total, 0) as total_despesas,
      COALESCE(daa.total, 0) as total_despesas_ano_anterior
    FROM meses_abreviados ma
    LEFT JOIN despesas_ano_atual da ON ma.mes_num = da.mes_num
    LEFT JOIN despesas_ano_anterior daa ON ma.mes_num = daa.mes_num
    ORDER BY ma.mes_num
  $fmt$,
    schema_name,
    v_year_atual,
    v_where_clause,
    schema_name,
    v_year_anterior,
    v_where_clause
  );

  RETURN QUERY EXECUTE v_query;
END;
$$;

create or replace function public.get_faturamento_by_month_chart(
  schema_name text,
  p_filiais text
) returns table (
  mes text,
  total_faturamento numeric,
  total_faturamento_ano_anterior numeric,
  total_lucro_faturamento numeric,
  total_lucro_faturamento_ano_anterior numeric
)
language plpgsql
as $$
DECLARE
  v_filiais_array TEXT[];
  v_table_exists BOOLEAN;
  v_current_year INTEGER;
  v_previous_year INTEGER;
BEGIN
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''faturamento''
    )', schema_name) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RETURN QUERY
    SELECT
      m.mes::TEXT,
      0::NUMERIC as total_faturamento,
      0::NUMERIC as total_faturamento_ano_anterior,
      0::NUMERIC as total_lucro_faturamento,
      0::NUMERIC as total_lucro_faturamento_ano_anterior
    FROM (
      SELECT unnest(ARRAY['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']) as mes
    ) m;
    RETURN;
  END IF;

  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_previous_year := v_current_year - 1;

  IF p_filiais IS NULL OR p_filiais = 'all' OR p_filiais = '' THEN
    v_filiais_array := NULL;
  ELSE
    v_filiais_array := string_to_array(p_filiais, ',');
  END IF;

  RETURN QUERY EXECUTE format('
    WITH meses AS (
      SELECT 1 as num, ''Jan'' as nome UNION ALL
      SELECT 2, ''Fev'' UNION ALL
      SELECT 3, ''Mar'' UNION ALL
      SELECT 4, ''Abr'' UNION ALL
      SELECT 5, ''Mai'' UNION ALL
      SELECT 6, ''Jun'' UNION ALL
      SELECT 7, ''Jul'' UNION ALL
      SELECT 8, ''Ago'' UNION ALL
      SELECT 9, ''Set'' UNION ALL
      SELECT 10, ''Out'' UNION ALL
      SELECT 11, ''Nov'' UNION ALL
      SELECT 12, ''Dez''
    ),
    faturamento_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(valor_contabil) as receita,
        SUM(quantidade * custo_medio) as cmv
      FROM (
        SELECT DISTINCT ON (id_saida, EXTRACT(MONTH FROM data_saida))
          id_saida,
          data_saida,
          valor_contabil,
          quantidade,
          custo_medio
        FROM %I.faturamento
        WHERE EXTRACT(YEAR FROM data_saida) = $1
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      ) notas
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    cmv_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(quantidade * custo_medio) as cmv
      FROM %I.faturamento
      WHERE EXTRACT(YEAR FROM data_saida) = $1
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    receita_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(valor_contabil) as receita
      FROM (
        SELECT DISTINCT ON (id_saida)
          id_saida,
          data_saida,
          valor_contabil
        FROM %I.faturamento
        WHERE EXTRACT(YEAR FROM data_saida) = $1
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      ) notas
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    cmv_anterior AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(quantidade * custo_medio) as cmv
      FROM %I.faturamento
      WHERE EXTRACT(YEAR FROM data_saida) = $3
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    receita_anterior AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(valor_contabil) as receita
      FROM (
        SELECT DISTINCT ON (id_saida)
          id_saida,
          data_saida,
          valor_contabil
        FROM %I.faturamento
        WHERE EXTRACT(YEAR FROM data_saida) = $3
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      ) notas
      GROUP BY EXTRACT(MONTH FROM data_saida)
    )
    SELECT
      m.nome::TEXT as mes,
      COALESCE(ra.receita, 0)::NUMERIC as total_faturamento,
      COALESCE(rant.receita, 0)::NUMERIC as total_faturamento_ano_anterior,
      COALESCE(ra.receita - ca.cmv, 0)::NUMERIC as total_lucro_faturamento,
      COALESCE(rant.receita - cant.cmv, 0)::NUMERIC as total_lucro_faturamento_ano_anterior
    FROM meses m
    LEFT JOIN receita_atual ra ON ra.mes_num = m.num
    LEFT JOIN cmv_atual ca ON ca.mes_num = m.num
    LEFT JOIN receita_anterior rant ON rant.mes_num = m.num
    LEFT JOIN cmv_anterior cant ON cant.mes_num = m.num
    ORDER BY m.num
  ', schema_name, schema_name, schema_name, schema_name, schema_name)
  USING v_current_year, v_filiais_array, v_previous_year;
END;
$$;

create or replace function public.get_lucro_by_month_chart(
  schema_name text,
  p_filiais text
) returns json
language plpgsql
as $$
DECLARE
  result json;
  filial_filter TEXT;
BEGIN
  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    filial_filter := format('AND vdf.filial_id IN (%s)', p_filiais);
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

create or replace function public.get_sales_by_month_chart(
  schema_name text
) returns json
language plpgsql
as $$
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

create or replace function public.get_sales_by_month_chart(
  schema_name text,
  p_filiais text
) returns json
language plpgsql
as $$
DECLARE
  result json;
  filial_filter TEXT;
BEGIN
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
$$;
