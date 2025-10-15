-- Debug: Verificar dados disponíveis para o relatório de ruptura

-- 1. Verificar produtos ativos com curva A ou B
SELECT 
  'Produtos ativos curva A/B' as descricao,
  COUNT(*) as total
FROM okilao.produtos
WHERE ativo = true
  AND curva_abcd IN ('A', 'B');

-- 2. Verificar produtos com ruptura (estoque <= 0)
SELECT 
  'Produtos com ruptura' as descricao,
  COUNT(*) as total
FROM okilao.produtos
WHERE estoque_atual <= 0;

-- 3. Verificar produtos ativos, curva A/B e com ruptura
SELECT 
  'Produtos ativos, A/B e ruptura' as descricao,
  COUNT(*) as total
FROM okilao.produtos
WHERE ativo = true
  AND curva_abcd IN ('A', 'B')
  AND estoque_atual <= 0;

-- 4. Ver sample de produtos que atendem os critérios
SELECT 
  p.id,
  p.descricao,
  p.curva_abcd,
  p.estoque_atual,
  p.ativo,
  d.descricao as departamento
FROM okilao.produtos p
LEFT JOIN okilao.departments_level_1 d ON p.departamento_id = d.departamento_id
WHERE ativo = true
  AND curva_abcd IN ('A', 'B')
  AND estoque_atual <= 0
LIMIT 10;

-- 5. Verificar distribuição de curvas
SELECT 
  curva_abcd,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE estoque_atual <= 0) as com_ruptura,
  COUNT(*) FILTER (WHERE ativo = true) as ativos
FROM okilao.produtos
GROUP BY curva_abcd
ORDER BY curva_abcd;

-- 6. Testar a função diretamente
SELECT * FROM get_ruptura_abcd_report(
  p_schema := 'okilao',
  p_filial_id := NULL,
  p_curvas := ARRAY['A', 'B'],
  p_apenas_ativos := true,
  p_apenas_ruptura := true,
  p_departamento_id := NULL,
  p_busca := NULL,
  p_page := 1,
  p_page_size := 50
);
