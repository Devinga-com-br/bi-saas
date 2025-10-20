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
import { MultiSelect } from '@/components/ui/multi-select'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatPercentage } from '@/lib/chart-config'
import { useBranchesOptions } from '@/hooks/use-branches'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'
import { PeriodFilter } from '@/components/despesas/period-filter'

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
  const [dataFim, setDataFim] = useState<Date>(subDays(new Date(), 1))
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  
  // Estado para os parâmetros que serão enviados à API
  const [apiParams, setApiParams] = useState({
    schema: currentTenant?.supabase_schema,
    data_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    data_fim: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    filiais: 'all',
  })

  // Handler para mudança de período
  const handlePeriodChange = (start: Date, end: Date) => {
    setDataInicio(start)
    setDataFim(end)
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
    })
  }, [currentTenant?.supabase_schema, dataInicio, dataFim, filiaisSelecionadas])

  const apiUrl = apiParams.schema
    ? `/api/dashboard?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
    : null

  const { data, error, isLoading } = useSWR<DashboardData>(apiUrl, fetcher, { refreshInterval: 0 });

  // Buscar dados para o gráfico de vendas
  const chartApiUrl = currentTenant?.supabase_schema
    ? `/api/charts/sales-by-month?schema=${currentTenant.supabase_schema}`
    : null
  const { data: chartData, isLoading: isChartLoading } = useSWR(chartApiUrl, fetcher, { refreshInterval: 0 });

  // Buscar dados de vendas por filial
  const vendasFilialUrl = apiParams.schema
    ? `/api/dashboard/vendas-por-filial?schema=${apiParams.schema}&data_inicio=${apiParams.data_inicio}&data_fim=${apiParams.data_fim}&filiais=${apiParams.filiais}`
    : null
  const { data: vendasPorFilial, isLoading: isLoadingVendasFilial } = useSWR<VendaPorFilial[]>(vendasFilialUrl, fetcher, { refreshInterval: 0 });



  // Buscar filiais reais do tenant atual
  const { options: todasAsFiliais, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant
  })

  const isDataLoading = isLoading || !currentTenant
  const periodoAtual = `Dados de ${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy", { locale: ptBR })}`

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

          {/* PERÍODO */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label>Período</Label>
            <div className="h-10">
              <PeriodFilter onPeriodChange={handlePeriodChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Cards e Gráfico */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4">
        {isDataLoading ? (
          <>
            {/* Skeleton para CardMetric */}
            {[1, 2, 3, 4].map((i) => (
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
              title="Total Vendas (Acum. Ano)"
              value={formatCurrency(data.ytd_vendas)}
              previousValue={formatCurrency(data.ytd_vendas_ano_anterior)}
              variationPercent={`${(data.ytd_variacao_percent || 0) >= 0 ? '+' : ''}${(data.ytd_variacao_percent || 0).toFixed(2)}%`}
              variationYear=""
              isPositive={(data.ytd_variacao_percent || 0) >= 0}
            />
            <CardMetric
              title="Total de Vendas"
              value={formatCurrency(data.total_vendas)}
              previousValue={formatCurrency(data.pa_vendas)}
              variationPercent={`${(data.variacao_vendas_mes || 0) >= 0 ? '+' : ''}${(data.variacao_vendas_mes || 0).toFixed(2)}%`}
              variationYear={`${(data.variacao_vendas_ano || 0) >= 0 ? '+' : ''}${(data.variacao_vendas_ano || 0).toFixed(2)}%`}
              isPositive={(data.variacao_vendas_mes || 0) >= 0}
            />
            <CardMetric
              title="Total de Lucro"
              value={formatCurrency(data.total_lucro)}
              previousValue={formatCurrency(data.pa_lucro)}
              variationPercent={`${(data.variacao_lucro_mes || 0) >= 0 ? '+' : ''}${(data.variacao_lucro_mes || 0).toFixed(2)}%`}
              variationYear={`${(data.variacao_lucro_ano || 0) >= 0 ? '+' : ''}${(data.variacao_lucro_ano || 0).toFixed(2)}%`}
              isPositive={(data.variacao_lucro_mes || 0) >= 0}
            />
            <CardMetric
              title="Margem de Lucro"
              value={formatPercentage(data.margem_lucro)}
              previousValue={formatPercentage(data.pa_margem_lucro)}
              variationPercent={`${(data.variacao_margem_mes || 0) >= 0 ? '+' : ''}${(data.variacao_margem_mes || 0).toFixed(2)}p.p.`}
              variationYear={`${(data.variacao_margem_ano || 0) >= 0 ? '+' : ''}${(data.variacao_margem_ano || 0).toFixed(2)}p.p.`}
              isPositive={(data.variacao_margem_mes || 0) >= 0}
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