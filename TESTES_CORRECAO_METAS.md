# Plano de Testes: Correção de Metas com Múltiplas Filiais

## 🎯 Objetivo

Validar que o recálculo automático de totais funciona corretamente ao filtrar filiais nas páginas de Metas Mensal e Metas por Setor.

## 📋 Cenários de Teste

### Teste 1: Baseline - Todas as Filiais
**Objetivo**: Verificar cálculos com todas as filiais selecionadas

**Passos**:
1. Acessar `/metas/mensal`
2. Garantir que todas as filiais estão selecionadas
3. Selecionar mês/ano com dados

**Resultado Esperado**:
- ✅ Totais exibidos corretamente
- ✅ Soma de todas as filiais
- ✅ Percentual calculado corretamente
- ✅ Tabela mostra todas as metas

**Valores de Referência** (exemplo):
```
Total Vendas: R$ 150.000,00
Total Meta:   R$ 165.000,00
Percentual:   90.91%
```

---

### Teste 2: Remover 1 Filial
**Objetivo**: Verificar recálculo ao remover uma filial

**Passos**:
1. Com todas selecionadas (Teste 1)
2. Anotar totais atuais
3. **Desmarcar 1 filial** (ex: Filial B)
4. Observar mudança nos totais

**Resultado Esperado**:
- ✅ Totais recalculam **automaticamente**
- ✅ Valores diminuem (menos uma filial)
- ✅ Percentual pode aumentar ou diminuir
- ✅ Tabela remove metas da filial desmarcada
- ✅ Linhas agregadas (quando múltiplas filiais) recalculam

**Validação**:
```
ANTES: 4 filiais → R$ 150.000
DEPOIS: 3 filiais → R$ ~112.500 (esperado ~75% do total)
```

---

### Teste 3: Remover Múltiplas Filiais
**Objetivo**: Verificar recálculo ao remover várias filiais

**Passos**:
1. Com todas selecionadas
2. **Desmarcar 2 ou 3 filiais**
3. Observar recálculo

**Resultado Esperado**:
- ✅ Recálculo automático a cada mudança
- ✅ Totais refletem apenas filiais selecionadas
- ✅ Tabela mostra apenas dados das filiais restantes

---

### Teste 4: Selecionar Apenas 1 Filial
**Objetivo**: Verificar visualização de filial única

**Passos**:
1. Desmarcar todas as filiais
2. **Marcar apenas 1 filial** (ex: Filial A)
3. Verificar totais e tabela

**Resultado Esperado**:
- ✅ Totais mostram apenas dados da Filial A
- ✅ Tabela em modo "filial única" (sem agregação)
- ✅ Campos editáveis funcionam (duplo clique)
- ✅ Não mostra chevron de expansão

---

### Teste 5: Alternar Entre Filiais
**Objetivo**: Verificar recálculo ao trocar filiais selecionadas

**Passos**:
1. Selecionar Filial A e B
2. Anotar totais
3. Desmarcar A e B, marcar C e D
4. Comparar totais

**Resultado Esperado**:
- ✅ Totais mudam completamente
- ✅ Tabela mostra novas filiais
- ✅ Sem dados das filiais antigas

---

### Teste 6: Mudar Mês/Ano com Filtros
**Objetivo**: Verificar persistência de filtros ao mudar período

**Passos**:
1. Selecionar Filiais A e B
2. Anotar totais de outubro/2024
3. Mudar para novembro/2024
4. Verificar se mantém Filiais A e B selecionadas

**Resultado Esperado**:
- ✅ Filtros de filiais persistem
- ✅ Dados do novo período carregam
- ✅ Totais recalculam para novo período
- ✅ Apenas Filiais A e B aparecem

---

### Teste 7: Meta por Setor
**Objetivo**: Validar que Meta por Setor continua funcionando

**Passos**:
1. Acessar `/metas/setor`
2. Selecionar um setor
3. Filtrar por filiais (remover algumas)
4. Verificar totais

**Resultado Esperado**:
- ✅ Mesma funcionalidade de Meta Mensal
- ✅ Recálculo automático
- ✅ Agregação por data funciona
- ✅ Expandir/colapsar funciona

---

### Teste 8: Permissões de Usuário
**Objetivo**: Verificar respeito às permissões de filiais

**Passos**:
1. Fazer login com usuário **restrito a 1 ou 2 filiais**
2. Verificar filtro de filiais
3. Tentar selecionar filiais não autorizadas

**Resultado Esperado**:
- ✅ Dropdown mostra apenas filiais autorizadas
- ✅ API retorna apenas dados autorizados
- ✅ Não é possível "burlar" via URL ou console

---

### Teste 9: Edição de Metas
**Objetivo**: Verificar que edição inline continua funcionando

**Passos**:
1. Selecionar 2 ou 3 filiais
2. Expandir uma data
3. **Duplo clique** no campo "Meta %"
4. Alterar valor e salvar (Enter)
5. Verificar recálculo

**Resultado Esperado**:
- ✅ Campo entra em modo edição
- ✅ Salva ao pressionar Enter
- ✅ Totais recalculam localmente
- ✅ Backend atualiza corretamente

---

### Teste 10: Performance
**Objetivo**: Verificar performance com múltiplas filiais

**Passos**:
1. Selecionar 5+ filiais (se disponível)
2. Medir tempo de carregamento (F12 → Network)
3. Remover filiais e medir novamente

**Resultado Esperado**:
- ✅ Carregamento < 2 segundos
- ✅ Recálculo instantâneo (<500ms)
- ✅ Sem travamento da interface
- ✅ Console sem erros

---

### Teste 11: Navegador e Responsivo
**Objetivo**: Verificar compatibilidade

**Browsers**:
- [ ] Chrome/Edge (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Chrome (Mobile)
- [ ] Safari (Mobile)

**Resoluções**:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Resultado Esperado**:
- ✅ Funciona em todos os browsers
- ✅ Layout responsivo correto
- ✅ Filtros acessíveis em mobile

---

## 📊 Critérios de Aceitação

### ✅ Aprovado se:
- Todos os 11 testes passarem
- Recálculo é automático e imediato
- Não há erros no console
- Performance aceitável (<2s)
- Funciona em todos os browsers principais

### ❌ Reprovado se:
- Totais não recalculam ao filtrar
- Dados inconsistentes entre UI e banco
- Erros no console
- Performance ruim (>5s)
- Não funciona em browser principal

---

## 🐛 Registro de Bugs

### Bug Report Template
```markdown
**ID**: BUG-001
**Teste**: Teste 2 - Remover 1 Filial
**Descrição**: Totais não recalculam ao desmarcar filial
**Passos para Reproduzir**:
1. ...
2. ...
**Resultado Esperado**: ...
**Resultado Obtido**: ...
**Severidade**: Crítica / Alta / Média / Baixa
**Browser**: Chrome 119
**Screenshot**: [anexar]
```

---

## 📝 Checklist Final

Antes de aprovar a correção:

- [ ] Todos os testes executados
- [ ] Todos os testes passaram
- [ ] Sem bugs críticos
- [ ] Documentação atualizada
- [ ] Changelog atualizado
- [ ] Deploy em produção validado
- [ ] Usuários notificados (se aplicável)

---

## 📞 Contato

**Responsável**: Time de Desenvolvimento  
**Data dos Testes**: ___/___/2025  
**Resultado Geral**: ⬜ Aprovado ⬜ Reprovado  
**Observações**: _______________________

---

**Última Atualização**: 2025-11-06  
**Versão**: 1.0.0
