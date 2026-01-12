# Módulo: Produtos sem Vendas a X dias

**Localização:** `/dashboard/relatorios/produtos-sem-vendas`  
**Ícone:** `ChartCandlestick` (lucide-react)  
**Submódulo:** Vendas  
**Criado:** 2026-01-10

## Visão Geral

Módulo para identificar produtos que não tiveram vendas em um período específico, permitindo análise de produtos parados em estoque e facilitando decisões de compras e promoções.

## Arquitetura

### Stack Tecnológica

- **Frontend:** React 19 + Next.js 15 (App Router)
- **UI Components:** shadcn/ui
- **Ícones:** lucide-react
- **Backend:** Supabase RPC Function
- **Database:** PostgreSQL (multi-tenant por schema)

### Estrutura de Arquivos

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── relatorios/
│   │       └── produtos-sem-vendas/
│   │           └── page.tsx          # Página principal
│   └── api/
│       └── relatorios/
│           └── produtos-sem-vendas/
│               └── route.ts          # API Route
supabase/
└── migrations/
    └── 20260110_create_produtos_sem_vendas_function.sql  # RPC Function
```

## Funcionalidades

### Filtros Disponíveis

1. **Filiais** (MultiSelect)
   - Permite selecionar múltiplas filiais
   - Default: "Todas as filiais"

2. **Dias sem vendas** (Input numérico)
   - Define o período de inatividade
   - Default: 30 dias
   - Min: 1 dia

3. **Curva de Vendas** (Select)
   - Opções: Todas, A, B, C, D
   - Default: Todas

4. **Filtrar por** (Select)
   - Todos os produtos (default)
   - Departamentos
   - Setores
   - Produtos específicos

5. **Filtro Específico** (Dinâmico)
   - Aparece conforme seleção do "Filtrar por"
   - Utiliza componentes:
     - `DepartmentFilterPopover`
     - `SectorFilterPopover`

### Colunas Retornadas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| Filial | TEXT | Código + Nome da filial |
| Código | BIGINT | ID do produto |
| Descrição | TEXT | Nome do produto |
| Estoque | NUMERIC(18,6) | Quantidade em estoque |
| Últ. Venda | DATE | Data da última venda |
| Custo | NUMERIC(15,5) | Preço de custo atual |
| Curva Venda | TEXT | Curva ABC de vendas |
| Curva Lucro | VARCHAR(2) | Curva de lucratividade |
| Dias | INTEGER | Dias sem venda |

### Exportação

- **Formato:** PDF (Landscape A4)
- **Biblioteca:** jspdf + jspdf-autotable
- **Importação:** Dinâmica (code splitting)
- **Conteúdo:**
  - Título e parâmetros de filtro
  - Data/hora de geração
  - Tabela completa de resultados

## Função RPC: `get_produtos_sem_vendas`

### Parâmetros

```typescript
{
  p_schema: string              // Schema do tenant
  p_filiais: string             // IDs separados por vírgula ou 'all'
  p_dias_sem_vendas: number     // Período de inatividade (dias)
  p_data_referencia: date       // Data de referência (CURRENT_DATE)
  p_curva_abc: string           // 'all' | 'A' | 'B' | 'C' | 'D'
  p_filtro_tipo: string         // 'all' | 'departamento' | 'setor' | 'produto'
  p_departamento_ids: string?   // IDs de departamentos/setores
  p_produto_ids: string?        // IDs de produtos específicos
}
```

### Lógica da Função

```sql
WITH 
-- 1. Buscar última venda histórica (tabela vendas)
ultimas_vendas_historico AS (
  SELECT id_produto, filial_id, MAX(data_venda) as data_ultima_venda
  FROM schema.vendas
  GROUP BY id_produto, filial_id
),

-- 2. Buscar última venda do dia (tabela vendas_hoje_itens)
ultimas_vendas_hoje AS (
  SELECT produto_id, filial_id, MAX(data_extracao) as data_ultima_venda
  FROM schema.vendas_hoje_itens
  WHERE cancelado = false
  GROUP BY produto_id, filial_id
),

-- 3. Combinar ambas fontes
todas_ultimas_vendas AS (
  SELECT 
    COALESCE(vh.id_produto, vhj.produto_id) as produto_id,
    COALESCE(vh.filial_id, vhj.filial_id) as filial_id,
    GREATEST(vh.data_ultima_venda, vhj.data_ultima_venda) as data_ultima_venda
  FROM ultimas_vendas_historico vh
  FULL OUTER JOIN ultimas_vendas_hoje vhj 
    ON vh.id_produto = vhj.produto_id 
    AND vh.filial_id = vhj.filial_id
)

