'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { logModuleAccess } from '@/lib/audit'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { type FilialOption } from '@/components/filters'
import { DataTable } from '@/components/despesas/data-table'
import { createColumns, type DespesaRow } from '@/components/despesas/columns'
import { DespesasFilters } from '@/components/despesas/filters'
import { EmptyState } from '@/components/despesas/empty-state'
import { LoadingState } from '@/components/despesas/loading-state'
import { IndicatorsCards } from '@/components/despesas/indicators-cards'
import { Separator } from '@/components/ui/separator'
import { Receipt } from 'lucide-react'

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

interface IndicadoresData {
  receitaBruta: number
  lucroBruto: number
  cmv: number
  totalDespesas: number
  lucroLiquido: number
  margemLucroBruto: number
  margemLucroLiquido: number
}

interface DashboardData {
  total_vendas?: number
  total_lucro?: number
  margem_lucro?: number
}

interface ComparacaoIndicadores {
  current: IndicadoresData
  pam: {
    data: IndicadoresData
    ano: number
  }
  paa: {
    data: IndicadoresData
    ano: number
  }
}

interface ReceitaBrutaPorFilial {
  valores_filiais: Record<number, number> // { filial_id: receita_bruta }
  lucro_bruto_filiais: Record<number, number> // { filial_id: lucro_bruto }
  total: number // Soma total de todas as filiais (receita bruta)
  total_lucro_bruto: number // Soma total do lucro bruto
}

