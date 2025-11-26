# Manual Detalhado - Módulo Relatórios

**Versão:** 1.0.0
**Última Atualização:** Novembro 2024
**Módulo:** Relatórios

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Ruptura ABCD](#2-ruptura-abcd)
3. [Venda por Curva ABC](#3-venda-por-curva-abc)
4. [Ruptura Venda 60 Dias](#4-ruptura-venda-60-dias)
5. [Exportação de Relatórios](#5-exportação-de-relatórios)
6. [Casos de Uso](#6-casos-de-uso)
7. [Dicas e Boas Práticas](#7-dicas-e-boas-práticas)
8. [Solução de Problemas](#8-solução-de-problemas)

---

## 1. Visão Geral

### 1.1 O que são os Relatórios?

O módulo de Relatórios oferece análises detalhadas e específicas sobre produtos, categorias e performance de vendas. Diferente do Dashboard (que mostra visão geral), os relatórios permitem **drill-down** nos dados.

**Relatórios Disponíveis:**

1. **Ruptura ABCD** - Produtos sem estoque, classificados por curva ABC
2. **Venda por Curva ABC** - Análise de vendas e lucro com classificação ABC
3. **Ruptura Venda 60D** - Produtos sem movimentação em 60 dias

### 1.2 Quem Pode Acessar?

✅ **Todos os usuários:**
- Super Administrador
- Administrador
- Gestor
- Visualizador

**Permissões:**
- Visualizar: ✅ Todos
- Exportar PDF: ✅ Todos
- Editar dados: ❌ Ninguém (apenas visualização)

### 1.3 Conceito: Curva ABC

**O que é Curva ABC?**

Classificação de produtos por importância baseada no **Princípio de Pareto (80/20)**:

```
CURVA A (🟢):
- 20% dos produtos
- 80% das vendas/lucro
- Alta importância
- Gestão rigorosa necessária

CURVA B (🔵):
- 30% dos produtos
- 15% das vendas/lucro
- Média importância
- Gestão moderada

CURVA C (🟡):
- 50% dos produtos
- 5% das vendas/lucro
- Baixa importância
- Gestão simplificada

CURVA D (🔴):
- Produtos residuais
- <1% das vendas
- Avaliar descontinuação
```

**Aplicações:**
- Priorizar reposição de estoque
- Focar negociações com fornecedores
- Identificar produtos para promoção
- Otimizar espaço de loja

---

## 2. Ruptura ABCD

### 2.1 O que é Ruptura?

**Ruptura = Falta de produto em estoque**

Quando um produto está em ruptura:
- ❌ Cliente não encontra o produto
- ❌ Venda é perdida
- ❌ Cliente pode ir ao concorrente
- ❌ Prejudica fidelização

**Impacto financeiro:**
```
Produto Curva A em ruptura:
- Venda diária média: R$ 5.000
- Dias em ruptura: 3 dias
- Perda estimada: R$ 15.000
```

### 2.2 Acessando o Relatório

```
1. Menu Lateral → Relatórios
2. Selecione "Ruptura ABCD"
3. Configure os filtros
4. Clique em "Aplicar"
```

### 2.3 Filtros Disponíveis

**Filial:**
- Selecione uma ou múltiplas filiais
- Ou "Todas as Filiais" para visão consolidada

**Mês e Ano:**
- Escolha o período de análise
- Padrão: Mês atual

**Aplicar:**
- Clique para carregar dados

### 2.4 Estrutura do Relatório

**Hierarquia de Departamentos:**

```
📂 SETOR (Depto Nível 3)
  └─ 📂 GRUPO (Depto Nível 2)
      └─ 📂 SUBGRUPO (Depto Nível 1)
          └─ 📦 PRODUTOS
```

**Exemplo real:**
```
📂 MERCEARIA (Setor)
  └─ 📂 BISCOITOS (Grupo)
      └─ 📂 BISCOITOS RECHEADOS (Subgrupo)
          └─ 📦 Produto: OREO 144g
              - Código: 12345
              - Ruptura: 5 dias
              - Venda perdida estimada: R$ 2.500
```

**Como navegar:**
- Clique na **seta ▶** para expandir níveis
- Clique na **seta ▼** para recolher
- Todos os níveis começam recolhidos

### 2.5 Informações da Tabela de Produtos

| Coluna | Descrição | Uso |
|--------|-----------|-----|
| **Filial** | ID da filial | Identificar onde está em ruptura |
| **Código** | Código do produto | Buscar no sistema |
| **Descrição** | Nome do produto | Identificação visual |
| **Qtde Ruptura** | Quantidade em falta | Dimensionar problema |
| **Valor Perdido** | Perda estimada (R$) | Impacto financeiro |
| **Curva Venda** | Classificação ABC vendas | Prioridade |
| **Curva Lucro** | Classificação ABC lucro | Rentabilidade |

### 2.6 Filtro de Produto

**Funcionalidade:** Buscar produto específico no relatório

**Como usar:**
1. Digite no campo "Filtrar Produto"
2. Mínimo 3 caracteres
3. Busca por código OU descrição
4. Produtos encontrados são destacados em **azul claro**
5. Departamentos sem produtos correspondentes somem

**Exemplo:**
```
Digitou: "arro"

Encontra:
✅ ARROZ BRANCO 5KG (por descrição)
✅ Produto código 1001arro (por código)

Destaque visual:
┌─────────────────────────────────────┐
│ 12345 │ ARROZ BRANCO 5KG │ ... │ (destaque azul)
└─────────────────────────────────────┘
```

**Performance otimizada:**
- Sistema usa **debounce** de 300ms
- Input responde instantaneamente
- Filtragem ocorre após parar de digitar
- Evita travamento com muitos dados

### 2.7 Interpretando Prioridades

**Ação Urgente (🔴 Alta Prioridade):**
```
Produto Curva A + Ruptura = CRÍTICO

Exemplo:
- Produto: ARROZ BRANCO 5KG
- Curva: A (top vendas)
- Ruptura: 3 dias
- Perda: R$ 15.000

Ação:
→ Repor IMEDIATAMENTE
→ Ligar para fornecedor
→ Priorizar recebimento
```

**Ação Moderada (🟡 Média Prioridade):**
```
Produto Curva B + Ruptura

Ação:
→ Repor normalmente
→ Incluir no próximo pedido
```

**Ação Baixa (⚪ Baixa Prioridade):**
```
Produto Curva C/D + Ruptura

Ação:
→ Avaliar se vale repor
→ Considerar descontinuar
→ Usar espaço para Curva A
```

### 2.8 Casos de Uso Práticos

#### Caso 1: Reunião Diária de Ruptura

**Objetivo:** Identificar e resolver rupturas críticas

```
ROTINA DIÁRIA (9h):

1. Abrir Ruptura ABCD
2. Filtros:
   - Filial: Minha filial
   - Mês: Atual
3. Expandir todos os setores
4. Focar em Curva A (verde)
5. Listar produtos em ruptura

PLANILHA DE CONTROLE:
┌──────────┬─────────────────┬─────────┬────────────┐
│ Código   │ Produto         │ Dias    │ Ação       │
├──────────┼─────────────────┼─────────┼────────────┤
│ 12345    │ ARROZ 5KG       │ 3 dias  │ Ligar forn.│
│ 23456    │ FEIJAO 1KG      │ 1 dia   │ Pedido hj  │
│ 34567    │ CAFE 500G       │ 5 dias  │ URGENTE!   │
└──────────┴─────────────────┴─────────┴────────────┘

AÇÕES:
☐ Ligar fornecedor ARROZ (pedir express)
☐ Fazer pedido FEIJAO hoje
☐ CAFE: Pedir gerente autorizar frete urgente
```

#### Caso 2: Planejamento de Compras

**Objetivo:** Priorizar itens no próximo pedido

```
ANÁLISE SEMANAL:

1. Gerar Ruptura ABCD (todas filiais)
2. Exportar PDF
3. Cruzar com curva ABC
4. Priorizar pedidos:

PRIORIDADE 1 (Curva A):
- Arroz, Feijão, Açúcar
- Pedido expresso
- Não pode faltar

PRIORIDADE 2 (Curva B):
- Café, Óleo, Macarrão
- Pedido normal
- Monitorar estoque

PRIORIDADE 3 (Curva C):
- Produtos específicos
- Pedido se houver demanda
- Avaliar descontinuar
```

---

## 3. Venda por Curva ABC

### 3.1 O que é o Relatório?

Análise completa de vendas e lucro por produto, organizada hierarquicamente por departamentos e classificada em curvas ABC.

**Diferencial:**
- Mostra TODOS os produtos que venderam
- Não só os em ruptura
- Permite análise de performance

### 3.2 Estrutura Hierárquica

**3 níveis de departamento:**

```
📊 SETOR (Dept Nível 3)
├─ Vendas totais do setor
├─ Lucro total do setor
├─ Margem média do setor
│
└─ 📊 GRUPO (Dept Nível 2)
    ├─ Vendas totais do grupo
    ├─ Lucro total do grupo
    ├─ Margem média do grupo
    │
    └─ 📊 SUBGRUPO (Dept Nível 1)
        ├─ Vendas totais do subgrupo
        ├─ Lucro total do subgrupo
        ├─ Margem média do subgrupo
        │
        └─ 🏷️ PRODUTOS
            ├─ Código
            ├─ Descrição
            ├─ Quantidade
            ├─ Valor Vendas
            ├─ Curva Venda (A/B/C/D)
            ├─ Valor Lucro
            ├─ % Lucro
            └─ Curva Lucro (A/B/C/D)
```

### 3.3 Filtros

**Filiais (Multi-Seleção):**
- Permite selecionar múltiplas filiais
- Dados são **consolidados** automaticamente
- Produtos da mesma filial são agrupados

**Mês e Ano:**
- Período de análise
- Padrão: Mês atual

**Filtrar Produto:**
- Busca por código ou nome
- Mínimo 3 caracteres
- Debounce de 300ms (otimizado)
- Expande automaticamente departamentos com match

### 3.4 Tabela de Produtos

**Colunas:**

| Coluna | Descrição | Interpretação |
|--------|-----------|---------------|
| **Filial** | ID da filial | Onde vendeu |
| **Código** | Código do produto | Identificação única |
| **Descrição** | Nome do produto | - |
| **Qtde** | Quantidade vendida | Volume |
| **Valor Vendas** | Receita total | R$ vendidos |
| **Curva Venda** | A/B/C/D | Importância em vendas |
| **Valor Lucro** | Lucro total | R$ lucrados |
| **% Lucro** | Margem do produto | Rentabilidade |
| **Curva Lucro** | A/B/C/D | Importância em lucro |

**Exemplo de linha:**
```
┌───────┬────────┬──────────────┬──────┬─────────┬────────┬────────┬────────┬────────┐
│ Filial│ Código │ Descrição    │ Qtde │ Vendas  │ Curva V│ Lucro  │ % Lucro│ Curva L│
├───────┼────────┼──────────────┼──────┼─────────┼────────┼────────┼────────┼────────┤
│   1   │ 12345  │ ARROZ 5KG    │ 1.234│ 15.420  │   A 🟢 │ 4.626  │ 30,0%  │   A 🟢 │
└───────┴────────┴──────────────┴──────┴─────────┴────────┴────────┴────────┴────────┘

Interpretação:
- Filial 1 vendeu 1.234 unidades
- Faturou R$ 15.420 com esse produto
- Curva A em vendas (top produto)
- Lucrou R$ 4.626 (margem de 30%)
- Curva A também em lucro (alto lucro)
```

### 3.5 Análise Dupla: Vendas vs Lucro

**Matriz de Análise:**

```
         LUCRO ALTO (Curva A/B)     LUCRO BAIXO (Curva C/D)
        ┌──────────────────────┬──────────────────────┐
VENDA   │  ESTRELA ⭐          │  VOLUME 📦           │
ALTA    │  - Alta venda        │  - Alta venda        │
(A/B)   │  - Alto lucro        │  - Baixo lucro       │
        │  Ação: MANTER        │  Ação: ↑ MARGEM      │
        ├──────────────────────┼──────────────────────┤
VENDA   │  RENTÁVEL 💎         │  CANDIDATO 🗑️        │
BAIXA   │  - Baixa venda       │  - Baixa venda       │
(C/D)   │  - Alto lucro        │  - Baixo lucro       │
        │  Ação: ↑ VENDAS      │  Ação: DESCONTINUAR  │
        └──────────────────────┴──────────────────────┘
```

**Exemplos:**

**ESTRELA (Vendas A + Lucro A):**
```
Produto: ARROZ BRANCO 5KG
- Vendas: R$ 15.420 (Curva A)
- Lucro: R$ 4.626 (Curva A, 30%)

Ação:
✅ Manter sempre em estoque
✅ Negociar volumes maiores
✅ Posição privilegiada na loja
✅ Não fazer promoção agressiva
```

**VOLUME (Vendas A + Lucro C):**
```
Produto: REFRIGERANTE 2L
- Vendas: R$ 12.000 (Curva A)
- Lucro: R$ 600 (Curva C, 5%)

Problema: Vende muito mas lucro baixo

Ação:
⚠️ Aumentar margem gradualmente
⚠️ Criar bundles com produtos lucrativos
⚠️ Negociar desconto com fornecedor
⚠️ Avaliar: vale a pena como "isca"?
```

**RENTÁVEL (Vendas C + Lucro A):**
```
Produto: QUEIJO IMPORTADO
- Vendas: R$ 800 (Curva C)
- Lucro: R$ 480 (Curva A, 60%)

Problema: Lucra muito mas vende pouco

Ação:
💡 Aumentar visibilidade
💡 Degustações
💡 Marketing direcionado
💡 Treinar equipe para oferecer
```

**CANDIDATO (Vendas C + Lucro C):**
```
Produto: TEMPERO RARO
- Vendas: R$ 50 (Curva D)
- Lucro: R$ 5 (Curva D, 10%)

Problema: Nem vende, nem lucra

Ação:
🗑️ Descontinuar
🗑️ Promoção para liquidar estoque
🗑️ Usar espaço para produto melhor
```

### 3.6 Consolidação Multi-Filial

**Como funciona:**

Quando seleciona **múltiplas filiais**, o sistema:

1. Busca dados de cada filial separadamente
2. Agrupa produtos pelo código
3. Soma vendas e lucros
4. Recalcula margens e curvas

**Exemplo:**

```
PRODUTO: ARROZ 5KG (Código 12345)

Filial 1:
- Vendas: R$ 10.000
- Lucro: R$ 3.000 (30%)

Filial 2:
- Vendas: R$ 5.000
- Lucro: R$ 1.250 (25%)

CONSOLIDADO:
- Vendas: R$ 15.000 (soma)
- Lucro: R$ 4.250 (soma)
- Margem: 28,3% (recalculada: 4.250/15.000)
- Curva: Recalculada sobre total consolidado
```

### 3.7 Paginação

**Configuração:**
- **50 departamentos** de nível 3 por página
- Navegação no rodapé
- Botões: ← Anterior | 1 2 3 ... | Próximo →

**Por que paginar?**
- Performance: Muitos departamentos = página pesada
- Usabilidade: Mais fácil navegar
- Exportação PDF: Inclui TODOS os dados (não apenas página atual)

**Como navegar:**
```
Página 1: Departamentos 1-50
Página 2: Departamentos 51-100
...

Clique no número da página ou:
- "Anterior" para voltar
- "Próximo" para avançar
```

### 3.8 Casos de Uso

#### Caso 1: Análise de Mix de Produtos

**Objetivo:** Identificar produtos para descontinuar e produtos para promover

```
PROCESSO:

1. Abrir Venda por Curva ABC
2. Filtros:
   - Filiais: Todas
   - Mês: Últimos 3 meses (fazer 3× para média)

3. Criar matriz:

PRODUTOS ESTRELA (manter):
☐ Arroz 5kg: Venda A, Lucro A, 30%
☐ Feijão 1kg: Venda A, Lucro A, 28%
☐ Açúcar 1kg: Venda B, Lucro A, 35%

PRODUTOS VOLUME (melhorar margem):
☐ Refri 2L: Venda A, Lucro C, 5% → Tentar 7%
☐ Água 1,5L: Venda A, Lucro D, 3% → Tentar 5%

PRODUTOS RENTÁVEIS (aumentar vendas):
☐ Queijo Imp: Venda C, Lucro A, 60% → Degustação
☐ Vinho Fino: Venda C, Lucro A, 55% → Divulgação

PRODUTOS CANDIDATOS (descontinuar):
☐ Tempero X: Venda D, Lucro D, 10% → Liquidar
☐ Biscoito Y: Venda C, Lucro D, 8% → Descontinuar

AÇÕES:
1. Aumentar margem dos "Volume" em 2 p.p.
2. Criar campanha para "Rentáveis"
3. Promoção liquidação "Candidatos"
4. Usar espaço livre para mais "Estrelas"
```

#### Caso 2: Negociação com Fornecedores

**Objetivo:** Identificar produtos para negociar melhores condições

```
ANÁLISE:

1. Filtrar por fornecedor (via descrição)
2. Listar todos produtos do fornecedor
3. Classificar por volume

FORNECEDOR: DISTRIBUIDORA ABC

Produtos Curva A (alto volume):
┌────────────────┬─────────┬─────────┬────────┐
│ Produto        │ Vendas  │ Margem  │ Ponto  │
├────────────────┼─────────┼─────────┼────────┤
│ Arroz 5kg      │ 150k    │ 30%     │   45   │
│ Feijão 1kg     │ 120k    │ 28%     │   34   │
│ Açúcar 1kg     │ 100k    │ 25%     │   25   │
├────────────────┼─────────┼─────────┼────────┤
│ TOTAL          │ 370k    │ 28%     │  104   │
└────────────────┴─────────┴─────────┴────────┘

NEGOCIAÇÃO:

Argumentos:
"Compramos R$ 370k/mês de vocês (Curva A)
Se conseguirem:
- 3% desconto adicional
- Bonificação 5%
- Prazo 60 dias

Garantimos:
- Aumentar 20% volume
- Exclusividade categoria
- Ponto extra na loja"

Impacto:
- 3% desconto = +R$ 11.100/mês lucro
- Volume +20% = +R$ 74.000/mês vendas
- Margem sobe de 28% para 31%
```

---

## 4. Ruptura Venda 60 Dias

### 4.1 O que é?

Relatório de produtos que **não tiveram nenhuma venda** nos últimos 60 dias.

**Objetivo:** Identificar:
- Produtos obsoletos
- Estoque parado
- Produtos sazonais fora de época
- Candidatos à descontinuação

### 4.2 Por que 60 dias?

```
30 dias: Pode ser sazonalidade normal
60 dias: Indica problema real
90 dias: Estoque morto (capital imobilizado)
```

### 4.3 Filtros

**Filial:** Uma filial por vez (não consolida)
**Período:** Fixo em 60 dias (não configurável)

### 4.4 Informações Exibidas

| Coluna | Descrição |
|--------|-----------|
| **Código** | Código do produto |
| **Descrição** | Nome do produto |
| **Departamento** | Categoria do produto |
| **Última Venda** | Data da última venda registrada |
| **Dias sem Venda** | Quantos dias desde a última venda |
| **Estoque Atual** | Quantidade em estoque |
| **Valor Estoque** | R$ do estoque parado |

### 4.5 Interpretando Resultados

**Alto risco (>90 dias):**
```
Produto: DECORAÇÃO NATAL
- Última venda: 15/01/2024
- Dias sem venda: 180
- Estoque: 50 unidades
- Valor parado: R$ 2.500

Análise:
→ Produto sazonal (Natal)
→ Fora de época
→ Capital imobilizado

Ação:
☐ Aguardar próximo Natal
☐ OU liquidar com desconto
☐ OU transferir para outra filial
```

**Médio risco (60-90 dias):**
```
Produto: BISCOITO ESPECIAL
- Última venda: 15/09/2024
- Dias sem venda: 75
- Estoque: 10 unidades
- Valor parado: R$ 150

Ação:
☐ Promoção moderada (20% off)
☐ Exposição destacada
☐ Se não vender em 15 dias, descontinuar
```

**Baixo risco (60 dias exato):**
```
Ação:
☐ Monitorar mais 30 dias
☐ Se vender, ok
☐ Se não, reclassificar médio risco
```

### 4.6 Decisões Baseadas no Relatório

**Fluxograma de Decisão:**

```
Produto sem venda 60 dias
        ↓
    Sazonalidade?
       /  \
     SIM   NÃO
      ↓     ↓
   Aguardar  Avaliar
   próxima   estoque
   época      ↓
         Estoque > 10?
            /  \
          SIM   NÃO
           ↓     ↓
       Promoção Descontinu
       agressiva    ar
       (50%)
```

### 4.7 Caso de Uso

**Reunião Mensal de Estoque:**

```
OBJETIVO: Liberar capital imobilizado

PROCESSO:

1. Gerar Ruptura 60D para cada filial
2. Consolidar em planilha:

┌───────────────┬──────┬─────────┬────────────┐
│ Produto       │ Dias │ Estoque │ Decisão    │
├───────────────┼──────┼─────────┼────────────┤
│ Produto A     │ 180  │ R$ 5k   │ Liquid 70% │
│ Produto B     │ 90   │ R$ 2k   │ Promo 50%  │
│ Produto C     │ 65   │ R$ 500  │ Monitorar  │
└───────────────┴──────┴─────────┴────────────┘

RESULTADO ESPERADO:
- Recuperar R$ 7.000 em capital
- Liberar espaço para Curva A
- Melhorar giro de estoque
```

---

## 5. Exportação de Relatórios

### 5.1 Como Exportar

**Botão "Exportar PDF":**
- Localizado no topo da página
- Aparece apenas quando há dados
- Ícone: 📄

**Processo:**
```
1. Configure os filtros desejados
2. Aplique os filtros
3. Aguarde carregar os dados
4. Clique em "Exportar PDF"
5. Sistema busca TODOS os dados (não apenas página atual)
6. Gera PDF
7. Download automático
```

### 5.2 Conteúdo do PDF

**Cabeçalho:**
- Nome do relatório
- Filial(is) selecionada(s)
- Período (mês/ano)
- Data de geração
- Usuário que gerou

**Dados:**
- **Venda por Curva:** Hierarquia completa (todos os níveis)
- **Ruptura ABCD:** Todos os produtos em ruptura
- **Ruptura 60D:** Todos os produtos sem venda

**Rodapé:**
- Número da página
- Total de páginas
- Gerado por Claude Code

### 5.3 Limitações

**Máximo 10.000 registros:**
- Se houver mais, apenas primeiros 10 mil
- Raramente atinge esse limite
- Use filtros para reduzir se necessário

**Tempo de geração:**
- Pequeno (< 100 produtos): 2-5 segundos
- Médio (100-1000): 5-15 segundos
- Grande (1000-10000): 15-60 segundos

### 5.4 Dicas de Exportação

**Para apresentações:**
```
1. Filtre apenas dados relevantes
2. Exporte PDF
3. Importe no PowerPoint
4. Adicione gráficos e análises
```

**Para compartilhamento:**
```
1. Exporte PDF
2. Envie por e-mail
3. Ou salve em pasta compartilhada
4. PDF preserva formatação
```

**Para arquivo:**
```
Nomear arquivos:
- Venda-Curva-Nov2024-TodasFiliais.pdf
- Ruptura-ABCD-Filial1-Out2024.pdf
- Ruptura60D-Filial2-2024-11-20.pdf
```

---

## 6. Casos de Uso

### 6.1 Planejamento de Compras Semanal

```
SEGUNDA-FEIRA (10h):

1. Ruptura ABCD (todas filiais)
   → Identificar produtos em falta

2. Venda por Curva (mês atual)
   → Ver quais vendem mais

3. Cruzar informações:

PEDIDO URGENTE (Curva A em ruptura):
☐ Arroz 5kg - 3 dias ruptura
☐ Feijão 1kg - 2 dias ruptura

PEDIDO NORMAL (Curva B):
☐ Café 500g - estoque baixo
☐ Óleo 900ml - estoque ok

NÃO PEDIR (Curva C com estoque):
☐ Tempero X - 60 dias parado
☐ Biscoito Y - venda baixa
```

### 6.2 Análise de Desempenho Mensal

```
TODO MÊS (dia 5):

1. Venda por Curva (mês anterior completo)
2. Exportar PDF
3. Analisar:

TOP 10 PRODUTOS:
1. Arroz: R$ 150k (+5% vs mês anterior)
2. Feijão: R$ 120k (+3%)
...

PRODUTOS EM CRESCIMENTO:
- Café subiu de Curva B para A
- Açúcar manteve Curva A

PRODUTOS EM QUEDA:
- Refri caiu de A para B
- Biscoito X caiu de B para C

AÇÕES:
→ Investigar queda do Refri
→ Promover Café (está crescendo)
→ Avaliar descontinuar Biscoito X
```

### 6.3 Limpeza de Estoque Trimestral

```
TODO TRIMESTRE:

1. Ruptura 60D (cada filial)
2. Consolidar todos produtos
3. Classificar por valor parado

LIQUIDAÇÃO TRIMESTRAL:
┌────────────────┬────────┬──────────┐
│ Produto        │ Estoque│ Desconto │
├────────────────┼────────┼──────────┤
│ >120 dias      │ R$ 10k │   70%    │
│ 90-120 dias    │ R$ 5k  │   50%    │
│ 60-90 dias     │ R$ 3k  │   30%    │
└────────────────┴────────┴──────────┘

RESULTADO:
- Capital liberado: R$ 18k
- Espaço liberado: 200 m² lineares
- Usar para produtos Curva A
```

---

## 7. Dicas e Boas Práticas

### 7.1 Frequência de Consulta

**Ruptura ABCD:**
- Diariamente (gerente de loja)
- Semanalmente (comprador)

**Venda por Curva:**
- Semanalmente (análise de tendências)
- Mensalmente (fechamento)

**Ruptura 60D:**
- Mensalmente (limpeza de estoque)
- Trimestralmente (revisão profunda)

### 7.2 Combinando Relatórios

**Ruptura + Venda por Curva:**
```
1. Ver produtos em ruptura (Ruptura ABCD)
2. Verificar se são Curva A (Venda Curva)
3. Priorizar reposição dos Curva A
```

**Venda Curva + Ruptura 60D:**
```
1. Ver produtos sem venda (Ruptura 60D)
2. Verificar curva (Venda por Curva)
3. Se Curva C/D: Descontinuar
4. Se Curva A/B: Investigar problema
```

### 7.3 Criando Rotinas

**Rotina do Gerente de Compras:**
```
SEG (9h): Ruptura ABCD → Pedidos urgentes
TER (14h): Venda Curva → Análise semanal
QUA (10h): Negociações com fornecedores
QUI (15h): Revisar pedidos da semana
SEX (11h): Ruptura 60D → Planejar promoções
```

### 7.4 Salvando Análises

**Histórico de PDFs:**
```
/Relatorios/2024/
  /11-Novembro/
    Venda-Curva-Semana1.pdf
    Venda-Curva-Semana2.pdf
    Ruptura-ABCD-03Nov.pdf
    Ruptura-60D-30Nov.pdf
```

**Planilha de Acompanhamento:**
```
Data       | Relatorio      | Principal Insight
-----------|----------------|------------------
2024-11-01 | Ruptura ABCD   | 5 Curva A em falta
2024-11-08 | Venda Curva    | Café subiu para A
2024-11-15 | Ruptura 60D    | 20 produtos >90d
```

---

## 8. Solução de Problemas

### 8.1 Relatório Vazio

**Sintoma:** "Nenhum dado encontrado"

**Causas:**

**1. Sem dados no período:**
```
Solução:
- Verifique se há vendas no mês selecionado
- Tente mês anterior
- Verifique com TI se dados estão sendo importados
```

**2. Filtros muito restritivos:**
```
Solução:
- Tente "Todas as Filiais"
- Remova filtro de produto
- Selecione período maior
```

**3. Filial sem permissão:**
```
Solução:
- Verifique suas filiais autorizadas
- Contate administrador para liberar acesso
```

### 8.2 Filtro de Produto Não Funciona

**Sintoma:** Digitou mas não filtra

**Soluções:**

**Menos de 3 caracteres:**
```
Aparece mensagem: "Mín. 3 caracteres"

Solução: Digite pelo menos 3 caracteres
```

**Aguardar debounce:**
```
Sistema espera 300ms após parar de digitar

Solução: Aguarde 1 segundo após digitar
```

**Produto não existe:**
```
Digitou código/nome que não existe

Solução:
- Verifique ortografia
- Tente parte do nome
- Verifique se produto vendeu no período
```

### 8.3 Exportação PDF Falha

**Causas e Soluções:**

**1. Pop-up bloqueado:**
```
Solução:
- Permita pop-ups do site
- No Chrome: ícone 🚫 na barra de endereço
- Clique e selecione "Sempre permitir"
```

**2. Muitos dados:**
```
Sintoma: Trava ao exportar

Solução:
- Reduza período (1 mês em vez de 3)
- Selecione filial específica (não "Todas")
- Feche outras abas do navegador
```

**3. Navegador antigo:**
```
Solução:
- Atualize navegador
- Ou use Chrome/Firefox mais recente
```

### 8.4 Dados Parecem Errados

**Verificações:**

**1. Período correto:**
```
Confira se selecionou mês/ano corretos
```

**2. Filial correta:**
```
"Todas" mostra consolidado
Filial específica mostra apenas dela
```

**3. Curva ABC:**
```
Curva é RELATIVA ao período/filial selecionados
Produto pode ser Curva A em uma filial e B em outra
```

**4. Comparar com outros módulos:**
```
Venda Curva deve bater com Dashboard
Se diferente, verificar:
- Mesmos filtros?
- Mesmas filiais?
- Mesmo período?
```

### 8.5 Performance Lenta

**Soluções:**

**1. Muitos produtos:**
```
- Use filtro de produto
- Selecione filial específica
- Não expanda todos departamentos
```

**2. Conexão lenta:**
```
- Aguarde carregamento completo
- Evite horários de pico
- Tente em outro horário
```

**3. Otimização:**
```
- Limpe cache do navegador
- Feche abas não utilizadas
- Reinicie navegador
```

---

## 📞 Suporte

**Documentação Relacionada:**
- Manual Geral do Usuário
- Manual Dashboard
- Manual Metas

**Contato:**
- Administrador local
- suporte@bisaas.com.br

---

**© 2024 BI SaaS. Todos os direitos reservados.**
