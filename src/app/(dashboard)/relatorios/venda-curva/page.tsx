'use client'

// Relatório de Venda por Curva ABC - MultiSelect de filiais sem opção "Todas"
import { useState, useEffect, useMemo, memo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { ChevronDown, ChevronRight, ShoppingCart, TrendingUp, DollarSign, FileDown, Search } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { logModuleAccess } from '@/lib/audit'

// Tipos para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

interface Produto {
  codigo: number
  descricao: string
  filial_id: number
  qtde: number
  qtde_ano_anterior?: number
  valor_vendas: number
  valor_vendas_ano_anterior?: number
  valor_lucro: number
  valor_lucro_ano_anterior?: number
  percentual_lucro: number
  percentual_lucro_ano_anterior?: number
  curva_venda: string
  curva_lucro: string
}

interface DeptNivel1 {
  dept1_id: number
  dept_nivel1: string
  total_vendas: number
  total_vendas_ano_anterior?: number
  total_lucro: number
  total_lucro_ano_anterior?: number
  margem: number
  margem_ano_anterior?: number
  produtos: Produto[]
}

interface DeptNivel2 {
  dept2_id: number
  dept_nivel2: string
  total_vendas: number
  total_vendas_ano_anterior?: number
  total_lucro: number
  total_lucro_ano_anterior?: number
  margem: number
  margem_ano_anterior?: number
  nivel1: DeptNivel1[]
}

interface DeptNivel3 {
  dept3_id: number
  dept_nivel3: string
  total_vendas: number
  total_vendas_ano_anterior?: number
  total_lucro: number
  total_lucro_ano_anterior?: number
  margem: number
  margem_ano_anterior?: number
  nivel2: DeptNivel2[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  hierarquia: DeptNivel3[]
}

// Componente memoizado para renderização de produtos
const ProdutoTable = memo(function ProdutoTable({
  produtos,
  filtroProduto,
  compararAnoAnterior,
  compareLabel
}: {
  produtos: Produto[]
  filtroProduto: string
  compararAnoAnterior: boolean
  compareLabel: string
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatPercent = (value: number) => `${value.toFixed(2)}%`

  const formatDeltaPercent = (current: number, previous: number) => {
    if (previous === 0) {
      return '(-)'
    }
    const delta = ((current - previous) / previous) * 100
    const rounded = Math.round(delta)
    const sign = rounded > 0 ? '+' : ''
    return `${sign}${rounded}%`
  }

  const getDeltaClass = (current: number, previous: number) => {
    if (previous === 0) return 'text-muted-foreground'
    const delta = ((current - previous) / previous) * 100
    if (delta > 0) return 'text-green-600'
    if (delta < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  const produtoCorrespondeFiltro = (produto: Produto): boolean => {
    if (!filtroProduto || filtroProduto.length < 3) return false
    const termoBusca = filtroProduto.toLowerCase()
    const codigoStr = produto.codigo.toString()
    const descricao = produto.descricao.toLowerCase()
    return codigoStr.includes(termoBusca) || descricao.includes(termoBusca)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Filial</TableHead>
          <TableHead className="text-xs">Código</TableHead>
          <TableHead className="text-xs">Descrição</TableHead>
          <TableHead className="text-right text-xs">Qtde</TableHead>
          <TableHead className="text-right text-xs">Valor Vendas</TableHead>
          <TableHead className="text-xs">Curva Venda</TableHead>
          <TableHead className="text-right text-xs">Valor Lucro</TableHead>
          <TableHead className="text-right text-xs">% Lucro</TableHead>
          <TableHead className="text-xs">Curva Lucro</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {produtos.map((produto, idx) => {
          const isHighlighted = filtroProduto.length >= 3 && produtoCorrespondeFiltro(produto)

          return (
            <TableRow
              key={`${produto.codigo}-${produto.filial_id}-${idx}`}
              className={`border-b ${isHighlighted ? 'bg-primary/10' : ''}`}
            >
              <TableCell className="text-xs">{produto.filial_id}</TableCell>
              <TableCell className="text-xs font-mono">{produto.codigo}</TableCell>
              <TableCell className="text-xs">{produto.descricao}</TableCell>
              <TableCell className="text-right text-xs">
                <div className="flex flex-col items-end">
                  <span>{produto.qtde}</span>
                  {compararAnoAnterior && (
                    <span className="text-[10px] text-muted-foreground">
                      {compareLabel} <span className="font-semibold text-black dark:text-white">{(produto.qtde_ano_anterior || 0).toFixed(2)}</span> (
                      <span className={getDeltaClass(produto.qtde, produto.qtde_ano_anterior || 0)}>
                        {formatDeltaPercent(produto.qtde, produto.qtde_ano_anterior || 0)}
                      </span>
                      )
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-xs">
                <div className="flex flex-col items-end">
                  <span>{formatCurrency(produto.valor_vendas)}</span>
                  {compararAnoAnterior && (
                    <span className="text-[10px] text-muted-foreground">
                      {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(produto.valor_vendas_ano_anterior || 0)}</span> (
                      <span className={getDeltaClass(produto.valor_vendas, produto.valor_vendas_ano_anterior || 0)}>
                        {formatDeltaPercent(produto.valor_vendas, produto.valor_vendas_ano_anterior || 0)}
                      </span>
                      )
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant={produto.curva_venda === 'A' ? 'default' : produto.curva_venda === 'B' ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                  {produto.curva_venda}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs">
                <div className="flex flex-col items-end">
                  <span>{formatCurrency(produto.valor_lucro)}</span>
                  {compararAnoAnterior && (
                    <span className="text-[10px] text-muted-foreground">
                      {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(produto.valor_lucro_ano_anterior || 0)}</span> (
                      <span className={getDeltaClass(produto.valor_lucro, produto.valor_lucro_ano_anterior || 0)}>
                        {formatDeltaPercent(produto.valor_lucro, produto.valor_lucro_ano_anterior || 0)}
                      </span>
                      )
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-xs">
                <div className="flex flex-col items-end">
                  <span>{formatPercent(produto.percentual_lucro)}</span>
                  {compararAnoAnterior && (
                    <span className="text-[10px] text-muted-foreground">
                      {compareLabel} <span className="font-semibold text-black dark:text-white">{formatPercent(produto.percentual_lucro_ano_anterior || 0)}</span> (
                      <span className={getDeltaClass(produto.percentual_lucro, produto.percentual_lucro_ano_anterior || 0)}>
                        {formatDeltaPercent(produto.percentual_lucro, produto.percentual_lucro_ano_anterior || 0)}
                      </span>
                      )
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant={produto.curva_lucro === 'A' ? 'default' : produto.curva_lucro === 'B' ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                  {produto.curva_lucro}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
})

export default function VendaCurvaPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { branchOptions: todasAsFiliais, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false,
  })

  // Estados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const currentDate = new Date()
  const [mes, setMes] = useState((currentDate.getMonth() + 1).toString()) // Mês atual (getMonth retorna 0-11)
  const [ano, setAno] = useState(currentDate.getFullYear().toString())
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [defaultFilialSet, setDefaultFilialSet] = useState(false)
  const [compararAnoAnterior, setCompararAnoAnterior] = useState(false)

  // Estados de expansão
  const [expandedDept1, setExpandedDept1] = useState<Record<string, boolean>>({})
  const [expandedDept2, setExpandedDept2] = useState<Record<string, boolean>>({})
  const [expandedDept3, setExpandedDept3] = useState<Record<string, boolean>>({})

  // Filtro de produto - COM DEBOUNCE REAL
  const [filtroProduto, setFiltroProduto] = useState('') // Valor usado para filtrar (com debounce)
  const [inputValue, setInputValue] = useState('') // Valor visual do input (atualiza instantaneamente)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Efeito de debounce - atualiza o filtro após 300ms sem digitação
  useEffect(() => {
    // Limpa timer anterior se existir
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Se o input tem menos de 3 caracteres, limpa o filtro imediatamente
    if (inputValue.length < 3) {
      setFiltroProduto('')
      return
    }

    // Cria novo timer para atualizar o filtro após 300ms
    debounceTimerRef.current = setTimeout(() => {
      setFiltroProduto(inputValue)
    }, 300)

    // Cleanup ao desmontar ou quando inputValue mudar
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue])

  // Definir filial padrão quando opções estiverem disponíveis
  useEffect(() => {
    if (todasAsFiliais.length > 0 && !defaultFilialSet) {
      // Ordena filiais por ID (numérico) e pega a menor
      const sortedFiliais = [...todasAsFiliais].sort((a, b) => {
        const idA = parseInt(a.value)
        const idB = parseInt(b.value)
        return idA - idB
      })
      setFiliaisSelecionadas([sortedFiliais[0]])
      setDefaultFilialSet(true)
    }
  }, [todasAsFiliais, defaultFilialSet])

  // Log de acesso ao módulo
  useEffect(() => {
    if (userProfile && currentTenant) {
      logModuleAccess({
        module: 'relatorios_venda_curva',
        action: 'view',
        tenantId: currentTenant.id,
        userName: userProfile.full_name,
      })
    }
  }, [userProfile, currentTenant])

  // Aplicar filtros automaticamente quando mudarem
  useEffect(() => {
    if (currentTenant?.supabase_schema && filiaisSelecionadas.length > 0 && mes && ano) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, filiaisSelecionadas, compararAnoAnterior])

  // Carregar dados quando a página mudar
  useEffect(() => {
    if (currentTenant?.supabase_schema && filiaisSelecionadas.length > 0 && page > 1) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Calcular hierarquia filtrada usando useMemo
  const hierarquiaFiltrada = useMemo(() => {
    if (!data?.hierarquia) return []
    if (!filtroProduto || filtroProduto.length < 3) return data.hierarquia

    // Função auxiliar para verificar correspondência
    const produtoCorresponde = (produto: Produto, termo: string): boolean => {
      const termoBusca = termo.toLowerCase()
      const codigoStr = produto.codigo.toString()
      const descricao = produto.descricao.toLowerCase()
      return codigoStr.includes(termoBusca) || descricao.includes(termoBusca)
    }

    // Filtrar hierarquia mantendo apenas departamentos com produtos correspondentes
    const resultado: DeptNivel3[] = []

    for (const dept3 of data.hierarquia) {
      const nivel2Filtrado: DeptNivel2[] = []

      if (dept3.nivel2) {
        for (const dept2 of dept3.nivel2) {
          const nivel1Filtrado: DeptNivel1[] = []

          if (dept2.nivel1) {
            for (const dept1 of dept2.nivel1) {
              if (dept1.produtos?.some(p => produtoCorresponde(p, filtroProduto))) {
                nivel1Filtrado.push(dept1)
              }
            }
          }

          if (nivel1Filtrado.length > 0) {
            nivel2Filtrado.push({
              ...dept2,
              nivel1: nivel1Filtrado
            })
          }
        }
      }

      if (nivel2Filtrado.length > 0) {
        resultado.push({
          ...dept3,
          nivel2: nivel2Filtrado
        })
      }
    }

    return resultado
  }, [data?.hierarquia, filtroProduto])

  // Expandir automaticamente os collapsibles quando houver filtro ativo
  useEffect(() => {
    if (filtroProduto.length >= 3 && hierarquiaFiltrada.length > 0) {
      // Expandir todos os dept3, dept2 e dept1 que têm produtos correspondentes
      const newExpandedDept3: Record<string, boolean> = {}
      const newExpandedDept2: Record<string, boolean> = {}
      const newExpandedDept1: Record<string, boolean> = {}

      hierarquiaFiltrada.forEach(dept3 => {
        // Expandir dept3 (Setor)
        newExpandedDept3[dept3.dept3_id.toString()] = true

        dept3.nivel2?.forEach(dept2 => {
          // Expandir dept2 (Grupo) - usando apenas o ID do dept2
          newExpandedDept2[dept2.dept2_id.toString()] = true

          dept2.nivel1?.forEach(dept1 => {
            // Expandir dept1 (Subgrupo) - usando apenas o ID do dept1
            newExpandedDept1[dept1.dept1_id.toString()] = true
          })
        })
      })

      setExpandedDept3(newExpandedDept3)
      setExpandedDept2(newExpandedDept2)
      setExpandedDept1(newExpandedDept1)
    } else if (filtroProduto.length < 3) {
      // Fechar todos quando o filtro for removido
      setExpandedDept3({})
      setExpandedDept2({})
      setExpandedDept1({})
    }
  }, [filtroProduto, hierarquiaFiltrada])

  // Buscar dados
  const fetchData = async () => {
    if (!currentTenant?.supabase_schema) return

    // Validar se filial está selecionada
    if (filiaisSelecionadas.length === 0) {
      setError('Por favor, selecione ao menos uma filial')
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes,
        ano,
        filial_id: filiaisSelecionadas.map(f => f.value).join(','),
        page: page.toString(),
        page_size: pageSize.toString(),
        compare_ano_anterior: compararAnoAnterior ? '1' : '0',
      })

      const response = await fetch(`/api/relatorios/venda-curva?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar dados')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Exportar PDF
  const handleExportarPDF = async () => {
    if (!currentTenant?.supabase_schema || filiaisSelecionadas.length === 0) return

    try {
      setLoading(true)

      // Importação dinâmica para reduzir bundle inicial
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      // Buscar TODOS os dados sem paginação
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes,
        ano,
        filial_id: filiaisSelecionadas.map(f => f.value).join(','),
        page: '1',
        page_size: '10000',
        compare_ano_anterior: compararAnoAnterior ? '1' : '0',
      })

      const response = await fetch(`/api/relatorios/venda-curva?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(errorData.error || 'Erro ao buscar dados para exportação')
      }

      const allData = await response.json()

      // Criar PDF em orientação paisagem
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      }) as import('jspdf').jsPDF

      // Configurar fonte
      doc.setFont('helvetica')

      // Cabeçalho
      const filialNome = filiaisSelecionadas.length === 1
        ? (todasAsFiliais.find(f => f.value === filiaisSelecionadas[0].value)?.label || filiaisSelecionadas[0].label)
        : `${filiaisSelecionadas.length} filiais selecionadas`
      const mesNome = meses.find(m => m.value === mes)?.label || mes
      
      doc.setFontSize(16)
      doc.text('Relatório de Venda por Curva ABC', doc.internal.pageSize.width / 2, 15, { align: 'center' })
      
      doc.setFontSize(10)
      doc.text(`Filial: ${filialNome}`, 14, 25)
      doc.text(`Período: ${mesNome}/${ano}`, 14, 30)
      doc.text(`Total de departamentos: ${allData.hierarquia?.length || 0}`, 14, 35)
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 40)

      // Configuração de colunas para o PDF (ajuste para margem igual)
      const headers = [
        'Código',
        'Descrição',
        'Qtde',
        'Valor Vendas',
        'Curva Venda',
        'Valor Lucro',
        '% Lucro',
        'Curva Lucro',
        'Filial'
      ]
      const baseColumnWidths = [20, 70, 20, 30, 20, 30, 20, 20, 15]
      const tableStartX = 10
      const tableEndX = doc.internal.pageSize.width - 10
      const availableWidth = tableEndX - tableStartX
      const baseWidth = baseColumnWidths.reduce((sum, w) => sum + w, 0)
      const scale = availableWidth / baseWidth
      const columnWidths = baseColumnWidths.map((w) => Math.round(w * scale))
      const tableWidth = columnWidths.reduce((sum, w) => sum + w, 0)
      const pageHeight = doc.internal.pageSize.height
      const bottomMargin = 15
      let currentY = 45
      let lastFooterPage = 0

      const columnStyles: Record<number, { cellWidth?: number; halign?: 'center' | 'right' | 'left' }> = {
        0: { cellWidth: columnWidths[0] }, // Código
        1: { cellWidth: columnWidths[1] }, // Descrição
        2: { cellWidth: columnWidths[2], halign: 'right' }, // Qtde
        3: { cellWidth: columnWidths[3], halign: 'right' }, // Valor Vendas
        4: { cellWidth: columnWidths[4], halign: 'center' }, // Curva Venda
        5: { cellWidth: columnWidths[5], halign: 'right' }, // Valor Lucro
        6: { cellWidth: columnWidths[6], halign: 'right' }, // % Lucro
        7: { cellWidth: columnWidths[7], halign: 'center' }, // Curva Lucro
        8: { cellWidth: columnWidths[8], halign: 'center' }, // Filial
      }

      const getColRightX = (colIndex: number) => {
        const widthToCol = columnWidths.slice(0, colIndex + 1).reduce((sum, w) => sum + w, 0)
        return tableStartX + widthToCol - 1
      }
      const marginRightX = tableStartX + tableWidth - 1

      const ensureSpace = (height: number) => {
        if (currentY + height > pageHeight - bottomMargin) {
          doc.addPage()
          currentY = 15
        }
      }

      const mapPdfColor = (className: string): number[] => {
        if (className === 'text-green-600') return [22, 163, 74]
        if (className === 'text-red-600') return [220, 38, 38]
        return [107, 114, 128]
      }

      const drawDeptHeaderRow = () => {
        ensureSpace(6)
        doc.setFillColor(59, 130, 246)
        doc.rect(tableStartX, currentY, tableWidth, 6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        const textY = currentY + 4.5
        doc.text('Departamento', tableStartX + 2, textY)
        doc.text('Vendas', getColRightX(3), textY, { align: 'right' })
        doc.text('Lucro', getColRightX(5), textY, { align: 'right' })
        doc.text('Margem', marginRightX, textY, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        currentY += 6
      }

      const drawDeptRow = (options: {
        label: string
        vendas: number
        lucro: number
        margem: number
        vendasAnterior?: number
        lucroAnterior?: number
        margemAnterior?: number
        vendasDelta?: string
        lucroDelta?: string
        margemDelta?: string
        fillColor: number[]
        textColor: number[]
        fontSize: number
        indent?: number
        rowHeight: number
      }) => {
        ensureSpace(options.rowHeight)
        doc.setFillColor(options.fillColor[0], options.fillColor[1], options.fillColor[2])
        doc.rect(tableStartX, currentY, tableWidth, options.rowHeight, 'F')
        doc.setFontSize(options.fontSize)
        doc.setTextColor(options.textColor[0], options.textColor[1], options.textColor[2])
        const indent = options.indent ? options.indent : 0
        const textY = currentY + options.rowHeight / 2 + 1
        doc.text(options.label, tableStartX + 2 + indent, textY)
        const vendasMain = formatCurrency(options.vendas)
        const lucroMain = formatCurrency(options.lucro)
        const margemMain = `${options.margem.toFixed(2)}%`
        const vendasCompare = options.vendasAnterior !== undefined
          ? `${compareLabel} ${formatCurrency(options.vendasAnterior)} ${options.vendasDelta ? `(${options.vendasDelta})` : ''}`
          : null
        const lucroCompare = options.lucroAnterior !== undefined
          ? `${compareLabel} ${formatCurrency(options.lucroAnterior)} ${options.lucroDelta ? `(${options.lucroDelta})` : ''}`
          : null
        const margemCompare = options.margemAnterior !== undefined
          ? `${compareLabel} ${options.margemAnterior.toFixed(2)}% ${options.margemDelta ? `(${options.margemDelta})` : ''}`
          : null

        if (vendasCompare || lucroCompare || margemCompare) {
          const mainY = currentY + options.rowHeight / 2 - 1
          const compareY = currentY + options.rowHeight / 2 + 4
          doc.text(vendasMain, getColRightX(3), mainY, { align: 'right' })
          doc.text(lucroMain, getColRightX(5), mainY, { align: 'right' })
          doc.text(margemMain, marginRightX, mainY, { align: 'right' })
          doc.setFontSize(options.fontSize - 1)
          doc.setTextColor(107, 114, 128)
          if (vendasCompare) doc.text(vendasCompare, getColRightX(3), compareY, { align: 'right' })
          if (lucroCompare) doc.text(lucroCompare, getColRightX(5), compareY, { align: 'right' })
          if (margemCompare) doc.text(margemCompare, marginRightX, compareY, { align: 'right' })
          doc.setFontSize(options.fontSize)
          doc.setTextColor(options.textColor[0], options.textColor[1], options.textColor[2])
        } else {
          doc.text(vendasMain, getColRightX(3), textY, { align: 'right' })
          doc.text(lucroMain, getColRightX(5), textY, { align: 'right' })
          doc.text(margemMain, marginRightX, textY, { align: 'right' })
        }
        currentY += options.rowHeight
      }

      drawDeptHeaderRow()

      allData.hierarquia?.forEach((dept3: DeptNivel3) => {
        drawDeptRow({
          label: dept3.dept_nivel3,
          vendas: dept3.total_vendas,
          lucro: dept3.total_lucro,
          margem: dept3.margem,
          vendasAnterior: compararAnoAnterior ? (dept3.total_vendas_ano_anterior || 0) : undefined,
          lucroAnterior: compararAnoAnterior ? (dept3.total_lucro_ano_anterior || 0) : undefined,
          margemAnterior: compararAnoAnterior ? (dept3.margem_ano_anterior || 0) : undefined,
          vendasDelta: compararAnoAnterior ? formatDeltaPercent(dept3.total_vendas, dept3.total_vendas_ano_anterior || 0) : undefined,
          lucroDelta: compararAnoAnterior ? formatDeltaPercent(dept3.total_lucro, dept3.total_lucro_ano_anterior || 0) : undefined,
          margemDelta: compararAnoAnterior ? formatDeltaPercent(dept3.margem, dept3.margem_ano_anterior || 0) : undefined,
          fillColor: [214, 214, 214],
          textColor: [30, 41, 59],
          fontSize: 9,
          rowHeight: compararAnoAnterior ? 14 : 11
        })

        dept3.nivel2?.forEach((dept2: DeptNivel2) => {
          drawDeptRow({
            label: dept2.dept_nivel2,
            vendas: dept2.total_vendas,
            lucro: dept2.total_lucro,
            margem: dept2.margem,
            vendasAnterior: compararAnoAnterior ? (dept2.total_vendas_ano_anterior || 0) : undefined,
            lucroAnterior: compararAnoAnterior ? (dept2.total_lucro_ano_anterior || 0) : undefined,
            margemAnterior: compararAnoAnterior ? (dept2.margem_ano_anterior || 0) : undefined,
            vendasDelta: compararAnoAnterior ? formatDeltaPercent(dept2.total_vendas, dept2.total_vendas_ano_anterior || 0) : undefined,
            lucroDelta: compararAnoAnterior ? formatDeltaPercent(dept2.total_lucro, dept2.total_lucro_ano_anterior || 0) : undefined,
            margemDelta: compararAnoAnterior ? formatDeltaPercent(dept2.margem, dept2.margem_ano_anterior || 0) : undefined,
            fillColor: [228, 228, 228],
            textColor: [30, 41, 59],
            fontSize: 9,
            indent: 6,
            rowHeight: compararAnoAnterior ? 14 : 11
          })

          dept2.nivel1?.forEach((dept1: DeptNivel1) => {
            drawDeptRow({
              label: dept1.dept_nivel1,
              vendas: dept1.total_vendas,
              lucro: dept1.total_lucro,
              margem: dept1.margem,
              vendasAnterior: compararAnoAnterior ? (dept1.total_vendas_ano_anterior || 0) : undefined,
              lucroAnterior: compararAnoAnterior ? (dept1.total_lucro_ano_anterior || 0) : undefined,
              margemAnterior: compararAnoAnterior ? (dept1.margem_ano_anterior || 0) : undefined,
              vendasDelta: compararAnoAnterior ? formatDeltaPercent(dept1.total_vendas, dept1.total_vendas_ano_anterior || 0) : undefined,
              lucroDelta: compararAnoAnterior ? formatDeltaPercent(dept1.total_lucro, dept1.total_lucro_ano_anterior || 0) : undefined,
              margemDelta: compararAnoAnterior ? formatDeltaPercent(dept1.margem, dept1.margem_ano_anterior || 0) : undefined,
              fillColor: [241, 241, 241],
              textColor: [30, 41, 59],
              fontSize: 9,
              indent: 12,
              rowHeight: compararAnoAnterior ? 14 : 11
            })

            const tableRows: (string | number | { content: string; styles: { textColor?: number[]; fillColor?: number[]; fontSize?: number } })[][] = []
            dept1.produtos?.forEach((produto: Produto) => {
              tableRows.push([
                produto.codigo.toString(),
                produto.descricao.substring(0, 40),
                produto.qtde.toFixed(2),
                formatCurrency(produto.valor_vendas),
                produto.curva_venda,
                formatCurrency(produto.valor_lucro),
                produto.percentual_lucro.toFixed(2) + '%',
                produto.curva_lucro,
                produto.filial_id.toString()
              ])

              if (compararAnoAnterior) {
                const qtdeDelta = formatDeltaPercent(produto.qtde, produto.qtde_ano_anterior || 0)
                const vendasDelta = formatDeltaPercent(produto.valor_vendas, produto.valor_vendas_ano_anterior || 0)
                const lucroDelta = formatDeltaPercent(produto.valor_lucro, produto.valor_lucro_ano_anterior || 0)
                const margemDelta = formatDeltaPercent(produto.percentual_lucro, produto.percentual_lucro_ano_anterior || 0)
                const compareRowBaseStyles = { fontSize: 6, fillColor: [245, 245, 245] }
                tableRows.push([
                  { content: '', styles: compareRowBaseStyles },
                  { content: '', styles: compareRowBaseStyles },
                  {
                    content: `${compareLabel} ${(produto.qtde_ano_anterior || 0).toFixed(2)} (${qtdeDelta})`,
                    styles: { ...compareRowBaseStyles, textColor: mapPdfColor(getDeltaClass(produto.qtde, produto.qtde_ano_anterior || 0)) }
                  },
                  {
                    content: `${compareLabel} ${formatCurrency(produto.valor_vendas_ano_anterior || 0)} (${vendasDelta})`,
                    styles: { ...compareRowBaseStyles, textColor: mapPdfColor(getDeltaClass(produto.valor_vendas, produto.valor_vendas_ano_anterior || 0)) }
                  },
                  { content: '', styles: compareRowBaseStyles },
                  {
                    content: `${compareLabel} ${formatCurrency(produto.valor_lucro_ano_anterior || 0)} (${lucroDelta})`,
                    styles: { ...compareRowBaseStyles, textColor: mapPdfColor(getDeltaClass(produto.valor_lucro, produto.valor_lucro_ano_anterior || 0)) }
                  },
                  {
                    content: `${compareLabel} ${(produto.percentual_lucro_ano_anterior || 0).toFixed(2)}% (${margemDelta})`,
                    styles: { ...compareRowBaseStyles, textColor: mapPdfColor(getDeltaClass(produto.percentual_lucro, produto.percentual_lucro_ano_anterior || 0)) }
                  },
                  { content: '', styles: compareRowBaseStyles },
                  { content: '', styles: compareRowBaseStyles },
                ])
              }
            })

            if (tableRows.length > 0) {
              ensureSpace(10)
              /* eslint-disable @typescript-eslint/no-explicit-any */
              autoTable(doc as any, {
                head: [headers],
                body: tableRows as any,
                /* eslint-enable @typescript-eslint/no-explicit-any */
                startY: currentY,
                styles: {
                  fontSize: 7,
                  cellPadding: 1.5,
                },
                headStyles: {
                  fillColor: [59, 130, 246],
                  textColor: 255,
                  fontStyle: 'bold',
                  fontSize: 8,
                },
                columnStyles,
                margin: { left: tableStartX, right: tableStartX },
                didDrawPage: (data) => {
                  if (data.pageNumber !== lastFooterPage) {
                    const pageCount = doc.getNumberOfPages()
                    doc.setFontSize(8)
                    doc.text(
                      `Página ${data.pageNumber} de ${pageCount}`,
                      doc.internal.pageSize.width / 2,
                      doc.internal.pageSize.height - 10,
                      { align: 'center' }
                    )
                    lastFooterPage = data.pageNumber
                  }
                },
              })
              currentY = (doc.lastAutoTable?.finalY ?? currentY) + 4
            }
          })
        })
      })

      // Salvar PDF
      const fileName = `venda-curva-${filialNome.replace(/\s+/g, '-')}-${mesNome}-${ano}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao exportar PDF'
      alert(`Erro ao exportar PDF: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Funções de toggle
  const toggleDept1 = (id: string) => {
    setExpandedDept1(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleDept2 = (id: string) => {
    setExpandedDept2(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleDept3 = (id: string) => {
    setExpandedDept3(prev => ({ ...prev, [id]: !prev[id] }))
  }


  // Funções auxiliares
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatPercent = (value: number) => `${value.toFixed(2)}%`

  const formatDeltaPercent = (current: number, previous: number) => {
    if (previous === 0) {
      return '(-)'
    }
    const delta = ((current - previous) / previous) * 100
    const rounded = Math.round(delta)
    const sign = rounded > 0 ? '+' : ''
    return `${sign}${rounded}%`
  }

  const getDeltaClass = (current: number, previous: number) => {
    if (previous === 0) return 'text-muted-foreground'
    const delta = ((current - previous) / previous) * 100
    if (delta > 0) return 'text-green-600'
    if (delta < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  const meses = [
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

  const mesesCurto: Record<string, string> = {
    '1': 'Jan',
    '2': 'Fev',
    '3': 'Mar',
    '4': 'Abr',
    '5': 'Mai',
    '6': 'Jun',
    '7': 'Jul',
    '8': 'Ago',
    '9': 'Set',
    '10': 'Out',
    '11': 'Nov',
    '12': 'Dez',
  }

  const anos = Array.from({ length: 5 }, (_, i) => {
    const year = currentDate.getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  const compareLabel = `${mesesCurto[mes] || mes}/${String(Number(ano) - 1).slice(-2)}`

  // Continua na próxima parte...
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Vendas por Curva
        </h1>
        <p className="text-sm text-muted-foreground">
          Análise de vendas por curva ABC de produtos
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período e filial para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
            {/* Filiais */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <Label>Filiais</Label>
              <div className="h-10">
                <MultiSelect
                  options={todasAsFiliais}
                  value={filiaisSelecionadas}
                  onValueChange={(value) => {
                    setFiliaisSelecionadas(value)
                    setPage(1)
                  }}
                  placeholder={isLoadingBranches ? "Carregando filiais..." : "Selecione..."}
                  disabled={isLoadingBranches}
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* Mês */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Mês</Label>
              <div className="h-10">
                <Select value={mes} onValueChange={(value) => { setMes(value); setPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ano */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Ano</Label>
              <div className="h-10">
                <Select value={ano} onValueChange={(value) => { setAno(value); setPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[120px] h-10">
                    <SelectValue placeholder="Selecione o ano" />
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

            {/* Filtro de Produto - COM DEBOUNCE REAL */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <Label>Filtrar Produto</Label>
              <div className="h-10 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Digite código ou nome (mín. 3 caracteres)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full h-10 pl-9"
                />
                {inputValue.length > 0 && inputValue.length < 3 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Mín. 3 caracteres
                  </span>
                )}
                {/* Indicador visual de que está filtrando */}
                {inputValue.length >= 3 && filtroProduto !== inputValue && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500">
                    Filtrando...
                  </span>
                )}
              </div>
            </div>

            {/* Comparar Ano Anterior */}
            <div className="flex items-center gap-2 h-10">
              <Checkbox
                id="comparar-ano-anterior"
                checked={compararAnoAnterior}
                onCheckedChange={(value) => {
                  setCompararAnoAnterior(!!value)
                  setPage(1)
                }}
              />
              <Label htmlFor="comparar-ano-anterior" className="text-sm">
                Comparar com vendas do ano anterior
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continua no próximo arquivo... */}
      {/* Erro */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados */}
      {!loading && data && data.hierarquia && data.hierarquia.length > 0 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Vendas por Departamento e Curva
                </CardTitle>
                <CardDescription>
                  Total de {data.total_records} departamentos nível 3 encontrados
                </CardDescription>
              </div>
              <Button
                onClick={handleExportarPDF}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hierarquiaFiltrada.map((dept3) => (
                  <Collapsible
                    key={dept3.dept3_id}
                    open={expandedDept3[dept3.dept3_id.toString()]}
                    onOpenChange={() => toggleDept3(dept3.dept3_id.toString())}
                  >
                    <div className="rounded-lg border bg-card">
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50">
                        <div className="flex items-center gap-2">
                          {expandedDept3[dept3.dept3_id.toString()] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-bold text-base">
                            {dept3.dept_nivel3}
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Vendas</div>
                              <div className="font-semibold text-sm">
                                {formatCurrency(dept3.total_vendas)}
                              </div>
                              {compararAnoAnterior && (
                                <div className="text-[10px] text-muted-foreground">
                                  {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(dept3.total_vendas_ano_anterior || 0)}</span> (
                                  <span className={getDeltaClass(dept3.total_vendas, dept3.total_vendas_ano_anterior || 0)}>
                                    {formatDeltaPercent(dept3.total_vendas, dept3.total_vendas_ano_anterior || 0)}
                                  </span>
                                  )
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Lucro</div>
                              <div className="font-semibold text-sm">
                                {formatCurrency(dept3.total_lucro)}
                              </div>
                              {compararAnoAnterior && (
                                <div className="text-[10px] text-muted-foreground">
                                  {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(dept3.total_lucro_ano_anterior || 0)}</span> (
                                  <span className={getDeltaClass(dept3.total_lucro, dept3.total_lucro_ano_anterior || 0)}>
                                    {formatDeltaPercent(dept3.total_lucro, dept3.total_lucro_ano_anterior || 0)}
                                  </span>
                                  )
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Margem</div>
                              <div className="font-semibold text-sm">{formatPercent(dept3.margem)}</div>
                              {compararAnoAnterior && (
                                <div className="text-[10px] text-muted-foreground">
                                  {compareLabel} <span className="font-semibold text-black dark:text-white">{formatPercent(dept3.margem_ano_anterior || 0)}</span> (
                                  <span className={getDeltaClass(dept3.margem, dept3.margem_ano_anterior || 0)}>
                                    {formatDeltaPercent(dept3.margem, dept3.margem_ano_anterior || 0)}
                                  </span>
                                  )
                                </div>
                              )}
                            </div>
                          </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-2">
                          {dept3.nivel2?.map((dept2) => (
                            <Collapsible
                              key={dept2.dept2_id}
                              open={expandedDept2[dept2.dept2_id.toString()]}
                              onOpenChange={() => toggleDept2(dept2.dept2_id.toString())}
                            >
                              <div className="rounded-lg border bg-card/50">
                                <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-accent/50">
                                  <div className="flex items-center gap-2">
                                    {expandedDept2[dept2.dept2_id.toString()] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <span className="font-semibold text-sm">
                                      {dept2.dept_nivel2}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Vendas</div>
                                      <div className="font-medium text-xs">
                                        {formatCurrency(dept2.total_vendas)}
                                      </div>
                                      {compararAnoAnterior && (
                                        <div className="text-[10px] text-muted-foreground">
                                          {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(dept2.total_vendas_ano_anterior || 0)}</span> (
                                          <span className={getDeltaClass(dept2.total_vendas, dept2.total_vendas_ano_anterior || 0)}>
                                            {formatDeltaPercent(dept2.total_vendas, dept2.total_vendas_ano_anterior || 0)}
                                          </span>
                                          )
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Lucro</div>
                                      <div className="font-medium text-xs">
                                        {formatCurrency(dept2.total_lucro)}
                                      </div>
                                      {compararAnoAnterior && (
                                        <div className="text-[10px] text-muted-foreground">
                                          {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(dept2.total_lucro_ano_anterior || 0)}</span> (
                                          <span className={getDeltaClass(dept2.total_lucro, dept2.total_lucro_ano_anterior || 0)}>
                                            {formatDeltaPercent(dept2.total_lucro, dept2.total_lucro_ano_anterior || 0)}
                                          </span>
                                          )
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Margem</div>
                                      <div className="font-medium text-xs">{formatPercent(dept2.margem)}</div>
                                      {compararAnoAnterior && (
                                        <div className="text-[10px] text-muted-foreground">
                                          {compareLabel} <span className="font-semibold text-black dark:text-white">{formatPercent(dept2.margem_ano_anterior || 0)}</span> (
                                          <span className={getDeltaClass(dept2.margem, dept2.margem_ano_anterior || 0)}>
                                            {formatDeltaPercent(dept2.margem, dept2.margem_ano_anterior || 0)}
                                          </span>
                                          )
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="border-t p-3 space-y-2">
                                    {dept2.nivel1?.map((dept1) => (
                                      <Collapsible
                                        key={dept1.dept1_id}
                                        open={expandedDept1[dept1.dept1_id.toString()]}
                                        onOpenChange={() => toggleDept1(dept1.dept1_id.toString())}
                                      >
                                        <div className="rounded-lg border bg-card/30">
                                          <CollapsibleTrigger className="flex w-full items-center justify-between p-2.5 hover:bg-accent/30">
                                            <div className="flex items-center gap-2">
                                              {expandedDept1[dept1.dept1_id.toString()] ? (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                              ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                              )}
                                              <span className="font-medium text-xs">
                                                {dept1.dept_nivel1}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                            <div className="text-right">
                                              <div className="text-[10px] text-muted-foreground">Vendas</div>
                                              <div className="font-medium text-xs">
                                                {formatCurrency(dept1.total_vendas)}
                                              </div>
                                              {compararAnoAnterior && (
                                                <div className="text-[10px] text-muted-foreground">
                                                  {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(dept1.total_vendas_ano_anterior || 0)}</span> (
                                                  <span className={getDeltaClass(dept1.total_vendas, dept1.total_vendas_ano_anterior || 0)}>
                                                    {formatDeltaPercent(dept1.total_vendas, dept1.total_vendas_ano_anterior || 0)}
                                                  </span>
                                                  )
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[10px] text-muted-foreground">Lucro</div>
                                              <div className="font-medium text-xs">
                                                {formatCurrency(dept1.total_lucro)}
                                              </div>
                                              {compararAnoAnterior && (
                                                <div className="text-[10px] text-muted-foreground">
                                                  {compareLabel} <span className="font-semibold text-black dark:text-white">{formatCurrency(dept1.total_lucro_ano_anterior || 0)}</span> (
                                                  <span className={getDeltaClass(dept1.total_lucro, dept1.total_lucro_ano_anterior || 0)}>
                                                    {formatDeltaPercent(dept1.total_lucro, dept1.total_lucro_ano_anterior || 0)}
                                                  </span>
                                                  )
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[10px] text-muted-foreground">Margem</div>
                                              <div className="font-medium text-xs">{formatPercent(dept1.margem)}</div>
                                              {compararAnoAnterior && (
                                                <div className="text-[10px] text-muted-foreground">
                                                  {compareLabel} <span className="font-semibold text-black dark:text-white">{formatPercent(dept1.margem_ano_anterior || 0)}</span> (
                                                  <span className={getDeltaClass(dept1.margem, dept1.margem_ano_anterior || 0)}>
                                                    {formatDeltaPercent(dept1.margem, dept1.margem_ano_anterior || 0)}
                                                  </span>
                                                  )
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                          <div className="border-t">
                                            {dept1.produtos && dept1.produtos.length > 0 && (
                                              <ProdutoTable
                                                produtos={dept1.produtos}
                                                filtroProduto={filtroProduto}
                                                compararAnoAnterior={compararAnoAnterior}
                                                compareLabel={compareLabel}
                                              />
                                            )}
                                          </div>
                                        </CollapsibleContent>
                                        </div>
                                      </Collapsible>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Paginação */}
          {data.total_pages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                      className={page === data.total_pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Sem dados */}
      {!loading && data && (!data.hierarquia || data.hierarquia.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum dado encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Não há vendas registradas para o período e filial selecionados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
