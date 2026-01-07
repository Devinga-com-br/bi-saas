# 🔧 Fix: Erro de Validação - Descontos Venda

**Data:** 2026-01-07  
**Problema:** Erro "Dados inválidos" ao tentar lançar descontos  
**Status:** ✅ CORRIGIDO

---

## 📋 Problema Original

### Sintomas:
- Ao clicar em "Lançar Desconto" e preencher o formulário
- API retorna `400 Bad Request` com mensagem "Dados inválidos"
- Console mostra erro genérico sem detalhes

### Causa Raiz:
**Validação Zod incompatível** na API (`/api/descontos-venda/route.ts`):

```typescript
// ❌ ANTES: Não aceitava null
observacao: z.string().max(500).optional()

// Frontend enviava:
{ observacao: null } // ❌ Zod rejeita null em string().optional()
```

**Problema:**
- `optional()` aceita `undefined` mas **NÃO aceita `null`**
- Frontend enviava `null` quando campo vazio (linha 244)
- Zod validação falhava silenciosamente

---

## ✅ Solução Aplicada

### 1. **Correção na Validação Zod** (`route.ts`)

```typescript
// ✅ DEPOIS: Aceita null e undefined
observacao: z.string().max(500).optional().nullable()
```

**Mudança:**
- `.nullable()` permite que o campo seja `null`
- `.optional()` permite que seja `undefined`
- Agora aceita: `null`, `undefined` ou `string`

### 2. **Logs de Debug Aprimorados** (`route.ts`)

```typescript
// Log do payload recebido
console.log('[POST /api/descontos-venda] Request body:', JSON.stringify(body, null, 2))

// Log de erro de validação com detalhes
if (!validation.success) {
  console.error('[POST /api/descontos-venda] Validation failed:', validation.error.flatten())
  return NextResponse.json({
    error: 'Dados inválidos',
    details: validation.error.flatten(), // ✅ Retorna detalhes
    received: body                       // ✅ Mostra o que foi recebido
  }, { status: 400 })
}
```

### 3. **Mensagens de Erro Mais Claras** (`page.tsx`)

```typescript
// Frontend agora exibe erros específicos por campo
if (error.details) {
  const fieldErrors = error.details.fieldErrors || {}
  const formErrors = error.details.formErrors || []
  const errorMessages = [
    ...Object.entries(fieldErrors).map(([field, msgs]) => `${field}: ${msgs}`),
    ...formErrors
  ]
  throw new Error(errorMessages.join(', ') || error.error || 'Erro ao salvar desconto')
}
```

---

## 🧪 Como Testar a Correção

### Teste 1: Lançar Desconto COM Observação
```
1. Acesse /descontos-venda
2. Clique em "Lançar Desconto"
3. Preencha:
   - Filial: Qualquer
   - Data: 2026-01-07
   - Valor Desconto: 100,00
   - Desconto Custo: 50,00
   - Observação: "Teste de desconto"
4. Clique em "Salvar"
✅ Esperado: "Desconto lançado com sucesso!"
```

### Teste 2: Lançar Desconto SEM Observação
```
1. Acesse /descontos-venda
2. Clique em "Lançar Desconto"
3. Preencha:
   - Filial: Qualquer
   - Data: 2026-01-07
   - Valor Desconto: 200,00
   - Desconto Custo: 100,00
   - Observação: (deixe vazio)
4. Clique em "Salvar"
✅ Esperado: "Desconto lançado com sucesso!"
```

### Teste 3: Validação de Campos Obrigatórios
```
1. Acesse /descontos-venda
2. Clique em "Lançar Desconto"
3. Deixe campos vazios e clique em "Salvar"
✅ Esperado: Toast "Preencha todos os campos obrigatórios"
```

### Teste 4: Valores Inválidos
```
1. Tente inserir valores negativos em "Valor Desconto"
✅ Esperado: Erro específico no console e toast detalhado
```

---

## 📊 Validação Zod - Schema Completo

