# Atualização: Detalhes de Filiais

## Resumo
Adicionada funcionalidade para cadastrar descrição e endereço completo das filiais.

## Alterações Implementadas

### 1. Database Migration
**Arquivo:** `supabase/migrations/031_add_branch_details.sql`

Novas colunas adicionadas à tabela `public.branches`:
- `descricao` VARCHAR(255) - Nome/descrição da filial
- `cep` VARCHAR(10) - CEP do endereço
- `rua` VARCHAR(255) - Rua/Logradouro
- `numero` VARCHAR(20) - Número do endereço
- `bairro` VARCHAR(100) - Bairro
- `cidade` VARCHAR(100) - Cidade
- `estado` VARCHAR(2) - UF/Estado

### 2. Tipos TypeScript
**Arquivo:** `src/types/index.ts`

- Criado tipo base `BranchBase` do database
- Estendido para interface `Branch` incluindo os novos campos opcionais
- Mantém compatibilidade com código existente

### 3. API Backend
**Arquivo:** `src/app/api/branches/route.ts`

- Método POST atualizado para receber e salvar novos campos
- Todos os campos de endereço são opcionais (nullable)
- Validação e permissões mantidas

### 4. Componente de Interface
**Arquivo:** `src/components/branches/branch-manager.tsx`

**No formulário de cadastro:**
- Campo "Descrição/Nome da Filial"
- Seção "Endereço" com campos:
  - CEP (máximo 9 caracteres com máscara)
  - Estado (2 caracteres, convertido para maiúsculas)
  - Rua/Logradouro
  - Número
  - Bairro (grid 2/3)
  - Cidade

**Na listagem:**
- Mostra descrição da filial (ou "Filial {código}" como fallback)
- Exibe endereço completo formatado quando disponível:
  - Linha 1: Rua, Número - Bairro
  - Linha 2: Cidade - UF | CEP
- Layout responsivo e visual aprimorado

## Como Usar

### 1. Executar Migration
```bash
# Conecte ao Supabase e execute:
psql -h [HOST] -U [USER] -d [DATABASE] -f supabase/migrations/031_add_branch_details.sql
```

Ou no Supabase Dashboard:
- Acesse SQL Editor
- Cole o conteúdo da migration
- Execute

### 2. Cadastrar Filial com Endereço
1. Acesse Configurações > Filiais
2. Clique em "Nova Filial"
3. Preencha:
   - **Código da Filial** (obrigatório)
   - Descrição/Nome (opcional)
   - Código da Loja (opcional)
   - **Endereço** (todos opcionais):
     - CEP
     - Estado
     - Rua/Logradouro
     - Número
     - Bairro
     - Cidade

### 3. Visualizar Filiais
- A listagem mostra automaticamente o endereço quando cadastrado
- Layout adaptativo para diferentes quantidades de informação

## Compatibilidade

✅ **Totalmente retrocompatível:**
- Filiais existentes continuam funcionando normalmente
- Novos campos são opcionais
- Código de filial continua sendo a referência principal
- Nenhuma funcionalidade existente foi impactada

## Benefícios

1. **Identificação Melhorada:** Nome descritivo facilita identificação de filiais
2. **Gestão de Endereços:** Endereço completo cadastrado no sistema
3. **Relatórios Futuros:** Dados prontos para uso em relatórios por localização
4. **UX Aprimorada:** Interface visual mais informativa

## Próximos Passos Sugeridos

- [ ] Validação de CEP com API externa (ViaCEP)
- [ ] Auto-preenchimento de endereço por CEP
- [ ] Filtros por cidade/estado em relatórios
- [ ] Mapa de localização de filiais
