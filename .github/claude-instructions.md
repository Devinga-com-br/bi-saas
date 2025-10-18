# Sistema BI SaaS - Guia de Desenvolvimento Claude

**Projeto:** Business Intelligence SaaS Multi-Tenant  
**Última Atualização:** 2025-10-17  
**Stack:** Next.js 15, React 19, TypeScript, Supabase

---

## Arquitetura Multi-Tenant (Schema PostgreSQL)

### Conceito Fundamental
- **Isolamento:** Cada tenant possui seu próprio **schema PostgreSQL**
- **Schema público:** `public` - Contém apenas `tenants` e `user_profiles`
- **Schemas de tenants:** `okilao`, `saoluiz`, `paraiso`, `lucia`, etc.
- **Vantagem:** Isolamento total de dados, melhor segurança e performance

### Estrutura de Schemas
```
PostgreSQL Database
├── public/                    ← Configurações globais
│   ├── tenants               ← Registro de todos os tenants
│   └── user_profiles         ← Usuários do sistema
├── okilao/                   ← Dados do cliente Okilão
│   ├── vendas
│   ├── produtos
│   └── ... (todas as tabelas)
├── saoluiz/                  ← Dados do cliente São Luiz
├── paraiso/                  ← Dados do cliente Paraíso
└── lucia/                    ← Dados do cliente Lucia
```

### ⚠️ CONFIGURAÇÃO CRÍTICA

**Problema mais comum:** Erro `PGRST106`
```
Error: The schema must be one of the following: public, graphql_public, ...
```

**Causa:** Schema não está na lista de "Exposed schemas" do Supabase

**Solução:**
1. Acessar Supabase Dashboard
2. Ir em **Settings** → **API**
3. Encontrar **"Exposed schemas"**
4. Adicionar schema à lista: `public, graphql_public, okilao, saoluiz, paraiso, lucia`
5. Salvar e aguardar 1-2 minutos

**Documentação completa:** `docs/SUPABASE_SCHEMA_CONFIGURATION.md`

---

## Stack Técnico Detalhado

### Frontend
```typescript
// Framework & UI
- Next.js 15 (App Router) - SSR, RSC, Route Handlers
- React 19 - Componentes e Hooks
- TypeScript 5 - Type safety
- Tailwind CSS - Estilização
- shadcn/ui - Componentes base

// State & Data
- React Context - Estado global (tenant, user)
- React Hooks - Estado local
- SWR - Data fetching com cache (quando aplicável)

// Bibliotecas
- lucide-react - Ícones
- date-fns - Manipulação de datas
- jspdf + jspdf-autotable - Exportação PDF
- react-hook-form - Formulários
```

### Backend
```typescript
// Database & Auth
- Supabase PostgreSQL - Banco de dados
- Supabase Auth - Autenticação
- PostgREST - API REST automática
- Next.js API Routes - Endpoints customizados

// Patterns
- RPC Functions - Lógica complexa no banco
- Row Level Security (RLS) - Segurança por tenant
- Schema Isolation - Isolamento por schema
```

---

## Padrões de Desenvolvimento

### 1. Filtros de UI (PADRÃO OBRIGATÓRIO)

**Referência:** `docs/FILTER_PATTERN_STANDARD.md`

