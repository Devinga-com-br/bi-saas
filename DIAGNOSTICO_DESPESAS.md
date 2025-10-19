# 🔧 Diagnóstico - Módulo de Despesas

## ✅ Status das Tabelas (Verificado)

```
✅ departamentos_nivel1: 32 departamentos
✅ tipos_despesa: 177 tipos
✅ despesas: 17.709 despesas
```

## 🔍 Próximos Passos de Verificação

### 1. Verificar Foreign Keys

Execute no SQL Editor do Supabase (substitua 'okilao' pelo seu schema):

```sql
-- Verificar se FKs existem
SELECT
  tc.table_name, 
  tc.constraint_name,
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'okilao'
AND tc.table_name IN ('despesas', 'tipos_despesa')
ORDER BY tc.table_name;
```

**Resultado esperado:**
```
table_name | constraint_name     | column_name      | foreign_table_name  | foreign_column_name
-----------|---------------------|------------------|---------------------|--------------------
despesas   | fk_despesas_tipo    | tipo_despesa_id  | tipos_despesa       | id
tipos_despesa | fk_tipos_dept    | departamentalizacao_nivel1 | departamentos_nivel1 | id
```

### 2. Se as FKs NÃO existirem, crie-as:

```sql
-- FK: despesas → tipos_despesa
ALTER TABLE okilao.despesas
ADD CONSTRAINT fk_despesas_tipo
FOREIGN KEY (tipo_despesa_id)
REFERENCES okilao.tipos_despesa(id);

-- FK: tipos_despesa → departamentos_nivel1
ALTER TABLE okilao.tipos_despesa
ADD CONSTRAINT fk_tipos_dept
FOREIGN KEY (departamentalizacao_nivel1)
REFERENCES okilao.departamentos_nivel1(id);
```

### 3. Verificar Integridade dos Dados

```sql
-- Verificar se há despesas órfãs (sem tipo válido)
SELECT COUNT(*) as despesas_orfas
FROM okilao.despesas d
LEFT JOIN okilao.tipos_despesa td ON d.tipo_despesa_id = td.id
WHERE td.id IS NULL;

-- Verificar se há tipos órfãos (sem departamento válido)
SELECT COUNT(*) as tipos_orfaos
FROM okilao.tipos_despesa td
LEFT JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE d.id IS NULL;

-- Verificar despesas com data_emissao preenchida
SELECT 
  COUNT(*) as total,
  COUNT(data_emissao) as com_data_emissao,
  COUNT(*) - COUNT(data_emissao) as sem_data_emissao
FROM okilao.despesas;
```

### 4. Verificar Dados por Filial e Período

```sql
-- Ver despesas agrupadas por filial e mês
SELECT 
  filial_id,
  TO_CHAR(data_emissao, 'YYYY-MM') as mes,
  COUNT(*) as qtd_despesas,
  SUM(valor) as valor_total
FROM okilao.despesas
WHERE data_emissao IS NOT NULL
  AND data_emissao >= '2024-01-01'
GROUP BY filial_id, TO_CHAR(data_emissao, 'YYYY-MM')
ORDER BY filial_id, mes DESC
LIMIT 20;
```

### 5. Testar Query Completa (Com Joins)

```sql
-- Esta é a query que o sistema usa
SELECT 
  d.id as dept_id,
  d.descricao as dept_descricao,
  td.id as tipo_id,
  td.descricao as tipo_descricao,
  desp.data_emissao,
  desp.descricao_despesa,
  desp.valor
FROM okilao.despesas desp
INNER JOIN okilao.tipos_despesa td ON desp.tipo_despesa_id = td.id
INNER JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE desp.filial_id = 1  -- Trocar pelo ID da sua filial
  AND desp.data_emissao >= '2024-01-01'
  AND desp.data_emissao <= '2024-12-31'
ORDER BY desp.data_emissao DESC
LIMIT 10;
```

**Se esta query retornar dados, o módulo funcionará!**

