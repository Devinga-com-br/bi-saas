'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CardMetric } from '@/components/dashboard/card-metric'
import { ChartVendas } from '@/components/dashboard/chart-vendas'
import { useTenantContext } from '@/contexts/tenant-context'
import { format, startOfMonth, subDays } from 'date-fns'
import { MultiSelect } from '@/components/ui/multi-select'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatPercentage } from '@/lib/chart-config'
import { useBranchesOptions } from '@/hooks/use-branches'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'
import { DashboardFilter, type FilterType } from '@/components/dashboard/dashboard-filter'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'

// Estrutura de dados da API
interface DashboardData {
  total_vendas: number
  total_lucro: number
  ticket_medio: number
  margem_lucro: number
  pa_vendas: number
  pa_lucro: number
  pa_ticket_medio: number
  pa_margem_lucro: number
  variacao_vendas_mes: number
  variacao_lucro_mes: number
  variacao_ticket_mes: number
  variacao_margem_mes: number
  variacao_vendas_ano: number
  variacao_lucro_ano: number
  variacao_ticket_ano: number
  variacao_margem_ano: number
  ytd_vendas: number
  ytd_vendas_ano_anterior: number
  ytd_variacao_percent: number
  grafico_vendas: Array<{
    mes: string
    ano_atual: number
    ano_anterior: number
  }>
}

// Estrutura de dados YTD (Receita, Lucro e Margem)
interface YTDMetrics {
  ytd_vendas: number
  ytd_vendas_ano_anterior: number
  ytd_variacao_vendas_percent: number
  ytd_lucro: number
  ytd_lucro_ano_anterior: number
  ytd_variacao_lucro_percent: number
  ytd_margem: number
  ytd_margem_ano_anterior: number
  ytd_variacao_margem: number
}

// Estrutura de dados MTD (Month-to-Date - Receita, Lucro e Margem)
interface MTDMetrics {
  mtd_vendas: number
  mtd_lucro: number
  mtd_margem: number
  mtd_mes_anterior_vendas: number
  mtd_mes_anterior_lucro: number
  mtd_mes_anterior_margem: number
  mtd_variacao_mes_anterior_vendas_percent: number
  mtd_variacao_mes_anterior_lucro_percent: number
  mtd_variacao_mes_anterior_margem: number
  mtd_ano_anterior_vendas: number
  mtd_ano_anterior_lucro: number
  mtd_ano_anterior_margem: number
  mtd_variacao_ano_anterior_vendas_percent: number
  mtd_variacao_ano_anterior_lucro_percent: number
  mtd_variacao_ano_anterior_margem: number
}

interface VendaPorFilial {
  filial_id: number
  valor_total: number
  custo_total: number
  total_lucro: number
  quantidade_total: number
  total_transacoes: number
  ticket_medio: number
  margem_lucro: number
  pa_valor_total: number
  pa_custo_total: number
  pa_total_lucro: number
  pa_total_transacoes: number
  pa_ticket_medio: number
  pa_margem_lucro: number
  delta_valor: number
  delta_valor_percent: number
  delta_custo: number
  delta_custo_percent: number
  delta_lucro: number
  delta_lucro_percent: number
  delta_margem: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { currentTenant, userProfile } = useTenantContext()

