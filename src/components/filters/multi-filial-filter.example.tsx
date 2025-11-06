/**
 * Exemplo de Uso: MultiFilialFilter Component
 * 
 * Este arquivo demonstra como usar o componente MultiFilialFilter
 * em diferentes cenários.
 */

'use client'

import { useState, useEffect } from 'react'
import { MultiFilialFilter, type FilialOption } from './multi-filial-filter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// Dados de exemplo
const mockFiliais: FilialOption[] = [
  { value: '1', label: 'Filial Centro' },
  { value: '2', label: 'Filial Norte' },
  { value: '3', label: 'Filial Sul' },
  { value: '4', label: 'Filial Leste' },
  { value: '5', label: 'Filial Oeste' },
  { value: '6', label: 'Filial Shopping' },
  { value: '7', label: 'Filial Plaza' },
  { value: '8', label: 'Filial Centro II' },
]

/**
 * Exemplo 1: Uso Básico
 */
export function BasicExample() {
  const [selected, setSelected] = useState<FilialOption[]>([])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Exemplo Básico</CardTitle>
        <CardDescription>Seleção simples de filiais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Filiais</Label>
          <MultiFilialFilter
            filiais={mockFiliais}
            selectedFiliais={selected}
            onChange={setSelected}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          Selecionadas: {selected.length === 0 ? 'Nenhuma' : selected.map(f => f.label).join(', ')}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Exemplo 2: Pré-selecionadas
 */
export function PreselectedExample() {
  const [selected, setSelected] = useState<FilialOption[]>(mockFiliais)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Pré-selecionadas</CardTitle>
        <CardDescription>Todas as filiais vêm selecionadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Filiais</Label>
          <MultiFilialFilter
            filiais={mockFiliais}
            selectedFiliais={selected}
            onChange={setSelected}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Exemplo 3: Com Validação
 */
export function ValidationExample() {
  const [selected, setSelected] = useState<FilialOption[]>([])
  const [error, setError] = useState<string>('')

  const handleChange = (filiais: FilialOption[]) => {
    if (filiais.length === 0) {
      setError('Selecione pelo menos uma filial')
    } else if (filiais.length > 3) {
      setError('Selecione no máximo 3 filiais')
    } else {
      setError('')
    }
    setSelected(filiais)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Com Validação</CardTitle>
        <CardDescription>Mínimo 1, máximo 3 filiais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Filiais</Label>
          <MultiFilialFilter
            filiais={mockFiliais}
            selectedFiliais={selected}
            onChange={handleChange}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        
        <Button 
          disabled={!!error || selected.length === 0}
          className="w-full"
        >
          Continuar
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Exemplo 4: Integração com API
 */
interface ApiData {
  total: number
  filiais: {
    id: string
    nome: string
    vendas: number
  }[]
}

export function ApiIntegrationExample() {
  const [selected, setSelected] = useState<FilialOption[]>([])
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Simular carregamento inicial
    setSelected(mockFiliais)
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Simular chamada à API
    const filialIds = selected.map(f => f.value).join(',')
    console.log(`Carregando dados para: ${filialIds}`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setData({
      total: selected.length * 10000,
      filiais: selected.map(f => ({
        id: f.value,
        nome: f.label,
        vendas: Math.random() * 10000
      }))
    })
    
    setLoading(false)
  }

  // Auto-reload quando filiais mudarem
  useEffect(() => {
    if (selected.length > 0) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map(f => f.value).join(',')])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Integração com API</CardTitle>
        <CardDescription>Dados recarregam ao mudar seleção</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Filiais</Label>
          <MultiFilialFilter
            filiais={mockFiliais}
            selectedFiliais={selected}
            onChange={setSelected}
          />
        </div>
        
        <div className="rounded-md bg-muted p-4">
          {loading ? (
            <p className="text-sm">Carregando...</p>
          ) : data ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">Total: R$ {data.total.toFixed(2)}</p>
              {data.filiais.map((f) => (
                <p key={f.id}>
                  {f.nome}: R$ {f.vendas.toFixed(2)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione filiais para ver dados
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Exemplo 5: Disabled State
 */
export function DisabledExample() {
  const [selected, setSelected] = useState<FilialOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento
    setTimeout(() => {
      setLoading(false)
      setSelected(mockFiliais.slice(0, 3))
    }, 2000)
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Estado Disabled</CardTitle>
        <CardDescription>Mostra loading enquanto carrega</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Filiais</Label>
          <MultiFilialFilter
            filiais={mockFiliais}
            selectedFiliais={selected}
            onChange={setSelected}
            disabled={loading}
            placeholder={loading ? "Carregando filiais..." : "Selecione..."}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Exemplo 6: Layout em Linha (Horizontal)
 */
export function HorizontalLayoutExample() {
  const [selected, setSelected] = useState<FilialOption[]>(mockFiliais)
  const [mes, setMes] = useState('11')
  const [ano, setAno] = useState('2024')

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Layout Horizontal</CardTitle>
        <CardDescription>Filtros lado a lado (como nas páginas de metas)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 rounded-md border p-4 lg:flex-row lg:items-end lg:gap-6">
          {/* Filiais - Flex 1 */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Label>Filiais</Label>
            <MultiFilialFilter
              filiais={mockFiliais}
              selectedFiliais={selected}
              onChange={setSelected}
            />
          </div>

          {/* Mês */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label>Mês</Label>
            <select 
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-10 w-full sm:w-[160px] rounded-md border px-3"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m.toString()}>
                  {new Date(2024, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label>Ano</Label>
            <select 
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="h-10 w-full sm:w-[120px] rounded-md border px-3"
            >
              {[2023, 2024, 2025].map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Período: {mes}/{ano} | Filiais: {selected.length}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Galeria de Exemplos
 */
export function ExamplesGallery() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">MultiFilialFilter Examples</h1>
        <p className="text-muted-foreground">
          Diferentes formas de usar o componente MultiFilialFilter
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <BasicExample />
        <PreselectedExample />
        <ValidationExample />
        <ApiIntegrationExample />
        <DisabledExample />
      </div>

      <HorizontalLayoutExample />
    </div>
  )
}
