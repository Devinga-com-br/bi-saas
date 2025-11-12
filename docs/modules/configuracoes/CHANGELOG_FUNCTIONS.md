# Changelog - Módulo de Configurações

Este documento registra todas as alterações, correções e novas features implementadas no módulo de Configurações.

## Índice

- [2025-01-12 - Documentação: Criação da documentação técnica completa](#2025-01-12---documentação-criação-da-documentação-técnica-completa)
- [2025-01-10 - Feature: Sistema de Parâmetros por Tenant](#2025-01-10---feature-sistema-de-parâmetros-por-tenant)
- [2025-01-05 - Feature: Módulo de Setores](#2025-01-05---feature-módulo-de-setores)
- [2025-01-03 - Feature: Filiais Autorizadas](#2025-01-03---feature-filiais-autorizadas)
- [2025-01-01 - Initial: Implementação inicial do módulo](#2025-01-01---initial-implementação-inicial-do-módulo)

---

## 2025-01-12 - Documentação: Criação da documentação técnica completa

### Alteração Implementada

**Tipo**: Documentação

**Descrição**:
Criação da documentação técnica completa do módulo de Configurações seguindo os padrões estabelecidos em `docs/DOCUMENTATION_STANDARDS.md`. A documentação inclui visão geral, regras de negócio, estruturas de dados, fluxos de integração e documentação de APIs.

**Arquivos Criados**:

1. **[README.md](./README.md)**
   - Visão geral do módulo
   - Descrição dos 5 submódulos
   - Matriz de permissões
   - Componentes principais
   - Acesso rápido

2. **[BUSINESS_RULES.md](./BUSINESS_RULES.md)**
   - 30+ regras de negócio numeradas
   - Regras de permissões (RN-PERM-001 a 003)
   - Regras de perfil (RN-PERFIL-001 a 003)
   - Regras de usuários (RN-USER-001 a 005)
   - Regras de parâmetros (RN-PARAM-001 a 003)
   - Regras de setores (RN-SETOR-001 a 006)
   - Regras de empresas (RN-EMP-001 a 005)
   - Regras de filiais autorizadas (RN-FILIAL-001 a 005)

3. **[DATA_STRUCTURES.md](./DATA_STRUCTURES.md)**
   - Tipos de database
   - Tipos de usuário (UserProfile, UserRole, etc.)
   - Tipos de empresa (Tenant, TenantFormData)
   - Tipos de filial (Branch, BranchOption)
   - Tipos de setor (Setor, SetorFormData)
   - Tipos de parâmetros (TenantParameters)
   - Interfaces de API
   - Enums e constantes

4. **[INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md)**
   - Fluxo completo de Perfil
   - Fluxo completo de Usuários (criar, editar)
   - Fluxo completo de Parâmetros
   - Fluxo completo de Setores (CRUD)
   - Fluxo completo de Empresas
   - Fluxo completo de Filiais Autorizadas
   - Diagramas de sequência

5. **[API_ROUTES.md](./API_ROUTES.md)**
   - Documentação completa de 10+ endpoints
   - APIs de Usuários (create, update-email, authorized-branches)
   - APIs de Setores (CRUD, departamentos)
   - Exemplos de uso
   - Códigos de status HTTP
   - Padrões de autenticação

6. **[CHANGELOG_FUNCTIONS.md](./CHANGELOG_FUNCTIONS.md)**
   - Este arquivo
   - Histórico de alterações do módulo

**Impacto**: ✅ BAIXO

**Detalhamento do Impacto**:
- Não afeta código em produção
- Facilita manutenção e onboarding de desenvolvedores
- Documenta funcionalidades existentes
- Serve como referência técnica

**Breaking Changes**: ✅ Não

**Versão**: 1.0.0

---

## 2025-01-10 - Feature: Sistema de Parâmetros por Tenant

### Alteração Implementada

**Feature**: Sistema de parâmetros configuráveis por tenant

**Descrição**:
Implementação de sistema que permite admins habilitarem/desabilitarem funcionalidades do sistema através de parâmetros booleanos. O primeiro parâmetro implementado controla a visibilidade do módulo "Descontos de Venda" no menu lateral.

**Arquivos Criados/Modificados**:

1. **Migration**: `supabase/migrations/XXX_create_tenant_parameters.sql`
   - Criada tabela `public.tenant_parameters`
   - Coluna `enable_descontos_venda` (boolean)

2. **[src/components/configuracoes/parametros-content.tsx](../../../src/components/configuracoes/parametros-content.tsx)**
   - Novo componente para aba de Parâmetros
   - Toggle para habilitar/desabilitar módulos
   - Feedback imediato ao usuário

3. **[src/hooks/use-tenant-parameters.ts](../../../src/hooks/use-tenant-parameters.ts)**
   - Hook customizado para carregar parâmetros
   - Função para atualizar parâmetros
   - Cache com SWR

4. **[src/components/dashboard/sidebar.tsx](../../../src/components/dashboard/sidebar.tsx)** (linhas 150-160)
   - Condicional para exibir menu "Descontos de Venda"
   - Baseado em `parameters.enable_descontos_venda`

**Tabela Criada**:
```sql
CREATE TABLE public.tenant_parameters (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id),
  enable_descontos_venda boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Regras de Negócio**:
- RN-PARAM-001: Parâmetros por Tenant
- RN-PARAM-002: Enable Descontos de Venda
- RN-PARAM-003: Valores Padrão

**Impacto**: ⚠️ MÉDIO

**Detalhamento do Impacto**:
- Novo menu de configuração adicionado
- Alteração no comportamento do menu lateral
- Tenants existentes devem ter parâmetros padrão
- Requer reload do contexto após alteração

**Breaking Changes**: ✅ Não

**Versão**: 1.1.0

---

## 2025-01-05 - Feature: Módulo de Setores

### Alteração Implementada

**Feature**: CRUD completo de setores de negócio

**Descrição**:
Implementação do módulo de Setores, permitindo que administradores criem, editem e deletem setores de negócio associados a departamentos da hierarquia de 6 níveis. Utilizado no módulo de Metas por Setor.

**Arquivos Criados/Modificados**:

1. **[src/components/configuracoes/setores-content.tsx](../../../src/components/configuracoes/setores-content.tsx)**
   - Listagem de setores
   - Dialog para criar/editar setor
   - Seleção de departamentos por nível (multi-select)
   - Picker de cor

2. **[src/app/api/setores/route.ts](../../../src/app/api/setores/route.ts)**
   - GET: Listar setores do schema
   - POST: Criar novo setor

3. **[src/app/api/setores/[id]/route.ts](../../../src/app/api/setores/[id]/route.ts)**
   - PUT: Atualizar setor
   - DELETE: Deletar setor (com validação de dependências)

4. **[src/app/api/setores/departamentos/route.ts](../../../src/app/api/setores/departamentos/route.ts)**
   - GET: Listar departamentos por nível

**Tabela Utilizada**:
```sql
-- Criada em cada schema
CREATE TABLE {schema}.setores (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cor text NOT NULL,
  departamento_id_nivel_1 integer[],
  departamento_id_nivel_2 integer[],
  departamento_id_nivel_3 integer[],
  departamento_id_nivel_4 integer[],
  departamento_id_nivel_5 integer[],
  departamento_id_nivel_6 integer[],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Regras de Negócio**:
- RN-SETOR-001: Criação de Setor
- RN-SETOR-002: Nome Único por Tenant
- RN-SETOR-003: Associação com Departamentos
- RN-SETOR-004: Edição de Setor
- RN-SETOR-005: Deleção de Setor
- RN-SETOR-006: Carregamento de Departamentos

**Impacto**: ⚠️ MÉDIO

**Detalhamento do Impacto**:
- Novo submódulo adicionado à página de Configurações
- Requer migração em schemas existentes
- Dependência com módulo de Metas por Setor
- Validação de deleção verifica metas associadas

**Breaking Changes**: ✅ Não

**Versão**: 1.2.0

---

## 2025-01-03 - Feature: Filiais Autorizadas

### Alteração Implementada

**Feature**: Sistema de controle de acesso por filial

**Descrição**:
Implementação de sistema que permite restringir o acesso de usuários a filiais específicas. Admins podem definir quais filiais um usuário pode visualizar e operar. Se nenhuma filial for especificada, o usuário tem acesso a todas.

**Arquivos Criados/Modificados**:

1. **Migration**: `supabase/migrations/XXX_create_user_authorized_branches.sql`
   - Criada tabela `public.user_authorized_branches`
   - Relacionamento muitos-para-muitos entre users e branches

2. **[src/components/usuarios/branch-selector.tsx](../../../src/components/usuarios/branch-selector.tsx)**
   - Multi-select de filiais autorizadas
   - Chip para cada filial selecionada
   - Botão "Limpar" para remover restrições

3. **[src/app/api/users/authorized-branches/route.ts](../../../src/app/api/users/authorized-branches/route.ts)**
   - GET: Listar filiais autorizadas
   - POST: Atualizar filiais (substituição completa)
   - DELETE: Remover filial específica

4. **[src/hooks/use-authorized-branches.ts](../../../src/hooks/use-authorized-branches.ts)**
   - Hook para carregar filiais autorizadas
   - Indicador de restrições ativas

5. **[src/components/usuarios/user-form.tsx](../../../src/components/usuarios/user-form.tsx)** (linhas 200-250)
   - Integração com BranchSelector
   - Salvamento de filiais autorizadas

**Tabela Criada**:
```sql
CREATE TABLE public.user_authorized_branches (
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  branch_id integer REFERENCES public.branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);
```

**Regras de Negócio**:
- RN-FILIAL-001: Controle de Acesso por Filial
- RN-FILIAL-002: Aplicação de Filtros
- RN-FILIAL-003: Gerenciamento de Autorizações
- RN-FILIAL-004: Validação de Filiais
- RN-FILIAL-005: Impacto em Relatórios

**Impacto**: 🔴 ALTO

**Detalhamento do Impacto**:
- Todos os módulos de relatórios devem respeitar filiais autorizadas
- Filtros de filiais devem considerar restrições
- "Todas as Filiais" passa a significar "Todas as Filiais Autorizadas"
- Queries devem incluir filtro: `WHERE filial_id IN (authorized_branches)`
- Usuários existentes sem restrições mantêm acesso total

**Breaking Changes**: ❌ Sim (parcial)

**Mudanças Necessárias**:
- Atualizar queries de relatórios para considerar `authorized_branches`
- Atualizar componentes de filtro para listar apenas filiais autorizadas
- Adicionar hook `useAuthorizedBranches` em páginas de relatório

**Versão**: 2.0.0

---

## 2025-01-01 - Initial: Implementação inicial do módulo

### Alteração Implementada

**Tipo**: Initial Implementation

**Descrição**:
Implementação inicial completa do módulo de Configurações com 5 submódulos: Perfil, Usuários, Parâmetros (placeholder), Setores (placeholder) e Empresas.

**Arquivos Criados**:

### **1. Página Hub de Configurações**

1. **[src/app/(dashboard)/configuracoes/page.tsx](../../../src/app/(dashboard)/configuracoes/page.tsx)**
   - Server Component com sistema de abas
   - 5 abas: Perfil, Usuários, Parâmetros, Setores, Empresas
   - Controle de visibilidade por role

2. **[src/components/configuracoes/perfil-content.tsx](../../../src/components/configuracoes/perfil-content.tsx)**
   - Exibição de dados do perfil
   - Formulário de edição de nome
   - Formulário de alteração de senha

3. **[src/components/configuracoes/usuarios-content.tsx](../../../src/components/configuracoes/usuarios-content.tsx)**
   - Listagem de usuários do tenant
   - Botão para criar novo usuário
   - Link para página completa de usuários

4. **[src/components/configuracoes/empresas-content.tsx](../../../src/components/configuracoes/empresas-content.tsx)**
   - Listagem de empresas (superadmin only)
   - Botão para criar nova empresa
   - Link para página completa de empresas

### **2. Módulo de Usuários**

5. **[src/app/(dashboard)/usuarios/page.tsx](../../../src/app/(dashboard)/usuarios/page.tsx)**
   - Listagem completa de usuários
   - Filtros e busca
   - Ordenação

6. **[src/app/(dashboard)/usuarios/novo/page.tsx](../../../src/app/(dashboard)/usuarios/novo/page.tsx)**
   - Página para criar novo usuário
   - Formulário completo

7. **[src/app/(dashboard)/usuarios/[id]/editar/page.tsx](../../../src/app/(dashboard)/usuarios/[id]/editar/page.tsx)**
   - Página para editar usuário existente
   - Carrega dados do usuário

8. **[src/components/usuarios/user-form.tsx](../../../src/components/usuarios/user-form.tsx)**
   - Formulário reutilizável (create/edit)
   - Validação com React Hook Form e Zod
   - Campos: email, nome, role, status

9. **[src/app/api/users/create/route.ts](../../../src/app/api/users/create/route.ts)**
   - API para criar usuário via Admin SDK
   - Validação de permissões
   - Criação de perfil

10. **[src/app/api/users/get-email/route.ts](../../../src/app/api/users/get-email/route.ts)**
    - API para obter email do usuário

11. **[src/app/api/users/update-email/route.ts](../../../src/app/api/users/update-email/route.ts)**
    - API para atualizar email via Admin SDK

### **3. Módulo de Empresas**

12. **[src/app/(dashboard)/empresas/page.tsx](../../../src/app/(dashboard)/empresas/page.tsx)**
    - Listagem de empresas (superadmin only)
    - Contagem de filiais

13. **[src/app/(dashboard)/empresas/nova/page.tsx](../../../src/app/(dashboard)/empresas/nova/page.tsx)**
    - Página para criar nova empresa
    - Formulário de empresa

14. **[src/app/(dashboard)/empresas/[id]/page.tsx](../../../src/app/(dashboard)/empresas/[id]/page.tsx)**
    - Detalhes da empresa
    - Gerenciador de filiais (BranchManager)

15. **[src/app/(dashboard)/empresas/[id]/editar/page.tsx](../../../src/app/(dashboard)/empresas/[id]/editar/page.tsx)**
    - Página para editar empresa existente

16. **[src/components/empresas/company-form.tsx](../../../src/components/empresas/company-form.tsx)**
    - Formulário reutilizável para empresas
    - Validação de schema

17. **[src/components/empresas/branch-manager.tsx](../../../src/components/empresas/branch-manager.tsx)**
    - CRUD completo de filiais
    - Listagem, criação, edição, deleção

### **4. Componentes de Perfil**

18. **[src/components/perfil/profile-form.tsx](../../../src/components/perfil/profile-form.tsx)**
    - Formulário para editar nome

19. **[src/components/perfil/password-form.tsx](../../../src/components/perfil/password-form.tsx)**
    - Formulário para alterar senha
    - Validação de senha atual

### **5. Hooks**

20. **[src/hooks/use-permissions.ts](../../../src/hooks/use-permissions.ts)**
    - Hook para verificar permissões
    - Retorna booleanos: isSuperAdmin, isAdmin, canManageUsers, etc.

21. **[src/hooks/use-branches.ts](../../../src/hooks/use-branches.ts)**
    - Hook para carregar filiais
    - Cache com SWR
    - Opção "Todas as Filiais"

### **Tabelas Utilizadas**:
```sql
-- Empresas/Tenants
public.tenants (id, name, supabase_schema)

-- Usuários
public.user_profiles (id, tenant_id, email, full_name, role, is_active)

-- Filiais
public.branches (id, tenant_id, name, code, is_active)
```

**Regras de Negócio Iniciais**:
- RN-PERM-001: Controle de Acesso por Role
- RN-PERM-002: Isolamento por Tenant
- RN-PERM-003: Restrição de Criação de Superadmin
- RN-PERFIL-001: Campos Editáveis
- RN-PERFIL-002: Validação de Senha
- RN-USER-001: Criação de Usuário
- RN-USER-002: Edição de Usuário
- RN-USER-003: Email Único
- RN-EMP-001: Criação de Empresa
- RN-EMP-002: Schema Único

**Impacto**: 🔴 ALTO

**Detalhamento do Impacto**:
- Novo módulo completo adicionado ao sistema
- 20+ arquivos criados
- 3 tabelas principais utilizadas
- Sistema de permissões implementado
- Multi-tenancy suportado

**Breaking Changes**: ✅ Não (implementação inicial)

**Versão**: 1.0.0

---

## Template para Novas Entradas

```markdown
## YYYY-MM-DD - [Tipo]: [Título]

### Alteração Implementada

**Tipo**: Feature | Fix | Refactor | Docs | Breaking Change

**Descrição**:
[Descrição detalhada da alteração]

**Arquivos Modificados**:

1. **[arquivo.tsx](../../src/caminho/arquivo.tsx)**
   - [Modificação] (linha X)
   - [Modificação] (linha Y)

2. **[outro-arquivo.ts](../../src/caminho/outro-arquivo.ts)**
   - [Modificação] (linha Z)

**Regras de Negócio**:
- RN-XXX-001: [Nova regra]
- RN-XXX-002: [Regra modificada]

**Impacto**: ✅ BAIXO | ⚠️ MÉDIO | 🔴 ALTO

**Detalhamento do Impacto**:
- [Descrição do impacto]
- [Mudanças necessárias]
- [Compatibilidade]

**Breaking Changes**: ✅ Não | ❌ Sim

[Se sim, descrever o que quebra e como migrar]

**Versão**: X.Y.Z
```

---

## Convenções de Versionamento

Seguindo [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes (mudanças incompatíveis)
- **MINOR** (0.X.0): Nova feature (backward compatible)
- **PATCH** (0.0.X): Bug fix (correção de bugs)

**Exemplos**:
- `1.0.0` → `1.0.1`: Bug fix (correção de validação)
- `1.0.0` → `1.1.0`: Nova feature (parâmetros por tenant)
- `1.0.0` → `2.0.0`: Breaking change (filiais autorizadas)

---

## Roadmap (Futuro)

### Funcionalidades Planejadas

**v1.3.0 - Avatar de Usuário**
- Upload de avatar
- Crop e resize de imagem
- Armazenamento no Supabase Storage

**v1.4.0 - Auditoria**
- Logs de todas as operações
- Histórico de alterações
- Tabela `audit_logs`

**v1.5.0 - Convites por Email**
- Sistema de convite de usuários
- Email com link de ativação
- Usuário define senha no primeiro acesso

**v2.1.0 - Grupos de Usuários**
- Criar grupos de usuários
- Permissões por grupo
- Tabela `user_groups`

**v2.2.0 - Permissões Granulares**
- Permissões por módulo
- Permissões por operação (create, read, update, delete)
- Tabela `permissions`

**v2.3.0 - Multi-tenant para Superadmins**
- Superadmin pode criar usuários em múltiplos tenants
- Gerenciamento centralizado

---

**Data de Criação**: 2025-01-12
**Versão Atual**: 1.2.0
**Última Atualização**: 2025-01-12
