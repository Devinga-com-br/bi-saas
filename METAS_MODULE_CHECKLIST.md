# ✅ Checklist de Implantação - Módulo de Metas

## 📋 Pré-Implantação

### Verificações Iniciais
- [x] Código criado e commitado
- [x] Build passou sem erros
- [x] TypeScript sem erros de tipo
- [x] ESLint aprovado
- [x] Documentação criada

### Arquivos Necessários
- [x] `supabase/migrations/024_create_metas_table.sql`
- [x] `src/app/api/metas/generate/route.ts`
- [x] `src/app/api/metas/report/route.ts`
- [x] `src/app/(dashboard)/metas/mensal/page.tsx`
- [x] `src/components/dashboard/app-sidebar.tsx` (atualizado)

---

## 🚀 Implantação (Passo a Passo)

### Passo 1: Aplicar Migration no Banco
- [ ] Acessar Supabase Dashboard
- [ ] Ir em SQL Editor
- [ ] Abrir arquivo `supabase/migrations/024_create_metas_table.sql`
- [ ] Copiar todo o conteúdo
- [ ] Colar no SQL Editor
- [ ] Executar (Ctrl+Enter ou botão Run)
- [ ] Verificar se não há erros

### Passo 2: Verificar Criação das Funções
Execute no SQL Editor:
```sql
-- Verificar funções criadas
SELECT proname FROM pg_proc 
WHERE proname IN (
  'create_metas_table_for_tenant',
  'generate_metas_mensais',
  'get_metas_mensais_report'
);
```
- [ ] Resultado mostra as 3 funções

### Passo 3: Verificar Criação da Tabela
Execute no SQL Editor (substitua 'okilao' pelo seu schema):
```sql
-- Verificar tabela criada
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'metas_mensais';
```
- [ ] Resultado mostra tabela(s) criada(s)

### Passo 4: Deploy do Frontend
- [ ] Fazer commit das alterações
- [ ] Push para repositório
- [ ] Deploy automático ou manual
- [ ] Aguardar build completar

### Passo 5: Verificar em Produção
- [ ] Acessar aplicação em produção
- [ ] Login com usuário
- [ ] Verificar menu "Metas" aparece
- [ ] Clicar em "Meta Mensal"
- [ ] Página carrega sem erros

---

## ✅ Testes Funcionais

### Teste 1: Cadastrar Meta
- [ ] Clicar em "+ Cadastrar Meta"
- [ ] Selecionar mês e ano
- [ ] Selecionar filial
- [ ] Informar meta % (ex: 10)
- [ ] Informar data referência
- [ ] Clicar "Gerar Metas"
- [ ] Mensagem de sucesso aparece
- [ ] Dialog fecha

### Teste 2: Visualizar Metas
- [ ] Cards de resumo aparecem
- [ ] Gráfico de progresso renderiza
- [ ] Tabela mostra dados
- [ ] Todas as colunas estão preenchidas
- [ ] Badges coloridos aparecem
- [ ] Formatação de valores está correta (R$)
- [ ] Datas em formato brasileiro

### Teste 3: Filtros
- [ ] Alterar mês - dados atualizam
- [ ] Alterar ano - dados atualizam
- [ ] Alterar filial - dados atualizam
- [ ] Clicar "Aplicar" - recarrega dados

### Teste 4: Responsividade
- [ ] Testar em desktop
- [ ] Testar em tablet
- [ ] Testar em mobile
- [ ] Layout não quebra

### Teste 5: Performance
- [ ] Página carrega em < 3 segundos
- [ ] Sem erros no console
- [ ] Sem warnings no console

---

## 🔍 Testes de Integração

### Verificar Dependências
- [ ] `vendas_diarias_por_filial` tem dados
- [ ] `branches` tem filiais cadastradas
- [ ] Contexto de tenant funcionando
- [ ] Autenticação funcionando

### Verificar Cálculos
- [ ] Valor meta = valor_ref × (1 + meta%)
- [ ] Diferença = realizado - meta
- [ ] Diferença % calculada corretamente
- [ ] Situação classificada corretamente

---

## 🎯 Testes de Casos Especiais

