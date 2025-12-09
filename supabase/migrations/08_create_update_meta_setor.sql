-- ============================================================================
-- MIGRATION: Atualizar função update_meta_setor
-- ============================================================================
--
-- PROBLEMA:
-- A função update_meta_setor existe, mas NÃO recalcula os campos
-- 'diferenca' e 'diferenca_percentual' após a atualização.
-- Isso faz com que o banco fique com valores desatualizados.
--
-- SOLUÇÃO:
-- Atualizar a função para recalcular diferença e diferença_percentual
-- baseado no valor_realizado atual.
--
-- IMPORTANTE: Mantém compatibilidade com tipos INTEGER para setor_id e filial_id
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: update_meta_setor (VERSÃO MELHORADA)
-- ============================================================================
-- Atualiza uma meta específica na tabela metas_setor
-- AGORA recalcula automaticamente diferença e diferença percentual
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_meta_setor(
  p_schema text,
  p_setor_id integer,       -- Mantém INTEGER para compatibilidade
  p_filial_id integer,      -- Mantém INTEGER para compatibilidade
  p_data date,
  p_meta_percentual numeric,
  p_valor_meta numeric
)
RETURNS json                -- Mantém JSON para compatibilidade
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_result JSON;
  v_valor_realizado NUMERIC;
  v_diferenca NUMERIC;
  v_diferenca_percentual NUMERIC;
  v_rows_updated INT;
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

  -- ========================================================================
  -- NOVO: Buscar valor_realizado atual para recalcular diferenças
  -- ========================================================================
  EXECUTE format('
    SELECT COALESCE(valor_realizado, 0)
    FROM %I.metas_setor
    WHERE setor_id = $1
      AND filial_id = $2
      AND data = $3
  ', p_schema)
  INTO v_valor_realizado
  USING p_setor_id, p_filial_id, p_data;

  -- Se não encontrou, usar 0
  IF v_valor_realizado IS NULL THEN
    v_valor_realizado := 0;
  END IF;

  -- ========================================================================
  -- NOVO: Calcular diferença e diferença percentual
  -- ========================================================================
  v_diferenca := v_valor_realizado - COALESCE(p_valor_meta, 0);

  IF COALESCE(p_valor_meta, 0) > 0 THEN
    v_diferenca_percentual := (v_diferenca / p_valor_meta) * 100;
  ELSE
    v_diferenca_percentual := 0;
  END IF;

  -- ========================================================================
  -- UPDATE: Agora inclui diferenca e diferenca_percentual
  -- ========================================================================
  v_sql := format('
    UPDATE %I.metas_setor
    SET
      meta_percentual = $1,
      valor_meta = $2,
      diferenca = $3,
      diferenca_percentual = $4,
      updated_at = NOW()
    WHERE setor_id = $5
      AND filial_id = $6
      AND data = $7
    RETURNING setor_id, filial_id, data, meta_percentual, valor_meta, diferenca, diferenca_percentual
  ', p_schema);

  -- Executar update
  EXECUTE v_sql
  USING p_meta_percentual, p_valor_meta, v_diferenca, v_diferenca_percentual, p_setor_id, p_filial_id, p_data
  INTO v_result;

  -- Verificar se atualizou
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum registro encontrado para atualizar'
    );
  END IF;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'message', 'Meta de setor atualizada com sucesso',
    'data', v_result,
    'calculated', json_build_object(
      'valor_realizado', v_valor_realizado,
      'diferenca', v_diferenca,
      'diferenca_percentual', v_diferenca_percentual
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- COMENTÁRIO DA FUNÇÃO
-- ============================================================================

COMMENT ON FUNCTION public.update_meta_setor IS
'Atualiza uma meta específica na tabela metas_setor.
VERSÃO MELHORADA: Agora recalcula diferenca e diferenca_percentual automaticamente.

PARÂMETROS:
- p_schema: Nome do schema do tenant (ex: ''okilao'')
- p_setor_id: ID do setor (INTEGER)
- p_filial_id: ID da filial (INTEGER)
- p_data: Data da meta (DATE)
- p_meta_percentual: Novo percentual da meta (NUMERIC)
- p_valor_meta: Novo valor da meta (NUMERIC)

LÓGICA:
1. Valida parâmetros obrigatórios
2. Busca valor_realizado atual do registro
3. Calcula: diferenca = valor_realizado - valor_meta
4. Calcula: diferenca_percentual = (diferenca / valor_meta) * 100
5. Atualiza o registro na tabela metas_setor
6. Retorna JSON com status e valores atualizados

RETORNO:
JSON com:
- success: boolean
- message: mensagem descritiva
- data: registro atualizado (RETURNING)
- calculated: valores calculados (valor_realizado, diferenca, diferenca_percentual)
- error: mensagem de erro (se houver)

EXEMPLO:
SELECT public.update_meta_setor(
  ''okilao'',      -- schema
  1,               -- setor_id
  10,              -- filial_id
  ''2025-01-15'',  -- data
  12.5,            -- meta_percentual
  15000            -- valor_meta
);';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_meta_setor'
  ) INTO v_func_exists;

  IF v_func_exists THEN
    RAISE NOTICE '✅ Função update_meta_setor atualizada com sucesso!';
    RAISE NOTICE '📝 Novidade: Agora recalcula diferenca e diferenca_percentual automaticamente';
  ELSE
    RAISE EXCEPTION '❌ Erro: Função não foi criada!';
  END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
