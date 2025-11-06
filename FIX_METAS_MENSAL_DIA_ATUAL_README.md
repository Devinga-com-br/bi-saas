# 🔧 Correção: Meta Mensal - Consideração do Dia Atual (D-1)

## 📋 Problema Identificado

### Situação Atual
No módulo **Metas Mensais**, o card "Vendas do Período" mostra:
- **Valor de Vendas do Período**: Considera apenas até D-1 (dia anterior) ✅
- **Meta do Período**: Considera todo o mês, incluindo hoje ❌

### Por Que É um Problema?

Os dados de vendas de **hoje** só estarão disponíveis **amanhã** no sistema. Portanto:

- ✅ **Vendas**: Correto considerar apenas até ontem (D-1)
- ❌ **Meta**: Errado incluir meta de hoje (pois não há venda para comparar)

### Exemplo Prático

**Cenário**: Hoje é 06/11/2025, visualizando Novembro/2025

**ANTES DA CORREÇÃO:**
```
Vendas Realizadas: R$ 100.000 (01/11 até 05/11 - 5 dias)
Meta do Período:   R$ 150.000 (01/11 até 30/11 - 30 dias)
% Atingido:        66,7%
```

❌ **Problema**: Comparando 5 dias de vendas com 30 dias de meta!

**DEPOIS DA CORREÇÃO:**
```
Vendas Realizadas: R$ 100.000 (01/11 até 05/11 - 5 dias)
Meta do Período:   R$ 25.000  (01/11 até 05/11 - 5 dias)
% Atingido:        400%
```

✅ **Correto**: Comparando 5 dias de vendas com 5 dias de meta!

---

## 🎯 Solução Implementada

### Lógica da Correção

```sql
-- Verificar se é o mês atual
v_mes_atual := EXTRACT(MONTH FROM CURRENT_DATE);
v_ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
v_is_mes_atual := (p_mes = v_mes_atual AND p_ano = v_ano_atual);

-- Definir data limite para totalizadores
IF v_is_mes_atual THEN
  v_data_limite := CURRENT_DATE - interval '1 day';  -- D-1
ELSE
  v_data_limite := v_data_fim;                        -- Último dia do mês
END IF;

-- IMPORTANTE:
-- 1. Buscar TODAS as metas do mês (v_data_fim) - para a listagem
-- 2. Mas somar apenas até v_data_limite - para os totalizadores (card resumo)
```

### Comportamento

**LISTAGEM (Tabela):**
- Mostra **TODOS os dias do mês** selecionado
- Dias futuros aparecem com `valor_realizado = 0` naturalmente
- Permite visualização completa do planejamento

**TOTALIZADORES (Card Resumo):**

| Situação | Soma Até | Exemplo |
|----------|----------|---------|
| **Mês Atual** | Ontem (D-1) | Hoje 06/11 → Soma até 05/11 |
| **Mês Passado** | Último dia | Outubro → Soma até 31/10 |
| **Mês Futuro** | Último dia | Dezembro → Soma até 31/12 |

---

## 📝 Arquivos Modificados

### 1. SQL (Banco de Dados)

**Arquivo**: `FIX_METAS_MENSAL_DIA_ATUAL.sql`

**Função Alterada**: `get_metas_mensais_report()`

**Mudanças**:
- ✅ Adicionadas variáveis para controle de data
- ✅ Lógica para detectar mês atual
- ✅ Cálculo de `v_data_limite` (D-1 ou fim do mês)
- ✅ Queries buscam TODAS as metas (v_data_fim) - para listagem completa
- ✅ Totalizadores somam apenas até `v_data_limite` - para card resumo correto

**Campos Adicionados no Resultado** (para debug):
```json
{
  "metas": [...],
  "total_realizado": 100000,
  "total_meta": 25000,
  "percentual_atingido": 400,
  "data_limite_usada": "2025-11-05",  // Nova
  "is_mes_atual": true                 // Nova
}
```

---

## 🧪 Como Testar

### Cenário 1: Mês Atual

**Setup:**
- Hoje: 06/11/2025
- Filtro: Novembro/2025
- Filial: Centro

**Verificar:**
1. ✅ Card "Vendas do Período" mostra valores até 05/11
2. ✅ Card "Meta do Período" mostra valores até 05/11
3. ✅ Percentual calculado sobre mesma quantidade de dias (5 dias)
4. ✅ Tabela mostra TODOS os dias do mês (01/11 até 30/11)
5. ✅ Linhas de 06/11 em diante aparecem com "Realizado = R$ 0,00"

