'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { Search, ChevronDown, ChevronRight, TrendingUp, DollarSign } from 'lucide-react'
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
import { logModuleAccess } from '@/lib/audit'

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

interface DeptNivel1 {
  dept1_id: number
  dept_nivel1: string
  total_vendas: number
  total_lucro: number
  margem: number
  produtos: Produto[]
}

interface DeptNivel2 {
  dept2_id: number
  dept_nivel2: string
  total_vendas: number
  total_lucro: number
  margem: number
  nivel1: DeptNivel1[]
}

interface DeptNivel3 {
  dept3_id: number
  dept_nivel3: string
  total_vendas: number
  total_lucro: number
  margem: number
  nivel2: DeptNivel2[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  hierarquia: DeptNivel3[]
}

export default function VendaCurvaPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { options: filiaisOptions } = useBranchesOptions({
    tenantId: currentTenant?.id,
  })

  // Estados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const currentDate = new Date()
  const [mes, setMes] = useState((currentDate.getMonth()).toString()) // Mês anterior
  const [ano, setAno] = useState(currentDate.getFullYear().toString())
  const [filialId, setFilialId] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Estados de expansão
  const [expandedDept1, setExpandedDept1] = useState<Record<string, boolean>>({})
  const [expandedDept2, setExpandedDept2] = useState<Record<string, boolean>>({})
  const [expandedDept3, setExpandedDept3] = useState<Record<string, boolean>>({})

  // Definir filial padrão quando opções estiverem disponíveis
  useEffect(() => {
    if (filiaisOptions.length > 0 && !filialId) {
      // Ordena filiais por ID (numérico) e pega a menor
      const sortedFiliais = [...filiaisOptions].sort((a, b) => {
        const idA = parseInt(a.value)
        const idB = parseInt(b.value)
        return idA - idB
      })
      setFilialId(sortedFiliais[0].value)
    }
  }, [filiaisOptions, filialId])

  // Log de acesso ao módulo
  useEffect(() => {
    if (userProfile && currentTenant) {
      logModuleAccess({
        module: 'relatorios_venda_curva',
        action: 'view',
        tenantId: currentTenant.id,
        userName: userProfile.full_name,
      })
    }
  }, [userProfile, currentTenant])

  // Buscar dados
  const fetchData = async () => {
    if (!currentTenant?.supabase_schema) return
    
    // Validar se filial está selecionada
    if (!filialId) {
      setError('Por favor, selecione uma filial')
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes,
        ano,
        filial_id: filialId,
        page: page.toString(),
        page_size: pageSize.toString(),
      })

