-- ============================================================================
-- FIX: Corrigir função calcular_venda_media_diaria_60d
-- ============================================================================
-- Data: 2026-01-07
-- Problema: Função estava usando total_valor_produto ao invés de total_quantidade_produto
-- 
-- ERRO ORIGINAL:
--   ERROR: column mv.total_valor_produto does not exist
--   LINE 6: venda_media_diaria_60d = mv.total_valor_produto / 60.0
--
-- CORREÇÃO:
--   Usar mv.total_quantidade_produto (coluna que existe na MV)
--   Dividir pelo número dinâmico de dias do período
-- ============================================================================

DROP FUNCTION IF EXISTS public.calcular_venda_media_diaria_60d(text);

CREATE OR REPLACE FUNCTION public.calcular_venda_media_diaria_60d(schema_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz := clock_timestamp();
  v_dias_periodo integer;
  v_rows_updated integer;
BEGIN
  SET statement_timeout = '120s';

  -- Calcular numero de dias no periodo (2 meses fechados)
  -- Exemplo: Em janeiro/2026, calcula dias de 01/11/2025 a 31/12/2025 = 61 dias
  v_dias_periodo := (
    (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date  -- ultimo dia mes anterior
    -
    (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date  -- primeiro dia 2 meses atras
    + 1  -- incluir ambos os dias
  )::integer;

  RAISE NOTICE 'Calculando venda media diaria para schema % com periodo de % dias', schema_name, v_dias_periodo;

  -- Verificar se a MV existe antes de executar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = schema_name
    AND table_name = 'vendas_agregadas_60d'
  ) THEN
    RAISE EXCEPTION 'Materialized View %.vendas_agregadas_60d não existe. Execute a migration de criação da MV primeiro.', schema_name;
  END IF;

  -- Atualizar produtos com venda média diária em QUANTIDADE
  -- Usa total_quantidade_produto da MV (SUM de unidades vendidas)
  EXECUTE format('
    UPDATE %I.produtos AS p
    SET
      venda_media_diaria_60d = mv.total_quantidade_produto / $1::numeric
    FROM
      %I.vendas_agregadas_60d AS mv
    WHERE
      p.id = mv.id_produto
      AND p.filial_id = mv.filial_id;
  ', schema_name, schema_name)
  USING v_dias_periodo;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  PERFORM public.log_job(
      'calcular_venda_media_diaria_60d',
      schema_name,
      'SUCCESS',
      format('Calculo de QUANTIDADE media diaria (2 meses fechados = %s dias) concluido. %s produtos atualizados.', v_dias_periodo, v_rows_updated),
      start_time
  );

  RETURN format('Calculo concluido para %s: %s produtos atualizados (periodo: %s dias)',
                schema_name, v_rows_updated, v_dias_periodo);

EXCEPTION
    WHEN OTHERS THEN
        PERFORM public.log_job(
            'calcular_venda_media_diaria_60d',
            schema_name,
            'ERROR',
            SQLERRM,
            start_time
        );
        RAISE;
END;
$function$;

COMMENT ON FUNCTION public.calcular_venda_media_diaria_60d(text) IS
'Calcula a venda media diaria em QUANTIDADE (unidades) usando os 2 meses anteriores FECHADOS.

FORMULA:
  venda_media_diaria_60d = SUM(quantidade_vendida) / dias_periodo

EXEMPLO:
  Em janeiro/2026: usa novembro+dezembro/2025 (61 dias)
  Produto vendeu 100 unidades no período
  Média = 100 / 61 = 1.64 un/dia

IMPORTANTE:
  - Retorna QUANTIDADE média (unidades/dia), NÃO valor em R$
  - Período é dinâmico (muda conforme o mês atual)
  - Usa coluna total_quantidade_produto da MV vendas_agregadas_60d
  - Usado para calcular dias_de_estoque = estoque_atual / venda_media_diaria_60d

DEPENDÊNCIAS:
  - Materialized View: {schema}.vendas_agregadas_60d
  - Coluna necessária: total_quantidade_produto (SUM de quantidade)

USO:
  SELECT public.calcular_venda_media_diaria_60d(''saoluiz'');
  SELECT public.calcular_venda_media_diaria_60d(''okilao'');';

-- ============================================================================
-- GRANT DE PERMISSÕES
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.calcular_venda_media_diaria_60d TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_venda_media_diaria_60d TO service_role;

-- ============================================================================
-- VERIFICAR SE A MV EXISTE PARA CADA TENANT
-- ============================================================================
DO $$
DECLARE
  v_schema text;
  v_existe boolean;
BEGIN
  FOR v_schema IN SELECT DISTINCT supabase_schema FROM public.tenants WHERE supabase_schema IS NOT NULL
  LOOP
    -- Verificar se MV existe
    EXECUTE format('
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = %L
        AND table_name = ''vendas_agregadas_60d''
      )', v_schema) INTO v_existe;
    
    IF v_existe THEN
      RAISE NOTICE '✅ MV vendas_agregadas_60d existe no schema %', v_schema;
    ELSE
      RAISE WARNING '⚠️  MV vendas_agregadas_60d NÃO existe no schema %. Execute: CREATE MATERIALIZED VIEW %.vendas_agregadas_60d', v_schema, v_schema;
    END IF;
  END LOOP;
END $$;
