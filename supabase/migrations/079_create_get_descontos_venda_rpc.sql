-- ==========================================
-- RPC: get_descontos_venda
-- ==========================================
-- Função para buscar descontos de venda de um schema específico
-- ==========================================

CREATE OR REPLACE FUNCTION get_descontos_venda(p_schema text)
RETURNS TABLE (
  id uuid,
  filial_id integer,
  data_desconto date,
  valor_desconto numeric(10, 2),
  observacao text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      id,
      filial_id,
      data_desconto,
      valor_desconto,
      observacao,
      created_at,
      updated_at,
      created_by
    FROM %I.descontos_venda
    ORDER BY data_desconto DESC
  ', p_schema);
END;
$$;

-- ==========================================
-- RPC: insert_desconto_venda
-- ==========================================
-- Função para inserir novo desconto
-- ==========================================

CREATE OR REPLACE FUNCTION insert_desconto_venda(
  p_schema text,
  p_filial_id integer,
  p_data_desconto date,
  p_valor_desconto numeric(10, 2),
  p_observacao text,
  p_created_by uuid
)
RETURNS TABLE (
  id uuid,
  filial_id integer,
  data_desconto date,
  valor_desconto numeric(10, 2),
  observacao text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Verificar se já existe desconto para esta filial nesta data
  EXECUTE format('
    SELECT id FROM %I.descontos_venda 
    WHERE filial_id = $1 AND data_desconto = $2
  ', p_schema) 
  INTO v_id
  USING p_filial_id, p_data_desconto;
  
  IF v_id IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
  END IF;

  -- Inserir desconto
  RETURN QUERY EXECUTE format('
    INSERT INTO %I.descontos_venda (
      filial_id,
      data_desconto,
      valor_desconto,
      observacao,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING 
      id,
      filial_id,
      data_desconto,
      valor_desconto,
      observacao,
      created_at,
      updated_at,
      created_by
  ', p_schema)
  USING p_filial_id, p_data_desconto, p_valor_desconto, p_observacao, p_created_by;
END;
$$;

-- ==========================================
-- RPC: update_desconto_venda
-- ==========================================
-- Função para atualizar desconto existente
-- ==========================================

CREATE OR REPLACE FUNCTION update_desconto_venda(
  p_schema text,
  p_id uuid,
  p_filial_id integer,
  p_data_desconto date,
  p_valor_desconto numeric(10, 2),
  p_observacao text
)
RETURNS TABLE (
  id uuid,
  filial_id integer,
  data_desconto date,
  valor_desconto numeric(10, 2),
  observacao text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  -- Verificar se existe outro desconto com mesma filial/data (exceto o atual)
  EXECUTE format('
    SELECT id FROM %I.descontos_venda 
    WHERE filial_id = $1 AND data_desconto = $2 AND id != $3
  ', p_schema) 
  INTO v_existing_id
  USING p_filial_id, p_data_desconto, p_id;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
  END IF;

  -- Atualizar desconto
  RETURN QUERY EXECUTE format('
    UPDATE %I.descontos_venda
    SET
      filial_id = $1,
      data_desconto = $2,
      valor_desconto = $3,
      observacao = $4,
      updated_at = now()
    WHERE id = $5
    RETURNING 
      id,
      filial_id,
      data_desconto,
      valor_desconto,
      observacao,
      created_at,
      updated_at,
      created_by
  ', p_schema)
  USING p_filial_id, p_data_desconto, p_valor_desconto, p_observacao, p_id;
END;
$$;

-- ==========================================
-- RPC: delete_desconto_venda
-- ==========================================
-- Função para deletar desconto
-- ==========================================

CREATE OR REPLACE FUNCTION delete_desconto_venda(
  p_schema text,
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    DELETE FROM %I.descontos_venda WHERE id = $1
  ', p_schema)
  USING p_id;
  
  RETURN FOUND;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_descontos_venda(text) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_desconto_venda(text, integer, date, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_desconto_venda(text, uuid, integer, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_desconto_venda(text, uuid) TO authenticated;

-- Comentários
COMMENT ON FUNCTION get_descontos_venda IS 'Busca descontos de venda de um schema específico, ordenados por data DESC';
COMMENT ON FUNCTION insert_desconto_venda IS 'Insere novo desconto de venda em um schema específico';
COMMENT ON FUNCTION update_desconto_venda IS 'Atualiza desconto de venda existente em um schema específico';
COMMENT ON FUNCTION delete_desconto_venda IS 'Deleta desconto de venda de um schema específico';