      const response = await fetch(`/api/relatorios/venda-curva?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar dados')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, filialId, page])

  // Funções de toggle
  const toggleDept1 = (id: string) => {
    setExpandedDept1(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleDept2 = (id: string) => {
    setExpandedDept2(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleDept3 = (id: string) => {
    setExpandedDept3(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Renderizar produtos
  const renderProdutos = (produtos: Produto[]) => {
    return (
      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="text-xs">Filial</TableHead>
            <TableHead className="text-xs">Código</TableHead>
            <TableHead className="text-xs">Descrição</TableHead>
            <TableHead className="text-right text-xs">Qtde</TableHead>
            <TableHead className="text-right text-xs">Valor Venda</TableHead>
            <TableHead className="text-xs">Curva Venda</TableHead>
            <TableHead className="text-right text-xs">Valor Lucro</TableHead>
            <TableHead className="text-right text-xs">% Lucro</TableHead>
            <TableHead className="text-xs">Curva Lucro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto, idx) => (
            <TableRow key={`${produto.codigo}-${produto.filial_id}-${idx}`} className="border-b">
              <TableCell className="text-xs">{produto.filial_id}</TableCell>
              <TableCell className="text-xs">{produto.codigo}</TableCell>
              <TableCell className="text-xs">{produto.descricao}</TableCell>
              <TableCell className="text-right text-xs">{produto.qtde.toFixed(2)}</TableCell>
              <TableCell className="text-right text-xs">{formatCurrency(produto.valor_vendas)}</TableCell>
              <TableCell>
                <Badge className={getCurvaBadgeColor(produto.curva_venda)}>
                  {produto.curva_venda}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs">{formatCurrency(produto.valor_lucro)}</TableCell>
              <TableCell className="text-right text-xs">{produto.percentual_lucro.toFixed(2)}%</TableCell>
              <TableCell>
                <Badge className={getCurvaBadgeColor(produto.curva_lucro)}>
                  {produto.curva_lucro}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Funções auxiliares
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getCurvaBadgeColor = (curva: string) => {
    switch (curva) {
      case 'A':
        return 'bg-green-500 hover:bg-green-600'
      case 'B':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'C':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'D':
        return 'bg-red-500 hover:bg-red-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const meses = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ]

  const anos = Array.from({ length: 5 }, (_, i) => {
    const year = currentDate.getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  // Continua na próxima parte...
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatório de Venda por Curva</h2>
          <p className="text-muted-foreground">
            Análise de vendas agrupada por departamentos e curva ABC
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período e filial para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês</Label>
              <Select value={mes} onValueChange={(value) => { setMes(value); setPage(1) }}>
                <SelectTrigger id="mes">
                  <SelectValue placeholder="Selecione o mês" />
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

            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Select value={ano} onValueChange={(value) => { setAno(value); setPage(1) }}>
                <SelectTrigger id="ano">
                  <SelectValue placeholder="Selecione o ano" />
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

            <div className="space-y-2">
              <Label htmlFor="filial">Filial</Label>
              <Select value={filialId} onValueChange={(value) => { setFilialId(value); setPage(1) }}>
                <SelectTrigger id="filial">
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

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={fetchData} disabled={loading} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continua no próximo arquivo... */}
      {/* Erro */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados */}
      {!loading && data && data.hierarquia && data.hierarquia.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vendas por Departamento e Curva
              </CardTitle>
              <CardDescription>
                Total de {data.total_records} departamentos nível 3 encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.hierarquia.map((dept3) => (
                  <Collapsible
                    key={dept3.dept3_id}
                    open={expandedDept3[dept3.dept3_id.toString()]}
                    onOpenChange={() => toggleDept3(dept3.dept3_id.toString())}
                  >
                    <div className="rounded-lg border bg-card">
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50">
                        <div className="flex items-center gap-2">
                          {expandedDept3[dept3.dept3_id.toString()] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-bold text-base">
                            {dept3.dept_nivel3}
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Vendas</div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(dept3.total_vendas)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Lucro</div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(dept3.total_lucro)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Margem</div>
                            <div className="font-semibold text-sm">{dept3.margem.toFixed(2)}%</div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-2">
                          {dept3.nivel2?.map((dept2) => (
                            <Collapsible
                              key={dept2.dept2_id}
                              open={expandedDept2[dept2.dept2_id.toString()]}
                              onOpenChange={() => toggleDept2(dept2.dept2_id.toString())}
                            >
                              <div className="rounded-lg border bg-card/50">
                                <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-accent/50">
                                  <div className="flex items-center gap-2">
                                    {expandedDept2[dept2.dept2_id.toString()] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <span className="font-semibold text-sm">
                                      {dept2.dept_nivel2}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Vendas</div>
                                      <div className="font-medium text-xs">
                                        {formatCurrency(dept2.total_vendas)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Lucro</div>
                                      <div className="font-medium text-xs">
                                        {formatCurrency(dept2.total_lucro)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Margem</div>
                                      <div className="font-medium text-xs">{dept2.margem.toFixed(2)}%</div>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="border-t p-3 space-y-2">
                                    {dept2.nivel1?.map((dept1) => (
                                      <Collapsible
                                        key={dept1.dept1_id}
                                        open={expandedDept1[dept1.dept1_id.toString()]}
                                        onOpenChange={() => toggleDept1(dept1.dept1_id.toString())}
                                      >
                                        <div className="rounded-lg border bg-card/30">
                                          <CollapsibleTrigger className="flex w-full items-center justify-between p-2.5 hover:bg-accent/30">
                                            <div className="flex items-center gap-2">
                                              {expandedDept1[dept1.dept1_id.toString()] ? (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                              ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                              )}
                                              <span className="font-medium text-xs">
                                                {dept1.dept_nivel1}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                              <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">Vendas</div>
                                                <div className="font-medium text-xs">
                                                  {formatCurrency(dept1.total_vendas)}
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">Lucro</div>
                                                <div className="font-medium text-xs">
                                                  {formatCurrency(dept1.total_lucro)}
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">Margem</div>
                                                <div className="font-medium text-xs">{dept1.margem.toFixed(2)}%</div>
                                              </div>
                                            </div>
                                          </CollapsibleTrigger>

                                          <CollapsibleContent>
                                            <div className="border-t">
                                              {dept1.produtos && dept1.produtos.length > 0 && renderProdutos(dept1.produtos)}
                                            </div>
                                          </CollapsibleContent>
                                        </div>
                                      </Collapsible>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Paginação */}
          {data.total_pages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                      className={page === data.total_pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Sem dados */}
      {!loading && data && (!data.hierarquia || data.hierarquia.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum dado encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Não há vendas registradas para o período e filial selecionados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
