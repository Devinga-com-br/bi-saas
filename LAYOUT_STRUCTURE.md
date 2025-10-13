# Estrutura de Layout - BI SaaS

## Visão Geral

Todas as páginas protegidas da aplicação agora utilizam o mesmo layout consistente com:
- **Menu lateral (AppSidebar)** - Navegação principal com destaque do item ativo
- **Header (TopBar)** - Barra superior com user menu e informações do tenant
- **Área de conteúdo** - Conteúdo específico de cada página

## Estrutura de Arquivos

```
src/app/
├── (auth)/                      # Grupo de rotas públicas (login, cadastro)
│   ├── login/
│   ├── cadastro/
│   └── ...
│
└── (dashboard)/                 # Grupo de rotas protegidas
    ├── layout.tsx              # ⭐ Layout principal (DashboardShell)
    │                           # Aplicado a TODAS as páginas do grupo
    ├── dashboard/
    │   └── page.tsx            # Página inicial do dashboard
    ├── empresas/
    │   ├── page.tsx            # Lista de empresas
    │   ├── nova/
    │   │   └── page.tsx        # Nova empresa
    │   └── [id]/
    │       └── editar/
    │           └── page.tsx    # Editar empresa
    ├── usuarios/
    │   ├── page.tsx            # Lista de usuários
    │   ├── novo/
    │   │   └── page.tsx        # Novo usuário
    │   └── [id]/
    │       └── editar/
    │           └── page.tsx    # Editar usuário
    ├── perfil/
    │   └── page.tsx            # Perfil do usuário
    └── configuracoes/
        └── page.tsx            # Configurações
```

## Como Funciona

### 1. Layout Principal (`(dashboard)/layout.tsx`)

O layout está na **raiz do grupo `(dashboard)`**, garantindo que todas as páginas dentro deste grupo herdem automaticamente o layout:

```tsx
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { TenantProvider } from '@/contexts/tenant-context'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      <DashboardShell>{children}</DashboardShell>
    </TenantProvider>
  )
}
```

### 2. DashboardShell

Componente que estrutura a página com:
- **SidebarProvider** - Contexto para controle do sidebar
- **AppSidebar** - Menu lateral
- **TopBar** - Barra superior
- **Área de conteúdo** - Onde o `children` é renderizado

### 3. AppSidebar - Menu com Destaque de Item Ativo

O menu lateral detecta automaticamente qual item está ativo baseado na rota atual:

#### Lógica de Destaque:

```tsx
// Detecta se o item está ativo
const isActive = pathname === item.href ||
                 (item.href !== '/dashboard' && pathname.startsWith(item.href))

// Para subitens
const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href)

// Para itens com subitens (collapsible)
const hasActiveChild = item.items.some(child =>
  pathname === child.href || pathname.startsWith(child.href)
)
```

#### Exemplos:

| Rota Atual | Item Destacado | Motivo |
|------------|----------------|--------|
| `/dashboard` | Dashboard | Rota exata |
| `/usuarios` | Usuários | Rota exata |
| `/usuarios/novo` | Usuários | Começa com `/usuarios` |
| `/usuarios/123/editar` | Usuários | Começa com `/usuarios` |
| `/perfil` | Configurações → Perfil | Subitem ativo |
| `/empresas/nova` | Empresas | Começa com `/empresas` |

### 4. Navegação do Menu

```tsx
const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Empresas',
    href: '/empresas',
    icon: Building2,
    requiresSuperAdmin: true,  // Visível apenas para superadmin
  },
  {
    name: 'Usuários',
    href: '/usuarios',
    icon: Users,
    requiresAdminOrAbove: true,  // Visível para admin e superadmin
  },
  {
    name: 'Relatórios',
    href: '/relatorios',
    icon: FileText,
    badge: 'Em breve',
    items: [  // Submenu collapsible
      {
        name: 'Visão Geral',
        href: '/relatorios/visao-geral',
        icon: BarChart3,
      },
      {
        name: 'Vendas',
        href: '/relatorios/vendas',
        icon: FileBarChart,
      },
    ],
  },
  {
    name: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    items: [
      {
        name: 'Perfil',
        href: '/perfil',
        icon: Users,
      },
      {
        name: 'Organização',
        href: '/configuracoes/organizacao',
        icon: Building2,
      },
    ],
  },
]
```

