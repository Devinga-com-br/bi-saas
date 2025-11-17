# Implementação MTD (Month-to-Date) - Dashboard

**Data**: 2025-11-16
**Versão**: 1.0.0
**Módulo**: Dashboard Principal

## 📋 Resumo

Implementação de comparação **MTD (Month-to-Date)** para os cards de Receita Bruta, Lucro Bruto e Margem Bruta no Dashboard. A funcionalidade é ativada automaticamente quando o filtro está definido como "Mês".

---

## 🎯 Objetivo

Quando o usuário filtra por **mês** (ex: Novembro/2025) e estamos no **dia 16/11/2025**, o sistema deve exibir **duas comparações adicionais** nos cards:

1. **Mês Anterior MTD**: Compara o período atual (01/Nov a 16/Nov) com o mesmo período do mês anterior (01/Out a 16/Out)
2. **Ano Anterior MTD**: Compara o período atual (01/Nov/2025 a 16/Nov/2025) com o mesmo período do ano anterior (01/Nov/2024 a 16/Nov/2024)

---

## 🔧 Arquivos Criados/Modificados

### ✅ **Novos Arquivos**

1. **Migration SQL**
   - `supabase/migrations/20251116000000_add_mtd_metrics_function.sql`
   - Cria função RPC `get_dashboard_mtd_metrics`

2. **API Route**
   - `src/app/api/dashboard/mtd-metrics/route.ts`
   - Endpoint `/api/dashboard/mtd-metrics`

3. **Documentação**
   - `docs/modules/dashboard/MTD_IMPLEMENTATION.md` (este arquivo)

### ✏️ **Arquivos Modificados**

1. **Dashboard Page**
   - `src/app/(dashboard)/dashboard/page.tsx`
   - Adicionada interface `MTDMetrics`
   - Adicionadas funções:
     - `shouldShowMTD()`
     - `getMTDPreviousMonthLabel()`
     - `getMTDPreviousYearLabel()`
   - Adicionada chamada `useSWR` para MTD API
   - Atualizado render dos cards com props MTD

2. **CardMetric Component**
   - `src/components/dashboard/card-metric.tsx`
   - Adicionados props MTD:
     - `mtdPreviousMonthValue`
     - `mtdPreviousMonthVariationPercent`
     - `mtdPreviousMonthLabel`
     - `mtdPreviousMonthIsPositive`
     - `mtdPreviousYearValue`
     - `mtdPreviousYearVariationPercent`
     - `mtdPreviousYearLabel`
     - `mtdPreviousYearIsPositive`
   - Adicionado render de comparações MTD

---

## 🗄️ Função RPC: `get_dashboard_mtd_metrics`

### **Assinatura**

```sql
get_dashboard_mtd_metrics(
  schema_name TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids TEXT[] DEFAULT NULL
)
```

### **Retorno**

```typescript
{
  // Período atual MTD
  mtd_vendas: number,
  mtd_lucro: number,
  mtd_margem: number,

  // Mês anterior MTD
  mtd_mes_anterior_vendas: number,
  mtd_mes_anterior_lucro: number,
  mtd_mes_anterior_margem: number,
  mtd_variacao_mes_anterior_vendas_percent: number,
  mtd_variacao_mes_anterior_lucro_percent: number,
  mtd_variacao_mes_anterior_margem: number,

  // Ano anterior MTD
  mtd_ano_anterior_vendas: number,
  mtd_ano_anterior_lucro: number,
  mtd_ano_anterior_margem: number,
  mtd_variacao_ano_anterior_vendas_percent: number,
  mtd_variacao_ano_anterior_lucro_percent: number,
  mtd_variacao_ano_anterior_margem: number
}
```

### **Lógica de Cálculo**

```
Hoje: 16/11/2025
Filtro: Novembro/2025 (01/11/2025 a 30/11/2025)

1. MTD Atual:
   Período: 01/11/2025 a 16/11/2025 (dia atual do mês)

2. MTD Mês Anterior:
   Período: 01/10/2025 a 16/10/2025 (mesmo dia do mês anterior)

3. MTD Ano Anterior:
   Período: 01/11/2024 a 16/11/2024 (mesmo mês/dia do ano anterior)
```

### **Tratamento de Casos Especiais**

**Caso 1: Dia atual > último dia do mês de comparação**
```
Hoje: 31/03/2025 (dia 31)
Comparação com Fevereiro (28 dias)

MTD Fev: 01/02/2025 a 28/02/2025 (usa último dia disponível)
```

