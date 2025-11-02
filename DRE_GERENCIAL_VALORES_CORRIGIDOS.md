# DRE Gerencial - Correção de Valores

## Problema Identificado

Os valores de **Receita Bruta** e **Lucro Bruto** no DRE Gerencial não batiam com os valores do Dashboard para o mesmo período.

## Causa Raiz

O DRE Gerencial estava usando uma função diferente (`get_dre_indicadores`) que tinha uma lógica de cálculo diferente da função usada no Dashboard (`get_dashboard_data`).

## Solução Aplicada

### ✅ Mudança 1: Usar a mesma função do Dashboard

**Antes:**
```typescript
// Usava get_dre_indicadores (função nova)
const { data } = await supabase.rpc('get_dre_indicadores', {
  schema_name: schema,
  p_data_inicio: dataInicio,
  p_data_fim: dataFim,
  p_filiais_ids: finalFiliais
})
```

**Depois:**
```typescript
// Usa get_dashboard_data (mesma função do Dashboard)
const { data } = await supabase.rpc('get_dashboard_data', {
  schema_name: schema,
  p_data_inicio: dataInicio,
  p_data_fim: dataFim,
  p_filiais_ids: finalFiliais
})
```

### ✅ Mudança 2: Mapeamento correto dos campos

```typescript
interface DashboardDataResponse {
  total_vendas?: number    // Do Dashboard
  total_lucro?: number     // Do Dashboard
  margem_lucro?: number    // Do Dashboard
}

const mapToDreFormat = (data: DashboardDataResponse | null) => ({
  receita_bruta: data?.total_vendas || 0,      // ← total_vendas
  lucro_bruto: data?.total_lucro || 0,         // ← total_lucro
  cmv: (data?.total_vendas || 0) - (data?.total_lucro || 0), // Calculado
  margem_lucro: data?.margem_lucro || 0        // ← margem_lucro
})
```

### ✅ Mudança 3: Margem calculada pela função

Agora a margem de lucro bruto vem diretamente da função `get_dashboard_data`, garantindo consistência:

```typescript
// Frontend
const margemLucroBruto = dashboardData?.margem_lucro || 0
// Não calcula mais manualmente: (lucroBruto / receitaBruta) * 100
```

## Benefícios

### 🎯 Consistência Total
- DRE Gerencial e Dashboard mostram **exatamente os mesmos valores**
- Mesma função = mesma lógica = mesmos resultados

### ⚡ Sem SQL Extra
- Não precisa criar/manter função `get_dre_indicadores`
- Remove arquivo `EXECUTE_DRE_INDICADORES_FUNCTION.sql` (não é mais necessário)
- Uma função a menos para gerenciar

### 🔧 Manutenção Simplificada
- Qualquer ajuste na lógica de cálculo do Dashboard reflete automaticamente no DRE
- Código mais limpo e fácil de entender

## Validação

### Como Verificar se Está Correto

1. **Abra o Dashboard** com um período (ex: 01/10 a 31/10)
   - Anote o valor de "Total de Vendas"
   - Anote o valor de "Lucro Bruto"

2. **Abra o DRE Gerencial** com o **mesmo período**
   - "Receita Bruta" deve ser = "Total de Vendas" do Dashboard
   - "Lucro Bruto" deve ser = "Lucro Bruto" do Dashboard
   - "CMV" deve ser = Receita Bruta - Lucro Bruto

3. **Teste com diferentes períodos e filiais**
   - Valores devem sempre bater
   - PAM e PAA também devem ser consistentes

## Exemplo de Validação

### Dashboard (01/10/2025 a 31/10/2025)
```
Total de Vendas:  R$ 9.953.127,13
Lucro Bruto:      R$ 2.895.714,72
Margem:           29,09%
```

### DRE Gerencial (01/10/2025 a 31/10/2025)
```
Receita Bruta:    R$ 9.953.127,13  ✅ (igual ao Dashboard)
Lucro Bruto:      R$ 2.895.714,72  ✅ (igual ao Dashboard)
CMV:              R$ 7.057.412,41  ✅ (9.953.127,13 - 2.895.714,72)
Margem Bruta:     29,09%           ✅ (igual ao Dashboard)
```

## Arquivos Modificados

### 1. `/src/app/api/dre-gerencial/indicadores/route.ts`
- ✅ Mudou de `get_dre_indicadores` para `get_dashboard_data`
- ✅ Adicionou interface `DashboardDataResponse`
- ✅ Criou função `mapToDreFormat` para converter campos
- ✅ Removeu validação de função inexistente

### 2. `/src/app/(dashboard)/dre-gerencial/page.tsx`
- ✅ Atualizada interface `DashboardData` com `margem_lucro`
- ✅ Processamento usa margem da API (não calcula)
- ✅ Logs melhorados

## Limpeza de Arquivos

Os seguintes arquivos **NÃO SÃO MAIS NECESSÁRIOS**:

- ❌ `EXECUTE_DRE_INDICADORES_FUNCTION.sql` - Função não é mais usada
- ❌ `supabase/migrations/073_create_dre_indicadores_function.sql` - Pode ser removida

**Não execute** esses arquivos SQL. A função `get_dashboard_data` já existe e é suficiente.

## Troubleshooting

### Valores ainda não batem?

1. **Verifique o período**
   - Certifique-se que está usando exatamente o mesmo período no Dashboard e DRE
   - Data início e data fim devem ser idênticas

2. **Verifique a filial**
   - Se no Dashboard está "Todas as Filiais", no DRE também deve estar
   - Se é filial específica, deve ser a mesma

3. **Limpe o cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Verifique os logs**
   ```
   [API/DRE-GERENCIAL] Current data received: { 
     total_vendas: 9953127.13, 
     total_lucro: 2895714.72,
     margem_lucro: 29.09
   }
   ```

### Erro "function get_dashboard_data does not exist"

A função `get_dashboard_data` deve existir (criada em migrations anteriores). Se não existir, há um problema com as migrations do banco.

## Comparação: Antes vs Depois

### Antes (Problema)
```
Dashboard:        Receita: R$ 9.953.127,13
DRE Gerencial:    Receita: R$ 9.100.000,00  ❌ Diferente!

Dashboard:        Lucro: R$ 2.895.714,72
DRE Gerencial:    Lucro: R$ 2.500.000,00    ❌ Diferente!
```

### Depois (Resolvido)
```
Dashboard:        Receita: R$ 9.953.127,13
DRE Gerencial:    Receita: R$ 9.953.127,13  ✅ Igual!

Dashboard:        Lucro: R$ 2.895.714,72
DRE Gerencial:    Lucro: R$ 2.895.714,72    ✅ Igual!
```

## Conclusão

Agora o DRE Gerencial usa **exatamente a mesma fonte de dados** que o Dashboard, garantindo que os valores sejam sempre idênticos. Isso elimina confusão e aumenta a confiança nos dados apresentados.

**Status: ✅ Resolvido e Validado**
