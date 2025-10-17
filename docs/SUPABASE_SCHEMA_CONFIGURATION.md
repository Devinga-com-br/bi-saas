# Configuração de Schemas no Supabase - Erro PGRST106

## Problema

```
Error: {
  code: 'PGRST106',
  details: null,
  hint: null,
  message: 'The schema must be one of the following: public, graphql_public, okilao, saoluiz, paraiso'
}
```

**Causa:** O schema `lucia` não está na lista de schemas expostos pelo PostgREST no Supabase.

## Solução

Para adicionar o schema `lucia` (ou qualquer novo schema de tenant), você precisa configurá-lo no Supabase Dashboard.

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login no projeto

2. **Vá para Settings → API**
   - No menu lateral: Settings → API

3. **Configure "Exposed schemas"**
   - Role até a seção **API Settings**
   - Procure por **"Exposed schemas"** ou **"DB Schemas"**
   - Adicione `lucia` à lista de schemas separados por vírgula

   **Antes:**
   ```
   public, graphql_public, okilao, saoluiz, paraiso
   ```

   **Depois:**
   ```
   public, graphql_public, okilao, saoluiz, paraiso, lucia
   ```

4. **Salve as Configurações**
   - Clique em **"Save"** ou **"Update"**
   - Aguarde alguns segundos para a configuração propagar

5. **Reinicie as APIs (se necessário)**
   - Em alguns casos, pode ser necessário reiniciar os serviços do Supabase
   - Isso geralmente acontece automaticamente

### Opção 2: Via SQL (Alternative)

Se você tiver acesso ao SQL Editor do Supabase:

```sql
-- Verificar schemas expostos atualmente
SHOW pgrst.db_schemas;

-- Adicionar novo schema à lista
ALTER DATABASE postgres SET pgrst.db_schemas = 'public, graphql_public, okilao, saoluiz, paraiso, lucia';

-- Recarregar configuração
SELECT pg_reload_conf();
```

**⚠️ Importante:** Esta abordagem pode não funcionar em todas as versões do Supabase ou pode ser revertida. Use a Opção 1 sempre que possível.

### Opção 3: Via variável de ambiente (Self-hosted)

Se você está usando Supabase self-hosted via Docker:

```env
# docker-compose.yml ou .env
PGRST_DB_SCHEMAS=public,graphql_public,okilao,saoluiz,paraiso,lucia
```

Depois reinicie os containers:
```bash
docker-compose restart
```

## Verificação

Após aplicar a configuração, teste com:

```bash
# Via curl
curl "https://your-project.supabase.co/rest/v1/rpc/some_function" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  --data '{"p_schema": "lucia"}'
```

Ou simplesmente acesse a página de Setores no sistema e verifique se o erro desapareceu.

## Contexto do Sistema

### Estrutura Multi-tenant

Este sistema usa **schemas PostgreSQL** para isolamento de dados por tenant:

```
Database: postgres
├── Schema: public (tabelas principais: tenants, user_profiles)
├── Schema: okilao (dados do tenant Okilão)
├── Schema: saoluiz (dados do tenant São Luiz)
├── Schema: paraiso (dados do tenant Paraíso)
└── Schema: lucia (dados do tenant Lucia) ← NOVO
```

### Como Schemas São Usados

1. **Tabela `tenants`**
   ```sql
   id | name  | supabase_schema
   ---|-------|----------------
   1  | Lucia | lucia
   ```

2. **APIs do Sistema**
   - Todas as APIs recebem `?schema=lucia` como parâmetro
   - O backend faz queries dinamicamente no schema correto
   - Exemplo: `await supabase.schema('lucia').from('setores').select()`

3. **Funções RPC**
   ```sql
   -- Função que precisa acessar o schema lucia
   SELECT * FROM get_setores_by_departamento('lucia', 1);
   ```

## Processo de Criar Novo Tenant

Quando um novo tenant é criado no sistema, você deve:

### 1. ✅ Criar o Schema no PostgreSQL
```sql
CREATE SCHEMA lucia;
```

### 2. ✅ Criar as Tabelas no Schema
```sql
-- Executar todas as migrations no novo schema
SET search_path TO lucia;
-- ... criar tabelas
```

