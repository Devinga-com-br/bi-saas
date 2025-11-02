# Correção: Erro "Unexpected token 'I', Internal S... is not valid JSON"

## Problema

O erro ocorre porque a função `get_dre_indicadores` ainda não foi criada no Supabase.

## Sintomas

```
Unexpected token 'I', "Internal S"... is not valid JSON
```

ou

```
Função get_dre_indicadores não encontrada no banco de dados
```

## Solução Rápida

### Passo 1: Execute a função SQL no Supabase

1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `EXECUTE_DRE_INDICADORES_FUNCTION.sql`
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 2: Verifique se a função foi criada

Execute no SQL Editor:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_dre_indicadores';
```

Deve retornar:
```
routine_name
-----------------
get_dre_indicadores
```

### Passo 3: Teste a função

```sql
-- Substitua 'okilao' pelo seu schema
SELECT * FROM get_dre_indicadores(
  'okilao',
  '2025-10-01'::date,
  '2025-10-31'::date,
  NULL
);
```

Deve retornar algo como:
```
receita_bruta | lucro_bruto | cmv       | total_transacoes
--------------+-------------+-----------+-----------------
9953127.13    | 2895714.72  | 7057412.41| 232545
```

### Passo 4: Limpe o cache e reinicie

```bash
# Pare o servidor (Ctrl+C)
rm -rf .next
npm run dev
```

## Conteúdo do SQL (se perdeu o arquivo)

```sql
CREATE OR REPLACE FUNCTION get_dre_indicadores(
    schema_name TEXT,
    p_data_inicio DATE,
    p_data_fim DATE,
    p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    receita_bruta NUMERIC,
    lucro_bruto NUMERIC,
    cmv NUMERIC,
    total_transacoes INTEGER
) AS $$
DECLARE
    filter_clause TEXT := '';
BEGIN
    -- Build filter clause for branches if provided
    IF p_filiais_ids IS NOT NULL AND array_length(p_filiais_ids, 1) > 0 THEN
        filter_clause := format('AND filial_id = ANY(ARRAY[%s]::TEXT[])', 
                               array_to_string(p_filiais_ids, ','));
    END IF;

    -- Execute dynamic query to get aggregated data
    RETURN QUERY EXECUTE format('
        SELECT 
            COALESCE(SUM(valor_total), 0)::NUMERIC as receita_bruta,
            COALESCE(SUM(total_lucro), 0)::NUMERIC as lucro_bruto,
            COALESCE(SUM(valor_total) - SUM(total_lucro), 0)::NUMERIC as cmv,
            COALESCE(SUM(total_transacoes), 0)::INTEGER as total_transacoes
        FROM %I.vendas_diarias_por_filial
        WHERE data_venda BETWEEN %L AND %L %s
    ', schema_name, p_data_inicio, p_data_fim, filter_clause);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dre_indicadores(TEXT, DATE, DATE, TEXT[]) TO authenticated;

COMMENT ON FUNCTION get_dre_indicadores IS 'Busca indicadores agregados de vendas para o DRE Gerencial com filtro opcional por filiais';
```

## Outras Causas Possíveis

### 1. Tabela vendas_diarias_por_filial não existe

Verifique se a tabela existe no schema:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'okilao' -- seu schema
  AND table_name = 'vendas_diarias_por_filial';
```

### 2. Permissões incorretas

```sql
-- Dar permissão novamente
GRANT EXECUTE ON FUNCTION get_dre_indicadores(TEXT, DATE, DATE, TEXT[]) TO authenticated;
```

### 3. Schema não exposto

Verifique em: Supabase Dashboard → Settings → API → Exposed schemas

O schema do tenant (ex: `okilao`) deve estar na lista.

## Logs Úteis

Após aplicar a correção, você verá nos logs:

```
[API/DRE-GERENCIAL] Fetching with params: {
  schema: 'okilao',
  requestedFilialId: 'all',
  finalFiliais: null,
  current: '2025-10-03 to 2025-11-01',
  pam: '2025-09-03 to 2025-10-02 (2025)',
  paa: '2024-10-03 to 2024-11-01 (2024)'
}
[API/DRE-GERENCIAL] Current data received: { receita_bruta: 9953127.13, ... }
```

## Ainda com Problemas?

1. Verifique o console do navegador (F12) para ver a mensagem de erro completa
2. Verifique os logs do servidor (`npm run dev`)
3. Confirme que executou o SQL no **schema correto**
4. Tente criar a função manualmente copiando o SQL acima

## Verificação Final

Se tudo estiver correto, você verá:
- ✅ 4 cards de indicadores com valores
- ✅ Comparações com PAM e PAA
- ✅ Tabela de despesas carregando
- ✅ Sem erros no console
