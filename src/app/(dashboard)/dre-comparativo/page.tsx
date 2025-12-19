'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { logModuleAccess } from '@/lib/audit'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { MultiSelect } from '@/components/ui/multi-select'
import { Plus, X, FileBarChart, ChevronDown, ChevronRight, CalendarIcon } from 'lucide-react'
import { Fragment } from 'react'
import { format, parse, isValid, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PeriodType = 'month' | 'year' | 'custom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Interface para um contexto de comparação
interface ComparisonContext {
  id: string
  label: string
  filiais: { value: string; label: string }[]
  periodoTipo: PeriodType
  mes: number
  ano: number
  dataInicio: Date
  dataFim: Date
  // Estados do datepicker
  startDateInput: string
  endDateInput: string
}

// Interface para dados do DRE
interface DRELineData {
  descricao: string
  tipo: 'header' | 'subitem' | 'total'
  nivel: number
  valores: Record<string, number> // contextoId -> valor
  expandable?: boolean
  items?: DRELineData[]
  isDeduction?: boolean // Indica se é linha de dedução (CMV, despesas)
}

interface DREComparativeData {
  linhas: DRELineData[]
  contextos: { id: string; label: string }[]
}

// Meses disponíveis (índice 0-11)
const MESES = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
]

// Helper para criar datas do período
const createPeriodDates = (tipo: PeriodType, mes: number, ano: number, startInput?: string, endInput?: string) => {
  if (tipo === 'custom' && startInput && endInput) {
    const start = parse(startInput, 'dd/MM/yyyy', new Date())
    const end = parse(endInput, 'dd/MM/yyyy', new Date())
    if (isValid(start) && isValid(end)) {
      return { dataInicio: start, dataFim: end }
    }
  }
  if (tipo === 'year') {
    return {
      dataInicio: new Date(ano, 0, 1),
      dataFim: new Date(ano, 11, 31)
    }
  }
  return {
    dataInicio: startOfMonth(new Date(ano, mes)),
    dataFim: endOfMonth(new Date(ano, mes))
  }
}

// Gerar ID único
const generateId = () => Math.random().toString(36).substring(2, 9)

