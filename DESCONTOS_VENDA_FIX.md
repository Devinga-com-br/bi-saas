# Fix: Módulo Descontos de Venda

## Problema Identificado

O erro "column reference 'id' is ambiguous" ocorria porque:

1. A função RPC `get_descontos_venda` não existia ou estava mal configurada
2. Quando há JOIN entre tabelas com colunas de mesmo nome (ex: `descontos_venda.id` e `branches.id`), é necessário qualificar as colunas

## Solução Aplicada

### 1. Arquivo SQL Criado: `FIX_DESCONTOS_VENDA_RPC.sql`

Este arquivo contém as 4 funções RPC necessárias:

- **`get_descontos_venda(p_schema)`**: Lista descontos com nome da filial
- **`insert_desconto_venda(...)`**: Insere novo desconto
- **`update_desconto_venda(...)`**: Atualiza desconto existente  
- **`delete_desconto_venda(...)`**: Remove desconto

### 2. Correção do Problema de "id" Ambíguo

Na função `get_descontos_venda`, todas as colunas foram qualificadas:
```sql
SELECT 
  d.id,              -- Qualificado com 'd.'
  d.filial_id,
  b.nome as filial_nome,  -- JOIN com branches
  d.data_desconto,
  d.valor_desconto,
  d.observacao,
  d.created_at,
  d.updated_at
FROM %I.descontos_venda d
LEFT JOIN public.branches b ON b.id = d.filial_id
```

### 3. Tratamento de Erros

Cada função RPC tem tratamento específico:
- **unique_violation**: Quando tenta inserir desconto duplicado (mesma filial + data)
- **OTHERS**: Captura qualquer outro erro e retorna mensagem clara

## Como Aplicar

### Passo 1: Executar SQL no Supabase
```bash
# Copie o conteúdo do arquivo FIX_DESCONTOS_VENDA_RPC.sql
# Cole no SQL Editor do Supabase Dashboard
# Execute o script
```

### Passo 2: Verificar Permissões
As funções RPC já incluem GRANT para `authenticated`, mas verifique:
```sql
-- Verificar se funções foram criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%desconto_venda%';
```

### Passo 3: Testar Módulo
1. Acesse `/descontos-venda`
2. Tente carregar a lista (não deve mais entrar em loop)
3. Tente lançar um desconto
4. Tente editar um desconto
5. Tente excluir um desconto

## Causa do Loop Infinito

O loop de requisições acontecia porque:
1. O componente tentava carregar os descontos
2. A API retornava erro (função RPC não existia)
3. O componente re-tentava automaticamente
4. Ciclo se repetia infinitamente

Com as funções RPC criadas, a API retorna sucesso e o loop para.

## Arquitetura do Módulo

```
Frontend (page.tsx)
    ↓
API Routes (/api/descontos-venda/route.ts)
    ↓
RPC Functions (no Supabase)
    ↓
Schema Tables (okilao.descontos_venda, saoluiz.descontos_venda, etc)
    ↓
public.branches (JOIN para pegar nome da filial)
```

## Observações Importantes

1. **Schema por Cliente**: Cada cliente tem seu próprio schema (okilao, saoluiz, etc)
2. **Branches em public**: A tabela de filiais está no schema `public` e é compartilhada
3. **RPC Security**: Funções marcadas como `SECURITY DEFINER` para executar com permissões elevadas
4. **Validações**: Constraints da tabela previnem valores negativos e duplicatas

## Próximos Passos

Após aplicar o fix:
- [ ] Executar SQL no Supabase
- [ ] Verificar se funções foram criadas
- [ ] Testar todas as operações (listar, criar, editar, excluir)
- [ ] Verificar se o loop parou
- [ ] Testar em diferentes schemas/clientes
