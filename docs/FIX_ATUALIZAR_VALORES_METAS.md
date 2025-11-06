# Correção do Botão "Atualizar Valores" - Metas Mensais

## Problema Identificado

No módulo **Metas/Mensal**, ao clicar no botão "Atualizar Valores", ocorria o seguinte erro:

```
[API/METAS/UPDATE] Error: {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type bigint: "1,4,6,7,9"'
}
```

### Causa Raiz

**1. Função RPC Inexistente**
- A função `atualizar_valores_realizados_metas` não existia no banco de dados
- A API tentava chamá-la, mas resultava em erro

**2. Parâmetro Incorreto**
- O frontend enviava múltiplas filiais como string concatenada: `"1,4,6,7,9"`
- A função RPC esperava um `bigint` único, não uma string com vírgulas
- Isso causava o erro de tipo de dados

### Código Problemático

**Frontend** ([page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx) - linha 225-227):
```typescript
filial_id: filiaisSelecionadas.length > 0
  ? filiaisSelecionadas.filter(f => f.value !== 'all').map(f => f.value).join(',')  // ❌ String!
  : null
```

**API** ([route.ts](../src/app/api/metas/update/route.ts) - linha 76-77):
```typescript
if (filial_id) {
  params.p_filial_id = filial_id  // ❌ Passa string diretamente!
}
```

## Solução Implementada

### 1. Criação da Função RPC

**Arquivo**: [CREATE_ATUALIZAR_VALORES_REALIZADOS.sql](../CREATE_ATUALIZAR_VALORES_REALIZADOS.sql)

Criada função que:
- ✅ Recalcula `valor_realizado` com base em vendas - descontos
- ✅ Atualiza `diferenca` e `diferenca_percentual`
- ✅ Aceita `p_filial_id` como `bigint` único ou `NULL` (todas filiais)
- ✅ Retorna resumo da operação em JSON

**Assinatura**:
```sql
CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL
)
RETURNS jsonb
```

**Exemplo de uso**:
```sql
-- Atualizar todas as filiais
SELECT atualizar_valores_realizados_metas('okilao', 11, 2025, NULL);

-- Atualizar filial específica
SELECT atualizar_valores_realizados_metas('okilao', 11, 2025, 1);
```

### 2. Correção do Frontend

**Arquivo**: [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx) - linhas 213-267

**Mudança principal**: Loop para processar cada filial individualmente

**Antes**:
```typescript
// Uma chamada com string "1,4,6,7,9" ❌
filial_id: filiaisSelecionadas
  .filter(f => f.value !== 'all')
  .map(f => f.value)
  .join(',')
```

**Depois**:
```typescript
// Loop que faz uma chamada para cada filial ✅
const filialIds = filiaisSelecionadas.length > 0
  ? filiaisSelecionadas.filter(f => f.value !== 'all').map(f => parseInt(f.value))
  : [null]

for (const filialId of filialIds) {
  await fetch('/api/metas/update', {
    body: JSON.stringify({
      schema: currentTenant.supabase_schema,
      mes,
      ano,
      filial_id: filialId  // ✅ Um número por vez ou null
    })
  })
}
```

**Benefícios**:
- ✅ Suporte a múltiplas filiais (processamento individual)
- ✅ Feedback detalhado (sucesso/erro por filial)
- ✅ Fallback: se nenhuma filial selecionada, atualiza todas

### 3. API Sem Alterações

A API em [route.ts](../src/app/api/metas/update/route.ts) **não precisa** ser alterada, pois:
- Já aceita `p_filial_id` como número ou null
- Agora a função RPC existe no banco
- O frontend passa um número por vez

## Como Aplicar a Correção

### Passo 1: Criar a Função no Banco

Execute no Supabase SQL Editor:

```sql
-- Cole o conteúdo de CREATE_ATUALIZAR_VALORES_REALIZADOS.sql
```

### Passo 2: Verificar a Função

```sql
-- Teste com uma filial
SELECT atualizar_valores_realizados_metas('seu_schema', 11, 2025, 1);

-- Teste com todas as filiais
SELECT atualizar_valores_realizados_metas('seu_schema', 11, 2025, NULL);
```

