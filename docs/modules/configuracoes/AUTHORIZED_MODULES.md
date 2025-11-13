# Módulos Autorizados por Usuário

> Status: ✅ Implementado | Versão: 1.0.0 | Data: 2025-01-12

## Visão Geral

O sistema de Módulos Autorizados permite controlar quais módulos do sistema cada usuário pode acessar. Este controle é aplicado **exclusivamente para usuários com role = `user`**. Superadmin e Admin sempre têm acesso completo a todos os módulos do sistema.

## Conceitos Fundamentais

### Módulos do Sistema

O sistema possui **7 módulos principais** que podem ser configurados individualmente para cada usuário:

1. **Dashboard** - Visão geral do sistema com indicadores principais
2. **DRE Gerencial** - Demonstrativo de Resultados do Exercício com análise de despesas
3. **Metas > Meta Mensal** - Gerenciamento de metas mensais por filial
4. **Metas > Meta por Setor** - Gerenciamento de metas por setor de negócio
5. **Relatórios > Ruptura ABCD** - Relatório de produtos em ruptura por curva ABC
6. **Relatórios > Venda por Curva** - Análise de vendas por curva ABC de produtos
7. **Relatórios > Ruptura Venda 60d** - Produtos sem venda nos últimos 60 dias

### Regras de Acesso

| Role | Comportamento de Acesso |
|------|------------------------|
| `superadmin` | ✅ Acesso automático a todos os módulos (não configurável) |
| `admin` | ✅ Acesso automático a todos os módulos (não configurável) |
| `user` | ⚙️ Deve ter pelo menos 1 módulo autorizado (configurável via checkboxes) |
| `viewer` | ❌ Sem acesso aos módulos (role obsoleto) |

## Arquitetura

### Database

#### Tabela: `user_authorized_modules`

```sql
CREATE TABLE public.user_authorized_modules (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module public.system_module NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module)
);
```

#### Tipo ENUM: `system_module`

```sql
CREATE TYPE public.system_module AS ENUM (
  'dashboard',
  'dre_gerencial',
  'metas_mensal',
  'metas_setor',
  'relatorios_ruptura_abcd',
  'relatorios_venda_curva',
  'relatorios_ruptura_60d'
);
```

#### RLS Policies

```sql
-- Usuários podem ver seus próprios módulos
CREATE POLICY "Users can view their own authorized modules"
  ON public.user_authorized_modules FOR SELECT
  USING (auth.uid() = user_id);

-- Admin e Superadmin podem gerenciar módulos
CREATE POLICY "Admin and Superadmin can manage authorized modules"
  ON public.user_authorized_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );
```

### TypeScript Types

**Arquivo**: `src/types/modules.ts`

```typescript
export const SYSTEM_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Visão geral do sistema com indicadores principais',
    order: 1,
    category: 'main',
    route: '/dashboard'
  },
  // ... outros 6 módulos
] as const;

export type SystemModule =
  | 'dashboard'
  | 'dre_gerencial'
  | 'metas_mensal'
  | 'metas_setor'
  | 'relatorios_ruptura_abcd'
  | 'relatorios_venda_curva'
  | 'relatorios_ruptura_60d';
```

## Componentes

### 1. RouteGuard

**Arquivo**: `src/components/auth/route-guard.tsx`

**Funcionalidade**: Protege rotas do dashboard contra acesso direto não autorizado. Redireciona usuário para o primeiro módulo autorizado se tentar acessar rota não permitida.

**Como funciona**:
- Envolvido no layout do dashboard (`src/app/(dashboard)/layout.tsx`)
- Verifica cada mudança de rota via `usePathname()`
- Chama `canAccessRoute()` do hook `useAuthorizedModules`
- Se acesso negado: redireciona para primeiro módulo autorizado
- Rotas públicas (sempre acessíveis): `/configuracoes`, `/perfil`

