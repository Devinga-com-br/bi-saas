-- =====================================================
-- FUNÇÕES RPC PARA MÓDULO DESCONTOS VENDA
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Função para LISTAR descontos (SEM JOIN, apenas dados da tabela)
CREATE OR REPLACE FUNCTION get_descontos_venda(p_schema TEXT)
RETURNS TABLE (
  id UUID,
  filial_id INTEGER,
  data_desconto DATE,
  valor_desconto NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Buscar apenas os dados da tabela descontos_venda, sem JOIN
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
    ORDER BY data_desconto DESC, filial_id
  ', p_schema);
END;
$$;

-- 2. Função para INSERIR desconto
CREATE OR REPLACE FUNCTION insert_desconto_venda(
  p_schema TEXT,
  p_filial_id INTEGER,
  p_data_desconto DATE,
  p_valor_desconto NUMERIC(10,2),
  p_observacao TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filial_id INTEGER,
  data_desconto DATE,
  valor_desconto NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    INSERT INTO %I.descontos_venda (
      filial_id,
      data_desconto,
      valor_desconto,
      observacao,
      created_by
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id, filial_id, data_desconto, valor_desconto, observacao, created_at, created_by
  ', p_schema) 
  USING p_filial_id, p_data_desconto, p_valor_desconto, p_observacao, p_created_by;
EXCEPTION 
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
END;
$$;

-- 3. Função para ATUALIZAR desconto
CREATE OR REPLACE FUNCTION update_desconto_venda(
  p_schema TEXT,
  p_id UUID,
  p_filial_id INTEGER,
  p_data_desconto DATE,
  p_valor_desconto NUMERIC(10,2),
  p_observacao TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filial_id INTEGER,
  data_desconto DATE,
  valor_desconto NUMERIC(10,2),
  observacao TEXT,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    UPDATE %I.descontos_venda 
    SET 
      filial_id = $2,
      data_desconto = $3,
      valor_desconto = $4,
      observacao = $5,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, filial_id, data_desconto, valor_desconto, observacao, updated_at
  ', p_schema)
  USING p_id, p_filial_id, p_data_desconto, p_valor_desconto, p_observacao;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desconto não encontrado';
  END IF;
EXCEPTION 
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
END;
$$;

-- 4. Função para DELETAR desconto
CREATE OR REPLACE FUNCTION delete_desconto_venda(
  p_schema TEXT,
  p_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted BOOLEAN := FALSE;
BEGIN
  EXECUTE format('
    DELETE FROM %I.descontos_venda 
    WHERE id = $1
  ', p_schema)
  USING p_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- =====================================================
-- PERMISSÕES
-- =====================================================
GRANT EXECUTE ON FUNCTION get_descontos_venda(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_desconto_venda(TEXT, INTEGER, DATE, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_desconto_venda(TEXT, UUID, INTEGER, DATE, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_desconto_venda(TEXT, UUID) TO authenticated;
