-- =====================================================
-- Fix: Produtos sem vendas function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_produtos_sem_vendas(
  p_schema TEXT,
  p_filiais TEXT DEFAULT 'all',
  p_dias_sem_vendas INTEGER DEFAULT 30,
  p_data_referencia DATE DEFAULT CURRENT_DATE,
  p_curva_abc TEXT DEFAULT 'all',
  p_filtro_tipo TEXT DEFAULT 'all',
  p_departamento_ids TEXT DEFAULT NULL,
  p_produto_ids TEXT DEFAULT NULL
)
RETURNS TABLE (
  filial_id BIGINT,
  produto_id BIGINT,
  descricao TEXT,
  estoque_atual NUMERIC(18,6),
  data_ultima_venda DATE,
  preco_custo NUMERIC(15,5),
  curva_abcd TEXT,
  curva_lucro VARCHAR(2),
  dias_sem_venda INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_filiais_condition TEXT;
  v_curva_condition TEXT;
  v_departamento_condition TEXT;
  v_produto_condition TEXT;
  v_data_limite DATE;
BEGIN
  -- Data limite: data_referencia - dias_sem_vendas
  v_data_limite := p_data_referencia - p_dias_sem_vendas;

  -- Construir condição de filiais
  IF p_filiais IS NULL OR p_filiais = 'all' OR p_filiais = '' THEN
    v_filiais_condition := '1=1';
  ELSE
    v_filiais_condition := 'p.filial_id IN (' || p_filiais || ')';
  END IF;

  -- Construir condição de curva ABC
  IF p_curva_abc IS NULL OR p_curva_abc = 'all' OR p_curva_abc = '' THEN
    v_curva_condition := '1=1';
  ELSE
    v_curva_condition := 'p.curva_abcd = ' || quote_literal(p_curva_abc);
  END IF;

  -- Construir condição de departamento
  IF p_filtro_tipo = 'departamento' AND p_departamento_ids IS NOT NULL AND p_departamento_ids != '' THEN
    v_departamento_condition := 'p.departamento_id IN (' || p_departamento_ids || ')';
  ELSIF p_filtro_tipo = 'setor' AND p_departamento_ids IS NOT NULL AND p_departamento_ids != '' THEN
    -- Buscar departamentos filhos dos setores selecionados
    v_departamento_condition := format('
      p.departamento_id IN (
        SELECT d1.departamento_id 
        FROM %I.departments_level_1 d1
        WHERE d1.pai_level_2_id IN (%s)
           OR d1.pai_level_3_id IN (%s)
           OR d1.pai_level_4_id IN (%s)
      )
    ', p_schema, p_departamento_ids, p_departamento_ids, p_departamento_ids);
  ELSE
    v_departamento_condition := '1=1';
  END IF;

  -- Construir condição de produto
  IF p_filtro_tipo = 'produto' AND p_produto_ids IS NOT NULL AND p_produto_ids != '' THEN
    v_produto_condition := 'p.id IN (' || p_produto_ids || ')';
  ELSE
    v_produto_condition := '1=1';
  END IF;

  RETURN QUERY EXECUTE format('
    WITH 
    -- Última venda de cada produto (TODAS as vendas históricas - sem filtro de data)
    ultimas_vendas_historico AS (
      SELECT 
        v.id_produto,
        v.filial_id,
        MAX(v.data_venda) as data_ultima_venda
      FROM %I.vendas v
      GROUP BY v.id_produto, v.filial_id
    ),
    -- Última venda de hoje (vendas_hoje_itens)
    ultimas_vendas_hoje AS (
      SELECT 
        vhi.produto_id,
        vhi.filial_id,
        MAX(vhi.data_extracao) as data_ultima_venda
      FROM %I.vendas_hoje_itens vhi
      WHERE vhi.cancelado = false
      GROUP BY vhi.produto_id, vhi.filial_id
    ),
    -- Combinar vendas históricas + hoje
    todas_ultimas_vendas AS (
      SELECT 
        COALESCE(vh.id_produto, vhj.produto_id) as produto_id,
        COALESCE(vh.filial_id, vhj.filial_id) as filial_id,
        GREATEST(
          COALESCE(vh.data_ultima_venda, ''1900-01-01''::DATE),
          COALESCE(vhj.data_ultima_venda, ''1900-01-01''::DATE)
        ) as data_ultima_venda
      FROM ultimas_vendas_historico vh
      FULL OUTER JOIN ultimas_vendas_hoje vhj 
        ON vh.id_produto = vhj.produto_id 
        AND vh.filial_id = vhj.filial_id
    )
    -- Produtos sem vendas
    SELECT
      p.filial_id::BIGINT as filial_id,
      p.id::BIGINT as produto_id,
      p.descricao::TEXT as descricao,
      p.estoque_atual::NUMERIC(18,6) as estoque_atual,
      tuv.data_ultima_venda::DATE as data_ultima_venda,
      p.preco_de_custo::NUMERIC(15,5) as preco_custo,
      p.curva_abcd::TEXT as curva_abcd,
      p.curva_lucro::VARCHAR(2) as curva_lucro,
      CASE 
        WHEN tuv.data_ultima_venda IS NULL THEN NULL
        ELSE (CURRENT_DATE - tuv.data_ultima_venda)::INTEGER 
      END as dias_sem_venda
    FROM %I.produtos p
    LEFT JOIN todas_ultimas_vendas tuv 
      ON p.id = tuv.produto_id 
      AND p.filial_id = tuv.filial_id
    WHERE p.ativo = true
      AND p.estoque_atual > 0
      AND %s  -- filiais_condition
      AND %s  -- curva_condition
      AND %s  -- departamento_condition
      AND %s  -- produto_condition
      AND (
        tuv.data_ultima_venda IS NULL 
        OR tuv.data_ultima_venda < $1
      )
    ORDER BY 
      dias_sem_venda DESC NULLS LAST,
      p.filial_id,
      p.curva_abcd NULLS LAST,
      p.descricao
  ',
  p_schema,
  p_schema,
  p_schema,
  v_filiais_condition,
  v_curva_condition,
  v_departamento_condition,
  v_produto_condition
  )
  USING v_data_limite;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_produtos_sem_vendas IS 
  'Retorna produtos sem vendas há X dias. Combina vendas históricas (vendas) com vendas do dia (vendas_hoje_itens). Filtra por departamento, curva ABC, etc.';
