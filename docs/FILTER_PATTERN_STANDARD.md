# Padrão de Filtros para Relatórios

Este documento define o padrão visual e estrutural para implementação de filtros em páginas de relatórios e módulos do sistema.

## Estrutura Base

```tsx
<Card>
  <CardHeader>
    <CardTitle>Filtros</CardTitle>
    <CardDescription>Descrição dos filtros disponíveis</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
      {/* Filtros aqui */}
    </div>
  </CardContent>
</Card>
```

## Container de Filtros

- **Classes principais:** `flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4`
- Responsivo: empilha verticalmente em telas pequenas, horizontal em desktop
- Alinhamento inferior (`items-end`) para manter botões e campos na mesma linha
- Gap consistente de `gap-4` entre elementos

## Estrutura de Cada Filtro

```tsx
<div className="flex flex-col gap-2 w-full sm:w-auto">
  <Label htmlFor="campo-id">Nome do Campo</Label>
  <div className="h-10">
    {/* Input, Select ou outro componente */}
  </div>
</div>
```

### Características:
- Wrapper externo: `flex flex-col gap-2 w-full sm:w-auto`
- Label sempre presente
- Wrapper interno com altura fixa: `h-10`
- Todos os inputs/selects devem ter `h-10`

## Ordem Padrão dos Filtros

1. **Filial** (quando aplicável)
2. **Mês**
3. **Ano**
4. **Filtros específicos** (curvas, busca, etc.)
5. **Botão de Ação** (sempre por último)

## Tamanhos Padronizados

### Selects:
- **Filial:** `w-full sm:w-[200px] h-10`
- **Mês:** `w-full sm:w-[160px] h-10`
- **Ano:** `w-full sm:w-[120px] h-10`
- **Outros:** `w-full h-10` ou especificar largura apropriada

### Inputs de Texto/Busca:
- Base: `w-full h-10`
- Com ícone: adicionar padding `pl-8` se tiver ícone à esquerda

### Botão de Ação:
```tsx
<div className="flex justify-end lg:justify-start w-full lg:w-auto">
  <div className="h-10">
    <Button 
      onClick={handleAction} 
      disabled={loading} 
      className="w-full sm:w-auto min-w-[120px] h-10"
    >
      {loading ? 'Carregando...' : 'Aplicar'}
    </Button>
  </div>
</div>
```

## Exemplos Completos

### Exemplo 1: Filtro Básico (Filial, Mês, Ano)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Filtros</CardTitle>
    <CardDescription>Configure os filtros para o relatório</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
      {/* Filial */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label htmlFor="filial">Filial</Label>
        <div className="h-10">
          <Select value={filialId} onValueChange={setFilialId}>
            <SelectTrigger id="filial" className="w-full sm:w-[200px] h-10">
              <SelectValue placeholder="Selecione a filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Filiais</SelectItem>
              {filiais.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mês */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label htmlFor="mes">Mês</Label>
        <div className="h-10">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger id="mes" className="w-full sm:w-[160px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ano */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label htmlFor="ano">Ano</Label>
        <div className="h-10">
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger id="ano" className="w-full sm:w-[120px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botão Aplicar */}
      <div className="flex justify-end lg:justify-start w-full lg:w-auto">
        <div className="h-10">
          <Button 
            onClick={handleAplicar} 
            disabled={loading} 
            className="w-full sm:w-auto min-w-[120px] h-10"
          >
            {loading ? 'Carregando...' : 'Aplicar'}
          </Button>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### Exemplo 2: Com Campo de Busca

```tsx
{/* Busca de Produto */}
<div className="flex flex-col gap-2 w-full sm:w-auto flex-1">
  <Label htmlFor="busca">Buscar Produto</Label>
  <div className="relative h-10">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      id="busca"
      placeholder="Nome do produto..."
      value={busca}
      onChange={(e) => setBusca(e.target.value)}
      className="pl-8 w-full h-10"
    />
  </div>
</div>
```

### Exemplo 3: Com MultiSelect (Curvas ABCD)

```tsx
{/* Curvas */}
<div className="flex flex-col gap-2 w-full sm:w-auto flex-1">
  <Label>Curvas ABCD</Label>
  <div className="h-10">
    <MultiSelect
      options={curvasOptions}
      value={curvasSelecionadas}
      onValueChange={setCurvasSelecionadas}
      placeholder="Selecione as curvas"
      className="w-full h-10"
    />
  </div>
</div>
```

## Comportamento Responsivo

### Mobile (< 640px):
- Filtros empilhados verticalmente
- Cada campo ocupa 100% da largura (`w-full`)
- Botão com largura total

### Tablet (≥ 640px < 1024px):
- Campos com larguras específicas (`sm:w-[XXXpx]`)
- Mantém empilhamento vertical

### Desktop (≥ 1024px):
- Layout horizontal (`lg:flex-row`)
- Alinhamento inferior (`lg:items-end`)
- Botão alinhado à esquerda

## Checklist de Implementação

- [ ] Container usa `flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4`
- [ ] Cada filtro tem wrapper `flex flex-col gap-2 w-full sm:w-auto`
- [ ] Todos os inputs/selects têm `h-10`
- [ ] Label presente em todos os campos
- [ ] Ordem: Filial → Mês → Ano → Específicos → Botão
- [ ] Botão tem `min-w-[120px] h-10`
- [ ] Larguras padronizadas (Filial: 200px, Mês: 160px, Ano: 120px)
- [ ] Estado de loading no botão
- [ ] Responsividade testada

## Imports Necessários

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
// Adicionar outros conforme necessário (MultiSelect, etc.)
```

## Notas Importantes

1. **Sempre manter a altura fixa de 10 (`h-10`)** em todos os campos para consistência visual
2. **Ordem dos filtros é importante** para manter padrão em todo o sistema
3. **Usar `flex-1`** em campos que devem ocupar espaço disponível (como busca)
4. **Estado de loading** sempre deve ser refletido no botão
5. **Labels são obrigatórias** para acessibilidade
6. **IDs únicos** em cada campo para vincular labels corretamente

## Referências

Arquivos de exemplo implementando este padrão:
- `/src/app/(dashboard)/relatorios/ruptura-abcd/page.tsx`
- `/src/app/(dashboard)/metas/mensal/page.tsx`
- `/src/app/(dashboard)/relatorios/venda-curva/page.tsx`
