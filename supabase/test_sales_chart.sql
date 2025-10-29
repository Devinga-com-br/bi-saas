-- Script de teste para verificar se o gráfico de vendas retorna todos os 12 meses
-- Execute este script no Supabase SQL Editor

-- 1. Testar a função get_sales_by_month_chart
-- Substitua 'okilao' pelo schema do seu tenant
SELECT * FROM jsonb_array_elements(
  get_sales_by_month_chart('okilao', 'all')::jsonb
);

-- 2. Verificar quantos registros retornam
SELECT
  jsonb_array_length(get_sales_by_month_chart('okilao', 'all')::jsonb) as total_meses;

-- 3. Ver os dados formatados
SELECT
  elem->>'mes' as mes,
  (elem->>'total_vendas')::numeric as vendas,
  (elem->>'total_vendas_ano_anterior')::numeric as vendas_ano_anterior
FROM jsonb_array_elements(
  get_sales_by_month_chart('okilao', 'all')::jsonb
) as elem
ORDER BY
  CASE elem->>'mes'
    WHEN 'Jan' THEN 1
    WHEN 'Fev' THEN 2
    WHEN 'Mar' THEN 3
    WHEN 'Abr' THEN 4
    WHEN 'Mai' THEN 5
    WHEN 'Jun' THEN 6
    WHEN 'Jul' THEN 7
    WHEN 'Ago' THEN 8
    WHEN 'Set' THEN 9
    WHEN 'Out' THEN 10
    WHEN 'Nov' THEN 11
    WHEN 'Dez' THEN 12
  END;

-- 4. Testar a função de despesas
SELECT * FROM jsonb_array_elements(
  (SELECT json_agg(t)::jsonb FROM get_expenses_by_month_chart('okilao', 'all') t)
);

-- 5. Verificar se existem vendas nos meses de Nov e Dez
SELECT
  EXTRACT(MONTH FROM data_venda) as mes,
  COUNT(*) as qtd_registros,
  SUM(valor_total) as total_vendas
FROM okilao.vendas_diarias_por_filial
WHERE EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM data_venda) IN (11, 12)
GROUP BY EXTRACT(MONTH FROM data_venda)
ORDER BY mes;
