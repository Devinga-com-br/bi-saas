'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Receipt, FileDown } from 'lucide-react'
import { MultiFilialFilter } from '@/components/filters'

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

interface PDFRowData {
  descricao: string
  [key: string]: string | number // Permite propriedades dinâmicas como filial_1, filial_2, total
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTableConfig = any

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

  // Estados do modal de configuração de PDF
  const [showPdfConfig, setShowPdfConfig] = useState(false)
  const [filiaisPdf, setFiliaisPdf] = useState<FilialOption[]>([])
  const [incluirReceitaBruta, setIncluirReceitaBruta] = useState(true)
  const [incluirLucroLiquido, setIncluirLucroLiquido] = useState(true)

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
  // dataReferenciaYTD: usado apenas quando mesParam === -1 para calcular YTD do ano anterior
  const getDatasMesAno = (mesParam: number, anoParam: number, dataReferenciaYTD?: Date) => {
    let dataInicio: Date
    let dataFim: Date

    if (mesParam === -1) {
      // Opção "Todos" selecionada
      dataInicio = new Date(anoParam, 0, 1) // 01/01/YYYY

      if (dataReferenciaYTD) {
        // YTD com data de referência específica (para PAM/PAA)
        // Usa o mesmo MÊS da referência até o ÚLTIMO DIA do mês
        const mesReferencia = dataReferenciaYTD.getMonth()

        // Pega o último dia do mês de referência no ano do parâmetro
        dataFim = endOfMonth(new Date(anoParam, mesReferencia))
      } else {
        // Período atual: verifica se é ano atual ou não
        const anoAtual = new Date().getFullYear()

        if (anoParam === anoAtual) {
          // Ano filtrado = Ano atual → busca até mês atual
          const mesAtual = new Date().getMonth()
          dataFim = endOfMonth(new Date(anoParam, mesAtual))
        } else {
          // Ano filtrado ≠ Ano atual → busca ano completo
          dataFim = new Date(anoParam, 11, 31) // 31/12/YYYY
        }
      }
    } else {
      // Mês específico (lógica atual mantida)
      dataInicio = startOfMonth(new Date(anoParam, mesParam))
      dataFim = endOfMonth(new Date(anoParam, mesParam))
    }

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

  // ==================== FUNÇÕES DE EXPORTAÇÃO PDF ====================

  // Função para obter configuração de PDF baseada no número de filiais
  const getConfigPDF = (numFiliais: number) => {
    // Dimensões das páginas em mm (landscape)
    const pageWidths = {
      a4: 297,  // A4 landscape
      a3: 420   // A3 landscape
    }

    // Margens laterais (reduzidas para aproveitar melhor o espaço)
    const marginLeft = 5
    const marginRight = 5

    // Configuração inicial
    let format: 'a4' | 'a3' = 'a4'
    let fontSize = 7
    let cellPadding = 1.5
    let useRotation = false
    let useHorizontalBreak = false

    // Determinar formato baseado no número de filiais
    if (numFiliais <= 8) {
      format = 'a4'
      fontSize = 8
      cellPadding = 2
    } else if (numFiliais <= 10) {
      format = 'a4'
      fontSize = 7
      cellPadding = 1.5
    } else if (numFiliais <= 15) {
      format = 'a3'
      fontSize = 7
      cellPadding = 1.5
    } else if (numFiliais <= 20) {
      format = 'a3'
      fontSize = 6
      cellPadding = 1.2
    } else if (numFiliais <= 25) {
      format = 'a3'
      fontSize = 5
      cellPadding = 1
      useRotation = true
    } else {
      format = 'a3'
      fontSize = 5
      cellPadding = 1
      useHorizontalBreak = true
    }

    // Calcular larguras dinamicamente
    const pageWidth = pageWidths[format]
    const availableWidth = pageWidth - marginLeft - marginRight

    // Distribuir largura proporcionalmente
    // 35% para descrição, 15% para total, 50% para filiais
    const descPercent = 0.35
    const totalPercent = 0.15
    const filiaisPercent = 0.50

    let descWidth = availableWidth * descPercent
    let totalWidth = availableWidth * totalPercent
    let filialWidth = 20

    // Dividir espaço das filiais igualmente
    if (numFiliais > 0) {
      const totalFiliaisWidth = availableWidth * filiaisPercent
      filialWidth = totalFiliaisWidth / numFiliais

      // Se as colunas ficarem muito estreitas, ajustar proporções
      if (filialWidth < 20) {
        // Reduzir descrição e total para dar mais espaço às filiais
        descWidth = availableWidth * 0.25
        totalWidth = availableWidth * 0.12
        const newFiliaisWidth = availableWidth * 0.63
        filialWidth = newFiliaisWidth / numFiliais
      }
    }

    // Criar objeto de configuração final
    const config = {
      format,
      fontSize,
      cellPadding,
      descWidth,
      filialWidth,
      totalWidth,
      useRotation,
      useHorizontalBreak,
      pageWidth,
      availableWidth
    }

    return config
  }

  // Função para preparar dados hierárquicos para formato plano do PDF
  // CORRIGIDO: Agora inclui todos os percentuais exatamente como aparecem na tela
  const prepararDadosParaPDF = (reportData: ReportData, filiaisOrdenadas: FilialOption[]) => {
    const rows: PDFRowData[] = []

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    }

    const formatPercent = (value: number) => {
      return value.toFixed(2).replace('.', ',') + '%'
    }

    // Calcular totais por filial somando todos os departamentos
    const totaisPorFilial: Record<number, number> = {}
    filiaisOrdenadas.forEach(f => {
      const filialId = Number(f.value)
      totaisPorFilial[filialId] = 0
    })

    const totalGeralDespesas = reportData.totalizador.valorTotal

    // Processar cada departamento
    reportData.departamentos.forEach((dept) => {
      // Acumular totais por filial
      filiaisOrdenadas.forEach(f => {
        const filialId = Number(f.value)
        totaisPorFilial[filialId] += dept.valores_filiais[filialId] || 0
      })

      const deptTotal = Object.values(dept.valores_filiais).reduce((sum, val) => sum + val, 0)
      const percentualTD = totalGeralDespesas > 0 ? (deptTotal / totalGeralDespesas) * 100 : 0

      // Linha do departamento com percentuais
      const deptRow: PDFRowData = {
        descricao: dept.dept_descricao,
        ...Object.fromEntries(
          filiaisOrdenadas.map(f => {
            const filialId = Number(f.value)
            const valorFilial = dept.valores_filiais[filialId] || 0
            const totalFilial = totaisPorFilial[filialId] || 0
            const receitaBrutaFilial = receitaPorFilial?.valores_filiais[filialId] || 0

            // Calcular percentuais como na tela
            const percentualTDF = totalFilial > 0 ? (valorFilial / totalFilial) * 100 : 0
            const percentualRB = receitaBrutaFilial > 0 ? (valorFilial / receitaBrutaFilial) * 100 : 0

            // Formatar valor com percentuais
            const valorFormatado = formatCurrency(valorFilial)
            const percentuaisText = valorFilial > 0
              ? `${valorFormatado}\n%TDF: ${formatPercent(percentualTDF)}\n%RB: ${formatPercent(percentualRB)}`
              : valorFormatado

            return [`filial_${f.value}`, percentuaisText]
          })
        ),
        total: `${formatCurrency(deptTotal)}\n%TD: ${formatPercent(percentualTD)}\n%RB: ${formatPercent(
          (receitaPorFilial?.total || 0) > 0 ? (deptTotal / (receitaPorFilial?.total || 1)) * 100 : 0
        )}`
      }
      rows.push(deptRow)

      // Linhas dos tipos dentro do departamento
      dept.tipos.forEach((tipo) => {
        const tipoTotal = Object.values(tipo.valores_filiais).reduce((sum, val) => sum + val, 0)
        const tipoPercentualTD = totalGeralDespesas > 0 ? (tipoTotal / totalGeralDespesas) * 100 : 0

        const tipoRow: PDFRowData = {
          descricao: `  ${tipo.tipo_descricao}`, // Indentação visual
          ...Object.fromEntries(
            filiaisOrdenadas.map(f => {
              const filialId = Number(f.value)
              const valorFilial = tipo.valores_filiais[filialId] || 0
              const totalFilial = totaisPorFilial[filialId] || 0
              const receitaBrutaFilial = receitaPorFilial?.valores_filiais[filialId] || 0

              // Calcular percentuais como na tela
              const percentualTDF = totalFilial > 0 ? (valorFilial / totalFilial) * 100 : 0
              const percentualRB = receitaBrutaFilial > 0 ? (valorFilial / receitaBrutaFilial) * 100 : 0

              // Formatar valor com percentuais
              const valorFormatado = formatCurrency(valorFilial)
              const percentuaisText = valorFilial > 0
                ? `${valorFormatado}\n%TDF: ${formatPercent(percentualTDF)}\n%RB: ${formatPercent(percentualRB)}`
                : valorFormatado

              return [`filial_${f.value}`, percentuaisText]
            })
          ),
          total: `${formatCurrency(tipoTotal)}\n%TD: ${formatPercent(tipoPercentualTD)}\n%RB: ${formatPercent(
            (receitaPorFilial?.total || 0) > 0 ? (tipoTotal / (receitaPorFilial?.total || 1)) * 100 : 0
          )}`
        }
        rows.push(tipoRow)
      })
    })

    // Linha de total geral com percentuais
    const totalGeral = Object.values(totaisPorFilial).reduce((sum, val) => sum + val, 0)
    const totalRow: PDFRowData = {
      descricao: 'TOTAL DESPESAS',
      ...Object.fromEntries(
        filiaisOrdenadas.map(f => {
          const filialId = Number(f.value)
          const totalFilial = totaisPorFilial[filialId] || 0
          const receitaBrutaFilial = receitaPorFilial?.valores_filiais[filialId] || 0

          // Para total, %TDF sempre será 100%
          const percentualRB = receitaBrutaFilial > 0 ? (totalFilial / receitaBrutaFilial) * 100 : 0

          return [
            `filial_${f.value}`,
            `${formatCurrency(totalFilial)}\n%TDF: 100,00%\n%RB: ${formatPercent(percentualRB)}`
          ]
        })
      ),
      total: `${formatCurrency(totalGeral)}\n%TD: 100,00%\n%RB: ${formatPercent(
        (receitaPorFilial?.total || 0) > 0 ? (totalGeral / (receitaPorFilial?.total || 1)) * 100 : 0
      )}`
    }
    rows.push(totalRow)

    return rows
  }

