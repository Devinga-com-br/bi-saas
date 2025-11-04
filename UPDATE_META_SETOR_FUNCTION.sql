-- ================================================================
-- FUNÇÃO: update_meta_setor
-- Descrição: Atualiza meta_percentual e valor_meta de uma meta de setor específica
-- Autor: DevIngá Team
-- Data: 2025-11-04
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_meta_setor(
  p_schema TEXT,
  p_setor_id INTEGER,
  p_filial_id INTEGER,
  p_data DATE,
  p_meta_percentual NUMERIC,
  p_valor_meta NUMERIC
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

  -- Validar parâmetros
  IF p_setor_id IS NULL THEN
    RAISE EXCEPTION 'ID do setor não pode ser vazio';
  END IF;
  
  IF p_filial_id IS NULL THEN
    RAISE EXCEPTION 'ID da filial não pode ser vazio';
  END IF;
  
  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Data não pode ser vazia';
  END IF;

  -- Construir query de update
  v_sql := format('
    UPDATE %I.metas_setor
    SET 
      meta_percentual = $1,
      valor_meta = $2,
      updated_at = NOW()
    WHERE setor_id = $3
      AND filial_id = $4
      AND data = $5
    RETURNING setor_id, filial_id, data, meta_percentual, valor_meta
  ', p_schema);

  -- Executar update
  EXECUTE v_sql
  USING p_meta_percentual, p_valor_meta, p_setor_id, p_filial_id, p_data
  INTO v_result;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'message', 'Meta de setor atualizada com sucesso',
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

-- Teste 1: Atualizar meta de setor
-- SELECT public.update_meta_setor('okilao', 1, 10, '2025-11-01', 12.50, 15000.00);

-- Teste 2: Schema inválido
-- SELECT public.update_meta_setor('', 1, 10, '2025-11-01', 12.50, 15000.00);

-- Teste 3: Meta inexistente
-- SELECT public.update_meta_setor('okilao', 99999, 10, '2025-11-01', 12.50, 15000.00);

-- ================================================================
-- COMO APLICAR ESTE ARQUIVO
-- ================================================================

/*
1. Copie o conteúdo deste arquivo
2. Abra o Supabase SQL Editor
3. Cole o conteúdo
4. Execute (Run)
5. Verifique se a função foi criada:
   SELECT proname FROM pg_proc WHERE proname = 'update_meta_setor';
*/

-- ================================================================
-- PERMISSÕES
-- ================================================================

-- Garantir que usuários autenticados possam executar
GRANT EXECUTE ON FUNCTION public.update_meta_setor(TEXT, INTEGER, INTEGER, DATE, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_meta_setor(TEXT, INTEGER, INTEGER, DATE, NUMERIC, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.update_meta_setor IS 'Atualiza meta_percentual e valor_meta de uma meta de setor específica em qualquer schema';

-- ================================================================
-- OBSERVAÇÕES
-- ================================================================

/*
• A função identifica a meta por: setor_id + filial_id + data
• Atualiza meta_percentual e valor_meta
• Atualiza updated_at automaticamente
• Funciona para TODOS os schemas (okilao, saoluiz, paraiso, lucia)
• Protegida contra SQL injection com format(%I)
• Retorna JSON com sucesso/erro
*/
