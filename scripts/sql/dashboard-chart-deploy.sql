-- Deploy: funcoes dinamicas (ano/mes/periodo), mantendo desconto_vendas

-- Remove assinaturas antigas para evitar ambiguidade
DROP FUNCTION IF EXISTS public.get_sales_by_month_chart(text);
DROP FUNCTION IF EXISTS public.get_sales_by_month_chart(text, text);
DROP FUNCTION IF EXISTS public.get_expenses_by_month_chart(text, text);
DROP FUNCTION IF EXISTS public.get_lucro_by_month_chart(text, text);
DROP FUNCTION IF EXISTS public.get_faturamento_by_month_chart(text, text);

CREATE OR REPLACE FUNCTION public.get_sales_by_month_chart(
  schema_name text,
  p_filiais text,
  p_data_inicio date,
  p_data_fim date,
  p_filter_type text
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
  filial_filter text := '';
  v_filter_type text := coalesce(p_filter_type, 'year');
  v_start date;
  v_end date;
  v_prev_start date;
  v_prev_end date;
BEGIN
  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    v_start := make_date(extract(year from current_date)::int, 1, 1);
    v_end := make_date(extract(year from current_date)::int, 12, 31);
    v_filter_type := 'year';
  ELSE
    IF v_filter_type = 'year' THEN
      v_start := make_date(extract(year from p_data_inicio)::int, 1, 1);
      v_end := make_date(extract(year from p_data_inicio)::int, 12, 31);
    ELSIF v_filter_type = 'month' THEN
      v_start := p_data_inicio;
      v_end := p_data_fim;
    ELSE
      v_start := date_trunc('month', p_data_inicio)::date;
      v_end := (date_trunc('month', p_data_fim) + interval '1 month - 1 day')::date;
    END IF;
  END IF;

  v_prev_start := (v_start - interval '1 year')::date;
  v_prev_end := (v_end - interval '1 year')::date;

  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    filial_filter := format('and filial_id in (%s)', p_filiais);
  END IF;

  EXECUTE format($q$
    with
    periods as (
      select
        gs::date as period_date,
        case
          when $1 = 'month' then to_char(gs, 'DD')
          when $1 = 'custom' then (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int] || '/' || extract(year from gs)::int
          else (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int]
        end as mes
      from generate_series(
        $2::date,
        $3::date,
        case when $1 = 'month' then interval '1 day' else interval '1 month' end
      ) gs
    ),
    sales_current as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_venda)::date as period_date,
        sum(valor_total) as total_vendas
      from %I.vendas_diarias_por_filial
      where data_venda between $2 and $3
      %s
      group by 1
    ),
    sales_prev as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_venda)::date as period_date,
        sum(valor_total) as total_vendas
      from %I.vendas_diarias_por_filial
      where data_venda between $4 and $5
      %s
      group by 1
    ),
    descontos_current as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_desconto)::date as period_date,
        sum(valor_desconto) as total_descontos
      from %I.descontos_venda
      where data_desconto between $2 and $3
      %s
      group by 1
    ),
    descontos_prev as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_desconto)::date as period_date,
        sum(valor_desconto) as total_descontos
      from %I.descontos_venda
      where data_desconto between $4 and $5
      %s
      group by 1
    )
    select json_agg(t)
    from (
      select
        p.mes,
        (coalesce(sc.total_vendas, 0) - coalesce(dc.total_descontos, 0))::numeric(15,2) as total_vendas,
        (coalesce(sp.total_vendas, 0) - coalesce(dp.total_descontos, 0))::numeric(15,2) as total_vendas_ano_anterior
      from periods p
      left join sales_current sc on sc.period_date = p.period_date
      left join descontos_current dc on dc.period_date = p.period_date
      left join sales_prev sp on sp.period_date = (p.period_date - interval '1 year')::date
      left join descontos_prev dp on dp.period_date = (p.period_date - interval '1 year')::date
      order by p.period_date
    ) t
  $q$,
    schema_name, filial_filter,
    schema_name, filial_filter,
    schema_name, filial_filter,
    schema_name, filial_filter
  )
  INTO result
  USING v_filter_type, v_start, v_end, v_prev_start, v_prev_end;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expenses_by_month_chart(
  schema_name text,
  p_filiais text,
  p_data_inicio date,
  p_data_fim date,
  p_filter_type text
) RETURNS table (
  mes text,
  total_despesas numeric,
  total_despesas_ano_anterior numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_query text;
  v_filter_type text := coalesce(p_filter_type, 'year');
  v_start date;
  v_end date;
  v_prev_start date;
  v_prev_end date;
  v_where_clause text := '';
BEGIN
  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    v_start := make_date(extract(year from current_date)::int, 1, 1);
    v_end := make_date(extract(year from current_date)::int, 12, 31);
    v_filter_type := 'year';
  ELSE
    IF v_filter_type = 'year' THEN
      v_start := make_date(extract(year from p_data_inicio)::int, 1, 1);
      v_end := make_date(extract(year from p_data_inicio)::int, 12, 31);
    ELSIF v_filter_type = 'month' THEN
      v_start := p_data_inicio;
      v_end := p_data_fim;
    ELSE
      v_start := date_trunc('month', p_data_inicio)::date;
      v_end := (date_trunc('month', p_data_fim) + interval '1 month - 1 day')::date;
    END IF;
  END IF;

  v_prev_start := (v_start - interval '1 year')::date;
  v_prev_end := (v_end - interval '1 year')::date;

  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    v_where_clause := format('and d.filial_id in (%s)', p_filiais);
  END IF;

  v_query := format($fmt$
    with
    periods as (
      select
        gs::date as period_date,
        case
          when $1 = 'month' then to_char(gs, 'DD')
          when $1 = 'custom' then (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int] || '/' || extract(year from gs)::int
          else (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int]
        end as mes
      from generate_series(
        $2::date,
        $3::date,
        case when $1 = 'month' then interval '1 day' else interval '1 month' end
      ) gs
    ),
    despesas_atual as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, d.data_despesa)::date as period_date,
        coalesce(sum(d.valor), 0) as total
      from %I.despesas d
      where d.data_despesa between $2 and $3
        and d.data_despesa is not null
        and d.valor is not null
        %s
      group by 1
    ),
    despesas_anterior as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, d.data_despesa)::date as period_date,
        coalesce(sum(d.valor), 0) as total
      from %I.despesas d
      where d.data_despesa between $4 and $5
        and d.data_despesa is not null
        and d.valor is not null
        %s
      group by 1
    )
    select
      p.mes,
      coalesce(da.total, 0) as total_despesas,
      coalesce(daa.total, 0) as total_despesas_ano_anterior
    from periods p
    left join despesas_atual da on da.period_date = p.period_date
    left join despesas_anterior daa on daa.period_date = (p.period_date - interval '1 year')::date
    order by p.period_date
  $fmt$,
    schema_name, v_where_clause,
    schema_name, v_where_clause
  );

  return query execute v_query using v_filter_type, v_start, v_end, v_prev_start, v_prev_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lucro_by_month_chart(
  schema_name text,
  p_filiais text,
  p_data_inicio date,
  p_data_fim date,
  p_filter_type text
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
  filial_filter text := '';
  v_filter_type text := coalesce(p_filter_type, 'year');
  v_start date;
  v_end date;
  v_prev_start date;
  v_prev_end date;
BEGIN
  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    v_start := make_date(extract(year from current_date)::int, 1, 1);
    v_end := make_date(extract(year from current_date)::int, 12, 31);
    v_filter_type := 'year';
  ELSE
    IF v_filter_type = 'year' THEN
      v_start := make_date(extract(year from p_data_inicio)::int, 1, 1);
      v_end := make_date(extract(year from p_data_inicio)::int, 12, 31);
    ELSIF v_filter_type = 'month' THEN
      v_start := p_data_inicio;
      v_end := p_data_fim;
    ELSE
      v_start := date_trunc('month', p_data_inicio)::date;
      v_end := (date_trunc('month', p_data_fim) + interval '1 month - 1 day')::date;
    END IF;
  END IF;

  v_prev_start := (v_start - interval '1 year')::date;
  v_prev_end := (v_end - interval '1 year')::date;

  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    filial_filter := format('and vdf.filial_id in (%s)', p_filiais);
  END IF;

  execute format($q$
    with
    periods as (
      select
        gs::date as period_date,
        case
          when $1 = 'month' then to_char(gs, 'DD')
          when $1 = 'custom' then (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int] || '/' || extract(year from gs)::int
          else (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int]
        end as mes
      from generate_series(
        $2::date,
        $3::date,
        case when $1 = 'month' then interval '1 day' else interval '1 month' end
      ) gs
    ),
    lucro_atual as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, vdf.data_venda)::date as period_date,
        coalesce(sum(vdf.total_lucro), 0) as total
      from %I.vendas_diarias_por_filial vdf
      where vdf.data_venda between $2 and $3
      %s
      group by 1
    ),
    lucro_anterior as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, vdf.data_venda)::date as period_date,
        coalesce(sum(vdf.total_lucro), 0) as total
      from %I.vendas_diarias_por_filial vdf
      where vdf.data_venda between $4 and $5
      %s
      group by 1
    )
    select json_agg(t)
    from (
      select
        p.mes,
        coalesce(la.total, 0)::numeric(15,2) as total_lucro,
        coalesce(lb.total, 0)::numeric(15,2) as total_lucro_ano_anterior
      from periods p
      left join lucro_atual la on la.period_date = p.period_date
      left join lucro_anterior lb on lb.period_date = (p.period_date - interval '1 year')::date
      order by p.period_date
    ) t
  $q$,
    schema_name, filial_filter,
    schema_name, filial_filter
  )
  into result
  using v_filter_type, v_start, v_end, v_prev_start, v_prev_end;

  return coalesce(result, '[]'::json);
