# Relatório Ruptura de Vendas (60 dias)

**Data de Criação:** 02/11/2025  
**Autor:** Sistema BI SaaS

## Resumo

Novo relatório criado para identificar produtos que tinham vendas consistentes nos últimos 60 dias mas pararam de vender nos últimos 3 dias, indicando possível ruptura de estoque ou outros problemas.

## Arquivos Criados

### 1. Migration SQL
**Arquivo:** `supabase/migrations/074_create_ruptura_venda_60d_function.sql`

**Função:** `get_ruptura_venda_60d_report()`

**Parâmetros:**
- `schema_name`: Nome do schema (ex: 'okilao', 'paraiso')
- `p_filiais`: Array de IDs de filiais (NULL = todas)
- `p_limite_minimo_dias`: Mínimo de dias com venda nos 60 dias (default: 30)
- `p_page`: Página atual (default: 1)
- `p_page_size`: Registros por página (default: 50)

**Lógica de Classificação:**
- **CRÍTICO**: ≥55 dias com venda nos últimos 60d + 0 vendas nos últimos 3d
- **ALTO**: ≥45 dias com venda nos últimos 60d + 0 vendas nos últimos 3d
- **MÉDIO**: ≥35 dias com venda nos últimos 60d + ≤1 vendas nos últimos 3d
- **BAIXO**: ≥30 dias com venda nos últimos 60d + ≤1 vendas nos últimos 3d

### 2. Página do Relatório
**Arquivo:** `src/app/(dashboard)/relatorios/ruptura-venda-60d/page.tsx`

**Funcionalidades:**
- Filtro por múltiplas filiais
- Agrupamento hierárquico: Segmento → Grupo → Subgrupo → Produtos
- Paginação de resultados
- Exportação para PDF e Excel
- Badges visuais para níveis de ruptura
- Interface colapsável para navegação

**Colunas Exibidas:**
- Filial (ID e Nome)
- Produto (ID e Descrição)
- Estoque Atual
- Curva de Vendas (ABCD)
- Dias com Venda (60 dias)
- Dias com Venda (últimos 3 dias)
- Venda Média Diária
- Valor Estoque Parado
- Nível de Ruptura

### 3. Menu de Navegação
**Arquivo:** `src/components/dashboard/app-sidebar.tsx`

Adicionada nova opção no menu:
```
Relatórios
  ├── Ruptura ABCD
  ├── Venda por Curva
  └── Ruptura Venda 60d  ← NOVO
```

## Dados Utilizados

O relatório utiliza colunas pré-calculadas na tabela `produtos`:

1. **dias_com_venda_60d**: Conta quantos dias DISTINTOS o produto teve venda nos últimos 60 dias
2. **dias_com_venda_ultimos_3d**: Conta quantos dias DISTINTOS o produto teve venda nos últimos 3 dias
3. **venda_media_diaria_60d**: Média de vendas diárias
4. **estoque_atual**: Quantidade em estoque
5. **preco_custo**: Preço de custo do produto

## Performance

- Query otimizada que **NÃO varre** a tabela `vendas`
- Usa apenas dados pré-calculados em `produtos`
- Tempo de execução esperado: < 1 segundo
- Paginação implementada para grandes volumes

## Como Executar a Migration

```bash
# 1. Acessar o Supabase Dashboard
# 2. Ir em SQL Editor
# 3. Executar o conteúdo do arquivo:
supabase/migrations/074_create_ruptura_venda_60d_function.sql

# 4. Executar para cada schema (tenant):
SELECT get_ruptura_venda_60d_report('okilao', NULL, 30, 1, 50);
SELECT get_ruptura_venda_60d_report('paraiso', NULL, 30, 1, 50);
# etc...
```

## Casos de Uso

### Exemplo 1 - Ruptura Crítica
```
Produto: Arroz Tipo 1 5kg
- dias_com_venda_60d: 58 (vendia quase todo dia)
- dias_com_venda_ultimos_3d: 0 (parou completamente)
- estoque_atual: 200 unidades
- Resultado: CRÍTICO - Investigar urgentemente
```

### Exemplo 2 - Não é Ruptura
```
Produto: Produto Sazonal
- dias_com_venda_60d: 15 (venda irregular)
- dias_com_venda_ultimos_3d: 0
- Resultado: Não aparece no relatório (padrão normal)
```

### Exemplo 3 - Vendendo Normalmente
```
Produto: Leite Integral
- dias_com_venda_60d: 60 (vendia todos os dias)
- dias_com_venda_ultimos_3d: 3 (continua vendendo)
- Resultado: Não aparece no relatório (sem ruptura)
```

## Testes Recomendados

1. **Teste com todas as filiais**
   - Verificar se agrupamento hierárquico está correto
   - Validar ordenação alfabética em cada nível

2. **Teste com filiais específicas**
   - Selecionar 1-2 filiais
   - Verificar se filtro está sendo aplicado corretamente

3. **Teste de paginação**
   - Navegar entre páginas
   - Verificar total de registros

4. **Teste de exportação**
   - Exportar para PDF
   - Exportar para Excel
   - Verificar se todos os dados estão presentes

5. **Teste de níveis de ruptura**
   - Verificar badges de cores
   - Confirmar classificação (CRÍTICO, ALTO, MÉDIO, BAIXO)

## Audit Log

O acesso ao módulo é automaticamente registrado na tabela `audit_logs`:
- Módulo: `ruptura_venda_60d`
- Registra: user_id, tenant_id, timestamp

## Próximos Passos

- [ ] Executar migration no Supabase
- [ ] Testar com dados reais de cada tenant
- [ ] Validar performance em produção
- [ ] Adicionar testes automatizados
- [ ] Documentar para usuários finais

## Observações Importantes

⚠️ **Dependências:**
- Requer que as colunas `dias_com_venda_60d`, `dias_com_venda_ultimos_3d` e `venda_media_diaria_60d` estejam sendo atualizadas diariamente na tabela `produtos`
- Se essas colunas não existirem, será necessário criá-las e implementar o processo de atualização

⚠️ **Permissões:**
- Função criada com `GRANT EXECUTE TO authenticated`
- Apenas usuários autenticados podem executar

⚠️ **Schemas:**
- Função deve ser executada uma vez (no schema public)
- Ela aceita o nome do schema como parâmetro dinâmico
