-- =====================================================
-- Migration: Add hierarchical despesas to DRE Comparativo
-- Created: 2026-01-14
-- Description: Modifica get_dre_comparativo_data para incluir
--              tipos de despesa e despesas individuais na hierarquia
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_dre_comparativo_data(text, integer[], integer, integer);

-- Create new version with hierarchical despesas
CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data_v3(
  p_schema text, 
  p_filiais_ids integer[], 
  p_mes integer, 
  p_ano integer
)
RETURNS TABLE(
  receita_bruta_pdv numeric,
  receita_bruta_faturamento numeric,
  receita_bruta numeric,
  desconto_venda numeric,
  receita_liquida numeric,
  cmv_pdv numeric,
  cmv_faturamento numeric,
  cmv numeric,
  lucro_bruto numeric,
  margem_bruta numeric,
  despesas_operacionais numeric,
  resultado_operacional numeric,
  margem_operacional numeric,
  despesas_json jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_data_inicio DATE;
  v_data_fim DATE;
  v_receita_bruta_pdv NUMERIC := 0;
  v_cmv_pdv NUMERIC := 0;
  v_receita_bruta_faturamento NUMERIC := 0;
  v_cmv_faturamento NUMERIC := 0;
  v_receita_bruta NUMERIC := 0;
  v_desconto_venda NUMERIC := 0;
  v_receita_liquida NUMERIC := 0;
  v_cmv NUMERIC := 0;
  v_lucro_bruto NUMERIC := 0;
  v_margem_bruta NUMERIC := 0;
  v_despesas_operacionais NUMERIC := 0;
  v_resultado_operacional NUMERIC := 0;
  v_margem_operacional NUMERIC := 0;
  v_despesas_json JSONB := '[]'::JSONB;
  v_table_exists BOOLEAN;
BEGIN
  -- Validations
  IF p_schema IS NULL OR p_schema = '' THEN 
    RAISE EXCEPTION 'Schema é obrigatório'; 
  END IF;
  
  IF p_mes < 1 OR p_mes > 12 THEN 
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12'; 
  END IF;
  
  IF p_ano < 2000 OR p_ano > 2100 THEN 
    RAISE EXCEPTION 'Ano inválido'; 
  END IF;
  
  IF p_filiais_ids IS NULL OR array_length(p_filiais_ids, 1) IS NULL THEN 
    RAISE EXCEPTION 'Ao menos uma filial é obrigatória'; 
  END IF;

  -- Calculate date range
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- ============================================
  -- PDV (Vendas Diárias)
  -- ============================================
  EXECUTE format(
    'SELECT COALESCE(SUM(valor_total), 0)::NUMERIC 
     FROM %I.vendas_diarias_por_filial 
     WHERE data_venda BETWEEN $1 AND $2 
       AND filial_id = ANY($3)',
    p_schema
  ) INTO v_receita_bruta_pdv 
  USING v_data_inicio, v_data_fim, p_filiais_ids;

  EXECUTE format(
    'SELECT COALESCE(SUM(custo_total), 0)::NUMERIC 
     FROM %I.vendas_diarias_por_filial 
     WHERE data_venda BETWEEN $1 AND $2 
       AND filial_id = ANY($3)',
    p_schema
  ) INTO v_cmv_pdv 
  USING v_data_inicio, v_data_fim, p_filiais_ids;

  -- ============================================
  -- FATURAMENTO
  -- ============================================
  EXECUTE format(
    'SELECT EXISTS (
       SELECT 1 FROM information_schema.tables 
       WHERE table_schema = %L 
         AND table_name = ''faturamento''
     )', 
    p_schema
  ) INTO v_table_exists;

  IF v_table_exists THEN
    EXECUTE format(
      'SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC 
       FROM (
         SELECT DISTINCT ON (id_saida) id_saida, valor_contabil 
         FROM %I.faturamento 
         WHERE data_saida BETWEEN $1 AND $2 
           AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''') 
           AND filial_id = ANY($3)
       ) n',
      p_schema
    ) INTO v_receita_bruta_faturamento 
    USING v_data_inicio, v_data_fim, p_filiais_ids;

    EXECUTE format(
      'SELECT COALESCE(SUM(quantidade * custo_medio), 0)::NUMERIC 
       FROM %I.faturamento 
       WHERE data_saida BETWEEN $1 AND $2 
         AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''') 
         AND filial_id = ANY($3)',
      p_schema
    ) INTO v_cmv_faturamento 
    USING v_data_inicio, v_data_fim, p_filiais_ids;
  END IF;

  v_receita_bruta := v_receita_bruta_pdv + v_receita_bruta_faturamento;
  v_cmv := v_cmv_pdv + v_cmv_faturamento;

  -- ============================================
  -- DESCONTOS
  -- ============================================
  EXECUTE format(
    'SELECT EXISTS (
       SELECT 1 FROM information_schema.tables 
       WHERE table_schema = %L 
         AND table_name = ''descontos_venda''
     )',
    p_schema
  ) INTO v_table_exists;

  IF v_table_exists THEN
    EXECUTE format(
      'SELECT COALESCE(SUM(valor_desconto), 0)::NUMERIC 
       FROM %I.descontos_venda 
       WHERE data_desconto BETWEEN $1 AND $2 
         AND filial_id = ANY($3)',
      p_schema
    ) INTO v_desconto_venda 
    USING v_data_inicio, v_data_fim, p_filiais_ids;
  END IF;

  v_receita_liquida := v_receita_bruta - v_desconto_venda;
  v_lucro_bruto := v_receita_liquida - v_cmv;
  
  IF v_receita_liquida > 0 THEN 
    v_margem_bruta := (v_lucro_bruto / v_receita_liquida) * 100; 
  END IF;

  -- ============================================
  -- DESPESAS HIERÁRQUICAS (NOVO!)
  -- ============================================
  EXECUTE format('
    WITH despesas_completas AS (
      SELECT
        d.id AS departamento_id,
        d.descricao AS departamento,
        td.id AS tipo_id,
        td.descricao AS tipo,
        desp.descricao_despesa,
        desp.numero_nota,
        desp.serie_nota,
        desp.data_emissao,
        desp.valor
      FROM %I.despesas desp
      INNER JOIN %I.tipos_despesa td ON desp.id_tipo_despesa = td.id
      INNER JOIN %I.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
      WHERE desp.data_despesa BETWEEN $1 AND $2
        AND desp.filial_id = ANY($3)
    ),
    despesas_agrupadas AS (
      SELECT 
        departamento_id,
        departamento,
        tipo_id,
        tipo,
        jsonb_agg(
          jsonb_build_object(
            ''descricao'', descricao_despesa,
            ''numero_nota'', numero_nota,
            ''serie_nota'', serie_nota,
            ''data_emissao'', data_emissao,
            ''valor'', valor
          ) ORDER BY data_emissao DESC, valor DESC
        ) AS despesas,
        SUM(valor) AS tipo_valor
      FROM despesas_completas
      GROUP BY departamento_id, departamento, tipo_id, tipo
    ),
    tipos_agrupados AS (
      SELECT
        departamento_id,
        departamento,
        jsonb_agg(
          jsonb_build_object(
            ''tipo_id'', tipo_id,
            ''tipo'', tipo,
            ''valor'', tipo_valor,
            ''despesas'', despesas
          ) ORDER BY tipo_valor DESC
        ) AS tipos,
        SUM(tipo_valor) AS dept_valor
      FROM despesas_agrupadas
      GROUP BY departamento_id, departamento
    )
    SELECT 
      COALESCE(SUM(dept_valor), 0)::NUMERIC AS total_despesas,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''departamento_id'', departamento_id,
            ''departamento'', departamento,
            ''valor'', dept_valor,
            ''tipos'', tipos
          ) ORDER BY dept_valor DESC
        ),
        ''[]''::JSONB
      ) AS despesas_json
    FROM tipos_agrupados
  ', p_schema, p_schema, p_schema)
  INTO v_despesas_operacionais, v_despesas_json
  USING v_data_inicio, v_data_fim, p_filiais_ids;

  v_resultado_operacional := v_lucro_bruto - v_despesas_operacionais;
  
  IF v_receita_liquida > 0 THEN 
    v_margem_operacional := (v_resultado_operacional / v_receita_liquida) * 100; 
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    v_receita_bruta_pdv,
    v_receita_bruta_faturamento,
    v_receita_bruta,
    v_desconto_venda,
    v_receita_liquida,
    v_cmv_pdv,
    v_cmv_faturamento,
    v_cmv,
    v_lucro_bruto,
    v_margem_bruta,
    v_despesas_operacionais,
    v_resultado_operacional,
    v_margem_operacional,
    v_despesas_json;
