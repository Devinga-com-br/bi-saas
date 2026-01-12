# 🚨 DEPLOY URGENTE - Produtos Sem Vendas

## Passo 1: Atualizar Função RPC (OBRIGATÓRIO)

1. Abra Supabase Dashboard
2. Vá em **SQL Editor** (ícone na barra lateral)
3. Clique em **New Query**
4. Copie TODO o conteúdo do arquivo: **DEPLOY_FUNCTION_NOW.sql**
5. Cole no editor
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Deve mostrar "Success. No rows returned"

## Passo 2: Criar Índices (RECOMENDADO)

Para cada schema (saoluiz, okilao, paraiso, lucia), execute:

```sql
-- Exemplo para schema: saoluiz
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_sem_vendas
  ON saoluiz.produtos (filial_id, ativo, estoque_atual)
  WHERE ativo = true AND estoque_atual > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_curva
  ON saoluiz.produtos (curva_abcd, filial_id)
  WHERE ativo = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_ultima
  ON saoluiz.vendas (id_produto, filial_id, data_venda DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_hoje_ultima
  ON saoluiz.vendas_hoje_itens (produto_id, filial_id, data_extracao DESC)
  WHERE cancelado = false;
```

⚠️ **CONCURRENTLY**: Cria índice sem bloquear tabela (pode demorar alguns minutos)

## Passo 3: Testar

1. Recarregue a página: http://localhost:3000/relatorios/produtos-sem-vendas
2. Selecione uma filial
3. Clique em "Buscar"
4. Deve carregar em poucos segundos com paginação

## Verificar Se Funcionou

Logs esperados na API:
```
[API/PRODUTOS-SEM-VENDAS] Success: {
  count: 100,
  totalCount: 1523,
  offset: 0,
  limit: 100
}
```

## Troubleshooting

### Erro "Could not find the function"
→ Execute o DEPLOY_FUNCTION_NOW.sql novamente

### Ainda está lento
→ Crie os índices (Passo 2)

### Paginação não aparece
→ Limpe cache do navegador (Ctrl+Shift+R)
