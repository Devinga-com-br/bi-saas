-- Script para testar após aplicar o fix dos nomes dos meses
-- Execute este script DEPOIS de rodar fix_expenses_month_names.sql

-- 1. Testar se os meses estão em português agora
SELECT
  mes,
  total_despesas as despesas_2025
FROM get_expenses_by_month_chart('okilao', 'all')
ORDER BY
  CASE mes
    WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3
    WHEN 'Abr' THEN 4 WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6
    WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8 WHEN 'Set' THEN 9
    WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
  END;

-- 2. Verificar se agora o merge funciona corretamente
-- Simular o que a API faz
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
)
SELECT
  v.mes,
  v.vendas,
  COALESCE(d.despesas, 0) as despesas,
  CASE
    WHEN d.despesas IS NULL THEN '❌ NÃO ENCONTROU'
    WHEN d.despesas = 0 THEN '✓ Encontrou (zero)'
    ELSE '✓ Encontrou'
  END as status_merge
FROM vendas_data v
LEFT JOIN despesas_data d ON v.mes = d.mes
ORDER BY
  CASE v.mes
    WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3
    WHEN 'Abr' THEN 4 WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6
    WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8 WHEN 'Set' THEN 9
    WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
  END;
