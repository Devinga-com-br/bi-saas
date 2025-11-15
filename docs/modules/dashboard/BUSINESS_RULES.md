# Regras de Negócio - Dashboard Principal

**Versão**: 1.0.0  
**Última Atualização**: 2025-01-14  
**Módulo**: Dashboard Principal

---

## Índice

1. [Regras de Cálculo de Indicadores](#regras-de-cálculo-de-indicadores)
2. [Regras de Comparação Temporal](#regras-de-comparação-temporal)
3. [Regras de Filtros](#regras-de-filtros)
4. [Regras de Autorização](#regras-de-autorização)
5. [Regras de Exibição](#regras-de-exibição)
6. [Regras de Auditoria](#regras-de-auditoria)

---

## Regras de Cálculo de Indicadores

### RN-CALC-001: Cálculo de Total de Vendas
**Descrição**: O total de vendas é calculado somando `valor_total` da tabela `vendas_diarias_por_filial`, subtraindo descontos quando a tabela `descontos_venda` existir.

**Fórmula**:
```
Total Vendas = SUM(vendas_diarias_por_filial.valor_total) - SUM(descontos_venda.valor_desconto)
```

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 227-252

**Exemplo**:
```sql
-- Vendas: R$ 100.000,00
-- Descontos: R$ 5.000,00
-- Total Vendas = R$ 95.000,00
```

---

### RN-CALC-002: Cálculo de Total de Lucro
**Descrição**: O total de lucro é calculado somando `total_lucro` da tabela `vendas_diarias_por_filial`, subtraindo descontos quando existirem.

**Fórmula**:
```
Total Lucro = SUM(vendas_diarias_por_filial.total_lucro) - SUM(descontos_venda.valor_desconto)
```

**Observação**: Descontos são subtraídos tanto das vendas quanto do lucro.

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 227-252

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

### RN-CALC-004: Cálculo de Margem de Lucro
**Descrição**: A margem de lucro é calculada dividindo o total de lucro pelo total de vendas e multiplicando por 100.

**Fórmula**:
```
Margem de Lucro (%) = (Total Lucro / Total Vendas) × 100
```

**Condição**: Se `total_vendas = 0`, então `margem_lucro = 0`

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 259-261

**Exemplo**:
```
Lucro: R$ 30.000,00
Vendas: R$ 100.000,00
Margem = (30.000 / 100.000) × 100 = 30,00%
```

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

### RN-YTD-001: Cálculo de YTD (Year to Date)
**Descrição**: O YTD acumula valores desde o início do ano até a data final do período atual.

**Cálculo de Datas**:
```
data_inicio_ytd = primeiro dia do ano de data_inicio
data_fim_ytd = data_fim (período atual)
```

**Implementação**: 
- Arquivo: `supabase/migrations/dre_gerencial_rpc_functions.sql`
- Função: `get_dashboard_data`
- Linhas: 214-215

**Exemplo**:
```
Período Atual: 15/03/2025
YTD Atual: 01/01/2025 a 15/03/2025
YTD Ano Anterior: 01/01/2024 a 15/03/2024
```

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

**Versão**: 1.0.0  
**Data de Criação**: 2025-01-14  
**Última Atualização**: 2025-01-14  
**Total de Regras**: 27
