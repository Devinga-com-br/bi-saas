-- ============================================
-- SQL PARA EXECUTAR NO SUPABASE
-- Módulo: Descontos Venda
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Abra o Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Cole TODO este arquivo e execute
-- 4. Aguarde a confirmação de sucesso
--
-- ============================================

-- 1. Função para LISTAR descontos
CREATE OR REPLACE FUNCTION public.get_descontos_venda(p_schema text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE format('
    SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)
    FROM (
      SELECT 
        d.id,
        d.filial_id,
        COALESCE(b.nome, ''Filial '' || d.filial_id::text) as filial_nome,
        d.data_desconto,
        d.valor_desconto,
        d.observacao,
        d.created_at,
        d.updated_at,
        d.created_by
      FROM %I.descontos_venda d
      LEFT JOIN %I.branches b ON b.id = d.filial_id
      ORDER BY d.data_desconto DESC, d.created_at DESC
    ) t
  ', p_schema, p_schema) INTO result;
  
  RETURN result;
END;
$$;

-- 2. Função para INSERIR desconto
CREATE OR REPLACE FUNCTION public.insert_desconto_venda(
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
  result json;
  new_id uuid;
BEGIN
  -- Gerar novo UUID
  new_id := gen_random_uuid();
  
  -- Inserir registro
  EXECUTE format('
    INSERT INTO %I.descontos_venda (
      id, filial_id, data_desconto, valor_desconto, observacao, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    )
    RETURNING row_to_json(descontos_venda.*)
  ', p_schema) 
  USING new_id, p_filial_id, p_data_desconto, p_valor_desconto, p_observacao, p_created_by
  INTO result;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao inserir desconto: %', SQLERRM;
END;
$$;

-- 3. Função para ATUALIZAR desconto
CREATE OR REPLACE FUNCTION public.update_desconto_venda(
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
  result json;
BEGIN
  -- Atualizar registro
  EXECUTE format('
    UPDATE %I.descontos_venda
    SET 
      filial_id = $2,
      data_desconto = $3,
      valor_desconto = $4,
      observacao = $5,
      updated_at = NOW()
    WHERE id = $1
    RETURNING row_to_json(descontos_venda.*)
  ', p_schema) 
  USING p_id, p_filial_id, p_data_desconto, p_valor_desconto, p_observacao
  INTO result;
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Desconto não encontrado';
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe um desconto lançado para esta filial nesta data';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar desconto: %', SQLERRM;
END;
$$;

-- 4. Função para DELETAR desconto
CREATE OR REPLACE FUNCTION public.delete_desconto_venda(
  p_schema text,
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted boolean;
BEGIN
  EXECUTE format('
    DELETE FROM %I.descontos_venda
    WHERE id = $1
  ', p_schema) 
  USING p_id;
  
  GET DIAGNOSTICS deleted = ROW_COUNT;
  
  RETURN deleted > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar desconto: %', SQLERRM;
END;
$$;

-- ============================================
-- CONCEDER PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_descontos_venda(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_desconto_venda(text, integer, date, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_desconto_venda(text, uuid, integer, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_desconto_venda(text, uuid) TO authenticated;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Após executar, você pode verificar se as funções foram criadas com:
-- 
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name LIKE '%desconto_venda%'
-- AND routine_schema = 'public';
--
-- Deve retornar 4 funções:
-- - get_descontos_venda
-- - insert_desconto_venda
-- - update_desconto_venda
-- - delete_desconto_venda
