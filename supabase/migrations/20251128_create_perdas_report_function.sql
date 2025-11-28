-- =====================================================
-- Função RPC: get_perdas_report
-- Módulo: Relatório de Perdas
-- Data: 2025-11-28
-- Descrição: Retorna dados de perdas por filial/período
--            com hierarquia de departamentos (3 níveis)
-- =====================================================

-- DROP anterior se existir
DROP FUNCTION IF EXISTS public.get_perdas_report(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_perdas_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id INTEGER,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  dept_nivel3 TEXT,
  dept_nivel2 TEXT,
  dept_nivel1 TEXT,
  produto_codigo BIGINT,
  produto_descricao TEXT,
  filial_id INTEGER,
  qtde NUMERIC,
  valor_perda NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
BEGIN
  -- Validar parâmetros
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema é obrigatório';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;

  IF p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido';
  END IF;

  IF p_filial_id IS NULL THEN
    RAISE EXCEPTION 'Filial é obrigatória';
  END IF;

  -- Construir query dinâmica com schema
  -- Estrutura de departamentos:
  -- - departments_level_1: nível mais baixo (subgrupo), tem pai_level_2_id e pai_level_3_id
  -- - departments_level_2: nível intermediário (grupo)
  -- - departments_level_3: nível mais alto (departamento)
  --
  -- produtos.departamento_id SEMPRE referencia departments_level_1.departamento_id
  v_sql := format('
    SELECT
      COALESCE(d3.descricao, ''SEM DEPARTAMENTO'')::TEXT as dept_nivel3,
      COALESCE(d2.descricao, ''SEM GRUPO'')::TEXT as dept_nivel2,
      COALESCE(d1.descricao, ''SEM SUBGRUPO'')::TEXT as dept_nivel1,
      p.id::BIGINT as produto_codigo,
      p.descricao::TEXT as produto_descricao,
      per.filial_id::INTEGER,
      SUM(per.quantidade)::NUMERIC as qtde,
      SUM(per.valor_perda)::NUMERIC as valor_perda
    FROM %I.perdas per
    INNER JOIN %I.produtos p
      ON per.produto_id = p.id
      AND per.filial_id = p.filial_id
    LEFT JOIN %I.departments_level_1 d1
      ON p.departamento_id = d1.departamento_id
    LEFT JOIN %I.departments_level_2 d2
      ON d1.pai_level_2_id = d2.departamento_id
    LEFT JOIN %I.departments_level_3 d3
      ON d1.pai_level_3_id = d3.departamento_id
    WHERE per.filial_id = $1
      AND EXTRACT(MONTH FROM per.data_perda) = $2
      AND EXTRACT(YEAR FROM per.data_perda) = $3
    GROUP BY
      d3.descricao,
      d2.descricao,
      d1.descricao,
      p.id,
      p.descricao,
      per.filial_id
    ORDER BY
      d3.descricao NULLS LAST,
      d2.descricao NULLS LAST,
      d1.descricao NULLS LAST,
      SUM(per.valor_perda) DESC
  ', p_schema, p_schema, p_schema, p_schema, p_schema);

  -- Executar query com parâmetros
  RETURN QUERY EXECUTE v_sql USING p_filial_id, p_mes, p_ano;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_perdas_report IS
'Retorna relatório de perdas por filial e período com hierarquia de departamentos.
Parâmetros:
  - p_schema: Nome do schema do tenant
  - p_mes: Mês (1-12)
  - p_ano: Ano (ex: 2025)
  - p_filial_id: ID da filial
  - p_page: Página atual (não utilizado, reservado para paginação futura)
  - p_page_size: Registros por página (não utilizado, reservado para paginação futura)
Retorno: Dados agrupados por departamento e produto com quantidade e valor de perda.';

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_perdas_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_perdas_report TO service_role;


-- =====================================================
-- Função RPC: get_perdas_total_vendas_periodo
-- Módulo: Relatório de Perdas
-- Descrição: Retorna o total de vendas (receita bruta)
--            para uma filial em um mês/ano específico.
--            Usado para calcular o % Venda no relatório de Perdas.
-- =====================================================

DROP FUNCTION IF EXISTS public.get_total_vendas_periodo(TEXT, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_perdas_total_vendas_periodo(TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_perdas_total_vendas_periodo(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_total NUMERIC;
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  -- Validar parâmetros
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema é obrigatório';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;

  IF p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido';
  END IF;

  IF p_filial_id IS NULL THEN
    RAISE EXCEPTION 'Filial é obrigatória';
  END IF;

  -- Calcular intervalo de datas (usa índice em data_venda)
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + INTERVAL '1 month')::DATE;

  -- Construir query dinâmica com schema
  -- Usa filtro por range de datas para aproveitar índice em data_venda
  v_sql := 'SELECT COALESCE(SUM(valor_vendas), 0)::NUMERIC FROM ' || quote_ident(p_schema) || '.vendas WHERE filial_id = $1 AND data_venda >= $2 AND data_venda < $3';

  -- Executar query com parâmetros
  EXECUTE v_sql INTO v_total USING p_filial_id, v_data_inicio, v_data_fim;

  RETURN v_total;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_perdas_total_vendas_periodo IS
'[Módulo: Perdas] Retorna o total de vendas (receita bruta) para uma filial em um período específico.
Usado para calcular o percentual de perda sobre a venda (% Venda) no relatório de Perdas.
Parâmetros:
  - p_schema: Nome do schema do tenant
  - p_mes: Mês (1-12)
  - p_ano: Ano (ex: 2025)
  - p_filial_id: ID da filial
Retorno: Valor total de vendas no período.';

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_perdas_total_vendas_periodo TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_perdas_total_vendas_periodo TO service_role;


-- =====================================================
-- Função RPC: get_perdas_vendas_por_departamento
-- Módulo: Relatório de Perdas
-- Descrição: Retorna as vendas (receita bruta) agrupadas
--            por hierarquia de departamentos (3 níveis).
--            Usado para calcular o % Venda Setor no relatório de Perdas.
-- =====================================================

DROP FUNCTION IF EXISTS public.get_perdas_vendas_por_departamento(TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_perdas_vendas_por_departamento(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id INTEGER
)
RETURNS TABLE (
  dept_nivel3 TEXT,
  dept_nivel2 TEXT,
  dept_nivel1 TEXT,
  valor_vendas NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  -- Validar parâmetros
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema é obrigatório';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;

  IF p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido';
  END IF;

  IF p_filial_id IS NULL THEN
    RAISE EXCEPTION 'Filial é obrigatória';
  END IF;

  -- Calcular intervalo de datas (usa índice em data_venda)
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + INTERVAL '1 month')::DATE;

  -- Construir query dinâmica com schema
  -- Agrupa vendas por hierarquia de departamentos
  v_sql := format('
    SELECT
      COALESCE(d3.descricao, ''SEM DEPARTAMENTO'')::TEXT as dept_nivel3,
      COALESCE(d2.descricao, ''SEM GRUPO'')::TEXT as dept_nivel2,
      COALESCE(d1.descricao, ''SEM SUBGRUPO'')::TEXT as dept_nivel1,
      COALESCE(SUM(v.valor_vendas), 0)::NUMERIC as valor_vendas
    FROM %I.vendas v
    INNER JOIN %I.produtos p
      ON v.id_produto = p.id
      AND v.filial_id = p.filial_id
    LEFT JOIN %I.departments_level_1 d1
      ON p.departamento_id = d1.departamento_id
    LEFT JOIN %I.departments_level_2 d2
      ON d1.pai_level_2_id = d2.departamento_id
    LEFT JOIN %I.departments_level_3 d3
      ON d1.pai_level_3_id = d3.departamento_id
    WHERE v.filial_id = $1
      AND v.data_venda >= $2
      AND v.data_venda < $3
    GROUP BY
      d3.descricao,
      d2.descricao,
      d1.descricao
    ORDER BY
      d3.descricao NULLS LAST,
      d2.descricao NULLS LAST,
      d1.descricao NULLS LAST
  ', p_schema, p_schema, p_schema, p_schema, p_schema);

  -- Executar query com parâmetros
  RETURN QUERY EXECUTE v_sql USING p_filial_id, v_data_inicio, v_data_fim;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_perdas_vendas_por_departamento IS
'[Módulo: Perdas] Retorna as vendas (receita bruta) agrupadas por hierarquia de departamentos.
Usado para calcular o percentual de perda sobre a venda do setor (% Venda Setor) no relatório de Perdas.
Parâmetros:
  - p_schema: Nome do schema do tenant
  - p_mes: Mês (1-12)
  - p_ano: Ano (ex: 2025)
  - p_filial_id: ID da filial
Retorno: Vendas agrupadas por dept_nivel3, dept_nivel2, dept_nivel1.';

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_perdas_vendas_por_departamento TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_perdas_vendas_por_departamento TO service_role;