-- 4. Filtrar produtos sem vendas no período
SELECT p.*, tuv.data_ultima_venda,
  (CURRENT_DATE - tuv.data_ultima_venda) as dias_sem_venda
FROM schema.produtos p
LEFT JOIN todas_ultimas_vendas tuv ON ...
WHERE p.ativo = true
  AND p.estoque_atual > 0
  AND (tuv.data_ultima_venda IS NULL OR tuv.data_ultima_venda < data_limite)
ORDER BY dias_sem_venda DESC NULLS LAST
```

### Tabelas Utilizadas

1. **`vendas`** - Vendas históricas (dias fechados)
2. **`vendas_hoje_itens`** - Vendas do dia atual
3. **`produtos`** - Cadastro de produtos
4. **`departments_level_1`** - Departamentos nível 1
5. **`departments_level_2`** - Setores nível 2
6. **`departments_level_3`** - Setores nível 3
7. **`departments_level_4`** - Setores nível 4

## Padrões Utilizados

### UI e Espaçamentos

- **Altura de campos:** `h-10` (40px) - padrão do sistema
- **Grid responsivo:** `grid-cols-1 md:grid-cols-3`
- **Espaçamento entre seções:** `space-y-4` e `space-y-6`
- **Cores:** 
  - Primary: `bg-blue-100 dark:bg-blue-900`
  - Text: `text-blue-600 dark:text-blue-400`

### Badges

```tsx
// Curva ABC
<Badge variant={
  curva === 'A' ? 'default' :
  curva === 'B' ? 'secondary' : 'outline'
}>
  {curva}
</Badge>

// Dias sem venda (alerta)
<Badge variant={dias > 90 ? 'destructive' : 'secondary'}>
  {dias}
</Badge>
```

### Multi-Select de Filiais

```tsx
<MultiSelect
  options={branches}
  value={selectedBranches}
  onValueChange={setSelectedBranches}
  placeholder="Todas as filiais"
/>
```

## API Route

**Endpoint:** `GET /api/relatorios/produtos-sem-vendas`

**Query Parameters:**
```
schema=saoluiz
filiais=10,20,30
dias_sem_vendas=30
data_referencia=2026-01-10
curva_abc=all
filtro_tipo=departamento
departamento_ids=1,2,3
produto_ids=100,200,300
```

**Response:**
```json
[
  {
    "filial_id": 10,
    "produto_id": 12345,
    "descricao": "PRODUTO EXEMPLO",
    "estoque_atual": 15.50,
    "data_ultima_venda": "2025-11-15",
    "preco_custo": 10.50,
    "curva_abcd": "A",
    "curva_lucro": "B",
    "dias_sem_venda": 56
  }
]
```

## Permissões

- **Acesso:** Qualquer usuário autenticado do tenant
- **Auditoria:** Log automático em `module_access_logs`
- **Dados:** Isolamento por schema (multi-tenant)

## Troubleshooting

### Erro: `42P01: missing FROM-clause entry for table "p"`

**Causa:** Função RPC com erro de referência de alias.  
**Solução:** Execute o SQL em `FIX_PRODUTOS_SEM_VENDAS.md`

### Nenhum produto retornado

1. Verificar se existem produtos ativos com estoque > 0
2. Confirmar se há dados nas tabelas `vendas` e `vendas_hoje_itens`
3. Ajustar período "Dias sem vendas"
4. Verificar filtros de filial/departamento

### Performance lenta

1. Verificar índices nas tabelas:
   - `vendas.idx_vendas_data_filial`
   - `produtos.idx_produtos_id_filial`
   - `vendas_hoje_itens.idx_vendas_hoje_itens_produto`

2. Limitar filiais específicas ao invés de "Todas"

3. Usar filtros de departamento/setor para reduzir escopo

## Melhorias Futuras

- [ ] Paginação para grandes volumes de dados
- [ ] Gráfico de distribuição por curva ABC
- [ ] Exportação para Excel
- [ ] Filtro por margem de lucro
- [ ] Sugestão de desconto/promoção baseada em dias parados
- [ ] Integração com módulo de Compras (sugestão de redução de pedido)

## Veja Também

- `docs/FILTER_PATTERN_STANDARD.md` - Padrão de filtros
- `docs/PDF_EXPORT_VENDA_CURVA.md` - Exportação PDF
- `FIX_PRODUTOS_SEM_VENDAS.md` - Correção de erros SQL
