-- =====================================================
-- FIX COMPLETO: Atualizar Valores Metas por Setor
-- IMPORTANTE: Hierarquia setores → departments_level_1 → produtos → vendas
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- PASSO 1: Função para atualizar valores de um setor específico
-- ============================================================
CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas_setor(
  p_schema text,
  p_setor_id bigint,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_data_inicio date;
  v_data_fim date;
  v_rows_updated integer := 0;
  v_message text;
  v_departamento_nivel integer;
  v_departamento_ids integer[];
  v_col_pai text;
BEGIN
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month' - interval '1 day')::date;

  -- Buscar nível e IDs dos departamentos do setor
  EXECUTE format('SELECT departamento_nivel, departamento_ids::integer[] FROM %I.setores WHERE id = $1', p_schema)
  INTO v_departamento_nivel, v_departamento_ids USING p_setor_id;

  IF v_departamento_nivel IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Setor não encontrado', 'rows_updated', 0);
  END IF;

  -- Coluna pai baseada no nível: pai_level_3_id, pai_level_4_id, etc
  v_col_pai := 'pai_level_' || v_departamento_nivel || '_id';

  RAISE NOTICE '[ATUALIZAR_METAS_SETOR] Setor: %, Nível: %, Coluna: %, Depts: %',
    p_setor_id, v_departamento_nivel, v_col_pai, v_departamento_ids;

  IF p_filial_id IS NULL THEN
    -- Atualizar para todas as filiais
    EXECUTE format('
      UPDATE %I.metas_setor ms
      SET
        valor_realizado = COALESCE((
          SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
          FROM %I.vendas v
          INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
          INNER JOIN %I.departments_level_1 dl1 ON dl1.departamento_id = p.departamento_id AND dl1.%I = ANY($1)
          LEFT JOIN %I.descontos_venda d ON d.data_desconto = v.data_venda AND d.filial_id = v.filial_id
          WHERE v.data_venda = ms.data AND v.filial_id = ms.filial_id
        ), 0),
        diferenca = COALESCE((
          SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
          FROM %I.vendas v
          INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
          INNER JOIN %I.departments_level_1 dl1 ON dl1.departamento_id = p.departamento_id AND dl1.%I = ANY($1)
          LEFT JOIN %I.descontos_venda d ON d.data_desconto = v.data_venda AND d.filial_id = v.filial_id
          WHERE v.data_venda = ms.data AND v.filial_id = ms.filial_id
        ), 0) - COALESCE(ms.valor_meta, 0),
        diferenca_percentual = CASE WHEN COALESCE(ms.valor_meta, 0) > 0 THEN
          (((COALESCE((SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) FROM %I.vendas v
            INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
            INNER JOIN %I.departments_level_1 dl1 ON dl1.departamento_id = p.departamento_id AND dl1.%I = ANY($1)
            LEFT JOIN %I.descontos_venda d ON d.data_desconto = v.data_venda AND d.filial_id = v.filial_id
            WHERE v.data_venda = ms.data AND v.filial_id = ms.filial_id
          ), 0) - COALESCE(ms.valor_meta, 0)) / ms.valor_meta) * 100) ELSE 0 END,
        updated_at = NOW()
      WHERE ms.setor_id = $2 AND ms.data >= $3 AND ms.data <= $4
    ', p_schema, p_schema, p_schema, p_schema, v_col_pai, p_schema, p_schema, p_schema, p_schema, v_col_pai, p_schema, p_schema, p_schema, p_schema, v_col_pai, p_schema)
    USING v_departamento_ids, p_setor_id, v_data_inicio, v_data_fim;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Atualizados: %s metas do setor %s', v_rows_updated, p_setor_id);
  ELSE
    -- Atualizar para filial específica
    EXECUTE format('
      UPDATE %I.metas_setor ms
      SET
        valor_realizado = COALESCE((
          SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
          FROM %I.vendas v
          INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
          INNER JOIN %I.departments_level_1 dl1 ON dl1.departamento_id = p.departamento_id AND dl1.%I = ANY($1)
          LEFT JOIN %I.descontos_venda d ON d.data_desconto = v.data_venda AND d.filial_id = v.filial_id
          WHERE v.data_venda = ms.data AND v.filial_id = ms.filial_id
        ), 0),
        diferenca = COALESCE((
          SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
          FROM %I.vendas v
          INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
          INNER JOIN %I.departments_level_1 dl1 ON dl1.departamento_id = p.departamento_id AND dl1.%I = ANY($1)
          LEFT JOIN %I.descontos_venda d ON d.data_desconto = v.data_venda AND d.filial_id = v.filial_id
          WHERE v.data_venda = ms.data AND v.filial_id = ms.filial_id
        ), 0) - COALESCE(ms.valor_meta, 0),
        diferenca_percentual = CASE WHEN COALESCE(ms.valor_meta, 0) > 0 THEN
          (((COALESCE((SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) FROM %I.vendas v
            INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
            INNER JOIN %I.departments_level_1 dl1 ON dl1.departamento_id = p.departamento_id AND dl1.%I = ANY($1)
            LEFT JOIN %I.descontos_venda d ON d.data_desconto = v.data_venda AND d.filial_id = v.filial_id
            WHERE v.data_venda = ms.data AND v.filial_id = ms.filial_id
          ), 0) - COALESCE(ms.valor_meta, 0)) / ms.valor_meta) * 100) ELSE 0 END,
        updated_at = NOW()
      WHERE ms.setor_id = $2 AND ms.data >= $3 AND ms.data <= $4 AND ms.filial_id = $5
    ', p_schema, p_schema, p_schema, p_schema, v_col_pai, p_schema, p_schema, p_schema, p_schema, v_col_pai, p_schema, p_schema, p_schema, p_schema, v_col_pai, p_schema)
    USING v_departamento_ids, p_setor_id, v_data_inicio, v_data_fim, p_filial_id;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Atualizados: %s metas do setor %s na filial %s', v_rows_updated, p_setor_id, p_filial_id);
  END IF;

  RAISE NOTICE '[ATUALIZAR_METAS_SETOR] %', v_message;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', v_message,
    'rows_updated', v_rows_updated,
    'periodo', jsonb_build_object('mes', p_mes, 'ano', p_ano, 'data_inicio', v_data_inicio, 'data_fim', v_data_fim)
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[ATUALIZAR_METAS_SETOR] Erro: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', 'Erro: ' || SQLERRM, 'rows_updated', 0);
END;
$function$;


-- PASSO 2: Função para atualizar TODOS os setores de uma vez
-- ===========================================================
CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_todos_setores(
  p_schema text,
  p_mes integer,
  p_ano integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_setor record;
  v_result jsonb;
  v_total_rows integer := 0;
  v_total_setores integer := 0;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '[ATUALIZAR_TODOS_SETORES] Schema: %, Mês: %, Ano: %', p_schema, p_mes, p_ano;

  -- Iterar sobre todos os setores ativos
  FOR v_setor IN 
    EXECUTE format('SELECT id, nome FROM %I.setores WHERE ativo = true ORDER BY id', p_schema)
  LOOP
    BEGIN
      -- Chamar função de atualização para cada setor
      SELECT * INTO v_result 
      FROM public.atualizar_valores_realizados_metas_setor(
        p_schema := p_schema,
        p_setor_id := v_setor.id,
        p_mes := p_mes,
        p_ano := p_ano,
        p_filial_id := NULL  -- NULL = todas as filiais
      );

      -- Contar linhas atualizadas
      IF (v_result->>'success')::boolean THEN
        v_total_rows := v_total_rows + COALESCE((v_result->>'rows_updated')::integer, 0);
        v_total_setores := v_total_setores + 1;
        RAISE NOTICE '[ATUALIZAR_TODOS_SETORES] ✓ Setor %: % metas atualizadas', 
          v_setor.nome, (v_result->>'rows_updated')::integer;
      ELSE
        v_errors := array_append(v_errors, format('Setor %s: %s', v_setor.nome, v_result->>'message'));
        RAISE WARNING '[ATUALIZAR_TODOS_SETORES] ✗ Erro no setor %: %', 
          v_setor.nome, v_result->>'message';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, format('Setor %s: %s', v_setor.nome, SQLERRM));
      RAISE WARNING '[ATUALIZAR_TODOS_SETORES] ✗ Exceção no setor %: %', v_setor.nome, SQLERRM;
    END;
  END LOOP;

  -- Retornar resultado consolidado
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Processados %s setores, %s metas atualizadas', v_total_setores, v_total_rows),
    'total_setores', v_total_setores,
    'total_metas_atualizadas', v_total_rows,
    'errors', v_errors,
    'periodo', jsonb_build_object(
      'mes', p_mes,
      'ano', p_ano
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[ATUALIZAR_TODOS_SETORES] Erro fatal: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro ao atualizar setores: ' || SQLERRM,
      'total_setores', v_total_setores,
      'total_metas_atualizadas', v_total_rows,
      'errors', v_errors
    );
END;
$function$;


-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- INSTRUÇÕES:
-- 1. Execute este script completo no SQL Editor do Supabase
-- 2. Aguarde a mensagem de sucesso
-- 3. Recarregue a página de Metas por Setor no frontend
-- 4. Teste a atualização de valores
