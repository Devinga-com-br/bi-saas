# Sistema de Auditoria - Audit Logs

## Visão Geral

Sistema de logs de auditoria implementado para rastrear acessos dos usuários aos módulos do sistema.

## Estrutura do Banco de Dados

### Tabela: `public.audit_logs`

Tabela centralizada no schema `public` para registrar todos os acessos.

**Colunas:**
- `id` (uuid) - PK, auto-gerado
- `user_id` (uuid) - FK para auth.users, NOT NULL
- `tenant_id` (uuid) - FK para public.tenants, nullable
- `module` (text) - Módulo acessado: 'dashboard', 'usuarios', 'relatorios', 'configuracoes'
- `sub_module` (text) - Sub-módulo específico (ex: 'ruptura-abcd' para relatórios)
- `action` (text) - Ação realizada (default: 'access')
- `metadata` (jsonb) - Metadados adicionais
- `ip_address` (inet) - IP do usuário
- `user_agent` (text) - User agent do navegador
- `created_at` (timestamptz) - Data/hora em UTC-3 (America/Sao_Paulo)

### Índices

- `idx_audit_logs_user_id` - Por usuário
- `idx_audit_logs_tenant_id` - Por tenant
- `idx_audit_logs_module` - Por módulo
- `idx_audit_logs_created_at` - Por data (DESC)
- `idx_audit_logs_user_created` - Composto: user_id + created_at (DESC)

### Políticas RLS

1. **Superadmins** podem visualizar todos os logs
2. **Usuários** podem visualizar apenas seus próprios logs
3. **Todos autenticados** podem inserir logs

## Implementação

### Function RPC: `insert_audit_log`

```sql
public.insert_audit_log(
  p_module text,
  p_sub_module text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
```

Função com SECURITY DEFINER para inserir logs automaticamente com timezone de São Paulo.

### Biblioteca Client: `@/lib/audit.ts`

```typescript
import { logModuleAccess } from '@/lib/audit'

// Exemplo de uso
await logModuleAccess({
  module: 'dashboard',
  tenantId: currentTenant.id
})

// Com sub-módulo
await logModuleAccess({
  module: 'relatorios',
  subModule: 'ruptura-abcd',
  tenantId: currentTenant.id
})
```

### Component Wrapper: `@/components/audit-wrapper.tsx`

Para páginas server-side que precisam de log de auditoria:

```typescript
import { AuditWrapper } from '@/components/audit-wrapper'

export default async function Page() {
  return (
    <AuditWrapper module="usuarios">
      {/* Conteúdo da página */}
    </AuditWrapper>
  )
}
```

## Módulos com Auditoria

### ✅ Implementados

1. **Dashboard** (`/dashboard`)
   - Module: `dashboard`
   - Implementação: useEffect em client component

2. **Usuários** (`/usuarios`)
   - Module: `usuarios`
   - Implementação: AuditWrapper

3. **Relatórios - Ruptura ABCD** (`/relatorios/ruptura-abcd`)
   - Module: `relatorios`
   - SubModule: `ruptura-abcd`
   - Implementação: useEffect em client component

4. **Configurações** (`/configuracoes`)
   - Module: `configuracoes`
   - Implementação: useEffect em client component

## Como Adicionar Auditoria em Novas Páginas

### Para Client Components

```typescript
'use client'

import { useEffect } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { logModuleAccess } from '@/lib/audit'

export default function MyPage() {
  const { currentTenant } = useTenantContext()

  useEffect(() => {
    if (currentTenant) {
      logModuleAccess({
        module: 'dashboard', // ou 'usuarios', 'relatorios', 'configuracoes'
        subModule: 'meu-relatorio', // opcional
        tenantId: currentTenant.id
      })
    }
  }, [currentTenant])

  return <div>...</div>
}
```

### Para Server Components

```typescript
import { AuditWrapper } from '@/components/audit-wrapper'

export default async function MyServerPage() {
  // ... lógica server-side
  
  return (
    <AuditWrapper module="usuarios" subModule="detalhes">
      {/* Conteúdo da página */}
    </AuditWrapper>
  )
}
```

## Consultas Úteis

### Ver logs de um usuário específico
```sql
SELECT * FROM public.audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Ver acessos por módulo
```sql
SELECT module, COUNT(*) as total
FROM public.audit_logs
GROUP BY module
ORDER BY total DESC;
```

### Ver logs de um tenant
```sql
SELECT al.*, up.full_name, up.email
FROM public.audit_logs al
JOIN public.user_profiles up ON up.id = al.user_id
WHERE al.tenant_id = 'tenant-uuid'
ORDER BY al.created_at DESC;
```

### Logs das últimas 24 horas
```sql
SELECT * FROM public.audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Migration

Migration: `022_create_audit_logs.sql`

Para aplicar manualmente no Supabase:
1. Acesse SQL Editor no Supabase Dashboard
2. Execute o conteúdo do arquivo de migration
3. Verifique se a tabela e function foram criadas

## Próximos Passos

- [ ] Adicionar IP address e user agent aos logs
- [ ] Criar página de visualização de logs para superadmins
- [ ] Implementar filtros e busca de logs
- [ ] Adicionar exportação de logs
- [ ] Implementar limpeza automática de logs antigos (retention policy)
