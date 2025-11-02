# DRE Gerencial - Implementação Completa

## Resumo das Correções

### 1. Filtro "Todas as Filiais" Duplicado ✅
**Problema:** O filtro mostrava "Todas as Filiais" duas vezes
**Solução:** Removido o SelectItem manual, pois o hook `useBranchesOptions` já inclui essa opção

### 2. Erro de Compilação JSX ✅
**Problema:** Tag `</Card>` duplicada na linha 613 causava erro de parsing
**Solução:** Removida a tag extra

### 3. Valores dos Indicadores Zerados ✅
**Problema:** Cards de indicadores não carregavam valores
**Causa:** 
- Interface usava campos incorretos (`total_venda`, `lucro_bruto`)
- Função antiga retornava campos diferentes (`total_vendas`, `total_lucro`)
- Cálculo de CMV estava incorreto

**Solução:**
1. **Nova função SQL criada**: `get_dre_indicadores`
   - Busca dados diretamente da tabela `vendas_diarias_por_filial`
   - Retorna: `receita_bruta`, `lucro_bruto`, `cmv`, `total_transacoes`
   - Suporta filtro por múltiplas filiais
   - Agrega dados corretamente quando "Todas as Filiais" selecionado

2. **API atualizada** (`/api/dre-gerencial/indicadores/route.ts`)
   - Usa nova função `get_dre_indicadores`
   - Busca 3 períodos: atual, PAM (mês anterior), PAA (ano anterior)
   - Logs detalhados para debugging

3. **Frontend atualizado** (`page.tsx`)
   - Interface corrigida para usar `receita_bruta`, `lucro_bruto`, `cmv`
   - Mês padrão alterado para mês anterior (dados mais confiáveis)
   - Logs de processamento

### 4. Período Padrão Ajustado ✅
**Mudança:** Filtro agora inicia no mês anterior por padrão
**Motivo:** Evitar buscar dados do mês atual que ainda não está completo

## Como Executar

### Passo 1: Criar a Função no Supabase
Execute o arquivo `EXECUTE_DRE_INDICADORES_FUNCTION.sql` no Supabase SQL Editor

```sql
-- A função já está pronta em: EXECUTE_DRE_INDICADORES_FUNCTION.sql
-- Copie e cole no SQL Editor do Supabase
```

### Passo 2: Testar a Função (Opcional)
```sql
-- Teste com todas as filiais
SELECT * FROM get_dre_indicadores('okilao', '2025-10-01', '2025-10-31', NULL);

-- Teste com filiais específicas
SELECT * FROM get_dre_indicadores('okilao', '2025-10-01', '2025-10-31', ARRAY['1', '4']);
```

### Passo 3: Deploy da Aplicação
```bash
npm run build
npm start
# ou deploy no Vercel
```

## Estrutura de Dados

### Resposta da API
```typescript
{
  current: {
    receita_bruta: 9953127.12,
    lucro_bruto: 2895714.72,
    cmv: 7057412.40
  },
  pam: {
    data: { receita_bruta, lucro_bruto, cmv },
    ano: 2025
  },
  paa: {
    data: { receita_bruta, lucro_bruto, cmv },
    ano: 2024
  }
}
```

### Cards de Indicadores
1. **Receita Bruta**: Soma de `valor_total` das vendas
2. **CMV (Custo Mercadoria Vendida)**: `receita_bruta - lucro_bruto`
3. **Lucro Bruto**: Soma de `total_lucro` das vendas
4. **Margem Bruta**: `(lucro_bruto / receita_bruta) * 100`

Cada card mostra:
- Valor atual
- Comparação com PAM (Período Anterior do Mesmo tipo)
- Comparação com PAA (Período Anterior do Ano anterior)
- Variação percentual

## Filtros

### Filial
- **Todas as Filiais**: Agrega dados de todas as filiais
- **Filial específica**: Mostra dados apenas da filial selecionada

### Mês/Ano
- Seleciona o período de comparação
- Padrão: mês anterior
- Busca automaticamente PAM e PAA

### Período (PeriodFilter)
- Usado para buscar despesas
- Independente do filtro de Mês/Ano
- Padrão: último mês

## Logs de Debug

Os logs mostram:
```
[API/DRE-GERENCIAL] Fetching with params: { schema, requestedFilialId, finalFiliais, periodo }
[API/DRE-GERENCIAL] Current data received: { receita_bruta, lucro_bruto, cmv }
[API/DRE-GERENCIAL] PAM data received: ...
[API/DRE-GERENCIAL] PAA data received: ...
[DRE Frontend] Buscando indicadores com: { filialId, mes, ano }
[DRE Frontend] Resultado recebido: ...
[DRE Frontend] Processando indicadores: { receitaBruta, lucroBruto, cmv }
```

## Arquivos Modificados

1. ✅ `/src/app/(dashboard)/dre-gerencial/page.tsx`
   - Filtro duplicado removido
   - Interfaces atualizadas
   - Mês padrão ajustado
   - Logs adicionados

2. ✅ `/src/app/api/dre-gerencial/indicadores/route.ts`
   - Nova função `get_dre_indicadores`
   - Logs detalhados
   - Retorno padronizado

3. ✅ `/src/lib/audit.ts`
   - Adicionado 'dre-gerencial' ao tipo AuditModule

4. ✅ `/supabase/migrations/073_create_dre_indicadores_function.sql`
   - Nova função SQL

5. ✅ `EXECUTE_DRE_INDICADORES_FUNCTION.sql`
   - SQL pronto para executar no Supabase

## Próximos Passos (Opcional)

1. **Calcular Lucro Líquido**: Subtrair despesas do lucro bruto
2. **Adicionar mais indicadores**: Margem líquida, EBITDA, etc.
3. **Gráficos de tendência**: Mostrar evolução ao longo do tempo
4. **Exportar para PDF/Excel**: Funcionalidade de exportação

## Troubleshooting

### Indicadores aparecem zerados
1. Verifique se a função `get_dre_indicadores` foi criada no Supabase
2. Verifique se há dados em `vendas_diarias_por_filial` para o período
3. Confira os logs no terminal para ver os dados retornados

### Erro PGRST106
- A função precisa ser criada em todos os schemas
- Execute o SQL em cada schema de tenant

### Dados não somam quando "Todas as Filiais"
- Verifique se `finalFiliais` está NULL (logs mostram isso)
- NULL = todas as filiais (comportamento correto)
- Array = filiais específicas
