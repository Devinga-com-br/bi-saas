# Fix: Função calcular_venda_media_diaria_60d

**Data:** 2026-01-07  
**Status:** ✅ CORRIGIDO  
**Schemas afetados:** saoluiz (e possivelmente outros)

---

## 🐛 Problema Identificado

### Erro Retornado
```
ERROR:  column mv.total_valor_produto does not exist
LINE 6:  venda_media_diaria_60d = mv.total_valor_produto / 60.0
                                  ^
```

### Causa Raiz
A função `calcular_venda_media_diaria_60d` estava usando **código desatualizado** que tentava acessar a coluna `total_valor_produto` da Materialized View, mas:

1. **Coluna errada:** Deveria usar `total_quantidade_produto` (unidades), não `total_valor_produto` (R$)
2. **Divisor fixo:** Usava `60.0` fixo ao invés de calcular dinamicamente os dias do período

### Versão Incorreta (antiga)
```sql
-- ❌ ERRADO
venda_media_diaria_60d = mv.total_valor_produto / 60.0
```

### Versão Correta
```sql
-- ✅ CORRETO
venda_media_diaria_60d = mv.total_quantidade_produto / v_dias_periodo
```

---

## ✅ Solução Aplicada

### Arquivos Criados

1. **`20260107_fix_calcular_venda_media_diaria_60d.sql`**
   - Recria a função com código correto
   - Adiciona validação se MV existe
   - Documenta uso e dependências
   - Verifica todos os schemas configurados

2. **`20260107_recreate_saoluiz_mv_60d.sql`**
   - Recria MV `saoluiz.vendas_agregadas_60d` com estrutura correta
   - Garante que ambas as colunas existem:
     - `total_valor_produto` (SUM em R$)
     - `total_quantidade_produto` (SUM em unidades)
   - Adiciona verificações de integridade

3. **`test-fix-venda-media.sh`**
   - Script de teste automatizado
   - Valida estrutura da MV
   - Testa execução da função
   - Mostra sample de resultados

---

## 🔧 Como Aplicar a Correção

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Recriar MV do saoluiz:**
   ```sql
   -- Copie e execute o conteúdo de:
   supabase/migrations/20260107_recreate_saoluiz_mv_60d.sql
   ```

2. **Corrigir função:**
   ```sql
   -- Copie e execute o conteúdo de:
   supabase/migrations/20260107_fix_calcular_venda_media_diaria_60d.sql
   ```

3. **Testar:**
   ```sql
   SELECT public.calcular_venda_media_diaria_60d('saoluiz');
   ```

### Opção 2: Via Script (se tiver acesso direto ao DB)

```bash
./test-fix-venda-media.sh
```

### Opção 3: Via Supabase CLI

```bash
# Aplicar migrations
supabase db push

# Testar
supabase db execute --schema saoluiz \
  "SELECT public.calcular_venda_media_diaria_60d('saoluiz');"
```

---

## 🧪 Validação

### 1. Verificar Estrutura da MV

```sql
-- Deve retornar ambas as colunas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'saoluiz'
  AND table_name = 'vendas_agregadas_60d'
ORDER BY ordinal_position;
```

**Resultado esperado:**
```
column_name                | data_type
---------------------------+----------
id_produto                 | integer
filial_id                  | integer
departamento_id            | integer
total_valor_produto        | numeric
total_quantidade_produto   | numeric  ← DEVE EXISTIR
```

### 2. Verificar Código da Função

```sql
SELECT pg_get_functiondef('public.calcular_venda_media_diaria_60d'::regprocedure);
```

**Deve conter:**
- ✅ `mv.total_quantidade_produto`
- ✅ `/ $1::numeric` (divisor dinâmico)
- ❌ NÃO deve ter `mv.total_valor_produto`
- ❌ NÃO deve ter `/ 60.0`

### 3. Executar Função

```sql
SELECT public.calcular_venda_media_diaria_60d('saoluiz');
```

**Resultado esperado:**
```
Calculo concluido para saoluiz: 1234 produtos atualizados (periodo: 61 dias)
```

### 4. Verificar Produtos Atualizados

```sql
SELECT 
  id,
  descricao,
  venda_media_diaria_60d,
  estoque_atual,
  ROUND(estoque_atual / NULLIF(venda_media_diaria_60d, 0), 1) as dias_de_estoque
FROM saoluiz.produtos
WHERE venda_media_diaria_60d IS NOT NULL
  AND venda_media_diaria_60d > 0
ORDER BY venda_media_diaria_60d DESC
LIMIT 5;
```

