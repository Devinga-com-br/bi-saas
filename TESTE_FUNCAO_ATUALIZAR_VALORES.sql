-- =====================================================
-- TESTE DA FUNÇÃO: atualizar_valores_realizados_todos_setores
-- Execute este script no SQL Editor do Supabase para testar
-- =====================================================

-- PASSO 1: Verificar se a função existe
-- ========================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%atualizar_valores%'
ORDER BY routine_name;

-- Resultado esperado:
-- atualizar_valores_realizados_metas_setor | FUNCTION | jsonb
-- atualizar_valores_realizados_todos_setores | FUNCTION | jsonb


-- PASSO 2: Verificar schemas disponíveis
-- ========================================
SELECT DISTINCT table_schema 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'public')
ORDER BY table_schema;

-- Resultado esperado: okilao, saoluiz, paraiso, lucia, etc


-- PASSO 3: Verificar se existem setores ativos
-- ==============================================
-- ⚠️ SUBSTITUIR 'okilao' pelo seu schema
SELECT id, nome, ativo 
FROM okilao.setores 
WHERE ativo = true 
LIMIT 10;


-- PASSO 4: Verificar estrutura da tabela vendas
-- ==============================================
-- ⚠️ SUBSTITUIR 'okilao' pelo seu schema
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'okilao' 
  AND table_name = 'vendas' 
  AND column_name LIKE '%valor%'
ORDER BY column_name;

-- Resultado esperado: deve mostrar 'valor_vendas'
-- ❌ Se mostrar 'valor_total_liquido', precisamos corrigir!


-- PASSO 5: Verificar se existem metas_setor criadas
-- ==================================================
-- ⚠️ SUBSTITUIR 'okilao' pelo seu schema
SELECT 
  ms.id,
  s.nome as setor,
  f.nome as filial,
  ms.data,
  ms.valor_meta,
  ms.valor_realizado,
  ms.diferenca
FROM okilao.metas_setor ms
JOIN okilao.setores s ON s.id = ms.setor_id
JOIN public.branches f ON f.id = ms.filial_id
WHERE EXTRACT(MONTH FROM ms.data) = 11  -- Novembro
  AND EXTRACT(YEAR FROM ms.data) = 2025
LIMIT 20;


-- PASSO 6: TESTAR A FUNÇÃO (COM DADOS REAIS)
-- ===========================================
-- ⚠️ SUBSTITUIR:
--   - 'okilao' pelo seu schema
--   - 11 pelo mês desejado (1-12)
--   - 2025 pelo ano desejado

SELECT * FROM public.atualizar_valores_realizados_todos_setores(
  p_schema := 'okilao',  -- ⬅️ SUBSTITUIR
  p_mes := 11,           -- ⬅️ SUBSTITUIR
  p_ano := 2025          -- ⬅️ SUBSTITUIR
);

-- Resultado esperado:
-- {
--   "success": true,
--   "message": "Processados X setores, Y metas atualizadas",
--   "total_setores": X,
--   "total_metas_atualizadas": Y,
--   "errors": [],
--   "periodo": { "mes": 11, "ano": 2025 }
-- }


-- PASSO 7: Verificar se os valores foram atualizados
-- ===================================================
-- ⚠️ SUBSTITUIR 'okilao' pelo seu schema
SELECT 
  s.nome as setor,
  f.nome as filial,
  ms.data,
  ms.valor_meta,
  ms.valor_realizado,  -- ⬅️ Deve estar preenchido agora!
  ms.diferenca,
  ms.diferenca_percentual,
  ms.updated_at
FROM okilao.metas_setor ms
JOIN okilao.setores s ON s.id = ms.setor_id
JOIN public.branches f ON f.id = ms.filial_id
WHERE EXTRACT(MONTH FROM ms.data) = 11  -- Novembro
  AND EXTRACT(YEAR FROM ms.data) = 2025
ORDER BY s.nome, f.nome, ms.data
LIMIT 50;


-- PASSO 8: Verificar vendas do período (para conferir dados)
-- ===========================================================
-- ⚠️ SUBSTITUIR 'okilao' pelo seu schema
SELECT 
  DATE_TRUNC('day', v.data_venda) as dia,
  s.nome as setor,
  f.nome as filial,
  SUM(v.valor_vendas) as total_vendas,
  COUNT(*) as qtd_vendas
FROM okilao.vendas v
JOIN okilao.setores s ON s.id = v.setor_id
JOIN public.branches f ON f.id = v.filial_id
WHERE EXTRACT(MONTH FROM v.data_venda) = 11
  AND EXTRACT(YEAR FROM v.data_venda) = 2025
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3
LIMIT 50;


-- =====================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- =====================================================

/*
✅ SE PASSO 6 RETORNAR success: true
   → A função está funcionando no banco
   → O problema está no frontend/API
   → Verificar console do navegador e logs da API

❌ SE PASSO 6 RETORNAR ERRO
   → Anotar a mensagem de erro completa
   → Verificar passos anteriores
   → Enviar erro para análise

⚠️ SE PASSO 7 MOSTRAR valor_realizado = 0
   → Verificar PASSO 8 se existem vendas no período
   → Verificar se setor_id está correto nas vendas
   → Verificar se filial_id está correto nas vendas

📝 DICA: Copie e cole os resultados em um arquivo de texto
   para facilitar a análise e compartilhamento
*/
