# Changelog - Módulo DRE Gerencial

Todas as mudanças notáveis neste módulo serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2025-01-12

### ✨ Adicionado

#### Linha de Receita Bruta na Tabela
- **Nova linha "RECEITA BRUTA"** exibida acima de "TOTAL DESPESAS"
- **Coluna Total**: Exibe soma da receita bruta de todas as filiais selecionadas
- **Colunas de Filiais**: Exibe receita bruta individual de cada filial
- **Estilo**: Negrito, cor verde, sem percentuais
- **Não expansível**: Linha não tem subRows (não expande)
- **Arquivos modificados**:
  - `src/app/(dashboard)/dre-gerencial/page.tsx`: Nova interface, estado e função
  - `src/components/despesas/columns.tsx`: Novo tipo 'receita' e estilos
- **Referência**: [IMPLEMENTACAO_RECEITA_BRUTA_LINHA.md](../../fixes/IMPLEMENTACAO_RECEITA_BRUTA_LINHA.md)

### 🔄 Modificado

#### Cálculo % RB nas Colunas de Filiais
- **ANTES**: % RB calculado em relação à receita bruta **total** de todas as filiais
- **DEPOIS**: % RB calculado em relação à receita bruta da **filial específica**
- **Motivo**: Melhor análise gerencial e comparabilidade entre filiais de tamanhos diferentes
- **Impacto**:
  - Coluna **Total**: Não mudou (continua usando receita total)
  - Colunas de **Filiais**: Mudou (agora usa receita da filial)
- **Exemplo**:
  ```
  Despesa Aluguel = R$ 5.000 na Filial 1 (Receita = R$ 300K)
  ANTES: (5K / 500K total) × 100 = 1,00%
  DEPOIS: (5K / 300K filial) × 100 = 1,67%
  ```
- **Arquivos modificados**:
  - `src/components/despesas/columns.tsx`: Novo parâmetro e cálculo atualizado
  - `src/app/(dashboard)/dre-gerencial/page.tsx`: Passagem de dados por filial
- **Referência**: [ATUALIZACAO_CALCULO_RB_FILIAIS.md](../../fixes/ATUALIZACAO_CALCULO_RB_FILIAIS.md)

#### Legenda Atualizada
- **ANTES**: "Legenda: TD = Total de Despesas | RB = Receita Bruta"
- **DEPOIS**: "Legenda: TD = Total de Despesas | TDF = Total Despesas da Filial | RB = Receita Bruta"
- **Motivo**: Adicionar TDF para esclarecer o significado de % TDF nas colunas de filiais

### 📚 Documentação

#### Novas Regras de Negócio
- **RE-012**: Indicadores % TDF e % RB nas Colunas de Filiais (detalhamento completo)
- **RE-013**: Linha de Receita Bruta (comportamento e estilo)

#### Documentos Criados
- `docs/fixes/IMPLEMENTACAO_RECEITA_BRUTA_LINHA.md` - Implementação completa da linha de receita
- `docs/fixes/ATUALIZACAO_CALCULO_RB_FILIAIS.md` - Detalhes da mudança de cálculo
- `docs/fixes/ROLLBACK_RECEITA_BRUTA_LINHA.md` - Procedimento de rollback

#### Documentos Atualizados
- `docs/modules/dre-gerencial/BUSINESS_RULES.md` - Novas regras RE-012 e RE-013
- `docs/modules/dre-gerencial/CHANGELOG.md` - Este arquivo

### 🎯 Benefícios

1. **Melhor Visibilidade**: Receita bruta agora visível diretamente na tabela
2. **Análise Comparativa**: Fácil comparar despesas proporcionalmente entre filiais
3. **Identificação de Outliers**: Detectar despesas desproporcionais em filiais específicas
4. **Consistência**: % TDF e % RB agora ambos relativos à filial, não ao total

### ⚠️ Breaking Changes

**Nenhum** - As mudanças são retrocompatíveis:
- Nenhuma mudança em APIs
- Nenhuma mudança em funções RPC
- Nenhuma mudança em tabelas do banco
- Apenas mudanças no frontend

### 🔙 Rollback

Se necessário reverter as mudanças:
- Ver procedimento completo em: `docs/fixes/ROLLBACK_RECEITA_BRUTA_LINHA.md`
- Tempo estimado de rollback: 5-10 minutos
- Sem necessidade de rollback no banco de dados

---

## [1.0.0] - 2025-01-11

### ✨ Versão Inicial

#### Funcionalidades Principais
- Análise hierárquica de despesas (3 níveis: Departamento → Tipo → Despesa)
- Consolidação multi-filial com requisições paralelas
- Comparações temporais (PAM e PAA)
- 7 indicadores financeiros (Receita, CMV, Lucro Bruto, Despesas, Lucro Líquido, Margens)
- Tabela hierárquica expansível com DataTable
- Filtros por filial, mês e ano
- Restrições de acesso por filial
- Cards de indicadores com comparações
- Gráfico de evolução mensal
- Export PDF (não implementado na v1.0.0)

#### Regras de Negócio
- 40+ regras documentadas em BUSINESS_RULES.md
- Cálculos padronizados de indicadores
- Validações de acesso e autorização
- Performance otimizada com requisições paralelas

#### Arquitetura
- Multi-tenant com schema isolation
- 2 APIs: `/api/dre-gerencial/hierarquia` e `/api/dashboard`
- 2 RPC functions: `get_despesas_hierarquia` e `get_dashboard_data`
- Componentes reutilizáveis (Filters, IndicatorsCards, DataTable)

#### Documentação Completa
- README.md - Visão geral e arquitetura
- BUSINESS_RULES.md - 40+ regras de negócio
- DATA_STRUCTURES.md - 13 interfaces TypeScript
- INTEGRATION_FLOW.md - Fluxo detalhado com diagramas
- RPC_FUNCTIONS.md - Documentação das funções PostgreSQL
- SUMMARY.md - Resumo executivo

---

## Notas de Versão

### Versionamento

Este módulo usa Semantic Versioning:
- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (1.X.0): Novas funcionalidades retrocompatíveis
- **PATCH** (1.0.X): Correções de bugs retrocompatíveis

### Manutenção

- **Frequência de atualização**: Conforme necessidade
- **Responsável**: Equipe de Desenvolvimento
- **Última revisão**: 2025-01-12

### Links Úteis

- [Documentação Completa](./README.md)
- [Regras de Negócio](./BUSINESS_RULES.md)
- [Estruturas de Dados](./DATA_STRUCTURES.md)
- [Fluxo de Integração](./INTEGRATION_FLOW.md)
- [Funções RPC](./RPC_FUNCTIONS.md)
- [Resumo Executivo](./SUMMARY.md)

---

**Formato do Changelog**: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
**Versionamento**: [Semantic Versioning](https://semver.org/lang/pt-BR/)
