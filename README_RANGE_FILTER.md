# ✅ Range de Dias - Produtos Sem Vendas

## Mudança Implementada

**Antes:** Campo único "Dias sem vendas" (ex: 30 dias)
**Depois:** Range com mínimo e máximo (ex: Entre 15 e 90 dias)

## Arquivos Modificados

### Frontend
- `src/app/(dashboard)/relatorios/produtos-sem-vendas/page.tsx`
  - ✅ Dois campos: `diasSemVendasMin` (15) e `diasSemVendasMax` (90)
  - ✅ Grid mudou de 3 para 4 colunas (Filiais, Min, Max, Curva)
  - ✅ Parâmetros enviados: `dias_sem_vendas_min` e `dias_sem_vendas_max`

### Backend  
- `src/app/api/relatorios/produtos-sem-vendas/route.ts`
  - ✅ Aceita `dias_sem_vendas_min` e `dias_sem_vendas_max`
  - ✅ Envia para RPC function

### SQL Function
- `DEPLOY_FUNCTION_RANGE.sql`
  - ✅ Parâmetros: `p_dias_sem_vendas_min` (default 15), `p_dias_sem_vendas_max` (default 90)
  - ✅ Lógica: Produtos com última venda ENTRE as datas limites
  - ✅ Cálculo: 
    - `data_limite_min = data_ref - dias_max` (mais antiga)
    - `data_limite_max = data_ref - dias_min` (mais recente)
  - ✅ WHERE: `ultima_venda >= data_limite_min AND ultima_venda <= data_limite_max`

## Deploy

### 1. Atualizar Função SQL

Execute no Supabase SQL Editor:
```sql
-- Copie DEPLOY_FUNCTION_RANGE.sql
```

### 2. Testar

1. Recarregue a página
2. Veja os dois campos:
   - "Dias sem vendas (Mínimo)" - Default: 15
   - "Dias sem vendas (Máximo)" - Default: 90
3. Selecione uma filial
4. Clique em "Buscar"
5. Deve mostrar produtos sem vendas entre 15 e 90 dias

## Exemplos de Uso

### Produtos parados recentemente (15-30 dias)
- Mínimo: 15
- Máximo: 30
- **Resultado:** Produtos que pararam de vender nas últimas 2 semanas a 1 mês

### Produtos parados há muito tempo (90-180 dias)
- Mínimo: 90
- Máximo: 180
- **Resultado:** Produtos sem vendas há 3 a 6 meses

### Todos produtos parados (1-365 dias)
- Mínimo: 1
- Máximo: 365
- **Resultado:** Qualquer produto sem venda no último ano

## Lógica do Range

```
Data Referência: 2026-01-11
Mínimo: 15 dias
Máximo: 90 dias

Cálculo:
- data_limite_max = 2026-01-11 - 15 = 2025-12-27 (mais recente)
- data_limite_min = 2026-01-11 - 90 = 2025-10-13 (mais antiga)

Produtos retornados:
- Última venda entre 2025-10-13 e 2025-12-27
- OU nunca vendeu (se min <= 9999)
```

## Vantagens

1. **Mais Flexível:** Usuário escolhe exatamente o período
2. **Análise Segmentada:** Pode ver produtos recentes vs antigos
3. **Melhor UX:** Fica claro que é um range, não um valor fixo
4. **Default Útil:** 15-90 dias é um range prático

## Build Status

✅ Código compilado sem erros
⏳ Aguardando deploy da função SQL no Supabase