**Query de Teste:**
```sql
SELECT * FROM get_metas_mensais_report(
  'okilao',      -- schema
  11,            -- mês (novembro)
  2025,          -- ano
  NULL,          -- filial_id
  ARRAY[1]       -- filiais (centro)
);
```

**Resultado Esperado:**
```json
{
  "metas": [
    {"data": "2025-11-01", "valor_meta": 5000, "valor_realizado": 5200},
    {"data": "2025-11-02", "valor_meta": 4500, "valor_realizado": 4800},
    ...
    {"data": "2025-11-05", "valor_meta": 6000, "valor_realizado": 6500},
    {"data": "2025-11-06", "valor_meta": 5500, "valor_realizado": 0},
    {"data": "2025-11-07", "valor_meta": 5000, "valor_realizado": 0},
    ...
    {"data": "2025-11-30", "valor_meta": 4800, "valor_realizado": 0}
    // Inclui TODOS os dias, mas dias futuros têm valor_realizado = 0
  ],
  "total_meta": 25000,           // Soma apenas até 05/11 (5 dias)
  "total_realizado": 26500,      // Soma apenas até 05/11 (5 dias)
  "percentual_atingido": 106,    // Calculado sobre esses 5 dias
  "data_limite_usada": "2025-11-05",
  "is_mes_atual": true
}
```

### Cenário 2: Mês Passado

**Setup:**
- Hoje: 06/11/2025
- Filtro: Outubro/2025
- Filial: Centro

**Verificar:**
1. ✅ Vendas mostram o mês completo (01/10 até 31/10)
2. ✅ Meta mostra o mês completo (01/10 até 31/10)
3. ✅ Todos os dias estão presentes

**Query de Teste:**
```sql
SELECT * FROM get_metas_mensais_report(
  'okilao',
  10,            -- outubro
  2025,
  NULL,
  ARRAY[1]
);
```

**Resultado Esperado:**
```json
{
  "metas": [
    {"data": "2025-10-01", ...},
    {"data": "2025-10-02", ...},
    ...
    {"data": "2025-10-31", ...}  // Todos os 31 dias
  ],
  "data_limite_usada": "2025-10-31",
  "is_mes_atual": false
}
```

### Cenário 3: Mês Futuro

**Setup:**
- Hoje: 06/11/2025
- Filtro: Dezembro/2025
- Filial: Centro

**Verificar:**
1. ✅ Meta mostra o mês completo (projetado)
2. ✅ Vendas = 0 (ainda não aconteceram)

---

## 📊 Impacto Visual

### Card "Vendas do Período"

**ANTES:**
```
┌──────────────────────────────┐
│ Vendas do Período           │
│ Novembro 2025               │
├──────────────────────────────┤
│ R$ 100.000                  │ ← Vendas até ontem
│ Meta: R$ 450.000            │ ← Meta do mês todo ❌
│ ↓ -77,78%                   │ ← Percentual errado
└──────────────────────────────┘
```

**DEPOIS:**
```
┌──────────────────────────────┐
│ Vendas do Período           │
│ Novembro 2025               │
├──────────────────────────────┤
│ R$ 100.000                  │ ← Vendas até ontem
│ Meta: R$ 75.000             │ ← Meta até ontem ✅
│ ↑ +33,33%                   │ ← Percentual correto ✅
└──────────────────────────────┘
```

### Tabela de Metas

**ANTES:**
```
Card Resumo:
Vendas: R$ 100.000 (5 dias)
Meta:   R$ 450.000 (30 dias)  ← Errado!
% Atingido: 22%                ← Errado!

Tabela:
Data       | Meta      | Realizado | Diferença
-----------|-----------|-----------|----------
01/11/2025 | R$ 15.000 | R$ 16.000 | +6,7%
...
05/11/2025 | R$ 18.000 | R$ 20.000 | +11,1%
06/11/2025 | R$ 17.000 | R$ 0      | -100%
07/11/2025 | R$ 16.000 | R$ 0      | -100%
...
```

**DEPOIS:**
```
Card Resumo:
Vendas: R$ 100.000 (5 dias)
Meta:   R$ 75.000  (5 dias)   ← Correto! ✅
% Atingido: 133%               ← Correto! ✅

Tabela (continua mostrando todos os dias):
Data       | Meta      | Realizado | Diferença
-----------|-----------|-----------|----------
01/11/2025 | R$ 15.000 | R$ 16.000 | +6,7%
...
05/11/2025 | R$ 18.000 | R$ 20.000 | +11,1%
06/11/2025 | R$ 17.000 | R$ 0      | -100%    ← Continua aparecendo ✅
07/11/2025 | R$ 16.000 | R$ 0      | -100%    ← Normal para dias futuros
...
30/11/2025 | R$ 14.000 | R$ 0      | -100%    ← Todos os dias do mês
```

