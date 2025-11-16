# Fix: Dashboard Month Comparison Logic

**Data:** 2025-11-15  
**Módulo:** Dashboard  
**Problema:** Comparação incorreta ao filtrar por mês completo

## Problema Identificado

Quando o usuário filtrava por **Mês** (ex: Novembro/2025), a comparação com o mês anterior estava incorreta:

### Exemplo do Problema:
- **Filtro:** Novembro/2025 (01/11/2025 a 30/11/2025)
- **Esperado:** Comparar com Outubro/2025 completo (01/10/2025 a 31/10/2025)
- **Atual (ERRADO):** Comparava com 01/10/2025 a 30/10/2025

### Causa
A função `get_dashboard_data` calculava o período anterior (PAM) simplesmente subtraindo 1 mês das datas de início e fim:
```sql
v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;
```

Isso fazia com que:
- 01/11/2025 → 01/10/2025 ✅
- 30/11/2025 → 30/10/2025 ❌ (deveria ser 31/10/2025)

## Solução Implementada

### Detecção de Mês Completo
Adicionada lógica para detectar quando o período filtrado é um mês completo:

```sql
-- Detect if the period is a full month
IF EXTRACT(DAY FROM p_data_inicio) = 1 
   AND p_data_fim = (DATE_TRUNC('month', p_data_inicio) + INTERVAL '1 month - 1 day')::DATE
   AND EXTRACT(MONTH FROM p_data_inicio) = EXTRACT(MONTH FROM p_data_fim)
   AND EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM p_data_fim) THEN
  v_is_full_month := TRUE;
END IF;
```

### Cálculo Correto do PAM
Quando é detectado um mês completo, calcula o mês anterior completo:

```sql
IF v_is_full_month THEN
  -- For full month: compare with the complete previous month
  -- Get the first day of previous month
  v_data_inicio_pa := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 month')::DATE;
  -- Get the last day of previous month
  v_data_fim_pa := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 day')::DATE;
ELSE
  -- For other periods: subtract the same duration
  v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
  v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;
END IF;
```

## Comportamento Após o Fix

### Filtro por Mês (Ex: Novembro/2025)
- **Período Principal:** 01/11/2025 a 30/11/2025
- **Comparação (Out/2025):** 01/10/2025 a **31/10/2025** ✅

### Filtro por Ano (Ex: 2025)
- **Período Principal:** 01/01/2025 a 31/12/2025
- **Comparação (2024):** 01/01/2024 a 31/12/2024 ✅
- **YTD (2024 YTD):** 01/01/2024 até a mesma data de hoje no ano anterior ✅

### Filtro por Período Customizado
- **Mantém comportamento atual:** subtrai o mesmo período

## Arquivos Modificados

1. **Migration SQL:**
   - `supabase/migrations/20251115155000_fix_month_comparison.sql`
   
2. **Função Atualizada:**
   - `public.get_dashboard_data()`

## Como Aplicar

### Opção 1: Supabase Dashboard (Recomendado)
1. Acesse Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo: `supabase/migrations/20251115155000_fix_month_comparison.sql`
4. Cole o conteúdo e execute

### Opção 2: Via psql (se disponível)
```bash
psql -h aws-0-sa-east-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.wglbbxqvsjnbcvdbuxvk \
     -d postgres \
     -f supabase/migrations/20251115155000_fix_month_comparison.sql
```

## Validação

### Teste 1: Filtro por Mês
```bash
# Filtrar Novembro/2025
curl "http://localhost:3000/api/dashboard?schema=saoluiz&data_inicio=2025-11-01&data_fim=2025-11-30&filiais=all"

# Verificar que pa_vendas reflete Outubro/2025 COMPLETO (31 dias)
```

### Teste 2: Filtro por Ano
```bash
# Filtrar 2025
curl "http://localhost:3000/api/dashboard?schema=saoluiz&data_inicio=2025-01-01&data_fim=2025-12-31&filiais=all"

# Verificar que:
# - pa_vendas reflete 2024 completo
# - ytd_vendas_ano_anterior reflete 2024 até a data atual
```

## Impacto

- ✅ **Cards do Dashboard:** Agora mostram comparação correta ao filtrar por mês
- ✅ **Variações percentuais:** Cálculos corretos baseados no mês anterior completo
- ✅ **Labels dinâmicos:** Continuam funcionando (Out/2025, 2024, 2024 YTD)
- ✅ **Período customizado:** Mantém comportamento atual (não afetado)

## Notas Técnicas

### Variáveis Adicionadas
- `v_is_full_month BOOLEAN`: Detecta se é um mês completo

### Lógica de Decisão
```
IF filtro é ANO COMPLETO:
  → pa_* retorna PAA (Ano Anterior Completo)
  
ELSE IF filtro é MÊS COMPLETO:
  → pa_* retorna PAM (Mês Anterior Completo)
  
ELSE:
  → pa_* retorna PAM (Mesmo período deslocado)
```

## Referências

- Issue original: Filtro por Mês não comparava corretamente com mês anterior
- Relacionado a: Dashboard v2.0 filter improvements
- Migration anterior: `20251115150000_fix_dashboard_comparison_values.sql`

---

**Status:** ✅ Pronto para aplicação  
**Aprovado por:** Samuel Dutra  
**Data:** 2025-11-15
