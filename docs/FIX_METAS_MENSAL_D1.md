# Correção do Cálculo de Meta no Card "Vendas do Período"

## Problema Identificado

No módulo **Metas/Mensal**, o card "Vendas do Período" apresentava uma inconsistência:

- **Valor Realizado**: Calculado até **D-1** (dia anterior)
- **Valor Meta**: Calculado até **D** (dia atual)

Isso resultava em uma comparação injusta, pois a meta incluía o dia atual, mas as vendas não.

### Exemplo do Problema

Cenário em 05/11/2025:
- **Realizado**: R$ 100.000 (soma de 01/11 até 04/11)
- **Meta**: R$ 125.000 (soma de 01/11 até 05/11) ❌ Inclui hoje!
- **Percentual**: 80% ❌ Incorreto!

**Deveria ser:**
- **Realizado**: R$ 100.000 (soma de 01/11 até 04/11)
- **Meta**: R$ 100.000 (soma de 01/11 até 04/11) ✅ Até D-1
- **Percentual**: 100% ✅ Correto!

## Causa Raiz

Na função `get_metas_mensais_report` (arquivo [APPLY_DISCOUNT_METAS_REPORT.sql](../APPLY_DISCOUNT_METAS_REPORT.sql)):

```sql
-- Linhas 172-173 (SEM filial específica)
WHERE mm.data >= $1 AND mm.data <= $2
  AND mm.data <= CURRENT_DATE  -- ❌ Inclui hoje!

-- Linhas 201-203 (COM filial específica)
WHERE mm.data >= $1 AND mm.data <= $2
  AND mm.filial_id = $3
  AND mm.data <= CURRENT_DATE  -- ❌ Inclui hoje!
```

O problema é que `CURRENT_DATE` é o dia de hoje, mas as vendas só são registradas até o dia anterior (D-1).

## Solução Implementada

### Mudança Principal

Alterado o filtro de data para usar **D-1** em vez de **D**:

```sql
-- Nova variável para data limite
v_data_limite := CURRENT_DATE - interval '1 day';

-- Uso correto nos filtros
WHERE mm.data >= $1 AND mm.data <= $2
  AND mm.data <= $3  -- ✅ Agora usa v_data_limite (D-1)
```

### Arquivo de Correção

**Arquivo**: [FIX_METAS_REPORT_D1.sql](../FIX_METAS_REPORT_D1.sql)

**Principais mudanças**:

1. **Nova variável** (linha 29):
   ```sql
   v_data_limite := CURRENT_DATE - interval '1 day';
   ```

2. **Filtros atualizados** em vendas, descontos e metas:
   ```sql
   -- Em vez de: AND v.data_venda <= CURRENT_DATE
   AND v.data_venda <= $3  -- Usa v_data_limite

   -- Em vez de: AND mm.data <= CURRENT_DATE
   AND mm.data <= $3  -- Usa v_data_limite
   ```

3. **Parâmetros ajustados** nas chamadas EXECUTE:
   ```sql
   -- SEM filial
   USING v_data_inicio, v_data_fim, v_data_limite

   -- COM filial
   USING v_data_inicio, v_data_fim, v_data_limite, p_filial_id
   ```

## Como Aplicar a Correção

### Passo 1: Executar no Supabase SQL Editor

1. Abra o Supabase SQL Editor
2. Cole o conteúdo de [FIX_METAS_REPORT_D1.sql](../FIX_METAS_REPORT_D1.sql)
3. Execute o script
4. Aguarde confirmação de sucesso

### Passo 2: Verificar a Correção

Execute o teste:

```sql
-- Testar a função corrigida
SELECT get_metas_mensais_report(
  'seu_schema',  -- schema do tenant
  11,            -- mês (novembro)
  2025,          -- ano
  NULL           -- todas as filiais
);
```

Verifique se o `total_meta` agora está alinhado com o período de `total_realizado`.

### Passo 3: Validar no Frontend

1. Acesse **Metas > Mensal**
2. Observe o card "Vendas do Período"
3. Verifique se:
   - **Total Realizado** e **Meta** estão no mesmo período
   - **Percentual Atingido** faz sentido

## Resultado Esperado

### Antes da Correção
```json
{
  "total_realizado": 100000.00,
  "total_meta": 125000.00,
  "percentual_atingido": 80.00
}
```
❌ Meta inclui dia de hoje

### Depois da Correção
```json
{
  "total_realizado": 100000.00,
  "total_meta": 100000.00,
  "percentual_atingido": 100.00
}
```
✅ Meta até D-1, alinhada com realizado

## Impacto

### Módulos Afetados
- ✅ **Metas/Mensal** - Card "Vendas do Período"
- ✅ API `/api/metas/report`
- ✅ Função RPC `get_metas_mensais_report`

### Módulos NÃO Afetados
- ❌ **Metas/Setor** - Usa função diferente (`get_metas_setor_report`)
- ❌ **Dashboard** - Usa queries próprias
- ❌ **DRE** - Não usa esta função

## Observações Importantes

1. **Timezone**: A função usa `CURRENT_DATE` do servidor PostgreSQL
2. **Dias futuros**: Metas de dias futuros continuam sendo exibidas na tabela, mas não são contabilizadas no total
3. **Atualização automática**: No próximo dia, o cálculo incluirá o dia anterior automaticamente

## Troubleshooting

### Problema: Total ainda está errado após aplicar

**Possível causa**: Cache do navegador ou API

**Solução**:
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se a função foi atualizada:
   ```sql
   SELECT prosrc
   FROM pg_proc
   WHERE proname = 'get_metas_mensais_report';
   ```
3. Force reload do PostgREST:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

### Problema: Erro ao executar o script

**Possível causa**: Permissões insuficientes

**Solução**:
- Execute como superusuário ou com role que tenha `CREATE FUNCTION`
- Ou use o Service Role Key no Supabase Dashboard

## Arquivos Relacionados

- ✅ [FIX_METAS_REPORT_D1.sql](../FIX_METAS_REPORT_D1.sql) - Script de correção
- 📄 [APPLY_DISCOUNT_METAS_REPORT.sql](../APPLY_DISCOUNT_METAS_REPORT.sql) - Versão antiga (referência)
- 📄 [src/app/api/metas/report/route.ts](../src/app/api/metas/report/route.ts) - API que usa a função
- 📄 [src/app/(dashboard)/metas/mensal/page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx) - Interface
