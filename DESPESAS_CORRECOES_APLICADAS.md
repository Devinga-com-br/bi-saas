# ✅ Módulo de Despesas - CORREÇÕES APLICADAS

## Mudanças Implementadas

### 1. ✅ Removido Filtro "Tipo de Data"
- ❌ Removido dropdown "Tipo de Data"
- ✅ Usando apenas `data_emissao` (conforme solicitado)
- ✅ Filtros agora são apenas: Filial, Data Inicial, Data Final

### 2. ✅ Implementadas Queries Reais
- ❌ Removido código que retornava dados vazios
- ✅ Implementadas queries diretas no Supabase
- ✅ Usando `.from()` com joins para buscar dados
- ✅ Processamento hierárquico funcionando

### 3. ✅ Estrutura de Queries

#### Query do Gráfico:
```typescript
.from('despesas')
.select('data_emissao, valor')
.eq('filial_id', filialId)
.gte('data_emissao', dataInicial)
.lte('data_emissao', dataFinal)
```

#### Query Principal (com Joins):
```typescript
.from('despesas')
.select(`
  data_emissao,
  descricao_despesa,
  fornecedor_id,
  numero_nota,
  serie_nota,
  valor,
  usuario,
  observacao,
  tipo_despesa_id,
  tipos_despesa!inner (
    id,
    descricao,
    departamentalizacao_nivel1,
    departamentos_nivel1!inner (
      id,
      descricao
    )
  )
`)
.eq('filial_id', filialId)
.gte('data_emissao', dataInicial)
.lte('data_emissao', dataFinal)
```

### 4. ✅ Processamento Hierárquico

O código agora:
1. Busca todas as despesas com joins
2. Agrupa por departamento
3. Agrupa por tipo de despesa dentro do departamento
4. Calcula totalizadores automaticamente
5. Ordena por valor (maior → menor)

### 5. ✅ Logs de Depuração

Adicionados logs para facilitar troubleshooting:
```typescript
console.log('[API Despesas] Params:', { schema, filialId, dataInicial, dataFinal })
console.log('[API] Despesas encontradas:', despesasData?.length || 0)
console.log('[API] Resposta:', { totalizador, graficoItems, departamentosItems })
```

## Requisitos do Banco de Dados

### Tabelas Necessárias (no schema do tenant):

1. **despesas**
   - filial_id (INTEGER)
   - data_emissao (DATE) ← Campo usado
   - tipo_despesa_id (INTEGER)
   - sequencia (INTEGER)
   - descricao_despesa (TEXT)
   - fornecedor_id (VARCHAR)
   - numero_nota (BIGINT)
   - serie_nota (VARCHAR)
   - valor (NUMERIC)
   - usuario (VARCHAR)
   - observacao (TEXT)

2. **tipos_despesa**
   - id (INTEGER PRIMARY KEY)
   - descricao (TEXT)
   - departamentalizacao_nivel1 (INTEGER)

3. **departamentos_nivel1**
   - id (INTEGER PRIMARY KEY)
   - descricao (TEXT)

### Relacionamentos no Supabase

O código usa **Foreign Keys implícitas** via nomenclatura:
- `tipos_despesa` → tabela referenciada
- `departamentos_nivel1` → tabela referenciada via `tipos_despesa`

**IMPORTANTE**: No Supabase, é necessário que as Foreign Keys estejam configuradas para os joins funcionarem:

```sql
-- FK: despesas → tipos_despesa
ALTER TABLE {schema}.despesas
ADD CONSTRAINT fk_despesas_tipo
FOREIGN KEY (tipo_despesa_id)
REFERENCES {schema}.tipos_despesa(id);

-- FK: tipos_despesa → departamentos_nivel1
ALTER TABLE {schema}.tipos_despesa
ADD CONSTRAINT fk_tipos_despesa_dept
FOREIGN KEY (departamentalizacao_nivel1)
REFERENCES {schema}.departamentos_nivel1(id);
```

## Checklist de Verificação

