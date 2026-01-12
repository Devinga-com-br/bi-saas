# Setup: Módulo Produtos sem Vendas

**Data:** 2026-01-10  
**Status:** ⚠️ Migration pendente

---

## ❌ Erro Atual

```
Erro ao buscar produtos: {}
```

**Causa:** A função RPC `get_produtos_sem_vendas` ainda não foi criada no banco de dados.

---

## ✅ Solução: Aplicar Migration

### 1. Conectar ao Supabase

```bash
# Via Supabase CLI (se instalado)
supabase db push

# OU via Supabase Dashboard
# Settings → Database → SQL Editor
```

### 2. Executar Migration

Aplicar o arquivo: `supabase/migrations/20260110_create_produtos_sem_vendas_function.sql`

**Conteúdo:**
- Cria função `public.get_produtos_sem_vendas()`
- Aceita 8 parâmetros (schema, filiais, dias, data ref, curva, filtro tipo, departamentos, produtos)
- Retorna 11 colunas (produto, filial, estoque, datas, custos, curvas, dias)

### 3. Verificar Função Criada

```sql
-- Verificar se a função existe
SELECT 
  proname,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_produtos_sem_vendas';

-- Deve retornar:
-- proname: get_produtos_sem_vendas
-- arguments: p_schema text, p_filiais text DEFAULT 'all'::text, ...
```

### 4. Testar Função

```sql
-- Teste básico (substitua 'paraiso' pelo seu schema)
SELECT * FROM public.get_produtos_sem_vendas(
  p_schema := 'paraiso',
  p_filiais := 'all',
  p_dias_sem_vendas := 30,
  p_data_referencia := CURRENT_DATE,
  p_curva_abc := 'all',
  p_filtro_tipo := 'all',
  p_departamento_ids := NULL,
  p_produto_ids := NULL
)
LIMIT 10;
```

**Resultado esperado:**
- Lista de produtos sem vendas nos últimos 30 dias
- Colunas: filial_id, codigo_produto, descricao_produto, estoque_atual, etc.

---

## 🔍 Diagnóstico de Erros

### Erro: "function public.get_produtos_sem_vendas does not exist"

**Solução:** Aplicar a migration (passo 2)

### Erro: "relation vendas does not exist"

**Causa:** Schema do tenant não possui a tabela `vendas`

**Solução:**
```sql
-- Verificar tabelas no schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'paraiso'  -- substitua pelo seu schema
  AND table_name IN ('vendas', 'vendas_hoje_itens', 'produtos', 'entradas', 'entradas_produtos');
```

### Erro: "permission denied for schema paraiso"

**Solução:**
```sql
-- Conceder permissão ao usuário authenticated
GRANT USAGE ON SCHEMA paraiso TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA paraiso TO authenticated;
```

### Erro: PGRST106

**Causa:** Schema não está exposto no Supabase

**Solução:**
1. Supabase Dashboard → Settings → API
2. "Exposed schemas" → Adicionar schema (ex: `paraiso`)
3. Salvar

---

## 📊 Estrutura da Função

### Parâmetros de Entrada

| Parâmetro           | Tipo   | Default | Descrição                              |
|---------------------|--------|---------|----------------------------------------|
| `p_schema`          | text   | -       | Schema do tenant (ex: 'paraiso')       |
| `p_filiais`         | text   | 'all'   | IDs de filiais separados por vírgula   |
| `p_dias_sem_vendas` | int    | 30      | Quantidade de dias sem venda           |
| `p_data_referencia` | date   | hoje    | Data de referência para cálculo        |
| `p_curva_abc`       | text   | 'all'   | Filtro de curva: 'A', 'B', 'C', 'D'    |
| `p_filtro_tipo`     | text   | 'all'   | Tipo: 'all', 'departamento', 'setor'   |
| `p_departamento_ids`| text   | NULL    | IDs de departamentos (separados por ,) |
| `p_produto_ids`     | text   | NULL    | IDs de produtos (separados por ,)      |

### Colunas de Retorno