**Comportamento**:
```typescript
// Usuário com módulos: ['dashboard', 'metas_setor']
// Tenta acessar: /dre-gerencial
// → Redirecionado para: /dashboard (primeiro módulo autorizado)

// Usuário sem módulos autorizados
// Tenta acessar: /dashboard
// → Redirecionado para: /configuracoes
```

**Proteção aplicada em**:
- Sidebar: filtra itens de menu ✅
- Rotas diretas: redireciona automaticamente ✅
- URLs digitadas manualmente: redireciona automaticamente ✅

---

### 2. ModuleSelector

**Arquivo**: `src/components/usuarios/module-selector.tsx`

**Funcionalidade**: Componente de seleção de módulos via checkboxes, com botões "Selecionar Todos" e "Desselecionar Todos".

**Props**:
```typescript
interface ModuleSelectorProps {
  selectedModules: SystemModule[]
  onChange: (modules: SystemModule[]) => void
  disabled?: boolean
  showFullAccessMessage?: boolean
}
```

**Características**:
- ✅ Lista ordenada de 7 módulos com descrições
- ✅ Checkboxes individuais para cada módulo
- ✅ Botões de ação rápida (Selecionar/Desselecionar Todos)
- ✅ Alerta quando nenhum módulo está selecionado
- ✅ Contador de módulos selecionados
- ✅ Mensagem de "Acesso Full Automático" para superadmin/admin
- ✅ **Modo Criação**: Todos os módulos vêm pré-selecionados por padrão
- ✅ **Modo Edição**: Carrega módulos atuais do banco de dados

**Validação**:
- Pelo menos 1 módulo deve ser selecionado para role = user
- Alerta visual quando nenhum módulo está selecionado

### 3. User Form (Atualizado)

**Arquivo**: `src/components/usuarios/user-form.tsx`

**Mudanças**:
- Adicionado state `authorizedModules`
- Integrado componente `ModuleSelector`
- Carrega módulos autorizados ao editar usuário
- Envia `authorized_modules` na criação/edição
- Renderiza seletor apenas para role = user

## APIs

### GET /api/users/authorized-modules

**Descrição**: Lista os módulos autorizados de um usuário

**Query Parameters**:
- `userId` (string, required): UUID do usuário

**Response**:
```json
{
  "user_id": "uuid",
  "modules": ["dashboard", "dre_gerencial"],
  "role": "user",
  "has_full_access": false
}
```

**Comportamento**:
- Para `superadmin` e `admin`: retorna todos os 7 módulos com `has_full_access: true`
- Para `user`: retorna apenas módulos configurados
- Para `viewer` ou roles não reconhecidos: retorna array vazio

**Autenticação**: Requer role `admin` ou `superadmin`

---

### POST /api/users/authorized-modules

**Descrição**: Atualiza os módulos autorizados de um usuário (substituição completa)

**Body**:
```json
{
  "user_id": "uuid",
  "modules": ["dashboard", "metas_mensal"]
}
```

**Response**:
```json
{
  "user_id": "uuid",
  "modules": ["dashboard", "metas_mensal"],
  "message": "Authorized modules updated successfully"
}
```

**Validações**:
- ✅ `user_id` é obrigatório
- ✅ `modules` deve ser um array
- ✅ Todos os módulos devem ser válidos (validação via `isValidModule()`)
- ✅ Pelo menos 1 módulo deve ser selecionado
- ✅ Para `superadmin` e `admin`, ignora a atualização e retorna todos os módulos

**Comportamento**:
1. Deleta todos os módulos existentes do usuário
2. Insere os novos módulos fornecidos

**Autenticação**: Requer role `admin` ou `superadmin`

---

### POST /api/users/create (Atualizado)

**Mudanças**:
- Adicionado campo `authorized_modules` no body
- Validação: obrigatório para role = user
- Inserção dos módulos após criação do perfil

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "senha123",
  "full_name": "Nome do Usuário",
  "role": "user",
  "tenant_id": "uuid",
  "authorized_modules": ["dashboard", "dre_gerencial"]
}
```

## Hooks

### useAuthorizedModules

**Arquivo**: `src/hooks/use-authorized-modules.ts`

**Assinatura**:
```typescript
export function useAuthorizedModules(userId?: string): AuthorizedModulesState