  // Função para abrir modal de configuração
  const handleOpenPdfConfig = () => {
    // Inicializar com todas as filiais selecionadas (limitado a 10)
    const filiaisIniciais = filiaisSelecionadas.slice(0, 10)
    setFiliaisPdf(filiaisIniciais)
    setShowPdfConfig(true)
  }

  // Função principal de exportação para PDF
  const handleExportarPDF = async () => {
    if (!data || !currentTenant || filiaisPdf.length === 0) {
      return
    }

    // Fechar modal
    setShowPdfConfig(false)

    try {
      setLoading(true)

      // Dynamic imports para não aumentar bundle inicial
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const numFiliais = filiaisPdf.length
      const config = getConfigPDF(numFiliais)

      // Criar documento PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: config.format,
      })

      // Preparar headers
      const headers = [
        'Descrição',
        ...filiaisPdf.map(f => f.label),
        'Total'
      ]

      // Preparar dados
      const tableData = prepararDadosParaPDF(data, filiaisPdf)

      // Adicionar linha de Receita Bruta se configurado
      let bodyDataWithOptions: (string | number)[][] = []

      if (incluirReceitaBruta && receitaPorFilial) {
        const receitaRow = [
          'RECEITA BRUTA',
          ...filiaisPdf.map(f => {
            const filialId = Number(f.value)
            const valor = receitaPorFilial.valores_filiais[filialId] || 0
            // Para receita bruta, não incluir percentuais (apenas valor)
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(valor)
          }),
          new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(receitaPorFilial.total)
        ]
        bodyDataWithOptions.push(receitaRow)
      }

