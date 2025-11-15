# Regras de Negócio - Dashboard Principal

**Versão**: 2.0.0  
**Última Atualização**: 2025-11-15  
**Módulo**: Dashboard Principal

---

## Índice

1. [Regras de Cálculo de Indicadores](#regras-de-cálculo-de-indicadores)
2. [Regras de Comparação Temporal](#regras-de-comparação-temporal)
3. [Regras de Filtros](#regras-de-filtros)
4. [Regras de Filtros Avançados (v2.0)](#regras-de-filtros-avançados-v20)
5. [Regras de Autorização](#regras-de-autorização)
6. [Regras de Exibição](#regras-de-exibição)
7. [Regras de Auditoria](#regras-de-auditoria)

---

## Regras de Cálculo de Indicadores

### RN-CALC-001: Cálculo de Receita Bruta
**Descrição**: A Receita Bruta é calculada somando `valor_total` da tabela `vendas_diarias_por_filial`, subtraindo descontos quando a tabela `descontos_venda` existir.

**Fórmula**:
```
Receita Bruta = SUM(vendas_diarias_por_filial.valor_total) - SUM(descontos_venda.valor_desconto)
```

**Implementação**: 
- Arquivo: `supabase/migrations/20251115132000_fix_full_year_comparison.sql`
- Função: `get_dashboard_data`
- Linhas: 136-162

**Exemplo**:
```sql
-- Vendas: R$ 100.000,00
-- Descontos: R$ 5.000,00
-- Receita Bruta = R$ 95.000,00
```

**Nomenclatura Atualizada** (v2.0): "Total de Vendas" → "Receita Bruta"

---

### RN-CALC-002: Cálculo de Lucro Bruto
**Descrição**: O Lucro Bruto é calculado somando `total_lucro` da tabela `vendas_diarias_por_filial`, subtraindo descontos quando existirem.

**Fórmula**:
```
Lucro Bruto = SUM(vendas_diarias_por_filial.total_lucro) - SUM(descontos_venda.valor_desconto)
```

**Observação**: Descontos são subtraídos tanto da Receita Bruta quanto do Lucro Bruto.

**Implementação**: 
- Arquivo: `supabase/migrations/20251115132000_fix_full_year_comparison.sql`
- Função: `get_dashboard_data`
- Linhas: 136-162

**Nomenclatura Atualizada** (v2.0): "Total de Lucro" → "Lucro Bruto"

---

### RN-CALC-003: Cálculo de Ticket Médio
**Descrição**: O ticket médio é calculado dividindo o total de vendas pelo total de transações.

**Fórmula**:
```
Ticket Médio = Total Vendas / Total Transações
```

**Condição**: Se `total_transacoes = 0`, então `ticket_medio = 0`

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 255-257

**Exemplo**:
```
Vendas: R$ 100.000,00
Transações: 500
Ticket Médio = R$ 100.000 / 500 = R$ 200,00
```

---

### RN-CALC-004: Cálculo de Margem Bruta
**Descrição**: A Margem Bruta é calculada dividindo o Lucro Bruto pela Receita Bruta e multiplicando por 100.

**Fórmula**:
```
Margem Bruta (%) = (Lucro Bruto / Receita Bruta) × 100
```

**Condição**: Se `receita_bruta = 0`, então `margem_bruta = 0`

**Implementação**: 
- Arquivo: `supabase/migrations/20251115132000_fix_full_year_comparison.sql`
- Função: `get_dashboard_data`
- Linhas: 169-171

**Exemplo**:
```
Lucro Bruto: R$ 30.000,00
Receita Bruta: R$ 100.000,00
Margem Bruta = (30.000 / 100.000) × 100 = 30,00%
```

**Nomenclatura Atualizada** (v2.0): "Margem de Lucro" → "Margem Bruta"

---

## Regras de Comparação Temporal

### RN-TEMP-001: Cálculo de PAM (Período Anterior Mesmo)
**Descrição**: O PAM representa o mesmo período no mês anterior. Usado para comparação mês-a-mês (MoM - Month over Month).

**Cálculo de Datas**:
```
data_inicio_pam = data_inicio - 1 mês
data_fim_pam = data_fim - 1 mês
```

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 206-207

**Exemplo**:
```
Período Atual: 01/01/2025 a 31/01/2025
PAM: 01/12/2024 a 31/12/2024
```

---

### RN-TEMP-002: Cálculo de PAA (Período Anterior do Ano)
**Descrição**: O PAA representa o mesmo período no ano anterior. Usado para comparação ano-a-ano (YoY - Year over Year).

**Cálculo de Datas**:
```
data_inicio_paa = data_inicio - 1 ano
data_fim_paa = data_fim - 1 ano
```

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 210-211

**Exemplo**:
```
Período Atual: 01/01/2025 a 31/01/2025
PAA: 01/01/2024 a 31/01/2024
```

---

### RN-TEMP-003: Cálculo de Variação Percentual (MoM)
**Descrição**: Calcula a variação percentual entre o período atual e o PAM.

**Fórmula**:
```
Variação MoM (%) = ((Valor Atual - Valor PAM) / Valor PAM) × 100
```

**Condição**: Se `valor_pam = 0`, então `variacao = 0`

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`

**Exemplo**:
```
Vendas Atual: R$ 120.000,00
Vendas PAM: R$ 100.000,00
Variação = ((120.000 - 100.000) / 100.000) × 100 = +20,00%
```

---

### RN-TEMP-004: Cálculo de Variação Percentual (YoY)
**Descrição**: Calcula a variação percentual entre o período atual e o PAA.

**Fórmula**:
```
Variação YoY (%) = ((Valor Atual - Valor PAA) / Valor PAA) × 100
```

**Condição**: Se `valor_paa = 0`, então `variacao = 0`

---

### RN-YTD-001: Cálculo de YTD (Year to Date) - v2.0.2 ATUALIZADO

**Descrição**: O YTD (Year to Date) acumula valores desde o início do ano até uma data de referência. A função `get_dashboard_ytd_metrics` calcula YTD para Lucro Bruto e Margem Bruta de forma inteligente, diferenciando ano atual de anos passados.

**Cálculo de Datas (Lógica Corrigida em v2.0.2)**:
```
data_inicio_ytd = primeiro dia do ano de p_data_inicio
data_fim_ytd = 
  SE ano_filtrado == ano_atual ENTÃO
    MENOR_ENTRE(p_data_fim, CURRENT_DATE)  // Limita até hoje
  SENÃO
    p_data_fim  // Usa data final do filtro para anos passados
```

**Por que a diferença?**
- **Ano Atual**: Usar `CURRENT_DATE` garante comparação justa (mesmo período em ambos os anos)
- **Anos Passados**: Já são históricos completos, usar data final do filtro

**Implementação**: 
- Arquivo: `supabase/migrations/20251115_fix_ytd_for_past_years.sql`
- Função: `get_dashboard_ytd_metrics`
- Linhas: 54-62

**Exemplos**:

**Caso 1: Filtro Ano Atual (2025)**
```
Hoje: 15/11/2025
Filtro: 01/01/2025 a 31/12/2025
EXTRACT(YEAR FROM 2025-01-01) = EXTRACT(YEAR FROM CURRENT_DATE) ✓

YTD 2025: 01/01/2025 a 15/11/2025  (até hoje)
YTD 2024: 01/01/2024 a 15/11/2024  (mesmo período)
```

**Caso 2: Filtro Ano Passado (2024)**
```
Hoje: 15/11/2025
Filtro: 01/01/2024 a 31/12/2024
EXTRACT(YEAR FROM 2024-01-01) ≠ EXTRACT(YEAR FROM CURRENT_DATE) ✗

YTD 2024: 01/01/2024 a 31/12/2024  (ano completo - histórico)
YTD 2023: 01/01/2023 a 31/12/2023  (ano completo - histórico)
```

**Bug Corrigido em v2.0.2**: Anteriormente, a função sempre usava `LEAST(p_data_fim, CURRENT_DATE)`, causando:
- Ao filtrar 2024: `LEAST(31/12/2024, 15/11/2025)` = `31/12/2024` ← YTD virava ano completo!
- Resultado: "2024 YTD" mostrava o mesmo valor de "2024" completo

---

### RN-YTD-002: Variação YTD
**Descrição**: Calcula a variação percentual entre o YTD atual e o YTD do ano anterior.

**Fórmula**:
```
Variação YTD (%) = ((YTD Atual - YTD Ano Anterior) / YTD Ano Anterior) × 100
```

---

## Regras de Filtros

### RN-FILT-001: Filtro de Período
**Descrição**: O usuário pode filtrar dados por período utilizando o componente `PeriodFilter`.

**Opções Disponíveis**:
- Mês Atual
- Dia Atual
- Últimos 7 Dias
- Últimos 30 Dias
- Últimos 6 Meses
- Último Ano
- Período Customizado

**Default**: Mês Atual (primeiro dia do mês até dia anterior)

**Implementação**: 
- Arquivo: `src/components/despesas/period-filter.tsx`

---

### RN-FILT-002: Filtro de Filiais
**Descrição**: O usuário pode filtrar dados por uma ou múltiplas filiais usando o componente `MultiSelect`.

**Comportamento**:
- Nenhuma filial selecionada = Todas as filiais (respeitando autorização)
- Uma ou mais filiais selecionadas = Apenas as filiais selecionadas

**Default**: Todas as filiais autorizadas

**Implementação**: 
- Arquivo: `src/app/(dashboard)/dashboard/page.tsx`
- Linhas: 82, 121-130

---

### RN-FILT-003: Aplicação Automática de Filtros
**Descrição**: Filtros são aplicados automaticamente quando o usuário altera período ou filiais, sem necessidade de botão "Aplicar".

**Implementação**: 
- Hook: `useEffect` que monitora mudanças em `dataInicio`, `dataFim` e `filiaisSelecionadas`
- Arquivo: `src/app/(dashboard)/dashboard/page.tsx`
- Linhas: 118-131

---

## Regras de Filtros Avançados (v2.0)

### RN-FILT-NEW-001: Sistema de Filtros Inteligente
**Descrição**: O dashboard possui um sistema de filtros com 3 modos mutuamente exclusivos.

**Modos Disponíveis**:
1. **Mês**: Filtra por um mês específico de um ano específico
2. **Ano**: Filtra pelo ano completo (01/Janeiro a 31/Dezembro)
3. **Período Customizado**: Permite seleção livre de data inicial e final

**Componente**: `DashboardFilter`
**Implementação**: [src/components/dashboard/dashboard-filter.tsx](../../../src/components/dashboard/dashboard-filter.tsx)

**Regras de UX**:
- Apenas um modo ativo por vez
- Largura do seletor "Filtrar por": **250px fixos**
- Transição suave entre modos
- Validação automática de datas

---

### RN-FILT-NEW-002: Filtro por Mês
**Descrição**: Permite selecionar um mês específico e um ano independentemente.

**Comportamento**:
```typescript
// Seletor 1: Escolha o mês
Mês selecionado: Janeiro a Dezembro (default: mês atual)

// Período calculado automaticamente
Data Início: Primeiro dia do mês selecionado
Data Fim: Último dia do mês selecionado
```

**Exemplo**:
```
Usuário seleciona: Março, 2024
Período aplicado: 01/03/2024 a 31/03/2024
```

**Implementação**:
```typescript
const firstDay = startOfMonth(new Date(selectedYear, selectedMonth))
const lastDay = endOfMonth(new Date(selectedYear, selectedMonth))
onPeriodChange(firstDay, lastDay)
```

**Largura**: 250px (seletor de mês)
**Linhas**: 73-83 do `dashboard-filter.tsx`

---

### RN-FILT-NEW-003: Filtro por Ano
**Descrição**: Permite selecionar um ano completo (01/Janeiro a 31/Dezembro).

**Comportamento**:
```typescript
// Seletor: Escolha o ano
Ano selecionado: Ano atual e 10 anos anteriores

// Período calculado automaticamente
Data Início: 01/Janeiro/Ano
Data Fim: 31/Dezembro/Ano
```

**Exemplo**:
```
Usuário seleciona: 2025
Período aplicado: 01/01/2025 a 31/12/2025
```

**Implementação**:
```typescript
const firstDay = new Date(selectedYear, 0, 1) // 1º Janeiro
const lastDay = new Date(selectedYear, 11, 31) // 31 Dezembro
onPeriodChange(firstDay, lastDay)
```

**Impacto**: 
- Ativa comparação com ano anterior **completo**
- Ativa exibição de métricas YTD para Lucro e Margem

**Largura**: 250px (seletor de ano)
**Linhas**: 85-95 do `dashboard-filter.tsx`

---

### RN-FILT-NEW-004: Filtro de Período Customizado
**Descrição**: Permite seleção livre de data inicial e final.

**Comportamento**:
- Input manual no formato: `dd/mm/aaaa`
- Calendário popup para seleção visual
- Validação: Data final deve ser >= Data inicial
- Seta separadora (→) entre os campos

**Exemplo**:
```
Data Inicial: 15/03/2024
Data Final: 20/11/2024
Período aplicado: 15/03/2024 a 20/11/2024
```

**Validação**:
```typescript
const startDate = parse(startDateInput, 'dd/MM/yyyy', new Date())
const endDate = parse(endDateInput, 'dd/MM/yyyy', new Date())

if (isValid(startDate) && isValid(endDate)) {
  onPeriodChange(startDate, endDate)
}
```

**Largura**: 140px por campo
**Linhas**: 98-108 do `dashboard-filter.tsx`

---

### RN-FILT-NEW-005: Filtro de Filiais com Largura Fixa
**Descrição**: Seleção múltipla de filiais com largura definida.

**Comportamento**:
- Componente: `MultiSelect`
- Largura no **desktop**: **600px fixos**
- Largura no **mobile**: 100% (responsivo)
- Placeholder: "Selecione..."
- Opção "Todas as Filiais" quando nenhuma selecionada

**Implementação**:
```typescript
<div className="flex flex-col gap-2 w-full lg:w-[600px] flex-shrink-0">
  <Label className="text-sm">Filiais</Label>
  <MultiSelect
    options={branchesOptions}
    selected={filiaisSelecionadas}
    onChange={setFiliaisSelecionadas}
    placeholder="Selecione..."
    className="h-10"
  />
</div>
```

**Arquivo**: [src/app/(dashboard)/dashboard/page.tsx](../../../src/app/(dashboard)/dashboard/page.tsx)

**Observação**: Mudança de largura de 200px (v1.0) para 600px (v2.0)

---

### RN-FILT-NEW-006: Layout Responsivo dos Filtros
**Descrição**: Os filtros se adaptam ao tamanho da tela.

**Desktop (lg:)**:
```
[Filiais: 600px] [Filtrar por: 250px] [Seleção dinâmica: 250px+]
```

**Mobile**:
```
[Filiais: 100%]
[Filtrar por: 100%]
[Seleção: 100%]
```

**Implementação**:
```typescript
className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4"
```

**Gap**: 16px (gap-4) entre elementos

---

### RN-FILT-NEW-007: Inicialização Padrão
**Descrição**: Ao carregar a página, o filtro é inicializado automaticamente.

**Padrão**:
- **Modo**: Mês
- **Mês**: Mês atual
- **Ano**: Ano atual
- **Filiais**: Todas (nenhuma selecionada)

**Período Inicial**:
```typescript
const firstDay = startOfMonth(new Date())
const lastDay = endOfMonth(new Date())
```

**Execução**: Automática no `useEffect` sem dependências
**Linhas**: 63-70 do `dashboard-filter.tsx`

---

## Regras de Autorização

### RN-AUTH-001: Restrição por Filiais Autorizadas
**Descrição**: Usuários podem ter restrições de acesso a filiais específicas através do campo `branch_access` no perfil.

**Lógica**:
```typescript
if (branch_access === null) {
  // Acesso a todas as filiais
} else {
  // Acesso apenas às filiais em branch_access: ["1", "3", "5"]
}
```

**Implementação**: 
- Função: `getUserAuthorizedBranchCodes`
- Arquivo: `src/lib/authorized-branches.ts`

**Referências**:
- API Dashboard: `src/app/api/dashboard/route.ts` (linhas 77-95)
- API Vendas por Filial: `src/app/api/dashboard/vendas-por-filial/route.ts` (linhas 32-52)
- API Charts: `src/app/api/charts/sales-by-month/route.ts` (linhas 37-59)

---

### RN-AUTH-002: Validação de Acesso ao Schema
**Descrição**: Antes de executar qualquer query, o sistema valida se o usuário tem acesso ao schema do tenant solicitado.

**Regras**:
1. **Superadmin com `can_switch_tenants`**: Acesso a qualquer tenant ativo
2. **Usuário normal**: Acesso apenas ao seu próprio tenant

**Implementação**: 
- Função: `validateSchemaAccess`
- Arquivo: `src/app/api/dashboard/route.ts`
- Linhas: 19-50

---

### RN-AUTH-003: Interseção de Filtros
**Descrição**: Quando usuário filtra por filiais específicas, o sistema faz interseção entre filiais solicitadas e filiais autorizadas.

**Lógica**:
```typescript
// Usuário autorizado: [1, 3, 5]
// Usuário solicita: [3, 5, 7]
// Resultado final: [3, 5] (interseção)
```

**Implementação**: 
- Arquivo: `src/app/api/dashboard/route.ts`
- Linhas: 87-94

---

## Regras de Exibição

### RN-EXB-001: Formatação de Valores Monetários
**Descrição**: Valores monetários são formatados no padrão brasileiro (R$ 1.234,56).

**Função**: `formatCurrency(value: number)`

**Exemplo**:
```typescript
formatCurrency(123456.78) // "R$ 123.456,78"
```

---

### RN-EXB-002: Formatação de Percentuais
**Descrição**: Percentuais são formatados com 2 casas decimais e símbolo %.

**Função**: `formatPercentage(value: number)`

**Exemplo**:
```typescript
formatPercentage(34.5678) // "34,57%"
```

---

### RN-EXB-003: Cores de Variação
**Descrição**: Variações são exibidas com cores indicativas:

**Regras**:
- **Verde** (`text-green-600`): Variação positiva (↑) para vendas, lucro, ticket
- **Vermelho** (`text-red-600`): Variação negativa (↓) para vendas, lucro, ticket
- **Invertido para custos**: Vermelho para aumento, verde para redução

**Implementação**: 
- Componente: `CardMetric`
- Arquivo: `src/components/dashboard/card-metric.tsx`
- Linhas: 33-34

---

### RN-EXB-004: Skeleton Loaders
**Descrição**: Durante o carregamento dos dados, são exibidos skeleton loaders para melhor UX.

**Componentes com Skeleton**:
- Cards de métricas (4 cards)
- Gráfico de vendas
- Tabela de vendas por filial

**Implementação**: 
- Arquivo: `src/app/(dashboard)/dashboard/page.tsx`
- Linhas: 195-217, 263-281, 299-309

---

### RN-EXB-005: Tooltip com Variação Anual
**Descrição**: Cards de métricas exibem tooltip ao passar o mouse, mostrando a variação anual (YoY).

**Conteúdo do Tooltip**:
```
[Variação YoY] vs. mesmo período do ano anterior
```

**Implementação**: 
- Componente: `CardMetric`
- Arquivo: `src/components/dashboard/card-metric.tsx`
- Linhas: 44-60

---

### RN-EXB-006: Linha de Totalização
**Descrição**: A tabela de vendas por filial exibe uma linha de totalização no final, agregando os valores de todas as filiais.

**Características**:
- Fundo diferenciado (`bg-muted/30`)
- Fonte em negrito
- Borda superior dupla (`border-t-2`)
- Ícone de somatório (=)

**Implementação**: 
- Arquivo: `src/app/(dashboard)/dashboard/page.tsx`
- Linhas: 437-577

---

## Regras de Auditoria

### RN-AUD-001: Log de Acesso ao Módulo
**Descrição**: Todo acesso ao dashboard é registrado na tabela de auditoria automaticamente.

**Dados Registrados**:
- Módulo: `'dashboard'`
- Tenant ID
- Nome do usuário
- Email do usuário
- Timestamp de acesso

**Implementação**: 
- Função: `logModuleAccess`
- Arquivo: `src/app/(dashboard)/dashboard/page.tsx`
- Linhas: 99-115

---

### RN-AUD-002: Log de Ações Críticas
**Descrição**: Ações críticas (mudança de filtros, exportações) devem ser registradas para auditoria.

**Observação**: Implementação futura planejada para filtros específicos.

---

## Casos Especiais

### CE-001: Sem Dados no Período
**Descrição**: Quando não há dados para o período selecionado, exibir mensagem apropriada.

**Mensagem**: "Nenhum dado de vendas disponível para o período selecionado."

**Implementação**: 
- Arquivo: `src/app/(dashboard)/dashboard/page.tsx`
- Linhas: 582-584

---

### CE-002: Tabela descontos_venda Opcional
**Descrição**: O sistema verifica se a tabela `descontos_venda` existe antes de tentar consultá-la.

**Lógica**:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'schema_name' AND table_name = 'descontos_venda'
)
```

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 220-224

---

### CE-003: Divisão por Zero
**Descrição**: Todos os cálculos de divisão verificam se o divisor é zero antes de executar.

**Exemplo**:
```sql
IF v_total_transacoes > 0 THEN
  v_ticket_medio := v_total_vendas / v_total_transacoes;
END IF;
```

---

## Validações

### VAL-001: Validação de Parâmetros da API
**Descrição**: Todos os parâmetros da API são validados usando Zod antes de processar a requisição.

**Schema de Validação**:
```typescript
const querySchema = z.object({
  schema: z.string().min(1),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filiais: z.string().optional(),
})
```

**Implementação**: 
- Arquivo: `src/app/api/dashboard/route.ts`
- Linhas: 12-17

---

### VAL-002: Validação de Autenticação
**Descrição**: Todas as rotas de API validam se o usuário está autenticado antes de processar.

**Resposta de Erro**: `{ error: 'Unauthorized' }` com status `401`

**Implementação**: 
- Arquivo: `src/app/api/dashboard/route.ts`
- Linhas: 54-59

---

**Versão**: 2.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-11-15  
**Total de Regras**: 34

---

## Mudanças v2.0 (2025-11-15)

### Novas Regras Adicionadas:
1. **RN-FILT-NEW-001 a RN-FILT-NEW-007**: Sistema completo de filtros avançados
2. **RN-CALC-NEW-001**: Subtração de descontos em Receita e Lucro Bruto

### Regras Atualizadas:
- **RN-CALC-001**: "Total de Vendas" → "Receita Bruta"
- **RN-CALC-002**: "Total de Lucro" → "Lucro Bruto"  
- **RN-CALC-004**: "Margem de Lucro" → "Margem Bruta"
- **RN-YTD-001**: Atualizado para incluir função dedicada
- **RN-YTD-002**: Nova regra para cálculo YTD de Lucro e Margem

### Nomenclatura Atualizada:
| v1.0 | v2.0 |
|------|------|
| Total de Vendas | Receita Bruta |
| Total de Lucro | Lucro Bruto |
| Margem de Lucro | Margem Bruta |
