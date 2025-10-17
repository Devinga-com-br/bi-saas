# Quick Reference - N8N Vendas Diárias

## Query Rápida

```sql
SELECT get_vendas_diarias_com_metas('seu_schema', CURRENT_DATE);
```

## Parâmetros

| Parâmetro | Tipo | Exemplo | Descrição |
|-----------|------|---------|-----------|
| p_schema | TEXT | 'tenant_abc123' | Schema do tenant no Supabase |
| p_data | DATE | '2025-10-17' ou CURRENT_DATE | Data das vendas |

## Estrutura Retornada (JSON Array)

```javascript
[
  {
    filial_id: number,        // ID da filial
    filial_codigo: string,    // Código da filial (ex: "FIL001")
    data: string,             // Data (formato: "YYYY-MM-DD")
    vendas: {
      valor_total: number,
      custo_total: number,
      total_lucro: number,
      total_transacoes: number,
      ticket_medio: number
    },
    meta: {
      valor_meta: number,
      valor_realizado: number,
      percentual_atingimento: number,
      diferenca: number,
      status: "atingida" | "proximo" | "abaixo"
    }
  }
]
```

## Status da Meta

| Status | Condição | Ícone Sugerido |
|--------|----------|----------------|
| `atingida` | ≥ 100% | ✅ |
| `proximo` | 90% - 99% | ⚠️ |
| `abaixo` | < 90% | ❌ |

## N8N - Postgres Node

**Query:**
```sql
SELECT get_vendas_diarias_com_metas('{{ $env.TENANT_SCHEMA }}', CURRENT_DATE)
```

**Settings:**
- Mode: Execute Query
- Return Output: JSON

## N8N - HTTP Request (Supabase API)

**Method:** POST  
**URL:** `https://your-project.supabase.co/rest/v1/rpc/get_vendas_diarias_com_metas`

**Headers:**
```json
{
  "apikey": "your-service-role-key",
  "Authorization": "Bearer your-service-role-key",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "p_schema": "tenant_abc123",
  "p_data": "2025-10-17"
}
```

## Template WhatsApp (Simples)

```
📊 *{{filial_codigo}}* - {{data}}

💰 Vendas: R$ {{vendas.valor_total}}
🎯 Meta: R$ {{meta.valor_meta}}
📊 Atingimento: {{meta.percentual_atingimento}}%

{{status_icon}} {{status_text}}
```

## Function Node (Formatação)

```javascript
const items = $input.all();
return items.map(item => {
  const d = item.json;
  const statusIcon = d.meta.status === 'atingida' ? '✅' : 
                     d.meta.status === 'proximo' ? '⚠️' : '❌';
  
  return {
    json: {
      phone: d.phone_number, // adicionar campo
      message: `📊 *${d.filial_codigo}* - ${d.data}

💰 Vendas: R$ ${d.vendas.valor_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
🎯 Meta: R$ ${d.meta.valor_meta.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
📊 Atingimento: ${d.meta.percentual_atingimento}%

${statusIcon} ${d.meta.status === 'atingida' ? 'Meta Atingida!' : d.meta.status === 'proximo' ? 'Quase lá!' : 'Abaixo da Meta'}`
    }
  };
});
```

## Fluxo N8N Recomendado

```
1. Schedule Trigger (Cron: 0 20 * * *)
   ↓
2. Postgres Node (Query acima)
   ↓
3. Function Node (Formatar mensagens)
   ↓
4. Split In Batches (1 item por vez)
   ↓
5. WhatsApp Node (Enviar mensagem)
```

## Testes Rápidos

```sql
-- Teste hoje
SELECT get_vendas_diarias_com_metas('tenant_abc123', CURRENT_DATE);

-- Teste ontem
SELECT get_vendas_diarias_com_metas('tenant_abc123', CURRENT_DATE - 1);

-- Teste formatado
SELECT jsonb_pretty(get_vendas_diarias_com_metas('tenant_abc123', CURRENT_DATE));

-- Count filiais
SELECT jsonb_array_length(get_vendas_diarias_com_metas('tenant_abc123', CURRENT_DATE));
```

## Troubleshooting

### Retorna null ou []
- Verificar se existem vendas na data especificada
- Confirmar que o schema existe e está correto
- Verificar se as filiais estão cadastradas na tabela branches

### Erro de permissão
- Verificar se a função foi criada com `SECURITY DEFINER`
- Confirmar GRANT EXECUTE para authenticated/service_role

### Valores de meta em 0
- Verificar se as metas foram geradas para o mês/ano
- Executar função `generate_metas_mensais` se necessário

## Links Úteis

- [Documentação Completa](./N8N_QUERIES.md)
- [Tests Scripts](./test_vendas_diarias_query.sql)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Migration File](../supabase/migrations/046_create_n8n_vendas_diarias_function.sql)
