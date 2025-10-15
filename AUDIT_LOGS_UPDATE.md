# Atualização Audit Logs - Adicionar Nome e Email do Usuário

## Alterações Realizadas

### 1. Migration SQL
Criada a migration `023_add_user_info_to_audit_logs.sql` que adiciona as colunas `user_name` e `user_email` à tabela `audit_logs` e atualiza a função `insert_audit_log`.

### 2. Para Aplicar a Migration

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- Add user_name and user_email columns to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email text;

-- Update the function to include user_name and user_email
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_module text,
  p_sub_module text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_user_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    user_email,
    tenant_id,
    module,
    sub_module,
    action,
    metadata,
    created_at
  ) VALUES (
    auth.uid(),
    p_user_name,
    p_user_email,
    p_tenant_id,
    p_module,
    p_sub_module,
    p_action,
    p_metadata,
    NOW() AT TIME ZONE 'America/Sao_Paulo'
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
```

### 3. Alterações no Código

Os seguintes arquivos foram atualizados para passar o nome e email do usuário nos logs:

- `src/lib/audit.ts` - Atualizado para aceitar `userName` e `userEmail` como parâmetros
- `src/app/(dashboard)/dashboard/page.tsx` - Passa dados do usuário ao logar acesso
- `src/app/(dashboard)/configuracoes/page.tsx` - Passa dados do usuário ao logar acesso
- `src/app/(dashboard)/relatorios/ruptura-abcd/page.tsx` - Passa dados do usuário ao logar acesso
- `src/components/audit-wrapper.tsx` - Passa dados do usuário ao logar acesso

### 4. Estrutura da Tabela Atualizada

A tabela `audit_logs` agora possui:
- `user_id` (uuid) - ID do usuário
- `user_name` (text) - Nome completo do usuário
- `user_email` (text) - Email do usuário
- `tenant_id` (uuid) - ID do tenant/empresa
- `module` (text) - Módulo acessado
- `sub_module` (text) - Submódulo (opcional)
- `action` (text) - Ação realizada
- `metadata` (jsonb) - Dados adicionais
- `created_at` (timestamptz) - Data/hora no fuso de São Paulo

### 5. Como Verificar

Após aplicar a migration e acessar qualquer módulo do sistema, você pode verificar os logs com:

```sql
SELECT 
  user_name,
  user_email,
  module,
  sub_module,
  created_at
FROM public.audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

Os logs agora incluirão o nome e email do usuário que acessou cada módulo.
