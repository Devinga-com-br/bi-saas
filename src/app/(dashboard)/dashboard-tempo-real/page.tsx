'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { RefreshCw, Activity, TrendingUp, Receipt, Package, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { MultiFilialFilter, type FilialOption } from '@/components/filters'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

// Constants
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// Format utilities
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

const formatValueShort = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`
  }
  return `R$ ${value.toFixed(0)}`
}

// Types
interface ResumoData {
  receita_total: number
  meta_dia: number
  atingimento_percentual: number
  ticket_medio: number
  qtde_cupons: number
  qtde_skus: number
  cancelamentos: number
  cancelamentos_percentual: number
  cancelamentos_qtde_skus: number
  ultima_atualizacao: string
}

interface VendasPorHoraData {
  data: Array<{ hora: string; [key: string]: string | number }>
  filiais: Array<{ id: number; nome: string; cor: string }>
}

interface ProdutoMaisVendido {
  produto_id: number
  descricao: string
  quantidade_vendida: number
  receita: number
}

interface DepartamentoReceita {
  departamento_id: number
  departamento_nome: string
  receita: number
  participacao_percentual: number
}

interface RankingOperacional {
  filial_id: number
  filial_nome: string
  caixa: number
  skus_venda: number
  skus_cancelados: number
  valor_cancelamentos: number
  valor_vendido: number
}

type SortFieldVenda = 'filial_nome' | 'caixa' | 'skus_venda' | 'valor_vendido'
type SortFieldCancelamento = 'filial_nome' | 'caixa' | 'skus_cancelados' | 'valor_cancelamentos'
type SortDirection = 'asc' | 'desc'

export default function DashboardTempoRealPage() {
  const { currentTenant } = useTenantContext()
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [limitProdutos, setLimitProdutos] = useState('10')
  const [limitDepartamentos, setLimitDepartamentos] = useState('10')

  // Estado de ordenação para Ranking Venda
  const [vendaSortField, setVendaSortField] = useState<SortFieldVenda>('valor_vendido')
  const [vendaSortDirection, setVendaSortDirection] = useState<SortDirection>('desc')

  // Estado de ordenação para Ranking Cancelamentos
  const [cancelamentoSortField, setCancelamentoSortField] = useState<SortFieldCancelamento>('valor_cancelamentos')
  const [cancelamentoSortDirection, setCancelamentoSortDirection] = useState<SortDirection>('desc')

  // Branch options
  const { branchOptions, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false,
  })

  // API params
  const apiParams = useMemo(() => ({
    schema: currentTenant?.supabase_schema,
    filiais: filiaisSelecionadas.length > 0
      ? filiaisSelecionadas.map(f => f.value).join(',')
      : 'all'
  }), [currentTenant, filiaisSelecionadas])

  // Build URLs
  const resumoUrl = useMemo(() => {
    if (!apiParams.schema) return null
    const params = new URLSearchParams({
      schema: apiParams.schema,
      filiais: apiParams.filiais,
    })
    return `/api/dashboard-tempo-real/resumo?${params.toString()}`
  }, [apiParams])

  const vendasPorHoraUrl = useMemo(() => {
    if (!apiParams.schema) return null
    const params = new URLSearchParams({
      schema: apiParams.schema,
      filiais: apiParams.filiais,
    })
    return `/api/dashboard-tempo-real/vendas-por-hora?${params.toString()}`
  }, [apiParams])

  const produtosUrl = useMemo(() => {
    if (!apiParams.schema) return null
    const params = new URLSearchParams({
      schema: apiParams.schema,
      filiais: apiParams.filiais,
      limit: limitProdutos,
    })
    return `/api/dashboard-tempo-real/produtos-mais-vendidos?${params.toString()}`
  }, [apiParams, limitProdutos])

  const departamentosUrl = useMemo(() => {
    if (!apiParams.schema) return null
    const params = new URLSearchParams({
      schema: apiParams.schema,
      filiais: apiParams.filiais,
      limit: limitDepartamentos,
    })
    return `/api/dashboard-tempo-real/departamentos-receita?${params.toString()}`
  }, [apiParams, limitDepartamentos])

  const rankingOperacionalUrl = useMemo(() => {
    if (!apiParams.schema) return null
    const params = new URLSearchParams({
      schema: apiParams.schema,
      filiais: apiParams.filiais,
    })
    return `/api/dashboard-tempo-real/ranking-operacional?${params.toString()}`
  }, [apiParams])

  // SWR hooks with auto-refresh
  const { data: resumo, mutate: mutateResumo, isLoading: isLoadingResumo } = useSWR<ResumoData>(
    resumoUrl,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL }
  )

  const { data: vendasPorHora, mutate: mutateVendasHora, isLoading: isLoadingVendasHora } = useSWR<VendasPorHoraData>(
    vendasPorHoraUrl,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL }
  )

  const { data: produtosData, mutate: mutateProdutos, isLoading: isLoadingProdutos } = useSWR<{ produtos: ProdutoMaisVendido[] }>(
    produtosUrl,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL }
  )

  const { data: departamentosData, mutate: mutateDepartamentos, isLoading: isLoadingDepartamentos } = useSWR<{ receita_total: number; departamentos: DepartamentoReceita[] }>(
    departamentosUrl,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL }
  )

  const { data: rankingData, mutate: mutateRanking, isLoading: isLoadingRanking } = useSWR<{ ranking: RankingOperacional[] }>(
    rankingOperacionalUrl,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL }
  )

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([
      mutateResumo(),
      mutateVendasHora(),
      mutateProdutos(),
      mutateDepartamentos(),
      mutateRanking(),
    ])
    setIsRefreshing(false)
  }, [mutateResumo, mutateVendasHora, mutateProdutos, mutateDepartamentos, mutateRanking])

  // Sort ranking venda
  const sortedRankingVenda = useMemo(() => {
    if (!rankingData?.ranking) return []
    const sorted = [...rankingData.ranking]
    sorted.sort((a, b) => {
      let aVal: string | number = a[vendaSortField]
      let bVal: string | number = b[vendaSortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
        if (vendaSortDirection === 'asc') {
          return aVal.localeCompare(bVal as string)
        }
        return (bVal as string).localeCompare(aVal)
      }

      if (vendaSortDirection === 'asc') {
        return (aVal as number) - (bVal as number)
      }
      return (bVal as number) - (aVal as number)
    })
    return sorted
  }, [rankingData, vendaSortField, vendaSortDirection])

  // Sort ranking cancelamentos
  const sortedRankingCancelamentos = useMemo(() => {
    if (!rankingData?.ranking) return []
    const sorted = [...rankingData.ranking]
    sorted.sort((a, b) => {
      let aVal: string | number = a[cancelamentoSortField]
      let bVal: string | number = b[cancelamentoSortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
        if (cancelamentoSortDirection === 'asc') {
          return aVal.localeCompare(bVal as string)
        }
        return (bVal as string).localeCompare(aVal)
      }

      if (cancelamentoSortDirection === 'asc') {
        return (aVal as number) - (bVal as number)
      }
      return (bVal as number) - (aVal as number)
    })
    return sorted
  }, [rankingData, cancelamentoSortField, cancelamentoSortDirection])

  // Handle sort click para venda
  const handleVendaSortClick = useCallback((field: SortFieldVenda) => {
    if (vendaSortField === field) {
      setVendaSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setVendaSortField(field)
      setVendaSortDirection('desc')
    }
  }, [vendaSortField])

  // Handle sort click para cancelamentos
  const handleCancelamentoSortClick = useCallback((field: SortFieldCancelamento) => {
    if (cancelamentoSortField === field) {
      setCancelamentoSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setCancelamentoSortField(field)
      setCancelamentoSortDirection('desc')
    }
  }, [cancelamentoSortField])

  // Calculate venda por loja for bar chart
  const vendasPorLoja = useMemo(() => {
    if (!vendasPorHora?.data || !Array.isArray(vendasPorHora?.filiais)) return []

    const lastHourData = vendasPorHora.data[vendasPorHora.data.length - 1]
    if (!lastHourData) return []

    return vendasPorHora.filiais
      .map(filial => ({
        filial_id: filial.id,
        filial_nome: filial.nome,
        receita: Number(lastHourData[filial.id.toString()] || 0),
        cor: filial.cor,
        atingimento_meta: resumo?.meta_dia ? (Number(lastHourData[filial.id.toString()] || 0) / (resumo.meta_dia / vendasPorHora.filiais.length)) * 100 : 0,
      }))
      .sort((a, b) => b.receita - a.receita)
  }, [vendasPorHora, resumo])

  // Chart config for area chart
  const areaChartConfig = useMemo(() => {
    if (!Array.isArray(vendasPorHora?.filiais)) return {}
    const config: Record<string, { label: string; color: string }> = {}
    vendasPorHora.filiais.forEach(filial => {
      config[filial.id.toString()] = {
        label: filial.nome,
        color: filial.cor,
      }
    })
    return config
  }, [vendasPorHora])

  // Bar chart config
  const barChartConfig = {
    receita: {
      label: 'Receita',
      color: 'hsl(var(--chart-1))',
    },
  }

  // Format last update time (timezone São Paulo)
  const lastUpdateFormatted = useMemo(() => {
    if (!resumo?.ultima_atualizacao) return '--:--:--'
    try {
      const date = new Date(resumo.ultima_atualizacao)
      if (isNaN(date.getTime())) return '--:--:--'
      return date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '--:--:--'
    }
  }, [resumo])

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Selecione uma empresa para visualizar o dashboard</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header com filtros */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Dashboard Tempo Real
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento de vendas do dia com atualização automática
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="w-full sm:w-[250px]">
            <MultiFilialFilter
              filiais={branchOptions}
              selectedFiliais={filiaisSelecionadas}
              onChange={setFiliaisSelecionadas}
              disabled={isLoadingBranches}
              placeholder="Todas as filiais..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Última atualização: {lastUpdateFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Cards - 1ª Linha */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card Receita */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingResumo ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <p className="text-[26px] font-bold">
                  {formatCurrency(resumo?.receita_total || 0)}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta dia:</span>
                    <span>{formatCurrency(resumo?.meta_dia || 0)}</span>
                  </div>
                  <Progress value={Math.min(resumo?.atingimento_percentual || 0, 100)} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {(resumo?.atingimento_percentual || 0).toFixed(1)}% atingido
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card Ticket Médio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingResumo ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-[36px] font-bold">
                {formatCurrency(resumo?.ticket_medio || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card Qtde Cupons */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Qtde Cupons
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingResumo ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-[36px] font-bold">
                {formatNumber(resumo?.qtde_cupons || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card Qtde SKUs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Qtde SKUs
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingResumo ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-[36px] font-bold">
                {formatNumber(resumo?.qtde_skus || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card Cancelamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelamentos
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingResumo ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-[36px] font-bold text-destructive">
                  {formatCurrency(resumo?.cancelamentos || 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(resumo?.cancelamentos_qtde_skus || 0)} SKUs cancelados
                </p>
                <p className="text-sm text-muted-foreground">
                  {(resumo?.cancelamentos_percentual || 0).toFixed(2)}% da receita
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - 2ª Linha */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Area Chart - Venda por Hora/Loja */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Venda por Hora/Loja</CardTitle>
            <CardDescription>Receita acumulada por hora e filial</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingVendasHora ? (
              <Skeleton className="h-80 w-full" />
            ) : vendasPorHora?.data && Array.isArray(vendasPorHora.data) && vendasPorHora.data.length > 0 && Array.isArray(vendasPorHora.filiais) && vendasPorHora.filiais.length > 0 ? (
              <ChartContainer config={areaChartConfig} className="h-80 w-full">
                <AreaChart data={vendasPorHora.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => formatValueShort(value)} tick={{ fontSize: 12 }} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {vendasPorHora.filiais.map((filial) => (
                    <Area
                      key={filial.id}
                      type="monotone"
                      dataKey={filial.id.toString()}
                      name={filial.nome}
                      fill={filial.cor}
                      fillOpacity={0.3}
                      stroke={filial.cor}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Nenhum dado de vendas disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Venda Acumulada por Loja */}
        <Card>
          <CardHeader>
            <CardTitle>Venda Acumulada por Loja</CardTitle>
            <CardDescription>Ranking de vendas do dia</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingVendasHora ? (
              <Skeleton className="h-80 w-full" />
            ) : vendasPorLoja.length > 0 ? (
              <div className="space-y-4">
                <ChartContainer config={barChartConfig} className="h-52 w-full">
                  <BarChart
                    data={vendasPorLoja}
                    layout="vertical"
                    margin={{ top: 5, right: 80, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="filial_nome"
                      type="category"
                      width={80}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.length > 12 ? `${v.slice(0, 12)}...` : v}
                    />
                    <XAxis type="number" hide />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Bar dataKey="receita" radius={4}>
                      {vendasPorLoja.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                      <LabelList
                        dataKey="receita"
                        position="right"
                        offset={8}
                        className="fill-foreground"
                        fontSize={11}
                        formatter={(value: number) => formatValueShort(value)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>

                {/* Progress bars para meta por loja */}
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Atingimento de Meta</p>
                  {vendasPorLoja.slice(0, 5).map((loja) => (
                    <div key={loja.filial_id} className="flex items-center gap-2">
                      <span className="w-20 text-xs truncate" title={loja.filial_nome}>
                        {loja.filial_nome}
                      </span>
                      <Progress value={Math.min(loja.atingimento_meta, 100)} className="flex-1 h-2" />
                      <span className="w-12 text-xs text-right">
                        {loja.atingimento_meta.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas - 3ª Linha */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Tabela Produtos Mais Vendidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>Top produtos do dia</CardDescription>
            </div>
            <Select value={limitProdutos} onValueChange={setLimitProdutos}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-auto">
              {isLoadingProdutos ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : produtosData?.produtos && produtosData.produtos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-20">SKU</TableHead>
                      <TableHead className="text-right w-20">Qtd</TableHead>
                      <TableHead className="text-right w-28">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosData.produtos.map((p) => (
                      <TableRow key={p.produto_id}>
                        <TableCell className="truncate max-w-[200px]" title={p.descricao}>
                          {p.descricao}
                        </TableCell>
                        <TableCell>{p.produto_id}</TableCell>
                        <TableCell className="text-right">{formatNumber(p.quantidade_vendida)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.receita)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum produto vendido hoje
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela Departamentos por Receita */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Departamentos por Receita</CardTitle>
              <CardDescription>Participação por departamento</CardDescription>
            </div>
            <Select value={limitDepartamentos} onValueChange={setLimitDepartamentos}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-auto">
              {isLoadingDepartamentos ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : departamentosData?.departamentos && departamentosData.departamentos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right w-28">Receita</TableHead>
                      <TableHead className="text-right w-20">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departamentosData.departamentos.map((d) => (
                      <TableRow key={d.departamento_id}>
                        <TableCell className="truncate max-w-[200px]" title={d.departamento_nome}>
                          {d.departamento_nome}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                        <TableCell className="text-right">
                          {d.participacao_percentual.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum departamento com vendas hoje
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Operacional - 4ª Linha */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Ranking Operacional - Venda */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Operacional - Venda</CardTitle>
            <CardDescription>Desempenho de vendas por filial e caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-auto">
              {isLoadingRanking ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : sortedRankingVenda.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleVendaSortClick('filial_nome')}
                      >
                        <div className="flex items-center gap-1">
                          Filial
                          {vendaSortField === 'filial_nome' ? (
                            vendaSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none w-20"
                        onClick={() => handleVendaSortClick('caixa')}
                      >
                        <div className="flex items-center gap-1">
                          Caixa
                          {vendaSortField === 'caixa' ? (
                            vendaSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none text-right w-24"
                        onClick={() => handleVendaSortClick('skus_venda')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          SKUs
                          {vendaSortField === 'skus_venda' ? (
                            vendaSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none text-right w-32"
                        onClick={() => handleVendaSortClick('valor_vendido')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor Vendido
                          {vendaSortField === 'valor_vendido' ? (
                            vendaSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRankingVenda.map((item) => (
                      <TableRow key={`venda-${item.filial_id}-${item.caixa}`}>
                        <TableCell className="truncate max-w-[150px]" title={item.filial_nome}>
                          {item.filial_nome}
                        </TableCell>
                        <TableCell>{item.caixa}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.skus_venda)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.valor_vendido)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado de venda disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ranking Operacional - Cancelamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Operacional - Cancelamentos</CardTitle>
            <CardDescription>Cancelamentos por filial e caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-auto">
              {isLoadingRanking ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : sortedRankingCancelamentos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleCancelamentoSortClick('filial_nome')}
                      >
                        <div className="flex items-center gap-1">
                          Filial
                          {cancelamentoSortField === 'filial_nome' ? (
                            cancelamentoSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none w-20"
                        onClick={() => handleCancelamentoSortClick('caixa')}
                      >
                        <div className="flex items-center gap-1">
                          Caixa
                          {cancelamentoSortField === 'caixa' ? (
                            cancelamentoSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none text-right w-24"
                        onClick={() => handleCancelamentoSortClick('skus_cancelados')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          SKUs
                          {cancelamentoSortField === 'skus_cancelados' ? (
                            cancelamentoSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none text-right w-32"
                        onClick={() => handleCancelamentoSortClick('valor_cancelamentos')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor Canc.
                          {cancelamentoSortField === 'valor_cancelamentos' ? (
                            cancelamentoSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRankingCancelamentos.map((item) => (
                      <TableRow key={`canc-${item.filial_id}-${item.caixa}`}>
                        <TableCell className="truncate max-w-[150px]" title={item.filial_nome}>
                          {item.filial_nome}
                        </TableCell>
                        <TableCell>{item.caixa}</TableCell>
                        <TableCell className="text-right text-destructive">{formatNumber(item.skus_cancelados)}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">{formatCurrency(item.valor_cancelamentos)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum cancelamento registrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
