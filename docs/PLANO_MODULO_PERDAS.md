# Plano de Desenvolvimento - Módulo de Perdas

> **Status**: 📋 Planejamento
> **Data**: 2025-11-28
> **Baseado em**: Módulo Venda por Curva

---

## 1. Visão Geral

### Objetivo
Criar um módulo de relatório de perdas por filial e período, com hierarquia de departamentos (3 níveis), similar ao módulo Venda por Curva.

### Funcionalidades
- ✅ Filtros: MultiSelect de Filiais, Mês, Ano, Busca por Produto
- ✅ Hierarquia de 3 níveis: Departamento Nível 3 → Nível 2 → Nível 1 → Produtos
- ✅ Collapsibles aninhados para expandir cada nível
- ✅ Totalizadores por nível (Quantidade e Valor)
- ✅ Paginação
- ✅ Exportação PDF
- ✅ Integração com sistema de permissões (filiais autorizadas)

### Localização no Menu
```
Sidebar:
├── Visão Geral
├── Gerencial
├── Vendas
├── Metas
├── Ruptura
├── Perdas          ← NOVO SUBMENU
│   └── Relatório de Perdas
└── Conta
```

---

## 2. Estrutura de Dados

### 2.1. Tabela Base: `{schema}.perdas`

```sql
CREATE TABLE {schema}.perdas (
  id BIGSERIAL NOT NULL,
  filial_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  motivo_perda_id INTEGER NOT NULL,
  data_perda DATE NOT NULL,
  quantidade NUMERIC(12, 3) NOT NULL,
  valor_perda NUMERIC(12, 2) NOT NULL,
  data_extracao DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT perdas_pkey PRIMARY KEY (id),
  CONSTRAINT uk_perdas_filial_produto_data_motivo UNIQUE (filial_id, produto_id, data_perda, motivo_perda_id),
  CONSTRAINT fk_motivo_perda FOREIGN KEY (motivo_perda_id) REFERENCES {schema}.motivos_perda(id)
);

-- Índices existentes
CREATE INDEX idx_perdas_data_perda ON {schema}.perdas(data_perda);
CREATE INDEX idx_perdas_filial_data ON {schema}.perdas(filial_id, data_perda);
CREATE INDEX idx_perdas_produto ON {schema}.perdas(produto_id);
```

### 2.2. Hierarquia de Departamentos

```
produtos.departamento_id → departments_level_1.departamento_id
                           ├── pai_level_2_id → departments_level_2.departamento_id
                           └── pai_level_3_id → departments_level_3.departamento_id
```

### 2.3. Estrutura de Retorno (Hierárquica)

```typescript
interface Produto {
  codigo: number
  descricao: string
  filial_id: number
  qtde: number
  valor_perda: number
}

interface DeptNivel1 {
  dept1_id: number
  dept_nivel1: string
  total_qtde: number
  total_valor: number
  produtos: Produto[]
}

interface DeptNivel2 {
  dept2_id: number
  dept_nivel2: string
  total_qtde: number
  total_valor: number
  nivel1: DeptNivel1[]
}

interface DeptNivel3 {
  dept3_id: number
  dept_nivel3: string
  total_qtde: number
  total_valor: number
  nivel2: DeptNivel2[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  hierarquia: DeptNivel3[]
}
```

---

## 3. Componentes a Criar

### 3.1. Função RPC (PostgreSQL)

**Nome**: `get_perdas_report`

**Arquivo**: `supabase/migrations/XX_create_perdas_report_function.sql`

**Parâmetros**:
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| p_schema | TEXT | ✅ | Nome do schema do tenant |
| p_mes | INTEGER | ✅ | Mês (1-12) |
| p_ano | INTEGER | ✅ | Ano (ex: 2025) |
| p_filial_id | INTEGER | ✅ | ID da filial |
| p_page | INTEGER | ✅ | Página atual |
| p_page_size | INTEGER | ✅ | Registros por página |

**Retorno**:
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| dept_nivel3 | TEXT | Nome do departamento nível 3 |
| dept_nivel2 | TEXT | Nome do departamento nível 2 |
| dept_nivel1 | TEXT | Nome do departamento nível 1 |
| produto_codigo | INTEGER | Código do produto |
| produto_descricao | TEXT | Descrição do produto |
| filial_id | INTEGER | ID da filial |
| qtde | NUMERIC | Quantidade perdida |
| valor_perda | NUMERIC | Valor da perda |

