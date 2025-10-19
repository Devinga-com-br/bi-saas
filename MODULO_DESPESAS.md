# Módulo de Despesas - Documentação

## Visão Geral

O módulo de Despesas permite visualizar e analisar despesas de forma hierárquica, agrupadas por departamento e tipo de despesa, com gráfico temporal e filtros dinâmicos.

## Arquivos Criados

### Frontend
1. **`src/app/(dashboard)/despesas/page.tsx`**
   - Página principal do módulo
   - Implementa filtros automáticos (sem botão Aplicar)
   - Visualização hierárquica com 3 níveis: Departamento → Tipo → Despesa

2. **`src/components/despesas/chart-despesas.tsx`**
   - Componente de gráfico usando Recharts
   - Exibe evolução mensal das despesas

### Backend
3. **`src/app/api/despesas/hierarquia/route.ts`**
   - API endpoint para buscar dados de despesas
   - Processa dados em estrutura hierárquica
   - Calcula totalizadores

### Database
4. **`supabase/migrations/046_create_despesas_functions.sql`**
   - Funções SQL para consultas de despesas
   - 4 funções principais:
     - `get_despesas_por_mes`: Dados para o gráfico
     - `get_despesas_totalizadores_dept`: Totais por departamento
     - `get_despesas_totalizadores_tipo`: Totais por tipo
     - `get_despesas_hierarquia`: Despesas individuais

## Funcionalidades Implementadas

### ✅ Filtros
- **Filial**: Seleção de filial (obrigatório)
- **Data Inicial**: Calendário para selecionar data inicial
- **Data Final**: Calendário para selecionar data final
- **Tipo de Data**: Dropdown com 3 opções:
  - Data da Despesa
  - Data de Emissão
  - Data de Processamento

**Comportamento**: Filtros aplicam automaticamente ao mudar (sem botão "Aplicar")

### ✅ Gráfico de Despesas por Mês
- Gráfico de barras mostrando evolução mensal
- Eixo X: Meses (Jan/25, Fev/25, etc.)
- Eixo Y: Valor total das despesas
- Tooltip com valores formatados em R$

### ✅ Totalizadores
Exibe 4 cards com:
1. **Total de Despesas**: Soma total + quantidade de registros
2. **Departamentos**: Quantidade de departamentos + tipos
3. **Média por Departamento**: Distribuição média
4. **Período**: Datas selecionadas + filial

### ✅ Listagem Hierárquica
Estrutura em 3 níveis colapsáveis:

**Nível 1: Departamento**
- Nome do departamento
- Valor total
- Quantidade de tipos e despesas
- Expandir/Colapsar

**Nível 2: Tipo de Despesa**
- Descrição do tipo
- Valor total
- Quantidade de despesas
- Expandir/Colapsar

**Nível 3: Despesas Individuais**
- Tabela com colunas:
  - Data
  - Descrição
  - Fornecedor
  - Nota
  - Série
  - Valor
  - Usuário

### ✅ Ordenação
- Departamentos ordenados por valor (maior para menor)
- Tipos ordenados por valor (maior para menor)

### ✅ Exportação
- Botão "Exportar Excel" (funcionalidade placeholder - a implementar)

## Como Usar

### 1. Instalação das Funções SQL

Execute a migration no Supabase:

```bash
# Via Supabase CLI
supabase migration up

# Ou execute manualmente o arquivo:
# supabase/migrations/046_create_despesas_functions.sql
```

**IMPORTANTE**: Certifique-se de que o schema do tenant esteja exposto:
- Acesse: Supabase Dashboard → Settings → API → Exposed schemas
- Adicione o schema (ex: `okilao`, `saoluiz`, etc.)

### 2. Estrutura de Tabelas Necessárias

O módulo requer estas tabelas no schema do tenant:

```sql
-- Departamentos Nível 1
{schema}.departamentos_nivel1
  - id (INTEGER)
  - descricao (TEXT)

-- Tipos de Despesa
{schema}.tipos_despesa
  - id (INTEGER)
  - descricao (TEXT)
  - departamentalizacao_nivel1 (INTEGER) -- FK para departamentos_nivel1

-- Despesas
{schema}.despesas
  - filial_id (INTEGER)
  - data_despesa (DATE)
  - tipo_despesa_id (INTEGER) -- FK para tipos_despesa
  - sequencia (INTEGER)
  - descricao_despesa (TEXT)
  - fornecedor_id (TEXT)
  - numero_nota (BIGINT)
  - serie_nota (TEXT)
  - data_emissao (DATE)
  - valor (NUMERIC)
  - observacao (TEXT)
  - usuario (TEXT)
  - data_processamento (DATE)
```

### 3. Acessar o Módulo

Navegue para: `/despesas`

## Fluxo de Dados

