# DRE Gerencial - Correções Implementadas

**Data:** 02/11/2025

## Resumo das Correções

O módulo DRE Gerencial foi completamente refatorado para corrigir problemas de filtros e alinhamento de dados com o Dashboard.

---

## 1. Filtros Simplificados e Corretos

### Antes:
- Filtros de data inicial e final (input date)
- Período fixo do mês causava valores incorretos
- Filtros confusos com múltiplas opções

### Depois:
- **Filtro por Mês e Ano** (Selectores simples)
  - Mês: Dropdown com nomes dos meses em português
  - Ano: Dropdown com últimos 5 anos
  - **Default:** Mês atual automaticamente
  
```typescript
const MESES = [
  { value: 0, label: 'Janeiro' },
  { value: 1, label: 'Fevereiro' },
  // ... até dezembro
]
```

### Vantagens:
- Interface intuitiva
- Menos chance de erro
- Alinhamento perfeito com período do mês (01 a último dia)

---

## 2. Cálculos de Indicadores Corrigidos

### Estrutura dos Indicadores

#### Receita Bruta (Card 1)
- **Valor Principal:** Vendas do mês/ano selecionado
- **PAM (Período Anterior do Mesmo ano):** Vendas do mês anterior
  - Exemplo: Se selecionar Out/2025 → PAM = Set/2025
- **PAA (Período Anterior do Ano anterior):** Vendas do mesmo mês no ano passado
  - Exemplo: Se selecionar Out/2025 → PAA = Out/2024
- **% Comparado:** vs valor principal

#### CMV (Card 2)
- **Fórmula:** Receita Bruta - Lucro Bruto
- PAM e PAA com mesma lógica de período

#### Lucro Bruto (Card 3)
- **Valor:** Vendas - CMV
- **Margem:** % em relação à Receita Bruta
- PAM e PAA com mesma lógica

#### Total de Despesas (Card 4 - NOVO)
- **Valor:** Soma de todas as despesas do período
- **Origem:** API `/api/despesas/hierarquia`
- **Agregação:** Consolidação de todas as filiais
- **Margem:** % em relação à Receita Bruta
- PAM e PAA: despesas dos períodos correspondentes

#### Lucro Líquido (Card 5)
- **Fórmula:** Lucro Bruto - Total Despesas
- **Margem Líquida:** (Lucro Líquido / Receita Bruta) × 100
- **Nota:** "Lucro Líquido = Lucro Bruto - Despesas"

---

## 3. Função Supabase Utilizada

A API chama a função `get_dashboard_data` que retorna:
- `total_vendas` → Receita Bruta
- `total_lucro` → Lucro Bruto  
- `margem_lucro` → Margem %
- CMV calculado: `total_vendas - total_lucro`

### Chamadas em Paralelo:
```typescript
// Período Atual (selecionado)
get_dashboard_data(schema, dataInicio, dataFim, filiais)

// PAM (mês anterior)
get_dashboard_data(schema, pamDataInicio, pamDataFim, filiais)

// PAA (mesmo mês ano passado)
get_dashboard_data(schema, paaDataInicio, paaDataFim, filiais)
```

---

## 4. Lógica de Cálculo de Datas

```typescript
// Período Atual
const dataInicio = startOfMonth(new Date(ano, mes))
const dataFim = endOfMonth(new Date(ano, mes))

// PAM - Mês Anterior
const mesPam = mes - 1 < 0 ? 11 : mes - 1
const anoPam = mes - 1 < 0 ? ano - 1 : ano
const pamDataInicio = startOfMonth(new Date(anoPam, mesPam))
const pamDataFim = endOfMonth(new Date(anoPam, mesPam))

// PAA - Ano Anterior
const paaDataInicio = startOfMonth(new Date(ano - 1, mes))
const paaDataFim = endOfMonth(new Date(ano - 1, mes))
```

---

## 5. Alinhamento com Dashboard

### ANTES (Problema):
- DRE mostrava: R$ 9.505.939,33
- Dashboard mostrava: R$ 9.118.356,34
- **Causa:** Datas sendo enviadas de forma diferente

### DEPOIS (Correto):
- **Mesma função:** `get_dashboard_data`
- **Mesmas datas:** yyyy-MM-dd sem conversão de timezone
- **Mesma lógica:** Strings diretas para evitar timezone issues