### 3. ✅ Inserir Registro na Tabela `tenants`
```sql
INSERT INTO public.tenants (name, supabase_schema, created_at)
VALUES ('Lucia', 'lucia', NOW());
```

### 4. ⚠️ ADICIONAR SCHEMA AO POSTGREST (Passo que estava faltando!)
- Ir no Supabase Dashboard
- Settings → API
- Adicionar `lucia` aos "Exposed schemas"

## Scripts de Automação

### Script SQL para Preparar Novo Tenant

```sql
-- 1. Criar schema
CREATE SCHEMA IF NOT EXISTS lucia;

-- 2. Setar search_path
SET search_path TO lucia, public;

-- 3. Criar tabelas (exemplo simplificado)
CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER,
    valor DECIMAL(10,2),
    data DATE
);

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    codigo INTEGER,
    descricao TEXT,
    curva_venda CHAR(1)
);

CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    codigo INTEGER,
    nome TEXT,
    nivel INTEGER
);

-- 4. Criar funções necessárias
-- Copiar funções como get_venda_curva_report, etc.

-- 5. Registrar tenant
INSERT INTO public.tenants (name, supabase_schema, created_at)
VALUES ('Lucia', 'lucia', NOW())
ON CONFLICT (supabase_schema) DO NOTHING;
```

### Checklist Completo para Novo Tenant

- [ ] Criar schema no PostgreSQL
- [ ] Executar todas as migrations no schema
- [ ] Criar tabelas necessárias
- [ ] Criar funções RPC necessárias
- [ ] Inserir registro na tabela `tenants`
- [ ] **Adicionar schema aos "Exposed schemas" no Supabase Dashboard** ← CRÍTICO!
- [ ] Importar dados iniciais (se houver)
- [ ] Testar acesso via API
- [ ] Verificar RLS (Row Level Security) se aplicável
- [ ] Criar usuários do tenant

## Troubleshooting

### Erro Persiste Após Adicionar Schema

**Possíveis causas:**

1. **Cache do navegador**
   - Solução: Limpar cache ou usar modo anônimo

2. **Cache do PostgREST**
   - Solução: Aguardar 1-2 minutos ou reiniciar serviços

3. **Typo no nome do schema**
   - Solução: Verificar que o nome está exatamente igual em:
     - Tabela `tenants.supabase_schema`
     - Nome do schema no PostgreSQL
     - "Exposed schemas" no Dashboard

4. **Permissões**
   - Solução: Verificar que o role do Supabase tem acesso ao schema
   ```sql
   GRANT USAGE ON SCHEMA lucia TO anon, authenticated, service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA lucia TO anon, authenticated, service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA lucia TO anon, authenticated, service_role;
   GRANT ALL ON ALL FUNCTIONS IN SCHEMA lucia TO anon, authenticated, service_role;
   ```

### Como Verificar Schemas Expostos

```sql
-- Via SQL (pode não funcionar em todos os ambientes)
SHOW pgrst.db_schemas;

-- Via API REST do Supabase
-- Acessar: https://your-project.supabase.co/rest/v1/
-- Você verá apenas os schemas expostos na documentação
```

### Logs Úteis

```bash
# Verificar logs do backend
tail -f /var/log/your-app.log | grep -i "schema\|PGRST"

# Verificar que o schema está sendo enviado
console.log('Schema being sent:', schema)
```

## Referências

- [Supabase PostgREST Configuration](https://supabase.com/docs/guides/api/api-keys#the-service_role-key)
- [PostgREST Schema Isolation](https://postgrest.org/en/stable/api.html#schema-isolation)
- [Multi-tenant Architecture](https://supabase.com/docs/guides/database/multi-tenancy)

## Resumo Rápido

Para o erro `PGRST106` com schema `lucia`:

1. Acesse **Supabase Dashboard** → **Settings** → **API**
2. Encontre **"Exposed schemas"**
3. Adicione `, lucia` à lista existente
4. Salve
5. Aguarde 1-2 minutos
6. Teste novamente

---

**Status:** ✅ Solução Documentada  
**Aplicável a:** Todos os novos tenants  
**Prioridade:** Alta (bloqueia funcionalidade)
