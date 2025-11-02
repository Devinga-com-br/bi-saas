# Módulo Descontos Venda - Documentação Completa

## Resumo
Módulo CRUD completo para gerenciamento de descontos de venda por filial e data.

## Arquivos Criados

### 1. Frontend
- **Página:** `/src/app/(dashboard)/descontos-venda/page.tsx`
- **Funcionalidades:**
  - Listagem de descontos ordenados por data (mais recente primeiro)
  - Criação de novos descontos via modal
  - Edição de descontos existentes
  - Exclusão com confirmação
  - Validação de campos obrigatórios
  - Constraint única: apenas 1 desconto por filial por data

### 2. API Routes
- **Rota:** `/src/app/api/descontos-venda/route.ts`
- **Métodos:**
  - `GET` - Lista descontos (com schema via query param)
  - `POST` - Cria desconto
  - `PUT` - Atualiza desconto
  - `DELETE` - Remove desconto (via query params)

### 3. Funções RPC (Supabase)
- **Arquivo:** `CREATE_DESCONTOS_VENDA_RPC_FUNCTIONS.sql`
- **Funções:**
  - `get_descontos_venda(p_schema)` - Lista descontos
  - `insert_desconto_venda(...)` - Insere desconto
  - `update_desconto_venda(...)` - Atualiza desconto
  - `delete_desconto_venda(p_schema, p_id)` - Remove desconto

## Estrutura da Tabela

```sql
CREATE TABLE <schema>.descontos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id INTEGER NOT NULL,
  data_desconto DATE NOT NULL,
  valor_desconto NUMERIC(10,2) NOT NULL CHECK (valor_desconto >= 0),
  observacao TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NULL,
  UNIQUE(filial_id, data_desconto)
);
```

## Correções Aplicadas

### 1. Loop Infinito na Listagem
**Problema:** `useEffect` com `fetchDescontos` nas dependências causava loop.
**Solução:** Removido `fetchDescontos` das dependências do useEffect com comentário explicativo.

### 2. Cores dos Textos e Ícones
**Problema:** Valor em vermelho e ícone de lixeira em vermelho.
**Solução:** 
- Removido `text-red-600` do valor
- Removido `text-red-600` do ícone Trash2
- Ambos usam agora cores padrão do tema

### 3. Erro ao Atualizar
**Problema:** PUT tentava acessar `/api/descontos-venda/{id}` que não existe.
**Solução:** Rota unificada - método PUT envia ID no body, não na URL.

## Fluxo de Dados

### Criar Desconto
1. Usuário clica "Lançar Desconto"
2. Modal abre com campos: Data, Filial, Valor, Observação
3. Frontend valida campos obrigatórios
4. POST para `/api/descontos-venda` com schema no body
5. API chama `insert_desconto_venda` RPC
6. Retorna desconto criado
7. Lista atualizada automaticamente

### Editar Desconto
1. Usuário clica no ícone de lápis
2. Modal abre pré-preenchido
3. Usuário altera campos desejados
4. PUT para `/api/descontos-venda` com ID e schema no body
5. API chama `update_desconto_venda` RPC
6. Retorna desconto atualizado
7. Lista atualizada automaticamente

### Excluir Desconto
1. Usuário clica no ícone de lixeira
2. Dialog de confirmação exibido
3. Confirma exclusão
4. DELETE para `/api/descontos-venda?id={id}&schema={schema}`
5. API chama `delete_desconto_venda` RPC
6. Retorna boolean (true = sucesso)
7. Lista atualizada automaticamente

## Segurança

- ✅ Autenticação obrigatória (middleware + API check)
- ✅ Schema validado por usuário autenticado
- ✅ RPC functions com SECURITY DEFINER
- ✅ Validação de dados no backend
- ✅ Constraint única no banco (filial + data)
- ✅ Validação de valor >= 0
- ✅ Audit log de acesso ao módulo

## Menu

Adicionado em `/src/components/dashboard/sidebar-nav.tsx`:
```tsx
{
  title: 'Descontos Venda',
  href: '/descontos-venda',
  icon: TrendingDown,
}
```

## Instalação

### Passo 1: Executar SQL no Supabase
Execute o arquivo `CREATE_DESCONTOS_VENDA_RPC_FUNCTIONS.sql` no SQL Editor do Supabase.

### Passo 2: Criar Tabela em Cada Schema
Para cada schema de cliente (okilao, saoluiz, etc):
```sql
CREATE TABLE <schema>.descontos_venda (
  id uuid not null default gen_random_uuid(),
  filial_id integer not null,
  data_desconto date not null,
  valor_desconto numeric(10, 2) not null,
  observacao text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  constraint descontos_venda_pkey primary key (id),
  constraint descontos_venda_filial_id_data_desconto_key unique (filial_id, data_desconto),
  constraint descontos_venda_valor_desconto_check check ((valor_desconto >= 0))
);

CREATE INDEX idx_descontos_venda_filial ON <schema>.descontos_venda(filial_id);
CREATE INDEX idx_descontos_venda_data ON <schema>.descontos_venda(data_desconto);
CREATE INDEX idx_descontos_venda_filial_data ON <schema>.descontos_venda(filial_id, data_desconto);

CREATE TRIGGER on_descontos_venda_update 
BEFORE UPDATE ON <schema>.descontos_venda 
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

### Passo 3: Restart Dev Server
```bash
npm run dev
```

## Troubleshooting

### Erro: "Could not find the table in schema cache"
**Causa:** Schema não está nos "Exposed schemas" do Supabase.
**Solução:** Settings → API → Exposed schemas → Adicionar schema.

### Erro: Loop infinito na listagem
**Causa:** Dependência circular no useEffect.
**Solução:** Já corrigido - não adicione `fetchDescontos` nas dependências.

### Erro 404 no PUT
**Causa:** Tentando usar `/api/descontos-venda/{id}`.
**Solução:** Já corrigido - usa `/api/descontos-venda` com método PUT.

## Testes

1. ✅ Criar desconto
2. ✅ Editar desconto
3. ✅ Excluir desconto
4. ✅ Validar constraint única (filial + data)
5. ✅ Validar valor >= 0
6. ✅ Listagem ordenada por data DESC
7. ✅ Sem loop infinito
8. ✅ Cores padrão (sem vermelho)
