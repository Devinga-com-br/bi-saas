# Correção de Falhas no Módulo de Usuários

**Data:** 2026-01-14  
**Versão:** 1.0.0  
**Status:** ✅ IMPLEMENTADO

## 📋 Resumo

Correção de 3 falhas críticas identificadas no sistema de gerenciamento de módulos autorizados para usuários.

---

## 🔴 Falhas Identificadas

### **Falha 1: Inconsistência na Inicialização de Módulos**

**Problema:**
- **Criação de usuário:** Iniciava com TODOS os módulos selecionados (`ALL_MODULE_IDS`)
- **Edição de usuário:** Carregava módulos do banco
- **Risco:** Usuários criados com mais permissões do que o pretendido

**Arquivo:** `src/components/users/user-form.tsx` (linha 46)

**Antes:**
```typescript
const [authorizedModules, setAuthorizedModules] = useState<SystemModule[]>(
  user ? [] : ALL_MODULE_IDS  // ❌ Criação = TODOS selecionados
)
```

**Depois:**
```typescript
const [authorizedModules, setAuthorizedModules] = useState<SystemModule[]>([])
// ✅ Sempre inicia vazio, usuário seleciona explicitamente
```

**Impacto:** 🔴 CRÍTICO - Segurança e Permissões

---

### **Falha 2: Falta de Limpeza de Módulos ao Alterar Role**

**Problema:**
- Quando `role='user'` era alterado para `role='admin'` ou `role='superadmin'`, os registros na tabela `user_authorized_modules` **não eram deletados**
- Código só **inseria** módulos para `role='user'`, mas não limpava quando mudava

**Arquivo:** `src/components/users/user-form.tsx` (linha 340-376)

**Antes:**
```typescript
// Update authorized modules (only for role = user)
if (role === 'user') {
  // Salva módulos...
}
// ❌ MAS não limpa se role !== 'user'
```

**Depois:**
```typescript
if (role === 'user') {
  // Salva módulos selecionados
  const modulesResponse = await fetch('/api/users/authorized-modules', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id, modules: authorizedModules })
  })
} else {
  // ✅ Limpa todos os módulos se role é admin/superadmin
  const modulesResponse = await fetch('/api/users/authorized-modules', {
    method: 'DELETE',
    body: JSON.stringify({ user_id: user.id })
  })
}
```

**Impacto:** 🟠 MÉDIO - Integridade de Dados

---

### **Falha 3: UX Ruim ao Mudar Role de Admin→User**

**Problema:**
- `ModuleSelector` só era exibido quando `role === 'user'`
- Se admin alterasse role de `admin` → `user`, o campo não aparecia
- Validação bloqueava salvamento se nenhum módulo selecionado

**Cenário de Falha:**
1. Admin edita usuário que é `admin`
2. Altera role para `user`
3. Campo de módulos não aparece (porque estava condicional)
4. Salva → **ERRO**: "Pelo menos um módulo deve ser selecionado"

**Arquivo:** `src/components/users/user-form.tsx` (linha 552-574)

**Antes:**
```typescript
{role === 'user' && (
  <ModuleSelector ... />  // ❌ Só aparece se role já for 'user'
)}

{(role === 'superadmin' || role === 'admin') && (
  <ModuleSelector showFullAccessMessage={true} />
)}
```

**Depois:**
```typescript
<div className="space-y-2 border-t pt-6">
  {role === 'user' ? (
    <ModuleSelector 
      selectedModules={authorizedModules}
      onChange={setAuthorizedModules}
      disabled={loading || loadingModules}
    />
  ) : (
    <ModuleSelector 
      disabled={true}
      showFullAccessMessage={true}  // Mostra mensagem de acesso full
    />
  )}
</div>
// ✅ Sempre exibe, adaptando ao role selecionado
```

**Impacto:** 🟡 BAIXO - Experiência do Usuário

---

## ✅ Correções Implementadas

### **1. User Form (`user-form.tsx`)**

#### **a) Inicialização de State**
```typescript
// Linha 44-47
const [authorizedModules, setAuthorizedModules] = useState<SystemModule[]>([])
// Sempre vazio, tanto criação quanto edição
```

