'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { ChevronDown, ChevronRight, FileDown } from 'lucide-react'
import { logModuleAccess } from '@/lib/audit'
import { format, startOfMonth, subDays } from 'date-fns'
import { PeriodFilter } from '@/components/despesas/period-filter'
import { MultiSelect } from '@/components/ui/multi-select'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'

// Interfaces para dados estruturados por filial
interface DespesaPorFilial {
  data_despesa: string
  descricao_despesa: string
  fornecedor_id: string | null
  numero_nota: number | null
  serie_nota: string | null
  observacao: string | null
  data_emissao: string | null
  valores_filiais: Record<number, number> // { filial_id: valor }
}

interface TipoPorFilial {
  tipo_id: number
  tipo_descricao: string
  valores_filiais: Record<number, number>
  despesas: DespesaPorFilial[]
}

interface DepartamentoPorFilial {
  dept_id: number
  dept_descricao: string
  valores_filiais: Record<number, number>
  tipos: TipoPorFilial[]
}

interface GraficoData {
  mes: string
  valor: number
}

interface ReportData {
  totalizador: {
    valorTotal: number
    qtdRegistros: number
    qtdDepartamentos: number
    qtdTipos: number
    mediaDepartamento: number
  }
  grafico: GraficoData[]
  departamentos: DepartamentoPorFilial[]
  filiais: number[] // IDs das filiais retornadas
}

