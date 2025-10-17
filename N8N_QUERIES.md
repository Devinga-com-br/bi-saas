# Queries N8N - Documentação

Este documento contém as queries SQL criadas para uso no N8N para automação de mensagens no WhatsApp.

## 1. Vendas Diárias por Filial

**Função:** `get_vendas_diarias_filial`

**Descrição:** Retorna o valor de vendas diário por filial, incluindo meta do dia, valor realizado e percentual de atingimento.

**Parâmetros:**
- `p_schema` (TEXT): Nome do schema do tenant (ex: 'okilao')
- `p_data` (DATE): Data da venda (ex: '2025-10-17')

**Exemplo de uso:**
```sql
SELECT * FROM get_vendas_diarias_filial('okilao', '2025-10-17');
```

**Estrutura do retorno (JSON):**
```json
{
  "filiais": [
    {
      "filial_id": 1,
      "filial_nome": "Matriz",
      "valor_total": 15000.50,
      "meta_dia": 12000.00,
      "valor_realizado": 15000.50,
      "percentual_atingimento": 125.00
    },
    {
      "filial_id": 2,
      "filial_nome": "Filial Centro",
      "valor_total": 8500.25,
      "meta_dia": 10000.00,
      "valor_realizado": 8500.25,
      "percentual_atingimento": 85.00
    }
  ],
  "data_referencia": "2025-10-17",
  "total_geral": 23500.75
}
```

**Migration:** `046_create_n8n_vendas_diarias_function.sql`

**Campos retornados:**
- `filial_id`: ID da filial
- `filial_nome`: Nome da filial
- `valor_total`: Valor total de vendas do dia
- `meta_dia`: Meta de vendas definida para o dia
- `valor_realizado`: Valor realizado (mesmo que valor_total)
- `percentual_atingimento`: Percentual de atingimento da meta (valor_realizado / meta_dia * 100)

**Observações:**
- A query busca dados da tabela `vendas` agrupadas por filial
- As metas são buscadas da tabela `metas` com base no mês/ano da data informada
- Se não houver meta cadastrada para a filial, retorna meta_dia = 0
- Filiais sem venda no dia não aparecem no resultado

---

## 2. Relatório de Venda por Curva ABC

**Função:** `get_relatorio_venda_curva`

**Descrição:** Retorna relatório de vendas agrupado por departamentos (níveis 1, 2 e 3) e produtos, com informações de curva ABC.

**Parâmetros:**
- `p_schema` (TEXT): Nome do schema do tenant
- `p_mes` (INTEGER): Mês da consulta (1-12)
- `p_ano` (INTEGER): Ano da consulta
- `p_filial_id` (TEXT, opcional): ID da filial ou 'all' para todas
- `p_page` (INTEGER, default 1): Número da página
- `p_page_size` (INTEGER, default 50): Tamanho da página

**Exemplo de uso:**
```sql
SELECT * FROM get_relatorio_venda_curva('okilao', 10, 2025, 'all', 1, 50);
```

