# Módulo de Parâmetros por Tenant

**Data de Criação:** 2025-11-03
**Versão:** 1.0

## Visão Geral

O módulo de Parâmetros permite configurar funcionalidades específicas para cada tenant (empresa), controlando quais módulos do sistema estarão disponíveis ou não.

## Localização

- **Menu:** Configurações → Parâmetros
- **Acesso:** Requer permissão de Admin ou Superadmin
- **Escopo:** Configurações são específicas por tenant

## Parâmetros Disponíveis

### 1. Utiliza Módulo de Desconto Venda

- **Chave:** `enable_descontos_venda`
- **Tipo:** Boolean (Toggle)
- **Padrão:** `false` (Desabilitado)
- **Descrição:** Controla a disponibilidade do módulo "Descontos Venda" no menu Gerencial

**Quando Habilitado:**
- Módulo "Descontos Venda" aparece no menu Gerencial
- Rota `/descontos-venda` fica acessível
- Funcionalidades de registro de descontos ficam disponíveis

**Quando Desabilitado:**
- Módulo "Descontos Venda" é ocultado do menu
- Acesso direto via URL redireciona para o Dashboard
- Proteção aplicada via middleware

## Arquitetura

### 1. Banco de Dados

**Tabela:** `public.tenant_parameters`

```sql
CREATE TABLE public.tenant_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL,
  parameter_value BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, parameter_key)
);
```

**Índices:**
- `idx_tenant_parameters_tenant_id` - Por tenant
- `idx_tenant_parameters_key` - Por chave
- `idx_tenant_parameters_tenant_key` - Combinado (tenant + chave)

### 2. RLS Policies

- **SELECT:** Usuários podem ver parâmetros do próprio tenant
- **INSERT/UPDATE:** Admins e Superadmins podem modificar
- **DELETE:** Apenas Superadmins

### 3. Componentes

**Hook:** `src/hooks/use-tenant-parameters.ts`
```typescript
const { parameters, loading } = useTenantParameters(tenantId)
```

**Componente:** `src/components/configuracoes/parametros-content.tsx`
- Interface de configuração dos parâmetros
- Toggle switches para ativar/desativar

**Sidebar:** `src/components/dashboard/app-sidebar.tsx`
- Filtra itens do menu baseado nos parâmetros
- Oculta módulos desabilitados

**Middleware:** `src/lib/supabase/middleware.ts`
- Valida acesso às rotas protegidas
- Redireciona para dashboard se módulo desabilitado

## Fluxo de Funcionamento

```
1. Usuário acessa Configurações → Parâmetros
2. Admin altera toggle do parâmetro
3. Sistema salva na tabela tenant_parameters
4. Página recarrega automaticamente
5. Sidebar filtra módulos baseado nos parâmetros
6. Middleware protege rotas baseado nos parâmetros
```

## Como Adicionar Novos Parâmetros

### 1. Definir o Parâmetro

Adicionar ao hook `use-tenant-parameters.ts`:
```typescript
const [parameters, setParameters] = useState<Record<string, boolean>>({
  enable_descontos_venda: false,
  enable_novo_modulo: false, // Novo parâmetro
})
```

### 2. Adicionar UI no Componente

Adicionar ao `parametros-content.tsx`:
```tsx
<div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
  <div className="flex-1 space-y-1">
    <Label htmlFor="enable_novo_modulo" className="text-base font-medium cursor-pointer">
      Utiliza Novo Módulo
    </Label>
    <p className="text-sm text-muted-foreground">
      Descrição do novo módulo
    </p>
  </div>
  <Switch
    id="enable_novo_modulo"
    checked={parameters.enable_novo_modulo}
    onCheckedChange={(checked) => updateParameter('enable_novo_modulo', checked)}
    disabled={updating === 'enable_novo_modulo'}
  />
</div>
```

### 3. Aplicar Filtro no Sidebar

Adicionar lógica em `app-sidebar.tsx`:
```typescript
if (item.href === '/novo-modulo' && !parameters.enable_novo_modulo) {
  return false
}
```

### 4. Proteger Rota no Middleware

Adicionar validação em `middleware.ts`:
```typescript
if (user && request.nextUrl.pathname.startsWith('/novo-modulo')) {
  // Verificar parâmetro
  // Redirecionar se desabilitado
}
```

## Migrações

**Arquivo:** `supabase/migrations/20251103145022_create_tenant_parameters.sql`

Para aplicar:
```sql
-- Execute no Supabase SQL Editor
-- Ou via CLI:
supabase db push
```

## Permissões

| Ação | Viewer | User | Admin | Superadmin |
|------|--------|------|-------|------------|
| Visualizar Parâmetros | ❌ | ❌ | ✅ | ✅ |
| Modificar Parâmetros | ❌ | ❌ | ✅ | ✅ |
| Deletar Parâmetros | ❌ | ❌ | ❌ | ✅ |

## Comportamento Esperado

### Cenário 1: Módulo Desabilitado
1. Parâmetro `enable_descontos_venda` = `false`
2. Menu não exibe "Descontos Venda"
3. Acesso direto a `/descontos-venda` → Redirect para `/dashboard`

### Cenário 2: Módulo Habilitado
1. Parâmetro `enable_descontos_venda` = `true`
2. Menu exibe "Descontos Venda"
3. Acesso direto a `/descontos-venda` → Funciona normalmente

### Cenário 3: Tenant sem Parâmetros
1. Nenhum registro em `tenant_parameters` para o tenant
2. Comportamento padrão: Todos os módulos desabilitados
3. Admin pode habilitar conforme necessário

## Testes

### Manual
1. ✅ Acessar Configurações → Parâmetros
2. ✅ Desabilitar módulo "Descontos Venda"
3. ✅ Verificar que sumiu do menu
4. ✅ Tentar acessar `/descontos-venda` diretamente
5. ✅ Confirmar redirect para Dashboard
6. ✅ Habilitar módulo novamente
7. ✅ Verificar que voltou ao menu
8. ✅ Acessar módulo normalmente

### Automatizado
```bash
# TODO: Adicionar testes E2E
npm run test:e2e
```

## Troubleshooting

### Problema: Módulo não aparece no menu após habilitar
**Solução:** Recarregar a página (CTRL+R ou CMD+R)

### Problema: Erro ao salvar parâmetro
**Causa:** Falta de permissão ou RLS não configurado
**Solução:** Verificar role do usuário e policies RLS

### Problema: Redirect não funciona
**Causa:** Middleware não está consultando parâmetros
**Solução:** Verificar lógica em `middleware.ts`

## Próximos Passos

- [ ] Adicionar mais parâmetros (Despesas, DRE, etc)
- [ ] Criar API para gerenciar parâmetros
- [ ] Adicionar logs de auditoria para mudanças
- [ ] Implementar cache de parâmetros
- [ ] Criar interface visual de toggle mais elaborada
