# DRE Gerencial - Simplificação dos Filtros

## Mudanças Implementadas

### ✅ Interface Simplificada
**Antes:**
- Filtro: Filial
- Filtro: Mês
- Filtro: Ano  
- Filtro: Período (PeriodFilter)

**Depois:**
- Filtro: Filial
- Filtro: Período (PeriodFilter)

### ✅ Lógica Unificada
Agora o **mesmo período** é usado para:
1. **Indicadores** (Receita Bruta, CMV, Lucro Bruto, Margem)
2. **Despesas** (tabela hierárquica)

### ✅ Cálculo Inteligente de Períodos de Comparação

#### PAM (Período Anterior do Mesmo tipo)
- Calcula automaticamente o período anterior com a mesma duração
- Exemplo: Se selecionar 01/10 a 31/10 (31 dias), PAM será 01/09 a 30/09 (30 dias anteriores)

#### PAA (Período do Ano Anterior)
- Mesmo período, mas do ano anterior
- Exemplo: Se selecionar 01/10/2025 a 31/10/2025, PAA será 01/10/2024 a 31/10/2024

## Arquivos Modificados

### 1. Frontend (`/src/app/(dashboard)/dre-gerencial/page.tsx`)
```typescript
// Removido:
- const [mes, setMes] = useState<number>()
- const [ano, setAno] = useState<number>()
- const MESES = [...]
- Filtros de Mês e Ano da UI

// Mantido:
- const [filialId, setFilialId] = useState<string>('all')
- const [dataInicial, setDataInicial] = useState<Date>()
- const [dataFinal, setDataFinal] = useState<Date>()

// Atualizado:
- fetchIndicadores() agora usa dataInicial e dataFinal
- useEffect unificado para buscar indicadores e despesas juntos
```

### 2. API (`/src/app/api/dre-gerencial/indicadores/route.ts`)
```typescript
// Antes:
- Recebia: mes, ano
- Calculava: Primeiro e último dia do mês

// Depois:
- Recebe: dataInicio, dataFim
- Calcula PAM: Período anterior com mesma duração
- Calcula PAA: Mesmo período do ano anterior
- Usa date-fns para cálculos precisos
```

## Como Funciona

### 1. Usuário seleciona período
```
Filial: Todas as Filiais
Período: 03/10/2025 a 01/11/2025 (30 dias)
```

### 2. Sistema calcula automaticamente

**Período Atual:**
- Início: 2025-10-03
- Fim: 2025-11-01
- Duração: 30 dias

**PAM (Período Anterior do Mesmo tipo):**
- Fim: 2025-10-02 (1 dia antes do início atual)
- Início: 2025-09-03 (30 dias antes do fim)
- Duração: 30 dias

**PAA (Período do Ano Anterior):**
- Início: 2024-10-03
- Fim: 2024-11-01
- Duração: 30 dias

### 3. Busca dados
```sql
-- Período Atual
SELECT * FROM vendas_diarias_por_filial 
WHERE data_venda BETWEEN '2025-10-03' AND '2025-11-01'

-- PAM
SELECT * FROM vendas_diarias_por_filial 
WHERE data_venda BETWEEN '2025-09-03' AND '2025-10-02'

-- PAA
SELECT * FROM vendas_diarias_por_filial 
WHERE data_venda BETWEEN '2024-10-03' AND '2024-11-01'
```

### 4. Exibe cards comparativos
```
┌─────────────────────────────────────┐
│ Receita Bruta                       │
│ R$ 9.953.127,13                     │
│                                     │
│ PAM (2025): R$ 10.101.749,05       │
│ ↓ -1,47%                           │
│                                     │
│ PAA (2024): R$ 6.837.554,65        │
│ ↑ +45,56%                          │
└─────────────────────────────────────┘
```

## Benefícios

### ✅ Mais Simples
- Menos filtros para o usuário gerenciar
- Interface mais limpa
- Menos confusão

### ✅ Mais Flexível
- Pode comparar qualquer período (não só meses completos)
- Útil para análises de semanas, quinzenas, etc.
- Comparação justa (sempre mesma duração)

### ✅ Mais Consistente
- Indicadores e despesas sempre sincronizados
- Mesmo período usado em toda a tela
- Comparações sempre válidas

### ✅ Mais Preciso
- Cálculo automático de períodos de comparação
- Considera anos bissextos
- Ajusta automaticamente mudança de ano/mês

## Exemplos de Uso

### Análise Mensal Completa
```
Período: 01/10/2025 a 31/10/2025
PAM: 01/09/2025 a 30/09/2025 (setembro)
PAA: 01/10/2024 a 31/10/2024 (outubro/2024)
```

### Análise de Semana
```
Período: 27/10/2025 a 02/11/2025 (7 dias)
PAM: 20/10/2025 a 26/10/2025 (semana anterior)
PAA: 28/10/2024 a 03/11/2024 (mesma semana ano passado)
```

### Análise de Trimestre
```
Período: 01/07/2025 a 30/09/2025 (92 dias)
PAM: 01/04/2025 a 30/06/2025 (trimestre anterior)
PAA: 01/07/2024 a 30/09/2024 (mesmo trimestre ano passado)
```

### Análise de Quinzena
```
Período: 01/10/2025 a 15/10/2025 (15 dias)
PAM: 16/09/2025 a 30/09/2025 (quinzena anterior)
PAA: 01/10/2024 a 15/10/2024 (mesma quinzena ano passado)
```

## Logs de Debug

Os logs mostram claramente os períodos calculados:

```
[API/DRE-GERENCIAL] Fetching with params: {
  schema: 'okilao',
  requestedFilialId: 'all',
  finalFiliais: null,
  current: '2025-10-03 to 2025-11-01',
  pam: '2025-09-03 to 2025-10-02 (2025)',
  paa: '2024-10-03 to 2024-11-01 (2024)'
}
```

## Troubleshooting

### Período PAM com duração diferente
**Causa:** Meses têm números diferentes de dias
**Solução:** Sistema calcula duração exata em dias e mantém consistência

### Mudança de ano no PAM
**Exemplo:** Período 01/01/2025 a 15/01/2025
- PAM: 17/12/2024 a 31/12/2024 ✅
- Sistema ajusta automaticamente

### Ano bissexto
**Exemplo:** Período 01/02/2024 a 29/02/2024 (29 dias)
- PAA: 01/02/2023 a 01/03/2023 (29 dias) ✅
- Sistema mantém duração correta mesmo sem 29/02 em 2023

## Dependências

### date-fns
Biblioteca usada para cálculos de data:
- `subMonths()`: Subtrai meses
- `subYears()`: Subtrai anos
- `format()`: Formata datas
- Já instalada no projeto

## Próximos Passos (Opcional)

1. **Botões rápidos**: "Este mês", "Mês passado", "Este ano"
2. **Presets salvos**: Salvar períodos favoritos
3. **Comparação customizada**: Escolher período de comparação manualmente
4. **Exportar relatório**: PDF com dados dos 3 períodos

## Recomendações

✅ **Use o PeriodFilter padrão** - Já vem com "Últimos 30 dias" configurado
✅ **Mantenha períodos consistentes** - Evite comparar 7 dias com 30 dias
✅ **Execute a função SQL** - Não esqueça de criar `get_dre_indicadores` no Supabase
