# Sistema de Filiais Autorizadas por Usuário

## Visão Geral

O sistema de filiais autorizadas permite restringir o acesso de usuários a filiais específicas dentro de uma empresa. Por padrão, todos os usuários têm acesso a todas as filiais da sua empresa. Quando filiais são configuradas para um usuário, ele terá acesso APENAS àquelas filiais.

## Estrutura do Banco de Dados

### Tabela `user_authorized_branches`

```sql
CREATE TABLE public.user_authorized_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);
```

### Regra de Negócio

- **Vazio = Acesso Total**: Se a tabela não tem registros para um usuário, ele tem acesso a TODAS as filiais
- **Com Registros = Acesso Restrito**: Se há registros, usuário tem acesso APENAS às filiais listadas

## Interface do Usuário

### Cadastro/Edição de Usuário

No formulário de usuário ([src/components/users/user-form.tsx](../src/components/users/user-form.tsx)), há um componente `BranchSelector` que permite:

1. Selecionar múltiplas filiais usando um MultiSelect
2. Ver badges com as filiais selecionadas
3. Remover filiais clicando no X em cada badge
4. Feedback visual mostrando se o usuário tem acesso total ou restrito

### Componente BranchSelector

```tsx
<BranchSelector
  tenantId={tenantId}
  value={authorizedBranches}        // Array de branch IDs
  onChange={setAuthorizedBranches}  // Callback
  disabled={loading}
/>
```

## Uso em APIs

### 1. Hook para Frontend

```typescript
import { useAuthorizedBranches } from '@/hooks/use-authorized-branches'

const {
  authorizedBranches,    // Array com detalhes das filiais
  hasRestrictions,       // Boolean
  addBranch,            // Função para adicionar
  removeBranch,         // Função para remover
  setBranches           // Função para substituir todas
} = useAuthorizedBranches({ userId })
```

### 2. Funções Helper para Backend

```typescript
import {
  getUserAuthorizedBranchIds,
  getUserAuthorizedBranchCodes,
  filterBranchByAuthorization
} from '@/lib/authorized-branches'

// Em uma API Route
const authorizedBranchIds = await getUserAuthorizedBranchIds(supabase, user.id)
// Retorna: null (sem restrições) OU ['uuid1', 'uuid2', ...]

const authorizedCodes = await getUserAuthorizedBranchCodes(supabase, user.id)
// Retorna: null (sem restrições) OU ['01', '02', ...]
```

### 3. Padrão para APIs de Relatórios

Todas as APIs de relatórios devem seguir este padrão:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Get query params
  const { searchParams } = new URL(request.url)
  const requestedFilialId = searchParams.get('filialId') || 'all'

  // Get user's authorized branches
  const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

  // Determine which filial(s) to use
  let finalFilialId: string | string[]

  if (authorizedBranches === null) {
    // User has no restrictions - use requested value
    finalFilialId = requestedFilialId
  } else if (requestedFilialId === 'all') {
    // User requested all but has restrictions - use authorized branches
    finalFilialId = authorizedBranches
  } else if (authorizedBranches.includes(requestedFilialId)) {
    // User requested specific branch and has access
    finalFilialId = requestedFilialId
  } else {
    // User requested branch they don't have access to - use authorized branches
    finalFilialId = authorizedBranches
  }

  // Use finalFilialId in RPC call or query
  const { data, error } = await supabase.rpc('get_report', {
    p_schema: schema,
    p_filial_id: finalFilialId,  // Can be string or array
    // ... other params
  })
}
```

### 4. Suporte em Funções RPC

As funções RPC do PostgreSQL devem aceitar tanto string quanto array:

```sql
CREATE OR REPLACE FUNCTION get_report(
  p_schema TEXT,
  p_filial_id TEXT,  -- Pode ser 'all', '01', ou '01,02,03'
  p_mes INT,
  p_ano INT
)
RETURNS TABLE (...) AS $$
BEGIN
  -- Se p_filial_id contém vírgula, dividir em array
  -- Se é 'all', não filtrar por filial
  -- Caso contrário, filtrar pela filial específica
END;
$$ LANGUAGE plpgsql;
```

Ou aceitar array diretamente:

```sql
CREATE OR REPLACE FUNCTION get_report(
  p_schema TEXT,
  p_filial_ids TEXT[],  -- Array de códigos
  p_mes INT,
  p_ano INT
)
RETURNS TABLE (...) AS $$
BEGIN
  -- Filtrar usando: WHERE filial_codigo = ANY(p_filial_ids)
  -- Ou: WHERE (p_filial_ids IS NULL OR filial_codigo = ANY(p_filial_ids))
END;
$$ LANGUAGE plpgsql;
```

## Filtro Automático na API de Branches

A API `/api/branches` já filtra automaticamente as filiais retornadas baseado nas autorizações do usuário:

```typescript
// GET /api/branches?tenant_id=xxx
// Retorna apenas as filiais que o usuário tem acesso
```

Isso significa que o componente `BranchSelector` e dropdowns de filiais automaticamente mostrarão apenas as opções disponíveis para cada usuário.

## Casos de Uso

### Caso 1: Usuário Gerente de Loja

- **Situação**: Gerente da Filial 03
- **Configuração**: Adicionar apenas Filial 03 nas autorizações
- **Resultado**: Usuário vê apenas dados da Filial 03 em todos os relatórios

### Caso 2: Usuário Supervisor Regional

- **Situação**: Supervisor das Filiais 01, 02 e 03
- **Configuração**: Adicionar Filiais 01, 02 e 03 nas autorizações
- **Resultado**: Usuário vê dados agregados ou individuais dessas 3 filiais

### Caso 3: Usuário Diretor

- **Situação**: Acesso a todas as filiais
- **Configuração**: Deixar campo vazio (sem filiais autorizadas)
- **Resultado**: Usuário vê todas as filiais da empresa

## Checklist de Implementação em Novos Módulos

Ao criar um novo módulo/relatório, seguir esses passos:

- [ ] Usar helper `getUserAuthorizedBranchCodes()` na API
- [ ] Implementar lógica de filtragem: `requestedFilialId` vs `authorizedBranches`
- [ ] Passar filiais corretas para função RPC
- [ ] Testar com usuário sem restrições (deve ver tudo)
- [ ] Testar com usuário com 1 filial autorizada
- [ ] Testar com usuário com múltiplas filiais autorizadas
- [ ] Testar mudança de "Todas" para filial específica
- [ ] Verificar que usuário não consegue ver dados de filiais não autorizadas

## Benefícios

1. **Segurança**: Usuários só veem dados que podem acessar
2. **Flexibilidade**: Desde acesso total até acesso granular por filial
3. **Transparente**: Usuários não sabem que há restrições (UI mostra apenas suas opções)
4. **Auditável**: Todas as autorizações ficam registradas no banco
5. **Performático**: Filtragem acontece no banco de dados, não no frontend

## Migration

Para habilitar o sistema, executar a migration:

```bash
# Migration já está em: supabase/migrations/070_create_user_authorized_branches.sql
```

A migration cria:
- Tabela `user_authorized_branches`
- Índices para performance
- RLS policies para segurança
- Funções helper SQL