**Caso 2: Ano bissexto**
```
Hoje: 29/02/2024 (ano bissexto)
Comparação com 2023 (não bissexto)

MTD 2023: 01/02/2023 a 28/02/2023 (ajusta automaticamente)
```

---

## 🔄 Fluxo de Ativação

### **Cenário 1: Filtro = Mês (MTD ATIVO)**

```
Filtro: "Mês" → Novembro/2025
Hoje: 16/11/2025
```

**Comportamento**:
- ✅ `shouldShowMTD()` retorna `true`
- ✅ API `/api/dashboard/mtd-metrics` é chamada
- ✅ Cards exibem:
  - Valor atual (01/Nov a 16/Nov)
  - **OUT/2025**: R$ X (MTD mês anterior: 01/Out a 16/Out)
  - **NOV/2024**: R$ Y (MTD ano anterior: 01/Nov/24 a 16/Nov/24)
  - PA: R$ Z (período completo anterior)

### **Cenário 2: Filtro = Ano (MTD INATIVO, YTD ATIVO)**

```
Filtro: "Ano" → 2025
Hoje: 16/11/2025
```

**Comportamento**:
- ❌ `shouldShowMTD()` retorna `false`
- ✅ `shouldShowYTD()` retorna `true`
- ✅ API `/api/dashboard/ytd-metrics` é chamada
- ✅ Cards exibem:
  - Valor atual (01/Jan/2025 a 31/Dez/2025)
  - **2024 YTD**: R$ X (01/Jan/2024 a 16/Nov/2024)
  - PA: R$ Y (2024 completo)

### **Cenário 3: Filtro = Período Customizado (SEM MTD/YTD)**

```
Filtro: "Período" → 01/Out/2025 a 15/Nov/2025
```

**Comportamento**:
- ❌ `shouldShowMTD()` retorna `false`
- ❌ `shouldShowYTD()` retorna `false`
- ✅ Cards exibem apenas:
  - Valor atual (01/Out a 15/Nov)
  - PA: R$ X (período anterior equivalente)

---

## 📊 Exemplo Visual - Card com MTD

### **Receita Bruta**

```
┌─────────────────────────────────────────┐
│ Receita Bruta                           │
├─────────────────────────────────────────┤
│ R$ 1.234.567,89                        │ ← Período atual (01-16/Nov)
│                                         │
│ OUT/2025: R$ 1.150.000,00 (↑ +7,35%)  │ ← MTD mês anterior
│ NOV/2024: R$ 1.100.000,00 (↑ +12,23%) │ ← MTD ano anterior
│ PA (Out/2025): R$ 2.850.000,00 (+5%)  │ ← Período completo anterior
└─────────────────────────────────────────┘
```

### **Lucro Bruto**

```
┌─────────────────────────────────────────┐
│ Lucro Bruto                             │
├─────────────────────────────────────────┤
│ R$ 370.370,37                          │
│                                         │
│ OUT/2025: R$ 345.000,00 (↑ +7,35%)    │
│ NOV/2024: R$ 330.000,00 (↑ +12,23%)   │
│ PA (Out/2025): R$ 855.000,00 (+5%)    │
└─────────────────────────────────────────┘
```

### **Margem Bruta**

```
┌─────────────────────────────────────────┐
│ Margem Bruta                            │
├─────────────────────────────────────────┤
│ 30,00%                                 │
│                                         │
│ OUT/2025: 30,00% (↑ +0,00p.p.)        │
│ NOV/2024: 30,00% (↑ +0,00p.p.)        │
│ PA (Out/2025): 30,00% (+0,00p.p.)     │
└─────────────────────────────────────────┘
```

---

## 🔍 Interface TypeScript

### **MTDMetrics**

```typescript
interface MTDMetrics {
  // Período atual
  mtd_vendas: number
  mtd_lucro: number
  mtd_margem: number

  // Mês anterior
  mtd_mes_anterior_vendas: number
  mtd_mes_anterior_lucro: number
  mtd_mes_anterior_margem: number
  mtd_variacao_mes_anterior_vendas_percent: number
  mtd_variacao_mes_anterior_lucro_percent: number
  mtd_variacao_mes_anterior_margem: number

  // Ano anterior
  mtd_ano_anterior_vendas: number
  mtd_ano_anterior_lucro: number
  mtd_ano_anterior_margem: number
  mtd_variacao_ano_anterior_vendas_percent: number
  mtd_variacao_ano_anterior_lucro_percent: number
  mtd_variacao_ano_anterior_margem: number
}
```

---

## 🧪 Testes Necessários

