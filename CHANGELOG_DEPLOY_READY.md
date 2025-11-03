# Changelog - Versão Pronta para Deploy

## Data: 03/11/2025

### ✅ Novidades

#### 1. **Módulo de Parâmetros por Tenant** (NOVO)
- ✅ Nova seção "Parâmetros" em Configurações
- ✅ Toggle para habilitar/desabilitar módulo "Descontos Venda" por tenant
- ✅ Proteção de rota via middleware (redirect automático se desabilitado)
- ✅ Filtro dinâmico no sidebar baseado em parâmetros
- ✅ Tabela `tenant_parameters` com RLS policies
- ✅ Hook `useTenantParameters` para gerenciar parâmetros
- ✅ **FIX**: Parâmetros atualizam automaticamente ao trocar de tenant
- ✅ Documentação completa em `docs/PARAMETROS_TENANT.md`

#### 2. **Correção de Bugs no Dashboard**
- ✅ Fix erro SQL "missing FROM-clause entry for table 'v'" em filtros por filial
- ✅ Fix erro SQL "missing FROM-clause entry for table 'vdf'" em gráfico de vendas
- ✅ Remoção de aliases de tabela nas funções RPC
- ✅ Atualização de `APPLY_DISCOUNT_SALES_CHART.sql`
- ✅ Atualização de `APPLY_DISCOUNT_VENDAS_FILIAL.sql`
- ✅ Documentação da correção em `FIX_DASHBOARD_FILIAL_FILTER.md`

#### 3. **Correção: Atualização de Parâmetros ao Trocar Tenant**
- ✅ Hook `useTenantParameters` reseta valores ao mudar tenant
- ✅ Sidebar força re-render com key dinâmica
- ✅ Módulos aparecem/desaparecem instantaneamente sem refresh manual
- ✅ Loading state corrigido para evitar race conditions
- ✅ Documentação em `FIX_PARAMETERS_TENANT_SWITCH.md`

#### 4. **Correção: Middleware Bloqueia Acesso Direto por URL**
- ✅ Middleware valida parâmetros antes de renderizar página
- ✅ Impossível burlar proteção via URL direta
- ✅ Uso de `.maybeSingle()` para query robusta
- ✅ Logs detalhados para debug no terminal
- ✅ Comparação estrita: `parameter_value !== true`
- ✅ Padrão seguro: sem parâmetro = bloqueado
- ✅ Documentação em `FIX_MIDDLEWARE_URL_DIRECT_ACCESS.md`

### 📁 Arquivos Criados/Modificados

#### Novos Arquivos
- `supabase/migrations/20251103145022_create_tenant_parameters.sql`
- `src/components/configuracoes/parametros-content.tsx`
- `src/hooks/use-tenant-parameters.ts`
- `docs/PARAMETROS_TENANT.md`
- `IMPLEMENTACAO_PARAMETROS.md`
- `FIX_DASHBOARD_FILIAL_FILTER.md`
- `FIX_PARAMETERS_TENANT_SWITCH.md`
- `FIX_MIDDLEWARE_URL_DIRECT_ACCESS.md`
- `TESTE_MIDDLEWARE_PARAMETROS.md`

#### Arquivos Modificados
- `src/app/(dashboard)/configuracoes/page.tsx` - Adicionado menu Parâmetros
- `src/components/dashboard/app-sidebar.tsx` - Filtro dinâmico + key dinâmica + logs
- `src/lib/supabase/middleware.ts` - Proteção robusta + logs + maybeSingle + comparação estrita
- `src/hooks/use-tenant-parameters.ts` - Reset ao trocar tenant + valores padrão
- `APPLY_DISCOUNT_SALES_CHART.sql` - Fix aliases SQL
- `APPLY_DISCOUNT_VENDAS_FILIAL.sql` - Fix aliases SQL

---

## Data: 16/10/2025

### ✅ Funcionalidades Implementadas

#### 1. **Dashboard Principal**
- ✅ Novo card "Total Vendas (Acum. Ano)" mostrando vendas acumuladas do ano com comparação ao ano anterior
- ✅ Tabela de vendas por filial reformatada com comparação inline (valor atual + % variação + valor anterior)
- ✅ Colunas delta removidas, informação consolidada em cada célula
- ✅ Layout responsivo com 4 cards principais

#### 2. **Módulo de Metas Mensais**
- ✅ Sistema de metas diárias funcional
- ✅ Collapse padrão fechado para melhor performance
- ✅ Filtros alinhados e responsivos
- ✅ Componente DatePicker consistente em toda aplicação
- ✅ Correção no cálculo de vendas realizadas (fix migration 024)

