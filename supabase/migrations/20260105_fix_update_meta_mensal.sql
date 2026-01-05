-- Fix update_meta_mensal function
-- The function was trying to store a RECORD into a JSON variable, which doesn't work
-- This migration fixes it to properly handle the result

CREATE OR REPLACE FUNCTION public.update_meta_mensal(
  p_schema text, 
  p_meta_id integer, 
  p_valor_meta numeric, 
  p_meta_percentual numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_sql TEXT;
  v_id INTEGER;
  v_valor_meta NUMERIC;
  v_meta_percentual NUMERIC;
  v_valor_realizado NUMERIC;
  v_custo_realizado NUMERIC;
  v_lucro_realizado NUMERIC;
  v_diferenca NUMERIC;
  v_diferenca_percentual NUMERIC;
  v_rows_updated INT;
BEGIN
  -- Validar schema
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema não pode ser vazio';
  END IF;

  -- Validar meta_id
  IF p_meta_id IS NULL THEN
    RAISE EXCEPTION 'ID da meta não pode ser vazio';
  END IF;

  -- Buscar valor_realizado, custo e lucro atuais antes do update
  v_sql := format('
    SELECT 
      COALESCE(valor_realizado, 0),
      COALESCE(custo_realizado, 0),
      COALESCE(lucro_realizado, 0)
    FROM %I.metas_mensais
    WHERE id = $1
  ', p_schema);

  EXECUTE v_sql
  INTO v_valor_realizado, v_custo_realizado, v_lucro_realizado
  USING p_meta_id;

  -- Se não encontrou o registro, retornar erro
  IF v_valor_realizado IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Meta não encontrada com ID: ' || p_meta_id
    );
  END IF;

  -- Calcular diferenças com os novos valores
  v_diferenca := v_valor_realizado - COALESCE(p_valor_meta, 0);
  v_diferenca_percentual := CASE
    WHEN COALESCE(p_valor_meta, 0) > 0 THEN (v_diferenca / p_valor_meta) * 100
    ELSE 0
  END;

  -- Construir e executar query de update
  v_sql := format('
    UPDATE %I.metas_mensais
    SET 
      valor_meta = $1,
      meta_percentual = $2,
      diferenca = $3,
      diferenca_percentual = $4,
      updated_at = NOW()
    WHERE id = $5
    RETURNING id, valor_meta, meta_percentual, diferenca, diferenca_percentual
  ', p_schema);

  -- Executar update
  EXECUTE v_sql
  USING p_valor_meta, p_meta_percentual, v_diferenca, v_diferenca_percentual, p_meta_id
  INTO v_id, v_valor_meta, v_meta_percentual, v_diferenca, v_diferenca_percentual;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Verificar se atualizou
  IF v_rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum registro foi atualizado. Meta ID: ' || p_meta_id
    );
  END IF;

  -- Retornar resultado com sucesso
  RETURN json_build_object(
    'success', true,
    'message', 'Meta atualizada com sucesso',
    'data', json_build_object(
      'id', v_id,
      'valor_meta', v_valor_meta,
      'meta_percentual', v_meta_percentual,
      'diferenca', v_diferenca,
      'diferenca_percentual', v_diferenca_percentual
    ),
    'calculated', json_build_object(
      'valor_realizado', v_valor_realizado,
      'custo_realizado', v_custo_realizado,
      'lucro_realizado', v_lucro_realizado
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$;

COMMENT ON FUNCTION public.update_meta_mensal IS 
'Atualiza uma meta mensal individual.
Parâmetros:
  - p_schema: Schema do tenant
  - p_meta_id: ID da meta (INTEGER, não UUID)
  - p_valor_meta: Novo valor da meta
  - p_meta_percentual: Novo percentual da meta
Retorna: JSON com success, message, data e calculated';