      // Extrair apenas os valores para autoTable (array de arrays)
      const despesasData = tableData.map(row => [
        row.descricao,
        ...filiaisPdf.map(f => row[`filial_${f.value}`]),
        row.total
      ])

      bodyDataWithOptions = [...bodyDataWithOptions, ...despesasData]

      // Adicionar linha de Lucro Líquido se configurado
      if (incluirLucroLiquido && receitaPorFilial && indicadores) {
        const lucroLiquidoRow = [
          'LUCRO LÍQUIDO',
          ...filiaisPdf.map(f => {
            const filialId = Number(f.value)
            const receitaBrutaFilial = receitaPorFilial.valores_filiais[filialId] || 0
            const lucroBrutoFilial = receitaPorFilial.lucro_bruto_filiais[filialId] || 0
            const despesa = data.departamentos.reduce((sum, dept) => {
              return sum + (dept.valores_filiais[filialId] || 0)
            }, 0)
            const lucroLiquido = lucroBrutoFilial - despesa
            const margemLucroLiquido = receitaBrutaFilial > 0 ? (lucroLiquido / receitaBrutaFilial) * 100 : 0

            // Formatar com margem como na tela
            const valorFormatado = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(lucroLiquido)

            return `${valorFormatado}\nMargem: ${margemLucroLiquido.toFixed(2).replace('.', ',')}%`
          }),
          (() => {
            // Calcular margem total
            const margemTotal = receitaPorFilial.total > 0
              ? (indicadores.current.lucroLiquido / receitaPorFilial.total) * 100
              : 0

            const valorFormatado = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(indicadores.current.lucroLiquido)

            return `${valorFormatado}\nMargem: ${margemTotal.toFixed(2).replace('.', ',')}%`
          })()
        ]
        bodyDataWithOptions.push(lucroLiquidoRow)
      }