**Estrutura do retorno (JSON):**
```json
{
  "total_records": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3,
  "departamentos_nivel1": [
    {
      "departamento_id": 100,
      "departamento_nome": "Alimentos",
      "valor_venda": 125000.50,
      "valor_lucro": 25000.10,
      "margem": 20.00,
      "departamentos_nivel2": [
        {
          "departamento_id": 200,
          "departamento_nome": "Mercearia",
          "valor_venda": 80000.00,
          "valor_lucro": 16000.00,
          "margem": 20.00,
          "departamentos_nivel3": [
            {
              "departamento_id": 300,
              "departamento_nome": "Massas",
              "valor_venda": 45000.00,
              "valor_lucro": 9000.00,
              "margem": 20.00,
              "produtos": [
                {
                  "produto_id": 1001,
                  "filial_id": 1,
                  "filial_nome": "1",
                  "codigo": 1001,
                  "descricao": "Macarrão Galo 500g",
                  "quantidade": 500.00,
                  "valor_venda": 2500.00,
                  "curva_venda": "A",
                  "valor_lucro": 500.00,
                  "percentual_lucro": 20.00,
                  "curva_lucro": "B"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Migration:** `050_fix_venda_curva_column_names.sql`

**Campos retornados:**

*Nível Departamento (todos os níveis):*
- `departamento_id`: ID do departamento
- `departamento_nome`: Nome do departamento
- `valor_venda`: Valor total de vendas
- `valor_lucro`: Valor total de lucro
- `margem`: Margem de lucro (%)

*Nível Produto:*
- `produto_id`: ID do produto
- `filial_id`: ID da filial
- `filial_nome`: Nome da filial
- `codigo`: Código do produto
- `descricao`: Descrição do produto
- `quantidade`: Quantidade vendida
- `valor_venda`: Valor de venda total
- `curva_venda`: Classificação curva ABC de venda (A, B, C, D)
- `valor_lucro`: Valor de lucro
- `percentual_lucro`: Percentual de lucro (%)
- `curva_lucro`: Classificação curva ABC de lucro

**Ordenação:**
- Departamentos: Por valor de venda (DESC)
- Produtos: Por curva (A, C, B, D) e depois por valor de venda (DESC)

**Observações:**
- Relatório paginado para performance
- Apenas produtos ativos e com vendas no período são listados
- Hierarquia completa: Dept Nível 1 > Dept Nível 2 > Dept Nível 3 > Produtos
- Produtos sem departamento aparecem como "Sem Departamento Nível X"

---

## Como Aplicar as Migrations

Para aplicar as migrations no banco de dados, você pode:

### Opção 1: Via Supabase Dashboard
1. Acesse o dashboard do Supabase
2. Vá em "SQL Editor"
3. Cole o conteúdo da migration
4. Execute o SQL

### Opção 2: Via psql (Terminal)
```bash
psql "postgresql://postgres.awxrwxuzlixgdpmsybzj:S@Sl261290@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/046_create_n8n_vendas_diarias_function.sql

psql "postgresql://postgres.awxrwxuzlixgdpmsybzj:S@Sl261290@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/050_fix_venda_curva_column_names.sql
```

### Opção 3: Via Supabase CLI (se instalado)
```bash
supabase db push
```

---

## Uso no N8N

### Exemplo de Workflow - Vendas Diárias

**Node: Postgres**
- Operation: Execute Query
- Query:
```sql
SELECT * FROM get_vendas_diarias_filial('{{ $json["schema"] }}', CURRENT_DATE);
```

**Node: Function** (processar JSON)
```javascript
const result = $input.first().json;
const filiais = result.filiais;

// Formatar mensagem para WhatsApp
let mensagem = `📊 *Vendas do Dia ${result.data_referencia}*\n\n`;

filiais.forEach(f => {
  const emoji = f.percentual_atingimento >= 100 ? '✅' : '⚠️';
  mensagem += `${emoji} *${f.filial_nome}*\n`;
  mensagem += `Vendas: R$ ${f.valor_total.toFixed(2)}\n`;
  mensagem += `Meta: R$ ${f.meta_dia.toFixed(2)}\n`;
  mensagem += `Atingimento: ${f.percentual_atingimento.toFixed(1)}%\n\n`;
});

mensagem += `💰 *Total Geral: R$ ${result.total_geral.toFixed(2)}*`;

return { mensagem };
```

**Node: WhatsApp** (Evolution API ou similar)
- Message: `{{ $json["mensagem"] }}`

---

## Tabelas Relacionadas

### Vendas
- Tabela: `{schema}.vendas`
- Campos principais: `id_produto`, `filial_id`, `data_venda`, `quantidade`, `valor_vendas`, `custo_compra`

### Produtos
- Tabela: `{schema}.produtos`
- Campos principais: `id`, `filial_id`, `descricao`, `departamento_id`, `curva_abcd`, `curva_lucro`

### Departamentos
- Tabela: `{schema}.departments_level_1`
- Tabela: `{schema}.departments_level_2`
- Tabela: `{schema}.departments_level_3`
- Relação: via campo `departamento_id` (não `id`)

### Metas
- Tabela: `metas` (schema public)
- Campos principais: `tenant_id`, `branch_id`, `mes`, `ano`, `valor_meta`

---

## Changelog

- **2025-10-17**: Criação da documentação
- **2025-10-17**: Adicionada query de Vendas Diárias por Filial
- **2025-10-17**: Adicionada query de Relatório de Venda por Curva ABC

