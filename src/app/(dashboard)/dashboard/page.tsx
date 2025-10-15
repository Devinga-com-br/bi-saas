'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CardMetric } from '@/components/dashboard/card-metric'
import { ChartVendas } from '@/components/dashboard/chart-vendas'
import { useTenantContext } from '@/contexts/tenant-context'
import { format, startOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatCurrency, formatPercentage } from '@/lib/chart-config'
import { useBranchesOptions } from '@/hooks/use-branches'

// Estrutura de dados da API
interface DashboardData {
  total_vendas: number
  total_lucro: number
  ticket_medio: number
  margem_lucro: number
  variacao_vendas_mes: number
  variacao_lucro_mes: number
  variacao_ticket_mes: number
  variacao_margem_mes: number
  variacao_vendas_ano: number
  variacao_lucro_ano: number
  variacao_ticket_ano: number
  variacao_margem_ano: number
  grafico_vendas: Array<{
    mes: string
    ano_atual: number
    ano_anterior: number
  }>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { currentTenant } = useTenantContext()

  // Estados para os filtros
  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()))
  const [dataFim, setDataFim] = useState<Date | undefined>(subDays(new Date(), 1))
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  
  // Estado para os parâmetros que serão enviados à API
  const [apiParams, setApiParams] = useState({
    schema: currentTenant?.supabase_schema,
    data_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    data_fim: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    filiais: 'all',
  })

  useEffect(() => {
    if (currentTenant) {
      handleAplicarFiltros()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant])

  const handleAplicarFiltros = () => {
    const filiaisParam = filiaisSelecionadas.length === 0 
      ? 'all' 
      : filiaisSelecionadas.map(f => f.value).join(',');

    setApiParams({
      schema: currentTenant?.supabase_schema,
      data_inicio: format(dataInicio!, 'yyyy-MM-dd'),
      data_fim: format(dataFim!, 'yyyy-MM-dd'),
      filiais: filiaisParam,
    })
  }

  const apiUrl = apiParams.schema
    ? `/api/dashboard?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
    : null

  const { data, error, isLoading } = useSWR<DashboardData>(apiUrl, fetcher, { refreshInterval: 0 });

  // Buscar dados para o gráfico de vendas
  const chartApiUrl = currentTenant?.supabase_schema
    ? `/api/charts/sales-by-month?schema=${currentTenant.supabase_schema}`
    : null
  const { data: chartData, isLoading: isChartLoading } = useSWR(chartApiUrl, fetcher, { refreshInterval: 0 });


  // Buscar filiais reais do tenant atual
  const { options: todasAsFiliais, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant
  })

  const isDataLoading = isLoading || !currentTenant
  const periodoAtual = `Dados de ${format(dataInicio || startOfMonth(new Date()), "dd/MM/yyyy")} a ${format(dataFim || subDays(new Date(), 1), "dd/MM/yyyy", { locale: ptBR })}`

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <div className='space-y-4'>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard Estratégico</h1>
              <p className="text-muted-foreground">
                {currentTenant ? `${currentTenant.name} - ${periodoAtual}` : 'Selecione uma empresa para começar.'}
              </p>
            </div>
        </div>
        <div className="flex flex-col gap-4 rounded-md border p-4 lg:flex-row lg:items-end lg:gap-6">
          {/* FILIAIS */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
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

          {/* DATA INICIAL */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label>Data Inicial</Label>
            <div className="h-10">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[200px] h-10 justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : <span>Selecione...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={dataInicio} 
                    onSelect={setDataInicio}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* DATA FINAL */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label>Data Final</Label>
            <div className="h-10">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[200px] h-10 justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : <span>Selecione...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={dataFim} 
                    onSelect={setDataFim}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* BOTÃO APLICAR */}
          <div className="flex justify-end lg:justify-start w-full lg:w-auto">
            <div className="h-10">
              <Button onClick={handleAplicarFiltros} disabled={isLoading} className="w-full sm:w-auto min-w-[120px] h-10">
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards e Gráfico */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
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
              title="Total de Vendas"
              value={formatCurrency(data.total_vendas)}
              variationMonth={`${(data.variacao_vendas_mes || 0).toFixed(2)}%`}
              variationYear={`${(data.variacao_vendas_ano || 0).toFixed(2)}%`}
              isPositiveMonth={(data.variacao_vendas_mes || 0) >= 0}
            />
            <CardMetric
              title="Total de Lucro"
              value={formatCurrency(data.total_lucro)}
              variationMonth={`${(data.variacao_lucro_mes || 0).toFixed(2)}%`}
              variationYear={`${(data.variacao_lucro_ano || 0).toFixed(2)}%`}
              isPositiveMonth={(data.variacao_lucro_mes || 0) >= 0}
            />
            <CardMetric
              title="Margem de Lucro"
              value={formatPercentage(data.margem_lucro)}
              variationMonth={`${(data.variacao_margem_mes || 0).toFixed(2)}%`}
              variationYear={`${(data.variacao_margem_ano || 0).toFixed(2)}%`}
              isPositiveMonth={(data.variacao_margem_mes || 0) >= 0}
            />
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas Mensais (Ano Atual)</CardTitle>
          <CardDescription>Total de vendas por mês para o ano corrente.</CardDescription>
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
    </div>
  )
}