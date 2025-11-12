# DRE Gerencial - Resumo Executivo

## 📊 Visão Geral

O **DRE Gerencial** é um módulo completo de análise financeira que permite visualizar despesas organizadas em hierarquia de 3 níveis (Departamento → Tipo → Despesa) com comparações temporais automáticas e consolidação multi-filial.

---

## 🎯 Funcionalidades Principais

### 1. Análise Hierárquica de Despesas
- ✅ Hierarquia de 3 níveis: Departamento → Tipo de Despesa → Despesa Individual
- ✅ Valores detalhados por filial com comparação vs média
- ✅ Percentuais de participação no total
- ✅ Ordenação automática por valor (maior para menor)

### 2. Consolidação Multi-Filial
- ✅ Seleção de múltiplas filiais simultaneamente
- ✅ Consolidação automática de dados
- ✅ Visualização lado a lado por filial
- ✅ Indicadores de diferença vs média (verde/vermelho)

### 3. Comparações Temporais
- ✅ **PAM** (Período Anterior Mesmo): compara com mês anterior
- ✅ **PAA** (Período Anterior Acumulado): compara com mesmo mês do ano anterior
- ✅ Variações percentuais automáticas
- ✅ Indicadores visuais de tendência (↑↓)

### 4. Indicadores Financeiros
- ✅ Receita Bruta
- ✅ CMV (Custo das Mercadorias Vendidas)
- ✅ Lucro Bruto
- ✅ Total de Despesas
- ✅ Lucro Líquido
- ✅ Margens Bruta e Líquida (%)

### 5. Controles de Acesso
- ✅ Restrições por filial (usuário vê apenas filiais autorizadas)
- ✅ Validação de schema (multi-tenant)
- ✅ Log de auditoria de acessos

---

## 📋 Componentes do Módulo

### Frontend
- **Página Principal**: `/dre-gerencial`
- **Componentes**:
  - DespesasFilters (filtros de filiais, mês, ano)
  - IndicatorsCards (5 cards de indicadores)
  - DataTable (tabela hierárquica expansível)
  - EmptyState, LoadingState (estados de UI)

### Backend
- **API Routes**:
  - `/api/dre-gerencial/hierarquia` - Despesas hierárquicas
  - `/api/dashboard` - Indicadores financeiros
- **Funções RPC**:
  - `get_despesas_hierarquia` - Query de despesas
  - `get_dashboard_data` - Query de vendas/lucros

---

## 🔧 Arquitetura Técnica

### Stack
- **Frontend**: Next.js 15, React 19, TypeScript 5
- **Backend**: Supabase (PostgreSQL + Auth)
- **UI**: Tailwind CSS v4, shadcn/ui
- **Tabelas**: TanStack Table v8

### Multi-Tenancy
- Isolamento por schema PostgreSQL
- Cada tenant tem seu próprio schema (ex: `okilao`, `saoluiz`)
- Queries executadas dinamicamente no schema correto

### Performance
- ✅ Requisições paralelas (múltiplas filiais ao mesmo tempo)
- ✅ Consolidação no frontend (Maps otimizados)
- ✅ Carregamento sob demanda
- ✅ Debounce de filtros

---

## 📊 Fluxo de Dados

```
1. Usuário seleciona filtros (filiais, mês, ano)
   ↓
2. Sistema busca dados em paralelo:
   ├─ Despesas do período atual (1 req/filial)
   ├─ Despesas do PAM (1 req/filial)
   ├─ Despesas do PAA (1 req/filial)
   ├─ Indicadores do período atual
   ├─ Indicadores do PAM
   └─ Indicadores do PAA
   ↓
3. Consolidação de dados multi-filial
   ↓
4. Cálculo de indicadores derivados
   ↓
5. Renderização de cards + tabela hierárquica
```

---

## 📁 Documentação Completa

A documentação técnica detalhada está organizada em 6 documentos:

1. **[README.md](./README.md)** - Visão geral e arquitetura
2. **[FUNCTIONS_INDEX.md](./FUNCTIONS_INDEX.md)** - Índice de todas as funções (56 itens catalogados)
3. **[BUSINESS_RULES.md](./BUSINESS_RULES.md)** - Regras de negócio (40+ regras documentadas)
4. **[DATA_STRUCTURES.md](./DATA_STRUCTURES.md)** - Interfaces e estruturas (13 interfaces TypeScript)
5. **[INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md)** - Fluxo de integração com diagramas
6. **[RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)** - Documentação das funções PostgreSQL

---

## 📈 Estatísticas do Módulo