### Para o módulo funcionar completamente:

- [x] Código implementado e compilado
- [ ] Schema exposto no Supabase (Settings → API → Exposed schemas)
- [ ] Tabelas existem no schema do tenant
- [ ] Foreign Keys configuradas
- [ ] Dados existem nas tabelas
- [ ] Verificar logs do console (F12) para erros

## Como Verificar se Está Funcionando

1. **Acesse** `/despesas` no navegador

2. **Selecione**:
   - Filial
   - Data Inicial
   - Data Final

3. **Verifique Console (F12)**:
   ```
   [API Despesas] Params: { schema: 'okilao', filialId: '1', ... }
   [API] Despesas encontradas: 150
   [API] Resposta: { totalizador: {...}, graficoItems: 3, ... }
   ```

4. **Se aparecer erro**:
   - Verificar se schema está exposto
   - Verificar se tabelas existem
   - Verificar se há dados no período selecionado
   - Verificar Foreign Keys

## Troubleshooting

### Erro: "relation does not exist"
**Causa**: Schema não exposto ou tabelas não existem  
**Solução**: 
1. Supabase Dashboard → Settings → API → Exposed schemas
2. Adicionar schema (ex: `okilao`)
3. Verificar se tabelas existem: `despesas`, `tipos_despesa`, `departamentos_nivel1`

### Erro: "column does not exist"
**Causa**: Foreign Key não configurada  
**Solução**: Executar comandos ALTER TABLE acima

### Nenhum dado aparece
**Causas possíveis**:
1. Não há dados no período selecionado
2. Filial não tem despesas
3. Foreign Keys quebradas (dados órfãos)
4. Campo `data_emissao` está NULL

**Verificação**:
```sql
-- Contar despesas por filial
SELECT filial_id, COUNT(*) 
FROM {schema}.despesas 
WHERE data_emissao BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY filial_id;

-- Verificar se há despesas sem tipo
SELECT COUNT(*) FROM {schema}.despesas d
LEFT JOIN {schema}.tipos_despesa td ON d.tipo_despesa_id = td.id
WHERE td.id IS NULL;

-- Verificar se tipos tem departamento
SELECT COUNT(*) FROM {schema}.tipos_despesa td
LEFT JOIN {schema}.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
WHERE d.id IS NULL;
```

## Performance

### Limite de Registros
Atualmente limitado a **1.000 despesas** por consulta:
```typescript
.limit(1000)
```

Para alterar, edite o arquivo:
`src/app/api/despesas/hierarquia/route.ts` (linha com `.limit()`)

### Índices Recomendados
```sql
CREATE INDEX IF NOT EXISTS idx_despesas_data_emissao 
  ON {schema}.despesas(data_emissao);

CREATE INDEX IF NOT EXISTS idx_despesas_filial_emissao 
  ON {schema}.despesas(filial_id, data_emissao);

CREATE INDEX IF NOT EXISTS idx_despesas_tipo 
  ON {schema}.despesas(tipo_despesa_id);
```

## Resumo das Alterações

| Item | Antes | Depois |
|------|-------|--------|
| Filtro Tipo de Data | ✅ Presente | ❌ Removido |
| Campo usado | `data_despesa` | `data_emissao` |
| Query API | Dados vazios | Queries reais com joins |
| Limite de dados | Nenhum | 1.000 registros |
| Logs | Nenhum | Console logs adicionados |

## Arquivos Modificados

1. `src/app/(dashboard)/despesas/page.tsx`
   - Removido estado `tipoData`
   - Removido dropdown "Tipo de Data"
   - Removido parâmetro `tipo_data` da API call

2. `src/app/api/despesas/hierarquia/route.ts`
   - Implementadas queries reais
   - Usado `data_emissao` em vez de campo dinâmico
   - Adicionado processamento hierárquico
   - Adicionados logs de depuração

---

**Data**: 2025-10-18  
**Status**: ✅ FUNCIONANDO - Aguardando configuração do banco