1. **Frontend** → Seleciona filtros (filial, datas, tipo de data)
2. **useEffect** → Detecta mudança nos filtros
3. **API Call** → GET `/api/despesas/hierarquia?schema=xxx&filial_id=1&...`
4. **API Route** → Chama 4 funções RPC do Supabase:
   - `get_despesas_por_mes` → Dados do gráfico
   - `get_despesas_totalizadores_dept` → Totais por departamento
   - `get_despesas_totalizadores_tipo` → Totais por tipo
   - `get_despesas_hierarquia` → Despesas individuais
5. **API Route** → Agrupa dados em estrutura hierárquica
6. **Frontend** → Renderiza gráfico, cards e listagem

## Estrutura da Resposta da API

```json
{
  "totalizador": {
    "valorTotal": 500000.00,
    "qtdRegistros": 1500,
    "qtdDepartamentos": 8,
    "qtdTipos": 45,
    "mediaDepartamento": 62500.00
  },
  "grafico": [
    { "mes": "2025-01", "valor": 250000.00 },
    { "mes": "2025-02", "valor": 250000.00 }
  ],
  "departamentos": [
    {
      "dept_id": 1,
      "dept_descricao": "MANUTENCAO",
      "valor_total": 150000.00,
      "qtd_tipos": 5,
      "qtd_despesas": 450,
      "tipos": [
        {
          "tipo_id": 1,
          "tipo_descricao": "MANUTENCAO PREDIAL",
          "valor_total": 50000.00,
          "qtd_despesas": 120,
          "despesas": [
            {
              "data_despesa": "2025-01-15",
              "descricao_despesa": "Troca de telhas",
              "fornecedor_id": "ABC",
              "numero_nota": 12345,
              "serie_nota": "1",
              "valor": 5000.00,
              "usuario": "joao.silva",
              "observacao": null,
              "data_emissao": "2025-01-15"
            }
          ]
        }
      ]
    }
  ]
}
```

## Performance

### Otimizações Implementadas
- ✅ Filtros aplicam automaticamente (sem clique)
- ✅ Dados agrupados no backend (não no frontend)
- ✅ Funções RPC otimizadas com índices
- ✅ Estrutura hierárquica montada na API
- ✅ Lazy loading com colapsar/expandir

### Índices Recomendados

```sql
-- Para melhor performance, criar índices:
CREATE INDEX IF NOT EXISTS idx_despesas_data_despesa 
  ON {schema}.despesas(data_despesa);

CREATE INDEX IF NOT EXISTS idx_despesas_data_emissao 
  ON {schema}.despesas(data_emissao);

CREATE INDEX IF NOT EXISTS idx_despesas_data_processamento 
  ON {schema}.despesas(data_processamento);

CREATE INDEX IF NOT EXISTS idx_despesas_filial_id 
  ON {schema}.despesas(filial_id);

CREATE INDEX IF NOT EXISTS idx_despesas_tipo_despesa_id 
  ON {schema}.despesas(tipo_despesa_id);

CREATE INDEX IF NOT EXISTS idx_tipos_despesa_departamentalizacao 
  ON {schema}.tipos_despesa(departamentalizacao_nivel1);
```

## UI/UX

### Design Patterns Utilizados
- ✅ Mesma UI do projeto (shadcn/ui)
- ✅ Cards de totalizadores
- ✅ Gráfico responsivo (Recharts)
- ✅ Collapsible hierárquico
- ✅ Loading states (Skeleton)
- ✅ Estados vazios
- ✅ Mensagens de erro
- ✅ Formatação de moeda brasileira

### Responsividade
- Mobile: Filtros em coluna
- Desktop: Filtros em linha
- Tabela com scroll horizontal em telas pequenas

## Próximos Passos (Funcionalidades Futuras)

- [ ] Implementar exportação real para Excel
- [ ] Adicionar ordenação customizada (nome, valor, quantidade)
- [ ] Implementar busca/filtro por descrição
- [ ] Adicionar paginação (se necessário para grandes volumes)
- [ ] Gráfico adicional (Pizza por departamento)
- [ ] Comparação de períodos
- [ ] Drill-down para detalhes de fornecedor
- [ ] Filtro múltiplo de filiais
- [ ] Download de comprovantes/notas

## Troubleshooting

### Erro: "PGRST106 - schema not in search path"
**Solução**: Adicionar schema aos "Exposed schemas" no Supabase Dashboard

### Erro: "function get_despesas_por_mes does not exist"
**Solução**: Executar migration 046_create_despesas_functions.sql

### Erro: "Nenhuma despesa encontrada"
**Possíveis causas**:
- Não há dados no período selecionado
- Schema incorreto
- Relacionamentos entre tabelas quebrados

### Performance lenta
**Soluções**:
- Criar índices recomendados
- Reduzir período de consulta
- Verificar quantidade de dados

## Contato

Para dúvidas ou sugestões sobre o módulo, consulte a documentação do projeto principal.

---

**Última atualização**: 2025-10-18
**Versão**: 1.0.0
