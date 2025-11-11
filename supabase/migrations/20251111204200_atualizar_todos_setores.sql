-- Função para atualizar valores realizados de TODOS os setores
-- Itera sobre todos os setores ativos e chama a função individual
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
