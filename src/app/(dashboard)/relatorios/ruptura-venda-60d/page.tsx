'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { MultiSelect } from '@/components/ui/multi-select'
import { ChevronDown, ChevronRight, Package, AlertTriangle, FileDown, FileSpreadsheet } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'

// Tipos para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

interface Produto {
  produto_id: number
  filial_id: number
  filial_nome?: string
  produto_descricao: string
  curva_venda: string
  estoque_atual: number
  dias_com_venda_60d: number
  dias_com_venda_ultimos_3d: number
  venda_media_diaria_60d: number
  valor_estoque_parado: number
  nivel_ruptura: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO' | 'NORMAL'
}

interface Subgrupo {
  subgrupo_nome: string
  produtos: Produto[]
}

interface Grupo {
  grupo_nome: string
  subgrupos: Subgrupo[]
}

interface Segmento {
  segmento_nome: string
  grupos: Grupo[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  segmentos: Segmento[]
}

export default function RupturaVenda60dPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { options: filiaisOptions } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
  })

  // Estados dos filtros
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  const [diasMinimos, setDiasMinimos] = useState<string>('20')
  const [curvasSelecionadas, setCurvasSelecionadas] = useState<{ value: string; label: string }[]>([
    { value: 'A', label: 'Curva A' },
    { value: 'B', label: 'Curva B' },
    { value: 'C', label: 'Curva C' },
  ])
  const [page, setPage] = useState(1)

  // Opções de filtros
  const diasMinimosOptions = [
    { value: '10', label: '≥ 10 dias' },
    { value: '20', label: '≥ 20 dias' },
    { value: '30', label: '≥ 30 dias' },
    { value: '40', label: '≥ 40 dias' },
    { value: '50', label: '≥ 50 dias' },
  ]

  const curvasOptions = [
    { value: 'A', label: 'Curva A' },
    { value: 'B', label: 'Curva B' },
    { value: 'C', label: 'Curva C' },
    { value: 'D', label: 'Curva D' },
  ]

  // Estados dos dados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Estados de colapso
  const [segmentosAbertos, setSegmentosAbertos] = useState<Record<string, boolean>>({})
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({})
  const [subgruposAbertos, setSubgruposAbertos] = useState<Record<string, boolean>>({})

  // Log de acesso ao módulo
  useEffect(() => {
    if (currentTenant?.id && userProfile?.id) {
      logModuleAccess({
        module: 'relatorios',
        subModule: 'ruptura_venda_60d',
        tenantId: currentTenant.id,
        userName: userProfile.full_name || 'Usuário',
        userEmail: userProfile.id
      })
    }
  }, [currentTenant?.id, userProfile?.id, userProfile?.full_name])

  // Buscar dados
  useEffect(() => {
    if (!currentTenant?.supabase_schema) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const filiais = filiaisSelecionadas.length > 0
          ? filiaisSelecionadas.map(f => parseInt(f.value))
          : null

        const curvas = curvasSelecionadas.length > 0
          ? curvasSelecionadas.map(c => c.value)
          : null

        console.log('[Ruptura 60d] Buscando dados:', {
          schema: currentTenant.supabase_schema,
          filiais,
          diasMinimos: parseInt(diasMinimos),
          curvas,
          page
        })

        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: result, error: rpcError } = await (supabase.rpc as any)('get_ruptura_venda_60d_report', {
          schema_name: currentTenant.supabase_schema,
          p_filiais: filiais,
          p_limite_minimo_dias: parseInt(diasMinimos),
          p_curvas: curvas,
          p_page: page,
          p_page_size: 50
        })

        console.log('[Ruptura 60d] Resultado RPC:', { result, error: rpcError })

        if (rpcError) {
          console.error('[Ruptura 60d] Erro RPC:', rpcError)
          throw rpcError
        }

        if (result && result.length > 0) {
          const row = result[0]
          console.log('[Ruptura 60d] Dados processados:', {
            total: row.total_records,
            segmentos: row.segmentos?.length || 0
          })
          setData({
            total_records: row.total_records || 0,
            page: row.page || 1,
            page_size: row.page_size || 50,
            total_pages: row.total_pages || 1,
            segmentos: row.segmentos || []
          })
        } else {
          console.log('[Ruptura 60d] Nenhum dado encontrado')
          setData({
            total_records: 0,
            page: 1,
            page_size: 50,
            total_pages: 1,
            segmentos: []
          })
        }
      } catch (err) {
        console.error('[Ruptura 60d] Erro ao buscar dados:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentTenant?.supabase_schema, filiaisSelecionadas, diasMinimos, curvasSelecionadas, page])

  // Função para formatar números
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!currentTenant?.supabase_schema) return

    setExporting(true)
    try {
      // Importação dinâmica para reduzir bundle inicial
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      // Buscar todos os dados para exportação
      const supabase = createClient()
      const filiais = filiaisSelecionadas.length > 0
        ? filiaisSelecionadas.map(f => parseInt(f.value))
        : null
      const curvas = curvasSelecionadas.length > 0
        ? curvasSelecionadas.map(c => c.value)
        : null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allData } = await (supabase.rpc as any)('get_ruptura_venda_60d_report', {
        schema_name: currentTenant.supabase_schema,
        p_filiais: filiais,
        p_limite_minimo_dias: parseInt(diasMinimos),
        p_curvas: curvas,
        p_page: 1,
        p_page_size: 10000
      })

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      // Título centralizado
      doc.setFontSize(16)
      doc.text('Ruptura Vendas - Dias sem Giro', doc.internal.pageSize.width / 2, 15, {
        align: 'center',
      })

      // Informações do filtro
      doc.setFontSize(10)
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25)
      doc.text(`Dias mínimos: >= ${diasMinimos}`, 14, 30)
      doc.text(`Curvas: ${curvasSelecionadas.map((c) => c.value).join(', ') || 'Todas'}`, 14, 35)
      doc.text(`Total de Produtos: ${allData?.[0]?.total_records || 0}`, 14, 40)

      /* eslint-disable @typescript-eslint/no-explicit-any */

      if (allData && allData.length > 0 && allData[0].segmentos) {
        const segmentos = allData[0].segmentos

        // Largura útil da página (A4 landscape = 297mm, margem 10mm cada lado)
        const pageWidth = doc.internal.pageSize.width
        const marginLeft = 10
        const marginRight = 10
        const contentWidth = pageWidth - marginLeft - marginRight

        let startY = 48

        segmentos.forEach((segmento: Segmento, segmentoIndex: number) => {
          // Verificar se precisa de nova página
          if (startY > doc.internal.pageSize.height - 50) {
            doc.addPage()
            startY = 20
          }

          // Título do Segmento
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(59, 130, 246) // Cor primary (azul)
          doc.text(segmento.segmento_nome, marginLeft, startY)
          doc.setTextColor(0, 0, 0)
          startY += 6

          segmento.grupos.forEach((grupo: Grupo) => {
            // Verificar se precisa de nova página
            if (startY > doc.internal.pageSize.height - 40) {
              doc.addPage()
              startY = 20
            }

            // Título do Grupo
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(80, 80, 80)
            doc.text(`  ${grupo.grupo_nome}`, marginLeft, startY)
            doc.setTextColor(0, 0, 0)
            startY += 5

            grupo.subgrupos.forEach((subgrupo: Subgrupo) => {
              // Verificar se precisa de nova página
              if (startY > doc.internal.pageSize.height - 35) {
                doc.addPage()
                startY = 20
              }

              // Título do Subgrupo
              doc.setFontSize(8)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(120, 120, 120)
              doc.text(`    ${subgrupo.subgrupo_nome} (${subgrupo.produtos.length} produtos)`, marginLeft, startY)
              doc.setTextColor(0, 0, 0)
              startY += 4

              // Tabela de produtos
              const tableData = subgrupo.produtos.map((p: Produto) => [
                p.filial_nome || String(p.filial_id),
                p.produto_id,
                p.produto_descricao.substring(0, 50),
                formatNumber(p.estoque_atual),
                p.curva_venda,
                `${p.dias_com_venda_60d}d`,
                formatNumber(p.venda_media_diaria_60d),
                formatNumber(p.valor_estoque_parado),
                p.nivel_ruptura
              ])

              autoTable(doc as any, {
                head: [['Filial', 'Código', 'Descrição', 'Estoque', 'Curva', 'Freq. Giro', 'Giro Médio', 'Valor Parado', 'Nível']],
                body: tableData as any,
                startY: startY,
                tableWidth: contentWidth - 8,
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                  0: { cellWidth: 28 },  // Filial
                  1: { cellWidth: 18 },  // Código
                  2: { cellWidth: 'auto' },  // Descrição - expande
                  3: { cellWidth: 20, halign: 'right' },  // Estoque
                  4: { cellWidth: 14, halign: 'center' },  // Curva
                  5: { cellWidth: 18, halign: 'center' },  // Freq. Giro
                  6: { cellWidth: 20, halign: 'right' },  // Giro Médio
                  7: { cellWidth: 24, halign: 'right' },  // Valor Parado
                  8: { cellWidth: 18, halign: 'center' },  // Nível
                },
                margin: { left: marginLeft + 4, right: marginRight },
              })

              startY = doc.lastAutoTable.finalY + 5
            })
          })

          // Separador entre segmentos
          if (segmentoIndex < segmentos.length - 1) {
            startY += 3
          }
        })

        // Adicionar número de páginas
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          )
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */

      doc.save(`dias-sem-giro-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      alert('Erro ao exportar PDF')
    } finally {
      setExporting(false)
    }
  }

  // Exportar Excel
  const handleExportExcel = async () => {
    if (!currentTenant?.supabase_schema) return

    setExporting(true)
    try {
      const ExcelJS = await import('exceljs')

      // Buscar todos os dados
      const supabase = createClient()
      const filiais = filiaisSelecionadas.length > 0
        ? filiaisSelecionadas.map(f => parseInt(f.value))
        : null
      const curvas = curvasSelecionadas.length > 0
        ? curvasSelecionadas.map(c => c.value)
        : null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allData } = await (supabase.rpc as any)('get_ruptura_venda_60d_report', {
        schema_name: currentTenant.supabase_schema,
        p_filiais: filiais,
        p_limite_minimo_dias: parseInt(diasMinimos),
        p_curvas: curvas,
        p_page: 1,
        p_page_size: 10000
      })

      const rows: {
        Segmento: string
        Grupo: string
        Subgrupo: string
        Filial: string | number
        Código: number
        Descrição: string
        Estoque: number
        Curva: string
        'Freq. Giro': number
        'Giro Médio': number
        'Valor Parado': number
        Nível: string
      }[] = []

      if (allData && allData.length > 0 && allData[0].segmentos) {
        const segmentos = allData[0].segmentos

        segmentos.forEach((segmento: Segmento) => {
          segmento.grupos.forEach((grupo: Grupo) => {
            grupo.subgrupos.forEach((subgrupo: Subgrupo) => {
              subgrupo.produtos.forEach((p: Produto) => {
                rows.push({
                  Segmento: segmento.segmento_nome,
                  Grupo: grupo.grupo_nome,
                  Subgrupo: subgrupo.subgrupo_nome,
                  Filial: p.filial_nome || p.filial_id,
                  Código: p.produto_id,
                  Descrição: p.produto_descricao,
                  Estoque: p.estoque_atual,
                  Curva: p.curva_venda,
                  'Freq. Giro': p.dias_com_venda_60d,
                  'Giro Médio': p.venda_media_diaria_60d,
                  'Valor Parado': p.valor_estoque_parado,
                  Nível: p.nivel_ruptura
                })
              })
            })
          })
        })
      }

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Dias sem Giro')

      // Add headers from first row keys
      if (rows.length > 0) {
        worksheet.columns = Object.keys(rows[0]).map(key => ({
          header: key,
          key: key,
          width: key === 'Descrição' ? 45 :
                 key === 'Segmento' || key === 'Grupo' || key === 'Subgrupo' ? 20 :
                 key === 'Filial' ? 18 :
                 key === 'Valor Parado' ? 14 :
                 key === 'Estoque' || key === 'Freq. Giro' || key === 'Giro Médio' ? 12 :
                 key === 'Código' || key === 'Nível' ? 10 :
                 key === 'Curva' ? 8 : 15
        }))
        worksheet.addRows(rows)
      }

      // Download file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dias-sem-giro-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao exportar Excel:', err)
      alert('Erro ao exportar Excel')
    } finally {
      setExporting(false)
    }
  }

  // Toggle functions
  const toggleSegmento = (nome: string) => {
    setSegmentosAbertos(prev => ({ ...prev, [nome]: !prev[nome] }))
  }

  const toggleGrupo = (key: string) => {
    setGruposAbertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleSubgrupo = (key: string) => {
    setSubgruposAbertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Badge de nível de ruptura
  const getNivelBadge = (nivel: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      'CRÍTICO': 'destructive',
      'ALTO': 'destructive',
      'MÉDIO': 'default',
      'BAIXO': 'secondary'
    }
    return <Badge variant={variants[nivel] || 'outline'}>{nivel}</Badge>
  }

  // Calcular estatísticas por nível de ruptura
  const calcularEstatisticas = () => {
    const stats = {
      CRÍTICO: 0,
      ALTO: 0,
      MÉDIO: 0,
      BAIXO: 0,
      NORMAL: 0,
      valorTotal: 0
    }

    if (data?.segmentos) {
      data.segmentos.forEach((seg: Segmento) => {
        seg.grupos.forEach((grupo: Grupo) => {
          grupo.subgrupos.forEach((subgrupo: Subgrupo) => {
            subgrupo.produtos.forEach((produto: Produto) => {
              const nivel = produto.nivel_ruptura as keyof typeof stats
              if (nivel in stats && nivel !== 'valorTotal') {
                (stats[nivel] as number)++
              }
              stats.valorTotal += produto.valor_estoque_parado || 0
            })
          })
        })
      })
    }

    return stats
  }

  const estatisticas = data ? calcularEstatisticas() : null

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Ruptura Vendas - Dias sem Giro
        </h1>
        <p className="text-sm text-muted-foreground">
          Produtos com histórico de vendas consistente que pararam de girar
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Linha 1: Filtros principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filiais */}
              <div className="flex flex-col gap-2">
                <Label>Filiais</Label>
                <div className="h-10">
                  <MultiSelect
                    options={filiaisOptions}
                    value={filiaisSelecionadas}
                    onValueChange={setFiliaisSelecionadas}
                    placeholder="Todas as Filiais"
                    className="w-full h-10"
                  />
                </div>
              </div>

              {/* Dias mínimos com venda */}
              <div className="flex flex-col gap-2">
                <Label>Dias mínimos com venda (60d)</Label>
                <div className="h-10">
                  <Select value={diasMinimos} onValueChange={setDiasMinimos}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {diasMinimosOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Curvas */}
              <div className="flex flex-col gap-2">
                <Label>Curvas ABCD</Label>
                <div className="h-10">
                  <MultiSelect
                    options={curvasOptions}
                    value={curvasSelecionadas}
                    onValueChange={setCurvasSelecionadas}
                    placeholder="Selecione as curvas"
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* Descrição dos critérios */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <strong>Critério de Ruptura:</strong> Produtos que venderam em pelo menos{' '}
              <strong>{diasMinimos} dias</strong> dos últimos 60 dias, mas{' '}
              <strong>não venderam nos últimos 3 dias</strong>, mesmo tendo estoque disponível.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Produtos em Ruptura
                </CardTitle>
                {data && (
                  <CardDescription>
                    {data.total_records} produto(s) encontrado(s)
                  </CardDescription>
                )}
              </div>
              {/* Botões de Exportação */}
              {data && data.total_records > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    variant="outline"
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    variant="outline"
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              )}
            </div>

            {/* Estatísticas por nível */}
            {estatisticas && data && data.total_records > 0 && (
              <div className="flex flex-wrap gap-3">
                {estatisticas.CRÍTICO > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-md">
                    <Badge variant="destructive">CRÍTICO</Badge>
                    <span className="text-sm font-medium">{estatisticas.CRÍTICO}</span>
                  </div>
                )}
                {estatisticas.ALTO > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-md">
                    <Badge className="bg-orange-500 hover:bg-orange-600">ALTO</Badge>
                    <span className="text-sm font-medium">{estatisticas.ALTO}</span>
                  </div>
                )}
                {estatisticas.MÉDIO > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-md">
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">MÉDIO</Badge>
                    <span className="text-sm font-medium">{estatisticas.MÉDIO}</span>
                  </div>
                )}
                {estatisticas.BAIXO > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                    <Badge variant="secondary">BAIXO</Badge>
                    <span className="text-sm font-medium">{estatisticas.BAIXO}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-md ml-auto">
                  <span className="text-sm text-muted-foreground">Valor Parado:</span>
                  <span className="text-sm font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(estatisticas.valorTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : data?.segmentos && data.segmentos.length > 0 ? (
            <div className="space-y-4">
              {data.segmentos.map((segmento: Segmento) => (
                <Collapsible
                  key={segmento.segmento_nome}
                  open={segmentosAbertos[segmento.segmento_nome]}
                  onOpenChange={() => toggleSegmento(segmento.segmento_nome)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    {segmentosAbertos[segmento.segmento_nome] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">{segmento.segmento_nome}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-6 space-y-2">
                    {segmento.grupos.map((grupo: Grupo) => {
                      const grupoKey = `${segmento.segmento_nome}-${grupo.grupo_nome}`
                      return (
                        <Collapsible
                          key={grupoKey}
                          open={gruposAbertos[grupoKey]}
                          onOpenChange={() => toggleGrupo(grupoKey)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded hover:bg-muted/70 transition-colors">
                            {gruposAbertos[grupoKey] ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <span className="font-medium text-sm">{grupo.grupo_nome}</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 ml-4 space-y-2">
                            {grupo.subgrupos.map((subgrupo: Subgrupo) => {
                              const subgrupoKey = `${grupoKey}-${subgrupo.subgrupo_nome}`
                              return (
                                <Collapsible
                                  key={subgrupoKey}
                                  open={subgruposAbertos[subgrupoKey]}
                                  onOpenChange={() => toggleSubgrupo(subgrupoKey)}
                                >
                                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/30 rounded transition-colors">
                                    {subgruposAbertos[subgrupoKey] ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      {subgrupo.subgrupo_nome}
                                    </span>
                                    <Badge variant="outline" className="ml-auto">
                                      {subgrupo.produtos.length}
                                    </Badge>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Filial</TableHead>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-right">Estoque</TableHead>
                                            <TableHead>Curva</TableHead>
                                            <TableHead className="text-right">Freq. Giro</TableHead>
                                            <TableHead className="text-right">Giro Médio</TableHead>
                                            <TableHead className="text-right">Valor Parado</TableHead>
                                            <TableHead>Nível</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {subgrupo.produtos.map((produto: Produto) => (
                                            <TableRow key={`${produto.filial_id}-${produto.produto_id}`}>
                                              <TableCell className="font-medium">
                                                {produto.filial_nome || produto.filial_id}
                                              </TableCell>
                                              <TableCell>{produto.produto_id}</TableCell>
                                              <TableCell className="max-w-xs truncate">
                                                {produto.produto_descricao}
                                              </TableCell>
                                              <TableCell className="text-right">{formatNumber(produto.estoque_atual)}</TableCell>
                                              <TableCell>
                                                <Badge variant="outline">{produto.curva_venda}</Badge>
                                              </TableCell>
                                              <TableCell className="text-right">{produto.dias_com_venda_60d} dias</TableCell>
                                              <TableCell className="text-right">
                                                {formatNumber(produto.venda_media_diaria_60d)}
                                              </TableCell>
                                              <TableCell className="text-right text-destructive font-medium">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valor_estoque_parado)}
                                              </TableCell>
                                              <TableCell>{getNivelBadge(produto.nivel_ruptura)}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto em ruptura encontrado</p>
              <p className="text-sm mt-2">
                Isso é ótimo! Significa que não há produtos com vendas consistentes que pararam de vender.
              </p>
            </div>
          )}

          {/* Paginação */}
          {data && data.total_pages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {[...Array(data.total_pages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setPage(i + 1)}
                        isActive={page === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                      className={page === data.total_pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