      const bodyData = bodyDataWithOptions

      // Configurar column styles
      const numColunas = numFiliais + 2
      const columnStyles: Record<number, AutoTableConfig> = {
        0: { cellWidth: config.descWidth, halign: 'left', valign: 'middle' },
        [numColunas - 1]: { cellWidth: config.totalWidth, halign: 'right', fontStyle: 'bold', valign: 'top' }
      }

      for (let i = 1; i < numColunas - 1; i++) {
        columnStyles[i] = { cellWidth: config.filialWidth, halign: 'right', valign: 'top' }
      }

      // Título e informações do relatório
      const pageWidth = doc.internal.pageSize.getWidth()

      doc.setFontSize(16)
      doc.text('Demonstração do Resultado do Exercício', pageWidth / 2, 15, { align: 'center' })

      doc.setFontSize(10)
      const tenantNome = currentTenant.name || 'Empresa'
      doc.text(tenantNome, pageWidth / 2, 22, { align: 'center' })

      // Período filtrado
      const mesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      const periodoTexto = mes === -1
        ? `Período: ${ano} (Ano Completo)`
        : `Período: ${mesNomes[mes]}/${ano}`

      doc.setFontSize(9)
      doc.text(periodoTexto, pageWidth / 2, 28, { align: 'center' })

