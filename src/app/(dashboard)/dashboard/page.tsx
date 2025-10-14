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
                  <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} />
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
                  <Calendar mode="single" selected={dataFim} onSelect={setDataFim} />
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
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
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
          <CardTitle>Comparativo de Vendas</CardTitle>
          <CardDescription>Análise de vendas da sua empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : data ? (
            <ChartVendas data={data.grafico_vendas} />
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