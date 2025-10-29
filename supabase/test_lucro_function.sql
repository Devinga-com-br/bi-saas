-- Script de teste para a função get_lucro_by_month_chart
-- Execute este script no Supabase SQL Editor DEPOIS de criar a função

-- 1. Testar se a função retorna todos os 12 meses
SELECT
  elem->>'mes' as mes,
  (elem->>'total_lucro')::numeric as lucro_2025,
  (elem->>'total_lucro_ano_anterior')::numeric as lucro_2024
FROM jsonb_array_elements(
  get_lucro_by_month_chart('okilao', 'all')::jsonb
) as elem
ORDER BY
  CASE elem->>'mes'
    WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3
    WHEN 'Abr' THEN 4 WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6
    WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8 WHEN 'Set' THEN 9
    WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
  END;

-- 2. Verificar dados brutos da tabela vendas_diarias_por_filial
SELECT
  EXTRACT(MONTH FROM data_venda) as mes_num,
  TO_CHAR(data_venda, 'Mon') as mes,
  EXTRACT(YEAR FROM data_venda) as ano,
  COUNT(*) as qtd_registros,
  SUM(total_lucro) as soma_lucro,
  SUM(valor_total) as total_vendas,
  SUM(custo_total) as total_custos
FROM okilao.vendas_diarias_por_filial
WHERE EXTRACT(YEAR FROM data_venda) IN (2024, 2025)
GROUP BY EXTRACT(MONTH FROM data_venda), TO_CHAR(data_venda, 'Mon'), EXTRACT(YEAR FROM data_venda)
ORDER BY ano DESC, mes_num;

-- 3. Comparar vendas, despesas e lucro lado a lado
WITH vendas_data AS (
  SELECT
    elem->>'mes' as mes,
    (elem->>'total_vendas')::numeric as vendas
  FROM jsonb_array_elements(
    get_sales_by_month_chart('okilao', 'all')::jsonb
  ) as elem
),
despesas_data AS (
  SELECT
    mes,
    total_despesas as despesas
  FROM get_expenses_by_month_chart('okilao', 'all')
),
lucro_data AS (
  SELECT
    elem->>'mes' as mes,
    (elem->>'total_lucro')::numeric as lucro
  FROM jsonb_array_elements(
    get_lucro_by_month_chart('okilao', 'all')::jsonb
  ) as elem
)
SELECT
  v.mes,
  v.vendas,
  COALESCE(d.despesas, 0) as despesas,
  COALESCE(l.lucro, 0) as lucro,
  -- Verificar se o cálculo bate: lucro deveria ser diferente de (vendas - despesas)
  -- porque lucro vem do campo 'lucro' da tabela que é (valor_total - custo_total)
  v.vendas - COALESCE(d.despesas, 0) as calculo_vendas_menos_despesas,
  COALESCE(l.lucro, 0) - (v.vendas - COALESCE(d.despesas, 0)) as diferenca
FROM vendas_data v
LEFT JOIN despesas_data d ON v.mes = d.mes
LEFT JOIN lucro_data l ON v.mes = l.mes
ORDER BY
  CASE v.mes
    WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3
    WHEN 'Abr' THEN 4 WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6
    WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8 WHEN 'Set' THEN 9
    WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
  END;
