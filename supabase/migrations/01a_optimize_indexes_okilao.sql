-- ============================================================================
-- OTIMIZAÇÃO: Índices - Schema paraiso
-- ============================================================================
-- INSTRUÇÕES: Para outros schemas, substitua TODAS as ocorrências de 'paraiso'
-- ============================================================================

-- PARTE 1: Remover índices redundantes
DROP INDEX IF EXISTS paraiso.idx_metas_setor_setor_data;
DROP INDEX IF EXISTS paraiso.idx_metas_setor_month_year;

-- PARTE 2: Criar índice covering em vendas (CRÍTICO - 85% do ganho)
CREATE INDEX IF NOT EXISTS idx_vendas_data_covering
ON paraiso.vendas(data_venda, filial_id, id_produto)
INCLUDE (valor_vendas)
WHERE data_venda >= '2024-01-01';

CREATE INDEX IF NOT EXISTS idx_vendas_month_year_covering
ON paraiso.vendas(
  (EXTRACT(MONTH FROM data_venda)),
  (EXTRACT(YEAR FROM data_venda)),
  filial_id,
  id_produto
)
INCLUDE (valor_vendas)
WHERE data_venda >= '2024-01-01';

-- PARTE 3: Criar índices para JOINs dinâmicos
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

-- PARTE 4: Criar índices auxiliares
CREATE INDEX IF NOT EXISTS idx_produtos_dept_filial
ON paraiso.produtos(departamento_id, filial_id)
INCLUDE (id);

CREATE INDEX IF NOT EXISTS idx_descontos_data_filial
ON paraiso.descontos_venda(data_desconto, filial_id)
INCLUDE (valor_desconto)
WHERE valor_desconto IS NOT NULL;

-- PARTE 5: Atualizar estatísticas (ANALYZE)
ANALYZE paraiso.metas_setor;
ANALYZE paraiso.vendas;
ANALYZE paraiso.produtos;
ANALYZE paraiso.departments_level_1;
ANALYZE paraiso.descontos_venda;
ANALYZE paraiso.setores;
ANALYZE paraiso.filiais;
