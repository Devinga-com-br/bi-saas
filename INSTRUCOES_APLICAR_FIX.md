# 🔧 Instruções para Aplicar o Fix - Metas por Setor

## Problema
A página carrega os dados mas não atualiza os valores realizados porque a função SQL `atualizar_valores_realizados_todos_setores` ainda não existe no banco de dados.

## ✅ Solução - Passo a Passo

### 1️⃣ Abrir o Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### 2️⃣ Executar o Script
1. Clique em **"New Query"**
2. Copie TODO o conteúdo do arquivo **`APPLY_FIX_METAS_SETOR.sql`** (252 linhas)
3. Cole no editor SQL
4. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

### 3️⃣ Verificar Sucesso
Você deve ver a mensagem:
```
Success. No rows returned
```

Isso significa que as 2 funções foram criadas com sucesso:
- ✅ `atualizar_valores_realizados_metas_setor` (função individual)
- ✅ `atualizar_valores_realizados_todos_setores` (função para todos setores)

### 4️⃣ Testar no Frontend
1. Volte para a página de **Metas por Setor**
2. Recarregue a página (`F5` ou `Cmd+R`)
3. Selecione um setor
4. A página deve:
   - Mostrar loading "Atualizando valores..."
   - Carregar as metas
   - **Exibir valores realizados preenchidos** ✨

### 5️⃣ Verificar no Console
Abra o Console do navegador (`F12`) e procure por:
```
[METAS_SETOR] 🔄 Atualizando valores realizados de todos os setores...
[METAS_SETOR] ✅ Valores atualizados: { success: true, ... }
```

## 🚨 Se ainda não funcionar

### Verificar se a função foi criada:
Execute no SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%atualizar_valores%';
```

Deve retornar:
- `atualizar_valores_realizados_metas_setor`
- `atualizar_valores_realizados_todos_setores`

### Verificar coluna da tabela vendas:
Execute para cada schema (ex: okilao, saoluiz, etc):
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'okilao'  -- MUDAR para seu schema
  AND table_name = 'vendas' 
  AND column_name LIKE '%valor%';
```

Deve mostrar `valor_vendas` (NÃO `valor_total_liquido`)

## 📞 Precisa de Ajuda?
Se continuar com erro, me envie:
1. Screenshot do erro no console
2. Resultado do SQL de verificação acima
3. Mensagem de erro do Supabase (se houver)
