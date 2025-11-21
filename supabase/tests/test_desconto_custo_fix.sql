-- =====================================================
-- SCRIPT DE TESTE - Validação da Correção de Desconto Custo
-- Data: 2024-11-22
-- =====================================================

-- IMPORTANTE: Execute este script em ambiente de DESENVOLVIMENTO primeiro!

-- =====================================================
-- PREPARAÇÃO: Limpar dados de teste anteriores
-- =====================================================
DO $$
DECLARE
    v_schema_name TEXT := 'okilao'; -- Altere para o schema de teste
BEGIN
    -- Limpar descontos de teste anteriores
    EXECUTE format('
        DELETE FROM %I.descontos_venda
        WHERE observacao LIKE ''%%TESTE_DESCONTO_CUSTO%%''
    ', v_schema_name);

    RAISE NOTICE 'Dados de teste anteriores limpos';
END $$;

-- =====================================================
-- TESTE 1: Inserir dados de teste conhecidos
-- =====================================================
DO $$
DECLARE
    v_schema_name TEXT := 'okilao'; -- Altere para o schema de teste
    v_filial_test INTEGER := 1; -- ID da filial de teste
    v_data_test DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- Inserir desconto de teste
    EXECUTE format('
        INSERT INTO %I.descontos_venda (
            filial_id,
            data_desconto,
            valor_desconto,
            desconto_custo,
            observacao
        ) VALUES (
            %s,
            %L,
            1000.00,  -- Desconto sobre vendas
            600.00,   -- Desconto sobre custo
            ''TESTE_DESCONTO_CUSTO - Validação da correção''
        )
    ', v_schema_name, v_filial_test, v_data_test);

    RAISE NOTICE 'Desconto de teste inserido para filial % na data %', v_filial_test, v_data_test;
END $$;

-- =====================================================
-- TESTE 2: Validar cálculos com a função corrigida
-- =====================================================
DO $$
DECLARE
    v_schema_name TEXT := 'okilao'; -- Altere para o schema de teste
    v_data_inicio DATE := CURRENT_DATE - INTERVAL '7 days';
    v_data_fim DATE := CURRENT_DATE;

    -- Variáveis para armazenar resultados
    v_total_vendas NUMERIC;
    v_total_lucro NUMERIC;
    v_margem_lucro NUMERIC;

    -- Variáveis para validação manual
    v_vendas_sem_desconto NUMERIC;
    v_lucro_sem_desconto NUMERIC;
    v_desconto_venda_total NUMERIC;
    v_desconto_custo_total NUMERIC;

    v_vendas_esperadas NUMERIC;
    v_lucro_esperado NUMERIC;
    v_cmv_esperado NUMERIC;
BEGIN
    -- Buscar valores SEM desconto (direto da tabela)
    EXECUTE format('
        SELECT
            COALESCE(SUM(valor_total), 0),
            COALESCE(SUM(total_lucro), 0)
        FROM %I.vendas_diarias_por_filial
        WHERE data_venda BETWEEN %L AND %L
    ', v_schema_name, v_data_inicio, v_data_fim)
    INTO v_vendas_sem_desconto, v_lucro_sem_desconto;

    -- Buscar descontos do período
    EXECUTE format('
        SELECT
            COALESCE(SUM(valor_desconto), 0),
            COALESCE(SUM(desconto_custo), 0)
        FROM %I.descontos_venda
        WHERE data_desconto BETWEEN %L AND %L
    ', v_schema_name, v_data_inicio, v_data_fim)
    INTO v_desconto_venda_total, v_desconto_custo_total;

    -- Calcular valores esperados
    v_vendas_esperadas := v_vendas_sem_desconto - v_desconto_venda_total;
    v_lucro_esperado := v_lucro_sem_desconto - v_desconto_venda_total + v_desconto_custo_total;
    v_cmv_esperado := v_vendas_esperadas - v_lucro_esperado;

    -- Chamar a função get_dashboard_data
    SELECT total_vendas, total_lucro, margem_lucro
    INTO v_total_vendas, v_total_lucro, v_margem_lucro
    FROM get_dashboard_data(v_schema_name, v_data_inicio, v_data_fim, NULL);

    -- Exibir resultados
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESULTADOS DO TESTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Período: % a %', v_data_inicio, v_data_fim;
    RAISE NOTICE '';
    RAISE NOTICE 'VALORES ORIGINAIS (sem descontos):';
    RAISE NOTICE '  Vendas Brutas: R$ %', v_vendas_sem_desconto;
    RAISE NOTICE '  Lucro Bruto Original: R$ %', v_lucro_sem_desconto;
    RAISE NOTICE '';
    RAISE NOTICE 'DESCONTOS APLICADOS:';
    RAISE NOTICE '  Desconto sobre Vendas: R$ %', v_desconto_venda_total;
    RAISE NOTICE '  Desconto sobre Custo: R$ %', v_desconto_custo_total;
    RAISE NOTICE '';
    RAISE NOTICE 'VALORES ESPERADOS (cálculo manual):';
    RAISE NOTICE '  Receita Líquida: R$ % (% - %)', v_vendas_esperadas, v_vendas_sem_desconto, v_desconto_venda_total;
    RAISE NOTICE '  Lucro Bruto: R$ % (% - % + %)', v_lucro_esperado, v_lucro_sem_desconto, v_desconto_venda_total, v_desconto_custo_total;
    RAISE NOTICE '  CMV: R$ % (Receita Líq - Lucro Bruto)', v_cmv_esperado;
    RAISE NOTICE '';
    RAISE NOTICE 'VALORES RETORNADOS PELA FUNÇÃO:';
    RAISE NOTICE '  Receita (total_vendas): R$ %', v_total_vendas;
    RAISE NOTICE '  Lucro (total_lucro): R$ %', v_total_lucro;
    RAISE NOTICE '  Margem: %', v_margem_lucro;
    RAISE NOTICE '';

    -- Validação
    IF ABS(v_total_vendas - v_vendas_esperadas) < 0.01 AND
       ABS(v_total_lucro - v_lucro_esperado) < 0.01 THEN
        RAISE NOTICE '✅ TESTE PASSOU! Os valores estão corretos.';
    ELSE
        RAISE NOTICE '❌ TESTE FALHOU! Os valores não correspondem.';
        RAISE NOTICE '  Diferença em Vendas: R$ %', v_total_vendas - v_vendas_esperadas;
        RAISE NOTICE '  Diferença em Lucro: R$ %', v_total_lucro - v_lucro_esperado;
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- TESTE 3: Comparar com get_vendas_por_filial
-- =====================================================
DO $$
DECLARE
    v_schema_name TEXT := 'okilao'; -- Altere para o schema de teste
    v_data_inicio DATE := CURRENT_DATE - INTERVAL '7 days';
    v_data_fim DATE := CURRENT_DATE;

    v_dashboard_vendas NUMERIC;
    v_dashboard_lucro NUMERIC;
    v_vendas_filial_total NUMERIC;
    v_lucro_filial_total NUMERIC;
BEGIN
    -- Obter dados do dashboard
    SELECT total_vendas, total_lucro
    INTO v_dashboard_vendas, v_dashboard_lucro
    FROM get_dashboard_data(v_schema_name, v_data_inicio, v_data_fim, NULL);

    -- Obter dados de vendas por filial (soma de todas)
    EXECUTE format('
        SELECT
            COALESCE(SUM(valor_total), 0),
            COALESCE(SUM(total_lucro), 0)
        FROM get_vendas_por_filial(%L, %L, %L)
    ', v_schema_name, v_data_inicio, v_data_fim)
    INTO v_vendas_filial_total, v_lucro_filial_total;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPARAÇÃO ENTRE FUNÇÕES';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'get_dashboard_data:';
    RAISE NOTICE '  Vendas: R$ %', v_dashboard_vendas;
    RAISE NOTICE '  Lucro: R$ %', v_dashboard_lucro;
    RAISE NOTICE '';
    RAISE NOTICE 'get_vendas_por_filial (soma):';
    RAISE NOTICE '  Vendas: R$ %', v_vendas_filial_total;
    RAISE NOTICE '  Lucro: R$ %', v_lucro_filial_total;
    RAISE NOTICE '';

    IF ABS(v_dashboard_vendas - v_vendas_filial_total) < 0.01 AND
       ABS(v_dashboard_lucro - v_lucro_filial_total) < 0.01 THEN
        RAISE NOTICE '✅ Valores consistentes entre as funções!';
    ELSE
        RAISE NOTICE '⚠️  AVISO: Diferença entre as funções';
        RAISE NOTICE '  Diferença Vendas: R$ %', v_dashboard_vendas - v_vendas_filial_total;
        RAISE NOTICE '  Diferença Lucro: R$ %', v_dashboard_lucro - v_lucro_filial_total;
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- LIMPEZA: Remover dados de teste
-- =====================================================
DO $$
DECLARE
    v_schema_name TEXT := 'okilao'; -- Altere para o schema de teste
BEGIN
    -- Limpar descontos de teste
    EXECUTE format('
        DELETE FROM %I.descontos_venda
        WHERE observacao LIKE ''%%TESTE_DESCONTO_CUSTO%%''
    ', v_schema_name);

    RAISE NOTICE 'Dados de teste removidos';
END $$;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
/*
1. ANTES DE EXECUTAR:
   - Altere v_schema_name para o schema que deseja testar
   - Certifique-se de ter dados de vendas no período de teste
   - Execute em ambiente de DESENVOLVIMENTO primeiro

2. INTERPRETAÇÃO DOS RESULTADOS:
   - ✅ TESTE PASSOU: A correção está funcionando corretamente
   - ❌ TESTE FALHOU: Há problemas no cálculo, revise a função

3. FÓRMULAS CORRETAS:
   - Receita Líquida = Receita Bruta - valor_desconto
   - CMV Ajustado = CMV Original - desconto_custo
   - Lucro Bruto = Receita Líquida - CMV Ajustado
   - Ou: Lucro Bruto = Lucro Original - valor_desconto + desconto_custo

4. VALIDAÇÃO ADICIONAL:
   - Compare os resultados no Dashboard da aplicação
   - Verifique o DRE Gerencial
   - Confirme que as margens de lucro fazem sentido
*/