### Código
- **Linhas de código**: ~1827 linhas
- **Arquivos principais**: 6 (1 página + 2 APIs + 3 componentes)
- **Funções principais**: 17
- **Interfaces TypeScript**: 13
- **Estados React**: 13

### Funcionalidades
- **Níveis de hierarquia**: 3 (Dept → Tipo → Despesa)
- **Indicadores financeiros**: 7
- **Comparações temporais**: 2 (PAM + PAA)
- **Filtros disponíveis**: 3 (Filiais, Mês, Ano)

---

## 🎨 Interface do Usuário

### Layout Responsivo
- **Mobile**: Layout vertical, 1 coluna
- **Tablet**: 2 colunas para indicadores
- **Desktop**: 3 colunas para indicadores
- **Wide**: 5 colunas (todos os indicadores visíveis)

### Elementos Visuais
- **Cores alternadas**: Colunas de filiais com cores alternadas (azul/cinza)
- **Hierarquia visual**: Indentação progressiva (12px → 40px → 64px)
- **Indicadores de tendência**: Verde (↑) = bom, Vermelho (↓) = ruim
- **Botões de expansão**: ▶ (collapsed) / ▼ (expanded)

---

## 🔐 Segurança

### Autenticação
- ✅ Middleware verifica autenticação em todas as rotas
- ✅ Redirect para `/login` se não autenticado

### Autorização
- ✅ Validação de acesso ao schema do tenant
- ✅ Validação de acesso às filiais específicas
- ✅ Restrições por usuário (tabela `user_authorized_branches`)

### Validação
- ✅ Parâmetros de API validados com Zod
- ✅ Proteção contra SQL injection (uso de `%I` no PostgreSQL)
- ✅ SECURITY DEFINER nas funções RPC

---

## 🚀 Como Usar a Documentação

### Para Desenvolvedores
1. **Antes de modificar**: Leia [BUSINESS_RULES.md](./BUSINESS_RULES.md)
2. **Ao implementar**: Siga [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md)
3. **Para estruturas**: Consulte [DATA_STRUCTURES.md](./DATA_STRUCTURES.md)
4. **Para banco de dados**: Veja [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)

### Para Novos Membros
1. Comece com este **SUMMARY.md**
2. Leia [README.md](./README.md) para visão geral
3. Consulte [FUNCTIONS_INDEX.md](./FUNCTIONS_INDEX.md) para entender componentes
4. Estude documentos específicos conforme necessidade

### Para Product Owners
- **Funcionalidades**: [README.md](./README.md) - seção "Características Principais"
- **Regras de negócio**: [BUSINESS_RULES.md](./BUSINESS_RULES.md)
- **Fluxo de usuário**: [INTEGRATION_FLOW.md](./INTEGRATION_FLOW.md) - diagramas

---

## 📞 Suporte e Manutenção

### Contato
- **Repositório**: GitHub (abrir issue)
- **Equipe**: Desenvolvimento BI SaaS
- **Última atualização**: 2025-01-11
- **Versão**: 1.0.0

### Revisão
- **Periodicidade**: Trimestral
- **Responsável**: Equipe de Desenvolvimento
- **Próxima revisão**: Abril/2025

---

## 🎯 Próximos Passos

Para continuar trabalhando com o módulo DRE Gerencial:

1. **Ler documentação completa**: Comece pelo [README.md](./README.md)
2. **Explorar código-fonte**: Use [FUNCTIONS_INDEX.md](./FUNCTIONS_INDEX.md) como guia
3. **Entender regras**: Revise [BUSINESS_RULES.md](./BUSINESS_RULES.md)
4. **Testar funcionalidades**: Acesse `/dre-gerencial` no sistema

---

## ✅ Checklist de Compreensão

Após estudar a documentação, você deve ser capaz de responder:

- [ ] Como funciona a hierarquia de despesas? (3 níveis)
- [ ] O que é PAM e PAA?
- [ ] Como funciona a consolidação multi-filial?
- [ ] Quais são os 7 indicadores financeiros?
- [ ] Como são calculados os indicadores derivados (CMV, Lucro Líquido, Margem Líquida)?
- [ ] Como funciona a autorização de acesso às filiais?
- [ ] Quais funções RPC são utilizadas?
- [ ] Como os dados são transformados de flat (RPC) para hierárquico?

Se você consegue responder todas essas perguntas, está pronto para trabalhar no módulo! 🎉

---

**Documentação criada em**: 2025-01-11
**Versão**: 1.0.0
**Status**: ✅ Completo
