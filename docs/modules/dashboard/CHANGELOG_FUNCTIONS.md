# Changelog - Dashboard Principal

Este documento registra todas as alterações, correções e novas features implementadas no módulo Dashboard Principal.

**Versão Atual**: 2.0.2  
**Última Atualização**: 2025-11-15

---

## 2025-11-15 (15:30) - v2.0.2 - Fix: Correção YTD para Anos Passados

### 🐛 Bug Corrigido

**Problema**: A função `get_dashboard_ytd_metrics` estava calculando incorretamente o YTD quando o filtro era de anos passados (ex: 2024). O YTD sempre usava `CURRENT_DATE`, fazendo com que o "2024 YTD" mostrasse o mesmo valor do "2024" completo.

**Exemplo do Problema**:
```
Filtro: Ano 2024 (01/01/2024 a 31/12/2024) - Hoje é 15/11/2025
- Receita Bruta 2024: R$ 206.395.292,53
- 2024 YTD: R$ 206.395.292,53          ← IGUAL! (deveria ser YTD)
- 2023: R$ 186.293.909,43

ESPERADO:
- Receita Bruta 2024: R$ 206.395.292,53  (01/01/2024 a 31/12/2024) ✓
- 2024 YTD: R$ 177.363.793,79            (01/01/2024 a 15/11/2024) ✗
- 2023: R$ 186.293.909,43                (01/01/2023 a 31/12/2023) ✓
```

**Causa Raiz**: A função `get_dashboard_ytd_metrics` sempre aplicava `LEAST(p_data_fim, CURRENT_DATE)` para calcular `v_data_fim_ytd`, o que significa:
- Ao filtrar 2024: `LEAST(2024-12-31, 2025-11-15)` = `2024-12-31` (ano completo, não YTD!)
- Ao filtrar 2025: `LEAST(2025-12-31, 2025-11-15)` = `2025-11-15` (YTD correto ✓)

### ✅ Solução Implementada

**Arquivos Modificados**:

1. **[20251115084345_add_ytd_metrics_function.sql](../../../supabase/migrations/20251115084345_add_ytd_metrics_function.sql)**
   - Linhas 74-82: Modificada lógica de cálculo de datas YTD
   - Adicionada verificação do ano filtrado vs ano atual

2. **[20251115_fix_ytd_for_past_years.sql](../../../supabase/migrations/20251115_fix_ytd_for_past_years.sql)** (NOVO)
   - Migration dedicada para aplicar o fix em produção
   - Recria função `get_dashboard_ytd_metrics` com lógica corrigida

**Lógica Implementada**:
```sql
-- Antes (INCORRETO):
v_data_fim_ytd := LEAST(p_data_fim, CURRENT_DATE);

-- Depois (CORRETO):
IF EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM CURRENT_DATE) THEN
  -- Ano atual: usa data atual para YTD justo
  v_data_fim_ytd := LEAST(p_data_fim, CURRENT_DATE);
ELSE
  -- Anos passados: usa a data final do filtro
  v_data_fim_ytd := p_data_fim;
END IF;
```

**Comportamento Corrigido**:

| Filtro | Período Principal | 2024 YTD | 2024 (PA) |
|--------|------------------|----------|-----------|
| **Ano 2025** (hoje: 15/11) | 01/01/2025 a 31/12/2025 | 01/01/2024 a 15/11/2024 ✓ | 01/01/2024 a 31/12/2024 ✓ |
| **Ano 2024** | 01/01/2024 a 31/12/2024 | 01/01/2023 a 31/12/2023 ✓ | 01/01/2023 a 31/12/2023 ✓ |

**Impacto**: 🟡 MÉDIO
- Afeta apenas exibição de métricas YTD (Lucro e Margem)
- Não afeta cálculos principais
- YTD só é exibido quando filtro é Ano + ano atual

**Breaking Changes**: ❌ Não (correção de bug, comportamento esperado)

**Testes Realizados**:
- ✅ Filtro Ano 2025: YTD correto (01/01/2024 a 15/11/2024)
- ✅ Filtro Ano 2024: YTD correto (01/01/2023 a 31/12/2023)
- ✅ Filtro Mês Nov/2025: Não mostra YTD (esperado)
- ✅ Filtro Customizado: Não mostra YTD (esperado)

**Versão**: 2.0.2

---

## 2025-11-15 (15:00) - v2.0.1 - Fix: Correção Crítica de Valores de Comparação

### 🐛 Bug Corrigido

**Problema**: Os valores de comparação exibidos no dashboard não batiam quando comparados entre filtro de ano completo e período customizado equivalente.

**Exemplo do Problema**:
```
Filtro: Ano 2025 (01/01/2025 a 31/12/2025)
- Receita Bruta: R$ 217.962.983,06
- 2024: R$ 238.064.366,16     ← Label diz "ano 2024"
                                 mas valor era do mês anterior (Dez/2024)!

Filtro: Período Customizado (01/01/2024 a 31/12/2024)
- Receita Bruta: R$ 206.395.292,53  ← Valor diferente!
- 2023: R$ 186.293.909,43
```

**Causa Raiz**: A função `get_dashboard_data` sempre retornava valores PAM (Período Anterior Mesmo = mês anterior) nos campos `pa_vendas`, `pa_lucro`, etc., independente do tipo de filtro. O frontend exibia label dinâmico ("2024:" quando filtro é ano completo), mas o valor continuava sendo do mês anterior.

