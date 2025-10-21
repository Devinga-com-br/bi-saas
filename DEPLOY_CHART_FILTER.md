# 🚀 Deploy - Filtro de Filiais no Gráfico de Vendas

## ⚡ Quick Start

Para aplicar a correção de segurança do gráfico de vendas mensais:

### Opção 1: Deploy via Supabase CLI (Recomendado)

```bash
# Fazer push da migration para produção
npx supabase db push

# Ou para ambiente específico
npx supabase db push --project-ref your-project-ref
```

### Opção 2: Aplicar Manualmente no Supabase Dashboard

1. Acesse o **SQL Editor** do Supabase
2. Abra o arquivo `supabase/migrations/071_add_filiais_filter_to_sales_chart.sql`
3. Copie e cole todo o conteúdo
4. Execute a query

---

## ✅ Verificação Pós-Deploy

Após aplicar a migration, verifique se funcionou:

### 1. Testar a Função SQL

No SQL Editor do Supabase:

```sql
-- Testar sem filtro (deve retornar todas as filiais)
SELECT * FROM get_sales_by_month_chart('seu_schema_tenant', NULL);

-- Testar com filtro de 1 filial
SELECT * FROM get_sales_by_month_chart('seu_schema_tenant', '1');

-- Testar com filtro de múltiplas filiais
SELECT * FROM get_sales_by_month_chart('seu_schema_tenant', '1,2,3');
```

### 2. Testar no Dashboard

1. Acesse o dashboard com um usuário **SEM restrições**
   - Deve ver vendas de TODAS as filiais

2. Acesse o dashboard com um usuário COM restrição (ex: apenas Filial 01)
   - Deve ver apenas vendas da Filial 01
   - Valores devem ser menores que o total geral

3. Compare os valores do gráfico com outros relatórios
   - Devem bater com "Vendas por Filial"
   - Devem bater com "Metas Diárias"

---

## 🐛 Troubleshooting

### Erro: "function get_sales_by_month_chart(text, text) does not exist"

**Causa**: Migration não foi aplicada ou aplicada em schema errado

**Solução**:
```sql
-- Verificar se a função existe
SELECT routine_name, routine_schema 
FROM information_schema.routines 
WHERE routine_name = 'get_sales_by_month_chart';

-- Se não existir, execute a migration manualmente
```

### Gráfico ainda mostra todas as filiais

**Causa**: Cache do navegador

**Solução**:
1. Limpar cache do navegador
2. Fazer hard refresh (Ctrl+Shift+R ou Cmd+Shift+R)
3. Verificar logs da API no console do navegador

### Erro de permissão

**Causa**: Usuário do Supabase não tem permissão SECURITY DEFINER

**Solução**:
```sql
-- Garantir que a função foi criada como SECURITY DEFINER
ALTER FUNCTION get_sales_by_month_chart(TEXT, TEXT) SECURITY DEFINER;
```

---

## 📋 Checklist Final

Antes de considerar concluído:

- [ ] Migration aplicada com sucesso no banco
- [ ] Função SQL testada diretamente
- [ ] Usuário sem restrições vê todas as filiais
- [ ] Usuário com 1 filial vê apenas dados dessa filial
- [ ] Usuário com múltiplas filiais vê soma correta
- [ ] Valores do gráfico batem com outros módulos
- [ ] Não há erros no console do navegador
- [ ] Não há warnings nos logs da API

---

## 📖 Documentação Completa

- **Implementação**: [docs/CHART_FILTER_IMPLEMENTATION.md](docs/CHART_FILTER_IMPLEMENTATION.md)
- **TODO Original**: [docs/TODO_CHART_BRANCH_FILTER.md](docs/TODO_CHART_BRANCH_FILTER.md)
- **Sistema Geral**: [docs/USER_AUTHORIZED_BRANCHES.md](docs/USER_AUTHORIZED_BRANCHES.md)
- **Testes**: [docs/TESTING_AUTHORIZED_BRANCHES.md](docs/TESTING_AUTHORIZED_BRANCHES.md)

---

## 🔒 Impacto de Segurança

**Antes**: ⚠️ CRÍTICO - Usuários viam dados de filiais não autorizadas  
**Depois**: ✅ SEGURO - Usuários veem apenas suas filiais autorizadas

---

**Prioridade**: 🔴 ALTA  
**Tempo Estimado**: 5-10 minutos  
**Risco**: Baixo (apenas adiciona parâmetro opcional)