| Coluna                | Tipo         | Descrição                          |
|-----------------------|--------------|------------------------------------|
| `filial_id`           | bigint       | ID da filial                       |
| `codigo_produto`      | bigint       | Código do produto                  |
| `descricao_produto`   | text         | Descrição do produto               |
| `estoque_atual`       | numeric(18,6)| Estoque atual                      |
| `data_ultima_venda`   | date         | Data da última venda               |
| `data_ultima_compra`  | date         | Data da última compra              |
| `preco_custo`         | numeric(15,5)| Preço de custo                     |
| `curva_venda`         | text         | Curva de vendas (A/B/C/D)          |
| `curva_lucro`         | varchar(2)   | Curva de lucro                     |
| `dias_sem_venda`      | integer      | Dias desde última venda            |
| `filial_codigo`       | text         | Código da filial (para display)    |

---

## 🧪 Testes Recomendados

### 1. Teste com todas as filiais
```sql
SELECT * FROM public.get_produtos_sem_vendas(
  'paraiso', 'all', 30, CURRENT_DATE, 'all', 'all', NULL, NULL
);
```

### 2. Teste com uma filial específica
```sql
SELECT * FROM public.get_produtos_sem_vendas(
  'paraiso', '1', 30, CURRENT_DATE, 'all', 'all', NULL, NULL
);
```

### 3. Teste com curva A
```sql
SELECT * FROM public.get_produtos_sem_vendas(
  'paraiso', 'all', 30, CURRENT_DATE, 'A', 'all', NULL, NULL
);
```

### 4. Teste com departamento
```sql
SELECT * FROM public.get_produtos_sem_vendas(
  'paraiso', 'all', 30, CURRENT_DATE, 'all', 'departamento', '1,2,3', NULL
);
```

### 5. Teste com 90 dias
```sql
SELECT * FROM public.get_produtos_sem_vendas(
  'paraiso', 'all', 90, CURRENT_DATE, 'all', 'all', NULL, NULL
);
```

---

## 📝 Validações Pós-Deploy

- [ ] Função `get_produtos_sem_vendas` criada no schema `public`
- [ ] Teste básico retorna dados sem erro
- [ ] Filtro por filial funciona
- [ ] Filtro por curva ABC funciona
- [ ] Filtro por departamento funciona
- [ ] Filtro por dias sem vendas funciona
- [ ] Última venda combina `vendas` + `vendas_hoje_itens`
- [ ] Última compra busca de `entradas_produtos`
- [ ] Dias sem venda calculados corretamente
- [ ] Frontend carrega dados sem erro
- [ ] Exportação PDF funciona

---

## 🔗 Arquivos Relacionados

- **Migration:** `supabase/migrations/20260110_create_produtos_sem_vendas_function.sql`
- **API Route:** `src/app/api/relatorios/produtos-sem-vendas/route.ts`
- **Frontend:** `src/app/(dashboard)/relatorios/produtos-sem-vendas/page.tsx`
- **Menu:** `src/components/dashboard/app-sidebar.tsx` (linha 102)

---

## 🆘 Suporte

Se encontrar erros:

1. Verifique os logs do console do navegador
2. Verifique os logs do servidor Next.js
3. Verifique os logs do PostgreSQL no Supabase Dashboard
4. Execute os testes SQL acima no SQL Editor

**Log do navegador mostrará:**
```
[API/PRODUTOS-SEM-VENDAS] RPC Error: { message: "..." }
```

**Possíveis erros:**
- `function does not exist` → Migration não aplicada
- `relation does not exist` → Tabela não existe no schema
- `permission denied` → Sem permissão no schema
- `PGRST106` → Schema não exposto

---

## ✅ Checklist de Deploy

```bash
# 1. Aplicar migration
psql -h <host> -U postgres -d postgres -f supabase/migrations/20260110_create_produtos_sem_vendas_function.sql

# 2. Verificar função criada
psql -h <host> -U postgres -d postgres -c "\df get_produtos_sem_vendas"

# 3. Testar função
psql -h <host> -U postgres -d postgres -c "SELECT COUNT(*) FROM public.get_produtos_sem_vendas('paraiso', 'all', 30, CURRENT_DATE, 'all', 'all', NULL, NULL);"

# 4. Expor schema no Supabase Dashboard (se ainda não exposto)

# 5. Reiniciar aplicação
npm run dev

# 6. Acessar no navegador
http://localhost:3000/relatorios/produtos-sem-vendas
```

---

**Última atualização:** 2026-01-10 19:59 UTC  
**Autor:** GitHub Copilot CLI
