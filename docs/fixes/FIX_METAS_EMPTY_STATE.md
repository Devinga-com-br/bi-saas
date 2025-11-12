# Fix: Erro ao Acessar Metas Mensais Sem Dados

**Data:** 2025-01-12  
**Versão:** 1.5.1  
**Status:** ✅ Implementado

## Problema

Ao acessar o módulo de Metas Mensais pela primeira vez (quando a tabela `metas_mensais` ainda não existe no schema), o sistema apresentava erro HTTP 500:

```
[API/METAS/REPORT] ❌ RPC Error: {
  code: 'P0001',
  message: 'Erro ao buscar metas: relation "sol.metas_mensais" does not exist',
  details: null,
  hint: null
}
GET /api/metas/report?schema=sol&mes=11&ano=2025&filial_id=1%2C2%2C3%2C5%2C7 500 in 847ms
```

### Impacto
- ❌ Impossível acessar o módulo para gerar as primeiras metas
- ❌ Experiência ruim do usuário (erro técnico)
- ❌ Necessitava criar a tabela manualmente antes de usar o módulo

## Solução Implementada

### 1. API Route `/api/metas/report` (GET)

**Arquivo:** `src/app/api/metas/report/route.ts`

Adicionado tratamento específico para erro de tabela inexistente:

```typescript
if (error) {
  // Se a tabela não existe (primeira vez), retornar dados vazios ao invés de erro
  if (error.message && error.message.includes('does not exist')) {
    console.log('[API/METAS/REPORT] ⚠️ Tabela não existe ainda, retornando dados vazios')
    return NextResponse.json({
      metas: [],
      total_realizado: 0,
      total_meta: 0,
      percentual_atingido: 0,
      meta_d1: 0,
      realizado_d1: 0,
      percentual_atingido_d1: 0
    })
  }
  
  return NextResponse.json(
    { error: error.message || 'Erro ao buscar metas' },
    { status: 500 }
  )
}
```

**Resultado:**
- ✅ Retorna estrutura vazia ao invés de erro 500
- ✅ Permite que o frontend renderize corretamente
- ✅ Usuário pode acessar o botão "Gerar Metas"

### 2. API Route `/api/metas/update` (POST)

**Arquivo:** `src/app/api/metas/update/route.ts`

Adicionado tratamento para atualização de valores realizados:

```typescript
if (error) {
  // Se a tabela não existe, retornar sucesso silencioso (primeira vez)
  if (error.message && error.message.includes('does not exist')) {
    console.log('[API/METAS/UPDATE] ⚠️ Tabela não existe ainda, ignorando atualização')
    return NextResponse.json({
      message: 'Nenhuma meta para atualizar',
      success: true,
      registros_atualizados: 0
    })
  }
  
  return NextResponse.json(
    { error: error.message || 'Erro ao atualizar valores' },
    { status: 500 }
  )
}
```

**Resultado:**
- ✅ Atualização silenciosa quando não há dados
- ✅ Não bloqueia o carregamento do módulo

### 3. Frontend - Tratamento de Erro

**Arquivo:** `src/app/(dashboard)/metas/mensal/page.tsx`

Melhorado o tratamento de erro no carregamento:

```typescript
} catch (error) {
  console.error('[METAS] ❌ Error loading report:', error)
  // Não mostrar alert, apenas setar report vazio para permitir uso do módulo
  setReport({
    metas: [],
    total_realizado: 0,
    total_meta: 0,
    percentual_atingido: 0
  })
} finally {
  setLoading(false)
}
```

**Resultado:**
- ✅ Não mostra alert de erro
- ✅ Seta estado vazio ao invés de bloquear
- ✅ Permite interação com o módulo

### 4. Mensagem Amigável (Já Existente)

O frontend já possui mensagem amigável para quando não há metas:

```tsx
{loading ? (
  <div className="text-center py-8">Carregando...</div>
) : report?.metas.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    Nenhuma meta cadastrada para este período
  </div>
) : (
  // ... renderização das metas
)}
```

## Fluxo Corrigido

### Antes (Com Erro)
```
Usuário acessa /metas/mensal
  ↓
Frontend carrega e chama APIs
  ↓
API /metas/update → ❌ ERRO 500 (tabela não existe)
API /metas/report → ❌ ERRO 500 (tabela não existe)
  ↓
Frontend mostra alert de erro
  ↓
❌ Módulo inacessível
```

### Depois (Corrigido)
```
Usuário acessa /metas/mensal
  ↓
Frontend carrega e chama APIs
  ↓
API /metas/update → ✅ 200 (ignora, tabela não existe)
API /metas/report → ✅ 200 (retorna dados vazios)
  ↓
Frontend renderiza normalmente
  ↓
Mostra: "Nenhuma meta cadastrada para este período"
  ↓
✅ Botão "Gerar Metas" disponível
  ↓
Usuário gera primeira meta
  ↓
Tabela criada automaticamente pela function
```

## Arquivos Modificados

1. `src/app/api/metas/report/route.ts` - Tratamento de tabela inexistente
2. `src/app/api/metas/update/route.ts` - Tratamento de atualização vazia
3. `src/app/(dashboard)/metas/mensal/page.tsx` - Melhor tratamento de erro

## Testes de Validação

### Cenário 1: Primeiro Acesso (Tabela Não Existe)
- ✅ Módulo carrega sem erros
- ✅ Mostra mensagem "Nenhuma meta cadastrada"
- ✅ Cards de resumo exibem R$ 0,00 / 0.0%
- ✅ Botão "Gerar Metas" está disponível

### Cenário 2: Após Gerar Primeira Meta
- ✅ Tabela criada automaticamente
- ✅ Metas exibidas corretamente
- ✅ Valores realizados atualizados

### Cenário 3: Mudança de Período Sem Metas
- ✅ Mostra mensagem apropriada
- ✅ Permite gerar metas para novo período

## Impacto no Usuário

### Antes
- ❌ Erro técnico ao acessar pela primeira vez
- ❌ Necessário criar tabela manualmente
- ❌ Experiência frustrante

### Depois
- ✅ Módulo sempre acessível
- ✅ Mensagem clara sobre estado vazio
- ✅ Fluxo natural: acessar → gerar primeira meta
- ✅ Experiência profissional

## Logs para Debug

Quando a tabela não existe, os logs mostram:

```
[API/METAS/UPDATE] ⚠️ Tabela não existe ainda, ignorando atualização
[API/METAS/REPORT] ⚠️ Tabela não existe ainda, retornando dados vazios
[METAS] ℹ️ Nenhuma meta encontrada para o período
```

Isso facilita identificar o estado inicial sem confundir com erros reais.

## Notas Técnicas

1. **Detecção de Erro:** Verifica se mensagem contém `"does not exist"`
2. **Graceful Degradation:** Sistema funciona normalmente sem dados
3. **Criação Automática:** Tabela é criada pela RPC function `generate_metas_mensais`
4. **Compatibilidade:** Não afeta funcionamento normal quando tabela existe

## Relacionado

- `docs/modules/metas-mensal/README.md` - Documentação do módulo
- `docs/modules/metas-mensal/BUSINESS_RULES.md` - Regras de negócio
- `src/app/api/metas/generate/route.ts` - API de geração de metas

## Versão

**Anterior:** 1.5.0  
**Atual:** 1.5.1  
**Próxima:** 1.6.0 (features roadmap)
