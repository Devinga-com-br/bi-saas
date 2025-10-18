# Guia de Desenvolvimento - BI SaaS

**Última Atualização:** 2025-10-17

## Visão Geral da Arquitetura

Este é um sistema SaaS de Business Intelligence multi-tenant construído com Next.js 15 (App Router), React 19, TypeScript e Supabase. A aplicação implementa uma arquitetura multi-tenant com isolamento de dados a nível de **schemas PostgreSQL**.

### Modelo Multi-Tenant (IMPORTANTE!)

- **Isolamento por Schema PostgreSQL**
  - Cada tenant tem seu próprio schema no banco de dados
  - Exemplos: `okilao`, `saoluiz`, `paraiso`, `lucia`
  - Schema `public` contém apenas tabelas de configuração (tenants, user_profiles)
  
- **Tabela de Tenants**
  - Localização: `public.tenants`
  - Campo crítico: `supabase_schema` (nome do schema do tenant)
  - Cada tenant tem dados isolados em seu próprio schema

- **⚠️ CONFIGURAÇÃO CRÍTICA: Exposed Schemas**
  - Todo novo schema deve ser adicionado aos "Exposed schemas" no Supabase Dashboard
  - Caminho: Settings → API → Exposed schemas
  - Erro comum: `PGRST106` quando schema não está exposto
  - Documentação: `docs/SUPABASE_SCHEMA_CONFIGURATION.md`

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
   - Relatórios disponíveis:
     - Ruptura ABCD: `/relatorios/ruptura-abcd`
     - Venda por Curva: `/relatorios/venda-curva`

2. **Padrão OBRIGATÓRIO de Filtros** (Ver: `docs/FILTER_PATTERN_STANDARD.md`)
   ```typescript
   // Layout padrão de filtros
   <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
     {/* Filial */}
     <div className="flex flex-col gap-2 w-full sm:w-auto">
       <Label>Filial</Label>
       <div className="h-10">
         <Select className="w-full sm:w-[200px] h-10">...</Select>
       </div>
     </div>
     
     {/* Mês */}
     <div className="flex flex-col gap-2 w-full sm:w-auto">
       <Label>Mês</Label>
       <div className="h-10">
         <Select className="w-full sm:w-[160px] h-10">...</Select>
       </div>
     </div>
     
     {/* Ano */}
     <div className="flex flex-col gap-2 w-full sm:w-auto">
       <Label>Ano</Label>
       <div className="h-10">
         <Select className="w-full sm:w-[120px] h-10">...</Select>
       </div>
     </div>
     
     {/* Botão */}
     <div className="flex justify-end lg:justify-start w-full lg:w-auto">
       <div className="h-10">
         <Button className="w-full sm:w-auto min-w-[120px] h-10">
           Aplicar
         </Button>
       </div>
     </div>
   </div>
   ```
   
   **Regras de Filtros:**
   - Ordem SEMPRE: Filial → Mês → Ano → Filtros Específicos → Botão
   - Altura fixa: `h-10` (40px) em TODOS os campos
   - Larguras padronizadas: Filial (200px), Mês (160px), Ano (120px)
   - Layout responsivo: `flex-col` mobile, `flex-row` desktop

3. **Exportação de PDF**
   - Implementado em: Ruptura ABCD, Venda por Curva
   - Importação dinâmica: `jspdf` e `jspdf-autotable`
   - Busca todos os dados: `page_size: 10000`
   - Padrão de implementação em: `docs/PDF_EXPORT_VENDA_CURVA.md`

4. **Chamada RPC com Filtros**
   ```typescript
   // API Route com paginação e filtros
   const { data, error } = await supabase.rpc('get_report_data', {
     p_schema: currentTenant.supabase_schema, // SEMPRE usar schema do tenant
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

### Módulos Especiais

1. **Metas Mensais** (`/metas/mensal`)
   - Permite criar e acompanhar metas por filial
   - Função RPC: `generate_metas_mensais`
   - Atualização automática de valores realizados
   - Visualização agregada quando "Todas as Filiais" selecionado

2. **Setores** (`/configuracoes/setores`)
   - Gerenciamento de setores e departamentos
   - Hierarquia de 3 níveis de departamentos
   - Usado em metas por setor

### Troubleshooting Comum

1. **Erro PGRST106 - Schema não exposto**
   - Causa: Schema não está nos "Exposed schemas" do Supabase
   - Solução: Settings → API → Adicionar schema à lista
   - Ver: `FIX_SCHEMA_LUCIA_ERROR.md`

2. **Erro na exportação de PDF**
   - Verificar limite de `page_size` na API (deve ser ≤ 10000)
   - Ver: `docs/FIX_PDF_EXPORT_ERROR.md`

3. **Filtros com aparência inconsistente**
   - Usar padrão documentado em `docs/FILTER_PATTERN_STANDARD.md`
   - Altura fixa `h-10` em todos os campos
   - Ordem: Filial → Mês → Ano → Específicos → Botão

### Documentação Importante

- `docs/FILTER_PATTERN_STANDARD.md` - Padrão de filtros UI
- `docs/SUPABASE_SCHEMA_CONFIGURATION.md` - Configuração de schemas
- `docs/PDF_EXPORT_VENDA_CURVA.md` - Implementação de PDF
- `FIX_SCHEMA_LUCIA_ERROR.md` - Solução rápida erro PGRST106
- `FILTER_STANDARDIZATION_COMPLETE.md` - Padronização completa

### Checklist para Novos Tenants

- [ ] Criar schema no PostgreSQL: `CREATE SCHEMA nome_tenant;`
- [ ] Executar migrations no novo schema
- [ ] Criar tabelas necessárias
- [ ] Criar funções RPC (get_venda_curva_report, etc)
- [ ] Inserir na tabela `public.tenants`
- [ ] **⚠️ CRÍTICO: Adicionar schema aos "Exposed schemas" no Supabase Dashboard**
- [ ] Configurar permissões (GRANT)
- [ ] Importar dados iniciais
- [ ] Testar acesso via API
- [ ] Criar usuários do tenant

### Performance e Limites

- **Page Size Máximo:** 10.000 registros (APIs de relatório)
- **Exportação PDF:** Usa importação dinâmica para reduzir bundle
- **Cache:** Next.js faz cache automático de páginas estáticas
- **RPC Functions:** Timeout padrão de 30 segundos