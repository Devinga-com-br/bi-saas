# 🚀 Quick Start - Módulo de Metas

## TL;DR

O módulo está **PRONTO**. Só falta aplicar a migration no banco.

---

## ⚡ 3 Passos para Começar

### 1️⃣ Aplicar Migration (5 minutos)

```
1. Abra https://supabase.com/dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de: supabase/migrations/024_create_metas_table.sql
4. Execute
```

### 2️⃣ Acessar Módulo (1 minuto)

```
1. Login na aplicação
2. Menu "Metas" → "Meta Mensal"
```

### 3️⃣ Criar Primeira Meta (2 minutos)

```
1. Clique "+ Cadastrar Meta"
2. Preencha:
   - Mês: Outubro
   - Ano: 2025
   - Filial: 1
   - Meta: 10%
   - Data Ref: 2024-10-01
3. Clique "Gerar Metas"
```

✅ **Pronto!** Você verá as metas geradas automaticamente.

---

## 📖 Mais Informações

- **Manual Completo**: `METAS_MODULE_README.md`
- **Resumo Executivo**: `METAS_MODULE_SUMMARY.md`  
- **Checklist**: `METAS_MODULE_CHECKLIST.md`

---

## 🆘 Problemas?

### Erro: Função não encontrada
➡️ Aplicar a migration

### Página em branco
➡️ Verificar console do navegador

### Valores zerados
➡️ Normal se não houver vendas registradas ainda

---

## 💡 Dica Rápida

**Para acompanhar metas diariamente:**
1. Acesse `/metas/mensal`
2. Selecione mês atual
3. Veja o gráfico de progresso
4. Tabela mostra status dia a dia

---

**Tempo total de setup**: ~10 minutos  
**Complexidade**: ⭐ Fácil

