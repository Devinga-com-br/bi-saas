# Refatoração do Módulo Despesas para shadcn/ui DataTable

**Data:** 2025-11-10  
**Módulo:** Despesas (`/app/(dashboard)/despesas`)

## Objetivo

Refatorar o módulo de Despesas para seguir os padrões e melhores práticas do shadcn/ui, substituindo a tabela HTML customizada por um DataTable baseado em **@tanstack/react-table**.

## Mudanças Realizadas

### 1. Instalação de Dependências

```bash
npm install @tanstack/react-table
```

### 2. Componentes Criados

#### `/src/components/despesas/data-table.tsx`
- DataTable genérico seguindo padrão shadcn/ui
- Features implementadas:
  - ✅ Sorting (ordenação por coluna)
  - ✅ Global search (busca global)
  - ✅ Column visibility (visibilidade de colunas)
  - ✅ Row expansion (expansão hierárquica)
  - ✅ Export button (botão de exportação)
  - ✅ Responsive toolbar
  - ✅ Contagem de registros

#### `/src/components/despesas/columns.tsx`
- Definição tipada de colunas para o DataTable
- Suporte para hierarquia de 4 níveis:
  1. **Total** (linha agregada)
  2. **Departamento** (expansível)
  3. **Tipo** (expansível)
  4. **Despesa** (linha de detalhe)
- Features das colunas:
  - Botões de expansão (ChevronDown/ChevronRight)
  - Formatação de valores monetários
  - Cálculo de percentuais vs média
  - Indicadores coloridos (+/- % em verde/vermelho)
  - Colunas dinâmicas por filial
  - Sorting clicável

### 3. Componente UI Adicionado

#### `/src/components/ui/dropdown-menu.tsx`
- Adicionado `DropdownMenuCheckboxItem` (faltava no componente original)
- Necessário para o menu de visibilidade de colunas

### 4. Página Refatorada

#### `/src/app/(dashboard)/despesas/page.tsx`
**Removido:**
- Tabela HTML customizada com ~230 linhas
- Estados de expansão manuais (`expandedDepts`, `expandedTipos`)
- Lógica de renderização manual de linhas
- Funções de cálculo inline nas células

**Adicionado:**
- Função `transformToTableData()` - transforma dados hierárquicos em formato flat do TanStack Table
- Função `handleExport()` - stub para implementação futura
- Integração com `<DataTable />` component
- Props configuradas:
  - `getRowCanExpand` - define quais linhas são expansíveis
  - `getSubRows` - retorna sub-linhas para hierarquia
  - `searchPlaceholder` - texto de busca customizado

**Mantido (Lógica de Negócio):**
- ✅ Filtros multi-filial com badges
- ✅ Filtros de mês e ano
- ✅ Busca automática ao mudar filtros
- ✅ Consolidação de dados de múltiplas filiais
- ✅ Cálculo de totalizadores
- ✅ Hierarquia Departamento → Tipo → Despesa
- ✅ Comparação percentual vs média

## Benefícios da Refatoração

### ✅ Padrões shadcn/ui
- Seguindo documentação oficial: https://ui.shadcn.com/docs/components/data-table
- Componentização adequada
- Tipagem forte com TypeScript

### ✅ Melhor UX
- **Busca global** - filtra por qualquer texto na tabela
- **Ordenação** - clique no header para ordenar por coluna
- **Visibilidade de colunas** - usuário escolhe quais colunas ver
- **Contagem de registros** - feedback visual do total filtrado

### ✅ Manutenibilidade
- Componentes reutilizáveis (`data-table.tsx` pode ser usado em outros módulos)
- Separação de responsabilidades (dados vs apresentação)
- Código mais limpo e testável
- Type-safe columns definition

### ✅ Performance
- TanStack Table é otimizado para grandes datasets
- Virtualização possível no futuro
- Memoização automática de células

### ✅ Futuras Melhorias Facilitadas
- Pagination (quando necessário)
- Column resizing
- Column pinning (fixar colunas)
- Row selection (seleção de linhas)
- Export para Excel/PDF (via `handleExport`)
- Filtros por coluna

## Estrutura de Dados

### Tipo `DespesaRow`
```typescript
type DespesaRow = {
  id: string                              // ID único da linha
  tipo: 'total' | 'departamento' | 'tipo' | 'despesa'
  descricao: string                       // Nome/descrição
  data_despesa?: string
  data_emissao?: string
  numero_nota?: number | null
  serie_nota?: string | null
  observacao?: string | null
  total: number                           // Total geral
  percentual: number                      // % do total geral
  valores_filiais: Record<number, number> // { filial_id: valor }
  filiais: number[]                       // IDs das filiais
  subRows?: DespesaRow[]                  // Sub-linhas (hierarquia)
}
```

## Compatibilidade

- ✅ Next.js 15.5.4
- ✅ React 19
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ @tanstack/react-table v8
- ✅ @radix-ui primitives

## Próximos Passos (Opcionais)

1. **Implementar Export**
   - Excel via `xlsx` library
   - PDF via `jspdf` (já usado em outros módulos)

2. **Pagination**
   - Se dataset crescer muito (>1000 registros)
   - Implementar paginação server-side

3. **Column Filters**
   - Filtros específicos por coluna
   - Range de valores para colunas monetárias

4. **Column Pinning**
   - Fixar coluna "Descrição" ao fazer scroll horizontal

5. **Testes**
   - Unit tests para `transformToTableData`
   - Integration tests para DataTable

## Referências

- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [TanStack Table Docs](https://tanstack.com/table/latest)
- [Radix UI Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)
