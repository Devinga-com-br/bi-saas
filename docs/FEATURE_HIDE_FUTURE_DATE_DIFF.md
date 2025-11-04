# Feature: Ocultar Diferença em Dias Futuros

**Data:** 2025-11-04
**Módulo:** Meta Mensal (`/metas/mensal`)
**Status:** ✅ Implementado

## 📋 Problema

Quando a tabela mostrava dias futuros (D0 = hoje, D+ = dias futuros) que ainda não tiveram vendas, a diferença aparecia **vermelha (negativa)** porque:

```
Valor Realizado = R$ 0,00 (ainda não vendeu)
Valor Meta = R$ 10.000,00
Diferença = 0 - 10.000 = -R$ 10.000,00 (vermelho) ❌
```

**Problema:** Não faz sentido mostrar diferença negativa para um dia que ainda não aconteceu.

## ✅ Solução

Detectar se a data é **hoje ou futura** E se o **realizado é zero**, e nesses casos:
- Não mostrar a diferença em vermelho
- Mostrar um hífen "-" no lugar
- Cor neutra (texto muted)

## 🎯 Lógica Implementada

### Função de Verificação

```typescript
// Verificar se a data é hoje ou futuro
const isTodayOrFuture = (dateString: string): boolean => {
  const metaDate = parseISO(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  metaDate.setHours(0, 0, 0, 0)
  return metaDate >= today
}

// Verificar se deve mostrar diferença
const shouldShowDifference = (meta: Meta): boolean => {
  // Se é hoje ou futuro E realizado é zero, não mostra diferença
  if (isTodayOrFuture(meta.data) && meta.valor_realizado === 0) {
    return false
  }
  return true
}
```

### Quando NÃO Mostrar Diferença

```typescript
// Cenário 1: Dia futuro sem vendas
Data: 2025-11-10 (amanhã)
Realizado: R$ 0,00
→ Mostra: "-" (não mostra diferença)

// Cenário 2: Hoje sem vendas ainda
Data: 2025-11-04 (hoje)
Realizado: R$ 0,00
→ Mostra: "-" (não mostra diferença)

// Cenário 3: Hoje com vendas parciais
Data: 2025-11-04 (hoje)
Realizado: R$ 5.000,00
Meta: R$ 10.000,00
→ Mostra: "-R$ 5.000,00" (mostra diferença normalmente)

// Cenário 4: Dia passado sem vendas
Data: 2025-11-03 (ontem)
Realizado: R$ 0,00
Meta: R$ 10.000,00
→ Mostra: "-R$ 10.000,00" (mostra diferença, pois dia já passou)
```

## 🎨 Implementação

### 1. Tabela Agrupada (Múltiplas Filiais)

**Linha Agregada Principal:**
```tsx
// Verificar se deve mostrar diferença
const isDateFuture = isTodayOrFuture(dateKey)
const hasNoSales = group.total_realizado === 0
const showDifference = !(isDateFuture && hasNoSales)

// Renderizar
<TableCell className="text-right font-semibold">
  {showDifference ? (
    <span className={diferencaValor > 0 ? 'text-green-500' : 'text-red-500'}>
      {formatCurrency(diferencaValor)}
    </span>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

**Linhas Expandidas (Por Filial):**
```tsx
const showMetaDifference = shouldShowDifference(meta)

