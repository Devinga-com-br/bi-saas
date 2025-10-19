# 🔍 Guia de Verificação - Módulo de Despesas

## Passos para Verificar se Está Funcionando

### 1. Verificar Schema no Supabase

1. Acesse: https://supabase.com/dashboard
2. Vá em: **Settings** → **API** → **Exposed schemas**
3. Verifique se o schema do tenant está na lista (ex: `okilao`, `saoluiz`)
4. Se NÃO estiver, adicione e salve

### 2. Verificar Tabelas no Banco

Execute no SQL Editor do Supabase:

```sql
-- Substituir 'okilao' pelo seu schema
SELECT 
  table_name,
  (SELECT COUNT(*) FROM okilao.despesas WHERE table_name = 'despesas') as qtd_despesas,
  (SELECT COUNT(*) FROM okilao.tipos_despesa WHERE table_name = 'tipos_despesa') as qtd_tipos,
  (SELECT COUNT(*) FROM okilao.departamentos_nivel1 WHERE table_name = 'departamentos_nivel1') as qtd_departamentos
FROM information_schema.tables
WHERE table_schema = 'okilao'
AND table_name IN ('despesas', 'tipos_despesa', 'departamentos_nivel1');
```

### 3. Verificar Foreign Keys

```sql
-- Verificar FKs configuradas
SELECT
  tc.table_name, 
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
AND tc.table_name IN ('despesas', 'tipos_despesa');
```

### 4. Verificar Dados de Teste

```sql
-- Despesas por filial no mês atual
SELECT 
  filial_id,
  COUNT(*) as qtd_despesas,
  SUM(valor) as valor_total
FROM okilao.despesas
WHERE data_emissao >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY filial_id
ORDER BY filial_id;

-- Verificar se despesas têm departamento (via tipo)
SELECT 
  d.descricao as departamento,
  COUNT(*) as qtd_despesas,
  SUM(desp.valor) as valor_total
FROM okilao.despesas desp
INNER JOIN okilao.tipos_despesa td ON desp.tipo_despesa_id = td.id
INNER JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE desp.data_emissao >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
GROUP BY d.descricao
ORDER BY valor_total DESC;
```

### 5. Testar no Frontend

1. Acesse: `http://localhost:3000/despesas`
2. Selecione uma **Filial**
3. Selecione **Data Inicial** (ex: 01/01/2025)
4. Selecione **Data Final** (ex: 31/01/2025)
5. Observe se dados aparecem

### 6. Verificar Console do Navegador

Abra o **DevTools** (F12) e vá na aba **Console**:

```
Deve aparecer:
[API Despesas] Params: { schema: 'okilao', filialId: '1', ... }
[API] Despesas encontradas: 150
[API] Resposta: { totalizador: {...}, graficoItems: 3, ... }
```

Se aparecer:
- **Despesas encontradas: 0** → Não há dados no período
- **Erro PGRST...** → Schema não exposto
- **relation "despesas" does not exist** → Tabela não existe

### 7. Se Não Aparecer Dados

#### Causa 1: Schema não exposto
```
✅ Solução: Settings → API → Exposed schemas → Adicionar schema
```

#### Causa 2: Não há dados no período
```sql
-- Buscar período com dados
SELECT 
  MIN(data_emissao) as data_mais_antiga,
  MAX(data_emissao) as data_mais_recente,
  COUNT(*) as total_despesas
FROM okilao.despesas
WHERE filial_id = 1;
```

#### Causa 3: Foreign Keys não configuradas
```sql
-- Criar FKs se não existirem
ALTER TABLE okilao.despesas
ADD CONSTRAINT fk_despesas_tipo
FOREIGN KEY (tipo_despesa_id)
REFERENCES okilao.tipos_despesa(id);

ALTER TABLE okilao.tipos_despesa
ADD CONSTRAINT fk_tipos_despesa_dept
FOREIGN KEY (departamentalizacao_nivel1)
REFERENCES okilao.departamentos_nivel1(id);
```

#### Causa 4: Despesas órfãs (sem tipo ou departamento)
```sql
-- Encontrar despesas sem tipo
SELECT COUNT(*) FROM okilao.despesas d
LEFT JOIN okilao.tipos_despesa td ON d.tipo_despesa_id = td.id
WHERE td.id IS NULL;

-- Encontrar tipos sem departamento
SELECT COUNT(*) FROM okilao.tipos_despesa td
LEFT JOIN okilao.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE d.id IS NULL;
```

## Checklist Rápido

- [ ] Schema exposto no Supabase
- [ ] Tabelas existem: `despesas`, `tipos_despesa`, `departamentos_nivel1`
- [ ] Foreign Keys configuradas
- [ ] Há dados no período selecionado
- [ ] Filial selecionada tem despesas
- [ ] Despesas têm `data_emissao` preenchida
- [ ] Despesas estão vinculadas a tipos válidos
- [ ] Tipos estão vinculados a departamentos válidos

## Comandos Úteis

### Criar dados de teste (se necessário)
```sql
-- Inserir departamento de teste
INSERT INTO okilao.departamentos_nivel1 (id, descricao)
VALUES (999, 'TESTE - DEPARTAMENTO')
ON CONFLICT (id) DO NOTHING;

-- Inserir tipo de teste
INSERT INTO okilao.tipos_despesa (id, descricao, departamentalizacao_nivel1)
VALUES (999, 'TESTE - TIPO DESPESA', 999)
ON CONFLICT (id) DO NOTHING;

-- Inserir despesa de teste
INSERT INTO okilao.despesas (
  filial_id, data_emissao, tipo_despesa_id, sequencia,
  descricao_despesa, valor, usuario
)
VALUES (
  1, CURRENT_DATE, 999, 1,
  'Despesa de Teste', 1000.00, 'admin'
);
```

### Limpar dados de teste
```sql
DELETE FROM okilao.despesas WHERE tipo_despesa_id = 999;
DELETE FROM okilao.tipos_despesa WHERE id = 999;
DELETE FROM okilao.departamentos_nivel1 WHERE id = 999;
```

---

**Se após todos esses passos não funcionar, compartilhe:**
1. Mensagem de erro do console
2. Resultado das queries de verificação
3. Schema que está usando