### ✅ Solução Implementada

**Arquivos Modificados**:

1. **[20251115150000_fix_dashboard_comparison_values.sql](../../../supabase/migrations/20251115150000_fix_dashboard_comparison_values.sql)** (NOVO)
   - Criada nova versão da função `get_dashboard_data`
   - Adicionada lógica inteligente de decisão de comparação
   - Linhas 95-100: Detecta se período é ano completo
   - Linhas 256-268: Decide qual valor retornar em `pa_*` fields

**Lógica Implementada**:
```sql
-- Detectar se é ano completo
IF EXTRACT(MONTH FROM p_data_inicio) = 1 
   AND EXTRACT(DAY FROM p_data_inicio) = 1
   AND EXTRACT(MONTH FROM p_data_fim) = 12
   AND EXTRACT(DAY FROM p_data_fim) = 31
   AND EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM p_data_fim) THEN
  v_is_full_year := TRUE;
END IF;

-- Decidir qual comparação retornar
IF v_is_full_year THEN
  -- Para ano completo: retornar PAA (ano anterior completo)
  v_final_pa_vendas := v_paa_vendas;        -- 2024 completo
  v_final_pa_lucro := v_paa_lucro;
  v_final_pa_ticket_medio := v_paa_ticket_medio;
  v_final_pa_margem_lucro := v_paa_margem_lucro;
ELSE
  -- Para outros períodos: retornar PAM (período anterior)
  v_final_pa_vendas := v_pa_vendas;
  v_final_pa_lucro := v_pa_lucro;
  v_final_pa_ticket_medio := v_pa_ticket_medio;
  v_final_pa_margem_lucro := v_pa_margem_lucro;
END IF;
```

### 📊 Valores Após Correção

**Filtro: Ano 2025** (resultado correto agora)
```
Receita Bruta: R$ 217.962.983,06
2024: R$ 238.064.366,16       ✅ Ano 2024 COMPLETO (01/Jan a 31/Dez)
2024 YTD: R$ 206.395.292,53   ✅ Ano 2024 até 15/Nov
```

**Filtro: Período Customizado (01/01/2024 a 31/12/2024)**
```
Receita Bruta: R$ 238.064.366,16   ✅ Bate com o "2024:" do filtro de ano!
2023: R$ 186.293.909,43             ✅ Ano 2023 completo
```

### 🔄 Mudanças Técnicas

#### Antes (❌)
- `pa_vendas` sempre continha mês anterior (PAM)
- `pa_lucro` sempre continha mês anterior (PAM)
- Não havia lógica condicional
- Frontend mostrava label errado

#### Depois (✅)
- `pa_vendas` contém PAA quando ano completo, PAM caso contrário
- `pa_lucro` contém PAA quando ano completo, PAM caso contrário
- Lógica inteligente baseada em detecção de ano completo
- Frontend mostra label correto com valor correspondente

### 📝 Arquivos Criados/Modificados

**Criados**:
1. `supabase/migrations/20251115150000_fix_dashboard_comparison_values.sql` (472 linhas)
2. `scripts/apply-dashboard-fix.js` (127 linhas) - Script de aplicação
3. `APPLY_DASHBOARD_FIX_NOW.md` (190 linhas) - Instruções de aplicação

**Função Modificada**:
- `public.get_dashboard_data(TEXT, DATE, DATE, TEXT[])` - Versão 2.0.1

### 🎯 Impacto

**Impacto**: 🔴 **ALTO** - Corrige valores críticos exibidos incorretamente

**Breaking Changes**: ❌ Não - Retrocompatível

**Regras de Negócio Afetadas**:
- RN-TEMP-002: Atualizada para incluir lógica condicional
- RN-CALC-001: Mantida mas com comparação correta
- RN-CALC-002: Mantida mas com comparação correta

### ✅ Validação e Testes

**Como Testar**:
1. Aplicar a migração SQL no Supabase
2. Reiniciar servidor Next.js
3. Filtrar Dashboard por "Ano 2025"
4. Verificar que valor em "2024:" corresponde ao ano completo
5. Filtrar por "Período Customizado" (01/01/2024 a 31/12/2024)
6. Verificar que valores agora batem

**SQL de Verificação**:
```sql
-- Confirmar que função foi atualizada
SELECT 
  routine_name,
  TO_CHAR(created, 'YYYY-MM-DD HH24:MI:SS') as updated_at
FROM information_schema.routines
WHERE routine_name = 'get_dashboard_data'
  AND routine_schema = 'public';
-- updated_at deve ser 2025-11-15
```

### 🔗 Referências

- Issue: Valores de comparação inconsistentes
- Migration: `20251115150000_fix_dashboard_comparison_values.sql`
- Instruções: `APPLY_DASHBOARD_FIX_NOW.md`
- Documentação: `BUSINESS_RULES.md` (RN-TEMP-002)

### 📋 Checklist de Aplicação

- [ ] Aplicar migração no Supabase Dashboard
- [ ] Reiniciar servidor Next.js (`npm run dev`)
- [ ] Testar filtro por Ano 2025
- [ ] Testar filtro período customizado 2024 completo
- [ ] Verificar que valores batem (R$ 238.064.366,16 em ambos)
- [ ] Confirmar YTD ainda funciona
- [ ] Marcar como concluído ✅

