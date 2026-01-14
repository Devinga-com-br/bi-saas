# Feature: Filtro de Usuários por Tenant Selecionado (SuperAdmin)

**Data:** 2026-01-14  
**Versão:** 1.0.0  
**Status:** ✅ IMPLEMENTADO

## 📋 Resumo

Implementação de filtro inteligente na listagem de usuários para SuperAdmin, baseado no tenant/empresa selecionado no menu do sistema.

---

## 🎯 Objetivo

Quando um SuperAdmin seleciona uma empresa específica através do menu de troca de tenant, a listagem de usuários deve:
- ✅ Mostrar **TODOS os SuperAdmins** (independente de tenant)
- ✅ Mostrar apenas **Admins e Users** do tenant selecionado
- ✅ Manter comportamento original para role Admin

---

## 🔄 Comportamento Anterior vs Novo

### **Admin (sem alteração)**
| Situação | Comportamento |
|----------|---------------|
| Qualquer tenant | Mostra apenas usuários do próprio tenant (exclui superadmins) |

### **SuperAdmin (NOVA LÓGICA)**

| Tenant Selecionado | Usuários Exibidos |
|-------------------|-------------------|
| ❌ Nenhum (null) | Todos os usuários do sistema |
| ✅ Tenant Específico | **Todos os SuperAdmins** + Admins/Users do tenant selecionado |

---

## 📊 Exemplo Prático

### **Cenário:**
- **Tenants:** Okilão, São Luiz, Paraíso
- **SuperAdmin atual:** selecionou "Okilão" no menu

### **Usuários no Sistema:**
```
1. João (SuperAdmin) - sem tenant
2. Maria (SuperAdmin) - sem tenant
3. Carlos (Admin) - Okilão
4. Ana (User) - Okilão
5. Pedro (Admin) - São Luiz
6. Lucia (User) - Paraíso
```

### **Resultado da Filtragem:**
✅ **Exibidos:**
- João (SuperAdmin)
- Maria (SuperAdmin)
- Carlos (Admin - Okilão)
- Ana (User - Okilão)

❌ **Não exibidos:**
- Pedro (Admin - São Luiz) ← Tenant diferente
- Lucia (User - Paraíso) ← Tenant diferente

---

## 🛠️ Implementação Técnica

### **1. Alteração na Página de Configurações**

**Arquivo:** `src/app/(dashboard)/configuracoes/page.tsx`

```typescript
// Linha 208-213 - ANTES
<UsuariosContent
  currentUserRole={userProfile.role}
  currentUserTenantId={userProfile.tenant_id}
/>

// DEPOIS
<UsuariosContent
  currentUserRole={userProfile.role}
  currentUserTenantId={userProfile.tenant_id}
  selectedTenantId={currentTenant?.id || null}  // ✅ Novo parâmetro
/>
```

**Mudança:** Passa o ID do tenant atualmente selecionado no contexto.

---

### **2. Alteração no Componente UsuariosContent**

**Arquivo:** `src/components/configuracoes/usuarios-content.tsx`

#### **a) Nova Prop e State**
```typescript
interface UsuariosContentProps {
  currentUserRole: string
  currentUserTenantId: string | null
  selectedTenantId: string | null  // ✅ NOVO
}

// ✅ NOVO state para nome do tenant
const [selectedTenantName, setSelectedTenantName] = useState<string>('')
```

#### **b) Lógica de Filtragem**
```typescript
useEffect(() => {
  const loadUsers = async () => {
    const supabase = createClient()

    // ✅ Carregar nome do tenant selecionado
    if (currentUserRole === 'superadmin' && selectedTenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', selectedTenantId)
        .single() as { data: { name: string } | null }
      
      setSelectedTenantName(tenant?.name || '')
    }

    let usersQuery = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Admin: filtro original (sem alteração)
    if (currentUserRole === 'admin' && currentUserTenantId) {
      usersQuery = usersQuery
        .eq('tenant_id', currentUserTenantId)
        .neq('role', 'superadmin')
    }

    const { data: userProfiles } = await usersQuery

    // ✅ NOVO: Filtro client-side para SuperAdmin
    let filteredProfiles = userProfiles || []
    if (currentUserRole === 'superadmin' && selectedTenantId) {
      filteredProfiles = userProfiles?.filter(profile => {
        // Incluir todos os superadmins
        if (profile.role === 'superadmin') return true
        // Incluir admins e users do tenant selecionado
        return profile.tenant_id === selectedTenantId
      }) || []
    }

    // ... resto do código (combinar com tenants)
  }
}, [currentUserRole, currentUserTenantId, selectedTenantId])  // ✅ Nova dependência
```