export default function DespesasPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { options: todasAsFiliais, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant
  })

  // Estados dos filtros - seguindo padrão do Dashboard
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  const [dataInicial, setDataInicial] = useState<Date>(startOfMonth(new Date()))
  const [dataFinal, setDataFinal] = useState<Date>(subDays(new Date(), 1))

  // Estados dos dados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estados de expansão - Departamentos abertos por padrão, tipos fechados
  const [expandedDepts, setExpandedDepts] = useState<Record<number, boolean>>({})
  const [expandedTipos, setExpandedTipos] = useState<Record<string, boolean>>({})

  // Abrir todos os departamentos quando os dados carregarem
  useEffect(() => {
    if (data?.departamentos) {
      const allDepts: Record<number, boolean> = {}
      data.departamentos.forEach(dept => {
        allDepts[dept.dept_id] = true
      })
      setExpandedDepts(allDepts)
      setExpandedTipos({}) // Tipos fechados
    }
  }, [data?.departamentos])

  // Handler para mudança de período
  const handlePeriodChange = (start: Date, end: Date) => {
    setDataInicial(start)
    setDataFinal(end)
  }

  // Log de acesso ao módulo
  useEffect(() => {
    if (userProfile?.id && currentTenant?.id) {
      logModuleAccess({
        module: 'despesas',
        tenantId: currentTenant.id,
        userName: userProfile.full_name || 'Usuário',
        userEmail: userProfile.id, // user ID instead of email
      })
    }
  }, [userProfile?.id, currentTenant?.id, userProfile?.full_name])

  // Buscar dados automaticamente quando filtros mudarem
  useEffect(() => {
    if (currentTenant?.supabase_schema && dataInicial && dataFinal) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.supabase_schema, filiaisSelecionadas, dataInicial, dataFinal])

  const fetchData = async () => {
    if (!currentTenant?.supabase_schema || !dataInicial || !dataFinal) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Obter lista de filiais (todas ou selecionadas)
      const filiaisParaBuscar = filiaisSelecionadas.length === 0
        ? todasAsFiliais.map(f => parseInt(f.value)).filter(id => !isNaN(id))
        : filiaisSelecionadas.map(f => parseInt(f.value)).filter(id => !isNaN(id))

      if (filiaisParaBuscar.length === 0) {
        setError('Selecione pelo menos uma filial')
        setLoading(false)
        return
      }

      // Buscar dados para cada filial
      const promises = filiaisParaBuscar.map(async (filialId) => {
        const params = new URLSearchParams({
          schema: currentTenant.supabase_schema || '',
          filial_id: filialId.toString(),
          data_inicial: format(dataInicial, 'yyyy-MM-dd'),
          data_final: format(dataFinal, 'yyyy-MM-dd'),
        })

        const response = await fetch(`/api/despesas/hierarquia?${params}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar dados')
        }

        return { filialId, data: result }
      })

      const results = await Promise.all(promises)

      // Consolidar dados de todas as filiais
      const consolidated = consolidateData(results)
      setData(consolidated)
    } catch (err) {
      console.error('[Despesas] Erro:', err)
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados')
    } finally {
      setLoading(false)
    }
  }

  const consolidateData = (results: Array<{ filialId: number; data: ReportData }>): ReportData => {
    const deptMap = new Map<number, DepartamentoPorFilial>()
    const tipoMap = new Map<string, TipoPorFilial>()
    const despesaMap = new Map<string, DespesaPorFilial>()
    const graficoMap = new Map<string, number>()
    
    let totalGeral = 0
    let totalRegistros = 0

    // Processar cada filial
    /* eslint-disable @typescript-eslint/no-explicit-any */
    results.forEach(({ filialId, data }) => {
      if (!data || !data.departamentos) return

      // Processar gráfico
      data.grafico?.forEach((item: GraficoData) => {
        const valorAtual = graficoMap.get(item.mes) || 0
        graficoMap.set(item.mes, valorAtual + item.valor)
      })

      // Processar departamentos, tipos e despesas
      data.departamentos.forEach((dept: any) => {
        // Departamento
        if (!deptMap.has(dept.dept_id)) {
          deptMap.set(dept.dept_id, {
            dept_id: dept.dept_id,
            dept_descricao: dept.dept_descricao,
            valores_filiais: {},
            tipos: []
          })
        }
        const deptConsolidado = deptMap.get(dept.dept_id)!
        deptConsolidado.valores_filiais[filialId] = dept.valor_total
        totalGeral += dept.valor_total

        // Tipos
        dept.tipos?.forEach((tipo: any) => {
          const tipoKey = `${dept.dept_id}-${tipo.tipo_id}`
          
          if (!tipoMap.has(tipoKey)) {
            tipoMap.set(tipoKey, {
              tipo_id: tipo.tipo_id,
              tipo_descricao: tipo.tipo_descricao,
              valores_filiais: {},
              despesas: []
            })
          }
          const tipoConsolidado = tipoMap.get(tipoKey)!
          tipoConsolidado.valores_filiais[filialId] = tipo.valor_total

          // Despesas
          tipo.despesas?.forEach((desp: any) => {
            const despKey = `${tipoKey}-${desp.data_despesa}-${desp.descricao_despesa}-${desp.numero_nota}`
            
            if (!despesaMap.has(despKey)) {
              despesaMap.set(despKey, {
                data_despesa: desp.data_despesa,
                descricao_despesa: desp.descricao_despesa,
                fornecedor_id: desp.fornecedor_id,
                numero_nota: desp.numero_nota,
                serie_nota: desp.serie_nota,
                observacao: desp.observacao,
                data_emissao: desp.data_emissao,
                valores_filiais: {}
              })
            }
            const despConsolidada = despesaMap.get(despKey)!
            despConsolidada.valores_filiais[filialId] = desp.valor
            totalRegistros++
          })
        })
      })
    })
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Montar estrutura hierárquica
    const departamentos: DepartamentoPorFilial[] = []
    
    deptMap.forEach((dept) => {
      const tipos: TipoPorFilial[] = []
      
      tipoMap.forEach((tipo, tipoKey) => {
        if (tipoKey.startsWith(`${dept.dept_id}-`)) {
          const despesas: DespesaPorFilial[] = []
          
          despesaMap.forEach((desp, despKey) => {
            if (despKey.startsWith(tipoKey)) {
              despesas.push(desp)
            }
          })

          // Ordenar despesas por valor total (maior para menor)
          despesas.sort((a, b) => {
            const totalA = Object.values(a.valores_filiais).reduce((sum, v) => sum + v, 0)
            const totalB = Object.values(b.valores_filiais).reduce((sum, v) => sum + v, 0)
            return totalB - totalA
          })

          tipo.despesas = despesas
          tipos.push(tipo)
        }
      })

      // Ordenar tipos por valor total (maior para menor)
      tipos.sort((a, b) => {
        const totalA = Object.values(a.valores_filiais).reduce((sum, v) => sum + v, 0)
        const totalB = Object.values(b.valores_filiais).reduce((sum, v) => sum + v, 0)
        return totalB - totalA
      })

      dept.tipos = tipos
      departamentos.push(dept)
    })

    // Ordenar departamentos por valor total (maior para menor)
    departamentos.sort((a, b) => {
      const totalA = Object.values(a.valores_filiais).reduce((sum, v) => sum + v, 0)
      const totalB = Object.values(b.valores_filiais).reduce((sum, v) => sum + v, 0)
      return totalB - totalA
    })

    // Processar gráfico
    const grafico = Array.from(graficoMap.entries())
      .map(([mes, valor]) => ({ mes, valor }))
      .sort((a, b) => a.mes.localeCompare(b.mes))

    // Extrair IDs das filiais dos resultados
    const filiais = results.map(r => r.filialId).sort((a, b) => a - b)

    return {
      totalizador: {
        valorTotal: totalGeral,
        qtdRegistros: totalRegistros,
        qtdDepartamentos: departamentos.length,
        qtdTipos: tipoMap.size,
        mediaDepartamento: departamentos.length > 0 ? totalGeral / departamentos.length : 0
      },
      grafico,
      departamentos,
      filiais
    }
  }


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return format(date, 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  const getFilialNome = (filialId: number) => {
    const filial = todasAsFiliais.find(f => parseInt(f.value) === filialId)
    return filial?.label || `Filial ${filialId}`
  }

  const getTotalFilial = (valores: Record<number, number>, filialId: number) => {
    return valores[filialId] || 0
  }

  const getTotalGeral = (valores: Record<number, number>) => {
    return Object.values(valores).reduce((sum, val) => sum + val, 0)
  }

  const calculatePercentage = (valor: number, total: number) => {
    if (total === 0) return '0,00%'
    const percentage = (valor / total) * 100
    return `${percentage.toFixed(2).replace('.', ',')}%`
  }

  // Calcula a diferença percentual de uma filial em relação à média (Total)
  const calculateDifference = (valorFilial: number, valorTotal: number, qtdFiliais: number) => {
    if (qtdFiliais === 0 || valorTotal === 0) return { diff: 0, isPositive: false }
    
    const media = valorTotal / qtdFiliais
    const diff = ((valorFilial - media) / media) * 100
    
    return {
      diff: Math.abs(diff),
      isPositive: valorFilial > media
    }
  }

  if (!currentTenant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      {/* Filtros */}
      <div className='space-y-4'>
        <div className="rounded-md border p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
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

            {/* FILTRAR POR */}
            <div className="flex-shrink-0">
              <PeriodFilter onPeriodChange={handlePeriodChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados */}
      {!loading && data && (
        <>
          {/* Tabela de Comparação */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Despesas por Filial</CardTitle>
              </div>
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <FileDown className="h-4 w-4" />
                Exportar
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 border-b font-medium whitespace-nowrap">
                        Descrição
                      </th>
                      <th className="p-3 border-b font-medium text-right whitespace-nowrap">
                        Total
                      </th>
                      {data.filiais.map((filialId) => (
                        <th
                          key={filialId}
                          className="p-3 border-b font-medium text-right whitespace-nowrap"
                        >
                          {getFilialNome(filialId)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Linha Total Despesas */}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                      <td className="p-3 border-b whitespace-nowrap">
                        TOTAL DESPESAS
                      </td>
                      <td className="p-3 border-b text-right whitespace-nowrap">
                        {formatCurrency(data.totalizador.valorTotal)}
                      </td>
                      {data.filiais.map((filialId) => {
                        // Calcular total da filial somando todos os departamentos
                        const totalFilial = data.departamentos.reduce((sum, dept) => {
                          return sum + (dept.valores_filiais[filialId] || 0)
                        }, 0)

                        return (
                          <td
                            key={filialId}
                            className="p-3 border-b text-right whitespace-nowrap bg-slate-100 dark:bg-slate-800"
                          >
                            {formatCurrency(totalFilial)}
                          </td>
                        )
                      })}
                    </tr>

                    {data.departamentos.map((dept) => (
                      <React.Fragment key={dept.dept_id}>
                        {/* Linha do Departamento */}
                        <tr className="hover:bg-muted/50 cursor-pointer">
                          <td
                            className="p-3 border-b whitespace-nowrap"
                            onClick={() => setExpandedDepts(prev => ({ ...prev, [dept.dept_id]: !prev[dept.dept_id] }))}
                          >
                            <div className="flex items-center gap-2">
                              {expandedDepts[dept.dept_id] ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                              )}
                              <span className="font-medium">{dept.dept_descricao}</span>
                            </div>
                          </td>
                          <td className="p-3 border-b text-right whitespace-nowrap">
                            <div className="font-bold">
                              {formatCurrency(getTotalGeral(dept.valores_filiais))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {calculatePercentage(getTotalGeral(dept.valores_filiais), data.totalizador.valorTotal)}
                            </div>
                          </td>
                          {data.filiais.map((filialId) => {
                            const valorFilial = getTotalFilial(dept.valores_filiais, filialId)
                            const totalGeral = getTotalGeral(dept.valores_filiais)
                            const { diff, isPositive } = calculateDifference(valorFilial, totalGeral, data.filiais.length)
                            
                            return (
                              <td
                                key={filialId}
                                className="p-3 border-b text-right whitespace-nowrap"
                              >
                                <div className="font-medium">
                                  {formatCurrency(valorFilial)}
                                </div>
                                {valorFilial > 0 && (
                                  <div
                                    className={`text-xs ${
                                      isPositive ? 'text-red-500' : 'text-green-500'
                                    }`}
                                  >
                                    {isPositive ? '+' : '-'}{diff.toFixed(1)}%
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>

                        {/* Tipos dentro do Departamento */}
                        {expandedDepts[dept.dept_id] && dept.tipos.map((tipo) => {
                          const tipoKey = `${dept.dept_id}-${tipo.tipo_id}`
                          return (
                            <React.Fragment key={tipoKey}>
                              <tr className="hover:bg-muted/40 cursor-pointer">
                                <td 
                                  className="p-3 border-b bg-background sticky left-0 z-10 w-[250px] sm:w-[300px] lg:w-[400px] pl-8"
                                  onClick={() => setExpandedTipos(prev => ({ ...prev, [tipoKey]: !prev[tipoKey] }))}
                                >
                                  <div className="flex items-center gap-2">
                                    {expandedTipos[tipoKey] ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    <span className="text-sm">{tipo.tipo_descricao}</span>
                                  </div>
                                </td>
                                <td className="p-3 border-b bg-background sticky left-[250px] sm:left-[300px] lg:left-[400px] z-10 w-[120px] sm:w-[150px]">
                                  <div className="flex flex-col items-end">
                                    <div className="text-sm font-semibold text-right">
                                      {formatCurrency(getTotalGeral(tipo.valores_filiais))}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {calculatePercentage(getTotalGeral(tipo.valores_filiais), data.totalizador.valorTotal)}
                                    </div>
                                  </div>
                                </td>
                                {data.filiais.map((filialId) => {
                                  const valorFilial = getTotalFilial(tipo.valores_filiais, filialId)
                                  const totalGeral = getTotalGeral(tipo.valores_filiais)
                                  const { diff, isPositive } = calculateDifference(valorFilial, totalGeral, data.filiais.length)
                                  
                                  return (
                                    <td
                                      key={filialId}
                                      className="p-3 border-b text-right whitespace-nowrap"
                                    >
                                      <div className="flex flex-col items-end gap-0.5">
                                        <div className="text-sm text-right">
                                          {formatCurrency(valorFilial)}
                                        </div>
                                        {valorFilial > 0 ? (
                                          <div 
                                            className={`text-[10px] font-medium ${
                                              isPositive ? 'text-red-500' : 'text-green-500'
                                            }`}
                                          >
                                            {isPositive ? '+' : '-'}{diff.toFixed(2).replace('.', ',')}%
                                          </div>
                                        ) : (
                                          <div className="text-[10px] text-muted-foreground">
                                            -
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>

                              {/* Despesas individuais */}
                              {expandedTipos[tipoKey] && tipo.despesas.map((desp, idx) => (
                                <tr key={idx} className="hover:bg-muted/20">
                                  <td className="p-3 border-b bg-background sticky left-0 z-10 w-[250px] sm:w-[300px] lg:w-[400px] pl-16">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs">{desp.descricao_despesa || 'Sem descrição'}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatDate(desp.data_emissao)}
                                        {desp.numero_nota && ` | Nota: ${desp.numero_nota}`}
                                        {desp.serie_nota && `-${desp.serie_nota}`}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 border-b bg-background sticky left-[250px] sm:left-[300px] lg:left-[400px] z-10 w-[120px] sm:w-[150px]">
                                    <div className="flex flex-col items-end">
                                      <div className="text-xs text-right">
                                        {formatCurrency(getTotalGeral(desp.valores_filiais))}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {calculatePercentage(getTotalGeral(desp.valores_filiais), data.totalizador.valorTotal)}
                                      </div>
                                    </div>
                                  </td>
                                  {data.filiais.map((filialId, colIdx) => {
                                    const valorFilial = getTotalFilial(desp.valores_filiais, filialId)
                                    const totalGeral = getTotalGeral(desp.valores_filiais)
                                    const { diff, isPositive } = calculateDifference(valorFilial, totalGeral, data.filiais.length)
                                    
                                    return (
                                      <td 
                                        key={filialId} 
                                        className={`p-3 border-b ${
                                          colIdx % 2 === 0 
                                            ? 'bg-muted/30' 
                                            : 'bg-background'
                                        }`}
                                      >
                                        <div className="flex flex-col items-end gap-0.5">
                                          <div className="text-xs text-right">
                                            {valorFilial > 0 ? formatCurrency(valorFilial) : '-'}
                                          </div>
                                          {valorFilial > 0 && (
                                            <div 
                                              className={`text-[9px] font-medium ${
                                                isPositive ? 'text-red-500' : 'text-green-500'
                                              }`}
                                            >
                                              {isPositive ? '+' : '-'}{diff.toFixed(2).replace('.', ',')}%
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </React.Fragment>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Necessário para React.Fragment
import * as React from 'react'
