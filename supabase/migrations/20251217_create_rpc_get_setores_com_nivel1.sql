-- ============================================================================
-- RPC: get_setores_com_nivel1
-- ============================================================================
-- Data: 2025-12-17
-- Descricao: Retorna setores com os departamento_ids de nível 1 mapeados
-- Isso é necessário porque setores podem ter departamentos de qualquer nível (1-6)
-- mas os produtos sempre têm departamento_id de nível 1
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_setores_com_nivel1(text);

CREATE OR REPLACE FUNCTION public.get_setores_com_nivel1(
  p_schema text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '30s'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  EXECUTE format('
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        ''id'', s.id,
        ''nome'', s.nome,
        ''departamento_nivel'', s.departamento_nivel,
        ''departamento_ids'', s.departamento_ids,
        ''ativo'', s.ativo,
        ''departamento_ids_nivel_1'', (
          SELECT COALESCE(ARRAY_AGG(DISTINCT dl1.departamento_id), ARRAY[]::bigint[])
          FROM %I.departments_level_1 dl1
          WHERE
            (s.departamento_nivel = 1 AND dl1.departamento_id = ANY(s.departamento_ids))
            OR (s.departamento_nivel = 2 AND dl1.pai_level_2_id = ANY(s.departamento_ids))
            OR (s.departamento_nivel = 3 AND dl1.pai_level_3_id = ANY(s.departamento_ids))
            OR (s.departamento_nivel = 4 AND dl1.pai_level_4_id = ANY(s.departamento_ids))
            OR (s.departamento_nivel = 5 AND dl1.pai_level_5_id = ANY(s.departamento_ids))
            OR (s.departamento_nivel = 6 AND dl1.pai_level_6_id = ANY(s.departamento_ids))
        )
      )
    ORDER BY s.nome), ''[]''::jsonb)
    FROM %I.setores s
    WHERE s.ativo = true
  ', p_schema, p_schema)
  INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_setores_com_nivel1 IS
'Retorna setores ativos com os departamento_ids de nível 1 mapeados.

PARAMETROS:
- p_schema: Schema do tenant (ex: okilao, lucia, paraiso)

RETORNO:
Array JSON com objetos contendo:
- id: ID do setor
- nome: Nome do setor
- departamento_nivel: Nível original do setor (1-6)
- departamento_ids: IDs dos departamentos no nível original
- ativo: Status do setor
- departamento_ids_nivel_1: IDs dos departamentos de nível 1 mapeados

EXEMPLO:
SELECT public.get_setores_com_nivel1(''lucia'');
';
