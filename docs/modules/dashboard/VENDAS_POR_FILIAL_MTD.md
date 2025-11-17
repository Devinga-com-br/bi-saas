# MTD na Tabela "Vendas por Filial"

**Data**: 2025-11-16
**Versão**: 1.0.0
**Módulo**: Dashboard - Tabela Vendas por Filial

---

## 📋 Resumo

Aplicação da lógica **MTD (Month-to-Date)** na tabela "Vendas por Filial" do Dashboard. Quando o filtro está definido como **"Mês"**, a comparação (valor PA abaixo do valor vendido) será com o **mesmo mês do ano anterior MTD**, ao invés do ano anterior completo.

---

## 🎯 Objetivo

Tornar a comparação na tabela consistente com a **segunda linha MTD** dos cards (ano anterior) quando o filtro é "Mês".

### **Antes (Inconsistente)**

```
Cards exibem:
- OUT/2025: R$ 5.799.674,29 (-7,86%)  ← MTD mês anterior
- NOV/2024: R$ 3.759.337,28 (+42,14%) ← MTD ano anterior

Tabela exibia:
- PA: R$ 9.362.566,89 (-42,93%)       ← Ano anterior COMPLETO (inconsistente!)
```

### **Agora (Consistente)**

```
Cards exibem:
- OUT/2025: R$ 5.799.674,29 (-7,86%)  ← MTD mês anterior
- NOV/2024: R$ 3.759.337,28 (+42,14%) ← MTD ano anterior

Tabela exibe:
- PA: R$ 3.759.337,28 (+42,14%)       ← MTD ano anterior (consistente com 2ª linha!)
```

---

## 🔧 Mudança Implementada

### **Arquivo Modificado**

`supabase/migrations/20251116010000_update_vendas_por_filial_mtd.sql`

### **Função Atualizada**

`public.get_vendas_por_filial(p_schema, p_data_inicio, p_data_fim, p_filiais, p_filter_type)`

### **Lógica de Cálculo do Período Anterior**

```sql
IF p_filter_type = 'month' THEN
  -- MTD: Compara com mesmo mês do ano anterior, mesmo período de dias
  -- Exemplo: Hoje 16/11/2025
  --   Atual: 01/11/2025 a 16/11/2025
  --   PA: 01/11/2024 a 16/11/2024

  v_current_day := EXTRACT(DAY FROM CURRENT_DATE);
  v_pa_data_inicio := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 year')::DATE;
  v_last_day_previous_month := EXTRACT(DAY FROM ((DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 year') + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
  v_mtd_end_day := LEAST(v_current_day, v_last_day_previous_month);
  v_pa_data_fim := (v_pa_data_inicio + (v_mtd_end_day - 1) * INTERVAL '1 day')::DATE;

ELSIF p_filter_type = 'custom' THEN
  -- Customizado: Mesmo intervalo do ano anterior
  v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
  v_pa_data_fim := p_data_fim - INTERVAL '1 year';

ELSE -- 'year'
  -- Ano: Ano anterior completo
  v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
  v_pa_data_fim := p_data_fim - INTERVAL '1 year';
END IF;
```

---

## 📊 Comportamento por Cenário

### **Cenário 1: Filtro = Mês (MTD Ativo)**

```
Hoje: 16/11/2025
Filtro: Novembro/2025
```

**Tabela exibe:**

| Filial | Valor Vendido | PA (Comparativo) |
|--------|---------------|------------------|
| 1 | R$ 1.234.567,89 | R$ 1.150.000,00 (↑ +7,35%) |
| 2 | R$ 987.654,32 | R$ 920.000,00 (↑ +7,35%) |

**Períodos comparados:**
- **Atual**: 01/11/2025 a 16/11/2025 (MTD)
- **PA**: 01/11/2024 a 16/11/2024 (mesmo mês ano anterior MTD)

---

### **Cenário 2: Filtro = Ano**

```
Filtro: Ano 2025
```

**Tabela exibe:**

| Filial | Valor Vendido | PA (Comparativo) |
|--------|---------------|------------------|
| 1 | R$ 14.805.814,68 | R$ 13.800.000,00 (↑ +7,29%) |
| 2 | R$ 11.851.851,85 | R$ 11.040.000,00 (↑ +7,35%) |

**Períodos comparados:**
- **Atual**: 01/01/2025 a 31/12/2025
- **PA**: 01/01/2024 a 31/12/2024 (ano anterior completo)

---

### **Cenário 3: Filtro = Período Customizado**

```
Filtro: 01/10/2025 a 15/11/2025
```

**Tabela exibe:**

| Filial | Valor Vendido | PA (Comparativo) |
|--------|---------------|------------------|
| 1 | R$ 2.469.135,78 | R$ 2.300.000,00 (↑ +7,35%) |
| 2 | R$ 1.975.308,64 | R$ 1.840.000,00 (↑ +7,35%) |

