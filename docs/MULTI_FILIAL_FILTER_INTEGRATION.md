# Guia de Integração: MultiFilialFilter

## 🎯 Objetivo

Este guia mostra como substituir o filtro atual de filiais pelo novo componente `MultiFilialFilter` nas páginas de Metas Mensal e Metas por Setor.

## 📋 Checklist de Integração

- [ ] Instalar dependências
- [ ] Copiar componentes
- [ ] Atualizar imports
- [ ] Substituir componente antigo
- [ ] Testar funcionalidade
- [ ] Validar acessibilidade

## 🚀 Passo a Passo

### 1. Instalar Dependência

```bash
npm install @radix-ui/react-scroll-area
```

### 2. Verificar Componentes shadcn

Os seguintes componentes já devem existir (verifique em `src/components/ui/`):

- ✅ `popover.tsx`
- ✅ `command.tsx`
- ✅ `badge.tsx`
- ✅ `checkbox.tsx`
- ✅ `separator.tsx`
- ✅ `button.tsx`
- ✅ `scroll-area.tsx` (criado)

### 3. Atualizar Página de Metas Mensal

**Arquivo**: `src/app/(dashboard)/metas/mensal/page.tsx`

#### Antes (Código Atual)

```typescript
import { MultiSelect } from '@/components/ui/multi-select'

// ...

const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])

// ...

<div className="flex flex-col gap-2 flex-1 min-w-0">
  <Label>Filiais</Label>
  <div className="h-10">
    <MultiSelect
      options={branches}
      value={filiaisSelecionadas}
      onValueChange={setFiliaisSelecionadas}
      placeholder={isLoadingBranches ? "Carregando filiais..." : "Selecione..."}
      disabled={isLoadingBranches}
      className="w-full h-10"
      variant="default"
      showSelectAll={true}
      onSelectAll={() => setFiliaisSelecionadas(branches)}
    />
  </div>
</div>
```

#### Depois (Com MultiFilialFilter)

```typescript
import { MultiFilialFilter, type FilialOption } from '@/components/filters'

// ...

const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])

// ...

<div className="flex flex-col gap-2 flex-1 min-w-0">
  <Label>Filiais</Label>
  <MultiFilialFilter
    filiais={branches}
    selectedFiliais={filiaisSelecionadas}
    onChange={setFiliaisSelecionadas}
    disabled={isLoadingBranches}
    placeholder={isLoadingBranches ? "Carregando filiais..." : "Selecione as filiais..."}
  />
</div>
```

**Mudanças:**
1. ✅ Import do novo componente
2. ✅ Tipo explícito: `FilialOption[]`
3. ✅ Prop `value` → `selectedFiliais`
4. ✅ Prop `onValueChange` → `onChange`
5. ✅ Removido `className="w-full h-10"` (já é padrão)
6. ✅ Removido `variant`, `showSelectAll`, `onSelectAll` (built-in)
7. ✅ Removido wrapper `<div className="h-10">`

### 4. Atualizar Página de Metas por Setor

**Arquivo**: `src/app/(dashboard)/metas/setor/page.tsx`

#### Aplicar as mesmas mudanças:

```typescript
import { MultiFilialFilter, type FilialOption } from '@/components/filters'

// ...

const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])

// ...

<div className="flex flex-col gap-2 flex-1 min-w-0">
  <Label>Filiais</Label>
  <MultiFilialFilter
    filiais={branches}
    selectedFiliais={filiaisSelecionadas}
    onChange={setFiliaisSelecionadas}
    disabled={isLoadingBranches}
    placeholder={isLoadingBranches ? "Carregando filiais..." : "Selecione as filiais..."}
  />
</div>
```

## 🔍 Exemplo Completo