Todos os relatórios DEVEM seguir este padrão visual:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Filtros</CardTitle>
    <CardDescription>Configure os filtros</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
      
      {/* 1. FILIAL - Sempre primeiro */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label>Filial</Label>
        <div className="h-10">
          <Select className="w-full sm:w-[200px] h-10">
            {/* ... */}
          </Select>
        </div>
      </div>

      {/* 2. MÊS - Segundo */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label>Mês</Label>
        <div className="h-10">
          <Select className="w-full sm:w-[160px] h-10">
            {/* ... */}
          </Select>
        </div>
      </div>

      {/* 3. ANO - Terceiro */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label>Ano</Label>
        <div className="h-10">
          <Select className="w-full sm:w-[120px] h-10">
            {/* ... */}
          </Select>
        </div>
      </div>

      {/* 4. Filtros específicos aqui (opcional) */}

      {/* 5. BOTÃO - Sempre por último */}
      <div className="flex justify-end lg:justify-start w-full lg:w-auto">
        <div className="h-10">
          <Button className="w-full sm:w-auto min-w-[120px] h-10">
            Aplicar
          </Button>
        </div>
      </div>
      
    </div>
  </CardContent>
</Card>
```

**Características obrigatórias:**
- ✅ Ordem fixa: Filial → Mês → Ano → Específicos → Botão
- ✅ Altura fixa: `h-10` (40px) em TODOS os campos
- ✅ Larguras padrão: Filial 200px, Mês 160px, Ano 120px
- ✅ Responsivo: vertical mobile, horizontal desktop
- ✅ Alinhamento: `items-end` para alinhar pela base

### 2. Exportação de PDF

**Referência:** `docs/PDF_EXPORT_VENDA_CURVA.md`

Padrão para exportar relatórios em PDF:

```tsx
import { FileDown } from 'lucide-react'

// No header da página
{data && data.length > 0 && (
  <Button
    onClick={handleExportarPDF}
    disabled={loading}
    variant="outline"
    className="gap-2"
  >
    <FileDown className="h-4 w-4" />
    Exportar PDF
  </Button>
)}

// Função de exportação
const handleExportarPDF = async () => {
  if (!currentTenant?.supabase_schema) return
  
  try {
    setLoading(true)
    
    // Importação dinâmica (não aumenta bundle inicial)
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default
    
    // Buscar TODOS os dados
    const params = new URLSearchParams({
      schema: currentTenant.supabase_schema,
      mes, ano, filial_id,
      page: '1',
      page_size: '10000' // Máximo permitido pela API
    })
    
    const response = await fetch(`/api/relatorio?${params}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(errorData.error || 'Erro ao buscar dados')
    }
    
    const allData = await response.json()
    
    // Criar PDF
    const doc = new jsPDF({
      orientation: 'landscape', // ou 'portrait'
      unit: 'mm',
      format: 'a4'
    })
    
    // Configurar cabeçalho
    doc.setFont('helvetica')
    doc.setFontSize(16)
    doc.text('Título do Relatório', doc.internal.pageSize.width / 2, 15, { 
      align: 'center' 
    })
    
    doc.setFontSize(10)
    doc.text(`Filial: ${filialNome}`, 14, 25)
    doc.text(`Período: ${mes}/${ano}`, 14, 30)
    
    // Preparar dados da tabela
    const tableData = [] // ... processar dados
    
    // Gerar tabela
    autoTable(doc as any, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages()
        doc.setFontSize(8)
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }
    })
    
    // Salvar
    const fileName = `relatorio-${Date.now()}.pdf`
    doc.save(fileName)
    
  } catch (err) {
    console.error('Erro ao exportar PDF:', err)
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    alert(`Erro ao exportar PDF: ${errorMessage}`)
  } finally {
    setLoading(false)
  }
}
```

### 3. Chamadas RPC ao Supabase

```typescript
// API Route (/api/relatorio/route.ts)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    
    // Obter parâmetros
    const schema = searchParams.get('schema')
    const filialId = searchParams.get('filial_id')
    const mes = parseInt(searchParams.get('mes') || '1')
    const ano = parseInt(searchParams.get('ano') || '2024')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '50')
    
    // Validações
    if (!schema) {
      return NextResponse.json({ error: 'Schema não informado' }, { status: 400 })
    }
    
    if (pageSize > 10000) {
      return NextResponse.json({ error: 'Page size máximo: 10000' }, { status: 400 })
    }
    
    // Chamar RPC Function
    const { data, error } = await (supabase as any).rpc('get_report_data', {
      p_schema: schema,
      p_filial_id: filialId ? parseInt(filialId) : null,
      p_mes: mes,
      p_ano: ano,
      p_page: page,
      p_page_size: pageSize
    })
    
    if (error) {
      console.error('[API] Error:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar dados: ' + error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data,
      page,
      page_size: pageSize,
      total: data?.length || 0
    })
    
  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro inesperado' },
      { status: 500 }
    )
  }
}
```

### 4. Contexto do Tenant

```tsx
'use client'

import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'

export default function MyPage() {
  // Obter tenant e perfil do usuário
  const { currentTenant, userProfile } = useTenantContext()
  
  // Obter filiais do tenant
  const { options: filiaisOptions } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant
  })
  
  // Usar o schema nas chamadas
  const schema = currentTenant?.supabase_schema
  
  return (
    <div>
      <h1>Tenant: {currentTenant?.name}</h1>
      <p>Schema: {schema}</p>
      <p>Usuário: {userProfile?.full_name}</p>
    </div>
  )
}
```

---

## Módulos Implementados

### 1. Relatório Ruptura ABCD
- **Rota:** `/relatorios/ruptura-abcd`
- **RPC:** `get_ruptura_abcd_report`
- **Features:** Filtros padronizados, paginação, exportação PDF
- **Estrutura:** Departamentos → Produtos em ruptura

### 2. Relatório Venda por Curva
- **Rota:** `/relatorios/venda-curva`
- **RPC:** `get_venda_curva_report`
- **Features:** Filtros padronizados, paginação, exportação PDF
- **Estrutura:** Hierarquia 3 níveis → Produtos

### 3. Metas Mensais
- **Rota:** `/metas/mensal`
- **RPC:** `generate_metas_mensais`, `update_metas_values`
- **Features:** Criação, visualização, atualização automática
- **Especial:** Visualização agregada por data

### 4. Metas por Setor
- **Rota:** `/metas/setor`
- **RPC:** `generate_metas_setor`, `update_setor_metas_values`
- **Features:** Gestão por setor com departamentos

### 5. Gestão de Setores
- **Rota:** `/configuracoes/setores`
- **Features:** CRUD de setores, associação de departamentos

---

## Troubleshooting

### Erro PGRST106 - Schema não exposto
```
Error: The schema must be one of the following: public, ...
```

**Passos para resolver:**
1. Supabase Dashboard → Settings → API
2. Encontrar "Exposed schemas"
3. Adicionar schema: `, nome_schema`
4. Salvar e aguardar 1-2 min
5. Testar novamente

**Doc:** `FIX_SCHEMA_LUCIA_ERROR.md`

### Erro na Exportação de PDF
**Sintomas:** Erro 400 ao exportar

**Causa:** API limita page_size a 100, exportação tenta 10000

**Solução:** Já corrigida - limite aumentado para 10000

**Doc:** `docs/FIX_PDF_EXPORT_ERROR.md`

### Filtros com Visual Inconsistente
**Problema:** Filtros com tamanhos e espaçamentos diferentes

**Solução:** Seguir padrão em `docs/FILTER_PATTERN_STANDARD.md`

---

## Checklist: Criar Novo Tenant

```markdown
- [ ] 1. Criar schema PostgreSQL
      CREATE SCHEMA nome_tenant;

- [ ] 2. Executar migrations no schema
      SET search_path TO nome_tenant;
      -- executar todas as migrations

- [ ] 3. Criar tabelas necessárias
      vendas, produtos, departamentos, filiais, etc.

- [ ] 4. Criar funções RPC
      get_venda_curva_report, get_ruptura_abcd_report, etc.

- [ ] 5. Inserir na tabela tenants
      INSERT INTO public.tenants (name, supabase_schema, created_at)
      VALUES ('Nome', 'nome_tenant', NOW());

- [ ] 6. ⚠️ CRÍTICO: Adicionar aos "Exposed schemas"
      Supabase Dashboard → Settings → API → Exposed schemas

- [ ] 7. Configurar permissões
      GRANT USAGE ON SCHEMA nome_tenant TO anon, authenticated, service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA nome_tenant TO ...;

- [ ] 8. Importar dados iniciais
      Filiais, departamentos, produtos, vendas históricas

- [ ] 9. Testar via API
      GET /api/setores?schema=nome_tenant

- [ ] 10. Criar usuários do tenant
       Inserir em user_profiles com tenant_id correto
```

**Template SQL:** `supabase/migrations/999_create_lucia_tenant_schema.sql`

---

## Limites e Performance

| Item | Limite | Nota |
|------|--------|------|
| Page Size API | 10.000 | Configurado nas APIs |
| Timeout RPC | 30s | Padrão Supabase |
| Bundle PDF | Dinâmico | Importação on-demand |
| Cache Next.js | Automático | Produção only |

---

## Documentação de Referência

### Core
- `docs/FILTER_PATTERN_STANDARD.md` - Padrão UI filtros
- `docs/SUPABASE_SCHEMA_CONFIGURATION.md` - Config schemas
- `FIX_SCHEMA_LUCIA_ERROR.md` - Fix rápido PGRST106

### Features
- `docs/PDF_EXPORT_VENDA_CURVA.md` - Implementação PDF
- `EXPORT_PDF_VENDA_CURVA_COMPLETE.md` - Resumo exportação
- `FILTER_STANDARDIZATION_COMPLETE.md` - Padronização UI

### SQL
- `supabase/migrations/*.sql` - Todas migrations
- `supabase/migrations/999_create_lucia_tenant_schema.sql` - Template

---

## Comandos Úteis

```bash
# Dev
npm run dev

# Build
npm run build

# Produção
npm start

# Limpar cache
rm -rf .next

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

**Mantenha atualizado! Última revisão: 2025-10-17**