**Períodos comparados:**
- **Atual**: 01/10/2025 a 15/11/2025
- **PA**: 01/10/2024 a 15/11/2024 (mesmo intervalo do ano anterior)

---

## 🔍 Casos Especiais

### **Caso 1: Dia atual > último dia do mês no ano anterior**

```
Hoje: 31/03/2025 (dia 31)
Filtro: Março/2025
Mesmo mês ano anterior: Março/2024 (31 dias)

Atual: 01/03/2025 a 31/03/2025
PA: 01/03/2024 a 31/03/2024
```

### **Caso 1b: Ano bissexto**

```
Hoje: 29/02/2024 (dia 29, ano bissexto)
Filtro: Fevereiro/2024
Mesmo mês ano anterior: Fevereiro/2023 (28 dias)

Atual: 01/02/2024 a 29/02/2024
PA: 01/02/2023 a 28/02/2023  ← Ajusta para último dia disponível
```

### **Caso 2: Primeiro dia do mês**

```
Hoje: 01/11/2025
Filtro: Novembro/2025

Atual: 01/11/2025 a 01/11/2025 (apenas dia 1)
PA: 01/11/2024 a 01/11/2024 (apenas dia 1)
```

---

## 📂 Estrutura da Tabela

### **Campos Retornados**

```typescript
interface VendaPorFilial {
  filial_id: number

  // Período atual
  valor_total: number
  custo_total: number
  total_lucro: number
  quantidade_total: number
  total_transacoes: number
  ticket_medio: number
  margem_lucro: number

  // Período anterior (PA) - AGORA COM MTD!
  pa_valor_total: number
  pa_custo_total: number
  pa_total_lucro: number
  pa_total_transacoes: number
  pa_ticket_medio: number
  pa_margem_lucro: number

  // Deltas (diferenças)
  delta_valor: number
  delta_valor_percent: number
  delta_custo: number
  delta_custo_percent: number
  delta_lucro: number
  delta_lucro_percent: number
  delta_margem: number
}
```

---

## 🚀 Como Aplicar

### **1. Executar Migration**

```bash
# Via Supabase Dashboard:
# SQL Editor → Cole migration → Run
```

Ou via psql:

```bash
psql -h <host> -U <user> -d <database> -f supabase/migrations/20251116010000_update_vendas_por_filial_mtd.sql
```

### **2. Testar via SQL**

```sql
SELECT * FROM public.get_vendas_por_filial(
  'okilao',
  '2025-11-01'::DATE,
  '2025-11-30'::DATE,
  'all',
  'month'  -- ← Importante: 'month' ativa MTD
);
```

### **3. Verificar no Frontend**

1. Acesse `/dashboard`
2. Selecione filtro "Mês"
3. Role até a tabela "Vendas por Filial"
4. Verifique que o valor PA está consistente com o primeiro valor MTD dos cards

---

## ✅ Checklist de Testes

- [ ] **Filtro Mês**: PA mostra mês anterior MTD (ex: 16 dias vs 16 dias)
- [ ] **Filtro Ano**: PA mostra ano anterior completo
- [ ] **Filtro Customizado**: PA mostra mesmo intervalo do ano anterior
- [ ] **Caso especial**: Último dia do mês (31) comparado com mês de 28 dias
- [ ] **Consistência**: Valores PA da tabela batem com primeira linha MTD dos cards
- [ ] **Percentuais**: Delta % está calculado corretamente

---

## 📌 Observações Importantes

1. **MTD só para mês**: A lógica MTD só é aplicada quando `p_filter_type = 'month'`

2. **Consistência visual**: Agora a tabela está consistente com os cards MTD

3. **Dia atual**: Usa `CURRENT_DATE` para garantir comparação justa

4. **Descontos aplicados**: Continua subtraindo descontos tanto do período atual quanto do PA

5. **Performance**: Não há impacto negativo, pois apenas mudou o cálculo das datas

---

## 🐛 Troubleshooting

### **Valores PA não mudaram**

**Causa**: Migration não foi aplicada

**Solução**: Execute a migration no Supabase SQL Editor

### **PA ainda mostra ano anterior**

**Causa**: `filter_type` não está sendo passado corretamente

**Solução**: Verifique que a API está passando `p_filter_type: filterType`

### **Erro ao executar migration**

**Erro**: `function already exists`

**Solução**: O arquivo de migration já inclui `DROP FUNCTION IF EXISTS` antes de criar

---

## 📚 Referências

- **Migration**: `supabase/migrations/20251116010000_update_vendas_por_filial_mtd.sql`
- **API Route**: `src/app/api/dashboard/vendas-por-filial/route.ts:78` (passa `p_filter_type`)
- **Frontend**: `src/app/(dashboard)/dashboard/page.tsx:322-325` (tabela de vendas por filial)
- **MTD Cards**: `docs/modules/dashboard/MTD_IMPLEMENTATION.md`

---

**Versão**: 1.0.0
**Criado em**: 2025-11-16
**Status**: ✅ Implementação Completa