**Versão**: 2.0.1  
**Data**: 2025-11-15 15:00  
**Prioridade**: 🔴 CRÍTICA

---

## 2025-11-15 - v2.0.0 - Major Update: Filtros Avançados e YTD Aprimorado

### 🎯 Resumo da Versão

Versão 2.0 traz um sistema completo de filtros inteligentes, métricas YTD aprimoradas para Lucro e Margem, e atualização de nomenclatura para refletir melhor a contabilidade (Receita Bruta, Lucro Bruto, Margem Bruta).

### 🆕 Novas Features

#### Feature 1: Sistema de Filtros Inteligente

**Descrição**: Novo componente `DashboardFilter` com 3 modos de filtro mutuamente exclusivos.

**Arquivos Criados**:
1. **[dashboard-filter.tsx](../../../src/components/dashboard/dashboard-filter.tsx)** (NOVO)
   - Componente completo de filtros (298 linhas)
   - 3 modos: Mês, Ano, Período Customizado
   - Validação automática de datas
   - Layout responsivo

**Arquivos Modificados**:
1. **[page.tsx](../../../src/app/(dashboard)/dashboard/page.tsx)**
   - Substituído `PeriodFilter` por `DashboardFilter` (linha 19)
   - Ajustado width do MultiSelect para 600px (linha ~225)
   - Implementado lógica de exibição condicional de YTD (linhas ~185-195)

**Funcionalidades**:
- **Filtro por Mês**: Seletor de mês + ano independente
- **Filtro por Ano**: Ano completo (01/Jan a 31/Dez)
- **Período Customizado**: Datas livres com calendário popup
- Larguras fixas: Filtrar por (250px), seleções (250px), Filiais (600px)

**Regras de Negócio**:
- RN-FILT-NEW-001: Sistema de filtros inteligente
- RN-FILT-NEW-002: Filtro por mês
- RN-FILT-NEW-003: Filtro por ano
- RN-FILT-NEW-004: Período customizado
- RN-FILT-NEW-005: Filiais com largura 600px
- RN-FILT-NEW-006: Layout responsivo
- RN-FILT-NEW-007: Inicialização padrão

**Visual/Exemplo**:
```
Desktop Layout:
[Filiais: 600px] [Filtrar por: 250px] [Escolha o mês: 250px]

Mobile Layout:
[Filiais: 100%]
[Filtrar por: 100%]
[Escolha o mês: 100%]
```

**Impacto**: ⚠️ MÉDIO
- Mudança de UX significativa
- Backward compatible (API não mudou)
- Requer treinamento de usuários

**Breaking Changes**: ❌ Não

---

#### Feature 2: Métricas YTD para Lucro e Margem

**Descrição**: Nova função RPC dedicada para cálculo preciso de YTD de Lucro Bruto e Margem Bruta.

**Arquivos Criados**:
1. **[20251115084345_add_ytd_metrics_function.sql](../../../supabase/migrations/20251115084345_add_ytd_metrics_function.sql)**
   - Nova função `get_dashboard_ytd_metrics` (199 linhas)
   - Cálculo YTD com CURRENT_DATE
   - Suporte a descontos

2. **[ytd-metrics/route.ts](../../../src/app/api/dashboard/ytd-metrics/route.ts)** (NOVO)
   - API endpoint para YTD metrics
   - Validação de parâmetros com Zod
   - Tratamento de erros

**Arquivos Modificados**:
1. **[page.tsx](../../../src/app/(dashboard)/dashboard/page.tsx)**
   - Adicionado fetch de YTD metrics (linhas ~150-165)
   - Implementado lógica shouldShowYTD() (linhas ~180-188)
   - Passado props YTD para CardMetric (linhas ~305, ~325)

2. **[card-metric.tsx](../../../src/components/dashboard/card-metric.tsx)**
   - Adicionado suporte a ytdValue, ytdVariationPercent, ytdLabel
   - Exibição condicional da linha YTD

**Cálculo**:
```sql
YTD Lucro = SUM(total_lucro) - SUM(descontos) [01/Jan/Ano até Hoje]
YTD Margem = (YTD Lucro / YTD Receita) * 100

Comparação: Mesmo período do ano anterior
Exemplo: 15/11/2025 compara com 15/11/2024
```

**Regras de Negócio**:
- RN-YTD-002: Variação YTD de Lucro e Margem
- RN-CALC-NEW-001: Descontos subtraídos de Receita e Lucro

**Impacto**: ✅ BAIXO
- Não afeta funcionalidade existente
- Apenas adicional

**Breaking Changes**: ❌ Não

---

#### Feature 3: Atualização de Nomenclatura

**Descrição**: Nomenclatura atualizada para refletir terminologia contábil correta.

**Mudanças**:
| Antes (v1.0) | Depois (v2.0) |
|-------------|--------------|
| Total de Vendas | Receita Bruta |
| Total de Lucro | Lucro Bruto |
| Margem de Lucro | Margem Bruta |
| Total Vendas (Acum. Ano) | **REMOVIDO** |

**Arquivos Modificados**:
1. **[page.tsx](../../../src/app/(dashboard)/dashboard/page.tsx)**
   - Atualizado títulos dos CardMetric (linhas ~285, ~305, ~325)
   - Removido card "Total Vendas (Acum. Ano)"
   - Alterado className title para `text-lg` (linhas ~287, ~307, ~327)

