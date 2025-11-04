# Módulo de Metas - Overview Completo

**Data:** 2025-11-04
**Versão:** 1.0

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Meta Mensal](#meta-mensal)
3. [Meta por Setor](#meta-por-setor)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Fluxo de Dados](#fluxo-de-dados)
6. [Banco de Dados](#banco-de-dados)
7. [APIs](#apis)
8. [Componentes UI](#componentes-ui)

---

## 📊 Visão Geral

O módulo de Metas permite criar e acompanhar metas de vendas de duas formas:
- **Meta Mensal**: Metas gerais por filial para o mês todo
- **Meta por Setor**: Metas específicas por setor/departamento

### Conceitos Principais

**Data de Referência:**
- Define qual dia do ano anterior será usado como base
- Ex: 15/01/2024 → será a referência para 15/01/2025

**Meta Percentual:**
- Percentual de crescimento/decrescimento sobre a referência
- Ex: 10% → meta = valor_referência * 1.10
- Ex: -5% → meta = valor_referência * 0.95

**Valor Realizado:**
- Vendas reais do dia (atualizado automaticamente)
- Comparado com a meta para calcular diferença

---

## 🎯 Meta Mensal

### Localização
`/metas/mensal`

### Funcionalidades

#### 1. Geração de Metas
**Formulário:**
- ✅ Mês/Ano da meta
- ✅ Filial (único)
- ✅ Data de Referência (calendário)
- ✅ Meta Percentual (%)

**Processo:**
1. Seleciona mês/ano desejado
2. Escolhe UMA filial
3. Define data de referência do ano anterior
4. Define percentual de crescimento
5. Sistema gera meta para TODOS os dias do mês
6. Cada dia usa o mesmo dia de semana da referência

**Exemplo:**
```
Mês: Janeiro/2025
Filial: São Luiz
Data Referência: 15/01/2024 (Segunda)
Meta: 10%

Sistema gera:
- 01/01/2025 (Quarta) → Ref: 03/01/2024 (Quarta) + 10%
- 02/01/2025 (Quinta) → Ref: 04/01/2024 (Quinta) + 10%
- ...
- 31/01/2025 (Sexta) → Ref: 02/02/2024 (Sexta) + 10%
```

#### 2. Visualização de Metas

**Filtros:**
- Mês/Ano
- Múltiplas filiais (Multi-select)

**Tabela Principal:**
```
Data       | Dia Semana | Meta       | Realizado  | Diferença  | %
-----------|------------|------------|------------|------------|------
01/01/2025 | Quarta     | R$ 10.000  | R$ 11.500  | +R$ 1.500  | +15%
02/01/2025 | Quinta     | R$ 12.000  | R$ 10.800  | -R$ 1.200  | -10%
```

**Agrupamento por Data:**
- Expandir/Colapsar dias
- Quando expandido: mostra detalhes por filial
- Totalizadores: Realizado, Meta, Diferença, %

**Cores:**
- 🟢 Verde: Superou a meta (diferença positiva)
- 🔴 Vermelho: Abaixo da meta (diferença negativa)

#### 3. Edição de Metas

**Edição Inline:**
- Duplo clique na célula "Meta"
- Input aparece no lugar
- Enter ou blur: salva
- ESC: cancela

**API de Update:**
- `POST /api/metas/update`
- Atualiza `valor_meta` e recalcula diferenças

### Estados do Componente

```typescript
interface Meta {
  id: number
  filial_id: number
  data: string                    // Data da meta (YYYY-MM-DD)
  dia_semana: string              // Dia da semana
  meta_percentual: number         // Percentual aplicado
  data_referencia: string         // Data usada como base
  valor_referencia: number        // Venda da data referência
  valor_meta: number              // Meta calculada
  valor_realizado: number         // Venda real do dia
  diferenca: number               // realizado - meta
  diferenca_percentual: number    // (diferenca / meta) * 100
}

interface MetasReport {
  metas: Meta[]
  total_realizado: number
  total_meta: number
  percentual_atingido: number
}
```

---

## 🏢 Meta por Setor

### Localização
`/metas/setor`

### Funcionalidades

#### 1. Geração de Metas

**Formulário:**
- ✅ Múltiplos setores (Multi-select)
- ✅ Mês/Ano
- ✅ Múltiplas filiais (Multi-select)
- ✅ Data de Referência
- ✅ Meta Percentual

**Diferença vs Meta Mensal:**
- Permite selecionar VÁRIOS setores de uma vez
- Permite selecionar VÁRIAS filiais de uma vez
- Gera todas as combinações (Setor x Filial x Dia)

**Exemplo:**
```
Setores: [Mercearia, Açougue]
Filiais: [São Luiz, Okilao]
Mês: Janeiro/2025
Ref: 15/01/2024
Meta: 10%

Gera:
- Mercearia + São Luiz + 31 dias
- Mercearia + Okilao + 31 dias
- Açougue + São Luiz + 31 dias
- Açougue + Okilao + 31 dias
Total: 124 registros
```

**Progress Bar:**
- Mostra progresso da geração
- Ex: "Gerando 2 de 4 setores..."

#### 2. Visualização de Metas

**Filtros:**
- Setor (único)
- Mês/Ano
- Múltiplas filiais

**Visualização:**
- Agrupada por DATA
- Expandir/Colapsar
- Mostra todas as filiais selecionadas por data

**Tabela Expandida:**
```
📅 01/01/2025 (Quarta)
   Filial        | Ref          | Meta      | Real      | Dif
   São Luiz      | R$ 5.000     | R$ 5.500  | R$ 6.000  | +R$ 500
   Okilao        | R$ 3.000     | R$ 3.300  | R$ 3.100  | -R$ 200
```

### Estados do Componente

```typescript
interface Setor {
  id: number
  nome: string
  nivel: number
  departamento_ids: number[]      // Departamentos vinculados
}

interface MetaSetor {
  data: string
  dia_semana: string
  filiais: {
    filial_id: number
    data_referencia: string
    dia_semana_ref: string
    valor_referencia: number
    meta_percentual: number
    valor_meta: number
    valor_realizado: number
    diferenca: number
    diferenca_percentual: number
  }[]
}
```

---

## 📁 Estrutura de Arquivos

### Frontend - Páginas

```
src/app/(dashboard)/metas/
├── page.tsx                    # Landing page (redireciona)
├── mensal/
│   └── page.tsx               # Meta Mensal (principal)
└── setor/
    └── page.tsx               # Meta por Setor
```

### APIs

```
src/app/api/metas/
├── generate/
│   └── route.ts               # POST - Gera metas mensais
├── report/
│   └── route.ts               # GET - Relatório metas mensais
├── update/
│   └── route.ts               # POST - Atualiza valor meta
└── setor/
    ├── generate/
    │   └── route.ts           # POST - Gera metas por setor
    └── report/
        └── route.ts           # GET - Relatório metas por setor
```

### SQL Functions

```
Arquivos na raiz do projeto:
├── APPLY_DISCOUNT_METAS_GENERATE.sql    # Função generate_metas_mensais
├── APPLY_DISCOUNT_METAS_REPORT.sql      # Função get_metas_report
└── CHECK_METAS_FUNCTIONS.sql            # Queries de verificação
```

**Funções Principais:**
- `generate_metas_mensais(schema, filial_id, mes, ano, meta_percentual, data_ref)`
- `generate_metas_setor(schema, setor_id, filial_id, mes, ano, meta_percentual, data_ref)`
- `get_metas_report(schema, filial_ids, mes, ano)`
- `get_metas_setor_report(schema, setor_id, filial_ids, mes, ano)`

---

## 🔄 Fluxo de Dados

### Geração de Meta Mensal

```
1. Usuário preenche formulário
   ↓
2. Frontend → POST /api/metas/generate
   {
     schema: "saoluiz",
     filialId: 10,
     mes: 1,
     ano: 2025,
     metaPercentual: 10,
     dataReferenciaInicial: "2024-01-15"
   }
   ↓
3. API valida autorização de filiais
   ↓
4. API chama RPC Supabase
   supabase.rpc('generate_metas_mensais', params)
   ↓
5. Função SQL:
   - Para cada dia do mês
   - Busca venda do mesmo dia de semana na data referência
   - Calcula meta: valor_ref * (1 + meta_percentual/100)
   - Inserta em {schema}.metas_mensais
   ↓
6. API retorna sucesso
   ↓
7. Frontend mostra mensagem e limpa form
```

### Consulta de Metas

```
1. Usuário seleciona filtros (mês, ano, filiais)
   ↓
2. Frontend → GET /api/metas/report?...
   ↓
3. API valida autorização
   ↓
4. API chama RPC
   supabase.rpc('get_metas_report', {
     p_schema: schema,
     p_filial_ids: [10, 20],
     p_mes: 1,
     p_ano: 2025
   })
   ↓
5. Função SQL:
   - JOIN metas_mensais com vendas_diarias_por_filial
   - Calcula valor_realizado
   - Calcula diferenças e percentuais
   - Retorna dados agrupados
   ↓
6. API retorna dados formatados
   ↓
7. Frontend renderiza tabela com:
   - Agrupamento por data
   - Expand/collapse
   - Totalizadores
   - Cores por performance
```

### Edição de Meta

```
1. Usuário duplo-clica em célula
   ↓
2. Input inline aparece
   ↓
3. Usuário digita novo valor e tecla Enter
   ↓
4. Frontend → POST /api/metas/update
   {
     schema: "saoluiz",
     metaId: 123,
     valorMeta: 15000
   }
   ↓
5. API atualiza registro
   UPDATE metas_mensais
   SET valor_meta = 15000,
       diferenca = valor_realizado - 15000,
       diferenca_percentual = ...
   WHERE id = 123
   ↓
6. API retorna sucesso
   ↓
7. Frontend atualiza estado local
   ↓
8. Célula volta ao modo visualização
```

---

## 💾 Banco de Dados

### Tabelas Principais

#### metas_mensais
```sql
CREATE TABLE {schema}.metas_mensais (
  id SERIAL PRIMARY KEY,
  filial_id INTEGER NOT NULL,
  data DATE NOT NULL,
  dia_semana TEXT NOT NULL,
  meta_percentual NUMERIC(5,2) NOT NULL,
  data_referencia DATE NOT NULL,
  valor_referencia NUMERIC(15,2) NOT NULL,
  valor_meta NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(filial_id, data)
);
```

**Campos:**
- `filial_id`: ID da filial
- `data`: Dia da meta (2025-01-15)
- `dia_semana`: Segunda, Terça, etc
- `meta_percentual`: Ex: 10.00 (= +10%)
- `data_referencia`: Dia usado como base (2024-01-15)
- `valor_referencia`: Venda do dia de referência
- `valor_meta`: valor_referencia * (1 + meta_percentual/100)

**Constraint UNIQUE:**
- Não permite duplicar meta para mesma filial + data

#### metas_setor
```sql
CREATE TABLE {schema}.metas_setor (
  id SERIAL PRIMARY KEY,
  setor_id INTEGER NOT NULL REFERENCES {schema}.setores(id),
  filial_id INTEGER NOT NULL,
  data DATE NOT NULL,
  dia_semana TEXT NOT NULL,
  meta_percentual NUMERIC(5,2) NOT NULL,
  data_referencia DATE NOT NULL,
  valor_referencia NUMERIC(15,2) NOT NULL,
  valor_meta NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(setor_id, filial_id, data)
);
```

**Diferença:**
- Adiciona `setor_id`
- UNIQUE em (setor_id, filial_id, data)

#### setores
```sql
CREATE TABLE {schema}.setores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  nivel INTEGER NOT NULL,
  departamento_ids INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Departamentos:**
- Lista de IDs de departamentos vinculados
- Usado para filtrar vendas por setor
- Ex: [101, 102, 103] = Mercearia

#### vendas_diarias_por_filial
```sql
-- Tabela de vendas (já existe)
-- Usada para:
-- 1. Buscar valor_referencia (vendas do ano anterior)
-- 2. Calcular valor_realizado (vendas do dia atual)
```

---

## 🔌 APIs

### POST /api/metas/generate

**Request:**
```json
{
  "schema": "saoluiz",
  "filialId": 10,
  "mes": 1,
  "ano": 2025,
  "metaPercentual": 10,
  "dataReferenciaInicial": "2024-01-15"
}
```

**Response:**
```json
{
  "message": "Metas geradas com sucesso!",
  "registros_criados": 31
}
```

**Lógica:**
1. Valida autorização do usuário para a filial
2. Chama `generate_metas_mensais` RPC
3. Função SQL gera 1 meta por dia do mês
4. Retorna quantidade de registros criados

### GET /api/metas/report

**Query Params:**
- `schema`: Nome do schema
- `filiais`: IDs separados por vírgula (ex: "10,20,30")
- `mes`: 1-12
- `ano`: 2025

**Response:**
```json
{
  "metas": [
    {
      "id": 1,
      "filial_id": 10,
      "data": "2025-01-01",
      "dia_semana": "Quarta",
      "meta_percentual": 10,
      "data_referencia": "2024-01-03",
      "valor_referencia": 10000,
      "valor_meta": 11000,
      "valor_realizado": 12000,
      "diferenca": 1000,
      "diferenca_percentual": 9.09
    }
  ],
  "total_realizado": 350000,
  "total_meta": 340000,
  "percentual_atingido": 102.94
}
```

### POST /api/metas/update

**Request:**
```json
{
  "schema": "saoluiz",
  "metaId": 123,
  "valorMeta": 15000
}
```

**Response:**
```json
{
  "message": "Meta atualizada com sucesso!"
}
```

**Lógica:**
1. Atualiza `valor_meta`
2. Recalcula `diferenca` e `diferenca_percentual`
3. Atualiza `updated_at`

### POST /api/metas/setor/generate

**Request:**
```json
{
  "schema": "saoluiz",
  "setorIds": [1, 2],
  "filialIds": [10, 20],
  "mes": 1,
  "ano": 2025,
  "metaPercentual": 10,
  "dataReferenciaInicial": "2024-01-15"
}
```

**Response:**
```json
{
  "message": "Metas geradas com sucesso!",
  "details": {
    "setor_1": { "filial_10": 31, "filial_20": 31 },
    "setor_2": { "filial_10": 31, "filial_20": 31 }
  },
  "total": 124
}
```

**Lógica:**
1. Loop por cada setor
2. Loop por cada filial
3. Chama `generate_metas_setor` para cada combinação
4. Retorna detalhamento da geração

### GET /api/metas/setor/report

**Query Params:**
- `schema`: Nome do schema
- `setorId`: ID único do setor
- `filiais`: IDs separados por vírgula
- `mes`: 1-12
- `ano`: 2025

**Response:**
```json
{
  "setor": {
    "id": 1,
    "nome": "Mercearia"
  },
  "metas_por_data": [
    {
      "data": "2025-01-01",
      "dia_semana": "Quarta",
      "filiais": [
        {
          "filial_id": 10,
          "valor_referencia": 5000,
          "valor_meta": 5500,
          "valor_realizado": 6000,
          "diferenca": 500,
          "diferenca_percentual": 9.09
        }
      ]
    }
  ]
}
```

---

## 🎨 Componentes UI

### Filtros Comuns

**Multi-select de Filiais:**
```tsx
<MultiSelect
  options={todasAsFiliais}
  selected={filiaisSelecionadas}
  onChange={setFiliaisSelecionadas}
  placeholder="Selecione as filiais"
/>
```

**Seletor de Mês:**
```tsx
<Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
  <SelectItem value="1">Janeiro</SelectItem>
  <SelectItem value="2">Fevereiro</SelectItem>
  ...
</Select>
```

**Calendário (Data Referência):**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon />
      {formDataReferencia ? format(formDataReferencia, 'dd/MM/yyyy') : 'Selecione'}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar
      mode="single"
      selected={formDataReferencia}
      onSelect={setFormDataReferencia}
      locale={ptBR}
    />
  </PopoverContent>
</Popover>
```

### Tabela de Metas (Agrupada)

```tsx
{Object.entries(groupedByDate).map(([date, group]) => (
  <Fragment key={date}>
    {/* Linha de cabeçalho por data */}
    <TableRow 
      className="cursor-pointer bg-muted/50"
      onClick={() => toggleDate(date)}
    >
      <TableCell>
        {expandedDates[date] ? <ChevronDown /> : <ChevronRight />}
        {format(parseISO(date), "dd/MM/yyyy - EEEE", { locale: ptBR })}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(group.total_meta)}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(group.total_realizado)}
      </TableCell>
      <TableCell className={cn(
        "text-right font-medium",
        group.total_diferenca >= 0 ? "text-green-600" : "text-red-600"
      )}>
        {formatCurrency(group.total_diferenca)}
      </TableCell>
    </TableRow>

    {/* Linhas expandidas (por filial) */}
    {expandedDates[date] && group.metas.map((meta) => (
      <TableRow key={meta.id} className="bg-white">
        <TableCell className="pl-12">
          Filial {meta.filial_id}
        </TableCell>
        <TableCell 
          className="text-right cursor-pointer hover:bg-muted"
          onDoubleClick={() => startEditing(meta.id, meta.valor_meta)}
        >
          {editingId === meta.id ? (
            <Input 
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEdit}
            />
          ) : (
            formatCurrency(meta.valor_meta)
          )}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(meta.valor_realizado)}
        </TableCell>
        <TableCell className={cn(
          "text-right",
          meta.diferenca >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {formatCurrency(meta.diferenca)}
          ({meta.diferenca_percentual.toFixed(2)}%)
        </TableCell>
      </TableRow>
    ))}
  </Fragment>
))}
```

### Dialog de Geração

```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogTrigger asChild>
    <Button>
      <PlusIcon className="mr-2" />
      Gerar Nova Meta
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Gerar Meta Mensal</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* Campos do formulário */}
      <Select value={formMes}>...</Select>
      <Select value={formAno}>...</Select>
      <Select value={formFilialId}>...</Select>
      <Popover>{/* Calendário */}</Popover>
      <Input type="number" placeholder="Meta %" />
    </div>
    <DialogFooter>
      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? <Loader2 className="animate-spin" /> : 'Gerar'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎯 Hooks Customizados

### useBranchesOptions

```typescript
const { options, isLoading, branchOptions } = useBranchesOptions({
  tenantId: currentTenant?.id,
  enabled: !!currentTenant
})

// options: Array para multi-select
// [{ value: "10", label: "Filial 10" }, ...]

// branchOptions: Array para select simples
// [{ id: 10, name: "Filial 10" }, ...]
```

---

## 📊 Cálculos Importantes

### Meta
```
valor_meta = valor_referencia * (1 + meta_percentual / 100)

Exemplo:
valor_referencia = 10.000
meta_percentual = 10

valor_meta = 10.000 * (1 + 10/100)
valor_meta = 10.000 * 1.10
valor_meta = 11.000
```

### Diferença
```
diferenca = valor_realizado - valor_meta

Exemplo:
valor_realizado = 12.000
valor_meta = 11.000

diferenca = 12.000 - 11.000 = 1.000 (positiva = bateu a meta)
```

### Diferença Percentual
```
diferenca_percentual = (diferenca / valor_meta) * 100

Exemplo:
diferenca = 1.000
valor_meta = 11.000

diferenca_percentual = (1.000 / 11.000) * 100 = 9.09%
```

---

## 🚀 Melhorias Possíveis

### Sugeridas pelos Usuários
- [ ] Copiar metas de um mês para outro
- [ ] Ajuste em lote de percentual
- [ ] Gráfico de evolução de metas
- [ ] Exportar para Excel
- [ ] Notificações quando meta é batida
- [ ] Comparação com múltiplos meses
- [ ] Meta por vendedor
- [ ] Projeção de meta baseada em histórico

### Técnicas
- [ ] Cache de relatórios
- [ ] Paginação de metas
- [ ] Background job para cálculo de realizados
- [ ] Otimização de queries SQL
- [ ] Virtualização de tabela (react-window)

---

**Documentado por:** DevIngá Team  
**Última Atualização:** 2025-11-04
