# DRE Comparativo - Hierarquia Completa de Despesas

**Data:** 2026-01-14  
**Implementado por:** Sistema BI SaaS

---

## 📋 Resumo da Implementação

Adicionada hierarquia completa de despesas no DRE Comparativo, similar ao DRE Gerencial:

**ANTES:**
```
(-) DESPESAS OPERACIONAIS
  └─ Departamento (apenas total)
```

**DEPOIS:**
```
(-) DESPESAS OPERACIONAIS
  └─ Departamento
      └─ Tipo de Despesa
          └─ Despesa Individual (nota fiscal, data, valor)
```

---

## 🗂️ Arquivos Modificados

### 1. **Migration SQL**
📁 `supabase/migrations/20260114_add_hierarchical_despesas_dre_comparativo.sql`

**Funções Criadas:**
- `get_dre_comparativo_data_v3()` - Versão com hierarquia (mês/ano)
- `get_dre_comparativo_data_v2_v3()` - Versão com hierarquia (datas customizadas)

**Compatibilidade:**
- ✅ Funções antigas (`get_dre_comparativo_data`, `get_dre_comparativo_data_v2`) redirecionam para novas versões
- ✅ Não quebra código existente

### 2. **API Route**
📁 `src/app/api/dre-comparativo/route.ts`

**Função `buildDRELines()` - Modificada:**
- Processa hierarquia completa de `despesas_json`
- Cria níveis: Departamento (nível 2) → Tipo (nível 3) → Despesa (nível 4)
- Agrupa despesas duplicadas entre contextos
- Ordena por valor (maior para menor)

### 3. **Frontend**
📁 `src/app/(dashboard)/dre-comparativo/page.tsx`

**Nenhuma alteração necessária!**
- O componente já suporta hierarquia expansível via `items` e `expandable`
- Botão de expansão funciona automaticamente

---

## 📊 Estrutura do JSON Retornado

### **Antes (simplificado):**
```json
{
  "despesas_json": [
    {
      "departamento_id": 1,
      "departamento": "Pessoal",
      "valor": 50000
    }
  ]
}
```

### **Depois (hierárquico):**
```json
{
  "despesas_json": [
    {
      "departamento_id": 1,
      "departamento": "Pessoal",
      "valor": 50000,
      "tipos": [
        {
          "tipo_id": 5,
          "tipo": "Salários",
          "valor": 35000,
          "despesas": [
            {
              "descricao": "Folha Janeiro 2025",
              "numero_nota": 12345,
              "serie_nota": "A",
              "data_emissao": "2025-01-05",
              "valor": 35000
            }
          ]
        },
        {
          "tipo_id": 6,
          "tipo": "Encargos Sociais",
          "valor": 15000,
          "despesas": [...]
        }
      ]
    }
  ]
}
```

---

## 🚀 Como Aplicar

### **Passo 1: Executar Migration no Supabase**

```bash
./apply-dre-hierarchical.sh
```

Ou manualmente:

1. Acesse: https://supabase.com/dashboard
2. SQL Editor → New Query
3. Cole o conteúdo de: `supabase/migrations/20260114_add_hierarchical_despesas_dre_comparativo.sql`
4. Execute (RUN)

### **Passo 2: Deploy do Frontend**

```bash
npm run build
# ou
vercel deploy
```

**Nenhuma alteração de código necessária no frontend!**

---

## ✅ Checklist de Validação

Após aplicar a migration, teste:

- [ ] DRE Comparativo carrega sem erros
- [ ] Seção "(-) DESPESAS OPERACIONAIS" aparece
- [ ] Clicar em departamento expande tipos
- [ ] Clicar em tipo expande despesas individuais
- [ ] Valores batem com DRE Gerencial (mesmo período/filial)
- [ ] Despesas mostram nota fiscal, data e valor
- [ ] Comparação entre contextos funciona
- [ ] Exportação PDF funciona (se implementado)

---

## 🔍 Query de Teste

Execute no Supabase SQL Editor para testar:

```sql
-- Testar função v3
SELECT * FROM get_dre_comparativo_data_v3(
  'okilao',           -- schema
  ARRAY[1],           -- filial_id
  1,                  -- mês (janeiro)
  2025                -- ano
);

-- Verificar estrutura do JSON
SELECT 
  despesas_json->>0 AS primeiro_departamento,
  despesas_json->0->'tipos'->0 AS primeiro_tipo,
  despesas_json->0->'tipos'->0->'despesas'->0 AS primeira_despesa
FROM get_dre_comparativo_data_v3(
  'okilao', 
  ARRAY[1], 
  1, 
  2025
);
```

---

## 📈 Performance

**Consulta Otimizada com CTEs:**
1. `despesas_completas` - Join de despesas + tipos + departamentos
2. `despesas_agrupadas` - Agrupa despesas por tipo
3. `tipos_agrupados` - Agrupa tipos por departamento

**Índices Recomendados:**
```sql
CREATE INDEX IF NOT EXISTS idx_despesas_data_filial 
ON {schema}.despesas(data_despesa, filial_id);

CREATE INDEX IF NOT EXISTS idx_despesas_tipo 
ON {schema}.despesas(id_tipo_despesa);

CREATE INDEX IF NOT EXISTS idx_tipos_dept 
ON {schema}.tipos_despesa(departamentalizacao_nivel1);
```

---

## 🐛 Troubleshooting

### **Erro: "function get_dre_comparativo_data_v3 does not exist"**
- Migration não foi executada
- Execute o SQL no Supabase Dashboard

### **Despesas não aparecem expandidas**
- Verifique se há dados de despesas no período
- Confirme que `expandable: true` e `items` estão presentes

### **Valores divergem do DRE Gerencial**
- Verifique filtro de filiais
- Compare período (mês/ano)
- Confirme que `data_despesa` está sendo usada

---

## 🔄 Rollback (se necessário)

Para voltar à versão anterior:

```sql
-- Restaurar função antiga (sem hierarquia)
-- Cole aqui o SQL da migration anterior:
-- supabase/migrations/20251205_update_dre_comparativo_faturamento.sql
```

---

## 📞 Suporte

- **Documentação:** Este arquivo
- **Migration:** `supabase/migrations/20260114_add_hierarchical_despesas_dre_comparativo.sql`
- **API:** `src/app/api/dre-comparativo/route.ts`
- **Script:** `./apply-dre-hierarchical.sh`

---

**Status:** ✅ Pronto para Deploy  
**Breaking Changes:** ❌ Nenhum  
**Testes Necessários:** ✅ Sim (checklist acima)
