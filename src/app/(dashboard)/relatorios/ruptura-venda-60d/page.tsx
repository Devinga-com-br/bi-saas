'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { ChevronDown, ChevronRight, Package, AlertTriangle, FileDown } from 'lucide-react'
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
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'

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
  const [page, setPage] = useState(1)

  // Estados dos dados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        console.log('[Ruptura 60d] Buscando dados:', {
          schema: currentTenant.supabase_schema,
          filiais,
          page
        })

        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: result, error: rpcError } = await (supabase.rpc as any)('get_ruptura_venda_60d_report', {
          schema_name: currentTenant.supabase_schema,
          p_filiais: filiais,
          p_limite_minimo_dias: 30,
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
  }, [currentTenant?.supabase_schema, filiaisSelecionadas, page])

  // Funções de exportação
  const exportarPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Título
      doc.setFontSize(16)
      doc.text('Relatório de Ruptura de Vendas (60 dias)', 15, 15)

      // Data
      doc.setFontSize(10)
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 15, 22)

      let yPos = 30

      // Buscar todos os dados para exportação
      const supabase = createClient()
      const filiais = filiaisSelecionadas.length > 0
        ? filiaisSelecionadas.map(f => parseInt(f.value))
        : null

      const { data: allData } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)('get_ruptura_venda_60d_report', {
        schema_name: currentTenant?.supabase_schema,
        p_filiais: filiais,
        p_limite_minimo_dias: 30,
        p_page: 1,
        p_page_size: 10000
      })

      if (allData && allData.length > 0 && allData[0].segmentos) {
        const segmentos = allData[0].segmentos

        segmentos.forEach((segmento: Segmento) => {
          if (yPos > 180) {
            doc.addPage()
            yPos = 15
          }

          // Título do segmento
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text(segmento.segmento_nome, 15, yPos)
          yPos += 7

          segmento.grupos.forEach((grupo: Grupo) => {
            // Título do grupo
            doc.setFontSize(11)
            doc.text(`  ${grupo.grupo_nome}`, 15, yPos)
            yPos += 5

            grupo.subgrupos.forEach((subgrupo: Subgrupo) => {
              // Título do subgrupo
              doc.setFontSize(10)
              doc.text(`    ${subgrupo.subgrupo_nome}`, 15, yPos)
              yPos += 5

              // Tabela de produtos
              const tableData = subgrupo.produtos.map((p: Produto) => [
                p.filial_nome || p.filial_id,
                p.produto_id,
                p.produto_descricao,
                p.estoque_atual,
                p.curva_venda,
                p.dias_com_venda_60d,
                p.dias_com_venda_ultimos_3d,
                p.venda_media_diaria_60d.toFixed(2),
                p.nivel_ruptura
              ])

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(doc as any).autoTable({
                startY: yPos,
                head: [['Filial', 'ID', 'Descrição', 'Estoque', 'Curva', 'Dias 60d', 'Dias 3d', 'Média/dia', 'Nível']],
                body: tableData,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] },
                margin: { left: 20 }
              })

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              yPos = (doc as any).lastAutoTable.finalY + 5
            })
          })
        })
      }

      doc.save('ruptura-venda-60d.pdf')
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar PDF')
    }
  }

  const exportarExcel = async () => {
    try {
      const XLSX = await import('xlsx')

      // Buscar todos os dados
      const supabase = createClient()
      const filiais = filiaisSelecionadas.length > 0
        ? filiaisSelecionadas.map(f => parseInt(f.value))
        : null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allData } = await (supabase.rpc as any)('get_ruptura_venda_60d_report', {
        schema_name: currentTenant?.supabase_schema,
        p_filiais: filiais,
        p_limite_minimo_dias: 30,
        p_page: 1,
        p_page_size: 10000
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = []

      if (allData && allData.length > 0 && allData[0].segmentos) {
        const segmentos = allData[0].segmentos

        segmentos.forEach((segmento: Segmento) => {
          segmento.grupos.forEach((grupo: Grupo) => {
            grupo.subgrupos.forEach((subgrupo: Subgrupo) => {
              subgrupo.produtos.forEach((p: Produto) => {
                rows.push({
                  'Segmento': segmento.segmento_nome,
                  'Grupo': grupo.grupo_nome,
                  'Subgrupo': subgrupo.subgrupo_nome,
                  'Filial': p.filial_nome || p.filial_id,
                  'ID Produto': p.produto_id,
                  'Descrição': p.produto_descricao,
                  'Estoque Atual': p.estoque_atual,
                  'Curva': p.curva_venda,
                  'Dias com Venda 60d': p.dias_com_venda_60d,
                  'Dias com Venda 3d': p.dias_com_venda_ultimos_3d,
                  'Venda Média Diária': p.venda_media_diaria_60d.toFixed(2),
                  'Valor Estoque Parado': p.valor_estoque_parado.toFixed(2),
                  'Nível Ruptura': p.nivel_ruptura
                })
              })
            })
          })
        })
      }

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ruptura Vendas 60d')
      XLSX.writeFile(workbook, 'ruptura-venda-60d.xlsx')
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
      alert('Erro ao exportar Excel')
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

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <PageBreadcrumb />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ruptura de Vendas (60 dias)</h1>
        <p className="text-muted-foreground mt-2">
          Produtos com vendas consistentes que pararam de vender recentemente
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione as filiais para visualizar produtos em ruptura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <MultiSelect
                options={filiaisOptions}
                value={filiaisSelecionadas}
                onValueChange={setFiliaisSelecionadas}
                placeholder="Todas as Filiais"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={exportarPDF} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={exportarExcel} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
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
                                            <TableHead>ID</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-right">Estoque</TableHead>
                                            <TableHead>Curva</TableHead>
                                            <TableHead className="text-right">Dias 60d</TableHead>
                                            <TableHead className="text-right">Dias 3d</TableHead>
                                            <TableHead className="text-right">Média/dia</TableHead>
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
                                              <TableCell className="text-right">{produto.estoque_atual}</TableCell>
                                              <TableCell>
                                                <Badge variant="outline">{produto.curva_venda}</Badge>
                                              </TableCell>
                                              <TableCell className="text-right">{produto.dias_com_venda_60d}</TableCell>
                                              <TableCell className="text-right">{produto.dias_com_venda_ultimos_3d}</TableCell>
                                              <TableCell className="text-right">
                                                {produto.venda_media_diaria_60d.toFixed(2)}
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