interface AuthorizedModulesState {
  modules: SystemModule[]
  isLoading: boolean
  hasFullAccess: boolean
  hasModuleAccess: (moduleId: SystemModule) => boolean
  canAccessRoute: (route: string) => boolean
}
```

**Funcionalidade**:
- Carrega perfil e módulos autorizados do banco
- Para `superadmin` e `admin`: define `hasFullAccess = true` e retorna todos os módulos
- Para `user`: carrega módulos autorizados da tabela
- Funções auxiliares:
  - `hasModuleAccess()`: verifica se usuário tem acesso a um módulo específico
  - `canAccessRoute()`: verifica se usuário pode acessar uma rota (mapping route → module)

**Uso no Sidebar**:
```typescript
const { hasModuleAccess, hasFullAccess } = useAuthorizedModules()

// Filtragem de itens
if (item.moduleId && !hasFullAccess && !hasModuleAccess(item.moduleId)) {
  return false // Não exibir item
}
```

---

### useCanAccessRoute (simplificado)

**Funcionalidade**: Hook simplificado para verificar acesso a uma rota específica

```typescript
export function useCanAccessRoute(route: string): {
  canAccess: boolean
  isLoading: boolean
}
```

---

### useHasModuleAccess (simplificado)

**Funcionalidade**: Hook simplificado para verificar acesso a um módulo específico

```typescript
export function useHasModuleAccess(moduleId: SystemModule): {
  hasAccess: boolean
  isLoading: boolean
}
```

## Integração com Sidebar

**Arquivo**: `src/components/dashboard/app-sidebar.tsx`

**Mudanças**:
1. Adicionado import do hook `useAuthorizedModules`
2. Adicionado propriedade `moduleId?: SystemModule` nas interfaces de navegação
3. Mapeamento de módulos nos itens de menu:
   ```typescript
   const visaoGeralNavigation: NavigationItem[] = [
     {
       name: 'Dashboard',
       href: '/dashboard',
       icon: LayoutDashboard,
       moduleId: 'dashboard', // ← Adicionado
     },
   ]
   ```
4. Função `filterNavigation()` atualizada para verificar `hasModuleAccess()`

**Comportamento**:
- Se `item.moduleId` está definido E usuário não tem `hasFullAccess` E não tem acesso ao módulo → item não é exibido
- Se usuário tem `hasFullAccess` (superadmin/admin) → todos os itens são exibidos
- Filtragem recursiva para subitens (Metas, Relatórios)

## Fluxos de Uso

### Fluxo 1: Criar Usuário com Módulos

1. Admin acessa `/usuarios/novo`
2. Preenche dados do usuário
3. Seleciona role = `user`
4. Component `ModuleSelector` aparece
5. Seleciona módulos via checkboxes (pelo menos 1)
6. Clica em "Criar Usuário"
7. API cria usuário + perfil + módulos autorizados
8. Usuário pode fazer login e ver apenas os módulos configurados no sidebar

### Fluxo 2: Editar Módulos de Usuário Existente

1. Admin acessa `/usuarios/[id]/editar`
2. Formulário carrega módulos autorizados atuais via API
3. Admin altera seleção de módulos
4. Clica em "Salvar"
5. API deleta todos os módulos antigos e insere os novos
6. Usuário verá mudanças no sidebar ao recarregar

### Fluxo 3: Verificação de Acesso (Sidebar)

1. Sidebar carrega e chama `useAuthorizedModules()`
2. Hook busca perfil do usuário autenticado
3. Se `superadmin` ou `admin`: retorna `hasFullAccess = true`
4. Se `user`: busca módulos autorizados do banco
5. Função `filterNavigation()` itera sobre itens de menu
6. Para cada item com `moduleId`, verifica `hasModuleAccess()`
7. Itens sem permissão são removidos do menu

## Validações

### Frontend (user-form.tsx)

```typescript
if (role === 'user' && authorizedModules.length === 0) {
  setError('Pelo menos um módulo deve ser selecionado para usuários')
  return
}
```

### Backend (API create/update)

```typescript
// Criar usuário
if (role === 'user' && (!authorized_modules || authorized_modules.length === 0)) {
  return NextResponse.json({
    error: 'Pelo menos um módulo deve ser selecionado para usuários'
  }, { status: 400 })
}

