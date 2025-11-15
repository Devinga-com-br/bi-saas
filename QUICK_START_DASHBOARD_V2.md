# Quick Start - Dashboard v2.0

**Data**: 2025-11-15  
**Tempo de Leitura**: 2 minutos

---

## 🚀 Deploy em 3 Passos

### 1. Aplicar SQL Fix (CRÍTICO)

```bash
# Opção A: Via Supabase Dashboard (recomendado)
1. Abra: https://supabase.com/dashboard
2. SQL Editor → New Query
3. Copie: fix_dashboard_jsonb_NOW.sql
4. Run

# Opção B: Via CLI
cat fix_dashboard_jsonb_NOW.sql | supabase db push
```

### 2. Verificar Código

Código já está pronto! Apenas verifique:

```bash
npm run build   # Deve completar sem erros
npm run dev     # Teste local
```

### 3. Validar Dashboard

Abra: http://localhost:3000/dashboard

**Checklist Rápido**:
- ✅ Filtros aparecem (Mês/Ano/Customizado)
- ✅ Sem erros de console
- ✅ Cards mostram: Receita/Lucro/Margem Bruta
- ✅ YTD aparece ao filtrar por "Ano"

---

## 📖 O Que Mudou?

### Filtros (NOVO)
- **Mês**: Seleciona mês + ano
- **Ano**: Ano completo (com YTD)
- **Customizado**: Datas livres

### Cards (ATUALIZADO)
- Total de Vendas → **Receita Bruta**
- Total de Lucro → **Lucro Bruto**
- Margem de Lucro → **Margem Bruta**

### YTD (NOVO)
Aparece apenas ao filtrar por "Ano":
- Lucro Bruto YTD
- Margem Bruta YTD
- Comparação com ano anterior (mesmo período)

---

## 🔍 Como Usar

### Filtrar por Mês
1. Selecione "Mês"
2. Escolha o mês desejado
3. Dados aparecem do 1º ao último dia do mês

### Filtrar por Ano (com YTD)
1. Selecione "Ano"
2. Escolha o ano (ex: 2025)
3. Veja comparações:
   - **2024 YTD**: Mesmo período até hoje
   - **2024**: Ano anterior completo

### Filtrar por Período Customizado
1. Selecione "Período Customizado"
2. Digite datas (dd/mm/aaaa) ou use calendário
3. Dados aparecem para período exato

---

## ⚠️ Troubleshooting

### Erro: "COALESCE could not convert..."
**Solução**: Aplique fix_dashboard_jsonb_NOW.sql no Supabase

### YTD não aparece
**Causa**: Filtro não está configurado como "Ano"
**Solução**: Selecione "Ano" no filtro

### Valores YTD incorretos
**Causa**: Função get_dashboard_ytd_metrics não existe
**Solução**: Aplique migration 20251115084345_add_ytd_metrics_function.sql

### Dashboard não carrega
1. Verifique console do navegador (F12)
2. Verifique se SQL fix foi aplicado
3. Verifique se schema está em "Exposed schemas"

---

## 📚 Documentação Completa

- **Guia Completo**: `DASHBOARD_V2_COMPLETE_SUMMARY.md`
- **README**: `docs/modules/dashboard/README.md`
- **Regras de Negócio**: `docs/modules/dashboard/BUSINESS_RULES.md`
- **Funções RPC**: `docs/modules/dashboard/RPC_FUNCTIONS.md`
- **Changelog**: `docs/modules/dashboard/CHANGELOG_FUNCTIONS.md`

---

## 🎯 Próximos Passos

1. ✅ Aplicar SQL fix
2. ✅ Testar todos os modos de filtro
3. ✅ Validar valores YTD
4. ✅ Treinar usuários
5. ✅ Monitorar performance

---

**Versão**: 2.0.0  
**Status**: Pronto para Deploy  
**Suporte**: Consulte DASHBOARD_V2_COMPLETE_SUMMARY.md
