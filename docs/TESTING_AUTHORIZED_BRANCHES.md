# Guia de Testes - Sistema de Filiais Autorizadas

## Pré-requisitos

1. Execute a migration:
   ```sql
   -- A migration está em: supabase/migrations/070_create_user_authorized_branches.sql
   ```

2. Certifique-se de ter:
   - Pelo menos 1 empresa (tenant) configurada
   - Pelo menos 3 filiais cadastradas para essa empresa
   - Usuários de teste com diferentes perfis

## Cenários de Teste

### Teste 1: Criar Usuário com Acesso Total (Default)

**Objetivo**: Verificar que usuários sem filiais configuradas têm acesso a todas as filiais.

**Passos**:
1. Login como admin ou superadmin
2. Navegar para `/usuarios/novo`
3. Preencher dados do usuário
4. **Não selecionar nenhuma filial** no campo "Filiais Autorizadas"
5. Salvar usuário

**Resultado Esperado**:
- Usuário criado com sucesso
- Ao fazer login com esse usuário:
  - Dropdown de filiais mostra TODAS as filiais da empresa
  - Relatórios mostram dados de todas as filiais quando "Todas as Filiais" é selecionado

---

### Teste 2: Criar Usuário com Acesso Restrito (1 Filial)

**Objetivo**: Verificar que usuário vê apenas dados da filial autorizada.

**Passos**:
1. Login como admin ou superadmin
2. Navegar para `/usuarios/novo`
3. Preencher dados do usuário
4. Selecionar **APENAS Filial 01** no campo "Filiais Autorizadas"
5. Verificar que aparece badge "Filial 01" com X para remover
6. Salvar usuário

**Resultado Esperado**:
- Usuário criado com sucesso
- Ao fazer login com esse usuário:
  - Dropdown de filiais mostra APENAS "Filial 01" (sem opção "Todas")
  - Todos os relatórios mostram apenas dados da Filial 01
  - Dashboard mostra apenas dados da Filial 01

---

### Teste 3: Criar Usuário com Acesso Múltiplo (3 Filiais)

**Objetivo**: Verificar que usuário vê apenas dados das 3 filiais autorizadas.

**Passos**:
1. Login como admin ou superadmin
2. Navegar para `/usuarios/novo`
3. Preencher dados do usuário
4. Selecionar **Filiais 01, 02 e 03**
5. Verificar que aparecem 3 badges com X para remover
6. Salvar usuário

**Resultado Esperado**:
- Usuário criado com sucesso
- Ao fazer login com esse usuário:
  - Dropdown de filiais mostra "Todas as Filiais", "Filial 01", "Filial 02", "Filial 03"
  - Opção "Todas as Filiais" mostra dados agregados das 3 filiais apenas
  - Não consegue ver dados de outras filiais

---

### Teste 4: Editar Usuário - Adicionar Restrição

**Objetivo**: Verificar que é possível transformar usuário com acesso total em acesso restrito.

**Passos**:
1. Login como admin ou superadmin
2. Criar usuário SEM filiais autorizadas (acesso total)
3. Fazer login com esse usuário e verificar acesso total
4. Fazer logout
5. Login como admin novamente
6. Editar o usuário
7. Adicionar apenas Filial 02 nas autorizações
8. Salvar

**Resultado Esperado**:
- Usuário atualizado com sucesso
- Ao fazer login novamente com esse usuário:
  - Agora só vê Filial 02
  - Não vê mais outras filiais

---

### Teste 5: Editar Usuário - Remover Restrição

**Objetivo**: Verificar que é possível remover restrições.

**Passos**:
1. Login como admin ou superadmin
2. Criar usuário COM filial específica (ex: Filial 01)
3. Editar o usuário
4. Clicar no X de todas as filiais autorizadas (deixar vazio)
5. Salvar

**Resultado Esperado**:
- Usuário atualizado com sucesso
- Ao fazer login com esse usuário:
  - Agora vê TODAS as filiais novamente

---

### Teste 6: Tentativa de Acesso Não Autorizado

**Objetivo**: Verificar que usuário não consegue ver dados de filiais não autorizadas.