      // Data de geração
      doc.setFontSize(8)
      const dataGeracao = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
      doc.text(dataGeracao, pageWidth / 2, 33, { align: 'center' })

      // Configurar tabela
      const tableConfig: AutoTableConfig = {
        head: [headers],
        body: bodyData,
        startY: 38,
        styles: {
          fontSize: config.fontSize,
          cellPadding: config.cellPadding,
          cellWidth: 'wrap',
          overflow: 'linebreak',
          lineHeight: 1.2, // Permitir múltiplas linhas para percentuais
          valign: 'top' // Alinhar conteúdo no topo da célula
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          minCellHeight: config.useRotation ? 45 : 10
        },
        columnStyles,
        margin: { left: 5, right: 5, top: 35, bottom: 10 },
        tableWidth: 'auto', // Usar toda a largura disponível
        didParseCell: (data: AutoTableConfig) => {
          const cellText = data.cell.text[0] || ''

          // Destacar RECEITA BRUTA em verde
          if (cellText === 'RECEITA BRUTA') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = [28, 150, 91] // Verde
          }

          // Destacar TOTAL DESPESAS
          if (cellText === 'TOTAL DESPESAS') {
            data.cell.styles.fillColor = [240, 240, 240]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = config.fontSize + 1
          }

          // Destacar LUCRO LÍQUIDO em azul
          if (cellText === 'LUCRO LÍQUIDO') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = [59, 130, 246] // Azul
          }

