# Arquitetura de Criação de Usuários

## Como Funciona

A criação de usuários neste sistema **NÃO usa triggers do banco de dados**. Todo o processo é gerenciado pela API.

## Fluxo de Criação

### 1. API Endpoint: `/api/users/create`

**Arquivo:** [src/app/api/users/create/route.ts](src/app/api/users/create/route.ts)

**Fluxo:**

```
POST /api/users/create
  ↓
1. Valida autenticação e permissões do usuário logado
  ↓
2. Valida dados do novo usuário (email, password, full_name, role, tenant_id)
  ↓
3. Verifica se email já existe
  ↓
4. Cria usuário no Supabase Auth usando Admin API
   → supabaseAdmin.auth.admin.createUser()
  ↓
5. Cria perfil em user_profiles usando Service Role
   → supabaseAdmin.from('user_profiles').insert()
  ↓
6. Se houver erro no passo 5, deleta o usuário criado no passo 4
  ↓
7. Retorna sucesso
```

### 2. Segurança e Permissões

**Service Role Key:**
- A API usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Isso permite criar perfis mesmo com políticas restritivas

**Validações:**
- **Admin**: Só pode criar usuários na própria empresa (mesmo `tenant_id`)
- **Superadmin**: Pode criar usuários em qualquer empresa
- **Admin**: Não pode criar outros superadmins

### 3. Campos Criados

**auth.users:**
```typescript
{
  email: string,
  password: string,
  email_confirm: true, // Auto-confirma email
  user_metadata: {
    full_name: string
  }
}
```

**user_profiles:**
```typescript
{
  id: auth_user_id,
  full_name: string,
  role: 'superadmin' | 'admin' | 'user' | 'viewer',
  tenant_id: uuid | null, // null para superadmin
  is_active: boolean,
  can_switch_tenants: boolean // true para superadmin
}
```

## Por Que Não Usamos Triggers?

### ❌ Problema com Trigger Antigo

O sistema tinha um trigger `on_auth_user_created` que executava uma função `handle_new_user()` com os seguintes problemas:

1. **Criava tenant automaticamente** para cada novo usuário
   ```sql
   INSERT INTO tenants (name, slug)
   VALUES (user_name, 'tenant-' || user_id)
   ```

2. **Não podia ser editado** sem permissões especiais na tabela `auth.users`

3. **Causava dados inconsistentes** - usuários viravam empresas

### ✅ Solução Atual (API Manual)

**Vantagens:**

1. **Controle total**: API controla exatamente o que é criado
2. **Validações complexas**: Pode validar tenant, role, permissões
3. **Transações seguras**: Se falhar, pode desfazer (linha 141)
4. **Sem permissões especiais**: Não precisa de acesso à tabela `auth.users`
5. **Logs e debug**: Fácil adicionar logs e tratamento de erros

## Importante

### ⚠️ Nunca Crie Usuários Diretamente no Supabase Dashboard

Se você criar um usuário pelo Supabase Dashboard (seção Authentication), ele **NÃO terá perfil em `user_profiles`**.

**Sempre use:**
- A API `/api/users/create`
- Ou a interface web em `/usuarios`

### ✅ Como Testar Criação de Usuário

1. Faça login como admin ou superadmin
2. Acesse `/usuarios`
3. Clique em "Novo Usuário"
4. Preencha os dados e selecione a empresa
5. Clique em "Criar Usuário"

O sistema irá:
- Criar usuário no `auth.users`
- Criar perfil em `user_profiles`
- **NÃO criar tenant** (empresa já deve existir)

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│  Frontend: /usuarios → "Novo Usuário"                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  API: POST /api/users/create                            │
│  - Valida permissões                                    │
│  - Valida tenant existe                                 │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴──────────┐
         ↓                      ↓
┌─────────────────┐    ┌──────────────────┐
│  auth.users     │    │  user_profiles   │
│  (Supabase Auth)│    │  (App Database)  │
│                 │    │                  │
│  - email        │    │  - full_name     │
│  - password     │←───┤  - role          │
│  - metadata     │ id │  - tenant_id     │
└─────────────────┘    └──────────────────┘
                              │
                              ↓
                       ┌──────────────┐
                       │   tenants    │
                       │  (Empresas)  │
                       │              │
                       │  - name      │
                       │  - cnpj      │
                       └──────────────┘
```

## Histórico

- **Antes (com trigger)**: Usuário → Trigger cria tenant + profile ❌
- **Agora (API manual)**: Usuário → API cria apenas profile ✅

## Conclusão

✅ **Não precisamos de triggers**
✅ **API controla tudo**
✅ **Dados consistentes**
✅ **Fácil de manter e debugar**
