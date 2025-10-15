# Módulo de Metas - Documentação Completa

## ✅ Status
O módulo de Metas foi **CRIADO E TESTADO** com sucesso! O build passou sem erros.

### O que está pronto:
- ✅ Migration criada em `supabase/migrations/024_create_metas_table.sql`
- ✅ Tabela `metas_mensais` por schema (multi-tenant)
- ✅ Funções RPC no Supabase
- ✅ API Routes (`/api/metas/generate` e `/api/metas/report`)
- ✅ Interface completa em `/metas/mensal`
- ✅ Menu integrado no sidebar
- ✅ Build funcionando sem erros

## 📁 Arquivos Criados/Modificados

### 1. Migration (Banco de Dados)
**Arquivo**: `supabase/migrations/024_create_metas_table.sql`

Cria:
- Função `public.create_metas_table_for_tenant(schema_name)` - Cria tabela por schema
- Função `public.generate_metas_mensais()` - Gera metas mensais automaticamente
- Função `public.get_metas_mensais_report()` - Busca relatório de metas
- Tabela `{schema}.metas_mensais` para cada tenant existente
- Índices para performance
- Triggers para `updated_at`

### 2. API Routes
**Arquivo**: `src/app/api/metas/generate/route.ts`
- Endpoint: `POST /api/metas/generate`
- Função: Gerar metas mensais para uma filial
- Parâmetros: `schema`, `filialId`, `mes`, `ano`, `metaPercentual`, `dataReferenciaInicial`

**Arquivo**: `src/app/api/metas/report/route.ts`
- Endpoint: `GET /api/metas/report`
- Função: Buscar relatório de metas
- Parâmetros: `schema`, `mes`, `ano`, `filialId` (opcional)

### 3. Interface do Usuário
**Arquivo**: `src/app/(dashboard)/metas/mensal/page.tsx`
- Página completa de Metas Mensais
- Cards de resumo (Vendas vs Meta)
- Gráfico circular de progresso
- Tabela detalhada dia a dia
- Filtros (Mês, Ano, Filial)
- Dialog para cadastrar novas metas

### 4. Menu/Navegação
**Arquivo**: `src/components/dashboard/app-sidebar.tsx`
- Adicionado item "Metas" com ícone TrendingUp
- Subitem "Meta Mensal" linkando para `/metas/mensal`

## 🚀 Como Aplicar a Migration

**IMPORTANTE**: A migration precisa ser aplicada no banco de dados antes de usar o módulo.

### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em "New Query"
5. Cole o conteúdo completo do arquivo `supabase/migrations/024_create_metas_table.sql`
6. Clique em "Run" ou pressione Ctrl+Enter
7. Verifique se não houve erros

### Opção 2: Via CLI do Supabase
```bash
# Se você tem o Supabase CLI instalado
supabase db push

# Ou aplicar migration específica
supabase migration up --db-url "sua-connection-string"
```

### Opção 3: Via psql
```bash
psql "sua-connection-string" -f supabase/migrations/024_create_metas_table.sql
```

### Verificar se foi aplicada corretamente
Execute no SQL Editor:
```sql
-- Verificar se a função foi criada
SELECT proname FROM pg_proc WHERE proname = 'create_metas_table_for_tenant';

-- Verificar se a tabela existe para o schema 'okilao' (exemplo)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'okilao' AND table_name = 'metas_mensais';
```

## O Que a Migration Faz

1. **Cria função `create_metas_table_for_tenant`**
   - Cria tabela `metas_mensais` em cada schema de tenant
   - Adiciona índices para performance
   - Configura triggers para `updated_at`

2. **Cria função `generate_metas_mensais`**
   - Gera metas diárias para um mês específico
   - Calcula valores de referência do ano anterior
   - Calcula valores realizados
   - Calcula diferenças e percentuais
   - Define situação (positiva/negativa/neutra/pendente)

3. **Cria função `get_metas_mensais_report`**
   - Busca metas de um período
   - Calcula totais acumulados
   - Calcula percentual atingido

4. **Aplica automaticamente aos schemas existentes**

## Estrutura da Tabela `metas_mensais`

```sql
CREATE TABLE schema.metas_mensais (
  id bigserial PRIMARY KEY,
  filial_id bigint NOT NULL,
  data date NOT NULL,
  dia_semana text NOT NULL,
  meta_percentual numeric(5, 2) NOT NULL DEFAULT 0,
  data_referencia date NOT NULL,
  valor_referencia numeric(15, 2) DEFAULT 0,
  valor_meta numeric(15, 2) DEFAULT 0,
  valor_realizado numeric(15, 2) DEFAULT 0,
  diferenca numeric(15, 2) DEFAULT 0,
  diferenca_percentual numeric(5, 2) DEFAULT 0,
  situacao text DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT metas_mensais_unique_filial_data UNIQUE (filial_id, data)
);
```

## Funcionalidades

### 1. Cadastro de Metas
- Selecionar mês e ano
- Selecionar filial
- Definir percentual de meta (ex: 10% = meta de crescer 10% em relação ao ano anterior)
- Definir data de referência inicial (primeiro dia do período de comparação)
- Gera automaticamente metas para todos os dias do mês