  // Estados para os filtros
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()))
  const [dataFim, setDataFim] = useState<Date>(new Date())
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  const [filterType, setFilterType] = useState<FilterType>('month')

  // Estado para os parâmetros que serão enviados à API
  const [apiParams, setApiParams] = useState({
    schema: currentTenant?.supabase_schema,
    data_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    data_fim: format(new Date(), 'yyyy-MM-dd'),
    filiais: 'all',
    filter_type: 'month' as FilterType,
  })

  // Handler para mudança de período
  const handlePeriodChange = (start: Date, end: Date, type: FilterType) => {
    setDataInicio(start)
    setDataFim(end)
    setFilterType(type)
  }

  // Calcula o label de comparação dinâmico
  const getComparisonLabel = (): string => {
    if (!dataInicio || !dataFim) return 'PA'
    
    const start = new Date(dataInicio)
    const end = new Date(dataFim)
    
    // Verifica se é um ano completo (01/Jan a 31/Dez)
    const isFullYear = 
      start.getMonth() === 0 && start.getDate() === 1 &&
      end.getMonth() === 11 && end.getDate() === 31 &&
      start.getFullYear() === end.getFullYear()
    
    if (isFullYear) {
      // Se é ano completo, mostra o ano anterior
      return (start.getFullYear() - 1).toString()
    }
    
    // Verifica se é um mês completo
    const isFullMonth = 
      start.getDate() === 1 &&
      end.getMonth() === start.getMonth() &&
      end.getFullYear() === start.getFullYear() &&
      end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
    
    if (isFullMonth) {
      // Se é mês completo, mostra mês anterior (ex: "Out/2024")
      const previousMonth = new Date(start)
      previousMonth.setMonth(previousMonth.getMonth() - 1)
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${monthNames[previousMonth.getMonth()]}/${previousMonth.getFullYear()}`
    }
    
    // Caso contrário, usa PA (Período Anterior)
    return 'PA'
  }

  // Verifica se deve mostrar comparação YTD (Year-to-Date)
  const shouldShowYTD = (): boolean => {
    if (!dataInicio || !dataFim) return false
    
    const start = new Date(dataInicio)
    const end = new Date(dataFim)
    const today = new Date()
    
    // Verifica se é um ano completo (01/Jan a 31/Dez)
    const isFullYear = 
      start.getMonth() === 0 && start.getDate() === 1 &&
      end.getMonth() === 11 && end.getDate() === 31 &&
      start.getFullYear() === end.getFullYear()
    
    // Verifica se é o ano atual
    const isCurrentYear = start.getFullYear() === today.getFullYear()
    
    // Mostra YTD apenas se for ano completo E ano atual
    return isFullYear && isCurrentYear
  }

  // Calcula label YTD
  const getYTDLabel = (): string => {
    if (!dataInicio) return ''
    const start = new Date(dataInicio)
    return `${start.getFullYear() - 1} YTD`
  }

  // Verifica se deve mostrar comparação MTD (Month-to-Date)
  const shouldShowMTD = (): boolean => {
    if (!dataInicio || !dataFim) return false

    // Só mostra MTD quando filterType é 'month'
    return filterType === 'month'
  }

  // Calcula label MTD para mês anterior (ex: "OUT/2025")
  const getMTDPreviousMonthLabel = (): string => {
    if (!dataInicio) return ''
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const start = new Date(dataInicio)
    const previousMonth = new Date(start)
    previousMonth.setMonth(previousMonth.getMonth() - 1)
    return `${monthNames[previousMonth.getMonth()].toUpperCase()}/${previousMonth.getFullYear()}`
  }

  // Calcula label MTD para ano anterior (ex: "NOV/2024")
  const getMTDPreviousYearLabel = (): string => {
    if (!dataInicio) return ''
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const start = new Date(dataInicio)
    const previousYear = new Date(start)
    previousYear.setFullYear(previousYear.getFullYear() - 1)
    return `${monthNames[previousYear.getMonth()].toUpperCase()}/${previousYear.getFullYear()}`
  }

  // Calcula a variação correta: valor atual vs. valor comparativo (PA)
  const calculateVariationPercent = (current: number, previous: number): number => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Log de acesso ao módulo
  useEffect(() => {
    const logAccess = async () => {
      if (currentTenant && userProfile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        // Log module access
        logModuleAccess({
          module: 'dashboard',
          tenantId: currentTenant.id,
          userName: userProfile.full_name,
          userEmail: user?.email || ''
        })
      }
    }
    logAccess()
  }, [currentTenant, userProfile])

  // Aplicar filtros automaticamente quando mudarem
  useEffect(() => {
    if (!currentTenant?.supabase_schema || !dataInicio || !dataFim) return

    const filiaisParam = filiaisSelecionadas.length === 0
      ? 'all'
      : filiaisSelecionadas.map(f => f.value).join(',');

    setApiParams({
      schema: currentTenant.supabase_schema,
      data_inicio: format(dataInicio, 'yyyy-MM-dd'),
      data_fim: format(dataFim, 'yyyy-MM-dd'),
      filiais: filiaisParam,
      filter_type: filterType,
    })
  }, [currentTenant?.supabase_schema, dataInicio, dataFim, filiaisSelecionadas, filterType])

  const apiUrl = apiParams.schema
    ? `/api/dashboard?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
    : null

  const { data, error, isLoading } = useSWR<DashboardData>(apiUrl, fetcher, { refreshInterval: 0 });

  // Buscar dados YTD (Lucro e Margem) - apenas quando shouldShowYTD() === true
  const shouldFetchYTD = apiParams.schema && shouldShowYTD()
  const ytdApiUrl = shouldFetchYTD
    ? `/api/dashboard/ytd-metrics?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
    : null
  const { data: ytdData, error: ytdError } = useSWR<YTDMetrics>(ytdApiUrl, fetcher, { refreshInterval: 0 });

  // Debug: Log YTD status
  useEffect(() => {
    console.log('[YTD DEBUG]', {
      shouldShowYTD: shouldShowYTD(),
      shouldFetchYTD,
      ytdApiUrl,
      ytdData,
      ytdError,
      dataInicio,
      dataFim
    })
  }, [shouldFetchYTD, ytdApiUrl, ytdData, ytdError, dataInicio, dataFim])

  // Buscar dados MTD (Month-to-Date) - apenas quando shouldShowMTD() === true
  const shouldFetchMTD = apiParams.schema && shouldShowMTD()
  const mtdApiUrl = shouldFetchMTD
    ? `/api/dashboard/mtd-metrics?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
    : null
  const { data: mtdData, error: mtdError } = useSWR<MTDMetrics>(mtdApiUrl, fetcher, { refreshInterval: 0 });

  // Debug: Log MTD status
  useEffect(() => {
    console.log('[MTD DEBUG]', {
      shouldShowMTD: shouldShowMTD(),
      shouldFetchMTD,
      mtdApiUrl,
      mtdData,
      mtdError,
      filterType,
      dataInicio,
      dataFim
    })
  }, [shouldFetchMTD, mtdApiUrl, mtdData, mtdError, filterType, dataInicio, dataFim])

  // Buscar dados para o gráfico de vendas (com filtro de filiais)
  const chartApiUrl = apiParams.schema
    ? `/api/charts/sales-by-month?schema=${apiParams.schema}&filiais=${apiParams.filiais}`
    : null
  const { data: chartData, isLoading: isChartLoading } = useSWR(chartApiUrl, fetcher, { refreshInterval: 0 });

  // Buscar dados de vendas por filial
  const vendasFilialUrl = apiParams.schema
    ? `/api/dashboard/vendas-por-filial?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}&filter_type=${apiParams.filter_type}`
    : null
  const { data: vendasPorFilial, isLoading: isLoadingVendasFilial } = useSWR<VendaPorFilial[]>(vendasFilialUrl, fetcher, { refreshInterval: 0 });



  // Buscar filiais reais do tenant atual
  const { options: todasAsFiliais, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant
  })

  const isDataLoading = isLoading || !currentTenant

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      {/* Filtros */}
      <div className='space-y-4'>
        <div className="rounded-md border p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
            {/* FILIAIS */}
            <div className="flex flex-col gap-2 w-full lg:w-[600px]">
              <Label>Filiais</Label>
              <div className="h-10">
                <MultiSelect
                  options={todasAsFiliais}
                  value={filiaisSelecionadas}
                  onValueChange={setFiliaisSelecionadas}
                  placeholder={isLoadingBranches ? "Carregando filiais..." : "Selecione..."}
                  disabled={isLoadingBranches}
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* FILTRO DE PERÍODO */}
            <DashboardFilter onPeriodChange={handlePeriodChange} />
          </div>
        </div>
      </div>

      {/* Cards e Gráfico */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {isDataLoading ? (
          <>
            {/* Skeleton para CardMetric */}
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-8 w-40" />
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : data ? (
          <>
            <CardMetric
              title="Receita Bruta"
              value={formatCurrency(data.total_vendas)}
              previousValue={!shouldShowMTD() ? formatCurrency(data.pa_vendas) : undefined}
              variationPercent={!shouldShowMTD() ? (() => {
                const variation = calculateVariationPercent(data.total_vendas, data.pa_vendas)
                return `${variation >= 0 ? '+' : ''}${variation.toFixed(2)}%`
              })() : undefined}
              variationYear={!shouldShowMTD() ? `${(data.variacao_vendas_ano || 0) >= 0 ? '+' : ''}${(data.variacao_vendas_ano || 0).toFixed(2)}%` : undefined}
              isPositive={data.total_vendas >= data.pa_vendas}
              comparisonLabel={getComparisonLabel()}
              ytdValue={shouldShowYTD() && ytdData ? formatCurrency(ytdData.ytd_vendas_ano_anterior) : undefined}
              ytdVariationPercent={shouldShowYTD() && ytdData && ytdData.ytd_variacao_vendas_percent != null ? `${ytdData.ytd_variacao_vendas_percent >= 0 ? '+' : ''}${ytdData.ytd_variacao_vendas_percent.toFixed(2)}%` : undefined}
              ytdLabel={shouldShowYTD() ? getYTDLabel() : undefined}
              ytdIsPositive={shouldShowYTD() && ytdData && ytdData.ytd_variacao_vendas_percent != null ? ytdData.ytd_variacao_vendas_percent >= 0 : undefined}
              mtdPreviousMonthValue={shouldShowMTD() && mtdData ? formatCurrency(mtdData.mtd_mes_anterior_vendas) : undefined}
              mtdPreviousMonthVariationPercent={shouldShowMTD() && mtdData && mtdData.mtd_variacao_mes_anterior_vendas_percent != null ? `${mtdData.mtd_variacao_mes_anterior_vendas_percent >= 0 ? '+' : ''}${mtdData.mtd_variacao_mes_anterior_vendas_percent.toFixed(2)}%` : undefined}
              mtdPreviousMonthLabel={shouldShowMTD() ? getMTDPreviousMonthLabel() : undefined}
              mtdPreviousMonthIsPositive={shouldShowMTD() && mtdData && mtdData.mtd_variacao_mes_anterior_vendas_percent != null ? mtdData.mtd_variacao_mes_anterior_vendas_percent >= 0 : undefined}
              mtdPreviousYearValue={shouldShowMTD() && mtdData ? formatCurrency(mtdData.mtd_ano_anterior_vendas) : undefined}
              mtdPreviousYearVariationPercent={shouldShowMTD() && mtdData && mtdData.mtd_variacao_ano_anterior_vendas_percent != null ? `${mtdData.mtd_variacao_ano_anterior_vendas_percent >= 0 ? '+' : ''}${mtdData.mtd_variacao_ano_anterior_vendas_percent.toFixed(2)}%` : undefined}
              mtdPreviousYearLabel={shouldShowMTD() ? getMTDPreviousYearLabel() : undefined}
              mtdPreviousYearIsPositive={shouldShowMTD() && mtdData && mtdData.mtd_variacao_ano_anterior_vendas_percent != null ? mtdData.mtd_variacao_ano_anterior_vendas_percent >= 0 : undefined}
            />
            <CardMetric
              title="Lucro Bruto"
              value={formatCurrency(data.total_lucro)}
              previousValue={!shouldShowMTD() ? formatCurrency(data.pa_lucro) : undefined}
              variationPercent={!shouldShowMTD() ? (() => {
                const variation = calculateVariationPercent(data.total_lucro, data.pa_lucro)
                return `${variation >= 0 ? '+' : ''}${variation.toFixed(2)}%`
              })() : undefined}
              variationYear={!shouldShowMTD() ? `${(data.variacao_lucro_ano || 0) >= 0 ? '+' : ''}${(data.variacao_lucro_ano || 0).toFixed(2)}%` : undefined}
              isPositive={data.total_lucro >= data.pa_lucro}
              comparisonLabel={getComparisonLabel()}
              ytdValue={shouldShowYTD() && ytdData ? formatCurrency(ytdData.ytd_lucro_ano_anterior) : undefined}
              ytdVariationPercent={shouldShowYTD() && ytdData && ytdData.ytd_variacao_lucro_percent != null ? `${ytdData.ytd_variacao_lucro_percent >= 0 ? '+' : ''}${ytdData.ytd_variacao_lucro_percent.toFixed(2)}%` : undefined}
              ytdLabel={shouldShowYTD() ? getYTDLabel() : undefined}
              ytdIsPositive={shouldShowYTD() && ytdData && ytdData.ytd_variacao_lucro_percent != null ? ytdData.ytd_variacao_lucro_percent >= 0 : undefined}
              mtdPreviousMonthValue={shouldShowMTD() && mtdData ? formatCurrency(mtdData.mtd_mes_anterior_lucro) : undefined}
              mtdPreviousMonthVariationPercent={shouldShowMTD() && mtdData && mtdData.mtd_variacao_mes_anterior_lucro_percent != null ? `${mtdData.mtd_variacao_mes_anterior_lucro_percent >= 0 ? '+' : ''}${mtdData.mtd_variacao_mes_anterior_lucro_percent.toFixed(2)}%` : undefined}
              mtdPreviousMonthLabel={shouldShowMTD() ? getMTDPreviousMonthLabel() : undefined}
              mtdPreviousMonthIsPositive={shouldShowMTD() && mtdData && mtdData.mtd_variacao_mes_anterior_lucro_percent != null ? mtdData.mtd_variacao_mes_anterior_lucro_percent >= 0 : undefined}
              mtdPreviousYearValue={shouldShowMTD() && mtdData ? formatCurrency(mtdData.mtd_ano_anterior_lucro) : undefined}
              mtdPreviousYearVariationPercent={shouldShowMTD() && mtdData && mtdData.mtd_variacao_ano_anterior_lucro_percent != null ? `${mtdData.mtd_variacao_ano_anterior_lucro_percent >= 0 ? '+' : ''}${mtdData.mtd_variacao_ano_anterior_lucro_percent.toFixed(2)}%` : undefined}
              mtdPreviousYearLabel={shouldShowMTD() ? getMTDPreviousYearLabel() : undefined}
              mtdPreviousYearIsPositive={shouldShowMTD() && mtdData && mtdData.mtd_variacao_ano_anterior_lucro_percent != null ? mtdData.mtd_variacao_ano_anterior_lucro_percent >= 0 : undefined}
            />
            <CardMetric
              title="Margem Bruta"
              value={formatPercentage(data.margem_lucro)}
              previousValue={!shouldShowMTD() ? formatPercentage(data.pa_margem_lucro) : undefined}
              variationPercent={!shouldShowMTD() ? (() => {
                const variation = data.margem_lucro - data.pa_margem_lucro
                return `${variation >= 0 ? '+' : ''}${variation.toFixed(2)}p.p.`
              })() : undefined}
              variationYear={!shouldShowMTD() ? `${(data.variacao_margem_ano || 0) >= 0 ? '+' : ''}${(data.variacao_margem_ano || 0).toFixed(2)}p.p.` : undefined}
              isPositive={data.margem_lucro >= data.pa_margem_lucro}
              comparisonLabel={getComparisonLabel()}
              ytdValue={shouldShowYTD() && ytdData ? formatPercentage(ytdData.ytd_margem_ano_anterior) : undefined}
              ytdVariationPercent={shouldShowYTD() && ytdData && ytdData.ytd_variacao_margem != null ? `${ytdData.ytd_variacao_margem >= 0 ? '+' : ''}${ytdData.ytd_variacao_margem.toFixed(2)}p.p.` : undefined}
              ytdLabel={shouldShowYTD() ? getYTDLabel() : undefined}
              ytdIsPositive={shouldShowYTD() && ytdData && ytdData.ytd_variacao_margem != null ? ytdData.ytd_variacao_margem >= 0 : undefined}
              mtdPreviousMonthValue={shouldShowMTD() && mtdData ? formatPercentage(mtdData.mtd_mes_anterior_margem) : undefined}
              mtdPreviousMonthVariationPercent={shouldShowMTD() && mtdData && mtdData.mtd_variacao_mes_anterior_margem != null ? `${mtdData.mtd_variacao_mes_anterior_margem >= 0 ? '+' : ''}${mtdData.mtd_variacao_mes_anterior_margem.toFixed(2)}p.p.` : undefined}
              mtdPreviousMonthLabel={shouldShowMTD() ? getMTDPreviousMonthLabel() : undefined}
              mtdPreviousMonthIsPositive={shouldShowMTD() && mtdData && mtdData.mtd_variacao_mes_anterior_margem != null ? mtdData.mtd_variacao_mes_anterior_margem >= 0 : undefined}
              mtdPreviousYearValue={shouldShowMTD() && mtdData ? formatPercentage(mtdData.mtd_ano_anterior_margem) : undefined}
              mtdPreviousYearVariationPercent={shouldShowMTD() && mtdData && mtdData.mtd_variacao_ano_anterior_margem != null ? `${mtdData.mtd_variacao_ano_anterior_margem >= 0 ? '+' : ''}${mtdData.mtd_variacao_ano_anterior_margem.toFixed(2)}p.p.` : undefined}
              mtdPreviousYearLabel={shouldShowMTD() ? getMTDPreviousYearLabel() : undefined}
              mtdPreviousYearIsPositive={shouldShowMTD() && mtdData && mtdData.mtd_variacao_ano_anterior_margem != null ? mtdData.mtd_variacao_ano_anterior_margem >= 0 : undefined}
            />
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas e Despesas Mensais (Ano Atual)</CardTitle>
          <CardDescription>Comparativo entre total de Vendas e Despesas por mês.</CardDescription>
        </CardHeader>
        <CardContent>
          {isChartLoading ? (
            <div className="h-[350px] w-full space-y-4">
              {/* Skeleton do gráfico */}
              <div className="flex items-end justify-between h-[300px] gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                  <Skeleton 
                    key={i} 
                    className="flex-1 rounded-t-md" 
                    style={{ height: `${Math.random() * 60 + 40}%` }}
                  />
                ))}
              </div>
              {/* Labels dos meses */}
              <div className="flex justify-between px-1">
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((mes) => (
                  <Skeleton key={mes} className="h-3 w-6" />
                ))}
              </div>
            </div>
          ) : chartData ? (
            <ChartVendas data={chartData} />
          ) : (
            <div className="text-center text-muted-foreground">
              {error ? 'Erro ao carregar dados do gráfico.' : 'Nenhum dado para exibir.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Vendas por Filial */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas por Filial</CardTitle>
          <CardDescription>Análise detalhada de vendas por filial para o período selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingVendasFilial ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : vendasPorFilial && vendasPorFilial.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Filial</TableHead>
                    <TableHead className="text-right">Valor Vendido</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Total Lucro</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasPorFilial.map((venda) => {
                    const delta_ticket_percent = venda.pa_ticket_medio > 0 
                      ? ((venda.ticket_medio - venda.pa_ticket_medio) / venda.pa_ticket_medio) * 100 
                      : 0
                    
                    return (
                      <TableRow key={venda.filial_id}>
                        <TableCell className="font-medium">{venda.filial_id}</TableCell>
                        
                        {/* Valor Vendido */}
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(venda.valor_total)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${venda.delta_valor_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {venda.delta_valor_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {venda.delta_valor_percent >= 0 ? '+' : ''}{venda.delta_valor_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(venda.pa_valor_total)}
                          </div>
                        </TableCell>
                        
                        {/* Ticket Médio */}
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(venda.ticket_medio)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${delta_ticket_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {delta_ticket_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {delta_ticket_percent >= 0 ? '+' : ''}{delta_ticket_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(venda.pa_ticket_medio)}
                          </div>
                        </TableCell>
                        
                        {/* Custo Total */}
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(venda.custo_total)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${venda.delta_custo_percent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {venda.delta_custo_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {venda.delta_custo_percent >= 0 ? '+' : ''}{venda.delta_custo_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(venda.pa_custo_total)}
                          </div>
                        </TableCell>
                        
                        {/* Total Lucro */}
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(venda.total_lucro)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${venda.delta_lucro_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {venda.delta_lucro_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {venda.delta_lucro_percent >= 0 ? '+' : ''}{venda.delta_lucro_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(venda.pa_total_lucro)}
                          </div>
                        </TableCell>
                        
                        {/* Margem */}
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {venda.margem_lucro.toFixed(2)}%
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${venda.delta_margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {venda.delta_margem >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {venda.delta_margem >= 0 ? '+' : ''}{venda.delta_margem.toFixed(2)}p.p.
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {venda.pa_margem_lucro.toFixed(2)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  
                  {/* Linha de Totalização */}
                  {vendasPorFilial && vendasPorFilial.length > 0 && (() => {
                    const totais = vendasPorFilial.reduce((acc, venda) => ({
                      valor_total: acc.valor_total + venda.valor_total,
                      pa_valor_total: acc.pa_valor_total + venda.pa_valor_total,
                      total_transacoes: acc.total_transacoes + venda.total_transacoes,
                      pa_total_transacoes: acc.pa_total_transacoes + venda.pa_total_transacoes,
                      custo_total: acc.custo_total + venda.custo_total,
                      pa_custo_total: acc.pa_custo_total + venda.pa_custo_total,
                      total_lucro: acc.total_lucro + venda.total_lucro,
                      pa_total_lucro: acc.pa_total_lucro + venda.pa_total_lucro,
                    }), {
                      valor_total: 0,
                      pa_valor_total: 0,
                      total_transacoes: 0,
                      pa_total_transacoes: 0,
                      custo_total: 0,
                      pa_custo_total: 0,
                      total_lucro: 0,
                      pa_total_lucro: 0,
                    })

                    const ticket_medio = totais.total_transacoes > 0 ? totais.valor_total / totais.total_transacoes : 0
                    const pa_ticket_medio = totais.pa_total_transacoes > 0 ? totais.pa_valor_total / totais.pa_total_transacoes : 0
                    const delta_ticket_percent = pa_ticket_medio > 0 ? ((ticket_medio - pa_ticket_medio) / pa_ticket_medio) * 100 : 0
                    const margem_lucro = totais.valor_total > 0 ? (totais.total_lucro / totais.valor_total) * 100 : 0
                    const pa_margem_lucro = totais.pa_valor_total > 0 ? (totais.pa_total_lucro / totais.pa_valor_total) * 100 : 0
                    
                    const delta_valor = totais.valor_total - totais.pa_valor_total
                    const delta_valor_percent = totais.pa_valor_total > 0 ? (delta_valor / totais.pa_valor_total) * 100 : 0
                    const delta_custo = totais.custo_total - totais.pa_custo_total
                    const delta_custo_percent = totais.pa_custo_total > 0 ? (delta_custo / totais.pa_custo_total) * 100 : 0
                    const delta_lucro = totais.total_lucro - totais.pa_total_lucro
                    const delta_lucro_percent = totais.pa_total_lucro > 0 ? (delta_lucro / totais.pa_total_lucro) * 100 : 0
                    const delta_margem = margem_lucro - pa_margem_lucro

                    return (
                      <TableRow className="bg-muted/30 font-bold border-t-2">
                        <TableCell>=</TableCell>
                        
                        {/* Valor Vendido */}
                        <TableCell className="text-right">
                          <div>
                            {formatCurrency(totais.valor_total)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${delta_valor_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {delta_valor_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {delta_valor_percent >= 0 ? '+' : ''}{delta_valor_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(totais.pa_valor_total)}
                          </div>
                        </TableCell>
                        
                        {/* Ticket Médio */}
                        <TableCell className="text-right">
                          <div>
                            {formatCurrency(ticket_medio)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${delta_ticket_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {delta_ticket_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {delta_ticket_percent >= 0 ? '+' : ''}{delta_ticket_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(pa_ticket_medio)}
                          </div>
                        </TableCell>
                        
                        {/* Custo Total */}
                        <TableCell className="text-right">
                          <div>
                            {formatCurrency(totais.custo_total)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${delta_custo_percent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {delta_custo_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {delta_custo_percent >= 0 ? '+' : ''}{delta_custo_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(totais.pa_custo_total)}
                          </div>
                        </TableCell>
                        
                        {/* Total Lucro */}
                        <TableCell className="text-right">
                          <div>
                            {formatCurrency(totais.total_lucro)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${delta_lucro_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {delta_lucro_percent >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {delta_lucro_percent >= 0 ? '+' : ''}{delta_lucro_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(totais.pa_total_lucro)}
                          </div>
                        </TableCell>
                        
                        {/* Margem */}
                        <TableCell className="text-right">
                          <div>
                            {margem_lucro.toFixed(2)}%
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${delta_margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {delta_margem >= 0 ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                            <span>
                              {delta_margem >= 0 ? '+' : ''}{delta_margem.toFixed(2)}p.p.
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pa_margem_lucro.toFixed(2)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Nenhum dado de vendas disponível para o período selecionado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}