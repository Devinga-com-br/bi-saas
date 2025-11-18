# Cards de Resumo e Skeletons - Meta por Setor

**Data:** 2025-11-18
**Módulo:** `/metas/setor`
**Status:** ✅ Implementado

---

## 📋 Resumo das Implementações

Esta documentação descreve as melhorias visuais implementadas no módulo de Metas por Setor:

1. **Cards de Resumo** - Dois cards com visão geral do período
2. **Skeleton Loading States** - Estados de carregamento para todos os componentes

---

## 🎨 Cards de Resumo Implementados

### 1. Card "Vendas do Período"

**Localização:** [page.tsx:1095-1160](../src/app/(dashboard)/metas/setor/page.tsx#L1095-L1160)

**Funcionalidade:**
- Mostra o total realizado para o setor selecionado no período filtrado
- Compara com a meta do período
- Exibe diferença e percentual de atingimento

**Estrutura:**
```tsx
<Card>
  <CardHeader>
    {/* Badge com nome da filial/filiais no canto superior direito */}
    <CardTitle>Vendas do Período ({nome_setor})</CardTitle>
    <CardDescription>{Mês Ano}</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Valor principal: Total Realizado */}
    {/* Meta do período */}
    {/* Diferença com ícone e cor (verde se positivo, vermelho se negativo) */}
  </CardContent>
</Card>
```

**Cálculo:** Função `calcularTotaisPeriodo()` (linhas 554-580)
```typescript
// Soma TODOS os valores do período filtrado
currentSetorData.forEach((dia) => {
  dia.filiais?.forEach((filial) => {
    totalRealizado += filial.valor_realizado || 0
    totalMeta += filial.valor_meta || 0
  })
})

// Calcula diferença e percentual
diferenca = totalRealizado - totalMeta
percentualAtingido = (totalRealizado / totalMeta) * 100
```

**Indicadores Visuais:**
- ✅ **Ícone ArrowUp** (verde) quando percentual ≥ 100%
- ❌ **Ícone ArrowDown** (vermelho) quando percentual < 100%

---

### 2. Card "Progresso da Meta"

**Localização:** [page.tsx:1162-1219](../src/app/(dashboard)/metas/setor/page.tsx#L1162-L1219)

**Funcionalidade:**
- Mostra dois gráficos circulares de progresso:
  1. **Mês Completo** - Progresso total do período filtrado
  2. **D-1 (Até Dia Anterior)** - Progresso até o dia anterior ao atual

**Estrutura:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Progresso da Meta</CardTitle>
    <CardDescription>Comparativo mensal e até o dia anterior</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-8">
      {/* Gráfico Circular 1: Mês Completo */}
      {/* Gráfico Circular 2: D-1 */}
    </div>
  </CardContent>
</Card>
```

**Cálculo D-1:** Função `calcularTotaisD1()` (linhas 582-617)
```typescript
const hoje = new Date()
const diaAtual = hoje.getDate()

currentSetorData.forEach((dia) => {
  const [year, month, day] = dia.data.split('-').map(Number)

  // ✅ Apenas dias ANTERIORES ao atual
  if (month === mes && year === ano && day < diaAtual) {
    dia.filiais?.forEach((filial) => {
      totalRealizado += filial.valor_realizado || 0
      totalMeta += filial.valor_meta || 0
    })
  }
})
```

**Gráficos Circulares (SVG):**

Implementação baseada em `strokeDasharray` para criar arco de progresso:

```typescript
// Fórmula do círculo
const raio = 56
const circunferencia = 2 * Math.PI * raio // ≈ 351.86

// Arco de progresso
const progressoArco = (percentual / 100) * 351.86

// SVG
<svg className="h-32 w-32 -rotate-90 transform">
  <circle
    stroke="currentColor"
    strokeDasharray={`${progressoArco} 351.86`}
    strokeWidth="10"
    strokeLinecap="round"
    fill="transparent"
    r="56"
    cx="64"
    cy="64"
  />
</svg>
```

**Cores Dinâmicas:**
- ✅ **Verde** (`text-green-500`) quando percentual ≥ 100%
- 🔵 **Primário** (`text-primary`) quando percentual < 100%

**Percentual no Centro:**
```tsx
<div className="absolute inset-0 flex items-center justify-center">
  <span className="text-2xl font-bold">{percentual.toFixed(1)}%</span>
</div>
```

---

## 🎭 Skeleton Loading States

### 1. Skeleton dos Cards de Resumo

**Localização:** [page.tsx:1052-1093](../src/app/(dashboard)/metas/setor/page.tsx#L1052-L1093)

**Card 1 - Vendas do Período:**
```tsx
<Card>
  <CardHeader className="relative">
    <div className="space-y-2">
      <Skeleton className="h-6 w-64" />  {/* Título */}
      <Skeleton className="h-4 w-32" />  {/* Subtítulo */}
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <Skeleton className="h-10 w-48" /> {/* Valor principal */}
      <Skeleton className="h-4 w-36" />  {/* Meta */}
      <Skeleton className="h-4 w-24" />  {/* Diferença */}
    </div>
  </CardContent>
</Card>
```

**Card 2 - Progresso da Meta:**
```tsx
<Card>
  <CardHeader className="relative">
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />  {/* Título */}
      <Skeleton className="h-4 w-56" />  {/* Subtítulo */}
    </div>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-8">
      {/* Gráfico 1 */}
      <div className="flex flex-col items-center">
        <Skeleton className="h-32 w-32 rounded-full" /> {/* Círculo */}
        <Skeleton className="h-4 w-24 mt-4" />          {/* Label */}
      </div>

      {/* Gráfico 2 */}
      <div className="flex flex-col items-center">
        <Skeleton className="h-32 w-32 rounded-full" /> {/* Círculo */}
        <Skeleton className="h-4 w-24 mt-4" />          {/* Label */}
      </div>
    </div>
  </CardContent>
</Card>
```

**Características:**
- ✅ Estrutura idêntica aos cards reais
- ✅ Circular skeletons para os gráficos de progresso
- ✅ Espaçamento e alinhamento consistentes

---

### 2. Skeleton da Tabela de Dados

**Localização:** [page.tsx:1224-1266](../src/app/(dashboard)/metas/setor/page.tsx#L1224-L1266)

**Antes (Skeleton Simples):**
```tsx
// ❌ Apenas um retângulo grande
<Skeleton className="h-96 w-full" />
```

**Depois (Skeleton Detalhado):**
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />   {/* Ícone */}
        <Skeleton className="h-6 w-32" />          {/* Título */}
      </div>
      <Skeleton className="h-6 w-24 rounded-full" /> {/* Badge */}
    </div>
  </CardHeader>

  <CardContent>
    <div className="space-y-2">
      {/* Header da Tabela */}
      <div className="grid grid-cols-9 gap-4 pb-4 border-b">
        <Skeleton className="h-4 w-4" />   {/* Chevron */}
        <Skeleton className="h-4 w-16" />  {/* Data */}
        <Skeleton className="h-4 w-24" />  {/* Dia Semana */}
        <Skeleton className="h-4 w-20" />  {/* Venda Ref */}
        <Skeleton className="h-4 w-16" />  {/* Meta % */}
        <Skeleton className="h-4 w-20" />  {/* Valor Meta */}
        <Skeleton className="h-4 w-20" />  {/* Realizado */}
        <Skeleton className="h-4 w-20" />  {/* Diferença */}
        <Skeleton className="h-4 w-16" />  {/* Dif % */}
      </div>

      {/* Linhas da Tabela - 8 linhas */}
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-9 gap-4 py-3 border-b">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Melhorias:**
- ✅ Skeleton do header com ícone, título e badge
- ✅ Skeleton de 9 colunas (mesmo número da tabela real)
- ✅ 8 linhas de skeleton (quantidade visual adequada)
- ✅ Bordas e espaçamentos idênticos à tabela real
- ✅ Larguras variadas para simular dados reais

---

## 🎯 Lógica de Renderização Condicional

**Estrutura de 3 Estados:**

```tsx
{loading ? (
  // Estado 1: CARREGANDO - Mostra skeletons
  <SkeletonCards />
  <SkeletonTable />
) : currentSetorData.length > 0 ? (
  // Estado 2: DADOS DISPONÍVEIS - Mostra cards e tabela com dados
  <RealCards />
  <RealTable />
) : null (
  // Estado 3: SEM DADOS - Não mostra nada
)}
```

**Fluxo:**
1. **Carregamento Inicial** → `loading = true` → Mostra skeletons
2. **Dados Carregados** → `loading = false` + `currentSetorData.length > 0` → Mostra componentes reais
3. **Sem Dados** → `loading = false` + `currentSetorData.length === 0` → Não mostra nada

---

## 📐 Layout Responsivo

**Desktop:**
```tsx
<div className="grid gap-6 md:grid-cols-2">
  {/* Card Vendas */}
  {/* Card Progresso */}
</div>
```
- Cards lado a lado (grid de 2 colunas)
- Gap de 24px entre eles

**Mobile:**
- Cards empilhados verticalmente (grid de 1 coluna)
- Gap de 24px entre eles

---

## 🔧 Funções Auxiliares

### 1. `getFilialLabel()` (linhas 619-628)

Retorna label adequado para o badge de filial:

```typescript
const getFilialLabel = () => {
  if (filiaisSelecionadas.length === 0) {
    return 'Todas as Filiais'
  } else if (filiaisSelecionadas.length === 1) {
    return filiaisSelecionadas[0].label
  } else {
    return `${filiaisSelecionadas.length} Filiais`
  }
}
```

**Exemplos:**
- Nenhuma filial selecionada → `"Todas as Filiais"`
- 1 filial selecionada → `"Matriz"` (ou nome da filial)
- 3 filiais selecionadas → `"3 Filiais"`

---

### 2. `formatCurrency()` (linha 630)

Formata valores em Real brasileiro:

```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
```

**Exemplo:** `150000` → `"R$ 150.000,00"`

---

### 3. `formatPercentage()` (linha 637)

Formata percentuais:

```typescript
const formatPercentage = (value: number) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}
```

**Exemplos:**
- `15.5` → `"+15.50%"`
- `-5.3` → `"-5.30%"`

---

## 🎨 Design Pattern - Inspiração Metas Mensais

Os cards seguem o mesmo padrão visual de [Metas Mensais](../src/app/(dashboard)/metas/mensal/page.tsx):

### Elementos Compartilhados:

1. **Card com Badge no Header**
   - Badge posicionado no canto superior direito
   - Mostra contexto (filial/filiais)

2. **Valor Principal em Destaque**
   - Tamanho: `text-3xl font-bold`
   - Cor padrão do texto

3. **Meta Secundária**
   - Tamanho: `text-sm text-muted-foreground`
   - Prefixo "Meta:"

4. **Diferença com Cor**
   - Verde (`text-green-500`) para positivo
   - Vermelho (`text-red-500`) para negativo
   - Ícones ArrowUp/ArrowDown

5. **Gráficos Circulares SVG**
   - Mesma técnica de `strokeDasharray`
   - Cor dinâmica baseada em atingimento
   - Percentual centralizado

---

## ✅ Checklist de Implementação

- [x] Card "Vendas do Período" implementado
- [x] Card "Progresso da Meta" implementado
- [x] Cálculo de totais do período
- [x] Cálculo de totais D-1
- [x] Gráficos circulares SVG
- [x] Cores dinâmicas (verde/primário)
- [x] Skeleton dos cards de resumo
- [x] Skeleton detalhado da tabela
- [x] Layout responsivo
- [x] Funções auxiliares
- [x] Consistência visual com Metas Mensais

---

## 📊 Comparação: Antes × Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| **Cards de Resumo** | Não existiam | 2 cards informativos |
| **Visão Geral** | Apenas tabela detalhada | Resumo + detalhes |
| **Progresso Visual** | Não havia | Gráficos circulares |
| **D-1 Tracking** | Não existia | Progresso até dia anterior |
| **Skeleton Cards** | Não existia | Skeletons detalhados |
| **Skeleton Tabela** | Retângulo simples | Estrutura realista de tabela |
| **UX Carregamento** | Sem feedback visual | Feedback claro de loading |

---

## 🚀 Como Usar

### Visualizar os Cards:

1. Acesse `/metas/setor`
2. Selecione um setor
3. Selecione mês e ano
4. Filtre filiais (opcional)
5. Clique em "Aplicar Filtros"

### Estados Visuais:

**Durante o carregamento:**
- Verá skeletons dos dois cards
- Verá skeleton detalhado da tabela

**Após carregar:**
- Card 1 mostra total realizado do período
- Card 2 mostra progresso mensal e D-1
- Tabela mostra detalhes por dia

---

## 🐛 Troubleshooting

### Cards não aparecem

**Diagnóstico:**
- Verifique se `currentSetorData.length > 0`
- Verifique se `loading === false`

**Solução:**
- Certifique-se de que os filtros estão aplicados
- Verifique se há metas criadas para o período

### Valores zerados

**Diagnóstico:**
- Função `calcularTotaisPeriodo()` retorna zeros

**Solução:**
- Verifique se `atualizar_valores_realizados_metas_setor` foi executado
- Verifique se há vendas para o período filtrado

### Skeleton não some

**Diagnóstico:**
- `loading` permanece `true`

**Solução:**
- Verifique logs do console
- Verifique se API está respondendo
- Verifique se há erros de rede

---

## 📚 Referências

- [Metas Mensais](../src/app/(dashboard)/metas/mensal/page.tsx) - Design pattern base
- [Skeleton Component](../src/components/ui/skeleton.tsx) - Componente de skeleton
- [Card Component](../src/components/ui/card.tsx) - Componente de card
- [META_SETOR_COMPLETE_DOCUMENTATION.md](./META_SETOR_COMPLETE_DOCUMENTATION.md) - Documentação do módulo
- [FIX_META_SETOR_VALORES_POR_SETOR.md](./FIX_META_SETOR_VALORES_POR_SETOR.md) - Correções anteriores

---

**Autor:** Claude Code
**Última atualização:** 2025-11-18