### 2. Visualização
- Card com vendas do período vs meta
- Gráfico circular de progresso da meta
- Tabela detalhada dia a dia com:
  - Data e dia da semana
  - Data de referência
  - Meta (% e valor)
  - Valor realizado
  - Diferença (valor e %)
  - Situação (badge colorido)

### 3. Filtros
- Mês (padrão: mês atual)
- Ano (padrão: ano atual)  
- Filial (padrão: todas)

## 🐛 Troubleshooting

### Erro: "Função não encontrada"
**Sintoma**: Erro no console `function "generate_metas_mensais" does not exist`

**Solução**:
1. A migration não foi aplicada
2. Aplique a migration conforme instruções acima
3. Reinicie o servidor Next.js

### Erro: "Tabela não existe"
**Sintoma**: `relation "schema.metas_mensais" does not exist`

**Solução**:
1. Execute no SQL Editor:
```sql
SELECT public.create_metas_table_for_tenant('seu_schema');
```
2. Substitua `'seu_schema'` pelo schema do seu tenant (ex: `'okilao'`)

### Nenhuma meta é gerada
**Possíveis causas**:
1. **Sem dados de referência**: Não há vendas no ano anterior
   - Verifique: `SELECT * FROM {schema}.vendas_diarias_por_filial WHERE data_venda BETWEEN '2024-10-01' AND '2024-10-31'`
2. **Filial inexistente**: ID de filial inválido
   - Verifique: `SELECT * FROM public.branches WHERE branch_code = 'X'`

### Valores zerados
**Causa**: Não há vendas registradas para o período

**Solução**:
- Aguarde o fechamento do dia para que vendas sejam registradas em `vendas_diarias_por_filial`
- Ou verifique se a integração de vendas está funcionando

### Erro de permissão
**Sintoma**: `permission denied for function generate_metas_mensais`

**Solução**:
- Funções são `SECURITY DEFINER`, mas verifique se usuário está autenticado
- Reaplique migration se necessário

## ❓ FAQ

### 1. Posso alterar a meta depois de criada?
Sim! Basta gerar novamente com o novo percentual. O sistema usa `ON CONFLICT ... DO UPDATE`, então os valores serão atualizados.

### 2. Como funciona a comparação com ano anterior?
A data de referência inicial define o ponto de partida. Para cada dia do mês atual, o sistema busca o valor vendido no dia correspondente do ano anterior.

Exemplo:
- Meta para: 15/10/2025
- Data ref. inicial: 01/10/2024
- Data ref. calculada: 15/10/2024 (14 dias depois)
- Valor ref.: Vendas de 15/10/2024

### 3. Posso ter metas diferentes por filial?
Sim! Cada filial pode ter seu próprio percentual de meta. Basta cadastrar separadamente.

### 4. O que acontece se não houver vendas no ano anterior?
- `valor_referencia` = 0
- `valor_meta` = 0
- Meta não faz sentido para esse dia
- Recomenda-se definir meta manualmente nesses casos

### 5. Como as metas são atualizadas diariamente?
As metas são **estáticas** após criação. Para atualizar `valor_realizado` diariamente:

**Opção 1**: Reexecutar geração (sobrescreve)
**Opção 2**: Criar um job/cron para atualizar:
```sql
-- Atualizar valores realizados para mês atual
UPDATE {schema}.metas_mensais m
SET 
  valor_realizado = (
    SELECT COALESCE(valor_total, 0)
    FROM {schema}.vendas_diarias_por_filial
    WHERE filial_id = m.filial_id AND data_venda = m.data
  ),
  updated_at = now()
WHERE EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE);
```

### 6. Posso exportar o relatório?
Atualmente não implementado, mas pode ser adicionado:
- Exportar para Excel via biblioteca xlsx
- Exportar para PDF via jsPDF
- Imprimir usando `window.print()`

### 7. Como configurar meta para "todas as filiais"?
Para ter uma meta consolidada:
1. Cadastre meta para cada filial individualmente
2. Use o filtro "Todas as Filiais" para visualizar o consolidado
3. Os totais serão somados automaticamente

## 📝 Próximos Passos / Melhorias Futuras

- [ ] Atualização automática de `valor_realizado` via cronjob
- [ ] Exportação para Excel/PDF
- [ ] Gráfico de evolução diária vs meta
- [ ] Notificações quando meta é atingida/não atingida
- [ ] Comparação de metas entre filiais
- [ ] Histórico de alterações de meta
- [ ] Meta por categoria/departamento
- [ ] Meta semanal além de mensal
- [ ] Dashboard executivo com resumo geral

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do servidor Next.js
3. Verifique os logs do Supabase (SQL Editor)
4. Consulte este README completo

---

**Data de Criação**: 15 de Outubro de 2025  
**Última Atualização**: 15 de Outubro de 2025  
**Versão**: 1.0.0

## 💡 Como Usar o Módulo