### Caso 1: Sem Dados Ano Anterior
- [ ] Criar meta para mês sem vendas no ano anterior
- [ ] Verificar comportamento
- [ ] Valores devem ser zero mas sem erro

### Caso 2: Mês Futuro
- [ ] Criar meta para mês futuro
- [ ] Todos os dias devem ter situação "Pendente"
- [ ] valor_realizado deve ser zero

### Caso 3: Mês Parcial (Atual)
- [ ] Criar meta para mês atual
- [ ] Dias passados devem ter situação calculada
- [ ] Dias futuros devem estar "Pendente"

### Caso 4: Atualizar Meta Existente
- [ ] Gerar meta com 10%
- [ ] Gerar novamente com 15%
- [ ] Valores devem ser atualizados
- [ ] Não deve duplicar

### Caso 5: Todas as Filiais
- [ ] Criar metas para Filial 1
- [ ] Criar metas para Filial 2
- [ ] Filtrar por "Todas"
- [ ] Deve mostrar consolidado

---

## 🔐 Testes de Segurança

### Autenticação
- [ ] Usuário não autenticado é redirecionado
- [ ] API retorna 401 sem autenticação

### Autorização
- [ ] Usuário só vê dados do seu tenant
- [ ] Não consegue acessar dados de outro tenant

### Validação
- [ ] Não aceita mês inválido (< 1 ou > 12)
- [ ] Não aceita ano inválido
- [ ] Não aceita campos vazios
- [ ] Mensagens de erro apropriadas

---

## 📊 Testes de Dados

### Dados Reais
- [ ] Testar com dados de produção
- [ ] Verificar valores fazem sentido
- [ ] Comparar com planilhas existentes
- [ ] Validar com área de negócio

### Volumes
- [ ] Testar com 1 filial
- [ ] Testar com múltiplas filiais
- [ ] Testar com 1 mês
- [ ] Testar com vários meses

---

## 📝 Documentação

### Para Usuários
- [ ] Manual de uso criado ou
- [ ] Treinamento agendado ou
- [ ] Vídeo tutorial gravado

### Para Desenvolvedores
- [x] README técnico criado
- [x] Comentários no código
- [x] Tipos TypeScript documentados

---

## 🐛 Monitoramento Pós-Deploy

### Primeiras 24h
- [ ] Verificar logs de erro
- [ ] Verificar uso da feature
- [ ] Coletar feedback dos usuários
- [ ] Corrigir bugs críticos

### Primeira Semana
- [ ] Analisar performance
- [ ] Verificar precisão dos cálculos
- [ ] Ajustar conforme feedback
- [ ] Documentar melhorias necessárias

---

## ✨ Melhorias Futuras

### Prioridade Alta
- [ ] Atualização automática diária
- [ ] Exportação para Excel
- [ ] Notificações quando meta é atingida

### Prioridade Média
- [ ] Gráficos de evolução
- [ ] Comparativo entre filiais
- [ ] Meta por categoria

### Prioridade Baixa
- [ ] Dashboard executivo
- [ ] Meta semanal
- [ ] Histórico de alterações

---

## 📞 Contatos de Suporte

**Desenvolvedor**: [Seu nome]
**Email**: [Seu email]
**Slack/Teams**: [Canal]

**Documentação**:
- README Completo: `METAS_MODULE_README.md`
- Resumo Executivo: `METAS_MODULE_SUMMARY.md`
- Este Checklist: `METAS_MODULE_CHECKLIST.md`

---

## 🎉 Sign-Off

### Desenvolvimento
- [x] Código completo
- [x] Testes locais passaram
- [x] Build aprovado
- [x] Documentação criada

**Desenvolvedor**: _________________ Data: ___/___/___

### Implantação
- [ ] Migration aplicada
- [ ] Deploy realizado
- [ ] Testes em produção ok
- [ ] Usuários notificados

**DevOps/Admin**: _________________ Data: ___/___/___

### Homologação
- [ ] Testes funcionais ok
- [ ] Validação de negócio ok
- [ ] Aprovado para uso

**Product Owner**: _________________ Data: ___/___/___

---

**Status Atual**: 🟡 Aguardando aplicação da migration  
**Próximo Passo**: Aplicar migration no Supabase Dashboard  
**ETA para Produção**: Imediato após migration

