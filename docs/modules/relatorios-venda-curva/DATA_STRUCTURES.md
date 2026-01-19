# Estruturas de Dados - Vendas por Curva

> Status: ✅ Implementado

## Tipos Principais (Frontend)

### Produto
```ts
interface Produto {
  codigo: number
  descricao: string
  filial_id: number
  qtde: number
  valor_vendas: number
  valor_lucro: number
  percentual_lucro: number
  curva_venda: string
  curva_lucro: string
}
```

### DeptNivel1
```ts
interface DeptNivel1 {
  dept1_id: number
  dept_nivel1: string
  total_vendas: number
  total_lucro: number
  margem: number
  produtos: Produto[]
}
```

### DeptNivel2
```ts
interface DeptNivel2 {
  dept2_id: number
  dept_nivel2: string
  total_vendas: number
  total_lucro: number
  margem: number
  nivel1: DeptNivel1[]
}
```

### DeptNivel3
```ts
interface DeptNivel3 {
  dept3_id: number
  dept_nivel3: string
  total_vendas: number
  total_lucro: number
  margem: number
  nivel2: DeptNivel2[]
}
```

### ReportData
```ts
interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  hierarquia: DeptNivel3[]
}
```

## Tipos de Retorno da RPC (Banco)

```sql
RETURNS TABLE(
  dept_nivel3 text,
  dept_nivel2 text,
  dept_nivel1 text,
  produto_codigo bigint,
  produto_descricao text,
  filial_id bigint,
  qtde numeric,
  valor_vendas numeric,
  valor_lucro numeric,
  percentual_lucro numeric,
  curva_venda text,
  curva_lucro text
)
```

## Estrutura da Resposta da API

```json
{
  "total_records": 12,
  "page": 1,
  "page_size": 50,
  "total_pages": 1,
  "hierarquia": [
    {
      "dept3_id": 123,
      "dept_nivel3": "MERCEARIA",
      "total_vendas": 150000.25,
      "total_lucro": 25000.12,
      "margem": 16.67,
      "nivel2": [
        {
          "dept2_id": 456,
          "dept_nivel2": "BÁSICOS",
          "total_vendas": 80000.00,
          "total_lucro": 12000.00,
          "margem": 15.00,
          "nivel1": [
            {
              "dept1_id": 789,
              "dept_nivel1": "ARROZ",
              "total_vendas": 30000.00,
              "total_lucro": 4500.00,
              "margem": 15.00,
              "produtos": [
                {
                  "codigo": 1001,
                  "descricao": "ARROZ TIPO 1 5KG",
                  "filial_id": 1,
                  "qtde": 120.5,
                  "valor_vendas": 9500.00,
                  "valor_lucro": 1500.00,
                  "percentual_lucro": 15.79,
                  "curva_venda": "A",
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

## Relações de Dados

- `vendas.id_produto` + `vendas.filial_id` -> `produtos.id` + `produtos.filial_id`
- `produtos.departamento_id` -> `departments_level_1.departamento_id`
- `departments_level_1.pai_level_2_id` -> `departments_level_2.departamento_id`
- `departments_level_1.pai_level_3_id` -> `departments_level_3.departamento_id`

## Observações

- `curva_venda` é derivada de `produtos.curva_abcd` (fallback para `D`).
- `curva_lucro` é derivada de `produtos.curva_lucro` (fallback para `D`).
- A API transforma dados planos da RPC em hierarquia de departamentos.
