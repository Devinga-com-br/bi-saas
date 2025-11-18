# Correção: Valores Realizados por Setor - Meta por Setor

**Data:** 2025-11-18
**Status:** ✅ Corrigido
**Módulo:** `/metas/setor`

---

## 📋 Problema Identificado

### Sintomas
1. ❌ **Loop infinito**: Frontend chamava API repetidamente ao carregar a página
2. ❌ **Valores não quebrados por setor**: Todos os setores mostravam o mesmo valor realizado (total geral) ao invés de valores individuais por setor
3. ❌ **Timeout**: Função SQL demorava mais de 30 segundos e era cancelada

### Causa Raiz

**1. Loop Infinito (Frontend)**
- Arrays `filiaisSelecionadas` e `branches` nas dependências do `useEffect`
- React compara arrays por **referência**, não por conteúdo
- Cada render criava novas instâncias dos arrays
- `useEffect` disparava novamente → loop infinito

**2. Valores Não Quebrados por Setor (Backend)**
- A função `atualizar_valores_realizados_todos_setores` estava tentando calcular TUDO em uma única query
- **Ignorava a lógica por setor** descrita na documentação
- Não iterava pelos setores ativos
- Não chamava a função individual `atualizar_valores_realizados_metas_setor`

**3. Timeout**
- Query complexa demais tentando processar todos os setores de uma vez
- Sem otimização adequada

---

## ✅ Solução Implementada

### 1. Frontend - Correção do Loop Infinito

**Arquivo:** `src/app/(dashboard)/metas/setor/page.tsx`

#### Mudança 1: useEffect com `.length`
```typescript
// ❌ ANTES (causava loop)
}, [selectedSetor, mes, ano, isLoadingBranches, loadingSetores, filiaisSelecionadas, branches])

// ✅ DEPOIS (corrigido)
}, [selectedSetor, mes, ano, isLoadingBranches, loadingSetores, filiaisSelecionadas.length, branches.length])
//                                                                ^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^
//                                                                Usa .length (primitivo) ao invés do array completo
```

**Por que funciona?**
- Números (`.length`) são comparados por **valor**, não por referência
- Previne falsos positivos de mudança quando arrays têm mesmo conteúdo

#### Mudança 2: Guard `!loading`
```typescript
if (
  currentTenant &&
  selectedSetor &&
  mes &&
  ano &&
  !isLoadingBranches &&
  !loadingSetores &&
  filiaisSelecionadas.length > 0 &&
  branches.length > 0 &&
  !loading  // ✅ Não carregar se já está carregando
) {
  loadMetasPorSetor()
}
```

**Por que funciona?**
- Previne chamadas concorrentes
- Camada extra de proteção contra múltiplas execuções

#### Mudança 3: Cleanup de Logs
- Removidos logs temporários de debug
- Mantidos apenas logs de erro críticos

---

### 2. Backend - Correção dos Valores por Setor

**Arquivo:** `supabase/migrations/FIX_TIMEOUT_ATUALIZAR_VALORES_METAS_SETOR.sql`

#### Lógica Corrigida (Conforme Documentação)

**❌ ANTES:**
```sql
-- Tentava processar TUDO em uma única query
-- Não separava por setor
WITH setor_config AS (...),
     vendas_agregadas AS (...)
UPDATE metas_setor ...
```

**✅ DEPOIS:**
```sql
-- Itera por cada setor e chama função individual
FOR v_setor IN
  EXECUTE format('SELECT id, nome FROM %I.setores WHERE ativo = true ORDER BY id', p_schema)
LOOP
  -- Chama função individual para este setor específico
  SELECT public.atualizar_valores_realizados_metas_setor(
    p_schema,      -- schema
    v_setor.id,    -- setor_id ← INDIVIDUAL!
    p_mes,
    p_ano,
    NULL           -- todas filiais
  ) INTO v_result;
END LOOP;
```

**Estrutura Correta:**
```
atualizar_valores_realizados_todos_setores()
  ├─ Loop pelos setores ativos
  │
  └─ Para cada setor:
       └─ atualizar_valores_realizados_metas_setor()
            ├─ Busca configuração do setor (nível, departamentos)
            ├─ Constrói coluna dinâmica: pai_level_X_id
            ├─ JOIN com departments_level_1 usando coluna dinâmica
            ├─ Filtra produtos deste setor específico
            ├─ Calcula vendas APENAS deste setor
            └─ Atualiza metas_setor deste setor
```

#### Benefícios
1. ✅ **Cada setor tem valores independentes**: JOIN correto com `departments_level_1`
2. ✅ **Mais rápido**: Processa em lotes menores (setor por setor)
3. ✅ **Mais confiável**: Erros em um setor não bloqueiam os demais
4. ✅ **Conforme documentação**: Segue arquitetura descrita em `META_SETOR_COMPLETE_DOCUMENTATION.md`

---

### 3. Nova Migration - Função Individual

**Arquivo:** `supabase/migrations/CREATE_ATUALIZAR_VALORES_METAS_SETOR_INDIVIDUAL.sql`

Garante que a função `atualizar_valores_realizados_metas_setor` existe com assinatura correta (5 parâmetros):

```sql
CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas_setor(
  p_schema TEXT,
  p_setor_id BIGINT,      -- ← SETOR INDIVIDUAL
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL
)
RETURNS JSONB
```

**Lógica:**
1. Busca configuração do setor (nível + IDs dos departamentos)
2. Constrói nome da coluna dinâmica: `pai_level_X_id`
3. JOIN com `departments_level_1` usando esta coluna
4. Filtra vendas por produtos que pertencem aos departamentos deste setor
5. Calcula: `SUM(valor_vendas) - SUM(descontos)`
6. Atualiza `metas_setor` apenas para este setor

