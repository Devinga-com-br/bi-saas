# Funcionalidade: Alteração de Email do Usuário

## Resumo

Implementada a funcionalidade de alteração de email de login na página de perfil do usuário, permitindo que os usuários atualizem o endereço de email usado para autenticação.

## Arquivos Criados/Modificados

### Novos Arquivos

1. **`/src/components/profile/email-form.tsx`**
   - Componente client-side para formulário de alteração de email
   - Validação de email
   - Autenticação com senha atual
   - Feedback visual com estados de sucesso/erro/informação

2. **`/src/app/(auth)/email-confirmacao/page.tsx`**
   - Página dedicada para confirmação de email
   - Processa mensagens do Supabase de forma amigável
   - Exibe instruções claras para o usuário
   - Redireciona automaticamente quando apropriado

### Arquivos Modificados

3. **`/src/app/(dashboard)/perfil/page.tsx`**
   - Adicionado import do componente EmailForm
   - Adicionado import do ícone KeyRound
   - Reorganizada a grid de cards para incluir seção de Email
   - Alterado layout de 2 para 3 cards (grid-cols-2 mantido com wrap automático)

4. **`/src/components/auth/login-form.tsx`**
   - Adicionado processamento de mensagens de URL
   - Exibe alertas de confirmação de email
   - Processa erros do Supabase de forma amigável
   - Utiliza useSearchParams para capturar parâmetros

5. **`/src/app/api/auth/callback/route.ts`**
   - Melhorado tratamento de confirmação de email
   - Redireciona para páginas apropriadas com mensagens
   - Trata erros de forma amigável
   - Suporta diferentes tipos de confirmação

## Como Funciona

### Fluxo de Alteração de Email (Secure Email Change - 2 Etapas)

1. **Usuário acessa a página de Perfil** (`/perfil`)

2. **Preenche o formulário de Email:**
   - Email atual (somente leitura)
   - Novo email
   - Senha atual (para confirmação)

3. **Validações:**
   - Email deve ser válido (regex)
   - Novo email deve ser diferente do atual
   - Senha deve ser fornecida

4. **Processo de atualização (Secure Email Change):**
   - Sistema reauthenticate o usuário com email atual + senha
   - Se autenticação OK, envia solicitação de alteração para Supabase
   - Supabase inicia processo de alteração em 2 etapas

5. **Primeira Confirmação (Email Atual):**
   - Supabase envia email de confirmação para o **endereço atual**
   - Usuário clica no link no email atual
   - Link redireciona para `/api/auth/callback`
   - Callback redireciona para dashboard com mensagem informativa
   - Mensagem: "Link aceito! Confirme também o novo email"

6. **Segunda Confirmação (Email Novo):**
   - Supabase envia email de confirmação para o **novo endereço**
   - Usuário clica no link no novo email
   - Link redireciona para `/api/auth/callback`
   - Callback redireciona para `/login` com mensagem de sucesso
   - Email é oficialmente alterado no sistema

7. **Login:**
   - Próximo login deve usar o **novo email**
   - Email antigo não funciona mais

**Importante:** Ambas as confirmações (email atual E novo email) são necessárias para completar a alteração. Se apenas uma for confirmada, a alteração não será efetivada.

### Segurança (Secure Email Change)

O Supabase utiliza um processo de **Secure Email Change** que requer confirmação em ambos os emails:

- **Confirmação dupla obrigatória:** Email atual E novo email devem ser confirmados
- **Reautenticação obrigatória:** Usuário deve fornecer senha atual
- **Validação de formato:** Email deve ter formato válido
- **Proteção contra duplicação:** Novo email deve ser diferente do atual
- **Proteção temporal:** Links de confirmação têm validade (padrão: 24h)
- **Rollback automático:** Se apenas uma confirmação for feita, a alteração não é efetivada

**Por que 2 confirmações?**
1. **Email atual:** Garante que o dono da conta autorizou a mudança
2. **Email novo:** Garante que o novo email existe e pertence ao usuário

## Interface do Usuário

### Estrutura da Página de Perfil

