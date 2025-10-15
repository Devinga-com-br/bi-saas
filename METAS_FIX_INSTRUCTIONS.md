# Instruções para Corrigir o Módulo de Metas

## Problema Identificado

1. A coluna `situacao` na tabela `metas_mensais` está causando erro pois não é mais necessária
2. A data de referência deve sempre começar no primeiro dia do mês do ano anterior

## Solução Aplicada

### 1. Migration para Remover Coluna Situação

Execute o seguinte SQL no banco de dados para remover a coluna `situacao`:

```sql
-- Migration: Fix metas_mensais table - remove situacao column
-- Description: Remove the situacao column as it's not needed

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Remove situacao column if exists
    EXECUTE format('
      ALTER TABLE %I.metas_mensais 
      DROP COLUMN IF EXISTS situacao
    ', tenant_record.supabase_schema);
  END LOOP;
END $$;
```

### 2. Como Executar

Você pode executar a migration de duas formas:

#### Opção A: Usando Supabase Dashboard
1. Acesse seu projeto no Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo do arquivo `/supabase/migrations/025_fix_metas_table.sql`
4. Execute

#### Opção B: Via CLI (se tiver psql instalado)
```bash
psql "$DATABASE_URL" -f supabase/migrations/025_fix_metas_table.sql
```

### 3. Alterações Realizadas no Código

1. **Interface Meta** - Removida propriedade `situacao`
2. **Tabela de Metas** - Adicionada coluna "Venda Ref." para mostrar o valor de referência
3. **Função RPC** - Atualizada para não retornar mais a coluna `situacao`
4. **Filtragem** - Agora filtra apenas pelo mês selecionado (EXTRACT)

### 4. Resultado Esperado

Após aplicar as correções:

- ✅ A tabela exibe corretamente todas as metas do mês selecionado
- ✅ A coluna "Venda Ref." mostra o valor de vendas do ano anterior
- ✅ Não há mais erros de `diferenca_percentual`
- ✅ A listagem está filtrada apenas pelo mês/ano selecionado

### 5. Como Usar

1. Acesse **Metas > Meta Mensal**
2. Clique em **Cadastrar Meta**
3. Preencha:
   - **Mês**: Mês que deseja criar a meta (ex: Outubro)
   - **Ano**: Ano da meta (ex: 2025)
   - **Filial**: Selecione a filial
   - **Meta (%)**: Digite o percentual de crescimento (ex: 10 para 10%)
   - **Data de Referência Inicial**: Selecione a data do primeiro dia do mês do ano anterior (ex: 01/10/2024)
4. Clique em **Gerar Metas**
5. As metas serão geradas para todos os dias do mês selecionado

## Observações Importantes

- A data de referência sempre deve ser do mesmo mês e dia, mas do ano anterior
- Se você selecionar Outubro/2025, a data de referência inicial deve ser 01/10/2024
- O sistema irá gerar automaticamente as metas para todos os dias do mês
- Os valores de vendas do ano anterior serão buscados automaticamente da tabela `vendas_diarias_por_filial`
