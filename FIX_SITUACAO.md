# Fix: Erro "column situacao does not exist"

## Problema
A função RPC `get_metas_mensais_report` está retornando erro: `column "situacao" does not exist`

## Solução

### Passo 1: Execute o script de diagnóstico no console SQL do Supabase

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole e execute o conteúdo do arquivo `debug_situacao.sql`
4. Verifique a saída para confirmar se a coluna foi removida

### Passo 2: Se o erro persistir, execute este comando manualmente

```sql
-- Para cada schema de tenant, execute:
-- Substitua 'okilao' pelo nome do schema que está dando erro

ALTER TABLE okilao.metas_mensais DROP COLUMN IF EXISTS situacao CASCADE;
ALTER TABLE paraiso.metas_mensais DROP COLUMN IF EXISTS situacao CASCADE;
```

### Passo 3: Verifique as colunas da tabela

```sql
-- Listar colunas atuais da tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'metas_mensais'
  AND table_schema = 'okilao'
ORDER BY ordinal_position;
```

### Colunas esperadas (sem situacao):
- id
- filial_id
- data
- dia_semana
- meta_percentual
- data_referencia
- valor_referencia
- valor_meta
- valor_realizado
- diferenca
- diferenca_percentual
- created_at
- updated_at

## Verificação

Depois de executar os comandos acima:

1. Reinicie o servidor Next.js: `npm run dev`
2. Acesse o módulo de Metas: http://localhost:3000/metas/mensal
3. Verifique se o relatório carrega sem erros