### **Teste 1: Filtro por Mês (MTD ativo)**
- Filtrar por Novembro/2025
- Verificar se API MTD é chamada
- Verificar se cards exibem comparações MTD
- Verificar labels: "OUT/2025" e "NOV/2024"

### **Teste 2: Filtro por Ano (YTD ativo, MTD inativo)**
- Filtrar por ano 2025
- Verificar que API MTD NÃO é chamada
- Verificar que API YTD é chamada
- Verificar que apenas YTD é exibido

### **Teste 3: Filtro Customizado (sem MTD/YTD)**
- Filtrar por período 01/Out a 15/Nov
- Verificar que nem MTD nem YTD são chamados
- Verificar que apenas PA é exibido

### **Teste 4: Casos especiais de data**
- Testar em 31/Mar (comparação com Fev - 28 dias)
- Testar em 29/Fev de ano bissexto
- Testar em 01 do mês (primeiro dia)

### **Teste 5: Comparações de variação**
- Verificar ícones: ↑ (verde) para positivo, ↓ (vermelho) para negativo
- Verificar formatação: percentual com 2 casas decimais
- Verificar "p.p." para margem (pontos percentuais)

---

## 📌 Observações Importantes

1. **MTD vs YTD**: MTD é ativado APENAS quando `filterType === 'month'`. YTD é ativado apenas quando `filterType === 'year'` e o ano é o ano atual.

2. **Não interfere com YTD**: As funcionalidades são independentes. MTD não afeta o comportamento do YTD existente.

3. **Descontos aplicados**: A função RPC subtrai descontos da tabela `descontos_venda` (se existir) tanto da receita quanto do lucro.

4. **Dia atual**: A função usa `CURRENT_DATE` para determinar até qual dia calcular o MTD, garantindo comparação justa entre períodos.

5. **Performance**: A função é otimizada com índices nas colunas `data_venda` e `filial_id`.

6. **Segurança**: Função criada com `SECURITY DEFINER` e valida acesso ao schema antes da execução.

---

## 🚀 Como Testar

### **1. Aplicar Migration**

```bash
# Conectar ao PostgreSQL e executar:
psql -h <host> -U <user> -d <database> -f supabase/migrations/20251116000000_add_mtd_metrics_function.sql
```

Ou via Supabase Dashboard:
- SQL Editor → Cole o conteúdo da migration → Run

### **2. Testar RPC Diretamente**

```sql
SELECT * FROM public.get_dashboard_mtd_metrics(
  'okilao',
  '2025-11-01'::DATE,
  '2025-11-30'::DATE,
  NULL
);
```

### **3. Testar via Frontend**

1. Acesse o dashboard
2. Selecione o filtro "Mês"
3. Escolha um mês (ex: Novembro/2025)
4. Verifique os cards:
   - Devem exibir comparações MTD
   - Labels devem mostrar "OUT/2025" e "NOV/2024"
   - Variações devem estar corretas

### **4. Verificar Logs**

Abra o console do navegador e procure por:
```
[MTD DEBUG] { shouldShowMTD: true, ... }
```

---

## 🐛 Troubleshooting

### **Erro: "function get_dashboard_mtd_metrics does not exist"**

**Causa**: Migration não foi aplicada

**Solução**: Execute a migration no Supabase

### **Erro: "The schema must be one of the following..."**

**Causa**: Schema não está em "Exposed schemas"

**Solução**: Supabase Dashboard → Settings → API → Exposed schemas → Adicione o schema

### **Cards não mostram MTD**

**Causa**: `filterType` não está como 'month'

**Solução**: Verifique se o filtro está realmente em modo "Mês" no DashboardFilter component

### **Dados MTD estão zerados**

**Causas possíveis**:
1. Não há vendas no período filtrado
2. Tabela `vendas_diarias_por_filial` está vazia
3. Schema está incorreto

**Solução**: Execute a query RPC diretamente no SQL Editor para diagnosticar

---

## 📚 Referências

- **RPC Function**: `supabase/migrations/20251116000000_add_mtd_metrics_function.sql`
- **API Route**: `src/app/api/dashboard/mtd-metrics/route.ts`
- **Dashboard Page**: `src/app/(dashboard)/dashboard/page.tsx:198-224` (funções MTD)
- **CardMetric Component**: `src/components/dashboard/card-metric.tsx:29-38,53-60,93-113` (props e render MTD)

---

**Versão**: 1.0.0
**Criado em**: 2025-11-16
**Autor**: Claude Code
**Status**: ✅ Implementação Completa
