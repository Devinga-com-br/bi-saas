# Estruturas de Dados - Autenticação e Recuperação de Senha

**Última Atualização:** 2025-01-14  
**Versão:** 1.0.0

## Índice

1. [Tipos TypeScript](#tipos-typescript)
2. [Estruturas de Resposta](#estruturas-de-resposta)
3. [Estruturas de Estado](#estruturas-de-estado)
4. [Estruturas de Banco de Dados](#estruturas-de-banco-de-dados)
5. [Interfaces de Erro](#interfaces-de-erro)

---

## Tipos TypeScript

### User (Supabase Auth)

```typescript
/**
 * Tipo de usuário retornado pelo Supabase Auth
 * @see https://supabase.com/docs/reference/javascript/auth-user
 */
interface User {
  /** ID único do usuário (UUID) */
  id: string
  
  /** Email do usuário */
  email: string
  
  /** Timestamp da última vez que o email foi confirmado */
  email_confirmed_at?: string
  
  /** Telefone do usuário (opcional) */
  phone?: string
  
  /** Timestamp da última vez que o telefone foi confirmado */
  phone_confirmed_at?: string
  
  /** Data/hora da última vez que o usuário fez login */
  last_sign_in_at?: string
  
  /** Metadata público do app */
  app_metadata: {
    provider?: string
    [key: string]: any
  }
  
  /** Metadata customizado do usuário */
  user_metadata: {
    [key: string]: any
  }
  
  /** Identidades OAuth vinculadas */
  identities?: Identity[]
  
  /** Data/hora de criação */
  created_at: string
  
  /** Data/hora de última atualização */
  updated_at: string
  
  /** Role do usuário (definido no auth.users) */
  role?: string
  
  /** Fator de autenticação de 2 fatores */
  aal?: 'aal1' | 'aal2'
}
```

---

### Session (Supabase Auth)

```typescript
/**
 * Sessão de autenticação do Supabase
 */
interface Session {
  /** Access token JWT */
  access_token: string
  
  /** Refresh token para renovar a sessão */
  refresh_token: string
  
  /** Tempo de expiração do token (em segundos) */
  expires_in: number
  
  /** Timestamp de expiração */
  expires_at?: number
  
  /** Tipo de token (sempre 'bearer') */
  token_type: 'bearer'
  
  /** Dados do usuário */
  user: User
}
```

---

### UserProfile (Database)

```typescript
/**
 * Perfil do usuário armazenado na tabela user_profiles
 * @table public.user_profiles
 */
interface UserProfile {
  /** ID do usuário (FK para auth.users) */
  id: string
  
  /** ID do tenant ao qual o usuário pertence */
  tenant_id: string
  
  /** Nome completo do usuário */
  name: string
  
  /** Email (espelhado de auth.users) */
  email: string
  
  /** Role/função do usuário no sistema */
  role: 'superadmin' | 'admin' | 'user'
  
  /** Status ativo/inativo */
  is_active: boolean
  
  /** URL da foto de perfil */
  avatar_url?: string
  
  /** Data de criação */
  created_at: string
  
  /** Data de última atualização */
  updated_at: string
  
  /** Metadata adicional */
  metadata?: {
    last_login?: string
    preferences?: Record<string, any>
    [key: string]: any
  }
}
```

---

### Tenant (Database)

```typescript
/**
 * Informações do tenant/empresa
 * @table public.tenants
 */
interface Tenant {
  /** ID único do tenant (UUID) */
  id: string
  
  /** Nome da empresa */
  name: string
  
  /** Nome do schema PostgreSQL do tenant */
  supabase_schema: string
  
  /** Status ativo/inativo */
  is_active: boolean
  
  /** URL do logo */
  logo_url?: string
  
  /** Configurações do tenant */
  settings?: {
    theme?: string
    timezone?: string
    [key: string]: any
  }
  
  /** Data de criação */
  created_at: string
  
  /** Data de última atualização */
  updated_at: string
}
```

---

## Estruturas de Resposta

### AuthResponse (Login)

```typescript
/**
 * Resposta do método signInWithPassword
 */
interface SignInResponse {
  data: {
    /** Usuário autenticado */
    user: User | null
    
    /** Sessão criada */
    session: Session | null
  }
  
  /** Erro caso ocorra */
  error: AuthError | null
}

/**
 * Exemplo de resposta bem-sucedida:
 */
const successResponse: SignInResponse = {
  data: {
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'usuario@exemplo.com',
      email_confirmed_at: '2025-01-14T10:30:00Z',
      created_at: '2025-01-01T08:00:00Z',
      updated_at: '2025-01-14T10:30:00Z',
      app_metadata: { provider: 'email' },
      user_metadata: {}
    },
    session: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refresh_token: 'v1.MRjXV...',
      expires_in: 3600,
      token_type: 'bearer',
      user: { /* ... */ }
    }
  },
  error: null
}
```

---

### RecoveryResponse (Esqueci Senha)

```typescript
/**
 * Resposta do método resetPasswordForEmail
 */
interface RecoveryResponse {
  data: {
    /** Sempre vazio por segurança */
    [key: string]: never
  }
  
  /** Erro caso ocorra */
  error: AuthError | null
}

/**
 * Exemplo de resposta bem-sucedida:
 */
const successResponse: RecoveryResponse = {
  data: {},
  error: null
}

/**
 * Nota: Por segurança, Supabase SEMPRE retorna sucesso,
 * mesmo se o email não existir no sistema.
 * Isso previne enumeração de usuários.
 */
```

---

### UpdateUserResponse (Reset Password)

```typescript
/**
 * Resposta do método updateUser
 */
interface UpdateUserResponse {
  data: {
    /** Usuário atualizado */
    user: User | null
  }
  
  /** Erro caso ocorra */
  error: AuthError | null
}

/**
 * Exemplo de resposta bem-sucedida:
 */
const successResponse: UpdateUserResponse = {
  data: {
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'usuario@exemplo.com',
      updated_at: '2025-01-14T10:35:00Z',
      // ... outros campos
    }
  },
  error: null
}
```

---

## Estruturas de Estado

### LoginFormState

```typescript
/**
 * Estado do componente LoginForm
 * @component src/components/auth/login-form.tsx
 */
interface LoginFormState {
  /** Email digitado pelo usuário */
  email: string
  
  /** Senha digitada pelo usuário */
  password: string
  
  /** Se a senha está visível */
  showPassword: boolean
  
  /** Se está processando o login */
  loading: boolean
  
  /** Mensagem de erro atual */
  error: string | null
  
  /** Mensagem vinda da URL */
  urlMessage: {
    type: 'success' | 'error' | 'info'
    text: string
  } | null
}

/**
 * Exemplo de estado inicial:
 */
const initialState: LoginFormState = {
  email: '',
  password: '',
  showPassword: false,
  loading: false,
  error: null,
  urlMessage: null
}
```

---

### ForgotPasswordFormState

```typescript
/**
 * Estado do componente ForgotPasswordForm
 * @component src/components/auth/forgot-password-form.tsx
 */
interface ForgotPasswordFormState {
  /** Email para recuperação */
  email: string
  
  /** Se está processando o envio */
  loading: boolean
  
  /** Mensagem de erro */
  error: string | null
  
  /** Se email foi enviado com sucesso */
  success: boolean
}

/**
 * Exemplo de estado inicial:
 */
const initialState: ForgotPasswordFormState = {
  email: '',
  loading: false,
  error: null,
  success: false
}
```

---

### ResetPasswordFormState

```typescript
/**
 * Estado do componente ResetPasswordForm
 * @component src/components/auth/reset-password-form.tsx
 */
interface ResetPasswordFormState {
  /** Nova senha */
  password: string
  
  /** Confirmação da senha */
  confirmPassword: string
  
  /** Se está processando */
  loading: boolean
  
  /** Mensagem de erro */
  error: string | null
}

/**
 * Exemplo de estado inicial:
 */
const initialState: ResetPasswordFormState = {
  password: '',
  confirmPassword: '',
  loading: false,
  error: null
}
```

---

## Estruturas de Banco de Dados

### auth.users (Supabase Auth Schema)

```sql
-- Tabela gerenciada pelo Supabase Auth
-- Não deve ser modificada diretamente

CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email e autenticação
  email VARCHAR(255) UNIQUE,
  encrypted_password VARCHAR(255),
  email_confirmed_at TIMESTAMPTZ,
  
  -- Telefone (opcional)
  phone VARCHAR(15) UNIQUE,
  phone_confirmed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  
  -- Metadata
  raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  
  -- Controle
  is_super_admin BOOLEAN DEFAULT FALSE,
  role VARCHAR(255),
  
  -- Tokens e confirmações
  confirmation_token VARCHAR(255),
  confirmation_sent_at TIMESTAMPTZ,
  recovery_token VARCHAR(255),
  recovery_sent_at TIMESTAMPTZ,
  email_change_token_new VARCHAR(255),
  email_change VARCHAR(255),
  email_change_sent_at TIMESTAMPTZ,
  
  -- MFA/2FA
  reauthentication_token VARCHAR(255),
  reauthentication_sent_at TIMESTAMPTZ,
  
  -- Auditoria
  banned_until TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX users_email_idx ON auth.users (email);
CREATE INDEX users_phone_idx ON auth.users (phone);
```

---

### public.user_profiles

```sql
-- Extensão da tabela auth.users com dados do perfil

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Informações básicas
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  
  -- Role no sistema
  role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Avatar
  avatar_url TEXT,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX user_profiles_tenant_id_idx ON public.user_profiles (tenant_id);
CREATE INDEX user_profiles_email_idx ON public.user_profiles (email);
CREATE INDEX user_profiles_role_idx ON public.user_profiles (role);

-- RLS Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio perfil ou perfis do mesmo tenant
CREATE POLICY "Users can view profiles from same tenant"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
```

---

### public.tenants

```sql
-- Tabela de tenants/empresas

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Informações básicas
  name VARCHAR(255) NOT NULL,
  
  -- Schema PostgreSQL isolado
  supabase_schema VARCHAR(63) NOT NULL UNIQUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Customização
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX tenants_supabase_schema_idx ON public.tenants (supabase_schema);
CREATE INDEX tenants_is_active_idx ON public.tenants (is_active);

-- RLS Policies
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Apenas superadmins podem gerenciar tenants
CREATE POLICY "Only superadmins can manage tenants"
  ON public.tenants
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
```

---

## Interfaces de Erro

### AuthError (Supabase)

```typescript
/**
 * Erro retornado pelo Supabase Auth
 */
interface AuthError {
  /** Mensagem de erro */
  message: string
  
  /** Código de status HTTP */
  status?: number
  
  /** Nome do erro */
  name?: string
  
  /** Código de erro específico do Supabase */
  code?: string
}

/**
 * Exemplos de erros comuns:
 */

// Credenciais inválidas
const invalidCredentials: AuthError = {
  message: 'Invalid login credentials',
  status: 400,
  name: 'AuthApiError'
}

// Email não confirmado
const emailNotConfirmed: AuthError = {
  message: 'Email not confirmed',
  status: 400,
  name: 'AuthApiError'
}

// Rate limit excedido
const rateLimitExceeded: AuthError = {
  message: 'Email rate limit exceeded',
  status: 429,
  name: 'AuthApiError'
}

// Token inválido ou expirado
const invalidToken: AuthError = {
  message: 'Invalid or expired token',
  status: 400,
  name: 'AuthApiError'
}
```

---

### Mapeamento de Erros

```typescript
/**
 * Função que mapeia erros do Supabase para mensagens PT-BR
 * @see src/components/auth/login-form.tsx (linha 82)
 */
function getLoginErrorMessage(error: AuthError): string {
  const errorMessage = error.message.toLowerCase()
  
  const errorMap: Record<string, string> = {
    'invalid login credentials': 'Login ou senha estão incorretos.',
    'invalid credentials': 'Login ou senha estão incorretos.',
    'invalid email or password': 'Login ou senha estão incorretos.',
    'email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
    'user not found': 'Usuário não encontrado. Verifique seu email.',
    'user is disabled': 'Esta conta foi desabilitada. Entre em contato com o administrador.',
    'account disabled': 'Esta conta foi desabilitada. Entre em contato com o administrador.',
    'too many requests': 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
    'rate limit': 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
    'invalid email': 'Email inválido. Verifique o formato do email.',
  }
  
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) {
      return value
    }
  }
  
  return 'Erro ao fazer login. Verifique suas credenciais e tente novamente.'
}
```

---

## Cookies de Sessão

### Estrutura de Cookies

```typescript
/**
 * Cookies gerenciados pelo Supabase Auth
 * Nomes podem variar baseado na configuração
 */
interface SessionCookies {
  /** Access token (JWT) */
  'sb-access-token': string
  
  /** Refresh token */
  'sb-refresh-token': string
  
  /** Timestamp de expiração */
  'sb-expires-at': string
  
  /** Código PKCE (durante autenticação) */
  'sb-pkce-code-verifier'?: string
}

/**
 * Configuração de cookies:
 */
const cookieOptions = {
  httpOnly: true,      // Não acessível via JavaScript
  secure: true,        // Apenas HTTPS em produção
  sameSite: 'lax',     // Proteção CSRF
  path: '/',           // Disponível em toda a aplicação
  maxAge: 3600         // 1 hora para access token
}
```

---

## URL Query Parameters

### Estrutura de Parâmetros

```typescript
/**
 * Parâmetros aceitos nas rotas de autenticação
 */
interface AuthURLParams {
  /** Mensagem de sucesso/info */
  message?: string
  
  /** Código de erro */
  error?: string
  
  /** Descrição detalhada do erro */
  error_description?: string
  
  /** Próxima página após autenticação */
  next?: string
  
  /** Código de autenticação (callback) */
  code?: string
  
  /** Tipo de callback */
  type?: 'email_change' | 'recovery' | 'signup'
}

/**
 * Exemplos de URLs:
 */

// Sessão expirada
const expiredSessionURL = '/login?message=Sessão+expirada'

// Email confirmado
const emailConfirmedURL = '/login?message=Email+confirmed'

// Erro de acesso
const accessDeniedURL = '/login?error=access_denied&error_description=Invalid+credentials'

// Callback de recuperação
const recoveryCallbackURL = '/api/auth/callback?code=abc123&type=recovery'
```

---

## Exemplos de Uso

### Login Completo

```typescript
import { createClient } from '@/lib/supabase/client'

// Estado do formulário
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Cliente Supabase
const supabase = createClient()

// Handler de login
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    })

    if (error) {
      setError(getLoginErrorMessage(error))
      return
    }

    // Login bem-sucedido
    router.push('/dashboard')
    router.refresh()
  } catch (err) {
    console.error('Erro inesperado:', err)
    setError('Erro ao fazer login. Tente novamente.')
  } finally {
    setLoading(false)
  }
}
```

---

### Recuperação de Senha

```typescript
import { createClient } from '@/lib/supabase/client'

const [email, setEmail] = useState('')
const [loading, setLoading] = useState(false)
const [success, setSuccess] = useState(false)

const supabase = createClient()

const handleRecovery = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }
    )

    if (error) {
      console.error('Erro:', error)
      return
    }

    setSuccess(true)
  } catch (err) {
    console.error('Erro inesperado:', err)
  } finally {
    setLoading(false)
  }
}
```

---

### Redefinição de Senha

```typescript
import { createClient } from '@/lib/supabase/client'

const [password, setPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const supabase = createClient()

const handleReset = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)

  // Validações
  if (password.length < 6) {
    setError('A senha deve ter pelo menos 6 caracteres')
    setLoading(false)
    return
  }

  if (password !== confirmPassword) {
    setError('As senhas não coincidem')
    setLoading(false)
    return
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    })

    if (error) {
      setError(error.message)
      return
    }

    // Redefinição bem-sucedida
    router.push('/dashboard')
    router.refresh()
  } catch (err) {
    console.error('Erro inesperado:', err)
    setError('Erro ao redefinir senha. Tente novamente.')
  } finally {
    setLoading(false)
  }
}
```

---

## Referências

### Documentação Relacionada
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Regras de negócio
- [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md) - Fluxos de integração
- [SECURITY.md](./SECURITY.md) - Aspectos de segurança

### Links Externos
- [Supabase Auth Types](https://supabase.com/docs/reference/javascript/auth-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Última Revisão:** 2025-01-14  
**Próxima Revisão:** 2025-04-14