export default function DespesasPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { branchOptions: branches, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false
  })

  // Estados dos filtros - filial, mês e ano (mês anterior como padrão)
  const hoje = new Date()
  const mesAnterior = hoje.getMonth() - 1 < 0 ? 11 : hoje.getMonth() - 1
  const anoMesAnterior = hoje.getMonth() - 1 < 0 ? hoje.getFullYear() - 1 : hoje.getFullYear()
  
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])
  const [mes, setMes] = useState<number>(mesAnterior)
  const [ano, setAno] = useState<number>(anoMesAnterior)

  // Estados dos dados
  const [data, setData] = useState<ReportData | null>(null)
  const [dataPam, setDataPam] = useState<ReportData | null>(null)
  const [dataPaa, setDataPaa] = useState<ReportData | null>(null)
  const [indicadores, setIndicadores] = useState<ComparacaoIndicadores | null>(null)
  const [receitaPorFilial, setReceitaPorFilial] = useState<ReceitaBrutaPorFilial | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingIndicadores, setLoadingIndicadores] = useState(false)
  const [error, setError] = useState('')

  // Pré-selecionar todas as filiais ao carregar
  useEffect(() => {
    if (!isLoadingBranches && branches && branches.length > 0 && filiaisSelecionadas.length === 0) {
      setFiliaisSelecionadas(branches)
    }
  }, [isLoadingBranches, branches, filiaisSelecionadas.length])

  // Log de acesso ao módulo
  useEffect(() => {
    if (userProfile?.id && currentTenant?.id) {
      logModuleAccess({
        module: 'despesas',
        tenantId: currentTenant.id,
        userName: userProfile.full_name || 'Usuário',
        userEmail: userProfile.id,
      })
    }
  }, [userProfile?.id, currentTenant?.id, userProfile?.full_name])

  // Calcular datas com base em mês e ano
  const getDatasMesAno = (mesParam: number, anoParam: number) => {
    const dataInicio = startOfMonth(new Date(anoParam, mesParam))
    const dataFim = endOfMonth(new Date(anoParam, mesParam))
    return {
      dataInicio: format(dataInicio, 'yyyy-MM-dd'),
      dataFim: format(dataFim, 'yyyy-MM-dd')
    }
  }

  // Função para buscar receita bruta por filial
  const fetchReceitaBrutaPorFilial = async (
    filiais: FilialOption[],
    mesParam: number,
    anoParam: number
  ): Promise<ReceitaBrutaPorFilial | null> => {
    if (!currentTenant?.supabase_schema || filiais.length === 0) {
      return null
    }

    try {
      const { dataInicio, dataFim } = getDatasMesAno(mesParam, anoParam)

      // Buscar receita bruta para cada filial individualmente
      const promises = filiais.map(async (filial) => {
        const filialId = parseInt(filial.value)
        const params = new URLSearchParams({
          schema: currentTenant.supabase_schema || '',
          data_inicio: dataInicio,
          data_fim: dataFim,
          filiais: filial.value // Apenas uma filial por vez
        })

        const response = await fetch(`/api/dashboard?${params}`)
        if (!response.ok) {
          console.error(`[ReceitaBruta] Erro ao buscar filial ${filialId}`)
          return { filialId, receita: 0, lucro_bruto: 0 }
        }

        const dashboardData: DashboardData = await response.json()
        return {
          filialId,
          receita: dashboardData.total_vendas || 0,
          lucro_bruto: dashboardData.total_lucro || 0
        }
      })

      const results = await Promise.all(promises)

      // Montar objeto com valores por filial
      const valores_filiais: Record<number, number> = {}
      const lucro_bruto_filiais: Record<number, number> = {}
      let total = 0
      let total_lucro_bruto = 0

      results.forEach(({ filialId, receita, lucro_bruto }) => {
        valores_filiais[filialId] = receita
        lucro_bruto_filiais[filialId] = lucro_bruto
        total += receita
        total_lucro_bruto += lucro_bruto
      })

      return { valores_filiais, lucro_bruto_filiais, total, total_lucro_bruto }
    } catch (err) {
      console.error('[ReceitaBruta] Erro ao buscar receita bruta:', err)
      return null
    }
  }

  // Função para aplicar filtros (chamada pelo botão Filtrar)
  const handleFilter = async (filiais: FilialOption[], mesParam: number, anoParam: number) => {
    if (currentTenant?.supabase_schema && filiais.length > 0) {
      setLoading(true)
      setLoadingIndicadores(true)
      setError('')

      try {
        // Período atual
        const { dataInicio, dataFim } = getDatasMesAno(mesParam, anoParam)
        
        // PAM - mês anterior
        const mesPam = mesParam - 1 < 0 ? 11 : mesParam - 1
        const anoPam = mesParam - 1 < 0 ? anoParam - 1 : anoParam
        const { dataInicio: dataInicioPam, dataFim: dataFimPam } = getDatasMesAno(mesPam, anoPam)
        
        // PAA - mesmo mês ano passado
        const { dataInicio: dataInicioPaa, dataFim: dataFimPaa } = getDatasMesAno(mesParam, anoParam - 1)

        // Buscar em paralelo (despesas + receita bruta)
        const [dataAtual, despesasPam, despesasPaa, receitaBruta] = await Promise.all([
          fetchDespesasPeriodo(filiais, dataInicio, dataFim),
          fetchDespesasPeriodo(filiais, dataInicioPam, dataFimPam),
          fetchDespesasPeriodo(filiais, dataInicioPaa, dataFimPaa),
          fetchReceitaBrutaPorFilial(filiais, mesParam, anoParam)
        ])

        setData(dataAtual)
        setDataPam(despesasPam)
        setDataPaa(despesasPaa)
        setReceitaPorFilial(receitaBruta)
        setLoading(false)

        // Agora buscar indicadores com os dados de despesas já carregados
        await fetchIndicadores(filiais, mesParam, anoParam, dataAtual, despesasPam, despesasPaa)
      } catch (err) {
        const error = err as Error
        console.error('[Despesas] Erro ao buscar despesas:', error)
        setError(error.message || 'Erro ao carregar despesas')
        setLoading(false)
        setLoadingIndicadores(false)
      }
    }
  }



  // Função auxiliar para buscar despesas de um período
  const fetchDespesasPeriodo = async (
    filiais: FilialOption[],
    dataInicio: string,
    dataFim: string
  ): Promise<ReportData | null> => {
    if (!currentTenant?.supabase_schema) {
      return null
    }

    try {
      const filiaisParaBuscar = filiais.map(f => parseInt(f.value)).filter(id => !isNaN(id))

      if (filiaisParaBuscar.length === 0) {
        return null
      }

      const promises = filiaisParaBuscar.map(async (filialId) => {
        const params = new URLSearchParams({
          schema: currentTenant.supabase_schema || '',
          filial_id: filialId.toString(),
          data_inicial: dataInicio,
          data_final: dataFim,
        })

        const response = await fetch(`/api/dre-gerencial/hierarquia?${params}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar dados')
        }

        return { filialId, data: result }
      })

      const results = await Promise.all(promises)
      return consolidateData(results)
    } catch (error) {
      console.error('[Despesas] Erro ao buscar despesas:', error)
      return null
    }
  }

  // Buscar indicadores (mesma API do DRE Gerencial)
  const fetchIndicadores = async (
    filiais: FilialOption[],
    mesParam: number,
    anoParam: number,
    despesasAtual?: ReportData | null,
    despesasPam?: ReportData | null,
    despesasPaa?: ReportData | null
  ) => {
    if (!currentTenant?.supabase_schema) {
      return
    }

    setLoadingIndicadores(true)

    try {
      const { dataInicio, dataFim } = getDatasMesAno(mesParam, anoParam)
      const filialIds = filiais.map(f => f.value).join(',')
      
      // Buscar dados do período atual
      const paramsAtual = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        data_inicio: dataInicio,
        data_fim: dataFim,
        filiais: filialIds || 'all'
      })
      const responseAtual = await fetch(`/api/dashboard?${paramsAtual}`)
      if (!responseAtual.ok) throw new Error('Erro ao buscar dados atuais')
      const dashboardAtual = await responseAtual.json()

      // Buscar dados PAM (mesmo mês ano anterior)
      const anoAnteriorPam = anoParam - 1
      const { dataInicio: dataInicioPam, dataFim: dataFimPam } = getDatasMesAno(mesParam, anoAnteriorPam)
      const paramsPam = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        data_inicio: dataInicioPam,
        data_fim: dataFimPam,
        filiais: filialIds || 'all'
      })
      const responsePam = await fetch(`/api/dashboard?${paramsPam}`)
      const dashboardPam = responsePam.ok ? await responsePam.json() : null

      // Buscar dados PAA (acumulado ano até o mês)
      const { dataInicio: dataInicioPaa } = getDatasMesAno(1, anoAnteriorPam) // Janeiro do ano anterior
      const paramsPaa = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        data_inicio: dataInicioPaa,
        data_fim: dataFimPam,
        filiais: filialIds || 'all'
      })
      const responsePaa = await fetch(`/api/dashboard?${paramsPaa}`)
      const dashboardPaa = responsePaa.ok ? await responsePaa.json() : null

      const result = {
        current: dashboardAtual,
        pam: { data: dashboardPam, ano: anoAnteriorPam },
        paa: { data: dashboardPaa, ano: anoAnteriorPam }
      }

      // Processar dados do dashboard para calcular indicadores (incluindo despesas)
      const processIndicadores = (dashboardData: DashboardData | null, despesasData: ReportData | null): IndicadoresData => {
        const receitaBruta = dashboardData?.total_vendas || 0
        const lucroBruto = dashboardData?.total_lucro || 0
        // CMV = Receita Bruta - Lucro Bruto (custo das mercadorias vendidas)
        const cmv = receitaBruta - lucroBruto
        const margemLucroBruto = dashboardData?.margem_lucro || 0

        // Calcular total de despesas
        const totalDespesas = despesasData?.totalizador?.valorTotal || 0
        
        // Calcular lucro líquido: Lucro Bruto - Total Despesas
        const lucroLiquido = lucroBruto - totalDespesas
        
        // Calcular margem líquida: (Lucro Líquido / Receita Bruta) * 100
        const margemLucroLiquido = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

        return {
          receitaBruta,
          lucroBruto,
          cmv,
          totalDespesas,
          lucroLiquido,
          margemLucroBruto,
          margemLucroLiquido
        }
      }

      const processedIndicadores = {
        current: processIndicadores(result.current, despesasAtual || data),
        pam: {
          data: processIndicadores(result.pam.data, despesasPam || dataPam),
          ano: result.pam.ano
        },
        paa: {
          data: processIndicadores(result.paa.data, despesasPaa || dataPaa),
          ano: result.paa.ano
        }
      }

      setIndicadores(processedIndicadores)
    } catch (err) {
      console.error('[Despesas] Erro ao buscar indicadores:', err)
    } finally {
      setLoadingIndicadores(false)
    }
  }

  // Carregar dados inicialmente
  useEffect(() => {
    if (currentTenant?.supabase_schema && filiaisSelecionadas.length > 0 && !isLoadingBranches && !data) {
      handleFilter(filiaisSelecionadas, mes, ano)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.supabase_schema, filiaisSelecionadas.length, isLoadingBranches, data])

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


  // const formatCurrency = (value: number) => {
  //   return new Intl.NumberFormat('pt-BR', {
  //     style: 'currency',
  //     currency: 'BRL',
  //   }).format(value)
  // }

  // const formatDate = (dateStr: string | null) => {
  //   if (!dateStr) return '-'
  //   try {
  //     const date = new Date(dateStr)
  //     return format(date, 'dd/MM/yyyy')
  //   } catch {
  //     return dateStr
  //   }
  // }

  const getFilialNome = (filialId: number) => {
    const filial = filiaisSelecionadas.find(f => parseInt(f.value) === filialId)
    return filial?.label || `Filial ${filialId}`
  }

  // Transformar dados hierárquicos em formato plano para DataTable
  const transformToTableData = (reportData: ReportData): DespesaRow[] => {
    const rows: DespesaRow[] = []

    // Linha de receita bruta (se disponível)
    if (receitaPorFilial) {
      const receitaRow: DespesaRow = {
        id: 'receita',
        tipo: 'receita',
        descricao: 'RECEITA BRUTA',
        total: receitaPorFilial.total,
        percentual: 0, // Não tem percentual pois não faz parte da hierarquia de despesas
        valores_filiais: receitaPorFilial.valores_filiais,
        filiais: reportData.filiais,
      }
      rows.push(receitaRow)
    }

    // Linha de total despesas
    const totalRow: DespesaRow = {
      id: 'total',
      tipo: 'total',
      descricao: 'TOTAL DESPESAS',
      total: reportData.totalizador.valorTotal,
      percentual: 100,
      valores_filiais: reportData.departamentos.reduce((acc, dept) => {
        reportData.filiais.forEach(filialId => {
          acc[filialId] = (acc[filialId] || 0) + (dept.valores_filiais[filialId] || 0)
        })
        return acc
      }, {} as Record<number, number>),
      filiais: reportData.filiais,
      subRows: []
    }
    
    // Departamentos
    reportData.departamentos.forEach((dept) => {
      const deptTotal = Object.values(dept.valores_filiais).reduce((sum, v) => sum + v, 0)
      
      const deptRow: DespesaRow = {
        id: `dept_${dept.dept_id}`,
        tipo: 'departamento',
        descricao: dept.dept_descricao,
        total: deptTotal,
        percentual: (deptTotal / reportData.totalizador.valorTotal) * 100,
        valores_filiais: dept.valores_filiais,
        filiais: reportData.filiais,
        subRows: []
      }
      
      // Tipos
      dept.tipos.forEach((tipo) => {
        const tipoTotal = Object.values(tipo.valores_filiais).reduce((sum, v) => sum + v, 0)
        
        const tipoRow: DespesaRow = {
          id: `tipo_${dept.dept_id}_${tipo.tipo_id}`,
          tipo: 'tipo',
          descricao: tipo.tipo_descricao,
          total: tipoTotal,
          percentual: (tipoTotal / reportData.totalizador.valorTotal) * 100,
          valores_filiais: tipo.valores_filiais,
          filiais: reportData.filiais,
          subRows: []
        }
        
        // Despesas
        tipo.despesas.forEach((desp, idx) => {
          const despTotal = Object.values(desp.valores_filiais).reduce((sum, v) => sum + v, 0)
          
          const despRow: DespesaRow = {
            id: `desp_${dept.dept_id}_${tipo.tipo_id}_${idx}`,
            tipo: 'despesa',
            descricao: desp.descricao_despesa || 'Sem descrição',
            data_despesa: desp.data_despesa,
            data_emissao: desp.data_emissao || undefined,
            numero_nota: desp.numero_nota,
            serie_nota: desp.serie_nota,
            observacao: desp.observacao,
            total: despTotal,
            percentual: (despTotal / reportData.totalizador.valorTotal) * 100,
            valores_filiais: desp.valores_filiais,
            filiais: reportData.filiais,
          }
          
          tipoRow.subRows!.push(despRow)
        })
        
        deptRow.subRows!.push(tipoRow)
      })
      
      totalRow.subRows!.push(deptRow)
    })
    
    rows.push(totalRow)

    // Linha de lucro líquido (se disponível)
    if (receitaPorFilial) {
      // Calcular lucro líquido por filial: Lucro Bruto - Total Despesas
      const lucroLiquidoFiliais: Record<number, number> = {}
      let totalLucroLiquido = 0

      reportData.filiais.forEach(filialId => {
        const lucroBruto = receitaPorFilial.lucro_bruto_filiais[filialId] || 0
        const totalDespesas = totalRow.valores_filiais[filialId] || 0
        const lucroLiquido = lucroBruto - totalDespesas

        lucroLiquidoFiliais[filialId] = lucroLiquido
        totalLucroLiquido += lucroLiquido
      })

      const lucroLiquidoRow: DespesaRow = {
        id: 'lucro_liquido',
        tipo: 'lucro_liquido',
        descricao: 'LUCRO LÍQUIDO',
        total: totalLucroLiquido,
        percentual: 0, // Não tem percentual pois não faz parte da hierarquia de despesas
        valores_filiais: lucroLiquidoFiliais,
        filiais: reportData.filiais,
      }
      rows.push(lucroLiquidoRow)
    }

    return rows
  }

  if (!currentTenant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-8 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="space-y-2">
        <PageBreadcrumb />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DRE Gerencial</h1>
            <p className="text-muted-foreground">
              Análise comparativa de despesas entre filiais
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Filtros */}
      <DespesasFilters
        filiaisSelecionadas={filiaisSelecionadas}
        setFiliaisSelecionadas={setFiliaisSelecionadas}
        mes={mes}
        setMes={setMes}
        ano={ano}
        setAno={setAno}
        branches={branches}
        isLoadingBranches={isLoadingBranches}
        onFilter={handleFilter}
      />

      {/* Cards de Indicadores */}
      {!loading && (
        <IndicatorsCards
          indicadores={indicadores}
          loading={loadingIndicadores}
        />
      )}

      {/* Estados de Loading/Erro/Empty */}
      {loading && <LoadingState />}
      
      {error && !loading && (
        <EmptyState type="error" message={error} />
      )}

      {!loading && !error && filiaisSelecionadas.length === 0 && (
        <EmptyState type="no-filters" />
      )}

      {!loading && !error && filiaisSelecionadas.length > 0 && !data && (
        <EmptyState type="no-data" />
      )}

      {/* Dados */}
      {!loading && !error && data && (() => {
        const tableData = transformToTableData(data)
        // Extrair totais de cada filial da linha total (não da receita)
        const totalRow = tableData.find(row => row.tipo === 'total')
        const branchTotals = totalRow?.valores_filiais || {}

        return (
          <div className="w-full min-w-0">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  Detalhamento de Despesas
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-hidden pt-2 pb-4">
                <DataTable
                  columns={createColumns(
                    data.filiais,
                    getFilialNome,
                    indicadores?.current?.receitaBruta || 0,
                    branchTotals,
                    receitaPorFilial?.valores_filiais || {}
                  )}
                  data={tableData}
                  getRowCanExpand={(row) => {
                    return row.original.subRows !== undefined && row.original.subRows.length > 0
                  }}
                  getSubRows={(row) => row.subRows}
                />
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Legenda:</span> TD = Total de Despesas | TDF = Total Despesas da Filial | RB = Receita Bruta
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}
    </div>
  )
}


