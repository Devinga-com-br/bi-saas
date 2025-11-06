# Changelog - Sistema BI SaaS

## [2025-11-06] - Correção Crítica: Recálculo de Metas com Múltiplas Filiais

### 🐛 Correção Crítica

#### Problema Resolvido: Metas não recalculavam ao filtrar filiais
- **Sintoma**: Ao selecionar/desmarcar filiais no filtro, os totais (vendas realizadas, meta total, percentual) não atualizavam
- **Causa**: API `/api/metas/report` aceitava apenas uma filial por vez, ignorando múltiplas seleções
- **Impacto**: Usuários viam dados incorretos ao trabalhar com múltiplas filiais
- **Status**: ✅ **RESOLVIDO**

### 🔧 Implementação

#### Backend (SQL)
- ✅ Atualizada função `get_metas_mensais_report` para suportar array de filiais
- ✅ Novo parâmetro `p_filial_ids bigint[]` para múltiplas filiais
- ✅ Mantida retrocompatibilidade com `p_filial_id` (single value)
- ✅ Query otimizada: `WHERE filial_id = ANY(p_filial_ids)`

#### API Route
- ✅ Parse de filiais separadas por vírgula: `?filial_id=1,2,3`
- ✅ Conversão para array: `[1, 2, 3]`
- ✅ Validação de permissões (authorized branches)
- ✅ Logs detalhados para debugging

#### Frontend
- ✅ **Nenhuma mudança necessária** - já estava correto
- ✅ useEffect monitora `filiaisSelecionadas` e recarrega automaticamente

### 📋 Arquivos Criados/Modificados

**Novos:**
- `FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql` - Script SQL de correção
- `FIX_METAS_MULTIPLE_FILIAIS.md` - Documentação técnica detalhada
- `CORRECAO_METAS_RESUMO.md` - Resumo executivo
- `scripts/test-metas-multiple-filiais.sh` - Script de teste

**Modificados:**
- `src/app/api/metas/report/route.ts` - Parse de múltiplas filiais

### ✅ Testes Realizados

- [x] Selecionar todas as filiais → Totais corretos
- [x] Desmarcar 1 filial → Recálculo automático
- [x] Desmarcar várias filiais → Recálculo automático  
- [x] Selecionar apenas 1 filial → Totais corretos
- [x] Mudar mês/ano com filtros → Dados corretos
- [x] Backward compatibility → Código antigo funciona
- [x] Permissões de usuário → Respeitadas

### 📊 Páginas Afetadas

- ✅ `/metas/mensal` - **CORRIGIDO**
- ✅ `/metas/setor` - Já estava correto (não precisou alteração)

### 🚀 Deploy

Para aplicar a correção:

```bash
# 1. Executar SQL no banco
psql < FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql

# 2. Build e deploy
npm run build
npm start
```

### 💡 Notas Técnicas

- **Performance**: Sem impacto negativo, usa índices existentes
- **Multi-tenant**: Totalmente compatível, isolamento mantido
- **Segurança**: Validação de permissões preservada
- **Cache**: API já configurada com `dynamic = 'force-dynamic'`

---

## [2025-10-16] - Melhorias no Módulo de Metas

### ✨ Novidades

#### Módulo Meta por Setor
- ✅ Implementado cálculo de vendas por setor baseado na hierarquia de departamentos
- ✅ Suporte a seleção múltipla de setores e filiais para geração em lote
- ✅ Layout padronizado com o módulo de Metas Mensais
- ✅ Alinhamento correto de colunas entre linha principal e expandida
- ✅ Dia da semana exibido em coluna separada
- ✅ Collapse fechado por padrão
- ✅ Filtros alinhados à esquerda com espaçamento compacto

#### Componente de Data Unificado
- ✅ Substituído input type="date" por DatePicker com Calendar
- ✅ Mesmo componente usado no Dashboard aplicado em:
  - Meta Mensal (Data de Referência Inicial)
  - Meta por Setor (Data de Referência)
- ✅ Interface mais amigável e consistente

#### Cálculo de Vendas por Setor
- ✅ Implementado função SQL `fn_get_vendas_por_nivel_e_data`
- ✅ Cálculo correto baseado em `departments_level_1.pai_level_N_id`
- ✅ Suporte a todos os níveis de hierarquia (2-6)
- ✅ Performance otimizada com índices

### 🐛 Correções
- ✅ Corrigido erro "column departamento does not exist"
- ✅ Corrigido erro "React is not defined" (Fragment key)
- ✅ Corrigido cálculo de vendas que não considerava hierarquia completa
- ✅ Corrigido desalinhamento de colunas no collapse

### 🔧 Otimizações
- ✅ Warnings do ESLint resolvidos (exhaustive-deps)
- ✅ Build limpo sem erros
- ✅ Código otimizado para produção

### 📊 Estrutura de Dados
```sql
-- Nova função para cálculo de vendas por hierarquia
CREATE OR REPLACE FUNCTION {schema}.fn_get_vendas_por_nivel_e_data(
  p_nivel INTEGER,
  p_dept_ids INTEGER[],
  p_filial_id INTEGER,
  p_data_inicio DATE,
  p_data_fim DATE
)

-- Tabela de setores configuráveis
{schema}.setores (
  id, nome, departamento_nivel, departamento_ids[], ativo
)

-- Hierarquia completa de departamentos
{schema}.departments_level_1 (
  departamento_id, pai_level_2_id, pai_level_3_id, ..., pai_level_6_id
)
```

### 📦 Arquivos Modificados
- `src/app/(dashboard)/metas/mensal/page.tsx`
- `src/app/(dashboard)/metas/setor/page.tsx`
- `supabase/migrations/20250116_create_setores.sql`
- `supabase/migrations/20250116_create_metas_setor.sql`

### 📝 Próximos Passos
- [ ] Deploy em produção
- [ ] Monitorar performance das queries
- [ ] Adicionar testes automatizados
- [ ] Documentar fluxo de geração de metas

---

## Notas de Deploy

### Arquivos Desnecessários (NÃO subir para produção)
- `evidencias/` - screenshots e imagens de teste
- `supabase/migrations/*_clone_*.sql` - migrations temporárias
- `*.backup.sql` - backups de desenvolvimento
- Arquivos `.md` de documentação técnica (opcional)

### Validações Pré-Deploy
✅ Build sem erros
✅ Linting sem warnings críticos
✅ Tipos TypeScript validados
✅ Rotas API funcionando corretamente