<TableCell className="text-right text-sm">
  {showMetaDifference ? (
    <span className={metaDiferencaValor > 0 ? 'text-green-500' : 'text-red-500'}>
      {formatCurrency(metaDiferencaValor)}
    </span>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

### 2. Tabela Normal (Filial Única)

```tsx
const showDiff = shouldShowDifference(meta)

<TableCell className="text-right">
  {showDiff ? (
    <span className={diferencaValor > 0 ? 'text-green-500' : 'text-red-500'}>
      {formatCurrency(diferencaValor)}
    </span>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

## 📊 Exemplos Visuais

### Antes (Problema)

```
Data       | Meta        | Realizado   | Diferença      | Dif. %
-----------|-------------|-------------|----------------|----------
03/11/2025 | R$ 10.000   | R$ 12.000   | +R$ 2.000 🟢   | +20.00%
04/11/2025 | R$ 10.000   | R$ 0,00     | -R$ 10.000 🔴  | -100.00% ❌ ERRADO
05/11/2025 | R$ 10.000   | R$ 0,00     | -R$ 10.000 🔴  | -100.00% ❌ ERRADO
```

### Depois (Correto)

```
Data       | Meta        | Realizado   | Diferença   | Dif. %
-----------|-------------|-------------|-------------|--------
03/11/2025 | R$ 10.000   | R$ 12.000   | +R$ 2.000 🟢| +20.00%
04/11/2025 | R$ 10.000   | R$ 0,00     | -           | -       ✅ CORRETO
05/11/2025 | R$ 10.000   | R$ 0,00     | -           | -       ✅ CORRETO
```

### Cenário: Dia Atual com Vendas Parciais

```
Data       | Meta        | Realizado   | Diferença      | Dif. %
-----------|-------------|-------------|----------------|----------
04/11/2025 | R$ 10.000   | R$ 5.000    | -R$ 5.000 🔴   | -50.00% ✅
(hoje)     |             |(vendeu algo)|                | (mostra normal)
```

## 🧪 Casos de Teste

### Teste 1: Dia Futuro Sem Vendas
```
Data: 10/11/2025
Hoje: 04/11/2025
Realizado: R$ 0,00
Meta: R$ 15.000,00

Resultado Esperado:
- Diferença: "-" (texto cinza)
- Dif. %: "-" (texto cinza)
```

### Teste 2: Hoje Sem Vendas
```
Data: 04/11/2025
Hoje: 04/11/2025
Realizado: R$ 0,00
Meta: R$ 15.000,00

Resultado Esperado:
- Diferença: "-"
- Dif. %: "-"
```

### Teste 3: Hoje Com Vendas
```
Data: 04/11/2025
Hoje: 04/11/2025
Realizado: R$ 8.000,00
Meta: R$ 15.000,00

Resultado Esperado:
- Diferença: "-R$ 7.000,00" (vermelho)
- Dif. %: "-46.67%" (vermelho)
```

### Teste 4: Dia Passado Sem Vendas
```
Data: 03/11/2025
Hoje: 04/11/2025
Realizado: R$ 0,00
Meta: R$ 15.000,00

Resultado Esperado:
- Diferença: "-R$ 15.000,00" (vermelho)
- Dif. %: "-100.00%" (vermelho)
(Mostra porque o dia já passou)
```

### Teste 5: Dia Passado Com Vendas
```
Data: 03/11/2025
Hoje: 04/11/2025
Realizado: R$ 18.000,00
Meta: R$ 15.000,00

Resultado Esperado:
- Diferença: "+R$ 3.000,00" (verde)
- Dif. %: "+20.00%" (verde)
```

## 📁 Arquivos Modificados

**src/app/(dashboard)/metas/mensal/page.tsx**
- Adicionada função `isTodayOrFuture(dateString: string)`
- Adicionada função `shouldShowDifference(meta: Meta)`
- Modificadas células de diferença nas 3 visualizações:
  1. Linha agregada (múltiplas filiais)
  2. Linhas expandidas (por filial)
  3. Tabela normal (filial única)

## 🎯 Comportamento

| Data       | Hoje       | Realizado | Mostra Diferença? | Cor        |
|------------|------------|-----------|-------------------|------------|
| Ontem      | 04/11      | R$ 0      | ✅ Sim            | 🔴 Vermelho|
| Hoje       | 04/11      | R$ 0      | ❌ Não            | ⚪ Cinza   |
| Hoje       | 04/11      | R$ 5.000  | ✅ Sim            | 🔴 Vermelho|
| Amanhã     | 04/11      | R$ 0      | ❌ Não            | ⚪ Cinza   |
| Próxima sem| 04/11      | R$ 0      | ❌ Não            | ⚪ Cinza   |

## 💡 Benefícios

1. **Clareza Visual:**
   - Não mostra "falsos negativos" para dias futuros
   - Fica claro que o dia ainda não teve venda

2. **UX Melhorada:**
   - Usuário não fica preocupado com números vermelhos em dias que ainda não aconteceram
   - Foco nos dias que realmente tiveram performance ruim

3. **Dados Precisos:**
   - Diferença só é mostrada quando faz sentido calcular
   - Evita confusão com "meta não batida" vs "dia não aconteceu"

## 🔄 Atualização Automática

**Comportamento dinâmico:**
- Às 00:00 de cada dia, as datas mudam automaticamente
- Exemplo: Dia 05/11 às 00:00:
  - 04/11 (que era "hoje" com "-") → vira "ontem" e mostra diferença
  - 05/11 (que era "amanhã" com "-") → vira "hoje" e continua com "-" até ter venda
  - 06/11 continua como futuro com "-"

## ⚙️ Configurações

Não há configurações. O comportamento é automático baseado na data do servidor.

**Comparação de data:**
```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)  // Zera horas para comparar só data

metaDate.setHours(0, 0, 0, 0)

return metaDate >= today  // True se for hoje ou futuro
```

## 🐛 Edge Cases

### Fuso Horário
A comparação usa a data local do servidor. Se o servidor estiver em fuso diferente, pode haver inconsistência.

**Solução futura:** Usar data do tenant ou UTC.

### Venda Parcial no Dia
Se o dia atual teve venda parcial (realizado > 0), a diferença é mostrada normalmente em vermelho ou verde.

### Importação de Dados
Se dados forem importados retroativamente para dias futuros, a diferença será mostrada (pois realizado > 0).

## 📝 Notas Técnicas

- Usa `parseISO` do `date-fns` para parsing seguro
- Zera horas para comparação precisa de datas
- Não afeta cálculos, apenas visualização
- Performance: O(1) por linha (verificação simples)

---

**Implementado por:** DevIngá Team  
**Data:** 2025-11-04  
**Status:** ✅ Pronto para uso
