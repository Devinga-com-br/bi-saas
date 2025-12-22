# Implantação de Novo Cliente (Tenant)

## Visão Geral

Este documento descreve o processo completo de implantação de um novo cliente no sistema BI SaaS. O sistema utiliza **isolamento por schema PostgreSQL**, onde cada cliente possui seu próprio schema contendo todas as tabelas, índices, functions e dados.

---

## Pré-requisitos

### Permissões Necessárias
- **Usuário com role `superadmin`** no sistema
- Acesso ao **Supabase Dashboard** do projeto

### Informações do Cliente
Antes de iniciar, colete as seguintes informações:

| Campo | Obrigatório | Descrição | Exemplo |
|-------|-------------|-----------|---------|
| Nome da Empresa | ✅ Sim | Nome completo da empresa | "Supermercado ABC Ltda" |
| Slug | ✅ Sim | Identificador único (gerado automaticamente) | "supermercado-abc" |
| Schema | ✅ Sim | Nome do schema PostgreSQL | "abc_mercado" |
| CNPJ | ❌ Não | CNPJ da empresa | "12.345.678/0001-90" |
| Telefone | ❌ Não | Telefone de contato | "(11) 98765-4321" |

### Regras para Nome do Schema
O nome do schema deve seguir estas regras:

- ✅ Apenas **letras minúsculas** (a-z)
- ✅ **Números** (0-9)
- ✅ **Underscore** (_)
- ✅ Deve **começar com letra**
- ❌ NÃO usar hífen (-)
- ❌ NÃO usar espaços
- ❌ NÃO usar caracteres especiais
- ❌ NÃO usar nomes reservados (public, auth, storage, etc.)

**Exemplos válidos:** `abc_mercado`, `cliente01`, `supermercado_centro`
**Exemplos inválidos:** `abc-mercado`, `123cliente`, `super mercado`

---

## Processo de Criação

### Etapa 1: Acessar o Formulário de Nova Empresa

1. Faça login no sistema com uma conta **superadmin**
2. Acesse o menu **Configurações** → **Empresas**
3. Clique no botão **"Nova Empresa"**

### Etapa 2: Preencher Dados da Empresa

1. **Nome da Empresa**: Digite o nome completo da empresa
   - O **slug** será gerado automaticamente baseado no nome

2. **Slug**: Revise o slug gerado ou ajuste se necessário
   - Deve ser único no sistema
   - Usado para identificação interna

3. **CNPJ** (opcional): Informe o CNPJ com máscara
   - Formato: `00.000.000/0000-00`
   - Validação de dígitos verificadores é aplicada

4. **Telefone** (opcional): Informe o telefone de contato
   - Formato: `(11) 98765-4321`

5. **Schema Supabase**: Informe o nome do schema PostgreSQL
   - Siga as regras de nomenclatura descritas acima
   - Este campo é **obrigatório** para criar o schema automaticamente

### Etapa 3: Habilitar Criação Automática do Schema

Quando você preencher o campo **Schema Supabase**, aparecerá uma opção:

```
☐ Criar schema automaticamente
   Clona a estrutura completa do schema okilao (tabelas, índices,
   triggers, functions, materialized views e dados de referência).
```

**Marque esta opção** para criar o schema automaticamente.

### Etapa 4: Criar a Empresa

1. Clique no botão **"Criar Empresa"**
2. Aguarde o processo de criação (pode levar alguns segundos)
3. O sistema irá:
   - Criar o schema no PostgreSQL
   - Clonar toda a estrutura do schema `okilao`
   - Configurar permissões
   - Copiar dados de referência
   - Registrar a empresa na tabela `tenants`

### Etapa 5: Modal de Confirmação

Após a criação, será exibido um modal com:

1. **Resumo da criação**:
   - Quantidade de tabelas criadas
   - Quantidade de índices
   - Quantity de functions, triggers, etc.

2. **⚠️ Ação manual necessária** - Instruções para expor o schema

---

## Objetos Criados Automaticamente

O processo de clonagem cria os seguintes objetos no novo schema:

### Tabelas (~35)
| Categoria | Tabelas |
|-----------|---------|
| Hierarquia de Departamentos | `departments_level_1` a `departments_level_6`, `departamentos_nivel1` |
| Vendas | `vendas`, `vendas_diarias_por_filial`, `vendas_por_departamento`, `vendas_produto_mes` |
| Produtos | `produtos` |
| Metas | `metas_mensais`, `metas_setor`, `setores` |
| Financeiro | `despesas`, `despesas_diarias_por_filial`, `tipos_despesa`, `faturamento`, `entradas` |
| Outros | `descontos_venda`, `perdas`, `motivos_perda` |
| ETL/Staging | `etl_controle`, `etl_execucoes`, `staging_departamentos`, `staging_produtos` |

### Índices (~50+)
- Índices de performance para queries frequentes
- Índices covering para relatórios
- Índices parciais para dados ativos

### Constraints
- Primary Keys
- Unique Constraints
- Foreign Keys (apenas FKs simples de 1 coluna)

### Materialized Views
- `vendas_agregadas_60d` - Agregação de vendas dos últimos 60 dias
- `vendas_agregadas_30d` - Agregação de vendas dos últimos 30 dias

### Functions do Schema
- `merge_departamentos()` - Upsert de departamentos
- `merge_produtos()` - Upsert de produtos
- `truncate_table()` - Limpar tabela
- `handle_updated_at()` - Atualização automática de timestamp

### Triggers
- Triggers de `updated_at` em tabelas principais

### Dados de Referência Copiados
| Tabela | Descrição |
|--------|-----------|
| `departments_level_1` a `level_6` | Hierarquia completa de departamentos |
| `departamentos_nivel1` | Departamentos para despesas |
| `tipos_despesa` | Tipos de despesas |
| `motivos_perda` | Motivos de perda de produtos |