```typescript
const descontoSchema = z.object({
  schema: z.string().min(1).refine(isValidSchema, 'Schema inválido'),
  filial_id: z.number().int().positive('ID da filial inválido'),
  data_desconto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  valor_desconto: z.number().min(0, 'Valor não pode ser negativo'),
  desconto_custo: z.number().min(0, 'Desconto custo não pode ser negativo'),
  observacao: z.string().max(500).optional().nullable(), // ✅ CORRIGIDO
})
```

**Regras de Validação:**
- `schema`: String obrigatória e válida (verificada por `isValidSchema`)
- `filial_id`: Número inteiro positivo
- `data_desconto`: Formato YYYY-MM-DD (ex: 2026-01-07)
- `valor_desconto`: Número ≥ 0
- `desconto_custo`: Número ≥ 0
- `observacao`: String até 500 caracteres, aceita null/undefined

---

## 🔍 Troubleshooting

### Erro: "Schema inválido"
**Causa:** Nome do schema não está na lista de schemas válidos  
**Solução:** Verificar se schema está em `VALID_SCHEMAS` no arquivo `validate-schema.ts`

### Erro: "ID da filial inválido"
**Causa:** `filial_id` não é um número inteiro positivo  
**Solução:** Verificar se `parseInt(formData.filial_id)` retorna número válido

### Erro: "Data inválida"
**Causa:** Formato da data diferente de YYYY-MM-DD  
**Solução:** 
```typescript
// ✅ Correto
data_desconto: "2026-01-07"

// ❌ Errado
data_desconto: "07/01/2026"
data_desconto: "2026-1-7"
```

### Erro: "Valor não pode ser negativo"
**Causa:** `parseFloat()` retornou número negativo ou NaN  
**Solução:** Verificar máscara de input de moeda

### Logs Esperados no Console (Dev):
```
[POST /api/descontos-venda] Request body: {
  "filial_id": 10,
  "data_desconto": "2026-01-07",
  "valor_desconto": 100,
  "desconto_custo": 50,
  "observacao": null,
  "schema": "saoluiz"
}
✅ Validação passou
✅ Desconto criado com sucesso
```

---

## 📦 Arquivos Modificados

1. **`src/app/api/descontos-venda/route.ts`**
   - ✅ Correção do schema Zod: `.nullable()`
   - ✅ Logs de debug aprimorados
   - ✅ Retorno de detalhes de validação

2. **`src/app/(dashboard)/descontos-venda/page.tsx`**
   - ✅ Log do payload enviado
   - ✅ Parsing de erros de validação
   - ✅ Mensagens de erro específicas por campo

3. **`docs/FIX_DESCONTOS_VENDA_VALIDATION.md`** (este arquivo)
   - ✅ Documentação completa da correção

---

## 🚀 Deploy

### Desenvolvimento:
```bash
# Já aplicado - apenas reiniciar dev server
npm run dev
```

### Produção:
```bash
# Build e deploy
npm run build
npm start

# Ou via Vercel
vercel --prod
```

---

## 📖 Referências

- **Zod Documentation:** https://zod.dev/
  - `.optional()` - Permite `undefined`
  - `.nullable()` - Permite `null`
  - `.optional().nullable()` - Permite ambos

- **Arquivos relacionados:**
  - `/api/descontos-venda/route.ts` - API Route
  - `/descontos-venda/page.tsx` - Frontend
  - `/lib/security/validate-schema.ts` - Validação de schema

---

## ✅ Checklist de Validação

- [x] Schema Zod aceita `null` em `observacao`
- [x] Logs de debug adicionados
- [x] Erros de validação retornam detalhes
- [x] Frontend exibe mensagens específicas
- [x] Testado com observação vazia
- [x] Testado com observação preenchida
- [x] Testado com valores inválidos
- [x] Documentação criada

---

**Status:** ✅ **RESOLVIDO**  
**Data da Correção:** 2026-01-07  
**Testado em:** Desenvolvimento (localhost:3000)