END;
$function$;

-- Recriar função original para manter compatibilidade
CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data(
  p_schema text, 
  p_filiais_ids integer[], 
  p_mes integer, 
  p_ano integer
)
RETURNS TABLE(
  receita_bruta_pdv numeric,
  receita_bruta_faturamento numeric,
  receita_bruta numeric,
  desconto_venda numeric,
  receita_liquida numeric,
  cmv_pdv numeric,
  cmv_faturamento numeric,
  cmv numeric,
  lucro_bruto numeric,
  margem_bruta numeric,
  despesas_operacionais numeric,
  resultado_operacional numeric,
  margem_operacional numeric,
  despesas_json jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Redirecionar para v3
  RETURN QUERY 
  SELECT * FROM public.get_dre_comparativo_data_v3(
    p_schema, 
    p_filiais_ids, 
    p_mes, 
    p_ano
  );
END;
$function$;

-- Comentário de documentação
COMMENT ON FUNCTION public.get_dre_comparativo_data_v3 IS 
'Retorna dados do DRE Comparativo com hierarquia completa de despesas:
- Departamentos
- Tipos de Despesa
- Despesas Individuais (com nota fiscal, data, valor)

Versão 3: Adicionado hierarquia completa em despesas_json';

-- =====================================================
-- Também atualizar a versão v2 (com datas customizadas)
-- =====================================================

DROP FUNCTION IF EXISTS public.get_dre_comparativo_data_v2(text, integer[], date, date);

CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data_v2_v3(
  p_schema text,
  p_filiais_ids integer[],
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE(
  receita_bruta_pdv numeric,
  receita_bruta_faturamento numeric,
  receita_bruta numeric,
  desconto_venda numeric,
  receita_liquida numeric,
  cmv_pdv numeric,
  cmv_faturamento numeric,
  cmv numeric,
  lucro_bruto numeric,
  margem_bruta numeric,
  despesas_operacionais numeric,
  resultado_operacional numeric,
  margem_operacional numeric,
  despesas_json jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_receita_bruta_pdv NUMERIC := 0;
  v_cmv_pdv NUMERIC := 0;
  v_receita_bruta_faturamento NUMERIC := 0;
  v_cmv_faturamento NUMERIC := 0;
  v_receita_bruta NUMERIC := 0;
  v_desconto_venda NUMERIC := 0;
  v_receita_liquida NUMERIC := 0;
  v_cmv NUMERIC := 0;
  v_lucro_bruto NUMERIC := 0;
  v_margem_bruta NUMERIC := 0;
  v_despesas_operacionais NUMERIC := 0;
  v_resultado_operacional NUMERIC := 0;
  v_margem_operacional NUMERIC := 0;
  v_despesas_json JSONB := '[]'::JSONB;
  v_table_exists BOOLEAN;
BEGIN
  -- Validations
  IF p_schema IS NULL OR p_schema = '' THEN 
    RAISE EXCEPTION 'Schema é obrigatório'; 
  END IF;
  
  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN 
    RAISE EXCEPTION 'Período de datas é obrigatório'; 
  END IF;
  
  IF p_filiais_ids IS NULL OR array_length(p_filiais_ids, 1) IS NULL THEN 
    RAISE EXCEPTION 'Ao menos uma filial é obrigatória'; 
  END IF;

  -- ============================================
  -- PDV (Vendas Diárias)
  -- ============================================
  EXECUTE format(
    'SELECT COALESCE(SUM(valor_total), 0)::NUMERIC 
     FROM %I.vendas_diarias_por_filial 
     WHERE data_venda BETWEEN $1 AND $2 
       AND filial_id = ANY($3)',
    p_schema
  ) INTO v_receita_bruta_pdv 
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  EXECUTE format(
    'SELECT COALESCE(SUM(custo_total), 0)::NUMERIC 
     FROM %I.vendas_diarias_por_filial 
     WHERE data_venda BETWEEN $1 AND $2 
       AND filial_id = ANY($3)',
    p_schema
  ) INTO v_cmv_pdv 
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- ============================================
  -- FATURAMENTO
  -- ============================================
  EXECUTE format(
    'SELECT EXISTS (
       SELECT 1 FROM information_schema.tables 
       WHERE table_schema = %L 
         AND table_name = ''faturamento''
     )', 
    p_schema
  ) INTO v_table_exists;

  IF v_table_exists THEN
    EXECUTE format(
      'SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC 
       FROM (
         SELECT DISTINCT ON (id_saida) id_saida, valor_contabil 
         FROM %I.faturamento 
         WHERE data_saida BETWEEN $1 AND $2 
           AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''') 
           AND filial_id = ANY($3)
       ) n',
      p_schema
    ) INTO v_receita_bruta_faturamento 
    USING p_data_inicio, p_data_fim, p_filiais_ids;

    EXECUTE format(
      'SELECT COALESCE(SUM(quantidade * custo_medio), 0)::NUMERIC 
       FROM %I.faturamento 
       WHERE data_saida BETWEEN $1 AND $2 
         AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''') 
         AND filial_id = ANY($3)',
      p_schema
    ) INTO v_cmv_faturamento 
    USING p_data_inicio, p_data_fim, p_filiais_ids;
  END IF;

  v_receita_bruta := v_receita_bruta_pdv + v_receita_bruta_faturamento;
  v_cmv := v_cmv_pdv + v_cmv_faturamento;

  -- ============================================
  -- DESCONTOS
  -- ============================================
  EXECUTE format(
    'SELECT EXISTS (
       SELECT 1 FROM information_schema.tables 
       WHERE table_schema = %L 
         AND table_name = ''descontos_venda''
     )',
    p_schema
  ) INTO v_table_exists;

  IF v_table_exists THEN
    EXECUTE format(
      'SELECT COALESCE(SUM(valor_desconto), 0)::NUMERIC 
       FROM %I.descontos_venda 
       WHERE data_desconto BETWEEN $1 AND $2 
         AND filial_id = ANY($3)',
      p_schema
    ) INTO v_desconto_venda 
    USING p_data_inicio, p_data_fim, p_filiais_ids;
  END IF;

  v_receita_liquida := v_receita_bruta - v_desconto_venda;
  v_lucro_bruto := v_receita_liquida - v_cmv;
  
  IF v_receita_liquida > 0 THEN 
    v_margem_bruta := (v_lucro_bruto / v_receita_liquida) * 100; 
  END IF;

  -- ============================================
  -- DESPESAS HIERÁRQUICAS (NOVO!)
  -- ============================================
  EXECUTE format('
    WITH despesas_completas AS (
      SELECT
        d.id AS departamento_id,
        d.descricao AS departamento,
        td.id AS tipo_id,
        td.descricao AS tipo,
        desp.descricao_despesa,
        desp.numero_nota,
        desp.serie_nota,
        desp.data_emissao,
        desp.valor
      FROM %I.despesas desp
      INNER JOIN %I.tipos_despesa td ON desp.id_tipo_despesa = td.id
      INNER JOIN %I.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
      WHERE desp.data_despesa BETWEEN $1 AND $2
        AND desp.filial_id = ANY($3)
    ),
    despesas_agrupadas AS (
      SELECT 
        departamento_id,
        departamento,
        tipo_id,
        tipo,
        jsonb_agg(
          jsonb_build_object(
            ''descricao'', descricao_despesa,
            ''numero_nota'', numero_nota,
            ''serie_nota'', serie_nota,
            ''data_emissao'', data_emissao,
            ''valor'', valor
          ) ORDER BY data_emissao DESC, valor DESC
        ) AS despesas,
        SUM(valor) AS tipo_valor
      FROM despesas_completas
      GROUP BY departamento_id, departamento, tipo_id, tipo
    ),
    tipos_agrupados AS (
      SELECT
        departamento_id,
        departamento,
        jsonb_agg(
          jsonb_build_object(
            ''tipo_id'', tipo_id,
            ''tipo'', tipo,
            ''valor'', tipo_valor,
            ''despesas'', despesas
          ) ORDER BY tipo_valor DESC
        ) AS tipos,
        SUM(tipo_valor) AS dept_valor
      FROM despesas_agrupadas
      GROUP BY departamento_id, departamento
    )
    SELECT 
      COALESCE(SUM(dept_valor), 0)::NUMERIC AS total_despesas,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''departamento_id'', departamento_id,
            ''departamento'', departamento,
            ''valor'', dept_valor,
            ''tipos'', tipos
          ) ORDER BY dept_valor DESC
        ),
        ''[]''::JSONB
      ) AS despesas_json
    FROM tipos_agrupados
  ', p_schema, p_schema, p_schema)
  INTO v_despesas_operacionais, v_despesas_json
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  v_resultado_operacional := v_lucro_bruto - v_despesas_operacionais;
  
  IF v_receita_liquida > 0 THEN 
    v_margem_operacional := (v_resultado_operacional / v_receita_liquida) * 100; 
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    v_receita_bruta_pdv,
    v_receita_bruta_faturamento,
    v_receita_bruta,
    v_desconto_venda,
    v_receita_liquida,
    v_cmv_pdv,
    v_cmv_faturamento,
    v_cmv,
    v_lucro_bruto,
    v_margem_bruta,
    v_despesas_operacionais,
    v_resultado_operacional,
    v_margem_operacional,
    v_despesas_json;
END;
$function$;

-- Recriar v2 para manter compatibilidade
CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data_v2(
  p_schema text,
  p_filiais_ids integer[],
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE(
  receita_bruta_pdv numeric,
  receita_bruta_faturamento numeric,
  receita_bruta numeric,
  desconto_venda numeric,
  receita_liquida numeric,
  cmv_pdv numeric,
  cmv_faturamento numeric,
  cmv numeric,
  lucro_bruto numeric,
  margem_bruta numeric,
  despesas_operacionais numeric,
  resultado_operacional numeric,
  margem_operacional numeric,
  despesas_json jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Redirecionar para v2_v3
  RETURN QUERY 
  SELECT * FROM public.get_dre_comparativo_data_v2_v3(
    p_schema,
    p_filiais_ids,
    p_data_inicio,
    p_data_fim
  );
END;
$function$;