```typescript
// CORRETO - Envia string direta
const dataInicioStr = format(dataInicio, 'yyyy-MM-dd')
const dataFimStr = format(dataFim, 'yyyy-MM-dd')

// API usa direto:
p_data_inicio: dataInicioStr,  // '2025-10-01'
p_data_fim: dataFimStr          // '2025-10-31'
```

---

## 6. Layout dos Cards (5 Cards em Linha)

### Desktop:
```typescript
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
```

### Responsivo:
- **Mobile:** 1 coluna
- **Tablet (md):** 2 colunas  
- **Desktop (lg):** 3 colunas
- **Desktop grande (xl):** 5 colunas

### Tamanhos de Fonte:
- **Valor Principal:** `text-2xl font-bold`
- **Labels:** `text-xs font-medium`
- **Comparações:** `text-[10px]`

---

## 7. Hierarquia de Despesas

A tabela de despesas mostra:
1. **Total DRE** (linha em destaque)
2. **Departamentos** (expansíveis)
3. **Tipos de Despesa** (dentro dos departamentos)
4. **Despesas Individuais** (dentro dos tipos)

### Agregação Multi-Filial:
- Consolida dados de todas as filiais
- Mostra coluna "Total" + coluna por filial
- Calcula % de cada filial vs média

---

## 8. Fluxo de Busca de Dados

```
1. Usuário seleciona Mês e Ano
   ↓
2. Frontend calcula:
   - Período Atual (01/mês a último dia/mês)
   - PAM (mês anterior completo)
   - PAA (mesmo mês ano passado)
   ↓
3. Busca em paralelo:
   - Despesas dos 3 períodos (API hierarquia)
   - Indicadores dos 3 períodos (API DRE)
   ↓
4. Consolida e exibe:
   - 5 Cards de indicadores
   - Tabela hierárquica de despesas
```

---

## 9. Tratamento de Erros

### Validações Implementadas:
- ✅ Schema obrigatório
- ✅ Datas válidas
- ✅ Data inicial ≤ Data final
- ✅ Filiais autorizadas (RLS)
- ✅ Tratamento de erros 500

### Logs para Debug:
```typescript
console.log('[API/DRE-GERENCIAL] PARSED DATES:', {...})
console.log('[API/DRE-GERENCIAL] Fetching with params:', {...})
console.log('[API/DRE-GERENCIAL] Current data received:', {...})
```

---

## 10. Arquivos Modificados

1. **Frontend:**
   - `/src/app/(dashboard)/dre-gerencial/page.tsx`
   - Filtros simplificados (Mês + Ano)
   - Novo card "Total de Despesas"
   - Grid responsivo 5 colunas
   - Font size 2xl nos valores

2. **API:**
   - `/src/app/api/dre-gerencial/indicadores/route.ts`
   - Usa `get_dashboard_data` (mesma do Dashboard)
   - Calcula PAM e PAA corretamente
   - Evita timezone issues com strings

---

## 11. Testes Realizados

### Cenários Testados:
- ✅ Filtro Outubro 2025 → PAM = Setembro 2025, PAA = Outubro 2024
- ✅ Filtro Janeiro 2025 → PAM = Dezembro 2024, PAA = Janeiro 2024
- ✅ Valores batem com Dashboard
- ✅ Despesas são somadas corretamente
- ✅ Todas as filiais + "Todas as Filiais"
- ✅ Build sem erros

---

## 12. Exemplos de Uso

### Análise Mensal:
Selecionar **Outubro 2025** para ver:
- Receita de Out/2025
- Comparação com Set/2025 (PAM)
- Comparação com Out/2024 (PAA)
- Despesas de Out/2025
- Lucro Líquido após despesas

### Análise Anual:
Trocar o ano para **2024** e navegar pelos meses

---

## 13. Próximos Passos (Opcional)

- [ ] Adicionar exportação PDF
- [ ] Gráfico de evolução mensal
- [ ] Comparação entre filiais
- [ ] Projeção de lucro
- [ ] Alertas de margem baixa

---

## Conclusão

O módulo DRE Gerencial agora está:
- ✅ Alinhado com o Dashboard
- ✅ Com filtros intuitivos (Mês + Ano)
- ✅ Cálculos corretos de PAM e PAA
- ✅ Card de Total de Despesas implementado
- ✅ Layout responsivo em 5 colunas
- ✅ Valores batem entre módulos
- ✅ Pronto para produção