#### **c) Descrição Dinâmica**
```typescript
<CardDescription className="text-xs">
  {currentUserRole === 'superadmin' && selectedTenantId && selectedTenantName ? (
    <>
      Todos os <strong>Superadmins</strong> + Admins e Usuários de <strong>{selectedTenantName}</strong>
    </>
  ) : currentUserRole === 'superadmin' ? (
    'Todos os usuários do sistema'
  ) : (
    'Usuários da sua empresa (superadmins não são exibidos)'
  )}
</CardDescription>
```

---

## 🧪 Validação

### **Build**
```bash
npm run build
```
✅ **Resultado:** Compilado com sucesso

### **Casos de Teste**

#### **Teste 1: Admin**
- ✅ Continua vendo apenas usuários do próprio tenant
- ✅ Não vê superadmins
- ✅ Descrição: "Usuários da sua empresa (superadmins não são exibidos)"

#### **Teste 2: SuperAdmin sem tenant selecionado**
- ✅ Vê todos os usuários do sistema
- ✅ Descrição: "Todos os usuários do sistema"

#### **Teste 3: SuperAdmin com tenant "Okilão" selecionado**
- ✅ Vê todos os superadmins
- ✅ Vê apenas admins/users de "Okilão"
- ✅ NÃO vê admins/users de outros tenants
- ✅ Descrição: "Todos os Superadmins + Admins e Usuários de Okilão"

#### **Teste 4: Trocar tenant no menu**
- ✅ Lista atualiza automaticamente
- ✅ Nome do tenant atualiza na descrição
- ✅ Filtro aplica corretamente

---

## 💡 Decisões de Design

### **Por que filtro client-side?**
- Supabase não suporta OR complexo de forma elegante (`role='superadmin' OR tenant_id='xxx'`)
- Alternativas consideradas:
  1. ❌ Duas queries separadas (complexidade)
  2. ❌ RPC function (overhead)
  3. ✅ **Buscar todos + filtrar client-side** (simples e eficiente)

### **Por que incluir TODOS os superadmins?**
- SuperAdmins não pertencem a um tenant específico
- São administradores do sistema como um todo
- Devem ser visíveis independente do tenant selecionado

### **Por que não alterar comportamento do Admin?**
- Admin já tem escopo limitado ao próprio tenant
- Não pode selecionar outros tenants
- Comportamento já estava correto

---

## 📊 Impacto

| Componente | Antes | Depois |
|-----------|-------|--------|
| **Admin** | Usuários do próprio tenant | ✅ Sem alteração |
| **SuperAdmin (sem tenant)** | Todos | ✅ Sem alteração |
| **SuperAdmin (com tenant)** | Todos | ✅ Todos superadmins + filtrados por tenant |

---

## 🔒 Segurança

### **Validações Mantidas**
- ✅ RLS do Supabase continua ativo
- ✅ Permissões de role respeitadas
- ✅ Filtro de tenant validado server-side (quando aplicável)

### **Sem Riscos de Vazamento**
- Filtro client-side ocorre **após** query do Supabase
- Usuário só vê dados que o RLS já permitiu
- Não expõe dados de outros tenants

---

## 📝 Checklist de Implementação

- [x] Adicionar prop `selectedTenantId` ao componente
- [x] Carregar nome do tenant selecionado
- [x] Implementar filtro client-side para SuperAdmin
- [x] Atualizar descrição do card dinamicamente
- [x] Aplicar filtro na recarga após exclusão
- [x] Adicionar nova dependência ao useEffect
- [x] Validar build do projeto
- [x] Documentar feature

---

## 🚀 Deploy

As alterações são **retrocompatíveis** e não requerem:
- ❌ Migração de banco de dados
- ❌ Atualização de variáveis de ambiente
- ❌ Alteração de RLS policies

**Deploy Safe:** ✅ Pode ser aplicado diretamente em produção

---

## 📚 Arquivos Modificados

```
src/app/(dashboard)/configuracoes/page.tsx
src/components/configuracoes/usuarios-content.tsx
docs/FEATURE_SUPERADMIN_TENANT_FILTER.md  (novo)
```

---

## 🎨 Interface do Usuário

### **Descrição Dinâmica:**

**Admin:**
```
Lista de Usuários
Usuários da sua empresa (superadmins não são exibidos)
```

**SuperAdmin (sem tenant):**
```
Lista de Usuários
Todos os usuários do sistema
```

**SuperAdmin (tenant "Okilão" selecionado):**
```
Lista de Usuários
Todos os Superadmins + Admins e Usuários de Okilão
```

---

## 🔄 Próximas Melhorias (Opcional)

- [ ] Adicionar contador "X de Y usuários (filtrado)" quando aplicado
- [ ] Badge visual indicando filtro ativo
- [ ] Botão "Limpar filtro" para ver todos novamente
- [ ] Filtro por role (checkbox Superadmin/Admin/User)

---

**Fim do Documento**
