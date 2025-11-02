-- =====================================================
-- FUNÇÕES RPC PARA MÓDULO DESCONTOS VENDA
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Função para LISTAR descontos (GET)
CREATE OR REPLACE FUNCTION get_descontos_venda(p_schema text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  EXECUTE format('
    SELECT COALESCE(json_agg(
      json_build_object(
        ''id'', dv.id,
        ''filial_id'', dv.filial_id,
        ''data_desconto'', dv.data_desconto,
        ''valor_desconto'', dv.valor_desconto,
        ''observacao'', dv.observacao,
        ''created_at'', dv.created_at,
        ''updated_at'', dv.updated_at,
        ''created_by'', dv.created_by
      ) ORDER BY dv.data_desconto DESC
    ), ''[]''::json)
    FROM %I.descontos_venda dv
  ', p_schema)
  INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 2. Função para INSERIR desconto (POST)
CREATE OR REPLACE FUNCTION insert_desconto_venda(
  p_schema text,
  p_filial_id integer,
  p_data_desconto date,
  p_valor_desconto numeric,
  p_observacao text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_new_id uuid;
BEGIN
  -- Validar valor
  IF p_valor_desconto < 0 THEN
    RAISE EXCEPTION 'Valor do desconto deve ser maior ou igual a zero';
  END IF;

  -- Gerar novo ID
  v_new_id := gen_random_uuid();

  -- Inserir desconto
  EXECUTE format('
    INSERT INTO %I.descontos_venda (
      id, filial_id, data_desconto, valor_desconto, observacao, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING json_build_object(
      ''id'', id,
      ''filial_id'', filial_id,
      ''data_desconto'', data_desconto,
      ''valor_desconto'', valor_desconto,
      ''observacao'', observacao,
      ''created_at'', created_at,
      ''updated_at'', updated_at,
      ''created_by'', created_by
    )
  ', p_schema)
  USING v_new_id, p_filial_id, p_data_desconto, p_valor_desconto, p_observacao, p_created_by
  INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
END;
$$;

-- 3. Função para ATUALIZAR desconto (PUT)
CREATE OR REPLACE FUNCTION update_desconto_venda(
  p_schema text,
  p_id uuid,
  p_filial_id integer,
  p_data_desconto date,
  p_valor_desconto numeric,
  p_observacao text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validar valor
  IF p_valor_desconto < 0 THEN
    RAISE EXCEPTION 'Valor do desconto deve ser maior ou igual a zero';
  END IF;

  -- Atualizar desconto
  EXECUTE format('
    UPDATE %I.descontos_venda
    SET 
      filial_id = $2,
      data_desconto = $3,
      valor_desconto = $4,
      observacao = $5,
      updated_at = NOW()
    WHERE id = $1
    RETURNING json_build_object(
      ''id'', id,
      ''filial_id'', filial_id,
      ''data_desconto'', data_desconto,
      ''valor_desconto'', valor_desconto,
      ''observacao'', observacao,
      ''created_at'', created_at,
      ''updated_at'', updated_at,
      ''created_by'', created_by
    )
  ', p_schema)
  USING p_id, p_filial_id, p_data_desconto, p_valor_desconto, p_observacao
  INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Desconto não encontrado';
  END IF;
  
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
END;
$$;

-- 4. Função para DELETAR desconto (DELETE)
CREATE OR REPLACE FUNCTION delete_desconto_venda(
  p_schema text,
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted boolean;
BEGIN
  EXECUTE format('
    DELETE FROM %I.descontos_venda
    WHERE id = $1
    RETURNING true
  ', p_schema)
  USING p_id
  INTO v_deleted;
  
  RETURN COALESCE(v_deleted, false);
END;
$$;

-- =====================================================
-- CONCEDER PERMISSÕES
-- =====================================================

GRANT EXECUTE ON FUNCTION get_descontos_venda(text) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_desconto_venda(text, integer, date, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_desconto_venda(text, uuid, integer, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_desconto_venda(text, uuid) TO authenticated;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Para testar, execute:
-- SELECT get_descontos_venda('okilao');
