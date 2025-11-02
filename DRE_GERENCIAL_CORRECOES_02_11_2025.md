# DRE Gerencial - Correções Aplicadas
**Data:** 02/11/2025

## Resumo das Alterações

### 1. Módulo DRE Gerencial (`/dre-gerencial`)

#### Alterações nos Filtros
- ✅ **Removido**: Filtros de "Filtrar por", "Data Inicial" e "Data Final"
- ✅ **Adicionado**: Filtros de **Mês** (dropdown em português) e **Ano** (dropdown AAAA)
- ✅ **Padrão**: Mês atual é carregado automaticamente
- ✅ **Ordem dos Filtros**: Filial → Mês → Ano

#### Correção de Indicadores
- ✅ **Receita Bruta**: Agora busca dados do período completo do mês selecionado (01 a último dia)
- ✅ **PAM (Período Anterior Mesmo ano)**: Calcula corretamente o mês anterior (ex: Out/2025 → Set/2025)
- ✅ **PAA (Período Anterior Ano anterior)**: Calcula corretamente o mesmo mês do ano anterior (ex: Out/2025 → Out/2024)
- ✅ **CMV**: Calculado como Receita Bruta - Lucro Bruto
- ✅ **Total de Despesas**: Novo card adicionado entre Lucro Bruto e Lucro Líquido
  - Mostra valor total das despesas do período
  - Exibe comparação com PAM e PAA
  - Mostra percentual em relação à Receita Bruta
- ✅ **Lucro Líquido**: Calculado como Lucro Bruto - Total Despesas

#### Layout dos Cards
- ✅ **Desktop**: 5 cards em linha única (grid com 5 colunas no xl)
- ✅ **Responsivo**: Adapta para 3 colunas (lg), 2 colunas (md) e 1 coluna (mobile)
- ✅ **Fonte**: Ajustada para `text-lg lg:text-xl` (mais equilibrada visualmente)

#### Correção de Bugs
- ✅ **Erro de JSX**: Corrigido fechamento incorreto de tags
- ✅ **Erro 500**: Corrigido tratamento de datas e parâmetros na API
- ✅ **Duplicidade "Todas Filiais"**: Corrigido (agora usa apenas um filtro de filial)

### 2. Módulo de Despesas (`/despesas`)

#### Alterações nos Filtros
- ✅ **Removido**: Componente `PeriodFilter` e `MultiSelect` de filiais
- ✅ **Adicionado**: Filtros de **Filial**, **Mês** e **Ano** (mesmo padrão do DRE)
- ✅ **Padrão**: Mês atual é carregado automaticamente
- ✅ **Ordem dos Filtros**: Filial → Mês → Ano

#### Lógica de Busca
- ✅ Busca automática quando filtros mudam
- ✅ Calcula automaticamente o primeiro e último dia do mês selecionado
- ✅ Consolidação de dados de todas as filiais mantida

## Estrutura de Dados

### API `/api/dre-gerencial/indicadores`

**Parâmetros aceitos:**
- `schema`: Nome do schema do tenant
- `filiais`: ID das filiais ou 'all'
- `dataInicio`: Data inicial no formato YYYY-MM-DD
- `dataFim`: Data final no formato YYYY-MM-DD

**Resposta:**
```typescript
{
  current: {
    receita_bruta: number,
    lucro_bruto: number,
    cmv: number,
    margem_lucro: number
  },
  pam: {
    data: { receita_bruta, lucro_bruto, cmv, margem_lucro },
    ano: number
  },
  paa: {
    data: { receita_bruta, lucro_bruto, cmv, margem_lucro },
    ano: number
  }
}
```

### Frontend - Processamento

O frontend processa os dados da API e adiciona informações de despesas:

```typescript
{
  receitaBruta: number,
  lucroBruto: number,
  cmv: number,
  totalDespesas: number,      // Somado das despesas do período
  lucroLiquido: number,        // Lucro Bruto - Total Despesas
  margemLucroBruto: number,    // (Lucro Bruto / Receita) * 100
  margemLucroLiquido: number   // (Lucro Líquido / Receita) * 100
}
```

