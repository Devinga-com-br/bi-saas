-- Migration: Adiciona filtro de filiais ao gráfico de vendas mensais
--
-- Esta migração atualiza a função get_sales_by_month_chart para aceitar
-- um parâmetro opcional p_filiais que permite filtrar vendas por filiais autorizadas.
--
-- Importante para segurança: usuários com restrições de filiais devem ver
-- apenas dados das filiais que têm permissão de acesso.

CREATE OR REPLACE FUNCTION get_sales_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  filial_filter TEXT;
BEGIN
  -- Construir filtro de filiais
  IF p_filiais IS NOT NULL AND p_filiais != 'all' AND p_filiais != '' THEN
    -- Converter string '1,2,3' para condição SQL
    -- p_filiais contém branch_codes como string separada por vírgulas
    filial_filter := format('AND vdf.filial_id IN (%s)', p_filiais);
  ELSE
    -- NULL, 'all' ou vazio = sem filtro (todas as filiais)
    filial_filter := '';
  END IF;

  EXECUTE format(
    $q$
    SELECT json_agg(t)
    FROM (
      WITH meses AS (
        SELECT * FROM (VALUES
            (1, 'Jan'), (2, 'Fev'), (3, 'Mar'), (4, 'Abr'),
            (5, 'Mai'), (6, 'Jun'), (7, 'Jul'), (8, 'Ago'),
            (9, 'Set'), (10, 'Out'), (11, 'Nov'), (12, 'Dez')
        ) AS t (mes_num, mes_nome)
      )
      SELECT
        m.mes_nome AS mes,
        COALESCE(SUM(CASE
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN vdf.valor_total
          ELSE 0
        END), 0)::numeric(10, 2) AS total_vendas,
        COALESCE(SUM(CASE
          WHEN EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
          THEN vdf.valor_total
          ELSE 0
        END), 0)::numeric(10, 2) AS total_vendas_ano_anterior
      FROM
        meses m
      LEFT JOIN
        %I.vendas_diarias_por_filial vdf ON m.mes_num = EXTRACT(MONTH FROM vdf.data_venda)
                                         AND (EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
                                          OR EXTRACT(YEAR FROM vdf.data_venda) = EXTRACT(YEAR FROM CURRENT_DATE) - 1)
                                         %s
      GROUP BY
        m.mes_num, m.mes_nome
      ORDER BY
        m.mes_num
    ) t;
    $q$,
    schema_name,
    filial_filter
  ) INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Comentário sobre o que foi alterado:
-- 1. Adicionado parâmetro p_filiais TEXT DEFAULT NULL
-- 2. Construção de filtro dinâmico baseado em p_filiais
-- 3. Se p_filiais for NULL, 'all' ou vazio: retorna dados de todas as filiais
-- 4. Se p_filiais contiver IDs (ex: '1,2,3'): filtra apenas essas filiais
-- 5. O filtro é aplicado no LEFT JOIN com a cláusula AND vdf.filial_id IN (...)
--
-- Exemplos de uso:
-- SELECT get_sales_by_month_chart('tenant_schema');              -- Todas as filiais
-- SELECT get_sales_by_month_chart('tenant_schema', 'all');       -- Todas as filiais
-- SELECT get_sales_by_month_chart('tenant_schema', '1');         -- Apenas filial 1
-- SELECT get_sales_by_month_chart('tenant_schema', '1,2,3');     -- Filiais 1, 2 e 3
