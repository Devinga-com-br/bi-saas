# Queries para Integração N8N

Este documento contém queries SQL documentadas para uso em integrações N8N com WhatsApp e outras automações.

## Índice
- [Vendas Diárias por Filial (WhatsApp)](#vendas-diarias-por-filial-whatsapp)
- [Vendas Diárias por Filial com Metas](#vendas-diarias-por-filial-com-metas)
- [Relatório de Venda por Curva ABC](#relatorio-de-venda-por-curva-abc)

---

## Vendas Diárias por Filial (WhatsApp)

### Descrição
Query simplificada que retorna vendas diárias por filial com meta, valor realizado e percentual de atingimento. Ideal para disparo automático via WhatsApp.

### Uso
Enviar notificações diárias via WhatsApp sobre vendas e metas.

### Parâmetros
- `p_schema` (TEXT): Schema do tenant (ex: 'okilao')
- `p_data` (DATE): Data para consulta (formato: 'YYYY-MM-DD')

### Query SQL (Migration 046)

```sql
SELECT get_vendas_diarias_por_filial('okilao'::text, '2025-10-17'::date);
```

### Estrutura da Função

Localização: `supabase/migrations/046_create_n8n_vendas_diarias_function.sql`

### Retorno JSON

```json
{
  "data": "2025-10-17",
  "filiais": [
    {
      "filial_id": 1,
      "filial_nome": "Filial 01",
      "valor_total": 15000.50,
      "meta_dia": 20000.00,
      "valor_realizado": 15000.50,
      "percentual_atingimento": 75.00
    }
  ],
  "total_geral": 45000.00,
  "meta_total": 60000.00,
  "percentual_total": 75.00
}
```

### Exemplo de Uso no N8N

**Node: Postgres**
```sql
SELECT get_vendas_diarias_por_filial(
  '{{ $json.tenant_schema }}'::text,
  CURRENT_DATE::date
);
```

**Node: Function (processar resultado)**
```javascript
const resultado = $input.item.json.get_vendas_diarias_por_filial;
const filiais = resultado.filiais;

// Gerar mensagens formatadas
return filiais.map(filial => ({
  json: {
    telefone: filial.telefone_gerente, // buscar de outra fonte
    mensagem: `📊 *Vendas ${resultado.data}*\n\n` +
              `🏪 ${filial.filial_nome}\n` +
              `💰 Vendas: R$ ${filial.valor_total.toFixed(2)}\n` +
              `🎯 Meta: R$ ${filial.meta_dia.toFixed(2)}\n` +
              `📈 Atingimento: ${filial.percentual_atingimento.toFixed(2)}%\n` +
              `${filial.percentual_atingimento >= 100 ? '✅ META ATINGIDA!' : '⚠️ Abaixo da meta'}`
  }
}));
```

### Template de Mensagem WhatsApp

```
📊 *Relatório de Vendas - {{data}}*

{{#each filiais}}
🏪 *{{filial_nome}}*
💰 Vendas: R$ {{formatNumber valor_total decimals=2}}
🎯 Meta: R$ {{formatNumber meta_dia decimals=2}}
📈 Atingimento: {{formatNumber percentual_atingimento decimals=2}}%
{{#if (gte percentual_atingimento 100)}}✅ META ATINGIDA{{else}}⚠️ Abaixo da meta{{/if}}

{{/each}}

━━━━━━━━━━━━━━━━━━
*TOTAL CONSOLIDADO*
💰 R$ {{formatNumber total_geral decimals=2}}
🎯 Meta: R$ {{formatNumber meta_total decimals=2}}
📈 {{formatNumber percentual_total decimals=2}}% do total
```

---

## Vendas Diárias por Filial com Metas

### Descrição
Query que retorna os dados de vendas diárias por filial incluindo:
- Informações da filial (código e nome)
- Valor total de vendas do dia
- Meta do dia
- Valor realizado
- Percentual de atingimento da meta

### Uso
Esta query é utilizada para enviar notificações diárias via WhatsApp sobre o desempenho de vendas de cada filial.

### Parâmetros
- `p_schema`: Schema do tenant no Supabase (ex: 'tenant_abc123')
- `p_data`: Data específica para consulta (formato: 'YYYY-MM-DD')

### Query SQL (Function)

```sql
-- Query: Vendas Diárias por Filial com Metas
-- Retorna JSON com dados de vendas e metas por filial para uma data específica

CREATE OR REPLACE FUNCTION get_vendas_diarias_com_metas(
  p_schema TEXT,
  p_data DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  EXECUTE format('
    SELECT jsonb_agg(
      jsonb_build_object(
        ''filial_id'', v.filial_id,
        ''filial_codigo'', b.branch_code,
        ''data'', v.data_venda,
        ''vendas'', jsonb_build_object(
          ''valor_total'', COALESCE(v.valor_total, 0),
          ''custo_total'', COALESCE(v.custo_total, 0),
          ''total_lucro'', COALESCE(v.total_lucro, 0),
          ''total_transacoes'', COALESCE(v.total_transacoes, 0),
          ''ticket_medio'', CASE 
            WHEN COALESCE(v.total_transacoes, 0) > 0 
            THEN ROUND(v.valor_total / v.total_transacoes, 2)
            ELSE 0 
          END
        ),
        ''meta'', jsonb_build_object(
          ''valor_meta'', COALESCE(m.valor_meta, 0),
          ''valor_realizado'', COALESCE(m.valor_realizado, 0),
          ''percentual_atingimento'', CASE
            WHEN COALESCE(m.valor_meta, 0) > 0
            THEN ROUND((m.valor_realizado / m.valor_meta) * 100, 2)
            ELSE 0
          END,
          ''diferenca'', COALESCE(m.diferenca, 0),
          ''status'', CASE
            WHEN m.valor_realizado >= m.valor_meta THEN ''atingida''
            WHEN m.valor_realizado >= (m.valor_meta * 0.9) THEN ''proximo''
            ELSE ''abaixo''
          END
        )
      )
    )
    FROM %I.vendas_diarias_por_filial v
    INNER JOIN public.branches b ON b.branch_code = v.filial_id::text
    LEFT JOIN %I.metas_mensais m ON m.filial_id = v.filial_id AND m.data = v.data_venda
    WHERE v.data_venda = $1
      AND b.tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = $2)
    ORDER BY v.filial_id
  ', p_schema, p_schema)
  INTO v_result
  USING p_data, p_schema;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_vendas_diarias_com_metas(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendas_diarias_com_metas(TEXT, DATE) TO service_role;
```

### Exemplo de Uso

#### No Supabase (via RPC):
```javascript
const { data, error } = await supabase.rpc('get_vendas_diarias_com_metas', {
  p_schema: 'tenant_abc123',
  p_data: '2025-10-17'
})
```

#### No N8N (Postgres Node):
```sql
SELECT get_vendas_diarias_com_metas('tenant_abc123', '2025-10-17')
```

### Exemplo de Resposta JSON

```json
[
  {
    "filial_id": 1,
    "filial_codigo": "FIL001",
    "data": "2025-10-17",
    "vendas": {
      "valor_total": 15000.00,
      "custo_total": 9000.00,
      "total_lucro": 6000.00,
      "total_transacoes": 150,
      "ticket_medio": 100.00
    },
    "meta": {
      "valor_meta": 14000.00,
      "valor_realizado": 15000.00,
      "percentual_atingimento": 107.14,
      "diferenca": 1000.00,
      "status": "atingida"
    }
  },
  {
    "filial_id": 2,
    "filial_codigo": "FIL002",
    "data": "2025-10-17",
    "vendas": {
      "valor_total": 8500.00,
      "custo_total": 5100.00,
      "total_lucro": 3400.00,
      "total_transacoes": 95,
      "ticket_medio": 89.47
    },
    "meta": {
      "valor_meta": 10000.00,
      "valor_realizado": 8500.00,
      "percentual_atingimento": 85.00,
      "diferenca": -1500.00,
      "status": "abaixo"
    }
  }
]
```

### Campos do Resultado

#### Nível Raiz
- `filial_id` (bigint): ID numérico da filial
- `filial_codigo` (string): Código da filial (ex: "FIL001")
- `data` (date): Data da venda

#### Objeto `vendas`
- `valor_total` (numeric): Valor total de vendas do dia
- `custo_total` (numeric): Custo total dos produtos vendidos
- `total_lucro` (numeric): Lucro total (valor_total - custo_total)
- `total_transacoes` (numeric): Número de transações
- `ticket_medio` (numeric): Ticket médio (valor_total / total_transacoes)

#### Objeto `meta`
- `valor_meta` (numeric): Meta de vendas estabelecida para o dia
- `valor_realizado` (numeric): Valor efetivamente vendido
- `percentual_atingimento` (numeric): Percentual da meta atingido
- `diferenca` (numeric): Diferença entre realizado e meta
- `status` (string): Status da meta
  - `"atingida"`: Meta atingida (100%+)
  - `"proximo"`: Próximo da meta (90%-99%)
  - `"abaixo"`: Abaixo da meta (<90%)

### Fluxo N8N Sugerido

1. **Schedule Trigger**: Executar diariamente às 20h
2. **Postgres Node**: Executar a query acima
3. **Function Node**: Processar o JSON e formatar mensagens
4. **Split In Batches**: Processar cada filial individualmente
5. **WhatsApp Node**: Enviar mensagem formatada

### Exemplo de Mensagem WhatsApp

```
📊 *Resumo de Vendas - {{filial_codigo}}*
📅 Data: {{data}}

💰 *Vendas do Dia*
• Valor Total: R$ {{vendas.valor_total}}
• Transações: {{vendas.total_transacoes}}
• Ticket Médio: R$ {{vendas.ticket_medio}}

🎯 *Meta do Dia*
• Meta: R$ {{meta.valor_meta}}
• Realizado: R$ {{meta.valor_realizado}}
• Atingimento: {{meta.percentual_atingimento}}%
• Diferença: R$ {{meta.diferenca}}

{{#if meta.status === 'atingida'}}
✅ *Meta Atingida!* Parabéns! 🎉
{{else if meta.status === 'proximo'}}
⚠️ *Quase lá!* Faltam {{meta.diferenca * -1}} para a meta.
{{else}}
❌ *Abaixo da Meta* - Precisamos melhorar!
{{/if}}
```

### Notas de Implementação

1. **Performance**: A query utiliza JOIN com a tabela `branches` e LEFT JOIN com `metas_mensais`
2. **Segurança**: A função tem `SECURITY DEFINER` para acesso cross-schema
3. **Tenant Isolation**: Filtro por tenant_id garante isolamento de dados
4. **Dados Ausentes**: Se não houver meta cadastrada, retorna 0 nos campos da meta

### Query Alternativa (SQL Direto para N8N)

Se preferir usar SQL direto sem criar a função:

```sql
SELECT jsonb_agg(
  jsonb_build_object(
    'filial_id', v.filial_id,
    'filial_codigo', b.branch_code,
    'data', v.data_venda,
    'vendas', jsonb_build_object(
      'valor_total', COALESCE(v.valor_total, 0),
      'custo_total', COALESCE(v.custo_total, 0),
      'total_lucro', COALESCE(v.total_lucro, 0),
      'total_transacoes', COALESCE(v.total_transacoes, 0),
      'ticket_medio', CASE 
        WHEN COALESCE(v.total_transacoes, 0) > 0 
        THEN ROUND(v.valor_total / v.total_transacoes, 2)
        ELSE 0 
      END
    ),
    'meta', jsonb_build_object(
      'valor_meta', COALESCE(m.valor_meta, 0),
      'valor_realizado', COALESCE(m.valor_realizado, 0),
      'percentual_atingimento', CASE
        WHEN COALESCE(m.valor_meta, 0) > 0
        THEN ROUND((m.valor_realizado / m.valor_meta) * 100, 2)
        ELSE 0
      END,
      'diferenca', COALESCE(m.diferenca, 0),
      'status', CASE
        WHEN m.valor_realizado >= m.valor_meta THEN 'atingida'
        WHEN m.valor_realizado >= (m.valor_meta * 0.9) THEN 'proximo'
        ELSE 'abaixo'
      END
    )
  )
)
FROM tenant_schema.vendas_diarias_por_filial v
INNER JOIN public.branches b ON b.branch_code = v.filial_id::text
LEFT JOIN tenant_schema.metas_mensais m ON m.filial_id = v.filial_id AND m.data = v.data_venda
WHERE v.data_venda = '2025-10-17'
  AND b.tenant_id = 'your-tenant-uuid'
ORDER BY v.filial_id;
```

**Nota**: Substitua `tenant_schema` pelo schema real e `your-tenant-uuid` pelo UUID do tenant.

---

---

## Relatório de Venda por Curva ABC

### Descrição
Relatório completo de vendas agrupado por departamentos hierárquicos (níveis 1, 2, 3) com detalhamento de produtos, ordenado por curva ABC de vendas e lucro.

### Uso
Análise detalhada de vendas por categoria de produtos, identificando os itens de maior rotatividade e lucratividade.

### Parâmetros
- `p_schema` (TEXT): Schema do tenant
- `p_mes` (INTEGER): Mês da consulta (1-12)
- `p_ano` (INTEGER): Ano da consulta
- `p_filial_id` (TEXT, opcional): ID da filial ou 'all' para todas (padrão: NULL/'all')
- `p_page` (INTEGER, opcional): Número da página (padrão: 1)
- `p_page_size` (INTEGER, opcional): Registros por página (padrão: 50)

### Query SQL (Migration 047/049)

```sql
SELECT get_relatorio_venda_curva(
  'okilao'::text,      -- schema
  10::integer,          -- mês
  2025::integer,        -- ano
  'all'::text,          -- filial_id (ou número específico)
  1::integer,           -- página
  50::integer           -- registros por página
);
```

### Estrutura da Função

Localização: `supabase/migrations/049_fix_venda_curva_complete.sql`

### Retorno JSON

```json
{
  "total_records": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3,
  "departamentos_nivel1": [
    {
      "departamento_id": 100,
      "departamento_nome": "ALIMENTOS",
      "valor_venda": 150000.00,
      "valor_lucro": 30000.00,
      "margem": 20.00,
      "departamentos_nivel2": [
        {
          "departamento_id": 110,
          "departamento_nome": "MERCEARIA",
          "valor_venda": 80000.00,
          "valor_lucro": 16000.00,
          "margem": 20.00,
          "departamentos_nivel3": [
            {
              "departamento_id": 111,
              "departamento_nome": "CEREAIS",
              "valor_venda": 50000.00,
              "valor_lucro": 10000.00,
              "margem": 20.00,
              "produtos": [
                {
                  "produto_id": 1001,
                  "filial_id": 1,
                  "filial_nome": "1",
                  "codigo": 1001,
                  "descricao": "ARROZ TIPO 1 5KG",
                  "quantidade": 500,
                  "valor_venda": 12500.00,
                  "curva_venda": "A",
                  "valor_lucro": 2500.00,
                  "percentual_lucro": 20.00,
                  "curva_lucro": "A"
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

### Campos do Resultado

#### Metadados de Paginação
- `total_records` (integer): Total de departamentos nível 3
- `page` (integer): Página atual
- `page_size` (integer): Registros por página
- `total_pages` (integer): Total de páginas

#### Departamento Nível 1 (Categoria Principal)
- `departamento_id` (bigint): ID do departamento
- `departamento_nome` (text): Nome do departamento
- `valor_venda` (numeric): Valor total de vendas
- `valor_lucro` (numeric): Lucro total
- `margem` (numeric): Margem de lucro em percentual

#### Departamento Nível 2 (Subcategoria)
Mesmos campos do nível 1, aninhado em `departamentos_nivel2[]`

#### Departamento Nível 3 (Seção)
Mesmos campos do nível 1, aninhado em `departamentos_nivel3[]`

#### Produtos (array dentro de cada nível 3)
- `produto_id` (bigint): ID do produto
- `filial_id` (bigint): ID da filial
- `filial_nome` (text): Nome/código da filial
- `codigo` (bigint): Código do produto
- `descricao` (text): Descrição do produto
- `quantidade` (numeric): Quantidade total vendida
- `valor_venda` (numeric): Valor total de vendas
- `curva_venda` (text): Curva ABC de vendas (A, B, C, D)
- `valor_lucro` (numeric): Lucro total
- `percentual_lucro` (numeric): Percentual de lucro
- `curva_lucro` (varchar): Curva ABC de lucro

### Ordenação dos Dados

1. **Departamentos**: Por valor de venda (DESC)
   - Nível 1 → Nível 2 → Nível 3
2. **Produtos**: Por curva de venda e valor
   - Curva A → C → B → D
   - Dentro de cada curva: maior valor primeiro

### Exemplo de Uso no N8N

**Node: Postgres**
```sql
SELECT get_relatorio_venda_curva(
  'okilao'::text,
  EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::integer,
  EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::integer,
  'all'::text,
  1::integer,
  100::integer
);
```

**Node: Function (processar e agrupar dados)**
```javascript
const resultado = $input.item.json.get_relatorio_venda_curva;
const departamentos = resultado.departamentos_nivel1;

// Extrair todos os produtos de curva A
const produtosCurvaA = [];

departamentos.forEach(d1 => {
  d1.departamentos_nivel2?.forEach(d2 => {
    d2.departamentos_nivel3?.forEach(d3 => {
      const curvaA = d3.produtos?.filter(p => p.curva_venda === 'A') || [];
      produtosCurvaA.push(...curvaA);
    });
  });
});

return {
  json: {
    total_produtos_curva_a: produtosCurvaA.length,
    valor_total_curva_a: produtosCurvaA.reduce((sum, p) => sum + p.valor_venda, 0),
    produtos: produtosCurvaA
  }
};
```

### Integração com Dashboards

Esta query pode ser usada para gerar relatórios automáticos em PDF ou Excel via N8N:

1. **Schedule**: Executar mensalmente (dia 1 de cada mês)
2. **Postgres**: Buscar dados do mês anterior
3. **Function**: Formatar dados em HTML/Excel
4. **Email/WhatsApp**: Enviar relatório para gestores

### Performance

- **Índices utilizados**: 
  - `idx_vendas_data_filial`
  - `idx_produtos_departamento`
  - `departments_level_X` unique indexes
- **Paginação**: Nível 3 é paginado para evitar timeouts
- **Estimativa de tempo**: ~1-3 segundos para 10k produtos

### Aplicação da Migration

Para aplicar/corrigir a função:

```bash
# Via Supabase CLI
npx supabase db push

# Ou aplicar migration específica
npx supabase migration up 049_fix_venda_curva_complete
```

---

## Histórico de Atualizações

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-10-17 | 1.0 | Criação inicial - Query de vendas diárias com metas |
| 2025-10-17 | 1.1 | Adicionada query de vendas diárias simplificada (WhatsApp) |
| 2025-10-17 | 1.2 | Adicionado relatório de venda por curva ABC |