## Controle de Acesso no Menu

O menu filtra automaticamente itens baseado no papel do usuário:

```tsx
const filteredNavigation = navigation.filter(item => {
  if (item.requiresSuperAdmin && !isSuperAdmin) {
    return false  // Oculta se não for superadmin
  }
  if (item.requiresAdminOrAbove && !isAdminOrAbove) {
    return false  // Oculta se não for admin ou superadmin
  }
  return true
})
```

## Como Criar Novas Páginas

### Passo 1: Criar arquivo de página

```bash
# Exemplo: Criar página de relatórios
src/app/(dashboard)/relatorios/page.tsx
```

### Passo 2: Implementar o componente

```tsx
export default function RelatoriosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie seus relatórios e análises
        </p>
      </div>

      {/* Conteúdo da página */}
    </div>
  )
}
```

### Passo 3: Adicionar ao menu (opcional)

Se quiser que apareça no menu lateral, edite [app-sidebar.tsx](src/components/dashboard/app-sidebar.tsx):

```tsx
const navigation = [
  // ... itens existentes
  {
    name: 'Relatórios',
    href: '/relatorios',
    icon: FileText,
    requiresAdminOrAbove: true,  // Opcional: controle de acesso
  },
]
```

### Passo 4: Pronto!

✅ A página automaticamente terá:
- Menu lateral com item destacado
- Header com user menu
- Layout consistente
- Contexto de tenant
- Autenticação protegida

## Componentes Chave

### Arquivos Importantes:

| Arquivo | Responsabilidade |
|---------|------------------|
| [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx) | Layout raiz do grupo dashboard |
| [src/components/dashboard/dashboard-shell.tsx](src/components/dashboard/dashboard-shell.tsx) | Shell principal (sidebar + topbar + conteúdo) |
| [src/components/dashboard/app-sidebar.tsx](src/components/dashboard/app-sidebar.tsx) | Menu lateral com navegação |
| [src/components/dashboard/top-bar.tsx](src/components/dashboard/top-bar.tsx) | Barra superior |
| [src/components/dashboard/user-menu.tsx](src/components/dashboard/user-menu.tsx) | Menu do usuário (dropdown) |
| [src/contexts/tenant-context.tsx](src/contexts/tenant-context.tsx) | Contexto de tenant (multi-tenancy) |

## Estilos Visuais

### Item Ativo no Menu:

- **Cor de fundo**: `bg-sidebar-accent` (cinza claro)
- **Item pai com filho ativo**: Também recebe `bg-sidebar-accent`
- **Submenu aberto**: Automaticamente expande se tem item filho ativo

### Responsividade:

- **Desktop**: Sidebar visível
- **Mobile**: Sidebar colapsável (botão hamburger)
- **Modo compacto**: Sidebar mostra apenas ícones (collapsible="icon")

## Próximas Páginas

Quando criar novas páginas, elas devem:

1. ✅ Estar dentro de `src/app/(dashboard)/`
2. ✅ Usar `page.tsx` como nome do arquivo
3. ✅ Seguir a estrutura de pastas do Next.js 15 App Router
4. ✅ **NÃO criar layout próprio** (já herdado automaticamente)
5. ✅ Opcionalmente adicionar item no `navigation` do AppSidebar

## Exemplos de Padrões

### Página Simples:
```
src/app/(dashboard)/minha-pagina/page.tsx
```

### Página com ID dinâmico:
```
src/app/(dashboard)/itens/[id]/page.tsx
```

### Página aninhada:
```
src/app/(dashboard)/itens/[id]/editar/page.tsx
```

### Página com múltiplos segmentos:
```
src/app/(dashboard)/relatorios/vendas/mensal/page.tsx
```

---

## Resumo

✅ **Layout único aplicado automaticamente** a todas as páginas do grupo `(dashboard)`
✅ **Menu lateral sempre visível** com destaque do item ativo
✅ **Header sempre presente** com user menu e tenant info
✅ **Detecção inteligente** de item ativo (incluindo subpaths)
✅ **Controle de acesso** no menu baseado em roles
✅ **Fácil adicionar novas páginas** - apenas criar o arquivo `page.tsx`

**Todas as páginas futuras automaticamente terão a estrutura completa!** 🎉
