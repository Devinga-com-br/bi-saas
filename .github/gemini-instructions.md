# Contexto de Desenvolvimento - BI SaaS Multi-Tenant

**Sistema:** Business Intelligence SaaS  
**Stack:** Next.js 15, React 19, TypeScript, Supabase PostgreSQL  
**Última Atualização:** 2025-10-17

## Arquitetura Multi-Tenant

### Isolamento por Schema PostgreSQL
- Cada cliente (tenant) possui seu próprio **schema PostgreSQL**
- Schema `public`: Apenas configurações globais (tenants, user_profiles)
- Schemas de clientes: `okilao`, `saoluiz`, `paraiso`, `lucia`, etc.
- **Tabela principal:** `public.tenants` com campo `supabase_schema`

### ⚠️ CONFIGURAÇÃO CRÍTICA: Exposed Schemas
**Erro mais comum:** `PGRST106 - Schema not in allowed list`

**Solução:**
1. Todo novo schema DEVE ser adicionado aos "Exposed schemas" no Supabase
2. Caminho: Dashboard → Settings → API → Exposed schemas
3. Adicionar o nome do schema à lista separada por vírgulas
4. Exemplo: `public, graphql_public, okilao, saoluiz, paraiso, lucia`

**Documentação:** `docs/SUPABASE_SCHEMA_CONFIGURATION.md`

## Stack Técnico

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + shadcn/ui
- **State Management:** React Hooks + Context API
- **Data Fetching:** SWR (quando aplicável)

### Backend
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **API:** Next.js API Routes
- **RPC Functions:** PostgreSQL Functions via Supabase RPC

### Bibliotecas Importantes
- **PDF Export:** jspdf + jspdf-autotable (importação dinâmica)
- **Forms:** React Hook Form
- **Icons:** Lucide React
- **Date:** date-fns
- **Charts:** (quando implementado)

## Estrutura de Pastas

```
/src
├── app/
│   ├── (auth)/           # Rotas de autenticação
│   ├── (dashboard)/      # Rotas protegidas
│   │   ├── relatorios/   # Relatórios
│   │   ├── metas/        # Metas mensais e por setor
│   │   ├── configuracoes/ # Configurações e setores
│   │   └── usuarios/     # Gestão de usuários
│   └── api/              # API Routes
├── components/
│   └── ui/               # Componentes shadcn/ui
├── contexts/             # React Contexts
├── hooks/                # Custom Hooks
├── lib/
│   ├── supabase/         # Clients Supabase
│   └── utils.ts          # Utilidades
└── types/                # TypeScript Types

/supabase/migrations/     # SQL Migrations
/docs/                    # Documentação
```

## Padrões de Código

### 1. Filtros de Relatórios (PADRÃO OBRIGATÓRIO)

**Documentação:** `docs/FILTER_PATTERN_STANDARD.md`

```tsx
// Layout padrão de filtros
<Card>
  <CardContent>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
      {/* Filial - SEMPRE PRIMEIRO */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label>Filial</Label>
        <div className="h-10">
          <Select className="w-full sm:w-[200px] h-10">
            {/* opções */}
          </Select>
        </div>
      </div>
      
      {/* Mês - SEGUNDO */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label>Mês</Label>
        <div className="h-10">
          <Select className="w-full sm:w-[160px] h-10">
            {/* opções */}
          </Select>
        </div>
      </div>
      
      {/* Ano - TERCEIRO */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label>Ano</Label>
        <div className="h-10">
          <Select className="w-full sm:w-[120px] h-10">
            {/* opções */}
          </Select>
        </div>
      </div>
      
      {/* Filtros específicos aqui */}
      
      {/* Botão - SEMPRE POR ÚLTIMO */}
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

**Regras dos Filtros:**
- ✅ Ordem FIXA: Filial → Mês → Ano → Específicos → Botão
- ✅ Altura FIXA: `h-10` (40px) em TODOS os campos
- ✅ Larguras: Filial (200px), Mês (160px), Ano (120px), Botão (min 120px)
- ✅ Layout responsivo: vertical mobile, horizontal desktop
- ✅ Alinhamento: `items-end` para alinhar campos pela base

### 2. Exportação de PDF

**Documentação:** `docs/PDF_EXPORT_VENDA_CURVA.md`

```tsx
const handleExportarPDF = async () => {
  try {
    setLoading(true)
    
    // Importação dinâmica
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default
    
    // Buscar TODOS os dados
    const params = new URLSearchParams({
      schema: currentTenant.supabase_schema,
      page: '1',
      page_size: '10000' // Máximo permitido
    })
    
    const response = await fetch(`/api/relatorio?${params}`)
    const allData = await response.json()
    
    // Criar PDF
    const doc = new jsPDF({
      orientation: 'landscape', // ou 'portrait'
      unit: 'mm',
      format: 'a4'
    })
    
    // ... configurar cabeçalho e tabela
    
    autoTable(doc as any, {
      head: [headers],
      body: tableData,
      // ... configurações
    })
    
    doc.save('relatorio.pdf')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    alert(`Erro: ${errorMessage}`)
  } finally {
    setLoading(false)
  }
}
```

### 3. Chamadas RPC ao Supabase

```typescript
// API Route
const { data, error } = await supabase.rpc('get_report_data', {
  p_schema: currentTenant.supabase_schema, // SEMPRE usar schema
  p_filial_id: parseInt(filialId),
  p_mes: mes,
  p_ano: ano,
  p_page: page,
  p_page_size: pageSize
})

