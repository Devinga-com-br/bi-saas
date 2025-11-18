-- ============================================================================
-- ÍNDICES RESTANTES - Schema PARAISO
-- ============================================================================
-- Os índices críticos de vendas já existem.
-- Este script cria apenas os índices auxiliares faltantes.
-- ============================================================================

-- Índices para JOINs dinâmicos (departments_level_1)
CREATE INDEX IF NOT EXISTS idx_dept_pai_level_2
ON paraiso.departments_level_1(pai_level_2_id)
INCLUDE (departamento_id)
WHERE pai_level_2_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dept_pai_level_3
ON paraiso.departments_level_1(pai_level_3_id)
INCLUDE (departamento_id)
WHERE pai_level_3_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dept_pai_level_4
ON paraiso.departments_level_1(pai_level_4_id)
INCLUDE (departamento_id)
WHERE pai_level_4_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dept_pai_level_5
ON paraiso.departments_level_1(pai_level_5_id)
INCLUDE (departamento_id)
WHERE pai_level_5_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dept_pai_level_6
ON paraiso.departments_level_1(pai_level_6_id)
INCLUDE (departamento_id)
WHERE pai_level_6_id IS NOT NULL;

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_produtos_dept_filial
ON paraiso.produtos(departamento_id, filial_id)
INCLUDE (id);

CREATE INDEX IF NOT EXISTS idx_descontos_data_filial
ON paraiso.descontos_venda(data_desconto, filial_id)
INCLUDE (valor_desconto)
WHERE valor_desconto IS NOT NULL;

-- Atualizar estatísticas
ANALYZE paraiso.metas_setor;
ANALYZE paraiso.vendas;
ANALYZE paraiso.produtos;
ANALYZE paraiso.departments_level_1;
ANALYZE paraiso.descontos_venda;
ANALYZE paraiso.setores;
