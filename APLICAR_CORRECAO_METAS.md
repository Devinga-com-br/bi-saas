# Guia Rápido: Aplicar Correção de Metas com Múltiplas Filiais

## 🎯 O que esta correção resolve?

Corrige o problema onde os totais de metas (vendas, meta, percentual) **não recalculavam** ao selecionar/desmarcar filiais no filtro das páginas:
- `/metas/mensal` - Meta Mensal
- `/metas/setor` - Meta por Setor (já estava correto)

## ⚡ Aplicação Rápida (5 minutos)

### Passo 1: Executar SQL no Supabase

#### Opção A: Via Supabase Dashboard (Recomendado)
1. Acesse: [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New Query**
4. Copie TODO o conteúdo de: `FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql`
5. Cole no editor
6. Clique em **Run**
7. Aguarde mensagem de sucesso ✅

#### Opção B: Via CLI (psql)
```bash
# Conectar ao banco
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Executar script
\i FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql
```

### Passo 2: Deploy da Aplicação

```bash
# Na pasta do projeto
cd /path/to/bi-saas

# Build
npm run build

# Deploy (exemplo Vercel)
vercel --prod

# Ou se estiver em produção local
npm start
```

### Passo 3: Testar

1. Acesse: `https://seu-dominio.com/metas/mensal`
2. Selecione todas as filiais
3. Anote os totais exibidos
4. **Desmarque 1 filial**
5. **Verifique**: Os totais devem mudar automaticamente ✅

## ✅ Checklist de Validação

Após aplicar, testar:

- [ ] **Teste 1**: Todas as filiais selecionadas
  - Verificar se totais estão corretos
  
- [ ] **Teste 2**: Remover 1 filial
  - Verificar se totais recalculam automaticamente
  - Diferença deve ser visível
  
- [ ] **Teste 3**: Remover várias filiais
  - Verificar recálculo contínuo
  
- [ ] **Teste 4**: Selecionar apenas 1 filial
  - Verificar se mostra apenas dados daquela filial
  
- [ ] **Teste 5**: Mudar mês/ano com filtros ativos
  - Verificar se mantém filtros e mostra dados corretos
  
- [ ] **Teste 6**: Testar Meta por Setor
  - Deve continuar funcionando normalmente

## 🔍 Como Saber se Funcionou?

### ✅ Funcionando Corretamente:
- Ao desmarcar uma filial, os valores de "Vendas do Período", "Meta" e "Progresso da Meta" **mudam imediatamente**
- Na tabela, os totais por data também recalculam
- Console do browser (F12) mostra: `[METAS] Report data loaded: {metas: [...], total_realizado: XXX, total_meta: YYY}`

### ❌ Ainda com Problema:
- Valores não mudam ao alterar filiais
- Totais sempre mostram a soma de todas as filiais
- Console mostra erro: `PGRST...`

## 🐛 Troubleshooting

### Problema: Erro ao executar SQL
**Causa**: Permissões insuficientes  
**Solução**: Usar role `postgres` ou `service_role`

### Problema: Deploy não reflete mudanças
**Causa**: Cache do browser ou CDN  
**Solução**: 
```bash
# Limpar cache do browser (Ctrl+F5)
# Ou invalidar cache do CDN (Vercel/Cloudflare)
```

### Problema: Ainda não funciona após deploy
**Causa**: SQL não foi executado ou função antiga em cache  
**Solução**:
```sql
-- No Supabase SQL Editor
NOTIFY pgrst, 'reload schema';

-- Verificar se função existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_metas_mensais_report'
    AND routine_schema = 'public';
```

## 📞 Precisa de Ajuda?

1. **Verifique os logs**:
   - Browser: F12 → Console → Buscar `[METAS]`
   - API: Logs do servidor → Buscar `[API/METAS/REPORT]`

2. **Revise a documentação**:
   - Técnica: `FIX_METAS_MULTIPLE_FILIAIS.md`
   - Resumo: `CORRECAO_METAS_RESUMO.md`
   - Changelog: `CHANGELOG.md`

3. **Verifique os arquivos**:
   - SQL: `FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql`
   - API: `src/app/api/metas/report/route.ts`

## 📝 Notas Importantes

- ✅ **Seguro**: Mantém retrocompatibilidade
- ✅ **Rápido**: Aplicação em ~5 minutos
- ✅ **Sem downtime**: Pode aplicar em produção
- ✅ **Sem breaking changes**: Frontend não precisa mudar

## 🎉 Pronto!

Após aplicar e validar, a correção está completa. Os usuários poderão filtrar filiais e ver os totais corretos em tempo real.

---

**Data**: 2025-11-06  
**Versão**: 1.0.0  
**Tipo**: Hotfix Crítico