Veja um exemplo completo de integração:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { MultiFilialFilter, type FilialOption } from '@/components/filters'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MetaMensalPage() {
  const { currentTenant } = useTenantContext()
  const { branchOptions: branches, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false
  })

  const currentDate = new Date()
  const [mes, setMes] = useState(currentDate.getMonth() + 1)
  const [ano, setAno] = useState(currentDate.getFullYear())
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])
  const [loading, setLoading] = useState(false)

  // Pré-selecionar todas as filiais ao carregar
  useEffect(() => {
    if (!isLoadingBranches && branches && branches.length > 0 && filiaisSelecionadas.length === 0) {
      setFiliaisSelecionadas(branches)
    }
  }, [isLoadingBranches, branches, filiaisSelecionadas.length])

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    if (currentTenant?.supabase_schema && mes && ano && !isLoadingBranches) {
      loadReport()
    }
  }, [currentTenant?.supabase_schema, mes, ano, filiaisSelecionadas.map(f => f.value).join(',')])

  const loadReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes: mes.toString(),
        ano: ano.toString()
      })

      // Enviar IDs das filiais selecionadas
      if (filiaisSelecionadas.length > 0) {
        const filialIds = filiaisSelecionadas.map(f => f.value).join(',')
        params.append('filial_id', filialIds)
      }

      const response = await fetch(`/api/metas/report?${params}`)
      const data = await response.json()
      
      console.log('[METAS] Report loaded:', data)
      // Processar dados...
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            {/* FILIAIS */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <Label>Filiais</Label>
              <MultiFilialFilter
                filiais={branches}
                selectedFiliais={filiaisSelecionadas}
                onChange={setFiliaisSelecionadas}
                disabled={isLoadingBranches}
                placeholder={isLoadingBranches ? "Carregando..." : "Selecione as filiais..."}
              />
            </div>

            {/* MÊS */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Mês</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(2024, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ANO */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Ano</Label>
              <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[120px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      <Card>
        <CardContent>
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <div>
              <p>Filiais selecionadas: {filiaisSelecionadas.length}</p>
              {/* Renderizar dados... */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

## 🧪 Testes

### Checklist de Teste

- [ ] **Carregamento Inicial**
  - Todas as filiais vêm pré-selecionadas
  - Badges são exibidos corretamente

- [ ] **Seleção/Deseleção**
  - Clicar em checkbox seleciona/deseleciona
  - Check icon aparece nas selecionadas
  - Badges atualizam em tempo real

- [ ] **Ações Rápidas**
  - "Selecionar todas" funciona
  - "Limpar seleção" funciona
  - Busca é resetada após ação

- [ ] **Busca**
  - Busca filtra a lista corretamente
  - Filiais não encontradas mostram mensagem
  - Busca é case-insensitive

- [ ] **Badges**
  - Badges quebram linha quando necessário
  - Botão X remove a filial
  - Hover mostra feedback visual

- [ ] **Integração Backend**
  - IDs enviados corretamente: `?filial_id=1,2,3`
  - Dados recalculam ao mudar seleção
  - Nenhum erro no console

- [ ] **Acessibilidade**
  - Tab navega pelos elementos
  - Enter/Space abre popover
  - Esc fecha popover
  - Labels descritivos

- [ ] **Responsivo**
  - Mobile: layout vertical funciona
  - Desktop: layout horizontal funciona
  - Badges quebram linha corretamente

## 🐛 Troubleshooting

### Problema: Filiais não pré-selecionam

**Causa**: useEffect com dependências incorretas

**Solução**:
```typescript
useEffect(() => {
  if (!isLoadingBranches && branches && branches.length > 0 && filiaisSelecionadas.length === 0) {
    setFiliaisSelecionadas(branches)
  }
}, [isLoadingBranches, branches, filiaisSelecionadas.length])
```

### Problema: Dados não recalculam

**Causa**: useEffect não monitora `filiaisSelecionadas`

**Solução**:
```typescript
useEffect(() => {
  if (currentTenant?.supabase_schema && mes && ano && !isLoadingBranches) {
    loadReport()
  }
}, [currentTenant?.supabase_schema, mes, ano, filiaisSelecionadas.map(f => f.value).join(',')])
```

### Problema: Erro de tipo TypeScript

**Causa**: Tipo incorreto da prop

**Solução**:
```typescript
// ✅ Correto
const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])

// ❌ Errado
const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<string[]>([])
```

### Problema: Badges não aparecem

**Causa**: Conditional rendering incorreto

**Solução**: O componente já renderiza badges automaticamente. Remover qualquer código customizado de badges.

## 📊 Comparação

### Antes vs Depois

| Feature | MultiSelect (Antigo) | MultiFilialFilter (Novo) |
|---------|---------------------|-------------------------|
| Busca | ❌ Não | ✅ Sim |
| Badges | ❌ Não | ✅ Sim |
| Ações Rápidas | ⚠️ Parcial | ✅ Completo |
| Acessibilidade | ⚠️ Básica | ✅ Completa |
| ScrollArea | ❌ Não | ✅ Sim |
| Performance | ⚠️ OK | ✅ Otimizada |
| Customização | ⚠️ Limitada | ✅ Flexível |

## 🎉 Resultado Final

Após a integração, você terá:

✅ Filtro moderno e profissional  
✅ Melhor experiência do usuário  
✅ Performance otimizada  
✅ Acessibilidade completa  
✅ Código mais limpo e manutenível  
✅ Funcionalidade mantida (zero breaking changes)  

## 📞 Suporte

**Documentação**:
- [MULTI_FILIAL_FILTER.md](./MULTI_FILIAL_FILTER.md) - Documentação completa do componente

**Referências**:
- [Correção de Metas](../CORRECAO_METAS_README.md) - Contexto da correção de múltiplas filiais
- [shadcn/ui](https://ui.shadcn.com) - Documentação dos componentes base

---

**Data**: 2025-11-06  
**Versão**: 1.0.0
