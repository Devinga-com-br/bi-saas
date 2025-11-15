# 🚨 IMPORTANTE: Aplicar Fix do Dashboard

## Problema Identificado

O Dashboard está apresentando o erro:
```
{"error":"Error fetching dashboard data","details":"COALESCE could not convert type jsonb to json"}
```

## Solução

Foi criado um arquivo SQL que corrige o problema alterando o tipo de retorno de `JSONB` para `JSON` na função `get_dashboard_data`.

## Como Aplicar

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Copie todo o conteúdo do arquivo `/tmp/fix_dashboard_jsonb.sql`
6. Cole no editor SQL
7. Clique em **Run** (ou pressione Cmd/Ctrl + Enter)
8. Aguarde a confirmação de sucesso
9. Recarregue a página do Dashboard no seu navegador

### Opção 2: Via psql (se tiver acesso direto ao banco)

```bash
# Substitua com sua connection string
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" < /tmp/fix_dashboard_jsonb.sql
```

### Opção 3: Copiar e Executar Manualmente

Acesse o SQL Editor do Supabase e execute este comando:

```sql
DROP FUNCTION IF EXISTS public.get_dashboard_data(TEXT, DATE, DATE, TEXT[]);

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  schema_name TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  total_vendas NUMERIC,
  total_lucro NUMERIC,
  ticket_medio NUMERIC,
  margem_lucro NUMERIC,
  pa_vendas NUMERIC,
  pa_lucro NUMERIC,
  pa_ticket_medio NUMERIC,
  pa_margem_lucro NUMERIC,
  variacao_vendas_mes NUMERIC,
  variacao_lucro_mes NUMERIC,
  variacao_ticket_mes NUMERIC,
  variacao_margem_mes NUMERIC,
  variacao_vendas_ano NUMERIC,
  variacao_lucro_ano NUMERIC,
  variacao_ticket_ano NUMERIC,
  variacao_margem_ano NUMERIC,
  ytd_vendas NUMERIC,
  ytd_vendas_ano_anterior NUMERIC,
  ytd_variacao_percent NUMERIC,
  grafico_vendas JSON,  -- ← MUDOU DE JSONB PARA JSON
  reserved TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- ... (resto da função permanece igual)
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data(TEXT, DATE, DATE, TEXT[]) TO anon, authenticated, service_role;
```

*(O arquivo completo está em `/tmp/fix_dashboard_jsonb.sql`)*

## Como Verificar se Funcionou

1. Abra o Dashboard: `http://localhost:3000/dashboard`
2. Se não houver mais o erro de COALESCE, está funcionando! ✅
3. Verifique se os cards estão carregando os valores
4. Teste trocar os filtros (Mês, Ano, Período Customizado)

## O Que Foi Alterado

### Antes (com erro)
```sql
RETURNS TABLE (
  ...
  grafico_vendas JSONB,  -- ❌ Causava erro
  ...
)
...
v_grafico_vendas JSONB := '[]'::JSONB;
...
jsonb_agg(jsonb_build_object(...))
```

### Depois (corrigido)
```sql
RETURNS TABLE (
  ...
  grafico_vendas JSON,  -- ✅ Corrigido
  ...
)
...
v_grafico_vendas JSON := '[]'::JSON;
...
json_agg(json_build_object(...))
```

## Alterações Implementadas no Dashboard

Além do fix, as seguintes melhorias foram implementadas:

### ✅ Novos Filtros
- **Filtrar por**: Mês | Ano | Período Customizado
- **Largura do filtro de filiais**: 600px (desktop)
- **Largura do "Filtrar por"**: 250px (fixo)

### ✅ Cards Renomeados
- ~~Total de Vendas~~ → **Receita Bruta** (text-lg)
- ~~Total de Lucro~~ → **Lucro Bruto** (text-lg)
- ~~Margem de Lucro~~ → **Margem Bruta** (text-lg)
- ~~Total Vendas (Acum. Ano)~~ → **Removido**

### ✅ Comparação Inteligente
- **Ano Completo**: Mostra ano anterior (ex: "2024")
- **Mês Completo**: Mostra mês anterior (ex: "Out/2024")
- **Período Qualquer**: Mostra "PA"

### ✅ YTD (Year-to-Date)
- Aparece **apenas quando**:
  - Filtro = Ano completo
  - E ano selecionado = ano atual
- Compara período do ano atual com mesmo período do ano anterior
- Exemplo: Se hoje é 15/11/2025, compara 01/01/2025-15/11/2025 com 01/01/2024-15/11/2024

## Documentação

- **Resumo Completo**: `docs/modules/dashboard/FILTER_UPDATE_FINAL.md`
- **Regras de Negócio**: `docs/modules/dashboard/BUSINESS_RULES.md`
- **Arquivo SQL**: `/tmp/fix_dashboard_jsonb.sql`

## Suporte

Se o erro persistir após aplicar o fix:

1. Verifique se a função foi criada: 
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_dashboard_data';
   ```

2. Verifique os logs do Supabase no Dashboard

3. Limpe o cache do navegador (Cmd/Ctrl + Shift + R)

4. Verifique se o schema está nos "Exposed schemas" (Settings → API → Exposed schemas)

---

**Data**: 2025-11-15  
**Versão**: 2.0.0  
**Status**: ⚠️ Aguardando aplicação do SQL fix
