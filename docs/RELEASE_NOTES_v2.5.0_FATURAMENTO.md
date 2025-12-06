# 📊 Release Notes - Versão 2.5.0

## Integração de Vendas Faturamento ao Dashboard

**Data de Lançamento:** 06 de Dezembro de 2025

---

## 🎯 Resumo

Esta atualização traz a **integração completa de Vendas Faturamento** ao módulo Dashboard, permitindo uma visão consolidada e detalhada de todas as suas operações de venda - tanto PDV quanto Faturamento (notas fiscais).

---

## ✨ Novidades

### 1. Novo Filtro "Tipo de Venda"

Adicionamos um novo filtro entre **Filiais** e **Filtrar por** com três opções:

| Opção | Descrição |
|-------|-----------|
| **Completo** | Visualização consolidada (PDV + Faturamento) |
| **Venda PDV** | Apenas vendas realizadas no ponto de venda |
| **Venda Faturamento** | Apenas vendas faturadas (notas fiscais) |

> 💡 **Dica:** O filtro "Completo" é o padrão e mostra a soma de todas as vendas.

### 2. Cards de Métricas Consolidados

Os três cards principais agora exibem valores consolidados:

- **Receita Bruta** = Vendas PDV + Vendas Faturamento
- **Lucro Bruto** = Lucro PDV + Lucro Faturamento
- **Margem Bruta** = Calculada sobre a receita consolidada

Os cards também mostram comparativos com períodos anteriores (mês anterior e mesmo mês do ano anterior) já considerando faturamento.

### 3. Tabela "Vendas por Filial" Aprimorada

A tabela agora exibe os valores por filial considerando o filtro de tipo de venda selecionado:

- Receita Bruta por filial (PDV + Faturamento ou individual)
- Custo por filial
- Lucro Bruto por filial
- Margem Bruta por filial

### 4. Gráfico de Vendas com Faturamento

O gráfico de barras mensal agora inclui dados de faturamento:

- **Barra Verde (Receita):** Considera o tipo de venda selecionado
- **Barra Vermelha (Despesas):** Mantém as despesas operacionais
- **Linha Amarela (Lucro Bruto):** Calculado conforme tipo de venda

---

## 🔧 Melhorias Técnicas

### Correção na Comparação de Meses Completos

Corrigimos um problema onde, ao filtrar um mês passado completo (ex: Novembro), a comparação com o mês anterior (ex: Outubro) não considerava todos os dias do mês.

**Antes:** Novembro (30 dias) comparava com Outubro 1-30 (faltando dia 31)
**Agora:** Novembro completo compara com Outubro completo (1-31)

---

## 📈 Como Usar

### Visualizar Vendas Consolidadas
1. Acesse o **Dashboard**
2. Selecione as filiais desejadas
3. Mantenha o filtro "Tipo de Venda" em **Completo**
4. Selecione o período desejado

### Analisar Apenas Vendas PDV
1. Selecione **Venda PDV** no filtro "Tipo de Venda"
2. Os cards, tabela e gráfico mostrarão apenas vendas do PDV

### Analisar Apenas Faturamento
1. Selecione **Venda Faturamento** no filtro "Tipo de Venda"
2. Os cards, tabela e gráfico mostrarão apenas vendas faturadas

---

## 📋 Notas Importantes

- O **Ticket Médio** sempre utiliza dados do PDV (transações de caixa)
- As **Despesas Operacionais** são exibidas independente do tipo de venda
- Os comparativos com períodos anteriores (PA) utilizam dados do PDV quando dados de faturamento histórico não estão disponíveis

---

## 🆘 Suporte

Em caso de dúvidas ou problemas, entre em contato com a equipe de suporte.

---

*Esta atualização foi desenvolvida para proporcionar uma visão mais completa e precisa das operações de venda da sua empresa.*