// Atualizar módulos
if (modules.length === 0) {
  return NextResponse.json({
    error: 'At least one module must be selected'
  }, { status: 400 })
}
```

## Segurança

### Row Level Security (RLS)

- ✅ Usuários só podem ver seus próprios módulos autorizados
- ✅ Apenas Admin e Superadmin podem gerenciar módulos de outros usuários
- ✅ Políticas aplicadas em nível de banco de dados

### Validação de Roles

- ✅ APIs verificam role do solicitante (admin/superadmin)
- ✅ Superadmin e Admin não podem ter módulos configurados (acesso full automático)
- ✅ Validação dupla: frontend e backend

### Isolamento de Dados

- ✅ Queries sempre filtradas por `user_id`
- ✅ Usuários não podem alterar seus próprios módulos
- ✅ Apenas admin do mesmo tenant pode gerenciar módulos

## Observações Importantes

⚠️ **Pontos de Atenção**:

1. **Migração obrigatória**: Execute a migration `20250112_create_user_authorized_modules.sql` antes de usar
2. **Usuários existentes**: Após deploy, configure módulos para usuários existentes com role = user
3. **Acesso padrão**: Sem configuração, usuários com role = user NÃO terão acesso a nenhum módulo
4. **Descontos Venda**: Este módulo não está na lista de módulos configuráveis (controlado por parâmetro do tenant)
5. **Configurações**: Sempre acessível a todos (não está na lista de módulos)
6. **Cache**: Mudanças em módulos requerem reload do usuário para refletir no sidebar

## Testes

### Cenários de Teste

1. ✅ Criar usuário com role = user sem módulos → deve falhar
2. ✅ Criar usuário com role = user com 1 módulo → deve passar
3. ✅ Criar usuário com role = admin → não deve validar módulos
4. ✅ Editar módulos de usuário existente → deve substituir completamente
5. ✅ Tentar acessar API sem ser admin → deve retornar 403
6. ✅ Usuário com role = user sem módulo "dashboard" → Dashboard não aparece no sidebar
7. ✅ Superadmin → todos os módulos aparecem no sidebar independente de configuração
8. ✅ Desselecionar todos os módulos → alerta visual no form

## Próximos Passos / Melhorias Futuras

- [ ] Página de auto-serviço para usuário solicitar acesso a novos módulos
- [ ] Logs de auditoria de mudanças em módulos autorizados
- [ ] Notificação ao usuário quando seus módulos são alterados
- [ ] Exportar configuração de módulos de um usuário para outro
- [ ] Dashboard de analytics: módulos mais/menos utilizados
- [ ] Expiração automática de acesso a módulos (com data limite)
- [ ] Grupos de módulos pré-configurados (templates de acesso)

## Referências

- Migration: [supabase/migrations/20250112_create_user_authorized_modules.sql](../../../supabase/migrations/20250112_create_user_authorized_modules.sql)
- Types: [src/types/modules.ts](../../../src/types/modules.ts)
- API: [src/app/api/users/authorized-modules/route.ts](../../../src/app/api/users/authorized-modules/route.ts)
- Hook: [src/hooks/use-authorized-modules.ts](../../../src/hooks/use-authorized-modules.ts)
- Component: [src/components/usuarios/module-selector.tsx](../../../src/components/usuarios/module-selector.tsx)
- Sidebar: [src/components/dashboard/app-sidebar.tsx](../../../src/components/dashboard/app-sidebar.tsx)
