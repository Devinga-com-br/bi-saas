'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { MultiSelect } from '@/components/ui/multi-select'
import { Search, ChevronDown, ChevronRight, Package, AlertTriangle } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Produto {
  produto_id: number
  filial_id: number
  produto_descricao: string
  curva_lucro: string | null
  curva_venda: string
  estoque_atual: number
  venda_media_diaria_60d: number
  dias_de_estoque: number | null
  preco_venda: number
}

interface Departamento {
  departamento_id: number
  departamento_nome: string
  produtos: Produto[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  departamentos: Departamento[]
}

export default function RupturaABCDPage() {
  const { currentTenant } = useTenantContext()
  const { options: filiaisOptions } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
  })

  // Estados dos filtros
  const [filialSelecionada, setFilialSelecionada] = useState<string>('')
  const [curvasSelecionadas, setCurvasSelecionadas] = useState<string[]>(['A'])
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)

  // Estados dos dados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados de colapso dos departamentos
  const [collapsedDepts, setCollapsedDepts] = useState<Set<number>>(new Set())

  const curvasOptions = [
    { value: 'A', label: 'Curva A' },
    { value: 'B', label: 'Curva B' },
    { value: 'C', label: 'Curva C' },
    { value: 'D', label: 'Curva D' },
  ]

  const fetchData = async () => {
    if (!currentTenant?.supabase_schema) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        curvas: curvasSelecionadas.join(','),
        apenas_ativos: 'true',
        apenas_ruptura: 'true',
        page: page.toString(),
        page_size: '50',
      })

      if (filialSelecionada) {
        params.append('filial_id', filialSelecionada)
      }

      if (busca) {
        params.append('busca', busca)
      }

      const response = await fetch(`/api/relatorios/ruptura-abcd?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Definir filial padrão quando as opções carregarem
  useEffect(() => {
    if (filiaisOptions.length > 0 && !filialSelecionada) {
      setFilialSelecionada(filiaisOptions[0].value)
    }
  }, [filiaisOptions, filialSelecionada])

  // Carregar dados quando filial for definida
  useEffect(() => {
    if (currentTenant?.supabase_schema && filialSelecionada) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialSelecionada, currentTenant])

  // Recarregar apenas quando mudar a página
  useEffect(() => {
    if (currentTenant?.supabase_schema && page > 1 && filialSelecionada) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleAplicarFiltros = () => {
    setPage(1)
    fetchData()
  }

  const handleToggleDept = (deptId: number) => {
    setCollapsedDepts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deptId)) {
        newSet.delete(deptId)
      } else {
        newSet.add(deptId)
      }
      return newSet
    })
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Ruptura por Curva ABCD</h1>
        <p className="text-muted-foreground">
          Análise de produtos com ruptura de estoque por curva de vendas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configure os filtros para o relatório</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Filial */}
            <div className="space-y-2 flex-1">
              <Label>Filial</Label>
              <Select value={filialSelecionada} onValueChange={setFilialSelecionada}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  {filiaisOptions.map((filial) => (
                    <SelectItem key={filial.value} value={filial.value}>
                      {filial.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Curvas */}
            <div className="space-y-2 flex-1">
              <Label>Curvas ABCD</Label>
              <div className="h-10">
                <MultiSelect
                  options={curvasOptions}
                  value={curvasSelecionadas.map(c => ({ value: c, label: `Curva ${c}` }))}
                  onValueChange={(selected) => setCurvasSelecionadas(selected.map(s => s.value))}
                  placeholder=""
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* Busca */}
            <div className="space-y-2 flex-1">
              <Label>Buscar Produto</Label>
              <div className="relative h-10">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 w-full h-10"
                />
              </div>
            </div>

            {/* Botão Aplicar */}
            <div className="h-10">
              <Button onClick={handleAplicarFiltros} disabled={loading} className="w-full lg:w-auto min-w-[100px] h-10">
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Produtos em Ruptura</CardTitle>
              <CardDescription>
                {data ? `${data.total_records} produtos encontrados` : 'Carregando...'}
              </CardDescription>
            </div>
            {data && data.total_records > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.total_records} rupturas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-lg font-semibold">Erro ao carregar dados</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : !data || data.departamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Nenhum produto encontrado</p>
              <p className="text-muted-foreground">Ajuste os filtros para ver os resultados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.departamentos.map((dept) => (
                <Collapsible
                  key={dept.departamento_id}
                  open={!collapsedDepts.has(dept.departamento_id)}
                  onOpenChange={() => handleToggleDept(dept.departamento_id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer hover:bg-accent/50 transition-colors border rounded-lg p-4 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {collapsedDepts.has(dept.departamento_id) ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <h3 className="text-lg font-semibold">{dept.departamento_nome}</h3>
                        </div>
                        <Badge variant="secondary">
                          {dept.produtos.length} {dept.produtos.length === 1 ? 'produto' : 'produtos'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md border mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-center w-[120px]">Curva Lucro</TableHead>
                            <TableHead className="text-center w-[120px]">Curva Venda</TableHead>
                            <TableHead className="text-right w-[120px]">Estoque</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dept.produtos.map((produto, idx) => (
                            <TableRow key={`${produto.produto_id}-${produto.filial_id || idx}`}>
                              <TableCell className="font-mono text-sm">
                                {produto.produto_id}
                              </TableCell>
                              <TableCell>
                                <div className="truncate" title={produto.produto_descricao}>
                                  {produto.produto_descricao}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={
                                    produto.curva_lucro === 'A'
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : produto.curva_lucro === 'B'
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                      : ''
                                  }
                                  variant={
                                    produto.curva_lucro === 'A' || produto.curva_lucro === 'B'
                                      ? 'default'
                                      : 'outline'
                                  }
                                >
                                  {produto.curva_lucro || '-'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={
                                    produto.curva_venda === 'A'
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : produto.curva_venda === 'B'
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                      : ''
                                  }
                                  variant={
                                    produto.curva_venda === 'A' || produto.curva_venda === 'B'
                                      ? 'default'
                                      : 'outline'
                                  }
                                >
                                  {produto.curva_venda}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  produto.estoque_atual <= 0 ? 'text-destructive' : ''
                                }`}
                              >
                                {formatNumber(produto.estoque_atual)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {/* Paginação */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {data.page} de {data.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={data.page === 1 || loading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                      disabled={data.page === data.total_pages || loading}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