          // Destacar linhas de departamentos (sem indentação)
          if (data.section === 'body' && data.column.index === 0) {
            if (cellText && !cellText.startsWith('  ') &&
                cellText !== 'TOTAL DESPESAS' &&
                cellText !== 'RECEITA BRUTA' &&
                cellText !== 'LUCRO LÍQUIDO') {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [250, 250, 255]
            }
          }
        },
        didDrawCell: (data: AutoTableConfig) => {
          // Adicionar cores aos percentuais nas células de dados
          if (data.section === 'body' && data.column.index > 0) {
            const cellText = String(data.cell.raw || '')

            // Se a célula contém percentuais (tem quebras de linha)
            if (cellText.includes('\n')) {
              const lines = cellText.split('\n')
              if (lines.length > 1) {
                const doc = data.doc
                const cell = data.cell

                // Posição inicial do texto
                const x = cell.x + cell.padding('left')
                let y = cell.y + cell.padding('top')
                const lineHeight = data.row.height / (lines.length + 1)

                // Primeira linha (valor) - cor preta (já desenhada)
                y += lineHeight

                // Segunda linha (%TDF ou %TD) - cor específica
                if (lines[1]) {
                  const isTDF = lines[1].includes('TDF')

                  if (isTDF) {
                    // %TDF - usar cor baseada na comparação (implementar lógica)
                    doc.setTextColor(100, 100, 100) // Cinza por padrão
                  } else if (lines[1].includes('TD')) {
                    // %TD - cinza
                    doc.setTextColor(120, 120, 120)
                  }

                  // Não redesenhar, apenas configurar cor para próximo texto
                }

                // Terceira linha (%RB) - laranja
                if (lines[2] && lines[2].includes('RB')) {
                  // Configurar cor laranja para %RB
                  // A cor será aplicada quando o texto for desenhado
                }

                // Resetar cor para preto
                doc.setTextColor(0, 0, 0)
              }
            }
          }
        }
      }

      if (config.useHorizontalBreak) {
        tableConfig.horizontalPageBreak = true
        tableConfig.horizontalPageBreakRepeat = [0]
      }

      if (config.useRotation) {
        const originalDidDrawCell = tableConfig.didDrawCell
        tableConfig.didDrawCell = (data: AutoTableConfig) => {
          // Chamar o callback original primeiro
          if (originalDidDrawCell) {
            originalDidDrawCell(data)
          }

          // Adicionar rotação para headers
          if (data.section === 'head' && data.column.index > 0 && data.column.index < numColunas - 1) {
            const cell = data.cell
            const text = cell.text[0]

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(config.fontSize)

            const x = cell.x + cell.width / 2
            const y = cell.y + cell.height - 2

            // jsPDF 3.x sintaxe: text(texto, x, y, options, transform)
            doc.text(text, x, y, {
              align: 'left',
              angle: 90
            })
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      autoTable(doc as any, tableConfig)

      // Adicionar aviso se formato A3
      if (config.format === 'a3') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable.finalY
        doc.setFontSize(8)
        doc.setTextColor(200, 0, 0)
        doc.text(
          'Nota: Este PDF está em formato A3. Necessita impressora A3 para impressão em tamanho real.',
          14,
          finalY + 10
        )
      }

      // Salvar PDF
      const tenantSlug = (currentTenant.name || 'empresa').toLowerCase().replace(/\s/g, '-')
      const periodoSlug = mes === -1 ? `${ano}` : `${mes + 1}-${ano}`
      const nomeArquivo = `dre-gerencial-${tenantSlug}-${periodoSlug}-${Date.now()}.pdf`
      doc.save(nomeArquivo)

    } catch (err) {
      console.error('[PDF Export] Erro ao exportar PDF:', err)
      alert(`Erro ao exportar PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  // ==================== FIM DAS FUNÇÕES DE EXPORTAÇÃO PDF ====================

  // Função para aplicar filtros (chamada pelo botão Filtrar)
  const handleFilter = async (filiais: FilialOption[], mesParam: number, anoParam: number) => {
    if (currentTenant?.supabase_schema && filiais.length > 0) {
      setLoading(true)
      setLoadingIndicadores(true)
      setError('')

      try {
        // Período atual
        const { dataInicio, dataFim } = getDatasMesAno(mesParam, anoParam)

        // PAM - Período Anterior Mesmo
        let mesPam: number
        let anoPam: number
        let dataReferenciaYTD: Date | undefined

        if (mesParam === -1) {
          // "Todos" selecionado → PAM = YTD do ano anterior
          mesPam = -1
          anoPam = anoParam - 1

          // Para calcular YTD do ano anterior, precisamos da data de referência
          // Se anoParam === ano atual, usa data de hoje
          // Se anoParam !== ano atual, usa 31/12 do ano filtrado
          const anoAtual = new Date().getFullYear()
          if (anoParam === anoAtual) {
            dataReferenciaYTD = new Date() // Hoje (ex: 17/11/2025)
          } else {
            // Último dia do ano filtrado (ex: 31/12/2024)
            dataReferenciaYTD = new Date(anoParam, 11, 31)
          }
        } else {
          // Mês específico → PAM = mês anterior (lógica atual)
          mesPam = mesParam - 1 < 0 ? 11 : mesParam - 1
          anoPam = mesParam - 1 < 0 ? anoParam - 1 : anoParam
        }

        const { dataInicio: dataInicioPam, dataFim: dataFimPam } = getDatasMesAno(mesPam, anoPam, dataReferenciaYTD)

        // PAA - Período Anterior Acumulado (sempre usa mesmo período, mas 1 ano atrás)
        const { dataInicio: dataInicioPaa, dataFim: dataFimPaa } = getDatasMesAno(mesParam, anoParam - 1, dataReferenciaYTD)

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

      // Buscar dados PAM - Período Anterior Mesmo (mesma lógica do handleFilter)
      let mesPam: number
      let anoPam: number
      let dataReferenciaYTD: Date | undefined

      if (mesParam === -1) {
        // "Todos" selecionado → PAM = YTD do ano anterior
        mesPam = -1
        anoPam = anoParam - 1

        // Para calcular YTD do ano anterior, precisamos da data de referência
        const anoAtual = new Date().getFullYear()
        if (anoParam === anoAtual) {
          dataReferenciaYTD = new Date() // Hoje
        } else {
          dataReferenciaYTD = new Date(anoParam, 11, 31) // Último dia do ano filtrado
        }
      } else {
        // Mês específico → PAM = mês anterior (lógica atual)
        mesPam = mesParam - 1 < 0 ? 11 : mesParam - 1
        anoPam = mesParam - 1 < 0 ? anoParam - 1 : anoParam
      }

      const { dataInicio: dataInicioPam, dataFim: dataFimPam } = getDatasMesAno(mesPam, anoPam, dataReferenciaYTD)
      const paramsPam = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        data_inicio: dataInicioPam,
        data_fim: dataFimPam,
        filiais: filialIds || 'all'
      })
      const responsePam = await fetch(`/api/dashboard?${paramsPam}`)
      const dashboardPam = responsePam.ok ? await responsePam.json() : null

      // Buscar dados PAA - Período Anterior Acumulado (sempre usa mesmo período, mas 1 ano atrás)
      const { dataInicio: dataInicioPaa, dataFim: dataFimPaa } = getDatasMesAno(mesParam, anoParam - 1, dataReferenciaYTD)
      const paramsPaa = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        data_inicio: dataInicioPaa,
        data_fim: dataFimPaa,
        filiais: filialIds || 'all'
      })
      const responsePaa = await fetch(`/api/dashboard?${paramsPaa}`)
      const dashboardPaa = responsePaa.ok ? await responsePaa.json() : null

      const result = {
        current: dashboardAtual,
        pam: { data: dashboardPam, ano: anoPam },
        paa: { data: dashboardPaa, ano: anoParam - 1 }
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
          mes={mes}
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
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Demonstração do Resultado do Exercício
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Receita Bruta, Despesas e Lucro Líquido
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleOpenPdfConfig}
                    disabled={loading || !data}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
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

      {/* Modal de Configuração de PDF */}
      <Dialog open={showPdfConfig} onOpenChange={setShowPdfConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Exportação PDF</DialogTitle>
            <DialogDescription>
              Escolha as filiais e opções para incluir no relatório
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Seleção de Filiais */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Filiais para Impressão</Label>
                <span className="text-sm text-muted-foreground">
                  {filiaisPdf.length} de 10 selecionadas
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione até 10 filiais para incluir no PDF
              </p>

              <MultiFilialFilter
                filiais={filiaisSelecionadas}
                selectedFiliais={filiaisPdf}
                onChange={(novasFiliais) => {
                  // Limitar a 10 filiais
                  if (novasFiliais.length <= 10) {
                    setFiliaisPdf(novasFiliais)
                  } else {
                    alert('Você pode selecionar no máximo 10 filiais')
                  }
                }}
                placeholder="Selecione até 10 filiais..."
              />

              {filiaisPdf.length === 0 && (
                <p className="text-sm text-red-600">
                  Selecione pelo menos uma filial
                </p>
              )}

              {filiaisPdf.length > 10 && (
                <p className="text-sm text-red-600">
                  Máximo de 10 filiais permitidas
                </p>
              )}
            </div>

            <Separator />

            {/* Opções de Conteúdo */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Opções de Conteúdo</Label>

              {/* Receita Bruta */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="incluir-receita"
                  checked={incluirReceitaBruta}
                  onCheckedChange={(checked) => setIncluirReceitaBruta(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="incluir-receita"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Emitir Receita Bruta
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Incluir linha de Receita Bruta no início do relatório
                  </p>
                </div>
              </div>

              {/* Lucro Líquido */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="incluir-lucro"
                  checked={incluirLucroLiquido}
                  onCheckedChange={(checked) => setIncluirLucroLiquido(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="incluir-lucro"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Emitir Lucro Líquido
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Incluir linha de Lucro Líquido no final do relatório
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPdfConfig(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExportarPDF}
              disabled={filiaisPdf.length === 0 || filiaisPdf.length > 10}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