export default function DREComparativoPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { branchOptions: todasAsFiliais, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false,
  })

  // Estados
  const [contexts, setContexts] = useState<ComparisonContext[]>([])
  const [data, setData] = useState<DREComparativeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  // Data atual para defaults
  const currentDate = useMemo(() => new Date(), [])
  const currentMonth = (currentDate.getMonth() + 1).toString()
  const currentYear = currentDate.getFullYear().toString()

  // Anos disponíveis (últimos 5 anos)
  const anos = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const year = currentDate.getFullYear() - i
      return { value: year.toString(), label: year.toString() }
    })
  }, [currentDate])

  // Log de acesso ao módulo
  useEffect(() => {
    if (userProfile && currentTenant) {
      logModuleAccess({
        module: 'dre-gerencial',
        subModule: 'comparativo',
        action: 'view',
        tenantId: currentTenant.id,
        userName: userProfile.full_name,
      })
    }
  }, [userProfile, currentTenant])

  // Inicializar com 2 contextos padrão
  useEffect(() => {
    if (todasAsFiliais.length > 0 && contexts.length === 0) {
      const mesAnterior = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1
      const anoMesAnterior = currentDate.getMonth() === 0
        ? currentDate.getFullYear() - 1
        : currentDate.getFullYear()

      const datas1 = createPeriodDates('month', mesAnterior, anoMesAnterior)
      const datas2 = createPeriodDates('month', mesAnterior, anoMesAnterior - 1)

      setContexts([
        {
          id: generateId(),
          label: 'Comparação 1',
          filiais: [...todasAsFiliais],
          periodoTipo: 'month',
          mes: mesAnterior,
          ano: anoMesAnterior,
          dataInicio: datas1.dataInicio,
          dataFim: datas1.dataFim,
          startDateInput: '',
          endDateInput: '',
        },
        {
          id: generateId(),
          label: 'Comparação 2',
          filiais: [...todasAsFiliais],
          periodoTipo: 'month',
          mes: mesAnterior,
          ano: anoMesAnterior - 1,
          dataInicio: datas2.dataInicio,
          dataFim: datas2.dataFim,
          startDateInput: '',
          endDateInput: '',
        },
      ])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasAsFiliais])

  // Adicionar novo contexto
  const addContext = () => {
    if (contexts.length >= 4) return

    const mesNum = parseInt(currentMonth) - 1 // Converter para índice 0-11
    const anoNum = parseInt(currentYear)
    const datas = createPeriodDates('month', mesNum, anoNum)

    const newContext: ComparisonContext = {
      id: generateId(),
      label: `Comparação ${contexts.length + 1}`,
      filiais: [...todasAsFiliais],
      periodoTipo: 'month',
      mes: mesNum,
      ano: anoNum,
      dataInicio: datas.dataInicio,
      dataFim: datas.dataFim,
      startDateInput: '',
      endDateInput: '',
    }
    setContexts([...contexts, newContext])
  }

  // Remover contexto
  const removeContext = (id: string) => {
    if (contexts.length <= 2) return // Mínimo de 2 contextos
    setContexts(contexts.filter(c => c.id !== id))
  }

  // Atualizar contexto
  const updateContext = (id: string, updates: Partial<ComparisonContext>) => {
    setContexts(contexts.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  // Buscar dados comparativos
  const fetchData = async () => {
    if (!currentTenant?.supabase_schema) return

    // Validar que todos os contextos têm filiais selecionadas
    const invalidContext = contexts.find(c => c.filiais.length === 0)
    if (invalidContext) {
      setError(`${invalidContext.label}: selecione ao menos uma filial`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        contexts: JSON.stringify(contexts.map(c => ({
          id: c.id,
          label: c.label,
          filiais: c.filiais.map(f => f.value),
          mes: c.periodoTipo === 'year' ? -1 : c.mes + 1, // API espera 1-12, -1 para ano
          ano: c.ano,
          data_inicio: format(c.dataInicio, 'yyyy-MM-dd'),
          data_fim: format(c.dataFim, 'yyyy-MM-dd'),
        }))),
      })

      const response = await fetch(`/api/dre-comparativo?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar dados')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados')
      console.error('Error fetching comparative data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Toggle de expansão de linha
  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Formatar valor em moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Formatar percentual (para coluna de variação %)
  const formatPercent = (value: number) => {
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(2)}%`
  }

  // Formatar valor como margem (XX,XX %)
  const formatMargin = (value: number) => {
    return `${value.toFixed(2).replace('.', ',')} %`
  }

  // Formatar diferença em pontos percentuais (p.p.)
  const formatPP = (value: number) => {
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${value.toFixed(2).replace('.', ',')} p.p.`
  }

  // Verificar se a linha é uma margem (%)
  const isMarginLine = (descricao: string) => {
    return descricao.toLowerCase().includes('margem')
  }

  // Calcular diferença absoluta
  const calcDiferencaAbsoluta = (valor1: number, valor2: number) => {
    return valor1 - valor2
  }

  // Calcular diferença percentual
  const calcDiferencaPercentual = (valor1: number, valor2: number) => {
    if (valor2 === 0) return valor1 > 0 ? 100 : 0
    return ((valor1 - valor2) / Math.abs(valor2)) * 100
  }

  // Obter cor para diferença (positivo = verde para receitas, vermelho para despesas)
  const getDiffColor = (diff: number, isExpense: boolean = false) => {
    if (diff === 0) return 'text-muted-foreground'
    if (isExpense) {
      // Para despesas: aumento é ruim (vermelho), diminuição é bom (verde)
      return diff > 0 ? 'text-red-500' : 'text-green-500'
    }
    // Para receitas: aumento é bom (verde), diminuição é ruim (vermelho)
    return diff > 0 ? 'text-green-500' : 'text-red-500'
  }

  // Gerar label do contexto para exibição
  const getContextDisplayLabel = (ctx: ComparisonContext) => {
    let periodoLabel: string
    if (ctx.periodoTipo === 'year') {
      periodoLabel = `${ctx.ano}`
    } else if (ctx.periodoTipo === 'custom') {
      periodoLabel = `${format(ctx.dataInicio, 'dd/MM/yy')} - ${format(ctx.dataFim, 'dd/MM/yy')}`
    } else {
      const mesLabel = MESES.find(m => m.value === ctx.mes.toString())?.label || ctx.mes
      periodoLabel = `${mesLabel}/${ctx.ano}`
    }

    const filiaisLabel = ctx.filiais.length === todasAsFiliais.length
      ? 'Todas'
      : ctx.filiais.length === 1
        ? ctx.filiais[0].label
        : `${ctx.filiais.length} filiais`
    return `${periodoLabel} - ${filiaisLabel}`
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6" />
            DRE Comparativo
          </h1>
          <p className="text-muted-foreground">
            Compare o DRE de diferentes períodos e filiais lado a lado
          </p>
        </div>
      </div>

      {/* Configurador de Contextos */}
      <Card>
        <CardHeader>
          <CardTitle>Configurador de Comparação</CardTitle>
          <CardDescription>
            Configure até 4 contextos para comparar (mínimo 2)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contextos */}
          <div className="grid gap-4 md:grid-cols-2">
            {contexts.map((ctx) => (
              <Card key={ctx.id} className="relative border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {ctx.label}
                    </CardTitle>
                    {contexts.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeContext(ctx.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Filiais */}
                  <div className="space-y-1">
                    <Label className="text-xs">Filiais</Label>
                    <MultiSelect
                      options={todasAsFiliais}
                      value={ctx.filiais}
                      onValueChange={(value) => updateContext(ctx.id, { filiais: value })}
                      placeholder={isLoadingBranches ? "Carregando..." : "Selecione..."}
                      disabled={isLoadingBranches}
                      className="min-h-9"
                    />
                  </div>

                  {/* Período - Todos os campos em linha no desktop */}
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-2">
                    {/* Tipo de Período */}
                    <div className="space-y-1 w-full lg:w-[130px] flex-shrink-0">
                      <Label className="text-xs">Período</Label>
                      <Select
                        value={ctx.periodoTipo}
                        onValueChange={(value: PeriodType) => {
                          if (value === 'custom') {
                            const now = new Date()
                            const firstDay = startOfMonth(now)
                            const lastDay = endOfMonth(now)
                            updateContext(ctx.id, {
                              periodoTipo: value,
                              startDateInput: format(firstDay, 'dd/MM/yyyy'),
                              endDateInput: format(lastDay, 'dd/MM/yyyy'),
                              dataInicio: firstDay,
                              dataFim: lastDay,
                            })
                          } else {
                            const datas = createPeriodDates(value, ctx.mes, ctx.ano)
                            updateContext(ctx.id, {
                              periodoTipo: value,
                              dataInicio: datas.dataInicio,
                              dataFim: datas.dataFim,
                            })
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Mês</SelectItem>
                          <SelectItem value="year">Ano</SelectItem>
                          <SelectItem value="custom">Customizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campos dinâmicos baseado no tipo de período */}
                    {ctx.periodoTipo === 'month' && (
                      <>
                        <div className="space-y-1 w-full lg:w-[120px] flex-shrink-0">
                          <Label className="text-xs">Mês</Label>
                          <Select
                            value={ctx.mes.toString()}
                            onValueChange={(value) => {
                              const mesNum = parseInt(value)
                              const datas = createPeriodDates('month', mesNum, ctx.ano)
                              updateContext(ctx.id, {
                                mes: mesNum,
                                dataInicio: datas.dataInicio,
                                dataFim: datas.dataFim,
                              })
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MESES.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 w-full lg:w-[90px] flex-shrink-0">
                          <Label className="text-xs">Ano</Label>
                          <Select
                            value={ctx.ano.toString()}
                            onValueChange={(value) => {
                              const anoNum = parseInt(value)
                              const datas = createPeriodDates('month', ctx.mes, anoNum)
                              updateContext(ctx.id, {
                                ano: anoNum,
                                dataInicio: datas.dataInicio,
                                dataFim: datas.dataFim,
                              })
                            }}
                          >
                            <SelectTrigger className="h-9">
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
                      </>
                    )}

                    {ctx.periodoTipo === 'year' && (
                      <div className="space-y-1 w-full lg:w-[90px] flex-shrink-0">
                        <Label className="text-xs">Ano</Label>
                        <Select
                          value={ctx.ano.toString()}
                          onValueChange={(value) => {
                            const anoNum = parseInt(value)
                            const datas = createPeriodDates('year', ctx.mes, anoNum)
                            updateContext(ctx.id, {
                              ano: anoNum,
                              dataInicio: datas.dataInicio,
                              dataFim: datas.dataFim,
                            })
                          }}
                        >
                          <SelectTrigger className="h-9">
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
                    )}

                    {ctx.periodoTipo === 'custom' && (
                      <>
                        <div className="space-y-1 w-full lg:w-[120px] flex-shrink-0">
                          <Label className="text-xs">Início</Label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="dd/mm/aaaa"
                              value={ctx.startDateInput}
                              onChange={(e) => {
                                const value = e.target.value
                                const parsedDate = parse(value, 'dd/MM/yyyy', new Date())
                                updateContext(ctx.id, {
                                  startDateInput: value,
                                  ...(isValid(parsedDate) && { dataInicio: parsedDate }),
                                })
                              }}
                              className="h-9 text-xs text-center pr-8"
                              maxLength={10}
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                >
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={ctx.startDateInput ? parse(ctx.startDateInput, 'dd/MM/yyyy', new Date()) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateContext(ctx.id, {
                                        startDateInput: format(date, 'dd/MM/yyyy'),
                                        dataInicio: date,
                                      })
                                    }
                                  }}
                                  defaultMonth={ctx.startDateInput ? parse(ctx.startDateInput, 'dd/MM/yyyy', new Date()) : new Date()}
                                  captionLayout="dropdown"
                                  startMonth={new Date(2020, 0)}
                                  endMonth={new Date(2030, 11)}
                                  locale={ptBR}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <span className="hidden lg:block text-muted-foreground self-end pb-2">→</span>
                        <div className="space-y-1 w-full lg:w-[120px] flex-shrink-0">
                          <Label className="text-xs">Fim</Label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="dd/mm/aaaa"
                              value={ctx.endDateInput}
                              onChange={(e) => {
                                const value = e.target.value
                                const parsedDate = parse(value, 'dd/MM/yyyy', new Date())
                                updateContext(ctx.id, {
                                  endDateInput: value,
                                  ...(isValid(parsedDate) && { dataFim: parsedDate }),
                                })
                              }}
                              className="h-9 text-xs text-center pr-8"
                              maxLength={10}
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                >
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={ctx.endDateInput ? parse(ctx.endDateInput, 'dd/MM/yyyy', new Date()) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateContext(ctx.id, {
                                        endDateInput: format(date, 'dd/MM/yyyy'),
                                        dataFim: date,
                                      })
                                    }
                                  }}
                                  defaultMonth={ctx.endDateInput ? parse(ctx.endDateInput, 'dd/MM/yyyy', new Date()) : new Date()}
                                  captionLayout="dropdown"
                                  startMonth={new Date(2020, 0)}
                                  endMonth={new Date(2030, 11)}
                                  locale={ptBR}
                                  disabled={(date) => {
                                    const startDate = ctx.startDateInput ? parse(ctx.startDateInput, 'dd/MM/yyyy', new Date()) : undefined
                                    return startDate && isValid(startDate) ? date < startDate : false
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 pt-2">
            {contexts.length < 4 && (
              <Button
                variant="outline"
                onClick={addContext}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Comparação
              </Button>
            )}
            <Button
              onClick={fetchData}
              disabled={loading || contexts.length < 2}
              className="gap-2"
            >
              {loading ? 'Carregando...' : 'Filtrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Comparativa */}
      {!loading && data && data.linhas && data.linhas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Demonstração do Resultado do Exercício</CardTitle>
            <CardDescription>
              Comparação entre {contexts.length} períodos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="min-w-[200px] sticky left-0 bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                      Descrição
                    </TableHead>
                    {contexts.map((ctx) => (
                      <TableHead key={ctx.id} className="text-right min-w-[120px]">
                        <div className="text-xs font-normal text-muted-foreground">
                          {getContextDisplayLabel(ctx)}
                        </div>
                      </TableHead>
                    ))}
                    {contexts.length >= 2 && (
                      <>
                        <TableHead className="text-right min-w-[100px] bg-muted/30">
                          <div className="text-xs">Δ Absoluto</div>
                        </TableHead>
                        <TableHead className="text-right min-w-[80px] bg-muted/30">
                          <div className="text-xs">Δ %</div>
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.linhas.map((linha, idx) => {
                    const isExpanded = expandedRows[`${idx}`]
                    const hasItems = linha.items && linha.items.length > 0
                    const isHeader = linha.tipo === 'header'
                    const isTotal = linha.tipo === 'total'
                    const isExpense = linha.isDeduction ||
                                     linha.descricao.toLowerCase().includes('despesa') ||
                                     linha.descricao.toLowerCase().includes('cmv')
                    const isMargin = isMarginLine(linha.descricao)

                    // Calcular diferenças (primeiro contexto - segundo contexto)
                    const valor1 = linha.valores[contexts[0]?.id] || 0
                    const valor2 = linha.valores[contexts[1]?.id] || 0
                    const diffAbs = calcDiferencaAbsoluta(valor1, valor2)
                    const diffPercent = calcDiferencaPercentual(valor1, valor2)

                    return (
                      <Fragment key={idx}>
                        <TableRow
                          className={`
                            ${isHeader ? 'bg-primary/10 font-semibold' : ''}
                            ${isTotal ? 'bg-muted font-bold border-t-2' : ''}
                            ${hasItems ? 'cursor-pointer hover:bg-muted/50' : ''}
                          `}
                          onClick={() => hasItems && toggleRow(`${idx}`)}
                        >
                          <TableCell className={`sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] ${isHeader ? 'bg-blue-50 dark:bg-blue-950' : isTotal ? 'bg-muted' : 'bg-background'}`}>
                            <div className="flex items-center gap-2">
                              {hasItems && (
                                isExpanded
                                  ? <ChevronDown className="h-4 w-4" />
                                  : <ChevronRight className="h-4 w-4" />
                              )}
                              <span style={{ paddingLeft: `${linha.nivel * 16}px` }}>
                                {linha.descricao}
                              </span>
                            </div>
                          </TableCell>
                          {contexts.map((ctx) => (
                            <TableCell
                              key={ctx.id}
                              className={`text-right ${isHeader ? 'bg-primary/10' : ''} ${isTotal ? 'bg-muted' : ''}`}
                            >
                              {isMargin
                                ? formatMargin(linha.valores[ctx.id] || 0)
                                : formatCurrency(linha.valores[ctx.id] || 0)
                              }
                            </TableCell>
                          ))}
                          {contexts.length >= 2 && (
                            <>
                              <TableCell className={`text-right bg-muted/30 ${getDiffColor(diffAbs, isExpense)}`}>
                                {isMargin
                                  ? formatPP(diffAbs)
                                  : formatCurrency(diffAbs)
                                }
                              </TableCell>
                              <TableCell className={`text-right bg-muted/30 ${getDiffColor(diffPercent, isExpense)}`}>
                                {isMargin
                                  ? '-'
                                  : formatPercent(diffPercent)
                                }
                              </TableCell>
                            </>
                          )}
                        </TableRow>

                        {/* Sub-items (expandable) */}
                        {hasItems && isExpanded && linha.items?.map((subItem, subIdx) => {
                          const subValor1 = subItem.valores[contexts[0]?.id] || 0
                          const subValor2 = subItem.valores[contexts[1]?.id] || 0
                          const subDiffAbs = calcDiferencaAbsoluta(subValor1, subValor2)
                          const subDiffPercent = calcDiferencaPercentual(subValor1, subValor2)
                          const subIsExpense = subItem.isDeduction || true // Subitens de despesas

                          return (
                            <TableRow key={`${idx}-${subIdx}`} className="bg-muted/20">
                              <TableCell className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                                <span style={{ paddingLeft: `${(linha.nivel + 1) * 16}px` }}>
                                  {subItem.descricao}
                                </span>
                              </TableCell>
                              {contexts.map((ctx) => (
                                <TableCell key={ctx.id} className="text-right">
                                  {formatCurrency(subItem.valores[ctx.id] || 0)}
                                </TableCell>
                              ))}
                              {contexts.length >= 2 && (
                                <>
                                  <TableCell className={`text-right bg-muted/30 ${getDiffColor(subDiffAbs, subIsExpense)}`}>
                                    {formatCurrency(subDiffAbs)}
                                  </TableCell>
                                  <TableCell className={`text-right bg-muted/30 ${getDiffColor(subDiffPercent, subIsExpense)}`}>
                                    {formatPercent(subDiffPercent)}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sem dados */}
      {!loading && data && (!data.linhas || data.linhas.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum dado encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Não há dados disponíveis para os períodos selecionados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrução inicial */}
      {!loading && !data && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Configure os contextos e clique em Filtrar</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Selecione as filiais, mês e ano para cada contexto de comparação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