end;
$$;

CREATE OR REPLACE FUNCTION public.get_faturamento_by_month_chart(
  schema_name text,
  p_filiais text,
  p_data_inicio date,
  p_data_fim date,
  p_filter_type text
) RETURNS table (
  mes text,
  total_faturamento numeric,
  total_faturamento_ano_anterior numeric,
  total_lucro_faturamento numeric,
  total_lucro_faturamento_ano_anterior numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_filiais_array int[];
  v_table_exists boolean;
  v_filter_type text := coalesce(p_filter_type, 'year');
  v_start date;
  v_end date;
  v_prev_start date;
  v_prev_end date;
BEGIN
  execute format(
    'select exists (
       select 1 from information_schema.tables
       where table_schema = %L and table_name = ''faturamento''
     )', schema_name
  ) into v_table_exists;

  if not v_table_exists then
    return query
    select
      m.mes::text,
      0::numeric as total_faturamento,
      0::numeric as total_faturamento_ano_anterior,
      0::numeric as total_lucro_faturamento,
      0::numeric as total_lucro_faturamento_ano_anterior
    from (
      select unnest(array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']) as mes
    ) m;
    return;
  end if;

  if p_filiais is null or p_filiais = 'all' or p_filiais = '' then
    v_filiais_array := null;
  else
    v_filiais_array := string_to_array(p_filiais, ',')::int[];
  end if;

  if p_data_inicio is null or p_data_fim is null then
    v_start := make_date(extract(year from current_date)::int, 1, 1);
    v_end := make_date(extract(year from current_date)::int, 12, 31);
    v_filter_type := 'year';
  else
    if v_filter_type = 'year' then
      v_start := make_date(extract(year from p_data_inicio)::int, 1, 1);
      v_end := make_date(extract(year from p_data_inicio)::int, 12, 31);
    elsif v_filter_type = 'month' then
      v_start := p_data_inicio;
      v_end := p_data_fim;
    else
      v_start := date_trunc('month', p_data_inicio)::date;
      v_end := (date_trunc('month', p_data_fim) + interval '1 month - 1 day')::date;
    end if;
  end if;

  v_prev_start := (v_start - interval '1 year')::date;
  v_prev_end := (v_end - interval '1 year')::date;

  return query execute format($q$
    with
    periods as (
      select
        gs::date as period_date,
        case
          when $1 = 'month' then to_char(gs, 'DD')
          when $1 = 'custom' then (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int] || '/' || extract(year from gs)::int
          else (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from gs)::int]
        end as mes
      from generate_series(
        $2::date,
        $3::date,
        case when $1 = 'month' then interval '1 day' else interval '1 month' end
      ) gs
    ),
    receita_atual as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_saida)::date as period_date,
        sum(valor_contabil) as receita
      from (
        select distinct on (id_saida, date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_saida))
          id_saida, data_saida, valor_contabil
        from %I.faturamento
        where data_saida between $2 and $3
          and (cancelado is null or cancelado = '' or cancelado = ' ')
          and ($4::int[] is null or filial_id = any($4))
      ) notas
      group by 1
    ),
    cmv_atual as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_saida)::date as period_date,
        sum(quantidade * custo_medio) as cmv
      from %I.faturamento
      where data_saida between $2 and $3
        and (cancelado is null or cancelado = '' or cancelado = ' ')
        and ($4::int[] is null or filial_id = any($4))
      group by 1
    ),
    receita_anterior as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_saida)::date as period_date,
        sum(valor_contabil) as receita
      from (
        select distinct on (id_saida, date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_saida))
          id_saida, data_saida, valor_contabil
        from %I.faturamento
        where data_saida between $5 and $6
          and (cancelado is null or cancelado = '' or cancelado = ' ')
          and ($4::int[] is null or filial_id = any($4))
      ) notas
      group by 1
    ),
    cmv_anterior as (
      select
        date_trunc(case when $1 = 'month' then 'day' else 'month' end, data_saida)::date as period_date,
        sum(quantidade * custo_medio) as cmv
      from %I.faturamento
      where data_saida between $5 and $6
        and (cancelado is null or cancelado = '' or cancelado = ' ')
        and ($4::int[] is null or filial_id = any($4))
      group by 1
    )
    select
      p.mes,
      coalesce(ra.receita, 0)::numeric as total_faturamento,
      coalesce(rant.receita, 0)::numeric as total_faturamento_ano_anterior,
      coalesce(ra.receita - ca.cmv, 0)::numeric as total_lucro_faturamento,
      coalesce(rant.receita - cant.cmv, 0)::numeric as total_lucro_faturamento_ano_anterior
    from periods p
    left join receita_atual ra on ra.period_date = p.period_date
    left join cmv_atual ca on ca.period_date = p.period_date
    left join receita_anterior rant on rant.period_date = (p.period_date - interval '1 year')::date
    left join cmv_anterior cant on cant.period_date = (p.period_date - interval '1 year')::date
    order by p.period_date
  $q$,
    schema_name, schema_name, schema_name, schema_name
  )
  using v_filter_type, v_start, v_end, v_filiais_array, v_prev_start, v_prev_end;
end;
$$;