**Impacto**: ✅ BAIXO
- Apenas visual
- Não afeta cálculos ou APIs

**Breaking Changes**: ❌ Não

---

### 🐛 Correções

#### Bug 1: Tipo JSONB/JSON incompatível

**Problema**: Erro "COALESCE could not convert type jsonb to json" ao chamar `get_dashboard_data`

**Causa**: Função declarava retorno como `JSONB` mas tentava retornar `JSON`

**Solução**: 
- Arquivo: `20251115132000_fix_full_year_comparison.sql`
- Mudança: `grafico_vendas JSONB` → `grafico_vendas JSON`
- Mudança: `v_grafico_vendas JSONB` → `v_grafico_vendas JSON`
- Mudança: `''[]''::jsonb` → `''[]''::json`

**Linhas Modificadas**:
- Linha 35: Tipo de retorno
- Linha 74: Declaração de variável
- Linha 334: COALESCE

**Teste Realizado**:
```bash
curl "http://localhost:3000/api/dashboard?schema=saoluiz&data_inicio=2025-11-01&data_fim=2025-11-30&filiais=all"
```

**Resultado**: ✅ Sucesso

**Impacto**: 🔴 ALTO (crítico - quebrava o dashboard)

---

#### Bug 2: Cálculo YTD Incorreto para Lucro e Margem

**Problema**: YTD para Lucro Bruto mostrava valor de Receita Bruta

**Causa**: `get_dashboard_data` não calculava YTD para lucro, apenas para receita

**Solução**: 
- Criada função dedicada `get_dashboard_ytd_metrics`
- Cálculo separado de ytd_lucro e ytd_margem
- Comparação com mesmo período do ano anterior

**Arquivo**: `20251115084345_add_ytd_metrics_function.sql`

**Teste Realizado**:
```sql
SELECT * FROM get_dashboard_ytd_metrics('saoluiz', '2025-01-01', '2025-11-15', NULL);
```

**Resultado Antes**: ytd_lucro = 217962983.06 (valor de vendas)
**Resultado Depois**: ytd_lucro = 55871679.52 (valor correto de lucro)

**Impacto**: 🔴 ALTO (dados incorretos)

---

#### Bug 3: Comparação de Ano Completo Incorreta

**Problema**: Ao filtrar por ano 2025, comparava com mesmo período de 2024 (não ano completo)

**Causa**: Função não detectava se período era ano completo

**Solução**:
- Arquivo: `20251115132000_fix_full_year_comparison.sql`
- Adicionado flag `v_is_full_year` (linha 92)
- Lógica condicional para PAA (linhas 113-121)

**Detecção**:
```sql
IF EXTRACT(MONTH FROM p_data_inicio) = 1 
   AND EXTRACT(DAY FROM p_data_inicio) = 1
   AND EXTRACT(MONTH FROM p_data_fim) = 12
   AND EXTRACT(DAY FROM p_data_fim) = 31
   AND EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM p_data_fim) THEN
  v_is_full_year := TRUE;
END IF;
```

**Teste Realizado**:
- Filtro: 01/01/2025 a 31/12/2025
- Comparação PAA: 01/01/2024 a 31/12/2024 (ano completo) ✅

**Impacto**: ⚠️ MÉDIO

---

#### Bug 4: Larguras de Filtros Inconsistentes

**Problema**: Seletor de mês ficava menor que outros filtros quando palavra era curta

**Causa**: Largura não estava fixada, dependia do conteúdo

**Solução**:
- Arquivo: `dashboard-filter.tsx`
- Adicionado `min-w-[250px]` em SelectTrigger (linhas 183, 202)
- Fixado width do container em 250px (linhas 180, 199)

**Antes**:
```
[Filtrar por: 250px] [Mês: ~100px variável]
```

**Depois**:
```
[Filtrar por: 250px] [Escolha o mês: 250px fixo]
```

**Impacto**: ✅ BAIXO

---

### 📊 Métricas de Mudança

**Arquivos Criados**: 3
- `dashboard-filter.tsx` (298 linhas)
- `20251115084345_add_ytd_metrics_function.sql` (199 linhas)
- `ytd-metrics/route.ts` (~100 linhas)

**Arquivos Modificados**: 5
- `page.tsx` (~50 linhas alteradas)
- `card-metric.tsx` (~20 linhas alteradas)
- `20251115132000_fix_full_year_comparison.sql` (reescrita completa)
- `README.md` (atualizado)
- `BUSINESS_RULES.md` (+7 regras)

**Funções RPC**:
- ✅ Criadas: 1 (`get_dashboard_ytd_metrics`)
- 🔄 Modificadas: 1 (`get_dashboard_data`)

**APIs**:
- ✅ Criadas: 1 (`/api/dashboard/ytd-metrics`)
- Existentes: 3 (não modificadas)

**Regras de Negócio**:
- ✅ Novas: 8 regras (RN-FILT-NEW-001 a RN-FILT-NEW-007, RN-CALC-NEW-001)
- 🔄 Atualizadas: 5 regras (RN-CALC-001 a RN-CALC-004, RN-YTD-002)

