# Instruções: Módulo Descontos Venda

## 1. Executar SQL no Supabase

Execute o arquivo `CREATE_DESCONTOS_VENDA_FUNCTIONS.sql` no Supabase SQL Editor.

Este arquivo contém:
- ✅ `get_descontos_venda(p_schema)` - Lista descontos com nome da filial
- ✅ `insert_desconto_venda(...)` - Insere novo desconto
- ✅ `update_desconto_venda(...)` - Atualiza desconto existente
- ✅ `delete_desconto_venda(...)` - Deleta desconto
- ✅ Permissões para usuários autenticados

## 2. Verificar Exposed Schemas

Certifique-se que o schema do cliente (ex: `okilao`) está nos "Exposed schemas":
- Acesse Supabase Dashboard → Settings → API → Exposed schemas
- Adicione o schema se necessário

## 3. Correções Aplicadas

### Front-end
- ✅ Corrigido loop infinito no `useEffect`
- ✅ Dependências do `useCallback` ajustadas
- ✅ Toast de erro melhorado

### API Routes
- ✅ Todas as rotas usam RPC functions
- ✅ Schema passado corretamente como parâmetro
- ✅ Tratamento de erros de duplicate key

## 4. Funcionalidades do Módulo

O módulo permite:
- Listar descontos por data (mais recente primeiro)
- Lançar novo desconto (filial + data + valor)
- Editar desconto existente
- Excluir desconto
- Restrição: 1 desconto por filial por data (unique constraint)

## 5. Estrutura da Tabela

```sql
CREATE TABLE {schema}.descontos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id INTEGER NOT NULL,
  data_desconto DATE NOT NULL,
  valor_desconto NUMERIC(10,2) NOT NULL CHECK (valor_desconto >= 0),
  observacao TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NULL,
  UNIQUE (filial_id, data_desconto)
);
```

## 6. Próximos Passos

Após executar o SQL:
1. Reinicie o servidor Next.js
2. Acesse o módulo: `/descontos-venda`
3. Teste lançamento de desconto
4. Verifique edição e exclusão

## 7. Troubleshooting

### Erro: "Could not find table in schema cache"
- Verifique se o schema está nos Exposed Schemas
- Reinicie o Supabase

### Erro: "relation does not exist"
- Execute a migration para criar a tabela `descontos_venda`
- Execute o SQL das funções RPC

### Loop infinito
- Já corrigido no código do componente
