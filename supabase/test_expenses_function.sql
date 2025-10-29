-- Script de teste para verificar se a função de despesas está funcionando

-- 1. Verificar se a função existe
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_expenses_by_month_chart';

-- 2. Testar a função com o schema okilao
SELECT * FROM public.get_expenses_by_month_chart('okilao', 'all');

-- 3. Verificar se existem despesas na tabela
SELECT
    EXTRACT(YEAR FROM data_emissao) as ano,
    EXTRACT(MONTH FROM data_emissao) as mes,
    COUNT(*) as qtd_registros,
    SUM(valor) as total
FROM okilao.despesas
WHERE EXTRACT(YEAR FROM data_emissao) IN (2024, 2025)
GROUP BY EXTRACT(YEAR FROM data_emissao), EXTRACT(MONTH FROM data_emissao)
ORDER BY ano DESC, mes DESC;

-- 4. Comparar com vendas (para ver se as duas funções retornam dados)
SELECT 'VENDAS' as tipo, * FROM public.get_sales_by_month_chart('okilao', 'all')
UNION ALL
SELECT 'DESPESAS' as tipo, mes, total_despesas, total_despesas_ano_anterior
FROM public.get_expenses_by_month_chart('okilao', 'all')
ORDER BY tipo, mes;