### Permissões (GRANTS)
```sql
-- Schema
GRANT USAGE ON SCHEMA {novo_schema} TO anon, authenticated, service_role;

-- Tabelas
GRANT SELECT ON ALL TABLES TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES TO authenticated, service_role;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES TO anon, authenticated, service_role;

-- Functions
GRANT EXECUTE ON ALL FUNCTIONS TO authenticated, service_role;

-- Default privileges (para objetos futuros)
ALTER DEFAULT PRIVILEGES IN SCHEMA {novo_schema} ...
```

---

## ⚠️ Ação Manual Obrigatória: Exposed Schemas

### Por que é necessário?

O Supabase PostgREST (API REST) só consegue acessar schemas que estejam configurados como **"Exposed schemas"**. Sem esta configuração, o sistema retornará o erro:

```
PGRST106: The schema must be one of the following: public, graphql_public, ...
```

### Como configurar

1. Acesse o **Supabase Dashboard** do projeto
2. Navegue até **Settings** → **API**
3. Localize o campo **"Exposed schemas"**
4. Adicione o nome do novo schema à lista existente:
   ```
   public, graphql_public, okilao, saoluiz, paraiso, lucia, sol, {novo_schema}
   ```
5. Clique em **Save**
6. **Aguarde 1-2 minutos** para a configuração propagar

### Verificando a Configuração

Após adicionar o schema, você pode verificar se está funcionando:

1. No SQL Editor do Supabase, execute:
   ```sql
   SELECT COUNT(*) FROM {novo_schema}.departments_level_1;
   ```

2. Se retornar um número (geralmente os dados de referência copiados), está funcionando.

---

## Pós-Implantação

### 1. Cadastrar Filiais

Após criar a empresa, é necessário cadastrar as filiais:

```sql
-- Inserir filial via SQL (ou pelo sistema)
INSERT INTO public.branches (branch_code, tenant_id, descricao)
SELECT '001', id, 'Matriz'
FROM public.tenants
WHERE supabase_schema = '{novo_schema}';

-- Para filiais adicionais
INSERT INTO public.branches (branch_code, tenant_id, descricao)
SELECT '002', id, 'Filial Centro'
FROM public.tenants
WHERE supabase_schema = '{novo_schema}';
```

### 2. Criar Usuário Administrador

Crie um usuário admin para o cliente:

1. O cliente deve criar uma conta pelo fluxo normal de registro
2. Após o registro, associe o usuário à empresa:

```sql
-- Atualizar perfil do usuário
UPDATE public.user_profiles
SET
  tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = '{novo_schema}'),
  role = 'admin',
  is_active = true
WHERE id = '{auth_user_id}';
```

Ou pelo sistema:
1. Acesse **Configurações** → **Usuários**
2. Selecione a empresa do cliente
3. Adicione o usuário com role **Admin**

### 3. Configurar Integrações ETL (se aplicável)

Se o cliente terá integrações com sistemas externos:

1. Configure as credenciais de API
2. Cadastre os jobs de ETL
3. Configure schedules de execução

### 4. Teste de Funcionalidade

Realize os seguintes testes:

- [ ] Login com usuário do cliente
- [ ] Acesso ao dashboard
- [ ] Visualização de relatórios (devem estar vazios inicialmente)
- [ ] Cadastro de metas
- [ ] Acesso às configurações

---

## Troubleshooting

### Erro: "Schema já existe"

**Causa:** O nome do schema já está em uso.

**Solução:** Escolha outro nome para o schema ou verifique se a empresa já foi criada anteriormente.

### Erro: "Nome do schema inválido"

**Causa:** O nome contém caracteres não permitidos.

**Solução:** Use apenas letras minúsculas, números e underscore, começando com letra.

### Erro: PGRST106 após criação

**Causa:** O schema não foi adicionado aos "Exposed schemas".

**Solução:** Siga as instruções na seção "Ação Manual Obrigatória" acima.

### Dados não aparecem no dashboard

**Causas possíveis:**
1. Schema não está exposto (ver acima)
2. Filiais não foram cadastradas
3. Usuário não está associado à empresa

**Solução:** Verifique cada item acima na ordem.

### Erro ao criar schema: "permission denied"

**Causa:** A function `clone_schema_for_tenant` não está instalada ou não tem permissões corretas.

**Solução:** Execute a migration `20251222_clone_schema_function.sql` no Supabase.

---

## Referência Rápida

### Checklist de Implantação

```
□ 1. Coletar informações do cliente (nome, schema, CNPJ, telefone)
□ 2. Criar empresa pelo sistema com "Criar schema automaticamente" marcado
□ 3. Adicionar schema aos "Exposed schemas" no Supabase Dashboard
□ 4. Aguardar 1-2 minutos para propagação
□ 5. Cadastrar filiais do cliente
□ 6. Criar usuário admin para o cliente
□ 7. Testar acesso ao sistema
□ 8. Configurar integrações ETL (se aplicável)
□ 9. Documentar credenciais e entregar ao cliente
```

### Schemas Ativos (atualizar conforme necessário)

| Cliente | Schema | Data Criação |
|---------|--------|--------------|
| Okilão | `okilao` | - (origem) |
| São Luiz | `saoluiz` | - |
| Paraíso | `paraiso` | - |
| Lúcia | `lucia` | - |
| Sol | `sol` | - |
| Merlyn | `merlyn` | 2025-12-22 |

---

## Suporte

Em caso de dúvidas ou problemas durante a implantação:

1. Consulte a documentação técnica em `docs/`
2. Verifique os logs no Supabase Dashboard
3. Entre em contato com a equipe de desenvolvimento

---

*Última atualização: 22 de Dezembro de 2025*