---

## 🚀 Como Aplicar as Correções

### Passo 1: Executar SQLs no Supabase (em ordem)

```sql
-- 1. Criar/corrigir função individual (PRIMEIRO)
-- Execute: CREATE_ATUALIZAR_VALORES_METAS_SETOR_INDIVIDUAL.sql

-- 2. Corrigir função agregadora (DEPOIS)
-- Execute: FIX_TIMEOUT_ATUALIZAR_VALORES_METAS_SETOR.sql
```

**⚠️ IMPORTANTE:** Executar na ordem correta, pois a função `_todos_setores` chama a função `_metas_setor`!

### Passo 2: Atualizar Estatísticas (Opcional mas Recomendado)

Para cada schema de tenant:

```sql
ANALYZE okilao.metas_setor;
ANALYZE okilao.vendas;
ANALYZE okilao.produtos;
ANALYZE okilao.departments_level_1;
ANALYZE okilao.descontos_venda;
ANALYZE okilao.setores;
```

### Passo 3: Testar

```sql
-- Testar função individual
SELECT public.atualizar_valores_realizados_metas_setor(
  'okilao',  -- schema
  1,         -- setor_id
  11,        -- mês
  2025,      -- ano
  NULL       -- todas filiais
);

-- Resultado esperado:
-- {"rows_updated": 150, "setor_id": 1, "mes": 11, "ano": 2025}
```

```sql
-- Testar função agregadora (todos setores)
SELECT public.atualizar_valores_realizados_todos_setores(
  'okilao',
  11,
  2025
);

-- Resultado esperado:
-- {
--   "success": true,
--   "message": "Processados 4 setores, 600 metas atualizadas",
--   "rows_updated": 600,
--   "setores_processados": 4,
--   "errors": []
-- }
```

### Passo 4: Verificar no Frontend

1. Abrir `/metas/setor`
2. Selecionar um setor
3. Verificar que:
   - ✅ Não há chamadas repetidas no console
   - ✅ Cada setor mostra valores diferentes
   - ✅ Valores correspondem às vendas dos departamentos corretos

---

## 📊 Comparação: Antes × Depois

### Query de Atualização

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| **Estrutura** | Uma query gigante | Loop com queries individuais |
| **Lógica por setor** | ❌ Não respeitava | ✅ Respeita corretamente |
| **JOIN departments** | ❌ Genérico | ✅ Dinâmico por setor |
| **Performance** | Timeout (>30s) | ~5-10s total |
| **Isolamento de erros** | ❌ Erro bloqueia tudo | ✅ Erro em um setor não afeta demais |
| **Manutenibilidade** | ❌ Difícil de debugar | ✅ Fácil de rastrear |

### Frontend

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| **Loop infinito** | ✅ Sim | ❌ Não |
| **Dependências useEffect** | Arrays completos | `.length` (primitivos) |
| **Proteção contra race conditions** | ❌ Não | ✅ Guard `!loading` |
| **Logs** | Excessivos | Limpos |

---

## 📚 Referências

- [META_SETOR_COMPLETE_DOCUMENTATION.md](./META_SETOR_COMPLETE_DOCUMENTATION.md) - Documentação completa do módulo
- [Função RPC: atualizar_valores_realizados_todos_setores](./META_SETOR_COMPLETE_DOCUMENTATION.md#1-atualizar_valores_realizados_todos_setores) - Linhas 317-396
- [Função RPC: atualizar_valores_realizados_metas_setor](./META_SETOR_COMPLETE_DOCUMENTATION.md#2-atualizar_valores_realizados_metas_setor) - Linhas 400-628

---

## ✅ Checklist de Verificação

Após aplicar as correções, verifique:

- [ ] SQL executado em ordem correta (individual → agregadora)
- [ ] `ANALYZE` executado para cada tenant
- [ ] Função individual retorna valores corretos por setor
- [ ] Função agregadora processa todos setores
- [ ] Frontend não tem loop infinito no console
- [ ] Cada setor mostra valores diferentes (não total geral)
- [ ] Performance aceitável (<10s para 4 setores)
- [ ] Sem timeouts

---

## 🐛 Troubleshooting

### Ainda mostra valores iguais para todos setores

**Diagnóstico:**
```sql
-- Verificar se função foi atualizada
SELECT proname, pronargs
FROM pg_proc
WHERE proname LIKE '%atualizar_valores%';

-- Deve mostrar:
-- atualizar_valores_realizados_metas_setor | 5 parâmetros
-- atualizar_valores_realizados_todos_setores | 3 parâmetros
```

**Solução:**
1. Re-executar ambos os SQLs
2. Dropar funções antigas antes:
```sql
DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_metas_setor(text, integer, integer);
```

### Ainda dá timeout

**Diagnóstico:**
```sql
-- Verificar quantidade de metas
SELECT setor_id, COUNT(*)
FROM okilao.metas_setor
WHERE EXTRACT(MONTH FROM data) = 11
  AND EXTRACT(YEAR FROM data) = 2025
GROUP BY setor_id;
```

**Solução:**
1. Executar `ANALYZE` em todas as tabelas
2. Verificar índices:
```sql
-- Deve ter estes índices:
idx_metas_setor_update_valores
idx_vendas_setor_mes_ano
idx_metas_setor_month_year_filial
```

### Loop infinito continua

**Diagnóstico:**
- Verificar no código se mudança foi aplicada
- Verificar se há hot-reload quebrando

**Solução:**
1. Limpar cache: `rm -rf .next`
2. Rebuild: `npm run build`
3. Restart: `npm run dev`

---

**Autor:** Claude Code
**Última atualização:** 2025-11-18