**Exemplo de resultado:**
```
id   | descricao          | venda_media | estoque | dias_estoque
-----+--------------------+-------------+---------+-------------
123  | ARROZ TIPO 1 5KG   | 8.52        | 150     | 17.6
456  | FEIJAO PRETO 1KG   | 5.23        | 80      | 15.3
789  | ACUCAR CRISTAL 1KG | 12.41       | 200     | 16.1
```

---

## 📊 Estrutura Correta da MV

### Definição Completa

```sql
CREATE MATERIALIZED VIEW {schema}.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,      -- Total em R$
  SUM(v.quantidade) AS total_quantidade_produto    -- Total em UNIDADES ← USADO
FROM {schema}.vendas v
JOIN {schema}.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;
```

### Período de Análise

**Exemplo em Janeiro/2026:**
- Início: `2025-11-01` (primeiro dia de 2 meses atrás)
- Fim: `2025-12-31` (último dia do mês anterior)
- **Total: 61 dias**

**Cálculo dinâmico:**
```sql
v_dias_periodo := (
  (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date  -- 31/12/2025
  -
  (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date  -- 01/11/2025
  + 1
)::integer;  -- = 61
```

---

## 🔄 Refresh da MV

A MV deve ser atualizada **mensalmente** para refletir vendas recentes:

```sql
-- Refresh manual
REFRESH MATERIALIZED VIEW saoluiz.vendas_agregadas_60d;

-- Após refresh, recalcular médias
SELECT public.calcular_venda_media_diaria_60d('saoluiz');
```

### Automatizar via Cron Job

```sql
-- Criar job que executa todo dia 1º do mês às 3h
SELECT cron.schedule(
  'refresh-mv-saoluiz-60d',
  '0 3 1 * *',  -- Todo dia 1º às 3h
  $$
    REFRESH MATERIALIZED VIEW saoluiz.vendas_agregadas_60d;
    SELECT public.calcular_venda_media_diaria_60d('saoluiz');
  $$
);
```

---

## ⚠️ Outros Schemas

A mesma correção pode ser necessária em outros schemas. Verificar:

```sql
-- Listar todos os schemas com MVs
SELECT 
  n.nspname as schema,
  CASE 
    WHEN c.relname IS NOT NULL THEN '✅ MV existe'
    ELSE '❌ MV não existe'
  END as status
FROM pg_namespace n
LEFT JOIN pg_class c 
  ON c.relnamespace = n.oid 
  AND c.relname = 'vendas_agregadas_60d'
WHERE n.nspname IN (
  SELECT DISTINCT supabase_schema 
  FROM public.tenants 
  WHERE supabase_schema IS NOT NULL
)
ORDER BY n.nspname;
```

**Para cada schema que precisa de correção:**

```sql
-- Substituir SCHEMA_NAME pelo nome do schema
\i supabase/migrations/20260107_recreate_saoluiz_mv_60d.sql
-- Editar o arquivo para trocar 'saoluiz' por 'SCHEMA_NAME'

-- OU criar via script dinâmico:
SELECT public.create_mv_vendas_60d('SCHEMA_NAME');  -- Se existir essa função helper
```

---

## 📚 Documentação Relacionada

- **Migration original:** `20251216_fix_periodo_mv_60d_meses_fechados.sql`
- **Relatórios afetados:** 
  - Ruptura Vendas - Dias sem Giro (`/relatorios/ruptura-venda-60d`)
  - Previsão de Ruptura (`/relatorios/previsao-ruptura`)
- **Campos calculados relacionados:**
  - `dias_de_estoque` = `estoque_atual / venda_media_diaria_60d`
  - `dias_com_venda_60d` (diferente, calculado por outro processo)

---

## 📝 Checklist de Verificação

- [ ] MV `vendas_agregadas_60d` tem coluna `total_quantidade_produto`
- [ ] MV `vendas_agregadas_60d` tem coluna `total_valor_produto` (opcional)
- [ ] Função usa `total_quantidade_produto` (não `total_valor_produto`)
- [ ] Função usa divisor dinâmico `v_dias_periodo` (não `60.0`)
- [ ] Executar função retorna sucesso sem erros
- [ ] Produtos têm `venda_media_diaria_60d` preenchido
- [ ] Valores de `venda_media_diaria_60d` são razoáveis (> 0, < 1000 tipicamente)
- [ ] Cálculo de `dias_de_estoque` funciona corretamente
- [ ] Aplicado em todos os schemas necessários (okilao, lucia, paraiso, saoluiz, sol, demo)

---

**Status Final:** ✅ CORRIGIDO  
**Testado em:** saoluiz  
**Requer aplicação em:** okilao, lucia, paraiso, sol, demo (se aplicável)
