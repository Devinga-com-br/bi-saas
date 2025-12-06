# 📊 Release Notes - Versão 2.5.0

## Integração Completa de Vendas Faturamento

**Data de Lançamento:** 06 de Dezembro de 2025

---

## 🎯 Visão Geral

A partir desta versão, o sistema passa a contemplar **Vendas Faturamento** (notas fiscais de saída) em todos os módulos financeiros. Isso significa que agora você tem uma visão completa e consolidada de todas as operações de venda da sua empresa, seja no ponto de venda (PDV) ou através de faturamento direto.

### O que são Vendas Faturamento?

São as vendas realizadas através de **notas fiscais de saída**, geralmente utilizadas para:
- Vendas por atacado
- Vendas para pessoas jurídicas
- Operações que não passam pelo caixa do PDV
- Faturamento direto para clientes

---

## 📍 Módulos Atualizados

### 1. Dashboard

O Dashboard agora exibe a **Receita Bruta Consolidada**, que é a soma de:

```
Receita Bruta = Vendas PDV + Vendas Faturamento
```

#### Novo Filtro "Tipo de Venda"

Adicionamos um filtro que permite alternar entre três visualizações:

| Filtro | O que exibe |
|--------|-------------|
| **Completo** | PDV + Faturamento (visão consolidada) |
| **Venda PDV** | Apenas vendas do ponto de venda |
| **Venda Faturamento** | Apenas notas fiscais de saída |

#### Cards de Métricas

Os três cards principais foram atualizados:

**Receita Bruta**
- Valor consolidado (PDV + Faturamento)
- Comparativo com mês anterior (ex: OUT/2025)
- Comparativo com mesmo mês do ano anterior (ex: NOV/2024)
- Variação percentual em relação aos períodos

**Lucro Bruto**
- Lucro PDV + Lucro Faturamento
- Lucro Faturamento = Receita Faturamento - CMV Faturamento
- CMV calculado como: quantidade × custo médio

**Margem Bruta**
- Calculada sobre a receita consolidada
- Fórmula: (Lucro Bruto / Receita Bruta) × 100

#### Tabela "Vendas por Filial"

A tabela exibe valores por filial considerando o filtro selecionado:
- Receita Bruta (consolidada ou filtrada)
- Custo (CMV PDV + CMV Faturamento)
- Lucro Bruto
- Margem Bruta
- Comparativos com período anterior

#### Gráfico de Vendas Mensal

O gráfico de barras agora inclui dados de faturamento:
- **Barra Verde (Receita):** Considera o tipo de venda selecionado
- **Linha Amarela (Lucro):** Calculado conforme tipo de venda
- Dados disponíveis mês a mês para o ano atual e anterior

---

### 2. DRE Gerencial

O Demonstrativo de Resultado do Exercício (DRE) Gerencial agora apresenta a receita separada por origem:

#### Estrutura da Receita Bruta

```
RECEITA BRUTA
├── Vendas de PDV
└── Vendas Faturamento    ← NOVO
```

A linha "RECEITA BRUTA" é expansível, permitindo visualizar o detalhamento por origem.

#### Estrutura do CMV

```
(-) CMV - Custo da Mercadoria Vendida
├── CMV PDV
└── CMV Faturamento    ← NOVO
```

Da mesma forma, o CMV é apresentado de forma consolidada com opção de expandir para ver o detalhamento.

#### Cálculos

| Métrica | Fórmula |
|---------|---------|
| Receita Bruta | Vendas PDV + Vendas Faturamento |
| CMV Total | CMV PDV + CMV Faturamento |
| Lucro Bruto | Receita Bruta - CMV Total |
| Margem Bruta | (Lucro Bruto / Receita Bruta) × 100 |

---

### 3. DRE Comparativo

O DRE Comparativo permite comparar múltiplos períodos lado a lado, agora com dados de faturamento incluídos:

#### Visualização

Ao comparar períodos (ex: Nov/2025 vs Out/2025 vs Nov/2024):