### 6. Verificar Schema Exposto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings** → **API**
4. Role até **Exposed schemas**
5. Verifique se **`okilao`** (ou seu schema) está na lista
6. Se NÃO estiver, clique em **Add schema**, digite `okilao` e salve

### 7. Testar no Frontend

Após executar os passos acima:

1. Acesse: `http://localhost:3000/despesas` (ou sua URL)
2. Abra o Console do navegador (F12)
3. Selecione:
   - **Filial**: Uma filial que tenha dados (verificar na query do passo 4)
   - **Data Inicial**: 01/01/2024 (ou período com dados)
   - **Data Final**: 31/12/2024
4. Observe os logs no console:

```
✅ Deve aparecer:
[API Despesas] Params: { schema: 'okilao', filialId: '1', dataInicial: '2024-01-01', dataFinal: '2024-12-31' }
[API] Despesas encontradas: 150 (ou outro número > 0)
[API] Resposta: { totalizador: { valorTotal: 50000, ... }, ... }
```

```
❌ Se aparecer erro:
- "relation does not exist" → Schema não exposto
- "violates foreign key constraint" → Criar FKs (passo 2)
- Despesas encontradas: 0 → Período sem dados (verificar passo 4)
```

## 📊 Resumo do Diagnóstico

| Item | Status | Ação |
|------|--------|------|
| Tabelas existem | ✅ Verificado | - |
| Dados existem | ✅ 17.709 despesas | - |
| Foreign Keys | ❓ Verificar | Executar query do passo 1 |
| Dados órfãos | ❓ Verificar | Executar query do passo 3 |
| Schema exposto | ❓ Verificar | Verificar passo 6 |
| data_emissao preenchida | ❓ Verificar | Executar query do passo 3 |

## 🔧 Comandos de Correção Rápida

Se encontrar problemas, execute na ordem:

```sql
-- 1. Criar FKs (se não existirem)
ALTER TABLE okilao.despesas
ADD CONSTRAINT fk_despesas_tipo
FOREIGN KEY (tipo_despesa_id)
REFERENCES okilao.tipos_despesa(id);

ALTER TABLE okilao.tipos_despesa
ADD CONSTRAINT fk_tipos_dept
FOREIGN KEY (departamentalizacao_nivel1)
REFERENCES okilao.departamentos_nivel1(id);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_data_emissao 
  ON okilao.despesas(data_emissao);

CREATE INDEX IF NOT EXISTS idx_despesas_filial_emissao 
  ON okilao.despesas(filial_id, data_emissao);

CREATE INDEX IF NOT EXISTS idx_despesas_tipo 
  ON okilao.despesas(tipo_despesa_id);

CREATE INDEX IF NOT EXISTS idx_tipos_dept 
  ON okilao.tipos_despesa(departamentalizacao_nivel1);
```

## 🎯 Teste Simples

Execute esta query para testar tudo de uma vez:

```sql
-- Teste completo: buscar despesas com todos os joins
WITH despesas_teste AS (
  SELECT 
    d.descricao as departamento,
    td.descricao as tipo,
    desp.descricao_despesa,
    desp.valor,
    desp.data_emissao
  FROM okilao.despesas desp
  INNER JOIN okilao.tipos_despesa td ON desp.tipo_despesa_id = td.id
  INNER JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
  WHERE desp.data_emissao >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY desp.data_emissao DESC
  LIMIT 5
)
SELECT 
  COUNT(*) as registros_encontrados,
  SUM(valor) as valor_total
FROM despesas_teste;
```

**Se retornar registros_encontrados > 0, está tudo OK!**

---

## 📞 Próximos Passos

1. Execute as queries de verificação acima
2. Compartilhe os resultados se encontrar algum problema
3. Principalmente:
   - Resultado da query de Foreign Keys (passo 1)
   - Resultado da query de integridade (passo 3)
   - Resultado do teste simples (último comando)

**Com essas informações poderei ajudar a resolver qualquer problema restante!**