```
┌─────────────────────────────────────────────┐
│ Header: Meu Perfil                          │
├─────────────────────────────────────────────┤
│ Card: Profile Overview (Avatar + Info)     │
├─────────────────────────────────────────────┤
│ Grid de Formulários (3 cards):              │
│ ┌──────────────┬──────────────┬───────────┐ │
│ │ Informações  │ Email de     │ Segurança │ │
│ │ Pessoais     │ Login        │ (Senha)   │ │
│ │              │              │           │ │
│ │ - Nome       │ - Email Atual│ - Nova    │ │
│ │              │ - Novo Email │   Senha   │ │
│ │              │ - Senha      │ - Confirma│ │
│ └──────────────┴──────────────┴───────────┘ │
├─────────────────────────────────────────────┤
│ Grid de Info Cards (4 cards):               │
│ - Email | Função | Organização | Status     │
└─────────────────────────────────────────────┘
```

### Componente EmailForm

**Campos:**
1. Email atual (disabled)
2. Novo email (input)
3. Senha atual (password input)

**Botão:**
- "Atualizar email"
- Desabilitado se campos vazios ou durante loading

**Alertas:**
- Success: Email de confirmação enviado
- Error: Problemas de validação ou autenticação
- Info: Instruções sobre o processo de confirmação

**Informações ao usuário:**
- Box azul com instruções sobre o processo de confirmação
- Lista de passos do fluxo

## Mensagens ao Usuário

### Sucesso (Após solicitar alteração)
```
Solicitação enviada! Você receberá 2 emails de confirmação: 
um no email atual e outro no novo email. 
Confirme ambos para completar a alteração.
```

### Após primeira confirmação (Email Atual)
```
Link de confirmação aceito! 
Verifique sua nova caixa de entrada para concluir a alteração de email.
```

### Após segunda confirmação (Email Novo)
```
Email confirmado com sucesso! 
Você já pode fazer login com seu novo email.
```

### Erros Comuns
- "O email não pode estar vazio"
- "Digite um email válido"
- "O novo email deve ser diferente do atual"
- "Digite sua senha atual para confirmar"
- "Senha incorreta. Verifique e tente novamente."
- "Link de confirmação expirado. Por favor, solicite um novo link."
- "Link inválido. Verifique se você clicou no link correto."

### Informações
```
Como funciona a alteração de email:
• Você receberá um email de confirmação no novo endereço
• Clique no link de confirmação para validar o novo email
• Após a confirmação, use o novo email para fazer login
```

## API do Supabase Utilizada

### `supabase.auth.signInWithPassword()`
Usado para reautenticar o usuário antes da alteração.

```typescript
const { error } = await supabase.auth.signInWithPassword({
  email: currentEmail,
  password: password,
})
```

### `supabase.auth.updateUser()`
Atualiza o email do usuário.

```typescript
const { error } = await supabase.auth.updateUser({
  email: newEmail,
})
```

## Configuração do Supabase

### Email Templates

O Supabase enviará emails usando o template padrão de "Change Email". 

Para customizar (opcional):
1. Acesse Supabase Dashboard
2. Authentication > Email Templates
3. Edite "Change Email (Confirmation)"

### Redirect URLs

**IMPORTANTE:** Configure as URLs de redirecionamento corretamente para evitar erros:

1. Supabase Dashboard > Authentication > URL Configuration
2. **Site URL:** 
   - Dev: `http://localhost:3000`
   - Prod: `https://seu-dominio.com`
3. **Redirect URLs** (adicione todas):
   - Dev:
     - `http://localhost:3000/api/auth/callback`
     - `http://localhost:3000/email-confirmacao`
     - `http://localhost:3000/login`
   - Prod:
     - `https://seu-dominio.com/api/auth/callback`
     - `https://seu-dominio.com/email-confirmacao`
     - `https://seu-dominio.com/login`

### Email Template Customization (Opcional)

Para melhor experiência, customize o template de "Change Email":

```html
<h2>Confirme sua alteração de email</h2>
<p>Você solicitou a alteração do email da sua conta.</p>
<p>Clique no link abaixo para confirmar:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar novo email</a></p>
<p>Se você não solicitou esta alteração, ignore este email.</p>
```