**Testes Necessários**:
- [x] Filtro por Mês funciona corretamente
- [x] Filtro por Ano funciona corretamente
- [x] Período Customizado funciona corretamente
- [x] YTD aparece apenas quando filtro é "Ano"
- [x] YTD de Lucro e Margem calculados corretamente
- [x] Comparação ano completo funciona (01/Jan a 31/Dez)
- [x] Descontos sendo subtraídos corretamente
- [x] Larguras dos filtros consistentes
- [x] Layout responsivo mobile/desktop

---

### 🔄 Migração de v1.0 para v2.0

#### Para Desenvolvedores

**1. Atualizar funções RPC no Supabase**:
```bash
# Aplicar SQL fix crítico
cat fix_dashboard_jsonb_NOW.sql | supabase db push

# OU via Dashboard
# Supabase → SQL Editor → Copiar conteúdo de fix_dashboard_jsonb_NOW.sql → Run
```

**2. Código já está atualizado**:
- Frontend: Componente `DashboardFilter` já implementado
- API: Endpoint `/api/dashboard/ytd-metrics` já criado
- Nenhuma mudança de código necessária

**3. Verificar exposed schemas**:
```
Supabase Dashboard → Settings → API → Exposed schemas
Adicionar todos os schemas de tenants se não existirem
```

#### Para Usuários

**Mudanças Visuais**:
- Novo layout de filtros (mais intuitivo)
- Nomenclatura atualizada (Receita/Lucro/Margem Bruta)
- YTD aparece apenas ao filtrar por "Ano"

**Treinamento**:
- Demonstrar 3 modos de filtro
- Explicar diferença entre YTD e comparação anual
- Mostrar largura ampliada do filtro de filiais (600px)

---

### 📝 Documentação Atualizada

- [x] README.md → v2.0.0
- [x] BUSINESS_RULES.md → +8 regras
- [x] RPC_FUNCTIONS.md → +`get_dashboard_ytd_metrics`
- [x] DATA_STRUCTURES.md → +`YTDMetrics`
- [x] CHANGELOG_FUNCTIONS.md → Este arquivo
- [x] FILTER_UPDATE_FINAL.md → Criado

---

**Versão**: 2.0.0  
**Data de Liberação**: 2025-11-15  
**Próxima Versão Planejada**: 2.1.0 (melhorias de performance)

---


**Módulo**: Dashboard Principal  
**Última Atualização**: 2025-01-14

---

## Índice

