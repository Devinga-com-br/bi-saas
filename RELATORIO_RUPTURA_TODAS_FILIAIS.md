# Implementação: Todas as Filiais no Relatório de Ruptura ABCD

## Alterações Realizadas

### 1. Frontend (`src/app/(dashboard)/relatorios/ruptura-abcd/page.tsx`)

#### Adicionado:
- Nova opção "Todas as Filiais" no select de filiais
- Helper `todasFiliais` para verificar se todas as filiais estão selecionadas
- Coluna "Filial" na tabela quando "Todas as Filiais" está selecionada
- Campo `filial_nome` no tipo `Produto`
- Suporte na exportação PDF para incluir coluna de filial quando necessário
- PDF em modo landscape quando "Todas as Filiais" está selecionado

#### Comportamento:
- Quando "Todas as Filiais" está selecionada, não envia `filial_id` para a API
- A API retorna produtos de todas as filiais
- Mostra o nome da filial em uma coluna adicional na tabela
- Os produtos são agrupados por departamento e ordenados por filial dentro de cada departamento

### 2. API Route (`src/app/api/relatorios/ruptura-abcd/route.ts`)

#### Atualizado:
- Tipo de retorno para incluir `filial_nome`
- Suporte para buscar de todas as filiais quando `filial_id` não é fornecido

### 3. Database Migration (`supabase/migrations/031_add_filial_nome_to_ruptura.sql`)

#### Criado:
- Nova versão da função `get_ruptura_abcd_report` que:
  - Retorna o nome da filial (`filial_nome`) através de JOIN com a tabela `branches`
  - Inclui informações de filial de transferência (`filial_transfer_id`, `filial_transfer_nome`, `estoque_transfer`)
  - Ordena resultados por departamento, filial e produto
  - Mantém compatibilidade com filtro por filial específica

## Como Usar

1. **Aplicar Migration no Supabase**:
   - Acesse o Supabase SQL Editor: https://supabase.com/dashboard/project/awxrwxuzlixgdpmsybzj/sql
   - Execute o arquivo `supabase/migrations/045_fix_ruptura_filial_nome_type.sql`
   - Ou copie o conteúdo de `/tmp/apply_migration.sql`

2. **Testar Localmente**:
   ```bash
   npm run dev
   ```

3. **Acessar o Relatório**:
   - Navegue para `/relatorios/ruptura-abcd`
   - Selecione "Todas as Filiais" no filtro de filiais
   - A tabela mostrará uma coluna adicional com o nome da filial para cada produto

## Correções Aplicadas

### Migration 045
- **Problema**: Erro de tipo `VARCHAR` vs `TEXT` no retorno da função
- **Solução**: Cast explícito de `branches.descricao::TEXT` para garantir compatibilidade
- **JOIN**: Corrigido para usar `filial_id::TEXT = branch_code` (conversão de BIGINT para VARCHAR)

## Recursos

- ✅ Visualização de produtos em ruptura de todas as filiais simultaneamente
- ✅ Coluna adicional mostrando qual filial cada produto pertence
- ✅ Agrupamento por departamento mantido
- ✅ Ordenação por filial dentro de cada departamento
- ✅ Exportação PDF com suporte a todas as filiais (formato landscape)
- ✅ Mantém compatibilidade com filtro por filial específica

## Observações

- Quando "Todas as Filiais" está selecionada, o PDF é gerado em orientação landscape para acomodar a coluna adicional
- A função RPC foi atualizada para incluir JOINs necessários com a tabela `branches`
- O desempenho pode ser afetado ao buscar todas as filiais com grande volume de dados