**SQL da Função**:
```sql
CREATE OR REPLACE FUNCTION public.get_perdas_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id INTEGER,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  dept_nivel3 TEXT,
  dept_nivel2 TEXT,
  dept_nivel1 TEXT,
  produto_codigo BIGINT,
  produto_descricao TEXT,
  filial_id INTEGER,
  qtde NUMERIC,
  valor_perda NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sql TEXT;
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  v_sql := format('
    SELECT
      COALESCE(d3.descricao, ''SEM DEPARTAMENTO'') as dept_nivel3,
      COALESCE(d2.descricao, ''SEM GRUPO'') as dept_nivel2,
      COALESCE(d1.descricao, ''SEM SUBGRUPO'') as dept_nivel1,
      p.id as produto_codigo,
      p.descricao as produto_descricao,
      per.filial_id::INTEGER,
      SUM(per.quantidade) as qtde,
      SUM(per.valor_perda) as valor_perda
    FROM %I.perdas per
    INNER JOIN %I.produtos p
      ON per.produto_id = p.id
      AND per.filial_id = p.filial_id
    LEFT JOIN %I.departments_level_1 d1
      ON p.departamento_id = d1.departamento_id
    LEFT JOIN %I.departments_level_2 d2
      ON d1.pai_level_2_id = d2.departamento_id
    LEFT JOIN %I.departments_level_3 d3
      ON d1.pai_level_3_id = d3.departamento_id
    WHERE per.filial_id = $1
      AND EXTRACT(MONTH FROM per.data_perda) = $2
      AND EXTRACT(YEAR FROM per.data_perda) = $3
    GROUP BY
      d3.descricao,
      d2.descricao,
      d1.descricao,
      p.id,
      p.descricao,
      per.filial_id
    ORDER BY
      d3.descricao,
      d2.descricao,
      d1.descricao,
      SUM(per.valor_perda) DESC
  ', p_schema, p_schema, p_schema, p_schema, p_schema);

  RETURN QUERY EXECUTE v_sql USING p_filial_id, p_mes, p_ano;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_perdas_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_perdas_report TO service_role;
```

### 3.2. API Route (Next.js)

**Arquivo**: `src/app/api/relatorios/perdas/route.ts`

**Responsabilidades**:
1. Validar autenticação
2. Validar permissões de filiais (usar `getUserAuthorizedBranchCodes`)
3. Validar parâmetros (schema, mes, ano, filial_id)
4. Chamar RPC `get_perdas_report` para cada filial
5. Organizar dados hierarquicamente
6. Calcular totais por nível
7. Retornar JSON estruturado

### 3.3. Página Frontend

**Arquivo**: `src/app/(dashboard)/relatorios/perdas/page.tsx`

