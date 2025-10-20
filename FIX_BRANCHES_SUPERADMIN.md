# Fix: Filiais não aparecem para Superadmin

**Data:** 2025-10-20

## Problema Identificado

O usuário superadmin não conseguia visualizar, editar ou adicionar filiais na página de detalhes da empresa (`/empresas/[id]`).

## Causa Raiz

A API de branches (`/api/branches/route.ts`) estava esperando o parâmetro `id` nas requisições DELETE e PATCH, mas:

1. A tabela `branches` usa `branch_code` como PRIMARY KEY (não tem coluna `id`)
2. O componente `BranchManager` estava enviando `branch_code` corretamente
3. A API estava tentando buscar por `id` que não existe

## Soluções Aplicadas

### 1. Corrigido DELETE em `/api/branches/route.ts`

**Antes:**
```typescript
const branchId = searchParams.get('id')
// ...
.eq('id', branchId)
```

**Depois:**
```typescript
const branchCode = searchParams.get('branch_code')
// ...
.eq('branch_code', branchCode)
```

### 2. Corrigido PATCH em `/api/branches/route.ts`

**Antes:**
```typescript
const branchId = searchParams.get('id')
// ...
.eq('id', branchId)
```

**Depois:**
```typescript
const branchCode = searchParams.get('branch_code')
// ...
.eq('branch_code', branchCode)
```

### 3. Adicionado Logs de Debug

Adicionados logs no componente `BranchManager` para facilitar troubleshooting:
- Log do tenant_id ao carregar
- Log do status da resposta
- Log dos dados retornados
- Log do número de filiais carregadas

## Estrutura da Tabela Branches

```sql
CREATE TABLE public.branches (
  branch_code VARCHAR(50) NOT NULL PRIMARY KEY,  -- Chave primária
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  store_code VARCHAR(50),
  descricao VARCHAR(255),
  cep VARCHAR(10),
  rua VARCHAR(255),
  numero VARCHAR(20),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Políticas RLS

As políticas estão corretas e permitem que:
- Superadmin: pode ver, criar, editar e deletar todas as filiais
- Admin: pode ver, criar, editar e deletar filiais do seu tenant
- User: pode ver filiais do seu tenant

## Fluxo de Uso (Superadmin)

1. Acessar `/empresas` (listagem de empresas)
2. Clicar em uma empresa
3. Ver página `/empresas/[id]` com:
   - Informações da empresa
   - Componente `BranchManager` com:
     - Botão "Nova Filial"
     - Lista de filiais existentes
     - Botões de editar e excluir em cada filial

## Arquivos Modificados

- `/src/app/api/branches/route.ts` - Corrigido DELETE e PATCH
- `/src/components/branches/branch-manager.tsx` - Adicionado logs de debug

## Teste

Para testar:
1. Login como superadmin
2. Acessar página de uma empresa
3. Verificar se as filiais aparecem
4. Tentar adicionar uma nova filial
5. Tentar editar uma filial existente
6. Tentar excluir uma filial
7. Verificar console do browser para logs

## Observações

- O componente já estava correto, enviando `branch_code`
- A API GET já estava correta
- Apenas DELETE e PATCH estavam com o parâmetro errado
- As políticas RLS estão funcionando corretamente