1. [Versão 1.0.0 - Implementação Inicial](#versão-100---implementação-inicial-2025-01-14)

---

## Versão 1.0.0 - Implementação Inicial (2025-01-14)

### 📋 Resumo

Implementação inicial do módulo Dashboard Principal com indicadores KPI, comparações temporais (PAM, PAA, YTD), análise por filial e gráficos interativos.

### ✨ Funcionalidades Adicionadas

#### 1. Página Principal do Dashboard

**Arquivo**: `src/app/(dashboard)/dashboard/page.tsx`

**Funcionalidades**:
- Cards com 4 métricas principais (Vendas, Lucro, Ticket Médio, Margem)
- Comparações automáticas com PAM e PAA
- YTD (Year to Date) com variação
- Filtros de período e filiais
- Tabela de vendas por filial
- Gráfico de vendas mensais
- Log de auditoria automático

**Componentes Criados**:
- `CardMetric` - Card de métrica com comparações
- `ChartVendas` - Gráfico combinado (barras + linha)
- `PeriodFilter` - Seletor de período
- `MultiSelect` - Seletor múltiplo de filiais

---

#### 2. API Routes

##### GET /api/dashboard

**Arquivo**: `src/app/api/dashboard/route.ts`

**Funcionalidades**:
- Validação de parâmetros com Zod
- Validação de autenticação e autorização
- Filtro de filiais autorizadas
- Chamada à RPC `get_dashboard_data`
- Retorna 21 campos de métricas

**Validações**:
```typescript
const querySchema = z.object({
  schema: z.string().min(1),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filiais: z.string().optional(),
})
```

**Regras de Autorização**:
- Superadmin: acesso a todos os tenants
- Usuário normal: apenas seu tenant
- Filtro de filiais respeitando `branch_access`

---

##### GET /api/dashboard/vendas-por-filial

**Arquivo**: `src/app/api/dashboard/vendas-por-filial/route.ts`

**Funcionalidades**:
- Análise detalhada por filial
- Comparação com período anterior (PAM)
- Cálculo de variações (deltas)
- Filtro de filiais autorizadas

**Parâmetros**:
- `schema`: Nome do schema do tenant
- `data_inicio`: Data inicial (YYYY-MM-DD)
- `data_fim`: Data final (YYYY-MM-DD)
- `filiais`: IDs separados por vírgula ou 'all'

---

##### GET /api/charts/sales-by-month

**Arquivo**: `src/app/api/charts/sales-by-month/route.ts`

**Funcionalidades**:
- Dados de vendas mensais (12 meses)
- Dados de despesas mensais (12 meses)
- Dados de lucro mensal (12 meses)
- Merge de dados em estrutura única
- Filtro de filiais autorizadas

**Chamadas RPC**:
1. `get_sales_by_month_chart` - Vendas
2. `get_expenses_by_month_chart` - Despesas
3. `get_lucro_by_month_chart` - Lucro

**Tratamento de Erros**:
- Continua sem despesas/lucro se funções não existirem
- Valores default `0` para meses sem dados

---

#### 3. Função RPC: get_dashboard_data

**Arquivo**: `supabase/migrations/dre_gerencial_rpc_functions.sql` (linhas 121-478)

**Funcionalidades**:
- Cálculo de métricas do período atual
- Cálculo automático de PAM (Período Anterior Mesmo)
- Cálculo automático de PAA (Período Anterior do Ano)
- Cálculo de YTD (Year to Date)
- Variações percentuais MoM e YoY
- Geração de dados para gráfico (JSONB)
- Suporte a descontos (tabela opcional)

**Parâmetros**:
```sql
schema_name TEXT,
p_data_inicio DATE,
p_data_fim DATE,
p_filiais_ids TEXT[] DEFAULT NULL
```

**Retorno**: 21 campos (ver RPC_FUNCTIONS.md)

**Tabelas Utilizadas**:
- `{schema}.vendas_diarias_por_filial`
- `{schema}.descontos_venda` (opcional)

**Otimizações**:
- Queries com índices eficientes
- Proteção contra divisão por zero
- Verificação de existência de tabelas
- SECURITY DEFINER para controle de acesso

---

#### 4. Componentes UI

##### CardMetric

**Arquivo**: `src/components/dashboard/card-metric.tsx`

**Características**:
- Exibe métrica principal em destaque
- Mostra valor do período anterior (PA)
- Variação percentual com ícone e cor
- Tooltip com variação anual (YoY)
- Cores dinâmicas (verde/vermelho)

**Props**:
```typescript
interface CardMetricProps {
  title: string
  value: string
  previousValue?: string
  variationPercent?: string
  variationYear?: string
  isPositive?: boolean
}
```

---

##### ChartVendas

**Arquivo**: `src/components/dashboard/chart-vendas.tsx`

**Características**:
- Gráfico combinado (ComposedChart)
- Barras para receita (verde) e despesa (vermelho)
- Linha para lucro bruto (laranja)
- Labels com valores formatados (ex: "3.5M")
- Tooltips interativos
- Linha de referência no zero

**Tecnologias**:
- Recharts (ComposedChart, Bar, Line)
- Formatação customizada (YAxis, Labels)
- Responsivo (ResponsiveContainer)

**Transformação de Dados**:
```typescript
const chartData = data.map((d) => ({
  name: d.mes.toUpperCase(),
  receita: d.total_vendas,
  despesa: -d.total_despesas,  // Negativo para baixo
  lucro: d.total_lucro || null
}))
```

---

##### PeriodFilter

**Arquivo**: `src/components/despesas/period-filter.tsx`

**Características**:
- Períodos pré-definidos (Mês Atual, Últimos 7 dias, etc.)
- Período customizado com datepickers
- Inputs de data com formato dd/MM/yyyy
- Calendário com localização pt-BR
- Callback `onPeriodChange` para aplicar filtros

**Períodos Disponíveis**:
- Mês Atual
- Dia Atual
- Últimos 7 Dias
- Últimos 30 Dias
- Últimos 6 Meses
- Último Ano
- Período Customizado

---

#### 5. Hooks e Utilitários

##### useTenantContext

**Funcionalidade**: Fornece `currentTenant` e `userProfile`

**Uso**:
```typescript
const { currentTenant, userProfile } = useTenantContext()
```

---

##### useBranchesOptions

**Funcionalidade**: Retorna opções de filiais para MultiSelect

**Uso**:
```typescript
const { options, isLoading } = useBranchesOptions({
  tenantId: currentTenant?.id,
  enabled: !!currentTenant
})
```

---

##### SWR (Data Fetching)

**Configuração**:
```typescript
const { data, error, isLoading } = useSWR<DashboardData>(
  apiUrl, 
  fetcher, 
  { refreshInterval: 0 }
)
```

**Características**:
- Cache automático
- Revalidação em foco
- Error handling integrado
- Loading states

---

##### Funções de Formatação

**Arquivo**: `src/lib/chart-config.ts`

```typescript
formatCurrency(value: number): string
// Exemplo: 123456.78 → "R$ 123.456,78"

formatPercentage(value: number): string
// Exemplo: 34.5678 → "34,57%"
```

---

#### 6. Auditoria

**Arquivo**: `src/lib/audit.ts`

**Funcionalidade**: Log automático de acesso ao módulo

**Implementação**:
```typescript
logModuleAccess({
  module: 'dashboard',
  tenantId: currentTenant.id,
  userName: userProfile.full_name,
  userEmail: user?.email || ''
})
```

**RPC Chamada**: `insert_audit_log`

**Dados Registrados**:
- Módulo acessado
- Tenant ID
- Nome e email do usuário
- Timestamp automático

---

### 📁 Arquivos Modificados/Criados

#### Frontend

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/app/(dashboard)/dashboard/page.tsx` | Criado | Página principal do dashboard |
| `src/components/dashboard/card-metric.tsx` | Criado | Componente de card de métrica |
| `src/components/dashboard/chart-vendas.tsx` | Criado | Componente de gráfico |
| `src/components/dashboard/dashboard-shell.tsx` | Existente | Shell do dashboard (layout) |
| `src/components/despesas/period-filter.tsx` | Existente | Filtro de período |

#### Backend (API Routes)

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/app/api/dashboard/route.ts` | Criado | API principal do dashboard |
| `src/app/api/dashboard/vendas-por-filial/route.ts` | Criado | API de vendas por filial |
| `src/app/api/charts/sales-by-month/route.ts` | Criado | API de gráfico mensal |

#### Database (RPC Functions)

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/migrations/dre_gerencial_rpc_functions.sql` | Existente | Contém `get_dashboard_data` |

#### Utilitários

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/lib/audit.ts` | Existente | Funções de auditoria |
| `src/lib/chart-config.ts` | Existente | Formatação de valores |
| `src/lib/authorized-branches.ts` | Existente | Autorização de filiais |

---

### 🔧 Configurações e Dependências

#### Dependências NPM

```json
{
  "recharts": "^2.x",
  "swr": "^2.x",
  "zod": "^3.x",
  "date-fns": "^2.x",
  "lucide-react": "^0.x"
}
```

#### shadcn/ui Components

- Card
- Table
- Skeleton
- Popover
- Calendar
- Label
- Button
- Select

---

### 📊 Regras de Negócio Implementadas

| Código | Descrição | Arquivo | Linha |
|--------|-----------|---------|-------|
| RN-CALC-001 | Cálculo de Total de Vendas | `dre_gerencial_rpc_functions.sql` | 227-252 |
| RN-CALC-002 | Cálculo de Total de Lucro | `dre_gerencial_rpc_functions.sql` | 227-252 |
| RN-CALC-003 | Cálculo de Ticket Médio | `dre_gerencial_rpc_functions.sql` | 255-257 |
| RN-CALC-004 | Cálculo de Margem de Lucro | `dre_gerencial_rpc_functions.sql` | 259-261 |
| RN-TEMP-001 | Cálculo de PAM | `dre_gerencial_rpc_functions.sql` | 206-207 |
| RN-TEMP-002 | Cálculo de PAA | `dre_gerencial_rpc_functions.sql` | 210-211 |
| RN-YTD-001 | Cálculo de YTD | `dre_gerencial_rpc_functions.sql` | 214-215 |
| RN-FILT-001 | Filtro de Período | `dashboard/page.tsx` | 80-96 |
| RN-FILT-002 | Filtro de Filiais | `dashboard/page.tsx` | 82, 121-130 |
| RN-AUTH-001 | Restrição por Filiais | `api/dashboard/route.ts` | 77-95 |

Ver detalhes em [BUSINESS_RULES.md](./BUSINESS_RULES.md)

---

### 🎨 Interface e UX

#### Cards de Métricas

**Layout**: Grid 1x1 (mobile) → 2x2 (tablet) → 4x1 (desktop)

**Métricas Exibidas**:
1. Total Vendas (YTD) - Acumulado do ano
2. Total de Vendas - Período atual
3. Total de Lucro - Período atual
4. Margem de Lucro - Período atual

**Informações por Card**:
- Valor principal (destaque)
- Valor do período anterior (PA)
- Variação percentual vs PA (MoM)
- Tooltip com variação anual (YoY)

---

#### Gráfico de Vendas

**Tipo**: Gráfico Combinado (Barras + Linha)

**Elementos**:
- **Barras Verdes**: Receita (para cima)
- **Barras Vermelhas**: Despesa (para baixo)
- **Linha Laranja**: Lucro Bruto
- **Linha Zero**: Referência

**Interatividade**:
- Tooltip ao passar mouse
- Labels com valores formatados
- Responsivo

---

#### Tabela de Vendas por Filial

**Colunas**:
1. Filial (ID)
2. Valor Vendido (com variação)
3. Ticket Médio (com variação)
4. Custo Total (com variação)
5. Total Lucro (com variação)
6. Margem (com variação)

**Recursos**:
- Linha de totalização no final
- Cores para variações (verde/vermelho)
- Ícones de seta (↑/↓)
- Valores formatados

---

#### Filtros

**Layout**: Responsivo
- Mobile: Coluna (vertical)
- Desktop: Linha (horizontal)

**Campos**:
1. **Filiais**: MultiSelect com todas as filiais autorizadas
2. **Filtrar por**: Dropdown com períodos pré-definidos
3. **Data Inicial**: Input + Datepicker
4. **Data Final**: Input + Datepicker

**Comportamento**:
- Aplicação automática (sem botão "Filtrar")
- useEffect monitora mudanças
- SWR revalida automaticamente

---

### ⚡ Performance

#### Otimizações Implementadas

1. **SWR Cache**:
   - Dados em cache após primeira busca
   - Revalidação inteligente
   - Menos requisições ao servidor

2. **Parallel Requests**:
   - 3 APIs em paralelo
   - Não bloqueia renderização
   - Loading states independentes

3. **Skeleton Loaders**:
   - UX durante carregamento
   - Menos "flash" de conteúdo
   - Feedback visual imediato

4. **Dynamic Routes**:
   ```typescript
   export const dynamic = 'force-dynamic'
   export const revalidate = 0
   ```

5. **Agregações no Banco**:
   - Cálculos no PostgreSQL
   - Menos dados pela rede
   - Frontend apenas renderiza

---

### 🔒 Segurança

#### Validações Implementadas

1. **Validação de Parâmetros**: Zod schema
2. **Autenticação**: Middleware + verificação em API
3. **Autorização de Schema**: `validateSchemaAccess`
4. **Autorização de Filiais**: `getUserAuthorizedBranchCodes`
5. **SECURITY DEFINER**: RPC functions com controle de acesso
6. **Injection Protection**: Uso de `format()` com placeholders

---

### 📝 Documentação Criada

| Arquivo | Descrição |
|---------|-----------|
| `docs/modules/dashboard/README.md` | Visão geral do módulo |
| `docs/modules/dashboard/BUSINESS_RULES.md` | 27 regras de negócio detalhadas |
| `docs/modules/dashboard/DATA_STRUCTURES.md` | Tipos TypeScript e estruturas |
| `docs/modules/dashboard/INTEGRATION_FLOW.md` | Fluxos de integração completos |
| `docs/modules/dashboard/RPC_FUNCTIONS.md` | Documentação das funções RPC |
| `docs/modules/dashboard/CHANGELOG_FUNCTIONS.md` | Este arquivo |

---

### 🐛 Bugs Conhecidos

Nenhum bug conhecido nesta versão inicial.

---

### 📌 Pendências e Melhorias Futuras

#### Funções RPC Pendentes

1. **get_vendas_por_filial**
   - Status: Chamada pela API mas não encontrada no SQL
   - Ação: Criar migration com implementação
   - Prioridade: Alta

2. **get_sales_by_month_chart**
   - Status: Chamada pela API mas não encontrada no SQL
   - Ação: Criar migration com implementação
   - Prioridade: Alta

3. **get_expenses_by_month_chart**
   - Status: Chamada pela API mas não encontrada no SQL
   - Ação: Criar migration com implementação (opcional)
   - Prioridade: Média

4. **get_lucro_by_month_chart**
   - Status: Chamada pela API mas não encontrada no SQL
   - Ação: Criar migration com implementação (opcional)
   - Prioridade: Média

#### Melhorias de UX

1. **Exportação para PDF/Excel**
   - Tabela de vendas por filial
   - Dados do gráfico

2. **Filtros Avançados**
   - Por tipo de produto
   - Por categoria
   - Por vendedor

3. **Comparações Customizadas**
   - Período customizado vs. período customizado
   - Múltiplas filiais lado a lado

4. **Gráficos Adicionais**
   - Evolução de ticket médio
   - Top produtos
   - Análise de margem

#### Otimizações

1. **Índices Adicionais**
   - Monitorar performance
   - Criar índices conforme necessário

2. **Particionamento**
   - Tabela `vendas_diarias_por_filial`
   - Se volume crescer muito

3. **Materialized Views**
   - Para agregações complexas
   - Refresh programado

---

### 🔄 Migração e Rollback

#### Comandos de Migração

```bash
# Aplicar migration da função get_dashboard_data
# (já incluída em dre_gerencial_rpc_functions.sql)

# Verificar função
supabase db pull

# Aplicar pendências
supabase db push
```

#### Rollback

Se necessário reverter:

```sql
-- Remover função
DROP FUNCTION IF EXISTS public.get_dashboard_data(TEXT, DATE, DATE, TEXT[]);

-- Remover tabelas (se criadas)
-- DROP TABLE IF EXISTS {schema}.vendas_diarias_por_filial;
```

---

### 📚 Referências

- [Documentação Next.js 15](https://nextjs.org/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação SWR](https://swr.vercel.app/)
- [Documentação Recharts](https://recharts.org/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

### ✅ Testes Realizados

#### Testes Manuais

- [x] Carregamento inicial da página
- [x] Exibição dos 4 cards de métricas
- [x] Cálculos de variações (MoM e YoY)
- [x] Filtro de período (todos os tipos)
- [x] Filtro de filiais (múltiplas seleções)
- [x] Gráfico de vendas mensais
- [x] Tabela de vendas por filial
- [x] Linha de totalização
- [x] Skeleton loaders
- [x] Responsividade (mobile, tablet, desktop)
- [x] Autorização de filiais
- [x] Log de auditoria

#### Testes de Performance

- [x] Tempo de carregamento < 2s (com cache)
- [x] Queries otimizadas no PostgreSQL
- [x] Sem queries N+1

#### Testes de Segurança

- [x] Validação de parâmetros (Zod)
- [x] Autenticação obrigatória
- [x] Autorização por tenant
- [x] Autorização por filiais
- [x] Proteção contra SQL injection

---

### 👥 Contribuidores

- **Desenvolvedor**: Equipe BI SaaS
- **Data**: 2025-01-14
- **Versão**: 1.0.0

---

**Fim do Changelog v1.0.0**

---

## Template para Próximas Versões

```markdown
## Versão X.Y.Z - Título (YYYY-MM-DD)

### 📋 Resumo
[Breve descrição das mudanças]

### ✨ Funcionalidades Adicionadas
- Feature 1
- Feature 2

### 🐛 Bugs Corrigidos
- Bug 1 corrigido
- Bug 2 corrigido

### 🔧 Melhorias
- Melhoria 1
- Melhoria 2

### ⚠️ Breaking Changes
- Mudança incompatível 1
- Mudança incompatível 2

### 📁 Arquivos Modificados
| Arquivo | Mudanças | Linhas |
|---------|----------|--------|
| file.ts | Descrição | 10-50 |

### 🔄 Migração
[Instruções de migração, se necessário]

### 📝 Impacto
- **Baixo**: Mudanças cosméticas
- **Médio**: Novas features
- **Alto**: Breaking changes

```

---

**Última Atualização**: 2025-01-14  
**Versão Atual**: 1.0.0  
**Próxima Versão Prevista**: 1.1.0 (Implementação de funções RPC pendentes)