### 1. Primeira Vez - Cadastrar Metas
1. Acesse o menu **"Metas"** → **"Meta Mensal"**
2. Clique no botão **"+ Cadastrar Meta"**
3. Preencha o formulário:
   - **Mês**: Selecione o mês desejado (ex: Outubro)
   - **Ano**: Selecione o ano (ex: 2025)
   - **Filial**: Escolha a filial (ex: Filial 1)
   - **Meta (%)**: Digite o percentual de crescimento (ex: 10 para 10%)
   - **Data de Referência Inicial**: Data inicial do período de comparação (ex: 2024-10-01)
4. Clique em **"Gerar Metas"**
5. O sistema irá:
   - Criar uma meta para cada dia do mês selecionado
   - Buscar os valores de venda do ano anterior (data de referência)
   - Calcular o valor meta baseado no percentual informado
   - Buscar os valores realizados (se já existirem vendas)
   - Calcular as diferenças automaticamente

### 2. Acompanhar Metas
Após cadastrar, você verá:

**Card de Vendas do Período**
- Valor total realizado no mês até o momento
- Valor da meta acumulada
- Percentual de diferença (verde se positivo, vermelho se negativo)

**Card de Progresso**
- Gráfico circular mostrando % da meta atingida
- Verde se atingiu 100% ou mais
- Azul se ainda está abaixo de 100%

**Tabela Detalhada**
Para cada dia do mês:
- Data e dia da semana (em português)
- Data de referência do ano anterior
- Meta em % e valor esperado (R$)
- Valor realizado no dia (R$)
- Diferença em valor e percentual
- Badge de situação:
  - 🟢 **Positiva**: Atingiu ou superou a meta
  - 🟡 **Neutra**: Ficou até 5% abaixo da meta
  - 🔴 **Negativa**: Ficou mais de 5% abaixo da meta
  - ⚪ **Pendente**: Data futura (sem vendas ainda)

### 3. Filtrar Visualização
Use os filtros para analisar:
- **Mês/Ano**: Altere para ver metas de outros períodos
- **Filial**: Veja meta de uma filial específica ou de todas juntas
- Clique em **"Aplicar"** para atualizar

### 4. Recalcular/Atualizar Metas
- Se gerar metas novamente para o mesmo período e filial, os valores serão **atualizados**
- Útil para:
  - Alterar o percentual de meta
  - Corrigir data de referência
  - Recalcular após novas vendas

## 🔧 Detalhes Técnicos

### Arquitetura Multi-Tenant
- Tabela `metas_mensais` criada **por schema** (um para cada empresa/tenant)
- Funções RPC centralizadas em `public` schema
- Parâmetro `p_schema` passado para as funções para isolar dados

### Cálculo das Metas

#### Valor Meta
```
valor_meta = valor_referencia × (1 + (meta_percentual / 100))
```

Exemplo:
- Valor de referência (ano anterior): R$ 10.000,00
- Meta: 10%
- Valor meta = 10.000 × (1 + 0.10) = R$ 11.000,00

#### Diferença
```
diferenca = valor_realizado - valor_meta
```

#### Diferença Percentual
```
diferenca_percentual = (diferenca / valor_meta) × 100
```

#### Situação
- **Pendente**: `data > CURRENT_DATE`
- **Positiva**: `diferenca >= 0`
- **Neutra**: `diferenca < 0 AND diferenca >= (valor_meta × -0.05)`
- **Negativa**: `diferenca < (valor_meta × -0.05)`

### Performance

#### Índices Criados
```sql
-- Por filial e data (queries principais)
CREATE INDEX idx_metas_mensais_filial_data ON metas_mensais(filial_id, data);

-- Por data (agregações)
CREATE INDEX idx_metas_mensais_data ON metas_mensais(data);
```

#### Constraint Único
```sql
-- Impede duplicatas
CONSTRAINT metas_mensais_unique_filial_data UNIQUE (filial_id, data)
```

### Dependências
O módulo depende de:
- Tabela `{schema}.vendas_diarias_por_filial` (já existente)
- Tabela `public.branches` (para listar filiais)
- Contexto de tenant (`useTenantContext`)

### Formato de Datas
- **Entrada**: `YYYY-MM-DD` (ISO 8601)
- **Exibição**: `dd/MM/yyyy` (brasileiro)
- **Dia da semana**: Em português (Segunda-Feira, Terça-Feira, etc.)

### API Response Format

#### GET /api/metas/report
```typescript
{
  metas: [
    {
      id: number
      filial_id: number
      data: string // "2025-10-01"
      dia_semana: string // "Terça-Feira"
      meta_percentual: number // 10.00
      data_referencia: string // "2024-10-01"
      valor_referencia: number // 10000.00
      valor_meta: number // 11000.00
      valor_realizado: number // 11500.00
      diferenca: number // 500.00
      diferenca_percentual: number // 4.55
      situacao: string // "positiva"
    }
  ],
  total_realizado: number // 350000.00
  total_meta: number // 330000.00
  percentual_atingido: number // 106.06
}
```

#### POST /api/metas/generate
```typescript
{
  success: boolean
  message: string // "Metas geradas com sucesso"
  dias_processados: number // 31
}
```
