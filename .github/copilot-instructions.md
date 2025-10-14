# Guia de Desenvolvimento - BI SaaS

## Visão Geral da Arquitetura

Este é um sistema SaaS de Business Intelligence multi-tenant construído com Next.js 15 (App Router), React 19, TypeScript e Supabase. A aplicação implementa uma arquitetura multi-tenant com isolamento de dados a nível de banco de dados.

### Modelo Multi-Tenant

- **Tenants (Empresas)**
  - Tabela principal: `tenants`
  - Campo chave: `tenant_id` (referenciado em outras tabelas)
  - Row Level Security (RLS) aplicado via `tenant_id`

### Fluxo de Autenticação

1. Três instâncias do cliente Supabase:
   - `@/lib/supabase/client.ts` - Browser
   - `@/lib/supabase/server.ts` - Server Components/API
   - `@/lib/supabase/middleware.ts` - Middleware

2. **Middleware** (`src/middleware.ts`):
   - Protege rotas `/dashboard/*`
   - Redireciona usuários não autenticados para `/login`

### Padrões de Desenvolvimento

1. **Permissões por Função**
   ```typescript
   // Verificar permissões via hooks:
   const { canManageUsers } = usePermissions()
   const isAdmin = useIsAdminOrAbove()
   ```

2. **Contexto do Tenant**
   ```typescript
   // Obter tenant atual:
   const { currentTenant, userProfile } = useTenantContext()
   
   // Acessar filiais:
   const { branches } = useBranches({ tenantId: currentTenant?.id })
   ```

3. **Tipos Principais**
   ```typescript
   import type { Tenant, UserProfile, Branch } from '@/types'
   ```

### Convenções Críticas

1. **Server Components vs Client Components**
   - Marcar componentes client-side com 'use client'
   - Usar hooks somente em componentes client-side

2. **Segurança Multi-tenant**
   - SEMPRE incluir `tenant_id` nas queries
   - NUNCA fazer queries sem filtro de tenant (exceto superadmin)

3. **Layout & Estrutura**
   - Route Groups: `(auth)`, `(dashboard)`
   - Páginas protegidas usam `<DashboardShell>`
   - Componentes UI da shadcn em `@/components/ui`

### Fluxos de Desenvolvimento

1. **Setup Local**
   ```bash
   npm install
   npm run dev
   ```

2. **Build e Deploy**
   ```bash
   npm run build
   npm start
   ```

3. **Variáveis de Ambiente**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_APP_URL=
   ```

### Pontos de Integração

1. **Supabase**
   - Auth: `supabase.auth.*`
   - Database: RLS via `tenant_id`
   - Migrations: `/supabase/migrations/*.sql`

2. **API Routes**
   - Autenticação: `/api/auth/*`
   - Dashboard: `/api/dashboard/*`
   - Usuários: `/api/users/*`

### Relatórios e Dashboards

1. **Estrutura de Relatórios**
   - Localização: `/src/app/(dashboard)/relatorios/*`
   - Dados via Supabase RPC: `get_*_report`
   - Paginação e filtros implementados no backend

2. **Padrão de Filtros**
   ```typescript
   // Componente de filtros padrão
   interface ReportFilters {
     filialId?: string
     mes: number // Default: mês atual - 1
     ano: number // Default: ano atual
     page: number
     pageSize: number
   }
   ```

3. **Chamada RPC com Filtros**
   ```typescript
   // API Route com paginação e filtros
   const { data, error } = await supabase.rpc('get_report_data', {
     p_schema: currentTenant.supabase_schema,
     p_filial_id: filters.filialId,
     p_mes: filters.mes,
     p_ano: filters.ano,
     p_page: filters.page,
     p_page_size: filters.pageSize
   })
   ```

### Exemplos de Implementação

1. **Novo Recurso com Proteção Multi-tenant**
   ```typescript
   // API Route com proteção
   const { data } = await supabase
     .from('sua_tabela')
     .select('*')
     .eq('tenant_id', currentTenant.id)
   ```

2. **Componente com Permissões**
   ```typescript
   const { canManageUsers } = usePermissions()
   if (!canManageUsers) return null
   ```

3. **Relatório com Filtros e Paginação**
   ```typescript
   // Componente de relatório
   const ReportPage: NextPage = () => {
     const { currentTenant } = useTenantContext()
     const [filters, setFilters] = useState<ReportFilters>({
       mes: new Date().getMonth(), // Mês anterior como default
       ano: new Date().getFullYear(),
       page: 1,
       pageSize: 50
     })
     
     const { data, isLoading } = useSWR(
       ['/api/reports/data', filters],
       ([url, filters]) => fetchReportData(url, filters)
     )

     return (
       <div>
         <ReportFilters filters={filters} onChange={setFilters} />
         <ReportTable data={data} isLoading={isLoading} />
         <Pagination 
           total={data?.total || 0} 
           page={filters.page}
           onChange={(page) => setFilters({ ...filters, page })} 
         />
       </div>
     )
   }
   ```