# Correção: Cálculo de Metas com Múltiplas Filiais

## Problema Identificado

Quando o usuário selecionava "Todas as Filiais" no filtro e depois removia uma ou mais filiais, os totais (vendas realizadas, meta total, percentual atingido) **não recalculavam corretamente**. O sistema continuava mostrando os valores de todas as filiais, mesmo após a filial ser removida do filtro.

### Causa Raiz

1. **Meta Mensal (`/api/metas/report`)**: 
   - A API aceitava apenas um único `filial_id` (single value)
   - Não havia suporte para passar múltiplas filiais
   - Quando o frontend enviava múltiplas filiais separadas por vírgula, a API pegava apenas a primeira

2. **Meta Setor (`/api/metas/setor/report`)**:
   - Já tinha suporte para múltiplas filiais
   - Mas a lógica estava correta

## Solução Implementada

### 1. Atualização da Função SQL (`get_metas_mensais_report`)

Criado arquivo: `FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql`

**Mudanças:**
- Adicionado novo parâmetro `p_filial_ids bigint[]` (array de IDs)
- Mantido `p_filial_id bigint` para backward compatibility
- Lógica condicional para escolher entre:
  - Array de filiais (`p_filial_ids`)
  - Single ID (`p_filial_id`)
  - Todas as filiais (ambos NULL)

**SQL key changes:**
```sql
-- Antes (apenas single ID ou todas):
WHERE mm.filial_id = $3  -- ou sem WHERE se NULL

-- Depois (suporta array):
WHERE mm.filial_id = ANY($3)  -- quando p_filial_ids não é NULL
```

### 2. Atualização da API Route

Arquivo: `/src/app/api/metas/report/route.ts`

**Mudanças:**
- Parse do parâmetro `filial_id` como string separada por vírgulas
- Converte para array de números: `[1, 2, 3]`
- Passa como `p_filial_ids` ao invés de `p_filial_id`
- Respeita permissões do usuário (authorized branches)

**Lógica:**
```typescript
// Parse comma-separated IDs
const ids = requestedFilialId.split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(id => !isNaN(id))

// Pass as array
params.p_filial_ids = finalFilialIds
params.p_filial_id = null  // Mantido para compatibilidade
```

### 3. Nenhuma Mudança no Frontend

O frontend **não precisa ser alterado** porque:
- Já envia as filiais selecionadas via query string: `?filial_id=1,2,3`
- O `useEffect` já monitora mudanças em `filiaisSelecionadas`
- A API agora processa corretamente o array de IDs

## Fluxo Corrigido

### Antes (Problema):
1. Usuário seleciona "Todas as Filiais" → API recebe sem `filial_id`
2. Usuário remove "Filial B" → Frontend envia `?filial_id=1,3`
3. **API parseava errado**: pegava apenas primeiro ID (`1`)
4. **Resultado**: mostrava dados apenas da Filial 1, não da soma de 1+3

### Depois (Corrigido):
1. Usuário seleciona "Todas as Filiais" → API recebe sem `filial_id`
2. Usuário remove "Filial B" → Frontend envia `?filial_id=1,3`
3. **API parseia correto**: converte para array `[1, 3]`
4. **SQL filtra correto**: `WHERE filial_id = ANY([1,3])`
5. **Resultado**: mostra soma correta das Filiais 1 e 3

## Como Aplicar a Correção

### 1. Executar SQL no Banco de Dados

Para **cada schema** de tenant (okilao, saoluiz, paraiso, lucia):

```bash
# Conectar ao banco
psql -h your-supabase-host -U postgres -d postgres

# Executar o script
\i FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql

# Ou via Supabase Dashboard:
# SQL Editor → New Query → Colar conteúdo do arquivo → Run
```

### 2. Deploy da API Route

O arquivo `src/app/api/metas/report/route.ts` já foi atualizado.

```bash
# Build e deploy
npm run build
# Deploy conforme seu processo (Vercel, etc)
```

### 3. Testar

1. Acesse `/metas/mensal`
2. Selecione "Todas as Filiais"
3. Observe os totais (vendas, meta, percentual)
4. Desmarque uma filial específica
5. **Verificar**: Os totais devem recalcular automaticamente
6. Desmarque mais filiais
7. **Verificar**: Totais continuam recalculando corretamente

## Compatibilidade

✅ **Backward Compatible**: A função SQL antiga continua funcionando se algum código ainda usa `p_filial_id` com single value.

✅ **Sem Breaking Changes**: Frontend não precisa ser alterado.

## Arquivos Modificados

1. `FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql` (novo)
2. `src/app/api/metas/report/route.ts` (atualizado)
3. `FIX_METAS_MULTIPLE_FILIAIS.md` (este arquivo - documentação)

## Nota para Meta Setor

O relatório de **Meta por Setor** (`/metas/setor`) **não precisa desta correção** porque já estava implementado corretamente com suporte a múltiplas filiais via `p_filial_ids`.

## Data da Correção

- **Data**: 2025-11-06
- **Versão**: 1.0.0
- **Autor**: GitHub Copilot CLI
