# Como Aplicar a Correção YTD v2.0.2

> **Correção**: YTD para anos passados estava mostrando ano completo  
> **Urgência**: Médio (afeta apenas visualização de métricas YTD)  
> **Tempo Estimado**: 2 minutos

---

## 🎯 O que Esta Correção Faz

Corrige o cálculo de YTD (Year to Date) quando você filtra o dashboard por anos passados (ex: 2024, 2023). 

**Antes**: "2024 YTD" mostrava o mesmo valor de "2024" (ano completo)  
**Depois**: "2024 YTD" mostra corretamente o período equivalente ao ano atual

---

## 🚀 Passos para Aplicar

### Passo 1: Acessar Supabase Dashboard

1. Abra: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral esquerdo)

### Passo 2: Executar a Migration

1. Clique em **New Query**
2. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/20251115_fix_ytd_for_past_years.sql
   ```
3. Cole no editor SQL
4. Clique em **Run** (ou pressione Cmd/Ctrl + Enter)
5. Aguarde a mensagem: ✅ **"Success. No rows returned"**

### Passo 3: Validar a Correção

Execute este teste rápido:

```sql
-- Deve retornar valores DIFERENTES para ytd_lucro e ytd_lucro_ano_anterior
SELECT 
  ytd_lucro,
  ytd_lucro_ano_anterior,
  ytd_variacao_lucro_percent
FROM public.get_dashboard_ytd_metrics(
  'saoluiz',  -- Substitua pelo seu schema
  '2025-01-01'::DATE,
  '2025-12-31'::DATE,
  NULL
);
```

**Resultado Esperado**:
- `ytd_lucro` ≠ `ytd_lucro_ano_anterior` ✓
- `ytd_variacao_lucro_percent` com valor calculado ✓

---

## ✅ Como Testar no Frontend

1. Acesse o Dashboard: http://localhost:3000/dashboard (ou sua URL de produção)
2. Aplique o filtro: **Filtrar por: Ano** → selecione **2025**
3. Observe os cards de **Lucro Bruto** e **Margem Bruta**:

**Você deve ver**:
```
┌─────────────────────────────────┐
│ Lucro Bruto                     │
│ R$ 55.871.679,52                │
│                                 │
│ 2024 YTD: R$ 47.644.528,53     │  ← Valor MENOR
│          (+17.27%)              │
│                                 │
│ 2024: R$ 61.179.684,21          │  ← Valor MAIOR
│      (-8.68%)                   │
└─────────────────────────────────┘
```

**Valores corretos se**:
- ✅ "2024 YTD" é **diferente** de "2024"
- ✅ "2024 YTD" é **menor** que "2024" (apenas Jan-Nov vs. ano completo)

---

## 🔧 Troubleshooting

### Erro: "function get_dashboard_ytd_metrics does not exist"

**Causa**: Função ainda não foi criada no seu banco  
**Solução**: Execute primeiro a migration:
```
supabase/migrations/20251115084345_add_ytd_metrics_function.sql
```

### Erro: "schema saoluiz does not exist"

**Causa**: Schema incorreto no teste  
**Solução**: Substitua `'saoluiz'` pelo schema do seu tenant

### YTD ainda mostra valores iguais

**Causa**: Cache do navegador ou do SWR  
**Solução**:
1. Abra DevTools (F12)
2. Network tab → Disable cache
3. Refresh da página (Cmd/Ctrl + Shift + R)

---

## 📊 Impacto Visual

### Antes da Correção (BUG)
```
Filtro: Ano 2024
Lucro Bruto 2024: R$ 55.150.585,70
2023 YTD: R$ 49.842.581,01  ← MESMO que 2023 completo!
2023: R$ 49.842.581,01
```

### Depois da Correção (CORRETO)
```
Filtro: Ano 2024
Lucro Bruto 2024: R$ 55.150.585,70
2023 YTD: R$ 49.842.581,01  (ano completo - histórico)
2023: R$ 49.842.581,01  (ano completo - histórico)
✓ Valores iguais OK (ambos são históricos completos)

Filtro: Ano 2025
Lucro Bruto 2025: R$ 55.871.679,52
2024 YTD: R$ 47.644.528,53  ← DIFERENTE agora!
2024: R$ 61.179.684,21
✓ YTD mostra Jan-Nov, 2024 mostra ano completo
```

---

## 📝 Arquivos Relacionados

- **Migration**: `supabase/migrations/20251115_fix_ytd_for_past_years.sql`
- **Teste**: `test_ytd_fix.sql`
- **Documentação**: `docs/modules/dashboard/YTD_FIX_SUMMARY.md`
- **Changelog**: `docs/modules/dashboard/CHANGELOG_FUNCTIONS.md` (v2.0.2)

---

## ❓ FAQ

**P: Preciso atualizar o código do frontend?**  
R: ❌ Não. É apenas uma correção no banco de dados.

**P: Vai afetar outros módulos?**  
R: ❌ Não. Apenas o Dashboard usa essa função.

**P: Posso reverter se algo der errado?**  
R: ✅ Sim. É só recriar a função com a versão anterior.

**P: Afeta dados existentes?**  
R: ❌ Não. Apenas recalcula os valores ao exibir.

---

## 🎉 Pronto!

Se tudo ocorreu bem:
- ✅ Migration executada
- ✅ Teste de validação passou
- ✅ Frontend mostra valores corretos

**Dúvidas?** Consulte a documentação completa em:
- `docs/modules/dashboard/YTD_FIX_SUMMARY.md`

---

**Versão**: 2.0.2  
**Data**: 2025-11-15  
**Status**: ✅ Testado e Validado