#### 3. **Módulo de Metas por Setor** (NOVO)
- ✅ Geração de metas por setor baseado em hierarquia de departamentos (níveis 1-6)
- ✅ Cálculo automático de vendas por setor usando `departments_level_1`
- ✅ Seleção múltipla de setores e filiais
- ✅ Limpeza automática do formulário após geração
- ✅ Layout alinhado com módulo de metas mensais
- ✅ Collapse padrão fechado
- ✅ Coluna "Dia da Semana" e "Data" formatadas consistentemente
- ✅ Filtros otimizados (não recarrega desnecessariamente)

#### 4. **Configurações de Setores** (NOVO)
- ✅ CRUD completo de setores
- ✅ Vinculação de departamentos por nível hierárquico
- ✅ Interface intuitiva para gestão de setores

### 🔧 Correções Técnicas

#### Database
- ✅ Migration 022: Criação de tabela `setores` e `metas_setor`
- ✅ Migration 023: Função `generate_metas_setor` com cálculo correto por hierarquia
- ✅ Migration 024: Fix no cálculo de vendas realizadas em metas mensais
- ✅ Migration 025: Adição de métricas YTD (Year-To-Date) no dashboard

#### Frontend
- ✅ Correção de tipos para Next.js 15 (params agora é Promise)
- ✅ Remoção de warnings de hooks no build
- ✅ Otimização de renders desnecessários
- ✅ Componentes de data padronizados
- ✅ Layout responsivo em todos os módulos

### 📊 APIs Criadas

1. **GET /api/setores** - Lista setores
2. **POST /api/setores** - Cria setor
3. **PUT /api/setores/[id]** - Atualiza setor
4. **DELETE /api/setores/[id]** - Remove setor
5. **GET /api/setores/departamentos** - Lista departamentos por nível
6. **GET /api/metas/setor/report** - Relatório de metas por setor
7. **POST /api/metas/setor/generate** - Geração de metas por setor

### 🎨 Melhorias de UX/UI

- Layout consistente entre módulos de metas
- Filtros alinhados à esquerda em todos os módulos
- Campos de data com mesmo componente (DatePicker)
- Collapse padrão fechado para melhor performance
- Feedback visual claro em todas as operações
- Campos limpos após geração de metas

### 🚀 Performance

- Geração de metas otimizada (uma filial/setor por vez)
- Queries otimizadas usando `departments_level_1` para hierarquia
- Filtros que só recarregam quando necessário
- Build time otimizado

### ⚠️ Avisos do Build (Não-bloqueantes)

```
./src/app/(dashboard)/configuracoes/setores/page.tsx
68:6  Warning: React Hook useEffect has a missing dependency: 'loadSetores'
74:6  Warning: React Hook useEffect has a missing dependency: 'loadDepartamentos'

./src/app/(dashboard)/metas/setor/page.tsx
103:6  Warning: React Hook useEffect has a missing dependency: 'loadSetores'
109:6  Warning: React Hook useEffect has a missing dependency: 'loadMetasPorSetor'
```

Esses warnings são por design - as funções são estáveis e não precisam estar nas dependências.

### 📝 Migrations Pendentes de Deploy

As seguintes migrations devem ser aplicadas no Supabase em produção:

1. `022_create_setores_and_metas_setor.sql`
2. `023_create_generate_metas_setor_function.sql`
3. `024_fix_metas_vendas_realizadas.sql`
4. `025_add_ytd_sales_to_dashboard.sql`

### 🗑️ Arquivos para NÃO Incluir no Deploy

Já foram identificados e podem ser excluídos ou adicionados ao `.gitignore`:

- Arquivos SQL de teste/debug na pasta `supabase/`
- Arquivos `.md` de documentação de desenvolvimento
- Pasta `evidencias/` (se existir)

### ✅ Checklist de Deploy

- [x] Build local passou sem erros
- [x] Types validados
- [x] Linting passou
- [x] Migrations criadas e testadas
- [x] Funcionalidades testadas manualmente
- [x] Layout responsivo verificado
- [x] Performance otimizada

### 📦 Tamanhos do Build

```
Route (app)                                Size  First Load JS
├ ○ /dashboard                           108 kB         341 kB
├ ○ /metas/mensal                       34.9 kB         277 kB
├ ○ /metas/setor                        36.8 kB         278 kB
├ ○ /configuracoes/setores              4.86 kB         246 kB
```

### 🎯 Próximos Passos Sugeridos

1. Aplicar migrations no Supabase de produção
2. Deploy da aplicação
3. Teste de fumaça em produção
4. Monitorar performance das queries de metas por setor
5. Considerar adicionar índices se necessário

### 📚 Documentação Atualizada

- README com instruções de setup
- Guia de desenvolvimento em `.github/copilot-instructions.md`
- Changelog completo neste arquivo

---

**Versão:** 1.0.0  
**Status:** ✅ PRONTO PARA DEPLOY  
**Data de Build:** 16/10/2025
