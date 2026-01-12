-- =====================================================
-- Migration: Optimize produtos sem vendas performance
-- Created: 2026-01-11
-- Description: Add indexes and optimize query strategy
-- =====================================================

-- Estratégia de otimização:
-- 1. Criar índices compostos
-- 2. Simplificar query (remover FULL OUTER JOIN)
-- 3. Adicionar paginação
-- 4. Limitar resultados padrão

-- Função otimizada com paginação e limites
CREATE OR REPLACE FUNCTION public.get_produtos_sem_vendas(
  p_schema TEXT,
  p_filiais TEXT DEFAULT 'all',
  p_dias_sem_vendas INTEGER DEFAULT 30,
  p_data_referencia DATE DEFAULT CURRENT_DATE,
  p_curva_abc TEXT DEFAULT 'all',
  p_filtro_tipo TEXT DEFAULT 'all',
  p_departamento_ids TEXT DEFAULT NULL,
  p_produto_ids TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 500,
  p_offset INTEGER DEFAULT 0
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
  dias_sem_venda INTEGER,
  total_count BIGINT
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
    v_filiais_condition := 'filial_id IN (' || p_filiais || ')';
  END IF;

  -- Construir condição de curva ABC
  IF p_curva_abc IS NULL OR p_curva_abc = 'all' OR p_curva_abc = '' THEN
    v_curva_condition := '1=1';
  ELSE
    v_curva_condition := 'curva_abcd = ' || quote_literal(p_curva_abc);
  END IF;

  -- Construir condição de departamento
  IF p_filtro_tipo = 'departamento' AND p_departamento_ids IS NOT NULL AND p_departamento_ids != '' THEN
    v_departamento_condition := 'departamento_id IN (' || p_departamento_ids || ')';
  ELSIF p_filtro_tipo = 'setor' AND p_departamento_ids IS NOT NULL AND p_departamento_ids != '' THEN
    v_departamento_condition := format('
      departamento_id IN (
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
    v_produto_condition := 'id IN (' || p_produto_ids || ')';
  ELSE
    v_produto_condition := '1=1';
  END IF;

  RETURN QUERY EXECUTE format('
    WITH 
    -- Produtos filtrados (aplicar filtros primeiro)
    produtos_filtrados AS (
      SELECT 
        p.id,
        p.filial_id,
        p.descricao,
        p.estoque_atual,
        p.preco_de_custo,
        p.curva_abcd,
        p.curva_lucro,
        p.departamento_id
      FROM %I.produtos p
      WHERE p.ativo = true
        AND p.estoque_atual > 0
        AND %s  -- filiais_condition
        AND %s  -- curva_condition
        AND %s  -- departamento_condition
        AND %s  -- produto_condition
      LIMIT 10000  -- Limite de segurança
    ),
    -- Última venda histórica (otimizado com LEFT JOIN)
    ultimas_vendas AS (
      SELECT 
        pf.id,
        pf.filial_id,
        MAX(GREATEST(
          COALESCE(v.data_venda, ''1900-01-01''::DATE),
          COALESCE(vhi.data_extracao, ''1900-01-01''::DATE)
        )) as data_ultima_venda
      FROM produtos_filtrados pf
      LEFT JOIN %I.vendas v 
        ON v.id_produto = pf.id 
        AND v.filial_id = pf.filial_id
      LEFT JOIN %I.vendas_hoje_itens vhi 
        ON vhi.produto_id = pf.id 
        AND vhi.filial_id = pf.filial_id
        AND vhi.cancelado = false
      GROUP BY pf.id, pf.filial_id
    ),
    -- Produtos sem vendas no período
    produtos_sem_vendas AS (
      SELECT
        p.filial_id::BIGINT as filial_id,
        p.id::BIGINT as produto_id,
        p.descricao::TEXT as descricao,
        p.estoque_atual::NUMERIC(18,6) as estoque_atual,
        CASE 
          WHEN uv.data_ultima_venda = ''1900-01-01''::DATE THEN NULL
          ELSE uv.data_ultima_venda::DATE
        END as data_ultima_venda,
        p.preco_de_custo::NUMERIC(15,5) as preco_custo,
        p.curva_abcd::TEXT as curva_abcd,
        p.curva_lucro::VARCHAR(2) as curva_lucro,
        CASE 
          WHEN uv.data_ultima_venda = ''1900-01-01''::DATE THEN NULL
          ELSE ($1 - uv.data_ultima_venda)::INTEGER 
        END as dias_sem_venda
      FROM produtos_filtrados p
      INNER JOIN ultimas_vendas uv 
        ON p.id = uv.id 
        AND p.filial_id = uv.filial_id
      WHERE (
        uv.data_ultima_venda = ''1900-01-01''::DATE
        OR uv.data_ultima_venda < $2
      )
    ),
    -- Contagem total
    total AS (
      SELECT COUNT(*) as cnt FROM produtos_sem_vendas
    )
    -- Resultado paginado
    SELECT
      psv.filial_id,
      psv.produto_id,
      psv.descricao,
      psv.estoque_atual,
      psv.data_ultima_venda,
      psv.preco_custo,
      psv.curva_abcd,
      psv.curva_lucro,
      psv.dias_sem_venda,
      t.cnt::BIGINT as total_count
    FROM produtos_sem_vendas psv
    CROSS JOIN total t
    ORDER BY 
      psv.dias_sem_venda DESC NULLS LAST,
      psv.filial_id,
      psv.curva_abcd NULLS LAST,
      psv.descricao
    LIMIT $3
    OFFSET $4
  ',
  p_schema,
  v_filiais_condition,
  v_curva_condition,
  v_departamento_condition,
  v_produto_condition,
  p_schema,
  p_schema
  )
  USING CURRENT_DATE, v_data_limite, p_limit, p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_produtos_sem_vendas IS 
  'Retorna produtos sem vendas há X dias com paginação. Limite padrão: 500 registros.';

-- =====================================================
-- Criar script de índices por schema
-- =====================================================

-- Nota: Execute este bloco para cada schema (okilao, saoluiz, paraiso, lucia)
-- Substitua 'SCHEMA_NAME' pelo schema real

-- Exemplo para criar índices (execute manualmente para cada schema):
/*
-- Para schema: saoluiz
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_sem_vendas 
  ON saoluiz.produtos (filial_id, ativo, estoque_atual) 
  WHERE ativo = true AND estoque_atual > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_curva 
  ON saoluiz.produtos (curva_abcd, filial_id) 
  WHERE ativo = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_ultima 
  ON saoluiz.vendas (id_produto, filial_id, data_venda DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_hoje_ultima 
  ON saoluiz.vendas_hoje_itens (produto_id, filial_id, data_extracao DESC) 
  WHERE cancelado = false;
*/
