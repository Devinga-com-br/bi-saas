# Instruções para Implementar o Relatório de Venda por Curva

## Passo 1: Executar a Migration no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `EXECUTE_THIS_IN_SUPABASE.sql` (na raiz do projeto)
4. Cole TODO o conteúdo no SQL Editor
5. Clique em **RUN**

## Passo 2: Testar a Função Diretamente no Supabase

Depois de executar a migration, teste a função com este comando no SQL Editor:

```sql
SELECT * FROM get_venda_curva_report('okilao', 9, 2025, 1, 1, 10);
```

**Parâmetros:**
- `'okilao'` = schema do cliente
- `9` = mês (setembro)
- `2025` = ano
- `1` = filial_id (use NULL para todas as filiais)
- `1` = página
- `10` = registros por página

**Resultado Esperado:**
A função deve retornar registros com esta estrutura:

| tipo | nome | segmento_pai | codigo_produto | quantidade_vendida | valor_vendido | lucro_total | percentual_lucro | curva_erp | curva_calculada | curva_lucro |
|------|------|--------------|----------------|-------------------|---------------|-------------|------------------|-----------|-----------------|-------------|
| nivel_3 | ACOUGUE - FELIPE | NULL | NULL | NULL | 123456.78 | 12345.67 | 10.00 | NULL | NULL | NULL |
| nivel_2 | ACOUGUE | ACOUGUE - FELIPE | NULL | NULL | 100000.00 | 10000.00 | 10.00 | NULL | NULL | NULL |
| nivel_1 | CARNE BANDEJA | ACOUGUE | NULL | NULL | 50000.00 | 5000.00 | 10.00 | NULL | NULL | NULL |
| produto | BAND LING DEF KG | CARNE BANDEJA | 89835 | 76.14 | 2282.63 | 958.29 | 41.98 | A | A | A |

## Passo 3: Testar a API

Depois que a função estiver funcionando no Supabase, reinicie o servidor Next.js:

```bash
npm run dev
```

E acesse no navegador ou via curl:

```
http://localhost:3000/relatorios/venda-curva
```

Ou teste a API diretamente:

```bash
curl "http://localhost:3000/api/relatorios/venda-curva?schema=okilao&mes=9&ano=2025&filial_id=1&page=1&page_size=10"
```

## Passo 4: Verificar os Logs

Monitore os logs do servidor para ver se os dados estão sendo processados corretamente:

```
[Venda Curva] Calling RPC with params: { p_schema: 'okilao', p_mes: 9, ... }
[Venda Curva] Received XXX rows
```

## Estrutura de Dados Retornada pela API

A API organiza os dados hierarquicamente como o código Python:

```json
{
  "schema": "okilao",
  "mes_referencia": "2025-09-01",
  "filial_id": 1,
  "data_geracao": "2025-10-17T19:00:00.000Z",
  "num_niveis": 3,
  "hierarquia": {
    "ACOUGUE - FELIPE": {
      "nome": "ACOUGUE - FELIPE",
      "nivel": 3,
      "valor_vendido": 123456.78,
      "lucro_total": 12345.67,
      "percentual_lucro": 10.00,
      "filhos": {
        "ACOUGUE": {
          "nome": "ACOUGUE",
          "nivel": 2,
          "valor_vendido": 100000.00,
          "lucro_total": 10000.00,
          "percentual_lucro": 10.00,
          "filhos": {
            "CARNE BANDEJA": {
              "nome": "CARNE BANDEJA",
              "nivel": 1,
              "valor_vendido": 50000.00,
              "lucro_total": 5000.00,
              "percentual_lucro": 10.00,
              "produtos": [
                {
                  "codigo": 89835,
                  "nome": "BAND LING DEF KG",
                  "quantidade_vendida": 76.14,
                  "valor_vendido": 2282.63,
                  "lucro_total": 958.29,
                  "percentual_lucro": 41.98,
                  "curva_erp": "A",
                  "curva_calculada": "A",
                  "curva_lucro": "A"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

## Troubleshooting

### Se a função retornar erro "function does not exist"

Execute novamente o arquivo `EXECUTE_THIS_IN_SUPABASE.sql` no SQL Editor.

### Se não retornar dados

1. Verifique se existem vendas para o mês/ano/filial especificados
2. Verifique se os produtos têm `ativo = true`
3. Verifique se as relações entre tabelas estão corretas

### Se a API retornar hierarquia vazia

Verifique os logs do servidor e procure por erros na organização da hierarquia.

## Próximos Passos

Depois que tudo estiver funcionando:

1. Implementar a interface no frontend para exibir a hierarquia
2. Adicionar paginação
3. Adicionar filtros adicionais
4. Implementar exportação para PDF/Excel
