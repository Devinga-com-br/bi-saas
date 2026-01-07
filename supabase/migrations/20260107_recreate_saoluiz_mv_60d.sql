-- ============================================================================
-- Recriar MV vendas_agregadas_60d para SAOLUIZ
-- ============================================================================
-- Data: 2026-01-07
-- Problema: MV pode não ter a coluna total_quantidade_produto
-- Solução: Recriar MV com estrutura correta (detecta nome da coluna)
-- ============================================================================

-- ============================================================================
-- DIAGNÓSTICO: Verificar estrutura da tabela vendas
-- ============================================================================
DO $$
DECLARE
  v_has_quantidade boolean;
  v_has_qtd boolean;
  v_has_qtde boolean;
  v_column_name text;
BEGIN
  -- Verificar possíveis nomes da coluna de quantidade
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'quantidade'
  ) INTO v_has_quantidade;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtd'
  ) INTO v_has_qtd;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtde'
  ) INTO v_has_qtde;
  
  IF v_has_quantidade THEN
    v_column_name := 'quantidade';
  ELSIF v_has_qtd THEN
    v_column_name := 'qtd';
  ELSIF v_has_qtde THEN
    v_column_name := 'qtde';
  ELSE
    RAISE EXCEPTION 'Tabela saoluiz.vendas não possui coluna de quantidade (tentou: quantidade, qtd, qtde)';
  END IF;
  
  RAISE NOTICE '✅ Coluna de quantidade encontrada: %', v_column_name;
END $$;

-- ============================================================================
-- SAOLUIZ: Recriar MV com ambas as colunas
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS saoluiz.vendas_agregadas_60d CASCADE;

-- Criar MV dinamicamente baseado nas colunas disponíveis
DO $$
DECLARE
  v_quantidade_col text;
  v_sql text;
BEGIN
  -- Detectar nome da coluna de quantidade
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'quantidade') THEN
    v_quantidade_col := 'quantidade';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtd') THEN
    v_quantidade_col := 'qtd';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtde') THEN
    v_quantidade_col := 'qtde';
  ELSE
    RAISE EXCEPTION 'Coluna de quantidade não encontrada na tabela saoluiz.vendas';
  END IF;
  
  RAISE NOTICE 'Criando MV usando coluna: %', v_quantidade_col;
  
  -- Criar MV com a coluna correta
  v_sql := format('
    CREATE MATERIALIZED VIEW saoluiz.vendas_agregadas_60d AS
    SELECT
      p.id AS id_produto,
      p.filial_id,
      p.departamento_id,
      SUM(v.valor_vendas) AS total_valor_produto,
      SUM(v.%I) AS total_quantidade_produto
    FROM saoluiz.vendas v
    JOIN saoluiz.produtos p
      ON v.id_produto = p.id
      AND v.filial_id = p.filial_id
    WHERE
      v.data_venda >= (date_trunc(''month'', CURRENT_DATE) - INTERVAL ''2 months'')::date
      AND v.data_venda < date_trunc(''month'', CURRENT_DATE)::date
      AND v.valor_vendas > 0
    GROUP BY p.id, p.filial_id, p.departamento_id
  ', v_quantidade_col);
  
  EXECUTE v_sql;
  
  RAISE NOTICE '✅ MV criada com sucesso usando coluna %', v_quantidade_col;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_saoluiz_vendas_agregadas_60d_produto_filial
ON saoluiz.vendas_agregadas_60d (id_produto, filial_id);

-- Comentário
COMMENT ON MATERIALIZED VIEW saoluiz.vendas_agregadas_60d IS
'Vendas agregadas dos últimos 2 meses fechados para cálculo de métricas.

COLUNAS:
- total_valor_produto: SUM(valor_vendas) - Total em R$
- total_quantidade_produto: SUM(quantidade/qtd/qtde) - Total em unidades

PERÍODO:
  Sempre os 2 meses anteriores FECHADOS ao mês atual
  Exemplo em Janeiro/2026: 01/11/2025 a 31/12/2025

USO:
  Usada pela função calcular_venda_media_diaria_60d()
  para calcular: venda_media = total_quantidade_produto / dias_periodo

REFRESH:
  Executar mensalmente: REFRESH MATERIALIZED VIEW saoluiz.vendas_agregadas_60d;';

-- ============================================================================
-- Verificar estrutura da MV criada
-- ============================================================================

DO $$
DECLARE
  v_colunas text[];
BEGIN
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO v_colunas
  FROM information_schema.columns
  WHERE table_schema = 'saoluiz'
    AND table_name = 'vendas_agregadas_60d';
  
  RAISE NOTICE 'Colunas da MV saoluiz.vendas_agregadas_60d: %', array_to_string(v_colunas, ', ');
  
  -- Verificar se tem as colunas necessárias
  IF 'total_quantidade_produto' = ANY(v_colunas) THEN
    RAISE NOTICE '✅ Coluna total_quantidade_produto encontrada!';
  ELSE
    RAISE EXCEPTION '❌ Coluna total_quantidade_produto NÃO encontrada!';
  END IF;
  
  IF 'total_valor_produto' = ANY(v_colunas) THEN
    RAISE NOTICE '✅ Coluna total_valor_produto encontrada!';
  ELSE
    RAISE WARNING '⚠️  Coluna total_valor_produto NÃO encontrada (opcional)';
  END IF;
END $$;

-- ============================================================================
-- Contar registros na MV
-- ============================================================================

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM saoluiz.vendas_agregadas_60d;
  RAISE NOTICE 'Total de registros na MV: %', v_count;
  
  IF v_count = 0 THEN
    RAISE WARNING '⚠️  MV está vazia. Verifique se há vendas no período dos últimos 2 meses.';
  END IF;
END $$;