## Cálculos Implementados

### Período Atual
- **Data**: 01/MM/AAAA até último dia de MM/AAAA
- **Exemplo**: Outubro/2025 = 01/10/2025 a 31/10/2025

### PAM (Período Anterior Mesmo Ano)
- **Cálculo**: Mês anterior completo
- **Exemplo**: Se atual = Out/2025, PAM = Set/2025 (01/09/2025 a 30/09/2025)

### PAA (Período Anterior Ano Anterior)
- **Cálculo**: Mesmo mês do ano anterior
- **Exemplo**: Se atual = Out/2025, PAA = Out/2024 (01/10/2024 a 31/10/2024)

### Comparações Percentuais

#### Receita Bruta
- **PAM**: `((Atual - PAM) / PAM) * 100`
- **PAA**: `((Atual - PAA) / PAA) * 100`
- **Cor**: Verde se aumentou, Vermelho se diminuiu

#### CMV
- **PAM**: `|((Atual - PAM) / PAM) * 100|`
- **PAA**: `|((Atual - PAA) / PAA) * 100|`
- **Cor**: Verde se diminuiu (melhor), Vermelho se aumentou

#### Lucro Bruto
- **PAM**: `((Atual - PAM) / PAM) * 100`
- **PAA**: `((Atual - PAA) / PAA) * 100`
- **Cor**: Verde se aumentou, Vermelho se diminuiu

#### Total de Despesas
- **PAM**: `((Atual - PAM) / PAM) * 100`
- **PAA**: `((Atual - PAA) / PAA) * 100`
- **Cor**: Verde se diminuiu (melhor), Vermelho se aumentou

## Fluxo de Execução

### 1. Carregamento Inicial
```
Usuario acessa /dre-gerencial
  ↓
Sistema define: mes = mês atual, ano = ano atual
  ↓
Busca despesas dos 3 períodos (Atual, PAM, PAA)
  ↓
Busca indicadores via API
  ↓
Frontend processa e calcula lucro líquido
  ↓
Exibe cards com todos os indicadores
```

### 2. Mudança de Filtro
```
Usuario altera Mês ou Ano
  ↓
useEffect detecta mudança
  ↓
Recalcula dataInicio e dataFim
  ↓
Busca despesas dos 3 períodos
  ↓
Busca indicadores via API
  ↓
Atualiza tela
```

## Arquivos Modificados

1. `/src/app/(dashboard)/dre-gerencial/page.tsx`
   - Alterado sistema de filtros
   - Corrigido cálculo de períodos
   - Ajustado layout dos cards
   - Adicionado card de Total de Despesas
   - Ajustado tamanho de fontes

2. `/src/app/(dashboard)/despesas/page.tsx`
   - Alterado sistema de filtros para mês/ano
   - Removido PeriodFilter e MultiSelect
   - Padronizado com DRE Gerencial

3. `/src/app/api/dre-gerencial/indicadores/route.ts`
   - Já estava correto, usa a mesma função `get_dashboard_data` do Dashboard
   - Validações de datas mantidas

## Testes Recomendados

- [ ] Selecionar diferentes meses e anos
- [ ] Verificar se valores batem com Dashboard para o mesmo período
- [ ] Testar com ano anterior (ex: 2024)
- [ ] Verificar comparações PAM e PAA
- [ ] Testar em diferentes filiais
- [ ] Testar responsividade dos cards (mobile/tablet/desktop)
- [ ] Verificar se despesas são consolidadas corretamente

## Notas Importantes

1. **Sincronização com Dashboard**: Os valores de Receita Bruta e Lucro Bruto agora devem bater exatamente com o Dashboard quando filtrado pelo mesmo período.

2. **Performance**: Como busca 3 períodos diferentes (Atual, PAM, PAA), pode haver uma pequena demora no carregamento inicial.

3. **Despesas**: O total de despesas é consolidado de todas as filiais disponíveis para o usuário, independente do filtro de filial selecionado.

4. **Validações**: A API valida se as datas são válidas e se dataInicio <= dataFim antes de processar.