**Passos**:
1. Criar usuário com acesso apenas à Filial 01
2. Fazer login com esse usuário
3. Tentar acessar Dashboard
4. Verificar dados exibidos
5. Tentar acessar Relatórios
6. Verificar dados exibidos

**Resultado Esperado**:
- Usuário nunca vê dados de Filial 02, 03, etc.
- Dropdowns não mostram opções de filiais não autorizadas
- Mesmo tentando manipular URL, dados são filtrados no backend

---

### Teste 7: Módulos Específicos

#### 7.1. Dashboard
1. Login com usuário restrito à Filial 02
2. Acessar `/dashboard`
3. Verificar:
   - Cards de métricas mostram apenas dados da Filial 02
   - Gráficos mostram apenas dados da Filial 02
   - Dropdown de filiais mostra apenas Filial 02

#### 7.2. Relatório de Ruptura ABCD
1. Login com usuário com acesso às Filiais 01 e 03
2. Acessar `/relatorios/ruptura-abcd`
3. Verificar:
   - Dropdown mostra "Todas", "Filial 01", "Filial 03"
   - Selecionar "Todas" mostra dados agregados de 01 e 03
   - Selecionar "Filial 01" mostra apenas dados de 01
   - Não aparece opção para Filial 02

#### 7.3. Metas Mensais
1. Login com usuário restrito à Filial 01
2. Acessar `/metas/mensal`
3. Verificar:
   - Lista mostra apenas metas da Filial 01
   - Não é possível criar metas para outras filiais

---

## Teste de Segurança

### Teste 8: Bypass de Autorização (Negativo)

**Objetivo**: Garantir que não é possível burlar o sistema de autorização.

**Passos**:
1. Login com usuário restrito à Filial 01
2. Abrir DevTools do navegador
3. Tentar manipular requisições para:
   - Solicitar dados de outra filial via API direta
   - Modificar parâmetros de URL
   - Modificar cookies/localStorage

**Resultado Esperado**:
- Todas as tentativas falham
- Backend sempre retorna apenas dados das filiais autorizadas
- Mesmo alterando frontend, backend protege os dados

---

## Teste de Performance

### Teste 9: Performance com Múltiplas Filiais

**Objetivo**: Verificar que sistema continua performático.

**Passos**:
1. Criar usuário com acesso a 10+ filiais
2. Fazer login
3. Acessar Dashboard
4. Medir tempo de carregamento
5. Acessar Relatórios
6. Medir tempo de carregamento

**Resultado Esperado**:
- Tempo de carregamento similar a usuário sem restrições
- Sem degradação perceptível de performance

---

## Checklist de Teste Completo

- [ ] Teste 1: Usuário com acesso total (default)
- [ ] Teste 2: Usuário com 1 filial autorizada
- [ ] Teste 3: Usuário com múltiplas filiais autorizadas
- [ ] Teste 4: Editar usuário - adicionar restrição
- [ ] Teste 5: Editar usuário - remover restrição
- [ ] Teste 6: Tentativa de acesso não autorizado
- [ ] Teste 7.1: Dashboard com filiais autorizadas
- [ ] Teste 7.2: Relatórios com filiais autorizadas
- [ ] Teste 7.3: Metas com filiais autorizadas
- [ ] Teste 8: Segurança - bypass de autorização
- [ ] Teste 9: Performance com múltiplas filiais

---

## Relatório de Bugs

Se encontrar problemas durante os testes, documente:

1. **Cenário**: Qual teste estava executando
2. **Passos**: O que fez exatamente
3. **Esperado**: O que deveria acontecer
4. **Ocorrido**: O que aconteceu de fato
5. **Screenshots**: Se aplicável
6. **Console/Network**: Erros no console ou requisições HTTP

---

## Notas Importantes

- **Superadmins** sempre têm acesso a todas as empresas/filiais
- **Admins** podem configurar restrições para usuários da sua empresa
- **Users/Viewers** são afetados pelas restrições configuradas
- Deixar campo vazio = acesso total (comportamento padrão)
- Sistema é "fail open" - em caso de erro ao buscar autorizações, permite acesso