#### **b) UseEffect de Carregamento**
```typescript
// Linha 128-153
useEffect(() => {
  async function loadAuthorizedModules() {
    if (user) {
      setLoadingModules(true)
      try {
        const response = await fetch(`/api/users/authorized-modules?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setAuthorizedModules(data.modules || [])  // ✅ Carrega do banco
        }
      } catch (error) {
        setAuthorizedModules([])  // ✅ Em caso de erro, vazio
      } finally {
        setLoadingModules(false)
      }
    } else {
      setAuthorizedModules([])  // ✅ Criação = vazio
    }
  }
  loadAuthorizedModules()
}, [user])
```

#### **c) Limpeza de Módulos ao Mudar Role**
```typescript
// Linha 340-376
if (role === 'user') {
  // POST - Salva módulos selecionados
  const modulesResponse = await fetch('/api/users/authorized-modules', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id, modules: authorizedModules })
  })
} else {
  // DELETE - Limpa módulos se admin/superadmin
  const modulesResponse = await fetch('/api/users/authorized-modules', {
    method: 'DELETE',
    body: JSON.stringify({ user_id: user.id })
  })
}
```

#### **d) Renderização Condicional do ModuleSelector**
```typescript
// Linha 552-568
<div className="space-y-2 border-t pt-6">
  {role === 'user' ? (
    <ModuleSelector 
      selectedModules={authorizedModules}
      onChange={setAuthorizedModules}
      disabled={loading || loadingModules}
      showFullAccessMessage={false}
    />
  ) : (
    <ModuleSelector 
      selectedModules={[]}
      onChange={() => {}}
      disabled={true}
      showFullAccessMessage={true}
    />
  )}
</div>
```

---

### **2. API Route (`authorized-modules/route.ts`)**

#### **Novo Método DELETE**
```typescript
/**
 * DELETE /api/users/authorized-modules
 * Remove todos os módulos autorizados de um usuário
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    
    // Autenticação e permissões...
    
    const { user_id } = await request.json()
    
    // Deletar todos os módulos
    const { error } = await supabase
      .from('user_authorized_modules')
      .delete()
      .eq('user_id', user_id)
    
    if (error) throw error
    
    return NextResponse.json({
      user_id,
      message: 'All authorized modules removed successfully'
    })
  } catch (error) {
    return NextResponse.json({ error: ... }, { status: 500 })
  }
}
```

---

## 🧪 Validação

### **Build do Projeto**
```bash
npm run build
```
✅ **Resultado:** Compilado com sucesso (apenas 1 warning não relacionado removido)

### **Casos de Teste**

#### **Teste 1: Criação de Novo Usuário**
- ✅ Campo de módulos vazio por padrão
- ✅ Usuário seleciona explicitamente os módulos
- ✅ Validação impede salvar sem módulos (role=user)

#### **Teste 2: Edição User → Admin**
- ✅ Carrega módulos do banco
- ✅ Ao alterar role para Admin, exibe mensagem de acesso full
- ✅ Ao salvar, deleta registros de user_authorized_modules

#### **Teste 3: Edição Admin → User**
- ✅ Campo de módulos aparece quando role é alterado
- ✅ Permite selecionar módulos antes de salvar
- ✅ Não bloqueia salvamento por falta de módulos pré-carregados

---

## 📊 Impacto nas Operações

| Operação | Antes | Depois |
|----------|-------|--------|
| **Criar User** | TODOS módulos | NENHUM módulo (seleção explícita) |
| **Editar User** | Carrega do banco | Carrega do banco |
| **User → Admin** | Mantém registros | Deleta registros ✅ |
| **Admin → User** | UX quebrada | UX funcional ✅ |
| **Admin → Superadmin** | Mantém registros | Deleta registros ✅ |

---

## 🔒 Segurança

### **Antes**
- 🔴 Novo usuário criado com permissão total
- 🔴 Registros órfãos ao mudar role

### **Depois**
- ✅ Princípio de privilégio mínimo (zero por padrão)
- ✅ Limpeza automática de dados ao mudar role
- ✅ Validação explícita de módulos

---

## 📝 Checklist de Implementação

- [x] Alterar inicialização de `authorizedModules` para `[]`
- [x] Atualizar `useEffect` para carregar vazio em criação
- [x] Adicionar lógica de DELETE ao mudar role
- [x] Criar método DELETE na API
- [x] Tornar `ModuleSelector` sempre visível (condicional interno)
- [x] Remover import não usado de `ALL_MODULE_IDS`
- [x] Validar build do projeto
- [x] Documentar correções

---

## 🚀 Deploy

As alterações são **retrocompatíveis** e não requerem:
- ❌ Migração de banco de dados
- ❌ Atualização de variáveis de ambiente
- ❌ Recriação de usuários existentes

**Deploy Safe:** ✅ Pode ser aplicado diretamente em produção

---

## 📚 Arquivos Modificados

```
src/components/users/user-form.tsx
src/app/api/users/authorized-modules/route.ts
docs/FIX_USER_MODULES_BUGS.md  (novo)
```

---

## 💡 Lições Aprendidas

1. **State inicial importa:** Nunca inicializar com "tudo selecionado" em sistemas de permissão
2. **Limpeza de dados:** Sempre considerar remoção de dados relacionados ao alterar estados
3. **UX reativa:** Componentes devem reagir a mudanças de estado, não apenas ao estado inicial
4. **Validação defensiva:** Validar no frontend E no backend

---

**Fim do Documento**
