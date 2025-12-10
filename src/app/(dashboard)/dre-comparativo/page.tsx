'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { logModuleAccess } from '@/lib/audit'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { MultiSelect } from '@/components/ui/multi-select'
import { Plus, X, FileBarChart, ChevronDown, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
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
  mes: string
  ano: string
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

// Meses disponíveis
const MESES = [
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
      const mesAnterior = currentDate.getMonth() === 0 ? '12' : currentDate.getMonth().toString()
      const anoMesAnterior = currentDate.getMonth() === 0
        ? (currentDate.getFullYear() - 1).toString()
        : currentYear

      setContexts([
        {
          id: generateId(),
          label: 'Comparação 1',
          filiais: [...todasAsFiliais],
          mes: mesAnterior,
          ano: anoMesAnterior,
        },
        {
          id: generateId(),
          label: 'Comparação 2',
          filiais: [...todasAsFiliais],
          mes: mesAnterior,
          ano: (parseInt(anoMesAnterior) - 1).toString(),
        },
      ])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasAsFiliais])

  // Adicionar novo contexto
  const addContext = () => {
    if (contexts.length >= 4) return

    const newContext: ComparisonContext = {
      id: generateId(),
      label: `Comparação ${contexts.length + 1}`,
      filiais: [...todasAsFiliais],
      mes: currentMonth,
      ano: currentYear,
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
          mes: parseInt(c.mes),
          ano: parseInt(c.ano),
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
    const mesLabel = MESES.find(m => m.value === ctx.mes)?.label || ctx.mes
    const filiaisLabel = ctx.filiais.length === todasAsFiliais.length
      ? 'Todas'
      : ctx.filiais.length === 1
        ? ctx.filiais[0].label
        : `${ctx.filiais.length} filiais`
    return `${mesLabel}/${ctx.ano} - ${filiaisLabel}`
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

                  {/* Mês e Ano */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Mês</Label>
                      <Select
                        value={ctx.mes}
                        onValueChange={(value) => updateContext(ctx.id, { mes: value })}
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
                    <div className="space-y-1">
                      <Label className="text-xs">Ano</Label>
                      <Select
                        value={ctx.ano}
                        onValueChange={(value) => updateContext(ctx.id, { ano: value })}
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
