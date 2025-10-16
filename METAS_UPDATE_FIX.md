# Problema: Valores Divergentes entre Dashboard e Metas Mensais

## Descrição do Problema

No Dashboard, o total de vendas para outubro mostra **R$ 5.118.466,45**, mas em Metas Mensais aparece **R$ 4.870.516,68** (valor do dia 14/10), indicando que as vendas do dia 15/10 não foram contabilizadas.

## Causa Raiz

A tabela `metas_mensais` armazena o valor de `valor_realizado` no momento em que a meta é gerada. Este valor **NÃO é atualizado automaticamente** quando novas vendas são registradas.

### Exemplo:
- Meta gerada no dia 14/10 às 18h
- `valor_realizado` calculado com vendas até 14/10
- Vendas do dia 15/10 são registradas
- **Problema**: `valor_realizado` continua com o valor antigo (14/10)

## Solução Implementada

### 1. Função SQL para Atualizar Valores
Criada a função `atualizar_valores_realizados_metas` que:
- Recalcula `valor_realizado` baseado nas vendas atuais
- Atualiza `diferenca` e `diferenca_percentual`
- Funciona para todas as filiais ou filial específica

**Arquivo**: `supabase/migrations/999_atualizar_valores_realizados_metas.sql`

### 2. API Endpoint
Criado endpoint `/api/metas/update` (POST) que:
- Recebe: schema, mes, ano, filial_id (opcional)
- Chama a função SQL de atualização
- Retorna quantos registros foram atualizados

**Arquivo**: `src/app/api/metas/update/route.ts`

### 3. Botão na Interface
Adicionado botão "Atualizar Valores" na página de Metas Mensais que:
- Fica ao lado do botão "Cadastrar Meta"
- Quando clicado, recalcula todos os valores realizados do mês atual
- Atualiza a tela automaticamente após a operação

**Arquivo**: `src/app/(dashboard)/metas/mensal/page.tsx`

## Como Usar

### Passo 1: Aplicar Migration
```bash
# Opção 1: Via Supabase SQL Editor
# Copie e execute o conteúdo de:
# supabase/migrations/999_atualizar_valores_realizados_metas.sql

# Opção 2: Via script helper
./scripts/apply_update_metas_migration.sh
```

### Passo 2: Atualizar Valores
1. Acesse o módulo "Metas Mensais"
2. Selecione o mês e filial desejados
3. Clique no botão "Atualizar Valores"
4. Aguarde a confirmação
5. Os valores serão recalculados com as vendas atualizadas

## Manutenção Futura

### Opções de Automação

**Opção A: Atualização Manual** (implementado)
- Usuário clica em "Atualizar Valores" quando necessário
- Mais controle, mais leve no banco

**Opção B: Atualização Automática na Consulta**
- Modificar `get_metas_mensais_report` para calcular em tempo real
- Mais lento, sempre atualizado
- Não recomendado para grandes volumes

**Opção C: Job Agendado** (recomendado para futuro)
- Criar um cron job que executa `atualizar_valores_realizados_metas` diariamente
- Automatizado, performático
- Requer configuração de scheduler (ex: pg_cron ou serviço externo)

## Arquivos Modificados

```
supabase/migrations/
  └── 999_atualizar_valores_realizados_metas.sql  [NOVO]

scripts/
  └── apply_update_metas_migration.sh             [NOVO]

src/app/api/metas/update/
  └── route.ts                                     [NOVO]

src/app/(dashboard)/metas/mensal/
  └── page.tsx                                     [MODIFICADO]
    - Adicionado estado `updating`
    - Adicionado função `handleUpdateValues()`
    - Adicionado botão "Atualizar Valores"
```

## Notas Técnicas

- A função SQL usa `SECURITY DEFINER` para permitir acesso cross-schema
- Valores são atualizados apenas para datas <= CURRENT_DATE
- Performático: usa UPDATE com subquery em vez de cursor
- Transacional: se falhar, nenhum valor é alterado

## Testes Recomendados

1. ✅ Gerar meta para outubro
2. ✅ Registrar vendas para dias futuros
3. ✅ Clicar em "Atualizar Valores"
4. ✅ Verificar se os totais batem com o Dashboard
5. ✅ Testar com filial específica e "todas as filiais"
