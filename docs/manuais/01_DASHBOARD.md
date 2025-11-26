# Manual Detalhado - Módulo Dashboard

**Versão:** 1.0.0
**Última Atualização:** Novembro 2024
**Módulo:** Dashboard Principal

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Acessando o Dashboard](#2-acessando-o-dashboard)
3. [Interface e Componentes](#3-interface-e-componentes)
4. [Indicadores Principais](#4-indicadores-principais)
5. [Filtros e Personalização](#5-filtros-e-personalização)
6. [Gráficos e Visualizações](#6-gráficos-e-visualizações)
7. [Comparativos e Análises](#7-comparativos-e-análises)
8. [Casos de Uso Práticos](#8-casos-de-uso-práticos)
9. [Dicas e Boas Práticas](#9-dicas-e-boas-práticas)
10. [Solução de Problemas](#10-solução-de-problemas)

---

## 1. Visão Geral

### 1.1 O que é o Dashboard?

O Dashboard é o **centro de comando** do BI SaaS, oferecendo uma visão consolidada e em tempo real dos principais indicadores de desempenho (KPIs) da sua empresa.

**Objetivo:** Permitir que gestores tomem decisões rápidas baseadas em dados atualizados.

### 1.2 Quem Pode Acessar?

✅ **Todos os usuários** têm acesso ao Dashboard:
- Super Administrador
- Administrador
- Gestor
- Visualizador

**Diferenças de acesso:**
- Usuários com restrição de filial verão apenas dados das filiais autorizadas
- Dados financeiros são visíveis para todos, mas edição é restrita

### 1.3 Quando Usar o Dashboard?

- **Diariamente:** Para acompanhar vendas do dia
- **Semanalmente:** Para verificar tendências e metas
- **Mensalmente:** Para análise de resultados e planejamento
- **Reuniões:** Para apresentar dados consolidados

---

## 2. Acessando o Dashboard

### 2.1 Formas de Acesso

**Método 1: Menu Lateral**
```
1. Faça login no sistema
2. Clique em "Dashboard" no menu lateral
3. O Dashboard é carregado automaticamente
```

**Método 2: Acesso Direto**
- O Dashboard é a **página inicial** após o login
- Você será direcionado automaticamente ao fazer login

**Método 3: Breadcrumb**
```
De qualquer página → Clique em "Dashboard" no breadcrumb
```

### 2.2 Tempo de Carregamento

**Normal:** 2-5 segundos
**Com muitos dados:** 5-10 segundos

Se demorar mais de 15 segundos:
1. Verifique sua conexão de internet
2. Recarregue a página (F5)
3. Limpe o cache do navegador

---

## 3. Interface e Componentes

### 3.1 Estrutura da Página

O Dashboard é dividido em 4 áreas principais:

```
┌─────────────────────────────────────────────────┐
│  CABEÇALHO                                      │
│  [Logo]  Dashboard   [Empresa]   [Usuário]     │
├─────────────────────────────────────────────────┤
│  BREADCRUMB                                     │
│  Dashboard                                      │
├─────────────────────────────────────────────────┤
│  FILTROS                                        │
│  [Período] [Filial] [Aplicar]                  │
├─────────────────────────────────────────────────┤
│  INDICADORES (Cards)                            │
│  [Vendas] [Lucro] [Margem] [Meta]              │
├─────────────────────────────────────────────────┤
│  GRÁFICOS                                       │
│  [Vendas por Filial] [Evolução Temporal]       │
├─────────────────────────────────────────────────┤
│  TABELAS                                        │
│  [Top Produtos] [Ranking Filiais]              │
└─────────────────────────────────────────────────┘
```

### 3.2 Cards de Indicadores

**Layout dos Cards:**

Cada card de indicador contém:
- 📊 **Ícone visual** (identifica o tipo de métrica)
- 📈 **Título** (nome do indicador)
- 💰 **Valor principal** (métrica atual em destaque)
- 📉 **Comparativo** (variação vs período anterior)
- 🎯 **Indicador de tendência** (↑ crescimento, ↓ queda)

**Exemplo de Card:**
```
┌─────────────────────────┐
│ 💰 TOTAL DE VENDAS      │
│                         │
│    R$ 1.245.678,90      │ ← Valor principal
│                         │
│ ↑ +12,5% vs mês anterior│ ← Comparativo
└─────────────────────────┘
```

### 3.3 Cores e Significados

**Verde:** Crescimento positivo ou meta atingida
**Vermelho:** Queda ou meta não atingida
**Azul:** Informação neutra
**Amarelo:** Alerta ou atenção necessária
**Cinza:** Sem comparativo ou dado indisponível

---

## 4. Indicadores Principais

### 4.1 Total de Vendas

**O que mostra:** Receita bruta total no período selecionado

**Como é calculado:**
```
Total de Vendas = Σ (valor_total de todas as vendas)
```

**Informações exibidas:**
- **Valor atual:** Vendas do período selecionado
- **Comparativo:** Variação percentual vs período anterior
- **Meta:** Se houver meta definida, mostra % atingido

**Exemplo de Interpretação:**
```
Total de Vendas: R$ 500.000,00
↑ +15,3% vs mês anterior

Significa:
- Vendeu R$ 500 mil no período atual
- Cresceu 15,3% em relação ao período anterior
- Se o anterior foi R$ 433.620, houve crescimento
```

**Aplicação de Descontos:**
⚠️ **Importante:** O valor exibido é a **receita líquida**, já descontados os valores de `valor_desconto` da tabela `descontos_venda`.

```
Receita Líquida = Receita Bruta - valor_desconto
```

### 4.2 Total de Lucro

**O que mostra:** Lucro bruto total no período

**Como é calculado:**
```
Lucro Bruto = Receita Líquida - CMV
Onde:
  Receita Líquida = Vendas - valor_desconto
  CMV = Custo - desconto_custo
```

**Informações exibidas:**
- **Valor atual:** Lucro do período
- **Comparativo:** Variação vs período anterior
- **Meta:** % de meta de lucro atingida

**Exemplo:**
```
Total de Lucro: R$ 125.000,00
↑ +8,2% vs mês anterior

Interpretação:
- Lucro bruto de R$ 125 mil
- Cresceu 8,2% vs período anterior
- Indica melhoria na rentabilidade
```

**Fatores que afetam o lucro:**
1. Volume de vendas
2. Mix de produtos (margem de cada produto)
3. Descontos comerciais (valor_desconto)
4. Negociações com fornecedores (desconto_custo)
5. Perdas e rupturas

### 4.3 Margem de Lucro

**O que mostra:** Percentual de lucro sobre as vendas

**Como é calculado:**
```
Margem de Lucro (%) = (Lucro Bruto / Receita Líquida) × 100
```

**Informações exibidas:**
- **Percentual atual:** Margem no período
- **Comparativo:** Variação em pontos percentuais vs anterior
- **Meta:** Margem esperada vs realizada

**Exemplo:**
```
Margem de Lucro: 25,8%
↑ +2,3 p.p. vs mês anterior

Interpretação:
- De cada R$ 100 vendidos, R$ 25,80 é lucro
- Margem aumentou 2,3 pontos percentuais
- Mês anterior era ~23,5%
```

**Análise de Margem:**

| Margem | Classificação | Ação |
|--------|---------------|------|
| < 15% | Baixa | ⚠️ Revisar precificação e custos |
| 15-25% | Média | ✅ Monitorar e manter |
| 25-35% | Boa | 🎯 Replicar estratégias |
| > 35% | Excelente | 🚀 Benchmark para outros |

### 4.4 Atingimento de Meta

**O que mostra:** Percentual da meta alcançada no período

**Como é calculado:**
```
Atingimento (%) = (Valor Realizado / Meta Definida) × 100
```

**Informações exibidas:**
- **Percentual atingido:** % da meta alcançada
- **Valor realizado:** Quanto foi feito
- **Meta definida:** Objetivo estabelecido
- **Falta/Sobra:** Quanto falta ou excedeu

**Exemplo:**
```
Atingimento de Meta: 87,5%
Realizado: R$ 437.500 / Meta: R$ 500.000
Falta: R$ 62.500

Interpretação:
- Atingiu 87,5% da meta
- Faltam R$ 62.500 para completar
- Com X dias restantes no mês, precisa vender Y por dia
```

**Cálculo de Projeção:**
```
Se estamos no dia 20 de um mês de 30 dias:
- Realizado: R$ 437.500 em 20 dias
- Média diária: R$ 21.875/dia
- Projeção para 30 dias: R$ 656.250
- Atingimento projetado: 131,3% 🎯
```

**Status Visual:**
- 🟢 **Verde (≥100%):** Meta atingida ou superada
- 🟡 **Amarelo (80-99%):** Próximo da meta
- 🔴 **Vermelho (<80%):** Abaixo da meta

---

## 5. Filtros e Personalização

### 5.1 Filtro de Período

O filtro de período permite selecionar o intervalo de análise.

**Opções Disponíveis:**

#### MTD (Month to Date)
- **Período:** Do dia 1 do mês atual até hoje
- **Uso:** Acompanhar desempenho do mês corrente
- **Exemplo:** Hoje é 15/11/2024 → MTD = 01/11 a 15/11

```
Quando usar MTD:
✅ Análise diária do mês atual
✅ Acompanhamento de metas mensais
✅ Projeção de fechamento do mês
```

#### YTD (Year to Date)
- **Período:** Do dia 1 de janeiro até hoje
- **Uso:** Visão acumulada do ano
- **Exemplo:** Hoje é 15/11/2024 → YTD = 01/01 a 15/11

```
Quando usar YTD:
✅ Análise anual consolidada
✅ Comparação com meta anual
✅ Planejamento estratégico
```

#### Período Personalizado
- **Período:** Você define data início e fim
- **Uso:** Análises específicas
- **Exemplo:** Black Friday, Natal, trimestre, etc.

```
Quando usar Personalizado:
✅ Eventos sazonais
✅ Campanhas específicas
✅ Análises trimestrais/semestrais
✅ Comparações customizadas
```

**Como Aplicar Filtro de Período:**

**Passo a passo:**
1. Localize a seção "Filtros" no topo do Dashboard
2. Clique no campo "Período"
3. Selecione a opção desejada:
   - MTD
   - YTD
   - Personalizado
4. Se escolheu "Personalizado":
   - Selecione **Data Início**
   - Selecione **Data Fim**
5. Clique em **"Aplicar Filtros"**
6. Dashboard atualiza automaticamente

**Exemplo Prático:**

```
Cenário: Analisar vendas da Black Friday 2024

1. Período: Personalizado
2. Data Início: 25/11/2024
3. Data Fim: 01/12/2024
4. Aplicar

Resultado:
- Total de Vendas no período
- Comparativo com Black Friday 2023
- Produtos mais vendidos no evento
```

### 5.2 Filtro de Filial

**Opções:**

#### Todas as Filiais
- **Exibição:** Dados consolidados de todas
- **Uso:** Visão corporativa
- **Cálculo:** Soma de todas as filiais

```
Total Vendas (Todas) = Σ Vendas de cada filial
```

#### Filial Específica
- **Exibição:** Dados de uma filial única
- **Uso:** Análise individual
- **Cálculo:** Apenas dados da filial selecionada

**Como Aplicar:**

1. Clique no campo "Filial"
2. Selecione:
   - "Todas as Filiais" (consolidado)
   - Nome de uma filial específica
3. Clique em "Aplicar Filtros"

**Comparação Multi-Filial:**

Para comparar filiais:
1. Primeiro, visualize "Todas as Filiais" (consolidado)
2. Depois, selecione cada filial individualmente
3. Anote os indicadores
4. Compare performance

**Exemplo:**
```
Filial Centro:
- Vendas: R$ 200.000
- Margem: 28%
- Meta: 95% atingido

Filial Norte:
- Vendas: R$ 180.000
- Margem: 32%
- Meta: 110% atingido ← Melhor performance!

Análise:
- Norte vende menos, mas com margem maior
- Norte superou meta, Centro não
- Investigar: Por que Norte tem margem melhor?
```

### 5.3 Restrições de Acesso

**Usuários com Filiais Autorizadas:**

Se você tem restrição de filial:
- Verá apenas filiais autorizadas no seletor
- Não consegue ver dados de outras filiais
- Filtro "Todas as Filiais" consolida apenas suas autorizadas

**Exemplo:**
```
Usuário: João (Gestor)
Filiais Autorizadas: Centro, Sul

Filtro mostra:
☑️ Todas as Filiais (Centro + Sul apenas)
☑️ Centro
☑️ Sul
☐ Norte (não aparece)
☐ Leste (não aparece)
```

### 5.4 Combinando Filtros

**Melhores combinações:**

**Análise Mensal por Filial:**
```
Período: MTD
Filial: Filial específica
Uso: Acompanhar meta mensal da filial
```

**Análise Anual Consolidada:**
```
Período: YTD
Filial: Todas as Filiais
Uso: Performance geral da empresa
```

**Análise de Campanha:**
```
Período: Personalizado (período da campanha)
Filial: Todas ou específica
Uso: Avaliar resultado da campanha
```

**Comparativo Ano a Ano:**
```
1ª consulta:
  Período: 01/11/2024 a 30/11/2024
  Filial: Todas

2ª consulta:
  Período: 01/11/2023 a 30/11/2023
  Filial: Todas

Compare os resultados manualmente
```

---

## 6. Gráficos e Visualizações

### 6.1 Gráfico: Vendas por Filial

**Tipo:** Gráfico de Barras Verticais

**O que mostra:**
- Comparação de vendas entre filiais
- Identificação de filiais com melhor/pior desempenho
- Distribuição de receita

**Layout:**
```
Vendas por Filial
┌─────────────────────────────────┐
│    R$                           │
│ 300k│                           │
│     │                           │
│ 200k│   ██                      │
│     │   ██    ██                │
│ 100k│   ██    ██    ██    ██    │
│     │   ██    ██    ██    ██    │
│   0k└───────────────────────────│
│      Centro Norte  Sul   Leste  │
└─────────────────────────────────┘
```

**Como Interpretar:**

**Altura da barra:** Proporção de vendas
- Barra mais alta = Filial que mais vendeu
- Barra mais baixa = Filial que menos vendeu

**Cores das barras:**
- 🟦 **Azul:** Padrão
- 🟩 **Verde:** Filial que atingiu meta
- 🟥 **Vermelho:** Filial abaixo da meta

**Interatividade:**

Ao passar o mouse sobre uma barra, vê:
```
Filial: Centro
Vendas: R$ 250.320,45
Margem: 28,5%
Meta: 95% atingido
```

**Análises Possíveis:**

1. **Ranking de Filiais:**
   ```
   1º Norte:  R$ 300.000 (33%)
   2º Centro: R$ 250.000 (28%)
   3º Sul:    R$ 200.000 (22%)
   4º Leste:  R$ 150.000 (17%)
   ```

2. **Concentração de Vendas:**
   ```
   Top 2 filiais = 61% das vendas totais
   → Risco de concentração
   ```

3. **Disparidades:**
   ```
   Norte vende 2× mais que Leste
   → Investigar: por quê? Potencial inexplorado?
   ```

### 6.2 Gráfico: Evolução Temporal

**Tipo:** Gráfico de Linha

**O que mostra:**
- Tendência de vendas e lucro ao longo do tempo
- Sazonalidade
- Padrões de crescimento/queda

**Layout:**
```
Evolução de Vendas e Lucro
┌─────────────────────────────────┐
│ R$                              │
│ 400k│         ╱─────╲           │
│     │        ╱       ╲          │ ← Vendas
│ 300k│    ───╱         ╲────     │
│     │   ╱               ╲       │
│ 200k│  ╱                 ╲      │
│     │ ╱                   ─     │ ← Lucro
│ 100k│╱                          │
│     └────────────────────────── │
│      Jan Fev Mar Abr Mai Jun    │
└─────────────────────────────────┘
```

**Linhas:**
- 🔵 **Azul:** Vendas
- 🟢 **Verde:** Lucro
- 🟡 **Amarelo:** Meta (se configurada)

**Como Interpretar:**

**Tendência Crescente (╱):**
```
Jan: R$ 100k
Fev: R$ 120k (+20%)
Mar: R$ 150k (+25%)
→ Crescimento sustentado 📈
```

**Tendência Decrescente (╲):**
```
Abr: R$ 180k
Mai: R$ 160k (-11%)
Jun: R$ 140k (-12,5%)
→ Queda preocupante ⚠️
```

**Sazonalidade:**
```
Padrão identificado:
- Pico em Dezembro (Natal)
- Queda em Janeiro (pós-festas)
- Recuperação em Fevereiro
→ Normal para o varejo
```

**Análises Possíveis:**

1. **Taxa de Crescimento Mensal:**
   ```
   Média últimos 6 meses: +8,5%
   Projeção próximo mês: R$ 324.000
   ```

2. **Comparação Ano a Ano:**
   ```
   Novembro 2024: R$ 300.000
   Novembro 2023: R$ 250.000
   Variação: +20% 🎯
   ```

3. **Identificação de Anomalias:**
   ```
   Maio teve queda abrupta de 30%
   Investigar: Greve? Feriado? Estoque?
   ```

### 6.3 Tabela: Top 10 Produtos

**O que mostra:**
- Produtos mais vendidos do período
- Curva ABC de produtos
- Concentração de vendas

**Layout:**
```
┌─────┬──────────┬─────────────────────┬──────────┬──────────────┬───────┐
│ Pos │ Código   │ Descrição           │ Qtde     │ Vendas       │ Curva │
├─────┼──────────┼─────────────────────┼──────────┼──────────────┼───────┤
│  1  │ 1001     │ ARROZ BRANCO 5KG    │ 15.234   │ R$ 152.340   │   A   │
│  2  │ 2050     │ FEIJAO PRETO 1KG    │ 12.580   │ R$ 100.640   │   A   │
│  3  │ 3025     │ ACUCAR CRISTAL 1KG  │ 10.450   │ R$  83.600   │   A   │
│  4  │ 1520     │ CAFE TORRADO 500G   │  8.920   │ R$  71.360   │   B   │
│  5  │ 4080     │ OLEO DE SOJA 900ML  │  7.650   │ R$  61.200   │   B   │
│ ... │   ...    │         ...         │   ...    │     ...      │  ...  │
└─────┴──────────┴─────────────────────┴──────────┴──────────────┴───────┘
```

**Colunas:**
- **Pos:** Ranking (1 a 10)
- **Código:** Código do produto
- **Descrição:** Nome do produto
- **Qtde:** Quantidade vendida
- **Vendas:** Valor total de vendas
- **Curva:** Classificação ABC

**Curva ABC:**
- **A (Verde):** 20% dos produtos que representam 80% das vendas
- **B (Azul):** 30% dos produtos que representam 15% das vendas
- **C (Amarelo):** 50% dos produtos que representam 5% das vendas

**Como Usar:**

**Identificar Best Sellers:**
```
Top 3 produtos = 40% das vendas totais
→ Garantir estoque sempre disponível
→ Negociar melhores condições com fornecedor
```

**Oportunidades de Cross-Sell:**
```
Arroz é #1
Feijão é #2
→ Criar combo Arroz + Feijão
→ Promoção casada
```

**Gestão de Estoque:**
```
Produtos Curva A:
→ Estoque mínimo alto
→ Reposição prioritária
→ Ruptura = grande perda

Produtos Curva C:
→ Estoque reduzido
→ Avaliar descontinuação
```

### 6.4 Tabela: Vendas por Filial

**O que mostra:**
- Performance detalhada de cada filial
- Comparativos individuais
- Ranking de filiais

**Layout:**
```
┌──────────┬──────────────┬──────────────┬────────┬──────────────┬────────┐
│ Filial   │ Vendas       │ Lucro        │ Margem │ Meta         │ Ating. │
├──────────┼──────────────┼──────────────┼────────┼──────────────┼────────┤
│ Norte    │ R$ 300.000   │ R$ 90.000    │ 30,0%  │ R$ 280.000   │ 107%🟢 │
│ Centro   │ R$ 250.000   │ R$ 70.000    │ 28,0%  │ R$ 260.000   │  96%🟡 │
│ Sul      │ R$ 200.000   │ R$ 50.000    │ 25,0%  │ R$ 220.000   │  91%🟡 │
│ Leste    │ R$ 150.000   │ R$ 33.000    │ 22,0%  │ R$ 200.000   │  75%🔴 │
├──────────┼──────────────┼──────────────┼────────┼──────────────┼────────┤
│ TOTAL    │ R$ 900.000   │ R$ 243.000   │ 27,0%  │ R$ 960.000   │  94%   │
└──────────┴──────────────┴──────────────┴────────┴──────────────┴────────┘
```

**Análises Possíveis:**

**Melhor Performance Geral:**
```
Norte:
- Maior vendas: R$ 300k
- Melhor margem: 30%
- Única que superou meta
→ Benchmark para outras filiais
```

**Filial com Problema:**
```
Leste:
- Menor vendas: R$ 150k
- Pior margem: 22%
- Apenas 75% da meta
→ Necessita plano de ação urgente
```

**Oportunidades:**
```
Sul:
- Vendas medianas
- Margem ok (25%)
- Quase atingiu meta (91%)
→ Pequeno esforço para bater meta
→ Foco em conversão
```

---

## 7. Comparativos e Análises

### 7.1 Comparação Período Atual vs Anterior

**Como Funciona:**

O sistema automaticamente compara o período selecionado com o período imediatamente anterior de mesma duração.

**Exemplos:**

**MTD (Month to Date):**
```
Período Atual: 01/11/2024 a 15/11/2024 (15 dias)
Período Anterior: 01/10/2024 a 15/10/2024 (15 dias)
```

**Mês Completo:**
```
Período Atual: 01/11/2024 a 30/11/2024
Período Anterior: 01/10/2024 a 31/10/2024
```

**YTD (Year to Date):**
```
Período Atual: 01/01/2024 a 15/11/2024
Período Anterior: 01/01/2023 a 15/11/2023
```

### 7.2 Interpretando Variações

**Variação Positiva (+):**

```
Vendas: R$ 500.000
↑ +15,3% vs período anterior

Cálculo:
Período Atual: R$ 500.000
Período Anterior: R$ 433.620
Variação: (500.000 - 433.620) / 433.620 = 0,153 = 15,3%

Significa: Crescimento de 15,3%
```

**Variação Negativa (-):**

```
Vendas: R$ 450.000
↓ -10,2% vs período anterior

Cálculo:
Período Atual: R$ 450.000
Período Anterior: R$ 501.002
Variação: (450.000 - 501.002) / 501.002 = -0,102 = -10,2%

Significa: Queda de 10,2%
```

**Variação Neutra (0%):**

```
Vendas: R$ 500.000
→ 0,0% vs período anterior

Significa: Manteve mesmo nível
```

### 7.3 Benchmarks de Variação

**Vendas:**
- Excelente: > +15%
- Bom: +5% a +15%
- Normal: -5% a +5%
- Preocupante: -5% a -15%
- Crítico: < -15%

**Margem de Lucro (em p.p.):**
- Excelente: > +3 p.p.
- Bom: +1 a +3 p.p.
- Normal: -1 a +1 p.p.
- Preocupante: -1 a -3 p.p.
- Crítico: < -3 p.p.

### 7.4 Análise de Tendências

**Identificando Tendências:**

**Crescimento Consistente:**
```
Jan: R$ 100k
Fev: R$ 110k (+10%)
Mar: R$ 121k (+10%)
Abr: R$ 133k (+10%)

Tendência: Crescimento de 10% ao mês
Projeção Mai: R$ 146k
Ação: Preparar estoque para demanda crescente
```

**Queda Gradual:**
```
Mai: R$ 200k
Jun: R$ 190k (-5%)
Jul: R$ 180k (-5%)
Ago: R$ 170k (-5,5%)

Tendência: Queda gradual
Projeção Set: R$ 160k
Ação: Investigar causas e reverter
```

**Sazonalidade:**
```
Padrão anual identificado:
- Dez: +40% (Natal)
- Jan: -30% (pós-festas)
- Mar: +20% (Páscoa)
- Jun: -10% (frio)
- Set: +15% (Primavera)

Ação: Planejar estoque conforme sazonalidade
```

---

## 8. Casos de Uso Práticos

### 8.1 Caso 1: Acompanhamento Diário de Vendas

**Objetivo:** Verificar se as vendas do dia estão no ritmo para atingir a meta mensal

**Passo a passo:**

1. Acesse o Dashboard
2. Selecione filtros:
   - Período: **MTD**
   - Filial: **Todas** ou específica
3. Clique em "Aplicar"

4. Analise:
   - **Total de Vendas MTD:** Quanto vendeu no mês até agora
   - **Meta Mensal:** Quanto precisa vender no mês todo
   - **Dias úteis decorridos:** Quantos dias já se passaram
   - **Dias úteis restantes:** Quantos dias faltam

5. Calcule:
   ```
   Exemplo:
   - Meta Mensal: R$ 600.000
   - Vendas MTD (dia 15): R$ 250.000
   - Dias úteis no mês: 22
   - Dias decorridos: 10
   - Dias restantes: 12

   Análise:
   - % atingido: 250.000 / 600.000 = 41,7%
   - % tempo decorrido: 10 / 22 = 45,5%
   - Status: Levemente abaixo do ritmo

   Projeção:
   - Média diária atual: 250.000 / 10 = R$ 25.000/dia
   - Projeção final: 25.000 × 22 = R$ 550.000
   - Atingimento projetado: 91,7%
   - Falta: R$ 50.000

   Ação necessária:
   - Necessário vender R$ 50.000 a mais nos 12 dias restantes
   - Nova meta diária: (350.000 / 12) = R$ 29.167/dia
   - Aumento necessário: +16,7% na média diária
   ```

### 8.2 Caso 2: Análise Mensal para Reunião Gerencial

**Objetivo:** Preparar apresentação de resultados mensais

**Passo a passo:**

1. Acesse o Dashboard
2. Configure:
   - Período: **Mês completo anterior** (ex: 01/10 a 31/10)
   - Filial: **Todas as Filiais**
3. Anote os indicadores:

```
RESULTADOS DE OUTUBRO/2024
============================

INDICADORES GLOBAIS:
- Total Vendas: R$ 900.000 (↑ +12% vs Set)
- Total Lucro: R$ 243.000 (↑ +15% vs Set)
- Margem: 27,0% (↑ +0,7 p.p. vs Set)
- Meta: 94% atingido

DESTAQUES POSITIVOS:
✅ Crescimento de 12% em vendas
✅ Margem melhorou 0,7 pontos
✅ Lucro cresceu mais que vendas (+15% vs +12%)

PONTOS DE ATENÇÃO:
⚠️ Meta não foi atingida (faltaram 6%)
⚠️ Filial Leste com apenas 75% da meta
⚠️ Margem ainda abaixo do ideal (meta: 30%)

TOP 3 FILIAIS:
1. Norte: R$ 300k (107% meta) 🏆
2. Centro: R$ 250k (96% meta)
3. Sul: R$ 200k (91% meta)

AÇÕES PARA NOVEMBRO:
1. Campanha promocional na Filial Leste
2. Replicar estratégias da Filial Norte
3. Focar em produtos de margem alta
4. Meta ajustada: R$ 960.000
```

### 8.3 Caso 3: Comparação de Performance entre Filiais

**Objetivo:** Identificar filial com melhor desempenho e replicar boas práticas

**Passo a passo:**

1. Primeiro, visualize consolidado:
   - Período: Último mês completo
   - Filial: **Todas**
   - Anote totais

2. Depois, analise cada filial:
   - Repita para cada filial individualmente
   - Anote métricas de cada uma

3. Compile os dados:

```
COMPARATIVO DE FILIAIS - OUTUBRO/2024
======================================

┌──────────┬─────────┬─────────┬────────┬─────────┬─────────┐
│ Filial   │ Vendas  │ Var%    │ Margem │ Var p.p.│ Ating.  │
├──────────┼─────────┼─────────┼────────┼─────────┼─────────┤
│ Norte    │ 300k    │ +18%    │ 30,0%  │ +1,5    │ 107% 🥇 │
│ Centro   │ 250k    │ +10%    │ 28,0%  │ +0,8    │  96% 🥈 │
│ Sul      │ 200k    │ +8%     │ 25,0%  │ +0,3    │  91% 🥉 │
│ Leste    │ 150k    │ +5%     │ 22,0%  │ -0,2    │  75%    │
└──────────┴─────────┴─────────┴────────┴─────────┴─────────┘

ANÁLISE:

Filial Norte (BENCHMARK):
✅ Melhor crescimento (+18%)
✅ Melhor margem (30%)
✅ Única que superou meta
🔍 Investigar: O que fazem de diferente?

Filial Leste (ATENÇÃO):
⚠️ Menor crescimento (+5%)
⚠️ Pior margem (22%, em queda)
⚠️ Muito abaixo da meta (75%)
🚨 Ação urgente necessária

BOAS PRÁTICAS A REPLICAR:
1. Reunir com gerente da Norte
2. Documentar processos e estratégias
3. Treinar outras filiais
4. Implementar melhores práticas
```

### 8.4 Caso 4: Análise de Campanha Promocional

**Objetivo:** Avaliar resultado de campanha (ex: Black Friday)

**Passo a passo:**

1. **ANTES da campanha:**
   ```
   Período: Semana antes (18/11 a 24/11)
   Filial: Todas

   Resultados:
   - Vendas Semana: R$ 180.000
   - Média Diária: R$ 25.714
   ```

2. **DURANTE a campanha:**
   ```
   Período: Semana da campanha (25/11 a 01/12)
   Filial: Todas

   Resultados:
   - Vendas Semana: R$ 420.000
   - Média Diária: R$ 60.000
   ```

3. **Análise:**
   ```
   RESULTADO BLACK FRIDAY 2024
   ===========================

   PERFORMANCE:
   - Vendas BF: R$ 420.000
   - Vendas semana normal: R$ 180.000
   - Incremento: +233% 🚀
   - Média diária: 2,3× maior

   COMPARAÇÃO ANO ANTERIOR:
   - Black Friday 2023: R$ 350.000
   - Black Friday 2024: R$ 420.000
   - Crescimento: +20% vs 2023

   MARGEM:
   - Margem normal: 27%
   - Margem BF: 18% (esperado por descontos)
   - Redução: -9 p.p.

   LUCRO:
   - Lucro BF: R$ 75.600 (18% de 420k)
   - Lucro semana normal: R$ 48.600 (27% de 180k)
   - Incremento lucro: +55%

   ANÁLISE CUSTO-BENEFÍCIO:
   ✅ Vendas cresceram 233%
   ✅ Lucro cresceu 55% (apesar de margem menor)
   ✅ Resultado melhor que 2023
   ⚠️ Margem caiu significativamente

   CONCLUSÃO:
   Campanha foi SUCESSO. Apesar da margem menor,
   o volume compensou e lucro absoluto aumentou.
   ```

### 8.5 Caso 5: Identificação de Oportunidades

**Objetivo:** Encontrar produtos ou filiais com potencial inexplorado

**Análise de Produtos:**

1. Visualize "Top 10 Produtos"
2. Identifique produtos Curva A com ruptura
3. Calcule potencial de venda perdida

```
Exemplo:

Produto: ARROZ BRANCO 5KG (#1 em vendas)
- Vendas mês: R$ 152.340
- Dias em ruptura: 3 dias
- Média diária: R$ 5.078
- Venda perdida: 3 × 5.078 = R$ 15.234

Ação:
→ Melhorar gestão de estoque
→ Potencial de +10% em vendas do produto
```

**Análise de Filiais:**

1. Compare vendas por m² de loja:
```
┌──────────┬─────────┬────────┬───────────┐
│ Filial   │ Vendas  │ Área   │ Venda/m²  │
├──────────┼─────────┼────────┼───────────┤
│ Norte    │ 300k    │ 500m²  │ R$ 600/m² │
│ Centro   │ 250k    │ 600m²  │ R$ 417/m² │← Baixo!
│ Sul      │ 200k    │ 350m²  │ R$ 571/m² │
│ Leste    │ 150k    │ 400m²  │ R$ 375/m² │← Muito baixo!
└──────────┴─────────┴────────┴───────────┘

Oportunidade:
- Centro tem área maior mas vende/m² menor
- Se atingir produtividade da Norte (R$ 600/m²):
  Potencial: 600m² × R$ 600 = R$ 360.000
  Vs Atual: R$ 250.000
  Ganho: +R$ 110.000/mês (+44%)

Ação:
→ Melhorar layout da loja Centro
→ Otimizar mix de produtos
→ Treinar equipe de vendas
```

---

## 9. Dicas e Boas Práticas

### 9.1 Frequência de Acompanhamento

**Diariamente:**
- ✅ Verificar vendas MTD
- ✅ Acompanhar ritmo vs meta
- ✅ Identificar problemas urgentes

**Semanalmente:**
- ✅ Analisar tendências
- ✅ Comparar semanas
- ✅ Ajustar estratégias de curto prazo

**Mensalmente:**
- ✅ Análise completa de resultados
- ✅ Reunião gerencial
- ✅ Definir metas do próximo mês
- ✅ Planejar ações corretivas

**Trimestralmente:**
- ✅ Revisão estratégica
- ✅ Análise de sazonalidade
- ✅ Ajuste de metas anuais

### 9.2 Horários Recomendados

**Primeira coisa pela manhã (8h-9h):**
- Ver resultado do dia anterior
- Planejar ações do dia

**Meio do dia (12h-13h):**
- Verificar andamento das vendas do dia
- Tomar decisões em tempo real

**Final do dia (18h-19h):**
- Conferir fechamento do dia
- Preparar relatório diário

### 9.3 Criando Rotinas de Análise

**Rotina do Gerente de Filial:**

```
SEGUNDA-FEIRA (8h30):
1. Abrir Dashboard
2. Período: MTD
3. Filial: Minha filial
4. Verificar:
   ☐ % de meta atingido
   ☐ Margem vs semana anterior
   ☐ Top produtos da semana
5. Definir foco da semana

SEXTA-FEIRA (17h):
1. Período: Semana atual
2. Comparar com semana anterior
3. Preparar relatório semanal
4. Enviar para gerência
```

**Rotina do Diretor Comercial:**

```
TODO DIA (9h):
1. Dashboard geral (Todas as Filiais)
2. Período: MTD
3. Verificar filiais abaixo da meta
4. Ligar para gerentes com problemas

TODA SEGUNDA (10h):
1. Reunião com gerentes de filial
2. Apresentar Dashboard consolidado
3. Discutir ações da semana

TODO MÊS (dia 1):
1. Análise completa mês anterior
2. Apresentação para diretoria
3. Ajustes de estratégia
```

### 9.4 Salvando Análises

**Exportando dados:**

Embora o Dashboard não tenha botão de exportação direto, você pode:

**Método 1: Print Screen**
```
1. Ajuste zoom do navegador (Ctrl + ou Ctrl -)
2. Pressione "Print Screen" (tecla PrtSc)
3. Cole no Word/PowerPoint (Ctrl+V)
4. Salve como PDF
```

**Método 2: Anotações Manuais**
```
Crie planilha de acompanhamento:
- Data
- Vendas MTD
- Margem
- % Meta
- Observações
```

**Método 3: Relatórios (outros módulos)**
```
- Use módulo de Relatórios para exportar PDFs
- DRE Gerencial tem exportação completa
- Metas podem ser exportadas
```

### 9.5 Combinando com Outros Módulos

**Dashboard + Relatórios:**
```
1. Dashboard mostra: Vendas caíram 15%
2. Ir para Relatórios → Venda por Curva
3. Identificar: Quais produtos caíram?
4. Ação: Focar em reverter
```

**Dashboard + Metas:**
```
1. Dashboard mostra: 85% da meta
2. Ir para Metas → Metas Mensais
3. Ver: Quais filiais não atingiram?
4. Ação: Plano de ação específico
```

**Dashboard + DRE:**
```
1. Dashboard mostra: Margem caiu
2. Ir para DRE Gerencial
3. Verificar: CMV aumentou? Despesas subiram?
4. Ação: Atuar na causa raiz
```

---

## 10. Solução de Problemas

### 10.1 Dados Não Carregam

**Sintoma:** Dashboard em branco ou carregando infinitamente

**Possíveis causas e soluções:**

**Causa 1: Problema de conexão**
```
Teste:
1. Abra outro site (ex: google.com)
2. Verifica se carrega

Solução:
- Verifique sua conexão de internet
- Tente mudar de rede WiFi
- Use dados móveis temporariamente
```

**Causa 2: Cache do navegador**
```
Solução:
1. Pressione Ctrl + Shift + Delete
2. Selecione "Últimas 4 horas"
3. Marque "Imagens e arquivos em cache"
4. Clique em "Limpar dados"
5. Recarregue a página (F5)
```

**Causa 3: Filtros inválidos**
```
Solução:
1. Verifique se selecionou período válido
2. Verifique se tem filial selecionada
3. Tente "Todas as Filiais"
4. Tente período MTD
```

**Causa 4: Sem permissão**
```
Sintoma: Mensagem "Não autorizado"

Solução:
- Verifique com administrador suas permissões
- Confirme que sua conta está ativa
- Tente fazer logout e login novamente
```

### 10.2 Valores Parecem Incorretos

**Sintoma:** Números não batem com expectativa

**Verificações:**

**1. Conferir filtros aplicados**
```
☐ Período está correto?
☐ Filial correta selecionada?
☐ Não está comparando períodos diferentes?
```

**2. Conferir descontos**
```
Lembre-se:
- Valores exibidos JÁ INCLUEM descontos
- Receita Líquida = Receita - valor_desconto
- CMV = Custo - desconto_custo

Se parece menor que esperado:
→ Pode ter desconto aplicado
→ Verificar módulo Descontos de Venda
```

**3. Conferir consolidação**
```
"Todas as Filiais" mostra:
- Soma de TODAS as filiais da empresa

Se você tem restrição:
- "Todas" = soma apenas suas autorizadas
- Não inclui filiais que você não acessa
```

**4. Comparar com DRE**
```
1. Anote valores do Dashboard
2. Vá para DRE Gerencial
3. Use mesmos filtros
4. Confira se valores batem
5. Se diferente, contate suporte
```

### 10.3 Gráficos Não Aparecem

**Sintoma:** Cards funcionam, mas gráficos não carregam

**Solução:**

**Causa 1: Bloqueio de JavaScript**
```
Solução:
1. Verifique se JS está habilitado
2. No Chrome: chrome://settings/content/javascript
3. Permita JavaScript
4. Recarregue a página
```

**Causa 2: Extensões do navegador**
```
Solução:
1. Desabilite extensões (AdBlock, etc)
2. Ou use modo anônimo (Ctrl+Shift+N)
3. Teste novamente
```

**Causa 3: Navegador desatualizado**
```
Solução:
1. Verifique versão do navegador
2. Atualize para versão mais recente
3. Ou use Chrome/Firefox atualizados
```

### 10.4 Comparativos Confusos

**Sintoma:** Não entendo o que significa "+12% vs anterior"

**Explicação:**

**"+12%" significa:**
```
Período atual vendeu 12% A MAIS que período anterior

Exemplo:
Anterior: R$ 100.000
Atual: R$ 112.000
Variação: +12%

Cálculo:
(112.000 - 100.000) / 100.000 = 0,12 = 12%
```

**"-8%" significa:**
```
Período atual vendeu 8% A MENOS que período anterior

Exemplo:
Anterior: R$ 100.000
Atual: R$ 92.000
Variação: -8%

Cálculo:
(92.000 - 100.000) / 100.000 = -0,08 = -8%
```

**Margem "+2,3 p.p." significa:**
```
p.p. = pontos percentuais

Anterior: 25,5%
Atual: 27,8%
Variação: +2,3 p.p.

NÃO confundir com percentual!
2,3 p.p. ≠ 2,3%
```

### 10.5 Performance Lenta

**Sintoma:** Dashboard demora muito para carregar

**Otimizações:**

**1. Reduza período de análise**
```
Em vez de:
- YTD (365 dias de dados)

Use:
- MTD (30 dias)
- Ou último mês completo
```

**2. Filtre por filial específica**
```
Em vez de:
- Todas as Filiais (consolida todas)

Use:
- Filial específica (menos dados)
```

**3. Otimize navegador**
```
- Feche abas não utilizadas
- Limpe cache regularmente
- Use Chrome ou Firefox
- Aumente RAM disponível
```

**4. Horários alternativos**
```
Evite:
- Horários de pico (9h-12h)
- Fechamento de dia (18h-19h)

Prefira:
- Manhã cedo (7h-8h)
- Tarde (14h-16h)
```

### 10.6 Não Vejo Algumas Filiais

**Sintoma:** Faltam filiais no filtro

**Causa:** Restrição de acesso

**Verificação:**

```
1. Vá para Perfil (canto superior direito)
2. Veja "Filiais Autorizadas"
3. Se houver lista: você tem restrição
4. Se estiver vazio: tem acesso a todas

Solução:
- Contate seu Administrador
- Solicite liberação de acesso
- Justifique a necessidade
```

### 10.7 Suporte Adicional

**Primeiro nível - Administrador da empresa:**
```
Contate seu administrador para:
- Problemas de acesso/permissão
- Dúvidas sobre dados
- Liberação de filiais
- Redefinição de senha
```

**Segundo nível - Suporte técnico:**
```
suporte@bisaas.com.br

Inclua:
1. Descrição do problema
2. Prints da tela
3. Filtros que estava usando
4. Navegador e versão
5. Horário que ocorreu
```

**Documentação adicional:**
```
/docs/MANUAL_USUARIO.md - Manual completo
/docs/FAQ.md - Perguntas frequentes
/docs/TROUBLESHOOTING.md - Solução de problemas
```

---

## 📞 Contato e Recursos

**Módulo:** Dashboard
**Versão:** 1.0.0
**Última Atualização:** Novembro 2024

**Documentação Relacionada:**
- Manual Geral do Usuário
- Manual de Relatórios
- Manual de Metas
- Manual DRE Gerencial

**Suporte:**
- E-mail: suporte@bisaas.com.br
- Administrador da empresa

---

**© 2024 BI SaaS. Todos os direitos reservados.**
