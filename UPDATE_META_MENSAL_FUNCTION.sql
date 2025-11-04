-- ================================================================
-- FUNÇÃO: update_meta_mensal
-- Descrição: Atualiza meta_percentual e valor_meta de uma meta específica
-- Autor: DevIngá Team
-- Data: 2025-11-04
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_meta_mensal(
  p_schema TEXT,
  p_meta_id INTEGER,
  p_valor_meta NUMERIC,
  p_meta_percentual NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_result JSON;
BEGIN
  -- Validar schema
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema não pode ser vazio';
  END IF;

  -- Validar meta_id
  IF p_meta_id IS NULL THEN
    RAISE EXCEPTION 'ID da meta não pode ser vazio';
  END IF;

  -- Construir query de update
  v_sql := format('
    UPDATE %I.metas_mensais
    SET 
      valor_meta = $1,
      meta_percentual = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING id, valor_meta, meta_percentual
  ', p_schema);

  -- Executar update
  EXECUTE v_sql
  USING p_valor_meta, p_meta_percentual, p_meta_id
  INTO v_result;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'message', 'Meta atualizada com sucesso',
    'data', v_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ================================================================
-- TESTES
-- ================================================================

-- Teste 1: Atualizar meta
-- SELECT public.update_meta_mensal('okilao', 1, 15000.00, 12.50);

-- Teste 2: Schema inválido
-- SELECT public.update_meta_mensal('', 1, 15000.00, 12.50);

-- Teste 3: Meta inexistente
-- SELECT public.update_meta_mensal('okilao', 99999, 15000.00, 12.50);

-- ================================================================
-- COMO APLICAR ESTE ARQUIVO
-- ================================================================

/*
1. Copie o conteúdo deste arquivo
2. Abra o Supabase SQL Editor
3. Cole o conteúdo
4. Execute (Run)
5. Verifique se a função foi criada:
   SELECT proname FROM pg_proc WHERE proname = 'update_meta_mensal';
*/

-- ================================================================
-- PERMISSÕES
-- ================================================================

-- Garantir que usuários autenticados possam executar
GRANT EXECUTE ON FUNCTION public.update_meta_mensal(TEXT, INTEGER, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_meta_mensal(TEXT, INTEGER, NUMERIC, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.update_meta_mensal IS 'Atualiza valor_meta e meta_percentual de uma meta específica em qualquer schema';