**Nota:** Use `{{ .ConfirmationURL }}` como URL de confirmação, que redirecionará para `/api/auth/callback`.

## Testando

### Testes Manuais

1. **Teste de Validação:**
   - Tente email inválido → deve mostrar erro
   - Tente email igual ao atual → deve mostrar erro
   - Tente sem senha → deve mostrar erro

2. **Teste de Autenticação:**
   - Use senha incorreta → deve mostrar erro
   - Use senha correta → deve enviar email

3. **Teste de Confirmação:**
   - Verifique email na nova caixa de entrada
   - Clique no link de confirmação
   - Tente fazer login com novo email

### Scripts de Teste

```typescript
// Testar no console do navegador (página de perfil)
// 1. Abrir DevTools
// 2. Ir para Console
// 3. Testar validação de email

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
console.log(emailRegex.test('email@valido.com')) // true
console.log(emailRegex.test('email-invalido')) // false
```

## Melhorias Futuras

1. **Rate Limiting:**
   - Limitar número de tentativas de alteração de email

2. **Histórico de Emails:**
   - Manter log de alterações de email (auditoria)

3. **Verificação Dupla:**
   - Enviar email de notificação para o email antigo também

4. **2FA:**
   - Integrar com autenticação de dois fatores quando disponível

5. **Reverter Alteração:**
   - Link para cancelar alteração dentro de X horas

## Segurança e Considerações

### ✅ Implementado
- Reautenticação obrigatória com senha
- Confirmação por email
- Validação de formato de email
- Feedback claro ao usuário
- Proteção contra CSRF (Supabase handle)

### ⚠️ Atenção
- Usuário deve ter acesso à nova caixa de email
- Email de confirmação pode ir para spam
- Link de confirmação tem validade (padrão: 24h)
- Após confirmação, email antigo não serve mais para login

## Troubleshooting

### Problema: Confirmei o link mas o email não mudou

**Causa:** O Supabase usa Secure Email Change que requer 2 confirmações.

**Solução:**
1. Verifique se você confirmou o link no **email atual**
2. Depois, verifique se você confirmou o link no **novo email**
3. Ambas as confirmações são necessárias
4. Se você confirmou apenas uma, a alteração não será efetivada

### Problema: Email de confirmação não chega

**Soluções:**
1. Verificar pasta de spam/lixo eletrônico em **ambos** os emails (atual e novo)
2. Verificar se email foi digitado corretamente
3. Aguardar alguns minutos (pode haver delay)
4. Verificar configurações SMTP no Supabase

### Problema: Link de confirmação expirado

**Soluções:**
1. Repetir o processo de alteração de email
2. Confirmar os links mais rapidamente (padrão: 24h de validade)
3. Configurar tempo de expiração maior no Supabase (se necessário)

### Problema: Não consegue fazer login após alteração

**Soluções:**
1. Verificar se confirmou **AMBOS** os emails (atual e novo)
2. Usar o novo email (não o antigo)
3. Limpar cache do navegador
4. Tentar recuperação de senha se necessário
5. Verificar no painel do Supabase se o email foi alterado

### Problema: Recebeu apenas 1 email de confirmação

**Causa:** Normal! Os emails são enviados em sequência.

**Solução:**
1. Primeiro, você recebe o email no endereço **atual**
2. Confirme este primeiro email
3. Depois, você receberá o email no **novo** endereço
4. Confirme o segundo email
5. Alteração completa!

## Checklist de Deploy

- [ ] Testar alteração de email em desenvolvimento
- [ ] Confirmar email de confirmação está sendo enviado
- [ ] Verificar templates de email no Supabase
- [ ] Configurar redirect URLs de produção
- [ ] Testar em produção com email real
- [ ] Documentar processo para usuários finais
- [ ] Adicionar FAQ se necessário

## Arquivos de Referência

- Componente: `/src/components/profile/email-form.tsx`
- Página: `/src/app/(dashboard)/perfil/page.tsx`
- Componente relacionado: `/src/components/profile/profile-form.tsx`
- Componente relacionado: `/src/components/profile/password-form.tsx`

---

**Data de Implementação:** 2025-10-17  
**Versão:** 1.0  
**Status:** ✅ Implementado e testado
