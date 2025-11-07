# Solução: Módulo Metas por Setor Retornando Vazio

## Problema
Ao abrir o módulo `/metas/setor`, a API retorna erro 503:
```
[API/METAS/SETOR/REPORT] Optimized function returned empty, using fallback. Data was: []
[API/METAS/SETOR/REPORT] ⚠️  CRITICAL: Fallback function failed
```

## Diagnóstico

A função `get_metas_setor_report_optimized` existe e está funcionando, mas está retornando um array vazio `[]`.

### Possíveis causas:
1. **Não há metas cadastradas** para o setor solicitado no período
2. **Tabela metas_setor não tem as colunas necessárias** (valor_realizado, diferenca, diferenca_percentual)
3. **Função não foi criada no schema correto**
4. **Setor está inativo ou não existe**

## Solução Passo a Passo

### 1. Diagnóstico Inicial
Execute o arquivo `DIAGNOSTICO_METAS_SETOR.sql` no Supabase SQL Editor para identificar o problema específico.

```sql
-- Verificar se há metas cadastradas
SELECT COUNT(*) FROM saoluiz.metas_setor WHERE setor_id = 8;

-- Verificar estrutura da tabela
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'saoluiz' AND table_name = 'metas_setor';
```

### 2. Corrigir Estrutura da Tabela
Se as colunas `valor_realizado`, `diferenca` e `diferenca_percentual` não existirem, execute:

```bash
# Execute no Supabase SQL Editor
FIX_METAS_SETOR_SCHEMA.sql
```

### 3. Criar/Atualizar as Funções
Execute o arquivo `FUNCAO_FINAL_METAS_SETOR.sql` para criar as funções corretas:

```sql
-- Este arquivo cria duas funções:
-- 1. get_metas_setor_report_optimized (leitura)
-- 2. atualizar_valores_realizados_metas_setor (cálculo)
```

### 4. Gerar Metas (se não existirem)
Se não houver metas cadastradas, use a funcionalidade de geração de metas na interface:

1. Acesse o módulo "Metas por Setor"
2. Clique em "Gerar Metas"
3. Selecione o período desejado
4. Confirme a geração

**OU** execute manualmente a função de geração (se existir):
```sql
-- Verificar se existe função de geração
SELECT proname FROM pg_proc WHERE proname LIKE '%gerar_metas%';
```

### 5. Atualizar Valores Realizados
Após ter metas cadastradas, execute a função de atualização:

```sql
SELECT * FROM atualizar_valores_realizados_metas_setor('saoluiz', 11, 2025);
```

Esta função:
- Busca vendas dos produtos dos departamentos de cada setor
- Calcula valor_realizado usando a hierarquia de 6 níveis
- Atualiza diferenca e diferenca_percentual
- Processa todos os setores ativos

### 6. Testar o Resultado
```sql
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  8,      -- Setor Açougue
  11,     -- Novembro
  2025,
  NULL    -- Todas as filiais
);
```

Deve retornar um array JSON com as metas e valores realizados.

## Arquivos Importantes

### Para Correção:
- `DIAGNOSTICO_METAS_SETOR.sql` - Script de diagnóstico
- `FIX_METAS_SETOR_SCHEMA.sql` - Adiciona colunas necessárias
- `FUNCAO_FINAL_METAS_SETOR.sql` - Funções corretas (versão final)

### Outras Versões (não usar):
- `FUNCAO_METAS_SETOR_HIERARQUIA.sql` - Versão intermediária
- `FUNCAO_CORRETA_METAS_SETOR.sql` - Versão sem hierarquia
- `FIX_METAS_SETOR_FUNCOES.sql` - Versão de investigação

## Arquitetura da Solução

A solução usa **duas funções separadas** para performance:

### Função 1: Leitura (Rápida)
```sql
get_metas_setor_report_optimized(schema, setor_id, mes, ano, filial_ids)
```
- Apenas lê dados da tabela `metas_setor`
- Retorna array JSON agrupado por data
- Usada pela API no carregamento da página

### Função 2: Cálculo/Atualização (Complexa)
```sql
atualizar_valores_realizados_metas_setor(schema, mes, ano)
```
- Calcula vendas usando hierarquia de departamentos (6 níveis)
- Atualiza colunas: valor_realizado, diferenca, diferenca_percentual
- Deve ser executada periodicamente ou via botão "Atualizar Valores"

## Botão "Atualizar Valores"

Para implementar o botão na interface, crie uma API route:

**Arquivo:** `src/app/api/metas/setor/atualizar-valores/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { schema, mes, ano } = await request.json()

  const { data, error } = await supabase.rpc(
    'atualizar_valores_realizados_metas_setor',
    { p_schema: schema, p_mes: mes, p_ano: ano }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
```

## Hierarquia de Departamentos

A solução correta usa a tabela `departments_level_1` para resolver a hierarquia:

```
Level 6 (mais alto)
  └─ Level 5
      └─ Level 4
          └─ Level 3
              └─ Level 2
                  └─ Level 1 (produtos)
```

**Exemplo:**
- Setor "Açougue" tem departamento_ids = ["22"] no nível 5
- Função busca TODOS os departamentos level_1 onde `pai_level_5_id = 22`
- Soma vendas de produtos desses departamentos level_1

## Verificação Final

Após aplicar todas as correções, verifique:

```sql
-- 1. Função existe?
SELECT proname FROM pg_proc WHERE proname = 'get_metas_setor_report_optimized';

-- 2. Colunas existem?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'metas_setor'
  AND column_name IN ('valor_realizado', 'diferenca', 'diferenca_percentual');

-- 3. Há metas cadastradas?
SELECT COUNT(*) FROM saoluiz.metas_setor WHERE setor_id = 8;

-- 4. Função retorna dados?
SELECT get_metas_setor_report_optimized('saoluiz', 8, 11, 2025, NULL);
```

## Troubleshooting

### Função retorna [] vazio
→ Não há metas cadastradas. Gerar metas primeiro.

### Erro "column valor_realizado does not exist"
→ Executar `FIX_METAS_SETOR_SCHEMA.sql`

### Erro "Setor X não encontrado"
→ Verificar se setor existe e está ativo: `SELECT * FROM saoluiz.setores WHERE id = X`

### Valores realizados sempre 0
→ Executar `atualizar_valores_realizados_metas_setor('saoluiz', mes, ano)`

### Erro "column data does not exist" ao criar índice
→ Índice foi removido da versão final. Ignorar ou verificar nome correto da coluna.
