# Padrões de Documentação de Módulos

Este documento define os padrões, estrutura e boas práticas para documentação de módulos do BI SaaS Dashboard.

## Índice

1. [Estrutura de Diretórios](#estrutura-de-diretórios)
2. [Arquivos Obrigatórios](#arquivos-obrigatórios)
3. [Padrões de Nomenclatura](#padrões-de-nomenclatura)
4. [Estrutura de Cada Arquivo](#estrutura-de-cada-arquivo)
5. [Exemplos de Referência](#exemplos-de-referência)
6. [Prompt para IA](#prompt-para-ia)

---

## Estrutura de Diretórios

Cada módulo deve ter sua própria pasta dentro de `docs/modules/`:

```
docs/
├── modules/
│   ├── nome-do-modulo/
│   │   ├── README.md                    # Visão geral do módulo
│   │   ├── BUSINESS_RULES.md            # Regras de negócio detalhadas
│   │   ├── DATA_STRUCTURES.md           # Estruturas de dados e tipos
│   │   ├── INTEGRATION_FLOW.md          # Fluxo de integração completo
│   │   ├── RPC_FUNCTIONS.md             # Documentação das funções RPC
│   │   ├── RPC_FUNCTIONS_UPDATED.md     # Adendos e correções (opcional)
│   │   ├── CHANGELOG_FUNCTIONS.md       # Histórico de alterações
│   │   └── [outros arquivos específicos]
│   └── outro-modulo/
└── DOCUMENTATION_STANDARDS.md           # Este arquivo
```

---

## Arquivos Obrigatórios

### 1. README.md
**Propósito**: Visão geral do módulo, funcionalidades principais e índice.

**Conteúdo mínimo**:
- Título e descrição do módulo
- Funcionalidades principais
- Componentes envolvidos
- Índice com links para outros arquivos
- Status de implementação
- Acesso rápido (links para rotas, arquivos principais)

### 2. BUSINESS_RULES.md
**Propósito**: Regras de negócio detalhadas e lógica do módulo.

**Conteúdo mínimo**:
- Regras numeradas (ex: RN-001, RN-002)
- Descrição clara de cada regra
- Exemplos práticos
- Casos especiais e exceções
- Validações e cálculos

### 3. DATA_STRUCTURES.md
**Propósito**: Estruturas de dados, tipos TypeScript e interfaces.

**Conteúdo mínimo**:
- Tipos TypeScript com comentários
- Estruturas de resposta das APIs
- Estruturas hierárquicas
- Exemplos de dados reais
- Relacionamentos entre estruturas

### 4. INTEGRATION_FLOW.md
**Propósito**: Fluxo completo de integração do módulo.

**Conteúdo mínimo**:
- Diagrama de fluxo (ASCII ou Mermaid)
- Sequência de chamadas
- Frontend → API → RPC → Database
- Transformações de dados
- Estados e loading

### 5. RPC_FUNCTIONS.md
**Propósito**: Documentação completa das funções RPC do Supabase.

**Conteúdo mínimo**:
- Assinatura SQL de cada função
- Descrição detalhada
- Parâmetros (tipo, obrigatório, exemplo)
- Retorno (estrutura completa)
- Exemplos de uso
- Índices recomendados
- Observações importantes

### 6. CHANGELOG_FUNCTIONS.md
**Propósito**: Histórico de alterações, correções e novas features.

**Conteúdo mínimo**:
- Data da alteração
- Versão
- Descrição da mudança
- Arquivos modificados (com referências de linha)
- Impacto (baixo, médio, alto)
- Regras de negócio adicionadas/alteradas
- Exemplos visuais (quando aplicável)

---

## Padrões de Nomenclatura

### Arquivos
- Usar SCREAMING_SNAKE_CASE para arquivos de documentação: `BUSINESS_RULES.md`
- Usar kebab-case para nomes de pastas: `dre-gerencial`, `metas-setor`

### Regras de Negócio
- Formato: `RN-[CATEGORIA]-[NUMERO]`
- Exemplos:
  - `RN-CALC-001`: Regra de cálculo
  - `RN-VAL-001`: Regra de validação
  - `RN-RB-001`: Regra específica (ex: Receita Bruta)
  - `RN-HIER-001`: Regra de hierarquia

### Versões
- Formato semântico: `MAJOR.MINOR.PATCH`
- Exemplos:
  - `1.0.0`: Versão inicial
  - `1.1.0`: Nova feature (backward compatible)
  - `1.0.1`: Bug fix
  - `2.0.0`: Breaking change

### Datas
- Formato: `YYYY-MM-DD`
- Exemplo: `2025-01-11`

---

## Estrutura de Cada Arquivo

### README.md

```markdown
# [Nome do Módulo]

> Status: ✅ Implementado | 🚧 Em Desenvolvimento | 📋 Planejado

## Visão Geral

[Descrição breve do que o módulo faz]

## Funcionalidades

- ✅ [Funcionalidade 1]
- ✅ [Funcionalidade 2]
- 🚧 [Funcionalidade em desenvolvimento]

## Componentes Principais

### Frontend
- **Página Principal**: [caminho/para/page.tsx](../../src/app/.../page.tsx)
- **Componentes**: [descrição]
- **Hooks**: [descrição]

### Backend
- **API Routes**: [caminho/para/route.ts](../../src/app/api/.../route.ts)
- **RPC Functions**: [lista de funções]

### Database
- **Tabelas**: [lista de tabelas]
- **Views**: [lista de views]

## Acesso Rápido

- 🔗 **Rota**: `/caminho/do/modulo`
- 📄 **Regras de Negócio**: [BUSINESS_RULES.md](./BUSINESS_RULES.md)
- 🗂️ **Estruturas de Dados**: [DATA_STRUCTURES.md](./DATA_STRUCTURES.md)
- 🔄 **Fluxo de Integração**: [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md)
- ⚙️ **Funções RPC**: [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)
- 📝 **Changelog**: [CHANGELOG_FUNCTIONS.md](./CHANGELOG_FUNCTIONS.md)

## Permissões

| Role | Acesso |
|------|--------|
| superadmin | ✅ Total |
| admin | ✅ Leitura/Escrita |
| user | ✅ Leitura/Escrita |
| viewer | 👁️ Somente Leitura |

## Dependências

- [Dependência 1]: [descrição]
- [Dependência 2]: [descrição]

## Versão

**Versão Atual**: 1.0.0
**Última Atualização**: 2025-01-11
```

---

### BUSINESS_RULES.md

```markdown
# Regras de Negócio - [Nome do Módulo]

Este documento contém todas as regras de negócio do módulo [Nome].

## Índice

1. [Regras de Cálculo](#regras-de-cálculo)
2. [Regras de Validação](#regras-de-validação)
3. [Regras de Hierarquia](#regras-de-hierarquia)
4. [Regras de Exibição](#regras-de-exibição)

---

## Regras de Cálculo

### RN-CALC-001: [Nome da Regra]

**Descrição**: [Descrição detalhada]

**Fórmula**:
```
[fórmula matemática]
```

**Exemplo**:
```
Entrada: valor_a = 100, valor_b = 50
Saída: resultado = 150
```

**Implementação**: [arquivo.ts:linha](../../src/caminho/arquivo.ts#L123)

**Observações**:
- [Observação 1]
- [Observação 2]

---

### RN-CALC-002: [Outra Regra]

[...]

---

## Regras de Validação

### RN-VAL-001: [Nome da Validação]

**Descrição**: [Descrição]

**Condição**:
```typescript
if (condicao) {
  // ação
}
```

**Mensagem de Erro**: "[Mensagem]"

**Implementação**: [arquivo.ts:linha](../../src/caminho/arquivo.ts#L456)

---

## Regras de Hierarquia

### RN-HIER-001: [Estrutura Hierárquica]

**Descrição**: [Descrição]

**Níveis**:
1. Nível 1: [descrição]
2. Nível 2: [descrição]
3. Nível 3: [descrição]

**Exemplo Visual**:
```
Nível 1
├── Nível 2a
│   ├── Nível 3a
│   └── Nível 3b
└── Nível 2b
    └── Nível 3c
```

---

## Regras de Exibição

### RN-EXB-001: [Formatação de Valores]

**Descrição**: [Como valores são exibidos]

**Formato**: [formato]

**Exemplos**:
- Entrada: `1000.50` → Saída: `R$ 1.000,50`
- Entrada: `0.1234` → Saída: `12,34%`

---

## Regras Específicas do Módulo

[Seção para regras específicas não cobertas acima]

---

**Última Atualização**: 2025-01-11
**Versão**: 1.0.0
```

---

### DATA_STRUCTURES.md

```markdown
# Estruturas de Dados - [Nome do Módulo]

Este documento contém todas as estruturas de dados, tipos TypeScript e interfaces utilizadas.

## Índice

1. [Tipos Principais](#tipos-principais)
2. [Interfaces de API](#interfaces-de-api)
3. [Estruturas Hierárquicas](#estruturas-hierárquicas)
4. [Tipos de Resposta RPC](#tipos-de-resposta-rpc)

---

## Tipos Principais

### `TipoPrincipal`

**Descrição**: [Descrição do tipo]

**Definição**:
```typescript
export type TipoPrincipal = {
  id: string                      // Identificador único
  descricao: string               // Descrição do item
  valor: number                   // Valor numérico
  data: string                    // Data no formato ISO 8601
  opcional?: string               // Campo opcional
  filiais: number[]               // Array de IDs de filiais
}
```

**Exemplo**:
```typescript
const exemplo: TipoPrincipal = {
  id: "tipo_123",
  descricao: "Exemplo de tipo",
  valor: 1500.00,
  data: "2025-01-11T10:30:00Z",
  filiais: [1, 2, 3]
}
```

**Uso**: [Onde é utilizado]

---

### `TipoSecundario`

[...]

---

## Interfaces de API

### `RequestFiltros`

**Descrição**: Parâmetros de filtro enviados para API

**Definição**:
```typescript
export interface RequestFiltros {
  schema: string                  // Schema do tenant
  data_inicio: string             // Data inicial (YYYY-MM-DD)
  data_fim: string                // Data final (YYYY-MM-DD)
  filiais_ids?: number[]          // IDs das filiais (opcional)
}
```

**Exemplo de Requisição**:
```typescript
const filtros: RequestFiltros = {
  schema: "okilao",
  data_inicio: "2025-01-01",
  data_fim: "2025-01-31",
  filiais_ids: [1, 4, 7]
}

fetch(`/api/modulo?${new URLSearchParams(filtros)}`)
```

---

### `ResponseDados`

**Descrição**: Estrutura de resposta da API

**Definição**:
```typescript
export interface ResponseDados {
  totalizador: Totalizador
  detalhes: Detalhe[]
  filiais: number[]
}

interface Totalizador {
  valorTotal: number
  quantidade: number
}

interface Detalhe {
  id: number
  descricao: string
  valores_filiais: Record<number, number>
}
```

**Exemplo de Resposta**:
```json
{
  "totalizador": {
    "valorTotal": 10000.00,
    "quantidade": 150
  },
  "detalhes": [
    {
      "id": 1,
      "descricao": "Item 1",
      "valores_filiais": {
        "1": 5000.00,
        "2": 5000.00
      }
    }
  ],
  "filiais": [1, 2]
}
```

---

## Estruturas Hierárquicas

### Hierarquia de [Nome]

**Descrição**: Estrutura hierárquica de N níveis

**Tipo Base**:
```typescript
export type ItemHierarquico = {
  id: string
  tipo: 'nivel1' | 'nivel2' | 'nivel3'
  descricao: string
  total: number
  percentual: number
  valores_filiais: Record<number, number>
  subRows?: ItemHierarquico[]    // Recursivo
}
```

**Exemplo Hierárquico**:
```typescript
const hierarquia: ItemHierarquico = {
  id: "total",
  tipo: "nivel1",
  descricao: "TOTAL",
  total: 10000,
  percentual: 100,
  valores_filiais: { 1: 5000, 2: 5000 },
  subRows: [
    {
      id: "cat_1",
      tipo: "nivel2",
      descricao: "Categoria 1",
      total: 7000,
      percentual: 70,
      valores_filiais: { 1: 3500, 2: 3500 },
      subRows: [
        {
          id: "item_1",
          tipo: "nivel3",
          descricao: "Item 1",
          total: 3500,
          percentual: 35,
          valores_filiais: { 1: 1750, 2: 1750 }
        }
      ]
    }
  ]
}
```

---

## Tipos de Resposta RPC

### `RPC_FunctionName`

**Descrição**: Retorno da função `function_name` do Supabase

**Tipo**:
```typescript
export type RPC_FunctionName = {
  campo1: number
  campo2: string
  campo3: Date
  campo4: { nested: string }
}
```

**Exemplo**:
```typescript
const resultado: RPC_FunctionName = {
  campo1: 100,
  campo2: "texto",
  campo3: new Date("2025-01-11"),
  campo4: { nested: "valor" }
}
```

---

## Mapeamentos e Enums

### `StatusEnum`

```typescript
export enum Status {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
  PENDENTE = 'pendente'
}
```

### Mapeamento de Cores

```typescript
export const CORES_STATUS: Record<Status, string> = {
  [Status.ATIVO]: 'text-green-600',
  [Status.INATIVO]: 'text-gray-600',
  [Status.PENDENTE]: 'text-yellow-600'
}
```

---

**Última Atualização**: 2025-01-11
**Versão**: 1.0.0
```

---

### INTEGRATION_FLOW.md

```markdown
# Fluxo de Integração - [Nome do Módulo]

Este documento descreve o fluxo completo de integração do módulo.

## Visão Geral

```
Frontend (React) → API Route (Next.js) → RPC Function (PostgreSQL) → Database
       ↓                    ↓                        ↓                     ↓
   [page.tsx]         [route.ts]              [function.sql]         [tables]
```

---

## 1. Frontend - Página Principal

**Arquivo**: [src/app/(dashboard)/modulo/page.tsx](../../src/app/(dashboard)/modulo/page.tsx)

### 1.1. Montagem do Componente

```typescript
// Ao carregar a página
useEffect(() => {
  // 1. Verificar tenant atual
  if (!currentTenant) return

  // 2. Carregar dados iniciais
  loadInitialData()
}, [currentTenant])
```

### 1.2. Interação do Usuário

```typescript
// Quando usuário aplica filtros
const handleAplicarFiltros = async () => {
  setLoading(true)

  try {
    // 1. Validar filtros
    if (!validarFiltros()) {
      toast.error("Filtros inválidos")
      return
    }

    // 2. Montar parâmetros
    const params = construirParametros()

    // 3. Chamar API
    const response = await fetch(`/api/modulo?${params}`)
    const data = await response.json()

    // 4. Processar resposta
    setDados(processarDados(data))

  } catch (error) {
    console.error(error)
    toast.error("Erro ao carregar dados")
  } finally {
    setLoading(false)
  }
}
```

### 1.3. Renderização

```typescript
// Transformar dados para exibição
const dadosTabela = useMemo(() => {
  return transformarParaTabela(dados)
}, [dados])
```

---

## 2. API Route - Backend

**Arquivo**: [src/app/api/modulo/route.ts](../../src/app/api/modulo/route.ts)

### 2.1. Recebimento da Requisição

```typescript
export async function GET(request: Request) {
  try {
    // 1. Criar cliente Supabase
    const supabase = await createClient()

    // 2. Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 3. Extrair parâmetros
    const { searchParams } = new URL(request.url)
    const schema = searchParams.get('schema')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')

    // 4. Validar parâmetros
    if (!schema || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
```

### 2.2. Chamada à Função RPC

```typescript
    // 5. Chamar função RPC
    const { data, error } = await (supabase.rpc as any)('nome_funcao_rpc', {
      p_schema: schema,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
      p_filiais_ids: filiaisIds
    })

    // 6. Tratar erros
    if (error) {
      console.error('RPC Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
```

### 2.3. Processamento e Resposta

```typescript
    // 7. Processar dados
    const dadosProcessados = processarDadosBackend(data)

    // 8. Retornar resposta
    return NextResponse.json(dadosProcessados)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 3. Função RPC - PostgreSQL

**Arquivo**: Função criada no Supabase

### 3.1. Declaração de Variáveis

```sql
CREATE OR REPLACE FUNCTION public.nome_funcao_rpc(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids INTEGER[]
)
RETURNS TABLE (
  campo1 INTEGER,
  campo2 TEXT,
  campo3 NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sql TEXT;
  v_filter TEXT := '';
BEGIN
```

### 3.2. Construção de Query Dinâmica

```sql
  -- Construir filtro de filiais
  IF p_filiais_ids IS NOT NULL THEN
    v_filter := format('AND filial_id = ANY(%L)', p_filiais_ids);
  END IF;

  -- Construir query principal
  v_sql := format('
    SELECT
      col1,
      col2,
      col3
    FROM %I.tabela
    WHERE data BETWEEN $1 AND $2
    %s
    ORDER BY col1
  ', p_schema, v_filter);
```

### 3.3. Execução e Retorno

```sql
  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_data_inicio, p_data_fim;
END;
$$;
```

---

## 4. Database - Tabelas

### Tabelas Utilizadas

```sql
-- Tabela principal
{schema}.tabela_principal (
  id INTEGER PRIMARY KEY,
  descricao TEXT,
  valor NUMERIC,
  filial_id INTEGER,
  data DATE
)

-- Tabela relacionada
{schema}.tabela_relacionada (
  id INTEGER PRIMARY KEY,
  tabela_principal_id INTEGER REFERENCES {schema}.tabela_principal(id),
  campo TEXT
)
```

### Índices Necessários

```sql
-- Índice para performance
CREATE INDEX idx_tabela_filial_data
ON {schema}.tabela_principal(filial_id, data);

CREATE INDEX idx_tabela_relacionada_fk
ON {schema}.tabela_relacionada(tabela_principal_id);
```

---

## 5. Fluxo de Dados Completo

### Diagrama de Sequência

```
Usuário          Frontend          API Route         RPC Function      Database
  |                 |                   |                   |               |
  |--[Aplica filtros]->|                |                   |               |
  |                 |                   |                   |               |
  |                 |--[GET /api/modulo]-->|                 |               |
  |                 |                   |                   |               |
  |                 |                   |--[Valida auth]--->|               |
  |                 |                   |                   |               |
  |                 |                   |--[rpc('function')]-->|            |
  |                 |                   |                   |               |
  |                 |                   |                   |--[SELECT]--->|
  |                 |                   |                   |               |
  |                 |                   |                   |<--[rows]-----|
  |                 |                   |                   |               |
  |                 |                   |<--[data]----------|               |
  |                 |                   |                   |               |
  |                 |<--[JSON response]--|                  |               |
  |                 |                   |                   |               |
  |<--[Renderiza]---|                   |                   |               |
  |                 |                   |                   |               |
```

### Transformações de Dados

1. **Frontend → API**:
   ```typescript
   // Filtros do usuário
   { mes: 1, ano: 2025, filiais: [1,2] }

   // ↓ Transformação

   // Query string
   "?schema=okilao&data_inicio=2025-01-01&data_fim=2025-01-31&filiais_ids=1,2"
   ```

2. **API → RPC**:
   ```typescript
   // Parâmetros da API
   {
     schema: "okilao",
     data_inicio: "2025-01-01",
     data_fim: "2025-01-31",
     filiais_ids: [1, 2]
   }

   // ↓ Chamada RPC

   // Parâmetros PostgreSQL
   supabase.rpc('function', {
     p_schema: 'okilao',
     p_data_inicio: '2025-01-01',
     p_data_fim: '2025-01-31',
     p_filiais_ids: [1, 2]
   })
   ```

3. **RPC → Frontend**:
   ```typescript
   // Resultado do banco
   [
     { campo1: 1, campo2: 'A', campo3: 100 },
     { campo1: 2, campo2: 'B', campo3: 200 }
   ]

   // ↓ Processamento

   // Estrutura hierárquica
   {
     total: 300,
     itens: [
       { id: 1, label: 'A', valor: 100, percentual: 33.33 },
       { id: 2, label: 'B', valor: 200, percentual: 66.67 }
     ]
   }
   ```

---

## 6. Estados e Loading

### Estados do Componente

```typescript
// Estados principais
const [loading, setLoading] = useState(false)
const [dados, setDados] = useState<DadosType | null>(null)
const [error, setError] = useState<string | null>(null)

// Estados de filtros
const [filtros, setFiltros] = useState<FiltrosType>({
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),
  filiais: []
})
```

### Ciclo de Loading

```
Estado Inicial (loading: false, dados: null)
         ↓
[Usuário aplica filtros]
         ↓
setLoading(true)
         ↓
Chamada à API
         ↓
Aguardando resposta...
         ↓
    [Sucesso]           [Erro]
         ↓                 ↓
  setDados(data)      setError(msg)
         ↓                 ↓
  setLoading(false)   setLoading(false)
         ↓                 ↓
  Renderiza dados    Exibe mensagem
```

---

## 7. Tratamento de Erros

### Níveis de Erro

1. **Frontend**:
   ```typescript
   try {
     // operação
   } catch (error) {
     console.error('Frontend error:', error)
     toast.error('Erro ao processar dados')
   }
   ```

2. **API Route**:
   ```typescript
   if (error) {
     console.error('RPC Error:', error)
     return NextResponse.json(
       { error: error.message },
       { status: 500 }
     )
   }
   ```

3. **RPC Function**:
   ```sql
   BEGIN
     -- operações
   EXCEPTION WHEN OTHERS THEN
     RAISE EXCEPTION 'Error: %', SQLERRM;
   END;
   ```

---

## 8. Performance e Otimização

### Caching

```typescript
// Cache de dados por X minutos
const CACHE_TIME = 5 * 60 * 1000 // 5 minutos
const cache = new Map<string, { data: any, timestamp: number }>()

const getCachedData = (key: string) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
    return cached.data
  }
  return null
}
```

### Debounce

```typescript
// Debounce para filtros
const debouncedFetch = useMemo(
  () => debounce(fetchData, 500),
  []
)
```

### Lazy Loading

```typescript
// Import dinâmico de componentes pesados
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

---

**Última Atualização**: 2025-01-11
**Versão**: 1.0.0
```

---

### RPC_FUNCTIONS.md

```markdown
# Funções RPC - [Nome do Módulo]

Este documento contém a documentação completa de todas as funções RPC (Remote Procedure Call) do Supabase utilizadas pelo módulo.

## Índice

1. [Função: nome_funcao_1](#função-nome_funcao_1)
2. [Função: nome_funcao_2](#função-nome_funcao_2)

---

## Função: nome_funcao_1

### Descrição

[Descrição detalhada do que a função faz]

### Assinatura

```sql
CREATE OR REPLACE FUNCTION public.nome_funcao_1(
  p_schema TEXT,              -- Nome do schema do tenant
  p_param1 INTEGER,           -- Descrição do parâmetro 1
  p_param2 DATE,              -- Descrição do parâmetro 2
  p_param3 TEXT[] DEFAULT NULL -- Descrição do parâmetro 3 (opcional)
)
RETURNS TABLE (
  col1 INTEGER,               -- Descrição da coluna 1
  col2 TEXT,                  -- Descrição da coluna 2
  col3 NUMERIC,               -- Descrição da coluna 3
  col4 JSONB                  -- Descrição da coluna 4
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_filter TEXT := '';
BEGIN
  -- Construir filtro condicional
  IF p_param3 IS NOT NULL THEN
    v_filter := format('AND campo = ANY(%L)', p_param3);
  END IF;

  -- Construir query principal
  v_sql := format('
    SELECT
      t1.id as col1,
      t1.descricao as col2,
      t1.valor as col3,
      jsonb_agg(t2.*) as col4
    FROM %I.tabela1 t1
    LEFT JOIN %I.tabela2 t2 ON t1.id = t2.tabela1_id
    WHERE t1.data = $1
      AND t1.status = $2
      %s
    GROUP BY t1.id, t1.descricao, t1.valor
    ORDER BY t1.descricao
  ', p_schema, p_schema, v_filter);

  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_param1, p_param2;
END;
$$;
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `p_schema` | TEXT | ✅ | Nome do schema do tenant | `'okilao'` |
| `p_param1` | INTEGER | ✅ | ID do registro | `123` |
| `p_param2` | DATE | ✅ | Data de referência | `'2025-01-11'` |
| `p_param3` | TEXT[] | ❌ (default: NULL) | Array de filtros adicionais | `ARRAY['A','B']` ou `NULL` |

**Observações**:
- Se `p_param3` = `NULL`, retorna todos os registros
- `p_schema` deve existir e estar exposto no Supabase

### Retorno

**Tipo**: TABLE (conjunto de registros)

**Colunas**:

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `col1` | INTEGER | Identificador único | `123` |
| `col2` | TEXT | Descrição do item | `'Item Exemplo'` |
| `col3` | NUMERIC | Valor monetário | `1500.00` |
| `col4` | JSONB | Dados agregados em JSON | `[{"key": "value"}]` |

### Exemplo de Retorno

```json
[
  {
    "col1": 123,
    "col2": "Item Exemplo",
    "col3": 1500.00,
    "col4": [
      { "id": 1, "campo": "valor1" },
      { "id": 2, "campo": "valor2" }
    ]
  },
  {
    "col1": 456,
    "col2": "Outro Item",
    "col3": 2000.00,
    "col4": []
  }
]
```

### Uso no Código

**API Route**: [src/app/api/modulo/route.ts](../../src/app/api/modulo/route.ts)

```typescript
// Chamada da função RPC
const { data, error } = await (supabase.rpc as any)('nome_funcao_1', {
  p_schema: schema,
  p_param1: 123,
  p_param2: '2025-01-11',
  p_param3: ['A', 'B'] // ou null
})

if (error) {
  console.error('RPC Error:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}

return NextResponse.json(data)
```

**Frontend**: [src/app/(dashboard)/modulo/page.tsx](../../src/app/(dashboard)/modulo/page.tsx)

```typescript
// Chamada à API
const response = await fetch(`/api/modulo?${params}`)
const data = await response.json()
```

### Índices Recomendados

Para performance otimizada, criar os seguintes índices:

```sql
-- Índice composto para WHERE clause
CREATE INDEX idx_tabela1_data_status
ON {schema}.tabela1(data, status);

-- Índice para JOIN
CREATE INDEX idx_tabela2_fk
ON {schema}.tabela2(tabela1_id);

-- Índice para ordenação
CREATE INDEX idx_tabela1_descricao
ON {schema}.tabela1(descricao);
```

### Tabelas Utilizadas

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| `{schema}.tabela1` | Tabela principal | `id`, `descricao`, `valor`, `data`, `status` |
| `{schema}.tabela2` | Tabela relacionada | `id`, `tabela1_id`, `campo` |

### Performance

**Tempo médio de execução**: ~200ms (1000 registros)

**Otimizações aplicadas**:
- Uso de índices compostos
- JOINs otimizados
- Agregação eficiente com `jsonb_agg`

**Limitações**:
- Máximo de 10.000 registros retornados
- Timeout de 30 segundos (limite do Supabase)

### Observações Importantes

⚠️ **ATENÇÃO**:
- Sempre validar que o schema existe antes de chamar
- Parâmetros de data devem estar no formato `YYYY-MM-DD`
- Array vazio `[]` é diferente de `NULL`

**Casos Especiais**:
- Se não houver dados, retorna array vazio `[]`
- Se houver erro de schema, retorna erro PGRST106
- Se parâmetros inválidos, retorna erro 400

---

## Função: nome_funcao_2

[Mesma estrutura da função anterior]

---

**Última Atualização**: 2025-01-11
**Versão**: 1.0.0
```

---

### CHANGELOG_FUNCTIONS.md

```markdown
# Changelog - [Nome do Módulo]

Este documento registra todas as alterações, correções e novas features implementadas no módulo.

## Índice

- [2025-01-11 - Feature: Nova Funcionalidade](#2025-01-11---feature-nova-funcionalidade)
- [2025-01-10 - Fix: Correção de Bug](#2025-01-10---fix-correção-de-bug)

---

## 2025-01-11 - Feature: Nova Funcionalidade

### Alteração Implementada

**Feature**: [Nome da feature]

**Descrição**:
[Descrição detalhada do que foi implementado]

**Arquivos Modificados**:

1. **[arquivo1.tsx](../../src/caminho/arquivo1.tsx)**
   - Adicionado função `novaFuncao()` (linha 123)
   - Modificado componente `Componente` (linhas 45-67)
   - Removido código legado (linhas 80-85)

2. **[arquivo2.ts](../../src/caminho/arquivo2.ts)**
   - Adicionado tipo `NovoTipo` (linha 15)
   - Atualizado interface `Interface` (linha 30)

3. **[route.ts](../../src/app/api/modulo/route.ts)**
   - Adicionado endpoint POST (linhas 100-150)
   - Modificado validação de parâmetros (linha 45)

**Visual/Exemplo**:
```
[Exemplo visual, se aplicável]
```

**Regras de Negócio**:
- RN-XXX-001: [Nova regra adicionada]
- RN-XXX-002: [Outra regra]

**Impacto**: ✅ BAIXO | ⚠️ MÉDIO | 🔴 ALTO

**Detalhamento do Impacto**:
- [Descrição do impacto]
- [Mudanças necessárias]
- [Compatibilidade]

**Breaking Changes**: ✅ Não | ❌ Sim

[Se sim, descrever o que quebra e como migrar]

**Versão**: 1.1.0

---

## 2025-01-10 - Fix: Correção de Bug

### Bug Corrigido

**Problema**: [Descrição do bug]

**Causa**: [Causa raiz do problema]

**Solução**: [Como foi resolvido]

**Arquivos Modificados**:

1. **[arquivo.tsx](../../src/caminho/arquivo.tsx)**
   - Corrigido cálculo em `funcao()` (linha 234)
   - Adicionado tratamento de erro (linhas 240-245)

**Antes**:
```typescript
// Código com bug
const resultado = valor / 0 // Division by zero
```

**Depois**:
```typescript
// Código corrigido
const resultado = valor > 0 ? valor / divisor : 0
```

**Testes Realizados**:
- ✅ Teste 1: [Descrição]
- ✅ Teste 2: [Descrição]

**Impacto**: ✅ BAIXO

**Versão**: 1.0.1

---

## Template para Novas Entradas

```markdown
## YYYY-MM-DD - [Tipo]: [Título]

### [Seção Principal]

**[Campo]**: [Valor]

**Arquivos Modificados**:

1. **[arquivo.tsx](../../src/caminho/arquivo.tsx)**
   - [Modificação] (linha X)

**Impacto**: [BAIXO/MÉDIO/ALTO]

**Versão**: X.Y.Z
```

---

**Última Atualização**: 2025-01-11
**Versão Atual**: 1.1.0
```

---

## Exemplos de Referência

### Módulo Completo: DRE Gerencial

Referência completa de documentação bem estruturada:

- **README**: [docs/modules/dre-gerencial/README.md](./modules/dre-gerencial/README.md)
- **Regras de Negócio**: [docs/modules/dre-gerencial/BUSINESS_RULES.md](./modules/dre-gerencial/BUSINESS_RULES.md)
- **Estruturas de Dados**: [docs/modules/dre-gerencial/DATA_STRUCTURES.md](./modules/dre-gerencial/DATA_STRUCTURES.md)
- **Fluxo de Integração**: [docs/modules/dre-gerencial/INTEGRATION_FLOW.md](./modules/dre-gerencial/INTEGRATION_FLOW.md)
- **Funções RPC**: [docs/modules/dre-gerencial/RPC_FUNCTIONS.md](./modules/dre-gerencial/RPC_FUNCTIONS.md)
- **Changelog**: [docs/modules/dre-gerencial/CHANGELOG_FUNCTIONS.md](./modules/dre-gerencial/CHANGELOG_FUNCTIONS.md)

---

## Prompt para IA

Ao solicitar documentação de um novo módulo, use o seguinte prompt:

```
Crie a documentação completa para o módulo [NOME_DO_MODULO] seguindo os padrões definidos em docs/DOCUMENTATION_STANDARDS.md.

O módulo possui as seguintes características:
- Funcionalidade: [DESCRIÇÃO]
- Componentes: [LISTA]
- APIs: [LISTA]
- RPC Functions: [LISTA]

Crie os seguintes arquivos seguindo EXATAMENTE a estrutura e padrões do módulo de referência (dre-gerencial):

1. README.md - Visão geral completa
2. BUSINESS_RULES.md - Todas as regras de negócio numeradas
3. DATA_STRUCTURES.md - Tipos TypeScript e estruturas
4. INTEGRATION_FLOW.md - Fluxo completo de integração
5. RPC_FUNCTIONS.md - Documentação de todas as funções RPC
6. CHANGELOG_FUNCTIONS.md - Histórico inicial (versão 1.0.0)

IMPORTANTE:
- Seguir nomenclatura padrão (RN-XXX-001)
- Incluir exemplos práticos
- Referenciar arquivos com links relativos
- Incluir diagramas de fluxo
- Documentar tipos TypeScript completamente
- Incluir SQL das funções RPC
- Adicionar índices recomendados
- Documentar impacto e versões
```

---

## Checklist de Documentação

Ao documentar um novo módulo, verificar:

### README.md
- [ ] Título e descrição clara
- [ ] Status de implementação
- [ ] Lista de funcionalidades
- [ ] Componentes principais listados
- [ ] Links para todos os outros arquivos
- [ ] Tabela de permissões
- [ ] Versão e data de atualização

### BUSINESS_RULES.md
- [ ] Regras numeradas (RN-XXX-001)
- [ ] Descrição clara de cada regra
- [ ] Exemplos práticos
- [ ] Referências de implementação
- [ ] Seções organizadas por tipo

### DATA_STRUCTURES.md
- [ ] Todos os tipos TypeScript documentados
- [ ] Comentários em cada campo
- [ ] Exemplos de dados reais
- [ ] Estruturas hierárquicas explicadas
- [ ] Interfaces de API completas

### INTEGRATION_FLOW.md
- [ ] Diagrama de fluxo
- [ ] Sequência completa de chamadas
- [ ] Código de exemplo em cada etapa
- [ ] Transformações de dados
- [ ] Estados e loading
- [ ] Tratamento de erros

### RPC_FUNCTIONS.md
- [ ] Assinatura SQL completa
- [ ] Todos os parâmetros documentados
- [ ] Estrutura de retorno
- [ ] Exemplos de uso
- [ ] Índices recomendados
- [ ] Observações importantes

### CHANGELOG_FUNCTIONS.md
- [ ] Data de cada alteração
- [ ] Versão semântica
- [ ] Arquivos modificados com linhas
- [ ] Descrição do impacto
- [ ] Exemplos visuais (se aplicável)
- [ ] Regras de negócio afetadas

---

## Manutenção da Documentação

### Quando Atualizar

Atualizar a documentação sempre que:
1. Nova feature for implementada
2. Bug for corrigido
3. Regra de negócio for alterada
4. Função RPC for modificada
5. Estrutura de dados mudar
6. Fluxo de integração for alterado

### Como Atualizar

1. Identificar arquivo(s) afetado(s)
2. Adicionar entrada no CHANGELOG_FUNCTIONS.md
3. Atualizar seções específicas nos arquivos relevantes
4. Incrementar versão apropriadamente (semver)
5. Atualizar data de "Última Atualização"
6. Revisar links e referências

### Versionamento

Seguir [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): Nova feature (backward compatible)
- **PATCH** (0.0.X): Bug fix

---

## Ferramentas Recomendadas

### Validação de Links

```bash
# Verificar links quebrados na documentação
npm install -g markdown-link-check
markdown-link-check docs/**/*.md
```

### Formatação

```bash
# Formatar arquivos markdown
npm install -g prettier
prettier --write "docs/**/*.md"
```

### Diagramas

- **ASCII Diagrams**: Use [asciiflow.com](https://asciiflow.com/)
- **Mermaid**: Use sintaxe Mermaid para diagramas de fluxo

---

**Data de Criação**: 2025-01-11
**Versão**: 1.0.0
**Autor**: Documentação Técnica
**Referência**: Baseado no módulo DRE Gerencial
