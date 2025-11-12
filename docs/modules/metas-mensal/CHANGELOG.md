# Changelog - Metas Mensal

> Histórico completo de versões, features, correções e melhorias do módulo de Metas Mensais.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e usa [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.5.0] - 2025-01-11

### ✨ Adicionado
- **Auto-seleção de Filiais**: Ao carregar a página, todas as filiais autorizadas são automaticamente selecionadas no filtro
  - Implementação: `useEffect` que detecta quando `branches` está disponível
  - Melhora UX: usuário vê dados imediatamente sem precisar selecionar filiais manualmente
  - Referência: [page.tsx:270-277](../../../src/app/(dashboard)/metas/mensal/page.tsx#L270-L277)

### 📝 Documentação
- Criada documentação completa do módulo seguindo [DOCUMENTATION_STANDARDS.md](../../DOCUMENTATION_STANDARDS.md):
  - [README.md](./README.md) - Visão geral e guia rápido (280+ linhas)
  - [BUSINESS_RULES.md](./BUSINESS_RULES.md) - 40+ regras de negócio detalhadas (650+ linhas)
  - [DATA_STRUCTURES.md](./DATA_STRUCTURES.md) - Tipos TypeScript e interfaces de API (700+ linhas)
  - [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md) - Fluxos completos Frontend → API → RPC → DB (900+ linhas)
  - [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md) - Documentação das 4 funções RPC com exemplos SQL (500+ linhas)
  - [CHANGELOG.md](./CHANGELOG.md) - Este arquivo

### 🔧 Regras de Negócio Documentadas
- **RN-GER-004**: Auto-seleção de todas as filiais autorizadas ao carregar
- **RN-VIS-008**: Ao gerar metas, atualiza filtros automaticamente e busca relatório

---

## [1.4.0] - 2024-12-20

### ✨ Adicionado
- **Indicador D-1 (Dia Anterior)**: Card de progresso que considera apenas vendas até o dia anterior
  - Objetivo: Avaliar performance sem influência do dia atual (que pode estar incompleto)
  - Cálculo: Filtra metas onde `data <= ontem`, soma valores e calcula percentual
  - Cores: Verde (≥100%), Amarelo (≥80%), Vermelho (<80%)
  - Referência: [FIX_METAS_MENSAL_D1.md](../../FIX_METAS_MENSAL_D1.md)

### 📊 Interface
- Novo card "Progresso da Meta (D-1)" na seção de resumo
- Gráfico circular com percentual atingido até ontem
- Label explicativa: "Até o Dia Anterior"

### 🔧 Regras de Negócio
- **RN-CALC-006**: Cálculo do indicador D-1 com filtro temporal

---

## [1.3.0] - 2024-11-15

### ✨ Adicionado
- **Edição Inline**: Permite editar valores de meta diretamente na tabela
  - Duplo-clique em células de "Meta %" ou "Valor Meta"
  - Input aparece no lugar com validação
  - Salvamento ao pressionar Enter ou perder foco
  - Atualização otimista da UI (antes da resposta do servidor)
  - Recálculo automático de diferenças e percentuais

### 🆕 API Endpoint
- **POST /api/metas/update** - Atualização individual de meta
  - Parâmetros: `schema`, `metaId`, `valorMeta`, `metaPercentual`
  - Validações: valores não-negativos, percentual 0-1000
  - Retorna: `{ success: true, rows_affected: 1 }`

### 🆕 RPC Function
- **`update_meta_mensal(p_schema, p_meta_id, p_valor_meta, p_meta_percentual)`**
  - Atualiza registro único em `metas_mensais`
  - Recalcula `diferenca` e `diferenca_percentual`
  - Atualiza timestamp `updated_at`

### 📊 Interface
- Estados de edição: `editingCell` e `editingValue`
- Feedback visual: input com borda azul durante edição
- Loading state: `savingEdit` durante salvamento
- Referência: [FEATURE_INLINE_EDIT_METAS.md](../../FEATURE_INLINE_EDIT_METAS.md)

### 🔧 Regras de Negócio
- **RN-EDT-001 a RN-EDT-007**: Regras completas de edição inline

---

## [1.2.0] - 2024-10-28

### ✨ Adicionado
- **Agrupamento por Data**: Visualização hierárquica quando múltiplas filiais selecionadas
  - Agrupa metas pela mesma data
  - Linha de cabeçalho expansível com totalizadores diários
  - Linhas de filiais aninhadas (indentação visual)
  - Ícones de expansão/colapso (ChevronDown/ChevronRight)

### 📊 Interface
- Modo adaptativo:
  - **Filial única**: Lista simples dia a dia
  - **Múltiplas filiais**: Agrupamento expansível por data
- Estado de expansão persistente: `expandedDates`
- Totalizadores por grupo:
  - Total de Valor Referência
  - Total de Meta
  - Total Realizado
  - Total Diferença
  - Média de Meta Percentual
  - Diferença Percentual

### 🔧 Processamento
- Função `processarAgrupamentoPorData()` no frontend
- Reduce sobre array de metas para criar objeto `GroupedByDate`
- Ordenação automática por data (cronológica)

### 🔧 Regras de Negócio
- **RN-VIS-003 a RN-VIS-006**: Agrupamento, expansão, totalizadores e hierarquia visual

---

## [1.1.0] - 2024-09-10

### ✨ Adicionado
- **Filtro de Múltiplas Filiais**: Componente `MultiFilialFilter` para seleção avançada
  - Select com multi-seleção
  - Busca/filtro por nome ou código
  - Badges com filiais selecionadas
  - Contador "X filiais selecionadas"
  - ScrollArea virtual para performance

### 🆕 API Enhancement
- **GET /api/metas/report** agora aceita múltiplas filiais
  - Parâmetro `filial_id` pode ser string com vírgulas: `"1,2,3"`
  - API Route faz split e valida contra filiais autorizadas
  - RPC recebe `p_filial_ids` como array: `ARRAY[1,2,3]`

### 🆕 RPC Function Enhancement
- **`get_metas_mensais_report`** atualizado para suportar múltiplas filiais
  - Novo parâmetro: `p_filial_ids INTEGER[]`
  - Lógica de filtro: `WHERE filial_id = ANY(p_filial_ids)`
  - Mantém retrocompatibilidade com `p_filial_id` único

### 📊 Interface
- Componente `MultiFilialFilter` integrado
- Substituiu Select simples de filial
- Estado sincronizado: `filiaisSelecionadas: FilialOption[]`
- Referência: [MULTI_FILIAL_FILTER.md](../../MULTI_FILIAL_FILTER.md)

### 🔧 Regras de Negócio
- **RN-VIS-002**: Suporte a visualização de múltiplas filiais simultâneas

---

## [1.0.0] - 2024-08-01

### 🎉 Lançamento Inicial

### ✨ Features Principais
- **Geração de Metas**: Criação automática de metas para todos os dias do mês
  - Baseado em histórico de vendas do ano anterior
  - Percentual configurável (ex: 105% = meta 5% acima do ano anterior)
  - Data de referência customizável
  - Substitui metas existentes (DELETE antes de INSERT)

- **Visualização de Metas**: Relatório com metas e valores realizados
  - Filtros: Filial, Mês, Ano
  - Cards de resumo:
    - **Vendas do Período**: Total Realizado vs Total Meta
    - **Progresso da Meta**: Percentual atingido com gráfico circular
  - Tabela detalhada dia a dia
  - Atualização automática de valores realizados

- **Autorização por Filiais**: Respeita restrições de acesso
  - Integração com `user_authorized_branches`
  - Usuários sem restrições: acesso total
  - Usuários com restrições: apenas filiais autorizadas

### 🆕 API Endpoints
- **POST /api/metas/generate**
  - Gera metas para um mês inteiro
  - Validação de autorização de filial
  - Retorna quantidade de metas criadas

- **GET /api/metas/report**
  - Busca relatório de metas
  - Filtra por filial, mês e ano
  - Retorna `MetasReport` com totalizadores

- **POST /api/metas/update**
  - Atualiza valores realizados em lote
  - Sincroniza com `vendas_diarias_por_filial`
  - Fire-and-forget (executado em background)

### 🆕 RPC Functions
- **`generate_metas_mensais`**
  - Gera 28-31 metas (1 por dia do mês)
  - Busca valor de referência do ano anterior
  - Calcula valor da meta: `referência × (percentual / 100)`
  - Se data já passou, busca valor realizado; senão, fica zero

- **`get_metas_mensais_report`**
  - SELECT em `metas_mensais` com filtros
  - Calcula totalizadores (total_realizado, total_meta, percentual_atingido)
  - Retorna JSONB com array de metas + totais

- **`atualizar_valores_realizados_metas`**
  - UPDATE em lote com JOIN em `vendas_diarias_por_filial`
  - Atualiza `valor_realizado`, `diferenca`, `diferenca_percentual`
  - Retorna quantidade de registros atualizados

### 🗄️ Estrutura de Dados
- **Tabela `metas_mensais`**:
  - Campos: `id`, `filial_id`, `data`, `dia_semana`
  - Meta: `meta_percentual`, `data_referencia`, `valor_referencia`, `valor_meta`
  - Performance: `valor_realizado`, `diferenca`, `diferenca_percentual`
  - Timestamps: `created_at`, `updated_at`
  - Constraint UNIQUE: `(filial_id, data)`

### 📊 Interface
- **Página Principal**: `/metas/mensal`
  - Layout responsivo (mobile/desktop)
  - Breadcrumb de navegação
  - Dialog para geração de metas
  - Filtros de busca (Filial, Mês, Ano)
  - 2 cards de resumo
  - Tabela com 31 linhas (dias do mês)

- **Dialog de Geração**:
  - Select de Filial (filtrado por autorizações)
  - Select de Mês (Janeiro a Dezembro)
  - Select de Ano (2020 até ano atual + 1)
  - Input de Meta Percentual (padrão: 105)
  - Calendar Picker de Data Referência (padrão: 01/01 do ano anterior)
  - Validações em tempo real

- **Tabela de Metas**:
  - Colunas: Data, Dia Semana, Valor Ref., Meta %, Valor Meta, Realizado, Diferença
  - Formatação de moeda (pt-BR)
  - Cores de diferença: Verde (positivo), Vermelho (negativo)
  - Ordenação por data (ASC)

### 🎨 Estilo e UX
- shadcn/ui components
- Tailwind CSS v4
- Dark mode suportado
- Loading states (skeleton/spinner)
- Toast notifications
- Empty states amigáveis

### 🔐 Segurança
- Autenticação via Supabase Auth
- Validação de tenant em todas as rotas
- Verificação de filiais autorizadas
- Schema isolation (PostgreSQL)
- Force-dynamic (sem cache de dados sensíveis)

### 🧪 Validações
- Campos obrigatórios no formulário de geração
- Percentual entre 0 e 1000
- Datas válidas
- Filiais autorizadas
- Tratamento de erros em cada camada (Frontend, API, RPC)

### 📝 Auditoria
- Log de acesso ao módulo via `logModuleAccess`
  - Tenant ID, User ID, Timestamp
  - Armazenado em `public.module_access_logs`
- Timestamps de criação e atualização em cada meta

### 🔧 Regras de Negócio Iniciais
- **RN-GER-001**: Geração baseada em histórico
- **RN-GER-002**: Substituição de metas existentes
- **RN-GER-003**: Geração para mês completo
- **RN-CALC-001 a RN-CALC-004**: Cálculos de diferenças e percentuais
- **RN-VAL-001 a RN-VAL-005**: Validações de entrada
- **RN-VIS-001, RN-VIS-007**: Formatações e cores
- **RN-AUT-001 a RN-AUT-006**: Autorizações por role e filial

### 📚 Documentação Inicial
- README com overview do módulo
- Comentários inline no código
- JSDoc em funções principais

### 🚀 Deploy
- Migração SQL aplicada nos schemas: `okilao`, `saoluiz`, `paraiso`, `lucia`
- Schemas adicionados em "Exposed schemas" do Supabase
- Permissões configuradas: `GRANT USAGE ON SCHEMA TO authenticated`
- Testado em ambiente de produção

---

## [Unreleased]

### 🔮 Próximas Features Planejadas
- [ ] Exportação para Excel
- [ ] Gráfico de evolução diária (linha temporal)
- [ ] Comparação com múltiplos períodos (ex: comparar Jan/2024 vs Jan/2023)
- [ ] Alertas de metas em risco (notificações quando < 80%)
- [ ] Dashboard executivo de metas (visão consolidada)
- [ ] Metas por categoria de produto
- [ ] Importação em lote via CSV
- [ ] Histórico de alterações (audit trail completo)

### 🐛 Bugs Conhecidos
- Nenhum bug crítico reportado

---

## Convenções de Versionamento

Este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis

### Tipos de Mudanças

- **✨ Adicionado**: Novas features
- **🔧 Modificado**: Mudanças em funcionalidades existentes
- **❌ Removido**: Features removidas
- **🐛 Corrigido**: Correções de bugs
- **🔐 Segurança**: Vulnerabilidades corrigidas
- **📝 Documentação**: Apenas mudanças na documentação
- **⚡ Performance**: Melhorias de performance
- **🎨 Estilo**: Mudanças que não afetam o código (formatação, etc.)
- **♻️ Refatoração**: Mudanças de código sem alterar comportamento
- **🧪 Testes**: Adição ou correção de testes

---

## Compatibilidade

### Versões do Sistema

| Versão Metas Mensal | Next.js | React | Supabase | PostgreSQL |
|---------------------|---------|-------|----------|------------|
| 1.5.0               | 15.x    | 19.x  | 2.75+    | 15.x       |
| 1.4.0               | 15.x    | 19.x  | 2.75+    | 15.x       |
| 1.3.0               | 15.x    | 19.x  | 2.75+    | 15.x       |
| 1.2.0               | 14.x    | 18.x  | 2.50+    | 15.x       |
| 1.1.0               | 14.x    | 18.x  | 2.50+    | 15.x       |
| 1.0.0               | 14.x    | 18.x  | 2.50+    | 15.x       |

### Breaking Changes

**Nenhuma mudança incompatível entre versões até o momento.**

Todas as versões mantêm retrocompatibilidade:
- Estrutura de tabela `metas_mensais` inalterada
- Assinaturas de RPC functions mantidas (novos parâmetros são opcionais)
- API endpoints retrocompatíveis

---

## Migração entre Versões

### 1.4.0 → 1.5.0
- ✅ Sem mudanças no banco de dados
- ✅ Sem mudanças nas APIs
- ✅ Apenas mudanças no frontend (auto-seleção)
- **Ação necessária**: Nenhuma

### 1.3.0 → 1.4.0
- ✅ Sem mudanças no banco de dados
- ✅ Sem mudanças nas APIs
- ✅ Apenas mudanças no frontend (card D-1)
- **Ação necessária**: Nenhuma

### 1.2.0 → 1.3.0
- 🆕 Nova função RPC: `update_meta_mensal`
- 🆕 Novo endpoint: `POST /api/metas/update` (atualização individual)
- **Ação necessária**: Aplicar migration para criar RPC function

```sql
-- Migration: create_update_meta_mensal_function.sql
CREATE OR REPLACE FUNCTION {schema}.update_meta_mensal(
  p_schema TEXT,
  p_meta_id INTEGER,
  p_valor_meta NUMERIC,
  p_meta_percentual NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
AS $$ /* ... código da função ... */ $$;
```

### 1.1.0 → 1.2.0
- ✅ Sem mudanças no banco de dados
- ✅ Sem mudanças nas APIs
- ✅ Apenas mudanças no frontend (agrupamento)
- **Ação necessária**: Nenhuma

### 1.0.0 → 1.1.0
- 🔧 Função RPC `get_metas_mensais_report` atualizada
- 🆕 Novo parâmetro opcional: `p_filial_ids INTEGER[]`
- ✅ Retrocompatível: `p_filial_id` ainda funciona
- **Ação necessária**: Recriar função RPC com nova assinatura

```sql
-- Migration: update_get_metas_mensais_report.sql
DROP FUNCTION IF EXISTS {schema}.get_metas_mensais_report;
CREATE OR REPLACE FUNCTION {schema}.get_metas_mensais_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id INTEGER DEFAULT NULL,
  p_filial_ids INTEGER[] DEFAULT NULL  -- ← NOVO
) RETURNS JSONB
LANGUAGE plpgsql
AS $$ /* ... código da função ... */ $$;
```

---

## Contribuidores

### Versão 1.5.0
- **Documentação**: Criação completa da documentação técnica (6 arquivos, 3000+ linhas)

### Versão 1.4.0
- **Feature**: Implementação do indicador D-1
- **Documentação**: [FIX_METAS_MENSAL_D1.md](../../FIX_METAS_MENSAL_D1.md)

### Versão 1.3.0
- **Feature**: Implementação da edição inline
- **Documentação**: [FEATURE_INLINE_EDIT_METAS.md](../../FEATURE_INLINE_EDIT_METAS.md)

### Versão 1.2.0
- **Feature**: Agrupamento por data

### Versão 1.1.0
- **Feature**: Filtro de múltiplas filiais
- **Documentação**: [MULTI_FILIAL_FILTER.md](../../MULTI_FILIAL_FILTER.md)

### Versão 1.0.0
- **Desenvolvimento Inicial**: Implementação completa do módulo base

---

## Referências Externas

### Documentos Relacionados
- [MODULO_METAS_OVERVIEW.md](../../MODULO_METAS_OVERVIEW.md) - Overview geral do sistema de metas (830 linhas)
- [FIX_FILTRO_FILIAIS_METAS.md](../../FIX_FILTRO_FILIAIS_METAS.md) - Fix do filtro de filiais
- [FIX_ATUALIZAR_VALORES_METAS.md](../../FIX_ATUALIZAR_VALORES_METAS.md) - Fix da atualização de valores
- [DOCUMENTATION_STANDARDS.md](../../DOCUMENTATION_STANDARDS.md) - Padrões de documentação do projeto

### Issues e PRs (Exemplos)
- #45 - Implementação de edição inline
- #52 - Adição do indicador D-1
- #63 - Filtro de múltiplas filiais
- #71 - Auto-seleção de filiais

---

## Versão do Changelog

**Última Atualização**: 2025-01-11
**Responsável pela Documentação**: Equipe Técnica
**Formato**: v2.0 (baseado em Keep a Changelog)

---

## Notas Finais

Este changelog documenta todas as mudanças significativas no módulo de Metas Mensais. Para detalhes técnicos completos, consulte:

- [README.md](./README.md) - Visão geral
- [BUSINESS_RULES.md](./BUSINESS_RULES.md) - Regras de negócio
- [DATA_STRUCTURES.md](./DATA_STRUCTURES.md) - Estruturas de dados
- [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md) - Fluxos de integração
- [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md) - Funções SQL

Para reportar bugs ou sugerir features, consulte o gerenciador de issues do projeto.