if (error) {
  return NextResponse.json(
    { error: 'Erro: ' + error.message },
    { status: 500 }
  )
}
```

### 4. Contexto do Tenant

```tsx
'use client'

import { useTenantContext } from '@/contexts/tenant-context'

export default function MyComponent() {
  const { currentTenant, userProfile } = useTenantContext()
  
  // currentTenant.supabase_schema - Nome do schema
  // currentTenant.id - ID do tenant
  // userProfile.role - Função do usuário
}
```

## Relatórios Implementados

### 1. Ruptura ABCD
- **Rota:** `/relatorios/ruptura-abcd`
- **Função RPC:** `get_ruptura_abcd_report`
- **Features:** Filtros, paginação, exportação PDF
- **Hierarquia:** Departamentos → Produtos

### 2. Venda por Curva
- **Rota:** `/relatorios/venda-curva`
- **Função RPC:** `get_venda_curva_report`
- **Features:** Filtros, paginação, exportação PDF
- **Hierarquia:** Dept Nível 3 → Nível 2 → Nível 1 → Produtos

### 3. Metas Mensais
- **Rota:** `/metas/mensal`
- **Função RPC:** `generate_metas_mensais`
- **Features:** Criação, visualização, atualização automática

### 4. Metas por Setor
- **Rota:** `/metas/setor`
- **Função RPC:** `generate_metas_setor`
- **Features:** Gestão por setor, departamentos hierárquicos

## Troubleshooting

### Erro PGRST106
```
Error: The schema must be one of the following: public, ...
```
**Solução:** Adicionar schema aos "Exposed schemas" no Supabase Dashboard  
**Doc:** `FIX_SCHEMA_LUCIA_ERROR.md`

### Erro na Exportação PDF
**Solução:** Verificar limite de `page_size` na API (máx 10.000)  
**Doc:** `docs/FIX_PDF_EXPORT_ERROR.md`

### Filtros com Layout Quebrado
**Solução:** Seguir padrão em `docs/FILTER_PATTERN_STANDARD.md`

## Checklist: Criar Novo Tenant

1. ✅ Criar schema: `CREATE SCHEMA nome_tenant;`
2. ✅ Executar migrations no schema
3. ✅ Criar tabelas e índices
4. ✅ Criar funções RPC necessárias
5. ✅ Inserir na tabela `public.tenants`
6. ⚠️ **CRÍTICO:** Adicionar aos "Exposed schemas" no Supabase
7. ✅ Configurar permissões (GRANT)
8. ✅ Importar dados iniciais
9. ✅ Testar via API
10. ✅ Criar usuários do tenant

**Doc completa:** `supabase/migrations/999_create_lucia_tenant_schema.sql`

## Limites e Performance

- **Page Size API:** Máximo 10.000 registros
- **Timeout RPC:** 30 segundos (padrão)
- **Bundle Size:** Importação dinâmica para PDF reduz carga inicial
- **Cache:** Next.js cache automático em produção

## Documentação de Referência

### Essenciais
- `docs/FILTER_PATTERN_STANDARD.md` - Padrão UI de filtros
- `docs/SUPABASE_SCHEMA_CONFIGURATION.md` - Config schemas
- `FIX_SCHEMA_LUCIA_ERROR.md` - Fix rápido PGRST106

### Implementações
- `docs/PDF_EXPORT_VENDA_CURVA.md` - Exportação PDF
- `FILTER_STANDARDIZATION_COMPLETE.md` - Padronização UI
- `EXPORT_PDF_VENDA_CURVA_COMPLETE.md` - Resumo exportação

### Scripts SQL
- `supabase/migrations/*.sql` - Todas as migrations
- `supabase/migrations/999_create_lucia_tenant_schema.sql` - Template tenant

## Boas Práticas

1. **Sempre** usar o schema do tenant nas queries
2. **Sempre** seguir padrão de filtros documentado
3. **Sempre** validar permissões do usuário
4. **Sempre** usar importação dinâmica para PDFs
5. **Sempre** adicionar novo schema aos "Exposed schemas"
6. **Sempre** usar tipos TypeScript
7. **Sempre** tratar erros com mensagens descritivas
8. **Nunca** fazer queries sem filtro de tenant
9. **Nunca** expor dados de um tenant para outro
10. **Nunca** commitar variáveis de ambiente

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Limpar cache
rm -rf .next

# TypeScript check
npx tsc --noEmit
```

---

**Mantenha este arquivo atualizado quando implementar novas features!**