```
                          Nov/2025    Out/2025    Nov/2024
RECEITA BRUTA            10.326.683   9.505.852   6.837.554
  └ Vendas de PDV        10.102.086   9.362.566   6.721.234
  └ Vendas Faturamento      224.597     143.286     116.320

(-) CMV                   7.845.123   7.234.567   5.123.456
  └ CMV PDV               7.689.456   7.098.234   5.012.345
  └ CMV Faturamento         155.667     136.333     111.111

= LUCRO BRUTO             2.481.560   2.271.285   1.714.098
```

#### Recursos

- Comparação de até 4 períodos simultaneamente
- Expansão para ver detalhamento PDV vs Faturamento
- Cálculo automático de variações entre períodos

---

## 📐 Regras de Cálculo do Faturamento

### Receita de Faturamento

A receita é calculada por **nota fiscal distinta**:

```sql
Receita = SUM(valor_contabil) por id_saida DISTINTO
```

Isso evita duplicação quando uma nota possui múltiplos itens.

### CMV de Faturamento

O Custo da Mercadoria Vendida é calculado por item:

```sql
CMV = SUM(quantidade × custo_medio)
```

### Lucro Bruto de Faturamento

```sql
Lucro = Receita - CMV
```

### Filtros Aplicados

- Apenas notas **não canceladas**
- Filtro por **período** (data de saída)
- Filtro por **filial**

---

## 🔧 Melhorias Técnicas

### Correção na Comparação de Meses Completos

Identificamos e corrigimos um problema onde, ao filtrar um mês passado completo, a comparação com períodos anteriores não considerava o mês completo.

**Exemplo do problema:**
- Filtro: Novembro/2025 (01/11 a 30/11)
- Comparação com Outubro: buscava apenas 01/10 a 30/10 (faltando dia 31)

**Correção:**
- Agora detectamos quando o filtro é um "mês completo passado"
- A comparação busca o mês anterior **completo** (01/10 a 31/10)

---

## 💡 Dicas de Uso

### Para Análise Consolidada
1. Mantenha o filtro "Tipo de Venda" em **Completo**
2. Visualize a receita total da empresa (PDV + Faturamento)

### Para Análise de Canais
1. Alterne entre **Venda PDV** e **Venda Faturamento**
2. Compare o desempenho de cada canal de vendas

### Para Análise por Filial
1. Use o DRE Gerencial para ver o detalhamento
2. Expanda as linhas de Receita e CMV para ver a origem

### Para Comparações Temporais
1. Use o DRE Comparativo
2. Compare o mesmo mês em anos diferentes
3. Analise a evolução do faturamento ao longo do tempo

---

## 📋 Observações Importantes

| Item | Comportamento |
|------|---------------|
| **Ticket Médio** | Calculado apenas com dados do PDV (transações de caixa) |
| **Despesas Operacionais** | Exibidas independente do tipo de venda |
| **Histórico de Faturamento** | Comparativos PA usam dados do PDV quando faturamento histórico não está disponível |
| **Tabela de Faturamento** | Requer que a tabela `faturamento` exista no schema do tenant |

---

## 🚀 Benefícios

✅ **Visão Completa** - Todas as vendas em um só lugar

✅ **Análise por Canal** - Compare PDV vs Faturamento

✅ **Decisões Informadas** - Dados consolidados para melhor gestão

✅ **Flexibilidade** - Filtre conforme sua necessidade de análise

✅ **Consistência** - Mesmos dados em Dashboard, DRE Gerencial e DRE Comparativo

---

## 🆘 Suporte

Em caso de dúvidas sobre os novos recursos ou se os dados de faturamento não estiverem aparecendo, entre em contato com a equipe de suporte.

---

*Esta atualização representa um marco importante na evolução do sistema, proporcionando uma visão financeira completa e integrada de todas as operações de venda da sua empresa.*

**Equipe de Desenvolvimento**
*Dezembro de 2025*