Resultado esperado:
```json
{
  "success": true,
  "message": "Valores atualizados com sucesso para 30 metas",
  "rows_updated": 30,
  "periodo": {
    "mes": 11,
    "ano": 2025,
    "data_inicio": "2025-11-01",
    "data_fim": "2025-11-30"
  }
}
```

### Passo 3: Testar no Frontend

1. Acesse **Metas > Mensal**
2. Selecione uma ou mais filiais
3. Clique em **"Atualizar Valores"**
4. Aguarde confirmação:
   - ✅ "Valores atualizados com sucesso! (5 atualizações)"
   - ❌ "Atualização concluída com erros. Sucesso: 3 Erros: 2"

## Resultado

### Antes da Correção
```
❌ Erro: invalid input syntax for type bigint: "1,4,6,7,9"
❌ Função não existe
❌ Não atualiza nenhuma meta
```

### Depois da Correção
```
✅ Função criada e funcionando
✅ Processa cada filial individualmente
✅ Feedback detalhado: "Valores atualizados com sucesso! (5 atualizações)"
✅ Valores realizado, diferença e percentual recalculados
```

## Comportamento Detalhado

### Cenário 1: Nenhuma Filial Selecionada
- **Ação**: Atualiza **TODAS** as filiais do tenant
- **Chamadas API**: 1
- **Mensagem**: "Valores atualizados com sucesso! (1 atualização)"

### Cenário 2: Múltiplas Filiais Selecionadas
- **Ação**: Atualiza cada filial individualmente
- **Chamadas API**: N (uma por filial)
- **Mensagem**: "Valores atualizados com sucesso! (5 atualizações)"

### Cenário 3: Erro em Algumas Filiais
- **Ação**: Continua processando todas, mesmo com erros
- **Mensagem**: "Atualização concluída com erros. Sucesso: 3 Erros: 2"
- **Log**: Erros detalhados no console do navegador

## Observações Importantes

1. **Performance**:
   - Se tiver muitas filiais selecionadas (10+), pode demorar
   - Considere desselecionar filiais desnecessárias
   - Ou não selecione nenhuma para atualizar todas de uma vez

2. **Descontos**:
   - A função considera descontos da tabela `descontos_venda`
   - `valor_realizado = vendas - descontos`

3. **Campos Atualizados**:
   - `valor_realizado`
   - `diferenca` (realizado - meta)
   - `diferenca_percentual` ((diferença / meta) * 100)
   - `updated_at`

4. **Não Atualiza**:
   - `valor_meta` (apenas recalcula diferenças)
   - `meta_percentual`
   - `data_referencia`

## Troubleshooting

### Problema: Erro "Function does not exist"

**Causa**: Função não foi criada no banco

**Solução**:
1. Execute o script [CREATE_ATUALIZAR_VALORES_REALIZADOS.sql](../CREATE_ATUALIZAR_VALORES_REALIZADOS.sql)
2. Verifique:
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname = 'atualizar_valores_realizados_metas';
   ```

### Problema: "Valores atualizados com sucesso! (0 atualizações)"

**Causa**: Não há metas para o período

**Solução**:
- Verifique se existem metas cadastradas para o mês/ano
- Use "Cadastrar Meta" para gerar metas primeiro

### Problema: Algumas filiais dão erro

**Causa**: Pode ser problema de permissões ou dados inválidos

**Solução**:
1. Verifique os logs do console do navegador
2. Execute manualmente para a filial com problema:
   ```sql
   SELECT atualizar_valores_realizados_metas('schema', 11, 2025, 7);
   ```

## Arquivos Relacionados

- ✅ [CREATE_ATUALIZAR_VALORES_REALIZADOS.sql](../CREATE_ATUALIZAR_VALORES_REALIZADOS.sql) - Função RPC
- ✅ [page.tsx](../src/app/(dashboard)/metas/mensal/page.tsx) - Frontend corrigido
- 📄 [route.ts](../src/app/api/metas/update/route.ts) - API (sem mudanças)
