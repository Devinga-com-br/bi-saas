# ✅ Query Corrigida - Teste no Banco

## Nomes de Colunas Corretos Identificados:

- ✅ `id_tipo_despesa` (não `tipo_despesa_id`)
- ✅ `id_fornecedor` (não `fornecedor_id`)
- ✅ `data_emissao` (confirmado)

## 🧪 Teste 1: Query Simples (Deve Funcionar)

Execute no SQL Editor:

```sql
-- Teste básico: contar despesas por departamento
SELECT 
  d.descricao as departamento,
  COUNT(*) as qtd_despesas,
  SUM(desp.valor) as valor_total
FROM okilao.despesas desp
INNER JOIN okilao.tipos_despesa td ON desp.id_tipo_despesa = td.id
INNER JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE desp.data_emissao >= '2024-01-01'
  AND desp.data_emissao <= '2024-12-31'
  AND desp.filial_id = 1  -- Trocar pelo ID da sua filial
GROUP BY d.descricao
ORDER BY valor_total DESC
LIMIT 10;
```

**Resultado Esperado:** Lista de departamentos com valores

---

## 🧪 Teste 2: Query Completa (Como o sistema usa)

```sql
SELECT 
  d.id as dept_id,
  d.descricao as dept_descricao,
  td.id as tipo_id,
  td.descricao as tipo_descricao,
  desp.data_emissao,
  desp.descricao_despesa,
  desp.id_fornecedor,
  desp.numero_nota,
  desp.serie_nota,
  desp.valor,
  desp.usuario,
  desp.observacao
FROM okilao.despesas desp
INNER JOIN okilao.tipos_despesa td ON desp.id_tipo_despesa = td.id
INNER JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE desp.filial_id = 1  -- Trocar pelo ID da sua filial
  AND desp.data_emissao >= '2024-01-01'
  AND desp.data_emissao <= '2024-12-31'
ORDER BY desp.data_emissao DESC
LIMIT 20;
```

**Resultado Esperado:** Lista de despesas com departamento e tipo

---

## 🧪 Teste 3: Verificar Período com Dados

```sql
-- Ver quais períodos têm dados
SELECT 
  filial_id,
  TO_CHAR(data_emissao, 'YYYY-MM') as mes,
  COUNT(*) as qtd_despesas,
  SUM(valor) as valor_total
FROM okilao.despesas
WHERE data_emissao IS NOT NULL
GROUP BY filial_id, TO_CHAR(data_emissao, 'YYYY-MM')
ORDER BY filial_id, mes DESC
LIMIT 20;
```

**Use este resultado para selecionar um período válido no frontend!**

---

## 🧪 Teste 4: Verificar Integridade dos Relacionamentos

```sql
-- Verificar se há despesas sem tipo ou departamento
WITH estatisticas AS (
  SELECT 
    COUNT(*) as total_despesas,
    COUNT(CASE WHEN td.id IS NOT NULL THEN 1 END) as com_tipo,
    COUNT(CASE WHEN d.id IS NOT NULL THEN 1 END) as com_departamento
  FROM okilao.despesas desp
  LEFT JOIN okilao.tipos_despesa td ON desp.id_tipo_despesa = td.id
  LEFT JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
  WHERE desp.data_emissao >= '2024-01-01'
)
SELECT 
  total_despesas,
  com_tipo,
  com_departamento,
  total_despesas - com_tipo as sem_tipo,
  com_tipo - com_departamento as sem_departamento,
  ROUND(100.0 * com_departamento / total_despesas, 2) as percentual_completo
FROM estatisticas;
```

**Resultado Esperado:** 
- `percentual_completo` deve ser próximo de 100%
- `sem_tipo` e `sem_departamento` devem ser 0 ou próximo

---

## ✅ Próximos Passos

1. **Execute o Teste 1** - Se funcionar, está tudo OK!
2. **Execute o Teste 3** - Para ver quais períodos têm dados
3. **No Frontend**:
   - Acesse: `/despesas`
   - Selecione a filial que apareceu no teste
   - Selecione o período que tem dados (do teste 3)
   - Abra o Console (F12) e veja os logs

---

## 🎯 Mudanças Aplicadas no Código

Corrigi os nomes das colunas na API:

| Antes | Depois |
|-------|--------|
| `tipo_despesa_id` | `id_tipo_despesa` |
| `fornecedor_id` | `id_fornecedor` |

O código agora usa os nomes corretos das colunas do seu banco!

---

## 📊 Estrutura Confirmada

```
despesas (17.709 registros)
  ├─ id_tipo_despesa → tipos_despesa (177 tipos)
  │                      └─ departamentalizacao_nivel1 → departamentos_nivel1 (32 depts)
  ├─ filial_id
  ├─ data_emissao
  ├─ id_fornecedor
  ├─ valor
  └─ descricao_despesa
```

---

**Build compilado com sucesso! Agora teste as queries acima e depois teste no frontend!** ✅
