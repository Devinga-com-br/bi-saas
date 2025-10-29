-- Script de teste completo para verificar vendas e despesas no gráfico
-- Execute este script no Supabase SQL Editor
-- IMPORTANTE: Substitua 'okilao' pelo schema do seu tenant

-- =====================================================
-- 1. TESTAR FUNÇÃO DE VENDAS
-- =====================================================
SELECT
  elem->>'mes' as mes,
  (elem->>'total_vendas')::numeric as vendas_2025,
  (elem->>'total_vendas_ano_anterior')::numeric as vendas_2024
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

-- =====================================================
-- 2. TESTAR FUNÇÃO DE DESPESAS
-- =====================================================
SELECT
  mes,
  total_despesas as despesas_2025,
  total_despesas_ano_anterior as despesas_2024
FROM get_expenses_by_month_chart('okilao', 'all')
ORDER BY
  CASE mes
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

-- =====================================================
-- 3. DADOS CONSOLIDADOS (VENDAS + DESPESAS)
-- =====================================================
WITH vendas_data AS (
  SELECT
    elem->>'mes' as mes,
    (elem->>'total_vendas')::numeric as vendas_2025,
    (elem->>'total_vendas_ano_anterior')::numeric as vendas_2024,
    CASE elem->>'mes'
      WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3
      WHEN 'Abr' THEN 4 WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6
      WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8 WHEN 'Set' THEN 9
      WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
    END as mes_num
  FROM jsonb_array_elements(
    get_sales_by_month_chart('okilao', 'all')::jsonb
  ) as elem
),
despesas_data AS (
  SELECT
    mes,
    total_despesas as despesas_2025,
    total_despesas_ano_anterior as despesas_2024,
    CASE mes
      WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3
      WHEN 'Abr' THEN 4 WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6
      WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8 WHEN 'Set' THEN 9
      WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
    END as mes_num
  FROM get_expenses_by_month_chart('okilao', 'all')
)
SELECT
  v.mes,
  v.vendas_2025,
  COALESCE(d.despesas_2025, 0) as despesas_2025,
  v.vendas_2024,
  COALESCE(d.despesas_2024, 0) as despesas_2024,
  -- Calcular lucro (vendas - despesas)
  v.vendas_2025 - COALESCE(d.despesas_2025, 0) as lucro_2025,
  v.vendas_2024 - COALESCE(d.despesas_2024, 0) as lucro_2024
FROM vendas_data v
LEFT JOIN despesas_data d ON v.mes = d.mes
ORDER BY v.mes_num;

-- =====================================================
-- 4. VERIFICAR DADOS BRUTOS DE DESPESAS NA TABELA
-- =====================================================
SELECT
  EXTRACT(MONTH FROM data_emissao) as mes_num,
  TO_CHAR(data_emissao, 'Mon') as mes,
  EXTRACT(YEAR FROM data_emissao) as ano,
  COUNT(*) as qtd_registros,
  SUM(valor) as total_despesas
FROM okilao.despesas
WHERE EXTRACT(YEAR FROM data_emissao) IN (2024, 2025)
GROUP BY EXTRACT(MONTH FROM data_emissao), TO_CHAR(data_emissao, 'Mon'), EXTRACT(YEAR FROM data_emissao)
ORDER BY ano DESC, mes_num;

-- =====================================================
-- 5. CONTAR REGISTROS
-- =====================================================
SELECT
  'Vendas' as tipo,
  jsonb_array_length(get_sales_by_month_chart('okilao', 'all')::jsonb) as total_registros
UNION ALL
SELECT
  'Despesas' as tipo,
  COUNT(*)::int as total_registros
FROM get_expenses_by_month_chart('okilao', 'all');

-- =====================================================
-- 6. VERIFICAR SE A FUNÇÃO DE DESPESAS EXISTE
-- =====================================================
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_expenses_by_month_chart';
