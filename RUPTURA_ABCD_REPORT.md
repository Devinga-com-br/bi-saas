# Relatório de Ruptura por Curva ABCD

## 📊 Visão Geral

Relatório performático para análise de produtos com ruptura de estoque (estoque zero ou negativo) organizados por curva ABCD, com agrupamento por departamento nível 1.

## ✨ Funcionalidades

### Filtros Disponíveis
- **Filial**: Filtrar por filial específica ou visualizar todas
- **Curvas ABCD**: Selecionar múltiplas curvas (A, B, C, D) - padrão: A e B
- **Apenas Ativos**: Filtrar apenas produtos ativos - padrão: sim
- **Apenas Ruptura**: Filtrar apenas produtos com estoque ≤ 0 - padrão: sim
- **Busca**: Buscar produtos por nome/descrição

### Visualização
- **Agrupamento por Departamento**: Produtos organizados por departamento nível 1
- **Colapsar/Expandir**: Cada grupo de departamento pode ser colapsado
- **Paginação**: 50 produtos por página para performance otimizada
- **Contadores**: Total de rupturas e produtos por departamento

### Dados Exibidos
Para cada produto:
- **Código**: ID do produto
- **Descrição**: Nome completo do produto
- **Curva Lucro**: Classificação por lucro (A, B, C, D) com cores
- **Curva Venda**: Classificação por volume de vendas (A, B, C, D) com cores
- **Estoque**: Quantidade em estoque (negativo em vermelho)
- **Fil. Transf.**: Filial com maior estoque disponível para transferência
- **Est. Transf.**: Quantidade disponível na filial de transferência (em verde)

### Inteligência de Transferência
O relatório automaticamente identifica oportunidades de transferência:
- Busca em todas as outras filiais produtos com estoque disponível
- Mostra a filial com **maior estoque** do produto
- Exibe `-` quando não há estoque em nenhuma outra filial
- Considera apenas produtos **ativos** nas outras filiais
- Destaca em **verde** o estoque disponível para transferência

## 🚀 Arquitetura

### Estrutura de Arquivos

```
src/
├── app/
│   ├── api/relatorios/ruptura-abcd/
│   │   └── route.ts                    # API endpoint
│   └── (dashboard)/relatorios/ruptura-abcd/
│       └── page.tsx                     # Página do relatório
supabase/
└── migrations/
    └── 014_create_ruptura_report_function.sql  # Função SQL
```

### Banco de Dados

#### Função RPC: `get_ruptura_abcd_report`

**Parâmetros:**
- `p_schema` (TEXT): Schema do tenant
- `p_filial_id` (BIGINT): ID da filial (opcional)
- `p_curvas` (TEXT[]): Array de curvas (A, B, C, D)
- `p_apenas_ativos` (BOOLEAN): Filtrar apenas ativos
- `p_apenas_ruptura` (BOOLEAN): Filtrar apenas ruptura
- `p_departamento_id` (BIGINT): ID do departamento (opcional)
- `p_busca` (TEXT): Termo de busca (opcional)
- `p_page` (INTEGER): Número da página
- `p_page_size` (INTEGER): Tamanho da página

**Retorna:**
- Total de registros
- Dados agrupados por departamento
- Produtos com informações completas

#### Otimizações
- **Índices utilizados**:
  - `idx_produtos_ruptura_abcd` (filial, curva, estoque, ativo, departamento)
  - `idx_produtos_departamento` (departamento_id)
  - `idx_produtos_id_filial` (id, filial_id)

- **Query otimizada**:
  - LEFT JOIN com departments_level_1
  - WHERE otimizado para usar índices
  - ORDER BY por departamento e curva
  - LIMIT/OFFSET para paginação

### API Route

**Endpoint**: `GET /api/relatorios/ruptura-abcd`

