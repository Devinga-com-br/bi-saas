# Contexto do Banco de Dados - BI SaaS

Este documento descreve a estrutura das principais tabelas do banco de dados Supabase (PostgreSQL) que servem como base para o sistema de BI.

## 1. Tabelas Principais (Schema `public`)

Estas são as tabelas centrais que gerenciam a arquitetura multi-tenant e os usuários do sistema.

### 1.1. `tenants`

Armazena as informações das empresas (matrizes) e filiais cadastradas no sistema.

| Coluna             | Tipo          | Descrição                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------- |
| `id`               | `UUID`        | Chave primária, identificador único do tenant.                            |
| `name`             | `VARCHAR`     | Nome da empresa ou filial.                                                |
| `slug`             | `VARCHAR`     | Identificador único em formato de URL (ex: `minha-empresa`).              |
| `cnpj`             | `VARCHAR(18)` | CNPJ da empresa (formato: `00.000.000/0000-00`). Único.                    |
| `phone`            | `VARCHAR(15)` | Telefone de contato da empresa.                                           |
| `supabase_schema`  | `VARCHAR(100)`| Nome do schema no Supabase onde os dados financeiros da empresa estão.    |
| `tenant_type`      | `VARCHAR(20)` | Tipo do tenant: `company` (matriz) ou `branch` (filial).                  |
| `parent_tenant_id` | `UUID`        | ID da empresa matriz (para filiais). `NULL` para matrizes.                |
| `is_active`        | `BOOLEAN`     | Indica se o tenant está ativo no sistema.                                 |
| `created_at`       | `TIMESTAMPTZ` | Data e hora de criação do registro.                                       |
| `updated_at`       | `TIMESTAMPTZ` | Data e hora da última atualização do registro.                            |

### 1.2. `user_profiles`

Armazena os perfis dos usuários, suas permissões (roles) e o vínculo com os tenants.

| Coluna             | Tipo          | Descrição                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------- |
| `id`               | `UUID`        | Chave primária, referência a `auth.users.id`.                             |
| `tenant_id`        | `UUID`        | ID do tenant ao qual o usuário pertence. `NULL` para superadmins.         |
| `full_name`        | `VARCHAR`     | Nome completo do usuário.                                                 |
| `avatar_url`       | `VARCHAR`     | URL para a imagem de perfil do usuário.                                   |
| `role`             | `VARCHAR`     | Nível de permissão: `superadmin`, `admin`, `user`, `viewer`.              |
| `can_switch_tenants`| `BOOLEAN`     | Se `true`, o usuário (superadmin) pode alternar entre diferentes tenants. |
| `is_active`        | `BOOLEAN`     | Indica se o usuário está ativo no sistema.                                |
| `theme_preference` | `TEXT`        | Preferência de tema do usuário: `light` ou `dark`.                        |
| `created_at`       | `TIMESTAMPTZ` | Data e hora de criação do perfil.                                         |
| `updated_at`       | `TIMESTAMPTZ` | Data e hora da última atualização do perfil.                              |

### 1.3. `branches`

Armazena as filiais de cada empresa (tenant).

| Coluna        | Tipo          | Descrição                                               |
| ------------- | ------------- | ------------------------------------------------------- |
| `branch_code` | `VARCHAR(50)` | Chave primária, código da filial.                       |
| `tenant_id`   | `UUID`        | ID da empresa (tenant) à qual a filial pertence.        |
| `store_code`  | `VARCHAR(50)` | Código da loja (opcional).                              |
| `created_at`  | `TIMESTAMPTZ` | Data e hora de criação do registro.                     |
| `updated_at`  | `TIMESTAMPTZ` | Data e hora da última atualização do registro.          |

### 1.4. `user_tenant_access`

Gerencia o acesso de superadmins a múltiplos tenants (obsoleto, a lógica foi simplificada).

**Nota:** Esta tabela pode ser removida em futuras migrações, pois a lógica de acesso do superadmin foi simplificada para permitir acesso a todos os tenants ativos.

| Coluna       | Tipo          | Descrição                                      |
| ------------ | ------------- | ---------------------------------------------- |
| `id`         | `UUID`        | Chave primária.                                |
| `user_id`    | `UUID`        | ID do usuário (superadmin).                    |
| `tenant_id`  | `UUID`        | ID do tenant que o usuário pode acessar.       |
| `granted_at` | `TIMESTAMPTZ` | Data em que o acesso foi concedido.            |
| `granted_by` | `UUID`        | ID do usuário que concedeu o acesso.           |

---

## 2. Tabelas Agregadas (Schema de cada Tenant)

Estas tabelas serão criadas dentro do schema de cada tenant (ex: `empresa_demo_schema`) e conterão dados pré-agregados para otimizar a performance dos dashboards. A atualização será feita por meio de jobs agendados (Supabase Cron).

**Nota importante:** Todas as queries para dados de vendas, produtos e outras informações de BI devem sempre considerar o schema dinâmico do tenant (`supabase_schema`) associado ao usuário logado.

**Status:** A serem criadas.

### 2.1. `vendas_diarias_por_filial`

Armazena os dados agregados de vendas para cada filial, por dia. Esta é uma tabela central para análises de performance de vendas.

| Coluna             | Tipo          | Descrição                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------- |
| `filial_id`        | `BIGINT`      | Chave primária (composta), ID da filial.                                  |
| `data_venda`       | `DATE`        | Chave primária (composta), data da venda.                                 |
| `valor_total`      | `NUMERIC`     | Valor total vendido pela filial no dia.                                   |
| `quantidade_total` | `NUMERIC`     | Quantidade total de itens vendidos.                                       |
| `total_transacoes` | `BIGINT`      | Número total de transações (vendas) realizadas.                           |
| `custo_total`      | `NUMERIC(15,2)`| Custo total dos produtos vendidos.                                        |
| `total_lucro`      | `NUMERIC(15,2)`| Lucro total obtido (valor_total - custo_total).                           |

### 2.2. `etl_logs`

Tabela para registrar a execução dos jobs de atualização (ETL).

| Coluna         | Tipo          | Descrição                                      |
| -------------- | ------------- | ---------------------------------------------- |
| `id`           | `BIGSERIAL`   | Chave primária.                                |
| `job_name`     | `VARCHAR`     | Nome da tabela agregada atualizada.            |
| `start_time`   | `TIMESTAMPTZ` | Início da execução do job.                     |
| `end_time`     | `TIMESTAMPTZ` | Fim da execução do job.                        |
| `status`       | `VARCHAR`     | `SUCCESS` ou `ERROR`.                          |
| `rows_affected`| `INT`         | Número de linhas inseridas/atualizadas.        |
| `error_message`| `TEXT`        | Mensagem de erro, se houver.                   |
