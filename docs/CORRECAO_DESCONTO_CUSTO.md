# Correção: Aplicação de Desconto Custo no CMV

**Data:** 22/11/2024
**Versão:** 1.0.0
**Impacto:** Dashboard, DRE Gerencial, Relatórios Financeiros

## 📋 Resumo Executivo

Correção na aplicação do campo `desconto_custo` da tabela `descontos_venda` para garantir que o CMV (Custo das Mercadorias Vendidas) seja calculado corretamente em todos os módulos financeiros.

## 🐛 Problema Identificado

### Comportamento Anterior (INCORRETO)
A função `get_dashboard_data` estava aplicando `valor_desconto` duas vezes:
1. Uma vez nas vendas (correto)
2. Uma vez no lucro bruto (incorreto - deveria usar `desconto_custo`)

Isso resultava em:
- CMV inflado
- Lucro bruto subestimado
- Margens de lucro incorretas

### Exemplo do Problema
```
Dados originais:
- Vendas Brutas: R$ 10.000
- Custo Original: R$ 6.000
- Lucro Original: R$ 4.000

Descontos aplicados:
- valor_desconto: R$ 1.000
- desconto_custo: R$ 600

Cálculo INCORRETO (antes):
- Receita Líquida: R$ 9.000 (10.000 - 1.000) ✓
- Lucro: R$ 3.000 (4.000 - 1.000) ✗
- CMV: R$ 6.000 (9.000 - 3.000) ✗ Inflado!

Cálculo CORRETO (depois):
- Receita Líquida: R$ 9.000 (10.000 - 1.000) ✓
- Lucro: R$ 3.400 (4.000 - 1.000 + 600) ✓
- CMV: R$ 5.600 (9.000 - 3.400) ✓
```

## ✅ Solução Implementada

### 1. Função `get_dashboard_data` Corrigida

**Arquivo:** `/supabase/migrations/20241122_fix_dashboard_desconto_custo.sql`

**Mudanças principais:**
- Busca `valor_desconto` e `desconto_custo` separadamente
- Aplica fórmula correta: `lucro = lucro_original - valor_desconto + desconto_custo`
- Mantém retrocompatibilidade com tenants sem descontos

### 2. DRE Gerencial

O cálculo `CMV = Receita - Lucro` já estava correto. Com a correção na função SQL, os valores chegam corretos automaticamente.

### 3. Script de Teste

**Arquivo:** `/supabase/tests/test_desconto_custo_fix.sql`

Valida:
- Cálculos manuais vs função
- Consistência entre `get_dashboard_data` e `get_vendas_por_filial`
- Aplicação correta dos descontos

## 🚀 Como Aplicar

### Passo 1: Teste em Desenvolvimento
```sql
-- No Supabase Dashboard (ambiente dev)
-- Execute o arquivo: 20241122_fix_dashboard_desconto_custo.sql
-- Apenas a PARTE 2 (nova versão)
```

### Passo 2: Validar com Script de Teste
```sql
-- Execute: test_desconto_custo_fix.sql
-- Verifique se mostra "✅ TESTE PASSOU!"
```

### Passo 3: Aplicar em Produção
```sql
-- No Supabase Dashboard (produção)
-- Execute a PARTE 2 do arquivo de migração
-- Monitore por 30 minutos
```

### Passo 4: Reverter (se necessário)
```sql
-- Execute a PARTE 1 (backup) descomentada
-- Isso restaura a função original
```

## 📊 Impacto nos Módulos

### ✅ Módulos Afetados
- **Dashboard Principal**: Indicadores de lucro e margem
- **DRE Gerencial**: CMV e Lucro Líquido
- **Vendas por Filial**: Totalizadores
- **Metas**: Valores realizados

### ✅ Módulos NÃO Afetados
- Relatórios de Vendas (não usam descontos)
- Curva ABC
- Ruptura

## 🔍 Validação Pós-Deploy

### Checklist de Validação
- [ ] Dashboard mostra lucro maior que antes
- [ ] CMV está menor (mais realista)
- [ ] Margem de lucro aumentou
- [ ] DRE Gerencial consistente com Dashboard
- [ ] Vendas por Filial soma corretamente
- [ ] Tenants sem descontos continuam funcionando

### Queries de Validação
```sql
-- Verificar se descontos estão sendo aplicados
SELECT
    SUM(valor_desconto) as total_desc_venda,
    SUM(desconto_custo) as total_desc_custo
FROM schema_name.descontos_venda
WHERE data_desconto BETWEEN '2024-11-01' AND '2024-11-30';

-- Comparar lucro antes/depois
SELECT * FROM get_dashboard_data('schema_name', '2024-11-01', '2024-11-30', NULL);
```

## ⚠️ Considerações Importantes

1. **Apenas afeta tenants com módulo de descontos ativo**
2. **Retrocompatível** - não quebra tenants sem descontos
3. **Não altera dados históricos** - apenas cálculos futuros
4. **Backup incluído** para reversão rápida

## 📝 Conceitos Chave

### valor_desconto
- Reduz a **receita bruta**
- Representa descontos dados ao cliente
- Impacta negativamente o lucro

### desconto_custo
- Reduz o **CMV** (custo)
- Representa economia no custo do produto
- Impacta positivamente o lucro

### Fórmula Correta
```
Lucro Bruto = (Vendas - valor_desconto) - (Custo - desconto_custo)
Ou seja: Lucro = Lucro Original - valor_desconto + desconto_custo
```

## 🤝 Responsáveis

- **Desenvolvimento:** Equipe BI SaaS
- **Revisão:** Time de Engenharia
- **Deploy:** DevOps
- **Validação:** QA + Product Owner

## 📞 Suporte

Em caso de problemas:
1. Execute o script de reversão imediatamente
2. Notifique o time via Slack #engenharia
3. Documente o erro encontrado
4. Aguarde análise antes de nova tentativa

---

**Status:** ✅ Pronto para Deploy
**Última Atualização:** 22/11/2024