**Query Parameters:**
```
schema=sol               # Schema do tenant
filial_id=1             # ID da filial (opcional)
curvas=A,B              # Curvas separadas por vírgula
apenas_ativos=true      # Boolean
apenas_ruptura=true     # Boolean
departamento_id=10      # ID do departamento (opcional)
busca=arroz             # Termo de busca (opcional)
page=1                  # Número da página
page_size=50            # Tamanho da página
```

**Resposta:**
```json
{
  "total_records": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3,
  "departamentos": [
    {
      "departamento_id": 1,
      "departamento_nome": "MERCEARIA",
      "produtos": [
        {
          "produto_id": 12345,
          "produto_descricao": "ARROZ BRANCO 5KG",
          "curva_lucro": "A",
          "curva_venda": "A",
          "estoque_atual": -5.50,
          "venda_media_diaria_60d": 2.30,
          "dias_de_estoque": null,
          "preco_venda": 25.90
        }
      ]
    }
  ]
}
```

## 🎨 Interface do Usuário

### Componentes Utilizados
- **Card**: Container principal e grupos de departamento
- **Table**: Listagem de produtos
- **Collapsible**: Expandir/colapsar departamentos
- **Badge**: Curvas e contadores
- **Checkbox**: Filtros booleanos
- **MultiSelect**: Seleção de filiais e curvas
- **Skeleton**: Loading states

### Estados de Loading
- Skeleton screens durante carregamento
- Estados vazios amigáveis
- Mensagens de erro claras

### Responsividade
- Grid adaptativo para filtros
- Tabela responsiva com scroll horizontal
- Layout mobile-friendly

## 📈 Performance

### Otimizações Implementadas
1. **Paginação**: Carrega apenas 50 registros por vez
2. **Índices**: Queries otimizadas com índices específicos
3. **Lazy Loading**: Dados carregados sob demanda
4. **Colapso de Grupos**: Reduz quantidade de DOM renderizado
5. **Filtros Server-Side**: Processamento no banco de dados

### Métricas Esperadas
- **Query Time**: < 500ms para 50 registros
- **Total Records**: Contagem otimizada com COUNT(*)
- **Memory**: Baixo consumo com paginação
- **UI**: Renderização rápida com virtualization de grupos

## 🔧 Aplicar Migração

### Via Supabase Dashboard
1. Acesse o SQL Editor no Supabase
2. Execute o conteúdo de `supabase/migrations/014_create_ruptura_report_function.sql`
3. Verifique se a função foi criada com sucesso

### Via Supabase CLI
```bash
supabase db push
```

## 📝 Uso

1. Acesse **Relatórios > Ruptura ABCD** no menu lateral
2. Configure os filtros desejados:
   - Selecione filial (ou deixe "Todas")
   - Escolha as curvas (padrão: A e B)
   - Marque/desmarque opções de ativos e ruptura
   - Use a busca para encontrar produtos específicos
3. Clique em "Aplicar Filtros"
4. Navegue pelos departamentos (clique para expandir/colapsar)
5. Use a paginação para ver mais resultados

## 🐛 Troubleshooting

### Problema: Nenhum produto encontrado
- Verifique se existem produtos com as curvas selecionadas
- Confirme que a filial selecionada tem produtos
- Tente desmarcar "Apenas Ruptura" para ver todos os produtos

### Problema: Performance lenta
- Verifique se os índices foram criados corretamente
- Reduza o page_size se necessário
- Use filtros mais específicos (filial, departamento, curva)

### Problema: Erro ao carregar dados
- Confirme que a migração foi aplicada
- Verifique permissões do usuário no Supabase
- Check logs do servidor para detalhes do erro

## 🔮 Melhorias Futuras

1. **Export**: Exportar relatório para Excel/PDF
2. **Gráficos**: Visualizações gráficas de ruptura por curva
3. **Alertas**: Notificações de produtos críticos em ruptura
4. **Histórico**: Acompanhar evolução de ruptura ao longo do tempo
5. **Sugestões**: Recomendações de pedidos baseadas em venda média

---

**Data de Criação**: Janeiro 2025
**Versão da Migração**: 014
**Status**: ✅ Implementado e Testado
