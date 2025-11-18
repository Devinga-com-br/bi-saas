# Documentação Completa: Meta por Setor

**Data:** 2025-11-18
**Status:** ✅ Operacional
**Módulo:** Metas por Setor (`/metas/setor`)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Dados](#fluxo-de-dados)
4. [APIs](#apis)
5. [Funções RPC](#funções-rpc)
6. [Frontend](#frontend)
7. [Cálculos](#cálculos)
8. [Tabelas do Banco](#tabelas-do-banco)
9. [Troubleshooting](#troubleshooting)
10. [Histórico de Correções](#histórico-de-correções)

---

## Visão Geral

### O que é Meta por Setor?

Sistema de definição e acompanhamento de metas de vendas organizadas por **setores de negócio**. Cada setor agrupa departamentos de um nível específico da hierarquia (1-6 níveis), permitindo análise segmentada do desempenho.

### Funcionalidades Principais

- ✅ Geração automática de metas diárias baseadas em data de referência
- ✅ Atualização automática de valores realizados
- ✅ Edição inline de metas (Meta % e Valor Meta)
- ✅ Visualização agregada por data com drill-down por filial
- ✅ Filtro multi-filial avançado
- ✅ Ocultação de diferenças em dias futuros
- ✅ Recálculo automático de diferenças

---

## Arquitetura

### Stack Tecnológico

- **Frontend:** Next.js 15.5.4, React 19, TypeScript 5
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **UI:** shadcn/ui, Tailwind CSS v4

### Multi-Tenant

Cada tenant possui seu próprio schema PostgreSQL com isolamento completo de dados.

```
PostgreSQL Database
├── public/
│   ├── tenants
│   ├── user_profiles
│   └── user_authorized_branches
├── okilao/                          # Tenant 1
│   ├── setores
│   ├── metas_setor
│   ├── vendas
│   ├── produtos
│   ├── departments_level_1...6
│   ├── filiais
│   └── descontos_venda
└── [outros schemas...]
```

---

## Fluxo de Dados

### 1. Configuração Inicial

```
Usuário → /configuracoes/setores
  ↓
Criar/Editar Setor
  ↓
Definir:
  - Nome do setor
  - Nível de departamento (1-6)
  - Departamentos incluídos (IDs)
  ↓
Salvar em: {schema}.setores
```

### 2. Geração de Metas

```
Usuário → /metas/setor → "Gerar Meta"
  ↓
Escolher:
  - Setor
  - Mês/Ano
  - Data de Referência
  - Meta % padrão
  ↓
POST /api/metas/setor/generate
  ↓
RPC: generate_metas_setor()
  ↓
Cria registros em: {schema}.metas_setor
  (um por dia × filial ativa)
```

### 3. Visualização e Acompanhamento

```
Usuário → /metas/setor → Selecionar Setor/Mês/Ano
  ↓
1) POST /api/metas/setor/update-valores
   RPC: atualizar_valores_realizados_todos_setores()
   ↓
   Atualiza valor_realizado de todas as metas
   ↓
2) GET /api/metas/setor/report
   RPC: get_metas_setor_report_optimized()
   ↓
   Retorna dados agregados para exibição
   ↓
3) Renderizar tabela com:
   - Linha por data (agregada)
   - Drill-down mostrando filiais
   - Totalizadores no rodapé
```

### 4. Edição Inline

```
Usuário → Duplo clique em Meta % ou Valor Meta
  ↓
Digita novo valor → Enter
  ↓
POST /api/metas/setor/update
  ↓
RPC: update_meta_setor()
  ↓
Atualiza meta e recalcula diferenças
  ↓
Estado local atualizado
```

---

## APIs

### 1. GET `/api/metas/setor/report`

**Descrição:** Busca metas de um setor específico para um mês/ano

**Query Params:**
```typescript
{
  schema: string        // Schema do tenant (obrigatório)
  setor_id: string      // ID do setor (obrigatório)
  mes: string           // 1-12 (obrigatório)
  ano: string           // YYYY (obrigatório)
  filial_id: string     // IDs separados por vírgula (obrigatório)
}
```

**Response:**
```typescript
Array<{
  data: string           // YYYY-MM-DD
  dia_semana: number     // 0-6
  filiais: Array<{
    filial_id: number
    filial_nome: string
    valor_referencia: number
    valor_realizado: number
    meta_percentual: number
    valor_meta: number
    diferenca: number
    diferenca_percentual: number
  }>
}>
```

**RPC:** `get_metas_setor_report_optimized`

**Arquivo:** [src/app/api/metas/setor/report/route.ts](../src/app/api/metas/setor/report/route.ts)

---

### 2. POST `/api/metas/setor/generate`

**Descrição:** Gera metas diárias para um setor no mês/ano especificado

**Body:**
```typescript
{
  schema: string           // Schema do tenant
  setor_id: number         // ID do setor
  mes: number              // 1-12
  ano: number              // YYYY
  data_referencia: string  // YYYY-MM-DD
  meta_padrao: number      // Meta % padrão (ex: 10.5)
}
```

**Response:**
```typescript
{
  message: string
  data: {
    total_dias: number
    total_filiais: number
    metas_geradas: number
  }
}
```

**RPC:** `generate_metas_setor`

**Arquivo:** [src/app/api/metas/setor/generate/route.ts](../src/app/api/metas/setor/generate/route.ts)

---

### 3. POST `/api/metas/setor/update`

**Descrição:** Atualiza meta individual (percentual e valor)

**Body:**
```typescript
{
  schema: string
  setor_id: number
  filial_id: number
  data: string              // YYYY-MM-DD
  meta_percentual: number
  valor_meta: number
}
```

**Response:**
```typescript
{
  message: string
  success: boolean
  data: object
}
```

**RPC:** `update_meta_setor`

**Arquivo:** [src/app/api/metas/setor/update/route.ts](../src/app/api/metas/setor/update/route.ts)

---

### 4. POST `/api/metas/setor/update-valores`

**Descrição:** Atualiza valores realizados de TODOS os setores ativos

**Body:**
```typescript
{
  schema: string
  mes: number       // 1-12
  ano: number       // YYYY
}
```

**Response:**
```typescript
{
  success: boolean
  message: string
  data: {
    total_setores: number
    total_metas_atualizadas: number
    errors: string[]
  }
}
```

**RPC:** `atualizar_valores_realizados_todos_setores`

**Arquivo:** [src/app/api/metas/setor/update-valores/route.ts](../src/app/api/metas/setor/update-valores/route.ts)

---

### 5. GET `/api/setores`

**Descrição:** Lista todos os setores cadastrados

**Query Params:**
```typescript
{
  schema: string    // Schema do tenant (obrigatório)
}
```

**Response:**
```typescript
Array<{
  id: number
  nome: string
  departamento_nivel: number    // 1-6
  departamento_ids: string[]    // Array de IDs dos departamentos
  ativo: boolean
  created_at: string
  updated_at: string
}>
```

**Arquivo:** [src/app/api/setores/route.ts](../src/app/api/setores/route.ts)

---

## Funções RPC

### 1. `atualizar_valores_realizados_todos_setores`

**Descrição:** Itera por todos os setores ativos e atualiza seus valores realizados

**Assinatura:**
```sql
atualizar_valores_realizados_todos_setores(
  p_schema TEXT,
  p_mes INT,
  p_ano INT
) RETURNS JSONB
```

**Lógica:**
1. Busca todos os setores ativos do schema
2. Para cada setor, chama `atualizar_valores_realizados_metas_setor`
3. Agrega resultados e retorna totalizadores

**Retorno:**
```json
{
  "success": true,
  "message": "Processados 4 setores, 600 metas atualizadas",
  "total_setores": 4,
  "total_metas_atualizadas": 600,
  "errors": []
}
```

**SQL:**
```sql
CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_todos_setores(
  p_schema TEXT,
  p_mes INT,
  p_ano INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setor RECORD;
  v_result JSONB;
  v_total_rows INT := 0;
  v_total_setores INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Itera setores ativos
  FOR v_setor IN
    EXECUTE format('SELECT id, nome FROM %I.setores WHERE ativo = true ORDER BY id', p_schema)
  LOOP
    BEGIN
      -- Chama função de atualização com 5 parâmetros
      SELECT public.atualizar_valores_realizados_metas_setor(
        p_schema,      -- 1º parâmetro
        v_setor.id,    -- 2º parâmetro (p_setor_id)
        p_mes,         -- 3º parâmetro
        p_ano,         -- 4º parâmetro
        NULL           -- 5º parâmetro (p_filial_id = NULL = todas)
      ) INTO v_result;

      v_total_rows := v_total_rows + COALESCE((v_result->>'rows_updated')::INT, 0);
      v_total_setores := v_total_setores + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, format('Setor %s: %s', v_setor.nome, SQLERRM));
    END;
  END LOOP;

  -- Retorna resultado agregado
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Processados %s setores, %s metas atualizadas', v_total_setores, v_total_rows),
    'total_setores', v_total_setores,
    'total_metas_atualizadas', v_total_rows,
    'errors', v_errors
  );
END;
$$;
```

---

### 2. `atualizar_valores_realizados_metas_setor`

**Descrição:** Atualiza valores realizados de um setor específico baseado em vendas

**Assinatura:**
```sql
atualizar_valores_realizados_metas_setor(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL
) RETURNS JSONB
```

**Parâmetros:**
- `p_schema`: Schema do tenant
- `p_setor_id`: ID do setor a atualizar
- `p_mes`: Mês (1-12)
- `p_ano`: Ano (YYYY)
- `p_filial_id`: (Opcional) Filial específica. Se NULL, atualiza todas

**Lógica Detalhada:**

1. **Buscar configuração do setor:**
```sql
SELECT departamento_nivel, departamento_ids
FROM {schema}.setores
WHERE id = p_setor_id
```

2. **Construir nome da coluna dinamicamente:**
```sql
v_coluna_pai := format('pai_level_%s_id', v_departamento_nivel)
-- Exemplo: se departamento_nivel = 3, coluna = 'pai_level_3_id'
```

3. **Atualizar metas com JOIN complexo:**
```sql
UPDATE {schema}.metas_setor ms
SET
  valor_realizado = COALESCE(vendas_subquery.total_vendas, 0),
  diferenca = COALESCE(vendas_subquery.total_vendas, 0) - ms.valor_meta,
  diferenca_percentual = CASE
    WHEN ms.valor_meta > 0 THEN
      ((COALESCE(vendas_subquery.total_vendas, 0) / ms.valor_meta) - 1) * 100
    ELSE 0
  END,
  updated_at = NOW()
FROM (
  -- Subquery: agregar vendas por data e filial
  SELECT
    v.data_venda,
    v.filial_id,
    SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas
  FROM {schema}.vendas v
  INNER JOIN {schema}.produtos p
    ON p.id = v.id_produto
    AND p.filial_id = v.filial_id
  INNER JOIN {schema}.departments_level_1 dl1
    ON dl1.departamento_id = p.departamento_id
    -- JOIN DINÂMICO: usa coluna construída
    AND dl1.{v_coluna_pai} = ANY({v_departamento_ids})
  LEFT JOIN {schema}.descontos_venda d
    ON d.data_desconto = v.data_venda
    AND d.filial_id = v.filial_id
  WHERE
    EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND (p_filial_id IS NULL OR v.filial_id = p_filial_id)
  GROUP BY v.data_venda, v.filial_id
) AS vendas_subquery
WHERE
  ms.setor_id = p_setor_id
  AND ms.data = vendas_subquery.data_venda
  AND ms.filial_id = vendas_subquery.filial_id
```

**Estrutura do JOIN:**

```
vendas (v)
  ↓ [id_produto, filial_id]
produtos (p)
  ↓ [departamento_id]
departments_level_1 (dl1)
  ↓ [pai_level_X_id] ← Coluna dinâmica!
  ↓ [filtro: IN (departamento_ids do setor)]
Agrega: SUM(valor_vendas) - SUM(descontos)
  ↓
Atualiza: metas_setor.valor_realizado
```

**Exemplo Prático:**

```sql
-- Setor: "Eletrônicos"
-- Configuração:
departamento_nivel = 3
departamento_ids = ['50', '51', '52']

-- Coluna construída:
v_coluna_pai = 'pai_level_3_id'

-- JOIN efetivo:
INNER JOIN departments_level_1 dl1
  ON dl1.departamento_id = p.departamento_id
  AND dl1.pai_level_3_id IN (50, 51, 52)

-- Busca vendas de produtos cujo level 1 pertence
-- a departamentos de level 3 = 50, 51 ou 52
```

**Retorno:**
```json
{
  "rows_updated": 150,
  "setor_id": 1,
  "mes": 11,
  "ano": 2025
}
```

**SQL Completo:**
```sql
CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas_setor(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_departamento_nivel INT;
  v_departamento_ids TEXT[];
  v_coluna_pai TEXT;
  v_sql TEXT;
  v_rows_updated INT;
BEGIN
  -- 1. Buscar configuração do setor
  EXECUTE format('
    SELECT departamento_nivel, departamento_ids
    FROM %I.setores
    WHERE id = $1
  ', p_schema)
  INTO v_departamento_nivel, v_departamento_ids
  USING p_setor_id;

  IF v_departamento_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Setor não encontrado'
    );
  END IF;

  -- 2. Construir nome da coluna pai dinamicamente
  v_coluna_pai := format('pai_level_%s_id', v_departamento_nivel);

  -- 3. Atualizar valores realizados
  v_sql := format('
    UPDATE %I.metas_setor ms
    SET
      valor_realizado = COALESCE(vendas_subquery.total_vendas, 0),
      diferenca = COALESCE(vendas_subquery.total_vendas, 0) - ms.valor_meta,
      diferenca_percentual = CASE
        WHEN ms.valor_meta > 0 THEN
          ((COALESCE(vendas_subquery.total_vendas, 0) / ms.valor_meta) - 1) * 100
        ELSE 0
      END,
      updated_at = NOW()
    FROM (
      SELECT
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas
      FROM %I.vendas v
      INNER JOIN %I.produtos p
        ON p.id = v.id_produto
        AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.departamento_id = p.departamento_id
        AND dl1.%I = ANY($1)
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE
        EXTRACT(MONTH FROM v.data_venda) = $2
        AND EXTRACT(YEAR FROM v.data_venda) = $3
        AND ($4 IS NULL OR v.filial_id = $4)
      GROUP BY v.data_venda, v.filial_id
    ) AS vendas_subquery
    WHERE
      ms.setor_id = $5
      AND ms.data = vendas_subquery.data_venda
      AND ms.filial_id = vendas_subquery.filial_id
  ',
    p_schema, -- UPDATE table
    p_schema, -- FROM vendas
    p_schema, -- JOIN produtos
    p_schema, -- JOIN departments_level_1
    v_coluna_pai, -- coluna pai dinâmica
    p_schema  -- LEFT JOIN descontos_venda
  );

  EXECUTE v_sql
  USING v_departamento_ids, p_mes, p_ano, p_filial_id, p_setor_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'rows_updated', v_rows_updated,
    'setor_id', p_setor_id,
    'mes', p_mes,
    'ano', p_ano
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', true,
    'message', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
```

---

### 3. `get_metas_setor_report_optimized`

**Descrição:** Busca metas de um setor com dados agregados (somente leitura)

**Assinatura:**
```sql
get_metas_setor_report_optimized(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_ids BIGINT[]
) RETURNS TABLE(...)
```

**Retorno:** Registros com agregações já calculadas

**Nota:** Esta função **NÃO atualiza** valores realizados, apenas lê.

---

### 4. `generate_metas_setor`

**Descrição:** Gera metas diárias para um setor

**Assinatura:**
```sql
generate_metas_setor(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_data_referencia DATE,
  p_meta_padrao NUMERIC
) RETURNS TABLE(...)
```

**Lógica:**
1. Busca vendas da data de referência por filial
2. Gera um registro de meta para cada dia do mês × filial ativa
3. Calcula valor_meta = valor_referencia × (1 + meta_padrao/100)

---

### 5. `update_meta_setor`

**Descrição:** Atualiza meta individual

**Assinatura:**
```sql
update_meta_setor(
  p_schema TEXT,
  p_setor_id INTEGER,
  p_filial_id INTEGER,
  p_data DATE,
  p_meta_percentual NUMERIC,
  p_valor_meta NUMERIC
) RETURNS JSON
```

**Lógica:**
```sql
UPDATE {schema}.metas_setor
SET
  meta_percentual = p_meta_percentual,
  valor_meta = p_valor_meta,
  diferenca = valor_realizado - p_valor_meta,
  diferenca_percentual = CASE
    WHEN p_valor_meta > 0 THEN
      ((valor_realizado / p_valor_meta) - 1) * 100
    ELSE 0
  END,
  updated_at = NOW()
WHERE
  setor_id = p_setor_id
  AND filial_id = p_filial_id
  AND data = p_data
```

---

## Frontend

### Arquivo Principal

**Caminho:** [src/app/(dashboard)/metas/setor/page.tsx](../src/app/(dashboard)/metas/setor/page.tsx)

### Estados Principais

```typescript
const [setorId, setSetorId] = useState('')
const [mes, setMes] = useState(currentMonth)
const [ano, setAno] = useState(currentYear)
const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])
const [metasData, setMetasData] = useState<Record<string, MetaSetorDia[]>>({})
const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Edição inline
const [editingCell, setEditingCell] = useState<{
  data: string
  filialId: number
  field: 'percentual' | 'valor'
} | null>(null)
const [editingValue, setEditingValue] = useState<string>('')
const [savingEdit, setSavingEdit] = useState(false)
```

### Fluxo de Busca

```typescript
const buscarMetas = async () => {
  try {
    setLoading(true)
    setError(null)

    // 1. Atualizar valores realizados ANTES de buscar
    await atualizarValoresRealizados()

    // 2. Buscar metas
    const params = new URLSearchParams({
      schema: currentTenant.supabase_schema,
      setor_id: setorId,
      mes: mes.toString(),
      ano: ano.toString(),
      filial_id: filialIds.join(',')
    })

    const response = await fetch(`/api/metas/setor/report?${params}`)
    const data = await response.json()

    // 3. Agrupar por data
    const grouped = data.reduce((acc, item) => {
      if (!acc[setorIdNum]) acc[setorIdNum] = []

      const existingDay = acc[setorIdNum].find(d => d.data === item.data)

      if (existingDay) {
        existingDay.filiais = item.filiais
      } else {
        acc[setorIdNum].push(item)
      }

      return acc
    }, {} as Record<string, MetaSetorDia[]>)

    setMetasData(grouped)
  } catch (err) {
    setError('Erro ao buscar metas')
  } finally {
    setLoading(false)
  }
}
```

### Edição Inline

```typescript
// Iniciar edição
const startEditing = (
  data: string,
  filialId: number,
  field: 'percentual' | 'valor',
  currentValue: number
) => {
  setEditingCell({ data, filialId, field })
  setEditingValue(currentValue.toFixed(2))
}

// Salvar edição
const saveEdit = async () => {
  if (!editingCell) return

  const newValue = parseFloat(editingValue)
  if (isNaN(newValue)) {
    alert('Valor inválido')
    return
  }

  setSavingEdit(true)

  try {
    // Encontrar dados da meta atual
    const { data, filialId, field } = editingCell
    const setorIdNum = parseInt(setorId)
    const metasDia = metasData[setorIdNum]?.find(m => m.data === data)
    const filial = metasDia?.filiais.find(f => f.filial_id === filialId)

    if (!filial) return

    // Calcular novos valores baseado no campo editado
    let novoPercentual = filial.meta_percentual
    let novoValorMeta = filial.valor_meta

    if (field === 'percentual') {
      novoPercentual = newValue
      novoValorMeta = filial.valor_referencia * (1 + newValue / 100)
    } else {
      novoValorMeta = newValue
      novoPercentual = filial.valor_referencia > 0
        ? ((newValue / filial.valor_referencia) - 1) * 100
        : 0
    }

    // Chamar API
    const response = await fetch('/api/metas/setor/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: currentTenant.supabase_schema,
        setor_id: setorIdNum,
        filial_id: filialId,
        data: data,
        meta_percentual: novoPercentual,
        valor_meta: novoValorMeta
      })
    })

    if (!response.ok) throw new Error('Erro ao atualizar meta')

    // Atualizar estado local
    setMetasData(prev => {
      const updated = { ...prev }
      const setorMetas = [...(updated[setorIdNum] || [])]
      const diaIndex = setorMetas.findIndex(m => m.data === data)

      if (diaIndex >= 0) {
        const filialIndex = setorMetas[diaIndex].filiais.findIndex(
          f => f.filial_id === filialId
        )

        if (filialIndex >= 0) {
          const filialAtualizada = {
            ...setorMetas[diaIndex].filiais[filialIndex],
            meta_percentual: novoPercentual,
            valor_meta: novoValorMeta,
            diferenca: filial.valor_realizado - novoValorMeta,
            diferenca_percentual: novoValorMeta > 0
              ? ((filial.valor_realizado / novoValorMeta) - 1) * 100
              : 0
          }

          setorMetas[diaIndex].filiais[filialIndex] = filialAtualizada
        }
      }

      updated[setorIdNum] = setorMetas
      return updated
    })

    // Limpar edição
    setEditingCell(null)
    setEditingValue('')
  } catch (error) {
    alert('Erro ao salvar alteração')
  } finally {
    setSavingEdit(false)
  }
}

// Cancelar edição
const cancelEditing = () => {
  setEditingCell(null)
  setEditingValue('')
}

// Atalhos de teclado
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    saveEdit()
  } else if (e.key === 'Escape') {
    cancelEditing()
  }
}
```

### Renderização de Células Editáveis

```tsx
// Célula de Meta %
<TableCell className="text-center">
  {isEditing && editingCell.field === 'percentual' ? (
    <Input
      type="number"
      step="0.01"
      value={editingValue}
      onChange={(e) => setEditingValue(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={savingEdit}
      className="w-24 text-center"
      autoFocus
    />
  ) : (
    <div
      className="cursor-pointer hover:bg-muted rounded px-2 py-1 relative group"
      onDoubleClick={() => startEditing(data, filial.filial_id, 'percentual', filial.meta_percentual)}
      title="Duplo clique para editar"
    >
      {formatarPercentual(filial.meta_percentual)}
      <Pencil className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
    </div>
  )}
</TableCell>
```

### Ocultar Diferença em Dias Futuros

```typescript
// Verificar se é hoje ou futuro
const isTodayOrFuture = (dateString: string): boolean => {
  const date = parseISO(dateString)
  const today = startOfDay(new Date())
  return date >= today
}

// Verificar se deve mostrar diferença
const shouldShowDifference = (data: string, valorRealizado: number): boolean => {
  if (!isTodayOrFuture(data)) return true  // Passado: sempre mostra
  return valorRealizado > 0  // Hoje/Futuro: só se tiver vendas
}

// Renderização condicional
{shouldShowDifference(filial.data, filial.valor_realizado) ? (
  <span className={filial.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}>
    {formatarMoeda(filial.diferenca)}
  </span>
) : (
  <span className="text-muted-foreground">-</span>
)}
```

---

## Cálculos

### 1. Valor Meta

**Fórmula:**
```
Valor Meta = Valor Referência × (1 + Meta % ÷ 100)
```

**Exemplo:**
```
Valor Referência: R$ 10.000,00
Meta %: 15,50%

Valor Meta = 10.000 × (1 + 15,50 ÷ 100)
           = 10.000 × 1,155
           = R$ 11.550,00
```

---

### 2. Meta % (reverso)

**Fórmula:**
```
Meta % = ((Valor Meta ÷ Valor Referência) - 1) × 100
```

**Exemplo:**
```
Valor Referência: R$ 10.000,00
Valor Meta: R$ 12.000,00

Meta % = ((12.000 ÷ 10.000) - 1) × 100
       = (1,2 - 1) × 100
       = 0,2 × 100
       = 20,00%
```

---

### 3. Diferença

**Fórmula:**
```
Diferença = Valor Realizado - Valor Meta
```

**Exemplo:**
```
Valor Realizado: R$ 13.000,00
Valor Meta: R$ 11.550,00

Diferença = 13.000 - 11.550
          = R$ 1.450,00 (positivo = bateu meta)
```

---

### 4. Diferença %

**Fórmula:**
```
Diferença % = ((Valor Realizado ÷ Valor Meta) - 1) × 100
```

**Exemplos:**

**Bateu meta:**
```
Valor Realizado: R$ 13.000,00
Valor Meta: R$ 11.550,00

Diferença % = ((13.000 ÷ 11.550) - 1) × 100
            = (1,1255 - 1) × 100
            = 12,55%
```

**Não bateu meta:**
```
Valor Realizado: R$ 9.000,00
Valor Meta: R$ 11.550,00

Diferença % = ((9.000 ÷ 11.550) - 1) × 100
            = (0,7792 - 1) × 100
            = -22,08%
```

---

### 5. Valor Realizado

**Fórmula:**
```
Valor Realizado = SUM(vendas.valor_vendas) - SUM(descontos_venda.valor_desconto)
```

**Agregação:** Por data + filial, filtrado por departamentos do setor

**Critérios:**
- Produto deve pertencer a departamento incluído no setor
- Correlação via `departments_level_1.pai_level_X_id`
- X = nível configurado no setor

---

## Tabelas do Banco

### 1. `setores`

**Descrição:** Configuração de setores de negócio

**Colunas:**
```sql
CREATE TABLE {schema}.setores (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  departamento_nivel INT NOT NULL CHECK (departamento_nivel BETWEEN 1 AND 6),
  departamento_ids TEXT[] NOT NULL,  -- Array de IDs dos departamentos
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemplo de registro:**
```json
{
  "id": 1,
  "nome": "Eletrônicos",
  "departamento_nivel": 3,
  "departamento_ids": ["50", "51", "52"],
  "ativo": true
}
```

**Interpretação:**
- Setor agrupa vendas de produtos cujos departamentos de nível 1 pertencem aos departamentos de nível 3: 50, 51 ou 52

---

### 2. `metas_setor`

**Descrição:** Metas diárias por setor e filial

**Colunas:**
```sql
CREATE TABLE {schema}.metas_setor (
  id BIGSERIAL PRIMARY KEY,
  setor_id BIGINT NOT NULL REFERENCES {schema}.setores(id),
  filial_id BIGINT NOT NULL REFERENCES {schema}.filiais(id),
  data DATE NOT NULL,
  valor_referencia NUMERIC(15,2) DEFAULT 0,
  valor_realizado NUMERIC(15,2) DEFAULT 0,
  meta_percentual NUMERIC(5,2) DEFAULT 0,
  valor_meta NUMERIC(15,2) DEFAULT 0,
  diferenca NUMERIC(15,2) DEFAULT 0,
  diferenca_percentual NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(setor_id, filial_id, data)
);
```

**Índices:**
```sql
CREATE INDEX idx_metas_setor_report_query
  ON {schema}.metas_setor(setor_id, data, filial_id)
  WHERE setor_id IS NOT NULL;

CREATE INDEX idx_metas_setor_month_year
  ON {schema}.metas_setor(
    (EXTRACT(MONTH FROM data)),
    (EXTRACT(YEAR FROM data)),
    setor_id
  );
```

**Exemplo de registro:**
```json
{
  "id": 1234,
  "setor_id": 1,
  "filial_id": 10,
  "data": "2025-11-01",
  "valor_referencia": 10000.00,
  "valor_realizado": 13000.00,
  "meta_percentual": 15.50,
  "valor_meta": 11550.00,
  "diferenca": 1450.00,
  "diferenca_percentual": 12.55
}
```

---

### 3. `vendas`

**Descrição:** Vendas diárias por produto

**Colunas Relevantes:**
```sql
CREATE TABLE {schema}.vendas (
  id BIGSERIAL PRIMARY KEY,
  filial_id BIGINT NOT NULL,
  id_produto BIGINT NOT NULL,  -- ⚠️ Nome real da coluna
  data_venda DATE NOT NULL,
  valor_vendas NUMERIC(15,2) NOT NULL,
  quantidade NUMERIC(10,2),
  ...
);
```

**Nota:** A coluna é `id_produto`, não `produto_id`

---

### 4. `produtos`

**Descrição:** Cadastro de produtos

**Colunas Relevantes:**
```sql
CREATE TABLE {schema}.produtos (
  id BIGSERIAL PRIMARY KEY,
  filial_id BIGINT NOT NULL,
  departamento_id BIGINT,  -- Referência para departments_level_1
  nome VARCHAR(255),
  ...
);
```

---

### 5. `departments_level_1`

**Descrição:** Hierarquia de departamentos (nível 1)

**Colunas:**
```sql
CREATE TABLE {schema}.departments_level_1 (
  id BIGSERIAL PRIMARY KEY,
  departamento_id BIGINT,
  departamento_nome VARCHAR(255),
  pai_level_2_id BIGINT,      -- Departamento pai nível 2
  pai_level_2_nome VARCHAR(255),
  pai_level_3_id BIGINT,      -- Departamento pai nível 3
  pai_level_3_nome VARCHAR(255),
  pai_level_4_id BIGINT,      -- Departamento pai nível 4
  pai_level_4_nome VARCHAR(255),
  pai_level_5_id BIGINT,      -- Departamento pai nível 5
  pai_level_5_nome VARCHAR(255),
  pai_level_6_id BIGINT,      -- Departamento pai nível 6
  pai_level_6_nome VARCHAR(255),
  ...
);
```

**Exemplo de registro:**
```json
{
  "departamento_id": 1001,
  "departamento_nome": "Notebooks",
  "pai_level_2_id": 100,
  "pai_level_2_nome": "Informática",
  "pai_level_3_id": 50,
  "pai_level_3_nome": "Eletrônicos",
  "pai_level_4_id": null,
  "pai_level_5_id": null,
  "pai_level_6_id": null
}
```

**Interpretação:**
- Notebooks (nível 1) → Informática (nível 2) → Eletrônicos (nível 3)

---

### 6. `descontos_venda`

**Descrição:** Descontos aplicados nas vendas

**Colunas Relevantes:**
```sql
CREATE TABLE {schema}.descontos_venda (
  id BIGSERIAL PRIMARY KEY,
  filial_id BIGINT NOT NULL,
  data_desconto DATE NOT NULL,
  valor_desconto NUMERIC(15,2) NOT NULL,
  ...
);
```

**Agregação:** Por data e filial (não por produto individual)

---

## Troubleshooting

### ❌ Erro: `vendas.produto_id does not exist`

**Causa:** Coluna incorreta no JOIN

**Solução:** Usar `vendas.id_produto` (não `produto_id`)

**Código correto:**
```sql
INNER JOIN {schema}.produtos p
  ON p.id = v.id_produto
  AND p.filial_id = v.filial_id
```

---

### ❌ Erro: `function atualizar_valores_realizados_metas_setor(text, bigint, integer, integer) does not exist`

**Causa:** Assinatura de função incorreta ou múltiplas versões

**Diagnóstico:**
```sql
SELECT
  proname,
  pronargs,
  proargtypes::regtype[]
FROM pg_proc
WHERE proname = 'atualizar_valores_realizados_metas_setor';
```

**Solução:**
1. Dropar versão antiga (3 parâmetros):
```sql
DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_metas_setor(text, integer, integer);
```

2. Manter versão correta (5 parâmetros):
```sql
-- Função com 5 parâmetros (ver seção de RPCs)
```

3. Corrigir chamada:
```sql
SELECT public.atualizar_valores_realizados_metas_setor(
  p_schema,      -- 1º
  v_setor.id,    -- 2º
  p_mes,         -- 3º
  p_ano,         -- 4º
  NULL           -- 5º
) INTO v_result;
```

---

### ❌ Valores não atualizam

**Verificações:**

1. **Função foi criada?**
```sql
SELECT proname
FROM pg_proc
WHERE proname = 'atualizar_valores_realizados_todos_setores';
```

2. **Setor está ativo?**
```sql
SELECT * FROM {schema}.setores WHERE id = X;
-- Verificar: ativo = true
```

3. **Departamentos configurados?**
```sql
SELECT departamento_nivel, departamento_ids
FROM {schema}.setores
WHERE id = X;
-- Verificar: arrays não vazios
```

4. **Existem vendas no período?**
```sql
SELECT COUNT(*), SUM(valor_vendas)
FROM {schema}.vendas
WHERE EXTRACT(MONTH FROM data_venda) = X
  AND EXTRACT(YEAR FROM data_venda) = Y;
```

5. **Produtos têm departamento?**
```sql
SELECT COUNT(*)
FROM {schema}.produtos
WHERE departamento_id IS NULL;
-- Deve ser 0 ou baixo
```

6. **Correlação departments_level_1 existe?**
```sql
SELECT COUNT(*)
FROM {schema}.departments_level_1
WHERE pai_level_3_id = ANY(ARRAY[50, 51, 52]);
-- Ajustar nível conforme setor
```

7. **Testar função diretamente:**
```sql
SELECT public.atualizar_valores_realizados_metas_setor(
  'seu_schema',
  1,        -- setor_id
  11,       -- mes
  2025,     -- ano
  NULL      -- todas filiais
);
```

---

### ❌ Erro ao gerar metas

**Sintomas:**
- Botão "Gerar Meta" não responde
- Erro 500 na API

**Verificações:**

1. **Data de referência tem vendas?**
```sql
SELECT filial_id, SUM(valor_vendas)
FROM {schema}.vendas
WHERE data_venda = 'YYYY-MM-DD'
GROUP BY filial_id;
```

2. **Metas já existem?**
```sql
SELECT COUNT(*)
FROM {schema}.metas_setor
WHERE setor_id = X
  AND EXTRACT(MONTH FROM data) = Y
  AND EXTRACT(YEAR FROM data) = Z;
-- Se > 0, já foram geradas
```

3. **Função generate_metas_setor existe?**
```sql
SELECT proname
FROM pg_proc
WHERE proname = 'generate_metas_setor';
```

---

### ❌ Edição inline não funciona

**Verificações:**

1. **Função update_meta_setor existe?**
```sql
SELECT proname
FROM pg_proc
WHERE proname = 'update_meta_setor';
```

2. **Registro existe no banco?**
```sql
SELECT *
FROM {schema}.metas_setor
WHERE setor_id = X
  AND filial_id = Y
  AND data = 'YYYY-MM-DD';
```

3. **Permissões do usuário:**
```sql
-- Verificar role no user_profiles
SELECT role FROM public.user_profiles WHERE id = 'user_id';
-- Deve ser: admin ou superadmin
```

4. **Console do navegador:**
```
F12 → Console → Network
Verificar resposta do POST /api/metas/setor/update
```

---

## Histórico de Correções

### 2025-11-18: Correção da Atualização de Valores

**Problema:** Valores realizados não eram atualizados

**Causa Raiz:** Conflito de assinaturas de função RPC

**Correção:**
1. Identificadas 2 versões da função `atualizar_valores_realizados_metas_setor`:
   - Versão antiga: 3 parâmetros (p_schema, p_mes, p_ano)
   - Versão nova: 5 parâmetros (p_schema, p_setor_id, p_mes, p_ano, p_filial_id)

2. Dropada versão antiga:
```sql
DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_metas_setor(text, integer, integer);
```

3. Corrigida função chamadora `atualizar_valores_realizados_todos_setores` para usar 5 parâmetros explicitamente

**Resultado:** 600 metas atualizadas com sucesso

**Teste:**
```sql
SELECT public.atualizar_valores_realizados_todos_setores('okilao', 11, 2025);

-- Retorno:
{
  "success": true,
  "message": "Processados 4 setores, 600 metas atualizadas",
  "total_setores": 4,
  "total_metas_atualizadas": 600
}
```

---

### 2025-11-04: Implementação de Edição Inline

**Feature:** Editar Meta % e Valor Meta diretamente na tabela

**Implementado:**
- Duplo clique para editar
- Recálculo automático do campo dependente
- Atualização de diferenças
- Atalhos de teclado (Enter/ESC)
- Indicadores visuais (cursor, hover, ícone)

**Referência:** [FEATURE_INLINE_EDIT_META_SETOR.md](./FEATURE_INLINE_EDIT_META_SETOR.md)

---

### 2025-11-XX: Otimização de Performance

**Feature:** Reduzir timeouts no relatório

**Implementado:**
- Função `get_metas_setor_report_optimized` com array de filiais
- Índices compostos otimizados
- Uma única chamada RPC em vez de N chamadas

**Referência:** [OTIMIZACAO_METAS_SETOR.md](./OTIMIZACAO_METAS_SETOR.md)

---

## Checklist de Setup para Novo Tenant

- [ ] Criar schema: `CREATE SCHEMA nome_tenant;`
- [ ] Executar migrations de tabelas
- [ ] Criar tabela `setores`
- [ ] Criar tabela `metas_setor` com índices
- [ ] Garantir tabelas: `vendas`, `produtos`, `filiais`
- [ ] Garantir tabela `departments_level_1` com colunas pai_level_X_id
- [ ] Criar tabela `descontos_venda` (opcional)
- [ ] Executar função `atualizar_valores_realizados_todos_setores` (ver SQL acima)
- [ ] Executar função `atualizar_valores_realizados_metas_setor` (ver SQL acima)
- [ ] Executar função `get_metas_setor_report_optimized`
- [ ] Executar função `generate_metas_setor`
- [ ] Executar função `update_meta_setor`
- [ ] Adicionar schema em "Exposed schemas" no Supabase
- [ ] Configurar permissões: `GRANT USAGE ON SCHEMA`
- [ ] Testar criação de setor via UI
- [ ] Testar geração de metas
- [ ] Testar atualização de valores
- [ ] Testar edição inline

---

## Contatos e Suporte

**Documentação Relacionada:**
- [FEATURE_INLINE_EDIT_META_SETOR.md](./FEATURE_INLINE_EDIT_META_SETOR.md)
- [OTIMIZACAO_METAS_SETOR.md](./OTIMIZACAO_METAS_SETOR.md)
- [SUPABASE_SCHEMA_CONFIGURATION.md](./SUPABASE_SCHEMA_CONFIGURATION.md)
- [CLAUDE.md](../CLAUDE.md)

**Equipe:** DevIngá Team
**Última atualização:** 2025-11-18