---

## 🚀 Como Aplicar

### 1. Backup (Recomendado)

```sql
-- Fazer backup da função atual
CREATE OR REPLACE FUNCTION public.get_metas_mensais_report_backup AS
SELECT pg_get_functiondef('public.get_metas_mensais_report'::regprocedure);
```

### 2. Executar a Correção

```sql
-- Copiar e executar todo o conteúdo de:
FIX_METAS_MENSAL_DIA_ATUAL.sql
```

### 3. Validar

```bash
# Acessar a aplicação
npm run dev

# Ir para: /metas/mensal
# Selecionar mês atual
# Verificar:
# 1. Card "Vendas do Período" mostra meta proporcional
# 2. Tabela não mostra dias futuros
# 3. Percentual faz sentido
```

### 4. Testar Edge Cases

**Primeiro dia do mês:**
- Hoje: 01/11/2025
- Deve considerar até 31/10? Não! Ainda é 01/11, então mostra apenas hoje.

**Último dia do mês:**
- Hoje: 30/11/2025
- Deve considerar até 29/11? Sim!

**Virada de mês:**
- Hoje: 01/12/2025
- Visualizando: Novembro/2025
- Deve mostrar mês completo? Sim! (não é mês atual)

---

## 🐛 Troubleshooting

### Problema: Ainda mostra meta do mês todo

**Causa**: Função SQL não foi atualizada  
**Solução**: Executar novamente o SQL, verificar se não há erros

### Problema: Percentual ainda errado

**Causa**: Cache do navegador  
**Solução**: Limpar cache (Ctrl+Shift+R) ou usar aba anônima

### Problema: Dados de debug não aparecem

**Causa**: Versão antiga da função  
**Solução**: Verificar se campos `data_limite_usada` e `is_mes_atual` existem no resultado

---

## 📈 Métricas de Sucesso

### Antes
- ❌ Percentual atingido incorreto no mês atual
- ❌ Comparação injusta (dias diferentes)
- ❌ Confusão para usuários

### Depois
- ✅ Percentual atingido correto
- ✅ Comparação justa (mesma quantidade de dias)
- ✅ Clareza para decisões

---

## 🎯 Benefícios

### Para o Usuário
1. **Dados Precisos**: Percentuais refletem realidade
2. **Comparação Justa**: Mesma base de dias
3. **Decisões Melhores**: Dados confiáveis

### Para o Negócio
1. **Métricas Corretas**: Acompanhamento real do desempenho
2. **Projeções Realistas**: Base correta para análises
3. **Confiança nos Dados**: Sistema reflete realidade

---

## 📝 Notas Técnicas

### Por que não fazer no Frontend?

**Opção 1 (Não Escolhida)**: Filtrar no React
```typescript
// ❌ Problemático
const filteredMetas = metas.filter(m => 
  new Date(m.data) < new Date()
)
```

**Problemas:**
- Ainda busca dados desnecessários do banco
- Totais calculados no backend ficam errados
- Performance pior
- Lógica duplicada

**Opção 2 (Escolhida)**: Filtrar no SQL
```sql
-- ✅ Correto
WHERE mm.data >= $1 AND mm.data <= $2  -- $2 = v_data_limite
```

**Vantagens:**
- Busca apenas dados necessários
- Totais calculados corretamente
- Performance melhor
- Lógica centralizada

### Backward Compatibility

A correção é **100% backward compatible**:
- ✅ Mesma assinatura de função
- ✅ Mesmos parâmetros
- ✅ Mesmo formato de retorno
- ✅ Campos adicionais são opcionais

### Timezone

A correção usa `CURRENT_DATE` que considera o timezone do PostgreSQL. Certifique-se de que o timezone do servidor está correto:

```sql
SHOW timezone;  -- Deve ser 'America/Sao_Paulo' ou equivalente
```

---

## 🎉 Conclusão

Esta correção resolve um problema crítico de cálculo que afetava a precisão das métricas no mês atual. A solução é elegante, mantém compatibilidade e melhora significativamente a confiabilidade dos dados.

**Status**: ✅ **PRONTO PARA APLICAR**

---

**Data**: 2025-11-06  
**Versão**: 1.0.0  
**Autor**: Sistema BI SaaS  
**Prioridade**: 🔴 **ALTA** (Afeta métricas do dia a dia)
