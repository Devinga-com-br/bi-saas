# Queries para Integração N8N

Este documento contém queries SQL documentadas para uso em integrações N8N com WhatsApp e outras automações.

## Índice
- [Vendas Diárias por Filial com Metas](#vendas-diarias-por-filial-com-metas)

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

## Histórico de Atualizações

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-10-17 | 1.0 | Criação inicial - Query de vendas diárias com metas |