**Componentes utilizados**:
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Button`, `Label`, `Input`, `Select`, `Badge`, `Skeleton`
- `MultiSelect` (para filiais)
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
- `Pagination`
- `PageBreadcrumb`

**Estados**:
```typescript
// Dados
const [data, setData] = useState<ReportData | null>(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

// Filtros
const [mes, setMes] = useState(currentMonth)
const [ano, setAno] = useState(currentYear)
const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{value: string, label: string}[]>([])
const [page, setPage] = useState(1)

// Expansão
const [expandedDept1, setExpandedDept1] = useState<Record<string, boolean>>({})
const [expandedDept2, setExpandedDept2] = useState<Record<string, boolean>>({})
const [expandedDept3, setExpandedDept3] = useState<Record<string, boolean>>({})

// Filtro de produto (com debounce)
const [filtroProduto, setFiltroProduto] = useState('')
const [inputValue, setInputValue] = useState('')
```

### 3.4. Atualização do Sidebar

**Arquivo**: `src/components/dashboard/app-sidebar.tsx`

**Alterações**:
1. Importar ícone `Trash2` do lucide-react
2. Adicionar array `perdasNavigation`
3. Adicionar nova seção "Perdas" no sidebar (após Ruptura, antes de Conta)
4. Adicionar filtro de navegação

```typescript
import { Trash2 } from 'lucide-react'

const perdasNavigation: NavigationItem[] = [
  {
    name: 'Relatório de Perdas',
    href: '/relatorios/perdas',
    icon: Trash2,
    moduleId: 'relatorios_perdas',
  },
]
```

### 3.5. Registro do Módulo

**Arquivo**: `src/types/modules.ts`

**Alteração**: Adicionar `'relatorios_perdas'` ao tipo `SystemModule`

---

## 4. Arquivos a Criar/Modificar

### Criar (4 arquivos):
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `supabase/migrations/XX_create_perdas_report_function.sql` | Função RPC |
| 2 | `src/app/api/relatorios/perdas/route.ts` | API Route |
| 3 | `src/app/(dashboard)/relatorios/perdas/page.tsx` | Página Frontend |
| 4 | `docs/modules/perdas/README.md` | Documentação do módulo |

### Modificar (2 arquivos):
| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `src/components/dashboard/app-sidebar.tsx` | Adicionar menu Perdas |
| 2 | `src/types/modules.ts` | Adicionar tipo `relatorios_perdas` |

---

## 5. Ordem de Implementação

### Fase 1: Backend (Banco de Dados)
1. ✅ Criar função RPC `get_perdas_report`
2. ✅ Testar função diretamente no Supabase

### Fase 2: Backend (API)
3. ✅ Criar API Route `/api/relatorios/perdas`
4. ✅ Testar API via Postman/curl

### Fase 3: Frontend
5. ✅ Criar página `/relatorios/perdas/page.tsx`
6. ✅ Testar página com dados reais

### Fase 4: Integração
7. ✅ Adicionar menu no sidebar
8. ✅ Registrar módulo em `modules.ts`
9. ✅ Testar fluxo completo

### Fase 5: Documentação
10. ✅ Criar documentação do módulo

---

## 6. Colunas da Tabela de Produtos

| Coluna | Descrição |
|--------|-----------|
| Filial | ID da filial |
| Código | `produto_id` / `p.id` |
| Descrição | `p.descricao` |
| Qtde | `SUM(per.quantidade)` |
| Valor Perda | `SUM(per.valor_perda)` |

---

## 7. Totalizadores por Nível

| Nível | Campos Totalizados |
|-------|-------------------|
| Departamento Nível 3 | `total_qtde`, `total_valor` |
| Departamento Nível 2 | `total_qtde`, `total_valor` |
| Departamento Nível 1 | `total_qtde`, `total_valor` |

---

## 8. Diferenças em Relação ao Venda por Curva

| Aspecto | Venda por Curva | Perdas |
|---------|-----------------|--------|
| Tabela base | `vendas` | `perdas` |
| Métricas | Vendas, Lucro, Margem, Curvas | Quantidade, Valor Perda |
| Colunas produto | 9 colunas | 5 colunas |
| Badges | Curva Venda/Lucro | Não tem |
| Ícone menu | ShoppingCart | Trash2 |

---

## 9. Índices Recomendados (já existentes)

```sql
-- Já criados na tabela perdas
CREATE INDEX idx_perdas_data_perda ON {schema}.perdas(data_perda);
CREATE INDEX idx_perdas_filial_data ON {schema}.perdas(filial_id, data_perda);
CREATE INDEX idx_perdas_produto ON {schema}.perdas(produto_id);
```

**Índice adicional recomendado** (para otimização):
```sql
CREATE INDEX idx_perdas_filial_mes_ano ON {schema}.perdas
  USING btree (filial_id, EXTRACT(MONTH FROM data_perda), EXTRACT(YEAR FROM data_perda));
```

---

## 10. Checklist de Validação

- [ ] Função RPC retorna dados corretamente
- [ ] API valida autenticação
- [ ] API valida permissões de filiais
- [ ] Hierarquia de 3 níveis funciona
- [ ] Totalizadores calculados corretamente
- [ ] Filtro de produto funciona (debounce 300ms)
- [ ] Paginação funciona
- [ ] Exportação PDF funciona
- [ ] Menu aparece corretamente no sidebar
- [ ] Permissões de módulo funcionam

---

## 11. Estimativa de Tempo

| Fase | Tempo Estimado |
|------|----------------|
| Função RPC | 30 min |
| API Route | 45 min |
| Página Frontend | 1h 30min |
| Sidebar + Módulo | 15 min |
| Testes | 30 min |
| Documentação | 30 min |
| **Total** | **~4 horas** |

---

**Próximo Passo**: Aprovar este plano e iniciar a implementação.
