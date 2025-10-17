-- Migration: Create function for N8N integration - Daily sales with goals
-- Description: Returns daily sales data by branch with goal achievement for WhatsApp notifications
-- Created: 2025-10-17

CREATE OR REPLACE FUNCTION get_vendas_diarias_com_metas(
  p_schema TEXT,
  p_data DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Build and execute dynamic query to get sales data with goals
  EXECUTE format('
    SELECT jsonb_agg(
      jsonb_build_object(
        ''filial_id'', v.filial_id,
        ''filial_codigo'', b.branch_code,
        ''data'', v.data_venda,
        ''vendas'', jsonb_build_object(
          ''valor_total'', COALESCE(v.valor_total, 0),
          ''custo_total'', COALESCE(v.custo_total, 0),
          ''total_lucro'', COALESCE(v.total_lucro, 0),
          ''total_transacoes'', COALESCE(v.total_transacoes, 0),
          ''ticket_medio'', CASE 
            WHEN COALESCE(v.total_transacoes, 0) > 0 
            THEN ROUND(v.valor_total / v.total_transacoes, 2)
            ELSE 0 
          END
        ),
        ''meta'', jsonb_build_object(
          ''valor_meta'', COALESCE(m.valor_meta, 0),
          ''valor_realizado'', COALESCE(m.valor_realizado, 0),
          ''percentual_atingimento'', CASE
            WHEN COALESCE(m.valor_meta, 0) > 0
            THEN ROUND((m.valor_realizado / m.valor_meta) * 100, 2)
            ELSE 0
          END,
          ''diferenca'', COALESCE(m.diferenca, 0),
          ''status'', CASE
            WHEN m.valor_realizado >= m.valor_meta THEN ''atingida''
            WHEN m.valor_realizado >= (m.valor_meta * 0.9) THEN ''proximo''
            ELSE ''abaixo''
          END
        )
      )
    )
    FROM %I.vendas_diarias_por_filial v
    INNER JOIN public.branches b ON b.branch_code = v.filial_id::text
    LEFT JOIN %I.metas_mensais m ON m.filial_id = v.filial_id AND m.data = v.data_venda
    WHERE v.data_venda = $1
      AND b.tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = $2)
    ORDER BY v.filial_id
  ', p_schema, p_schema)
  INTO v_result
  USING p_data, p_schema;

  -- Return empty array if no results
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_vendas_diarias_com_metas(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendas_diarias_com_metas(TEXT, DATE) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_vendas_diarias_com_metas(TEXT, DATE) IS 
'Returns daily sales data by branch with goal achievement in JSON format. 
Used for N8N integrations and WhatsApp notifications.
Parameters:
  - p_schema: Tenant schema name
  - p_data: Specific date for the report';
