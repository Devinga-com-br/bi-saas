'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { MultiSelect } from '@/components/ui/multi-select'
import { Search, ChevronDown, ChevronRight, Package, AlertTriangle, FileDown } from 'lucide-react'
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
  curva_lucro: string | null
  curva_venda: string
  estoque_atual: number
  venda_media_diaria_60d: number
  dias_de_estoque: number | null
  preco_venda: number
  filial_transfer_id: number | null
  filial_transfer_nome: string | null
  estoque_transfer: number | null
}

interface Departamento {
  departamento_id: number
  departamento_nome: string
  produtos: Produto[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  departamentos: Departamento[]
}

export default function RupturaABCDPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { options: filiaisOptions } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
  })

  // Estados dos filtros
  const [filialSelecionada, setFilialSelecionada] = useState<string>('')
  const [curvasSelecionadas, setCurvasSelecionadas] = useState<string[]>(['A'])
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  
  // Helper para verificar se "Todas as Filiais" está selecionada
  const todasFiliais = filialSelecionada === 'all'

  // Estados dos dados
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados de colapso dos departamentos
  const [collapsedDepts, setCollapsedDepts] = useState<Set<number>>(new Set())

  const curvasOptions = [
    { value: 'A', label: 'Curva A' },
    { value: 'B', label: 'Curva B' },
    { value: 'C', label: 'Curva C' },
    { value: 'D', label: 'Curva D' },
  ]

  const fetchData = async () => {
    if (!currentTenant?.supabase_schema) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        curvas: curvasSelecionadas.join(','),
        apenas_ativos: 'true',
        apenas_ruptura: 'true',
        page: page.toString(),
        page_size: '50',
      })

      if (filialSelecionada && filialSelecionada !== 'all') {
        params.append('filial_id', filialSelecionada)
      }

      if (busca) {
        params.append('busca', busca)
      }

      const response = await fetch(`/api/relatorios/ruptura-abcd?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Definir filial padrão quando as opções carregarem
  useEffect(() => {
    if (filiaisOptions.length > 0 && !filialSelecionada) {
      setFilialSelecionada(filiaisOptions[0].value)
    }
  }, [filiaisOptions, filialSelecionada])

  // Log module access
  useEffect(() => {
    const logAccess = async () => {
      if (currentTenant && userProfile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        logModuleAccess({
          module: 'relatorios',
          subModule: 'ruptura-abcd',
          tenantId: currentTenant.id,
          userName: userProfile.full_name,
          userEmail: user?.email || ''
        })
      }
    }
    logAccess()
  }, [currentTenant, userProfile])

  // Carregar dados quando filial for definida
  useEffect(() => {
    if (currentTenant?.supabase_schema && filialSelecionada) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialSelecionada, currentTenant])

  // Recarregar quando mudar a página (exceto primeira carga)
  useEffect(() => {
    if (currentTenant?.supabase_schema && filialSelecionada && data !== null) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleAplicarFiltros = () => {
    setPage(1)
    fetchData()
  }

  const handleExportarPDF = async () => {
    if (!currentTenant?.supabase_schema) return

    try {
      setLoading(true)
      
      // Importação dinâmica para reduzir bundle inicial
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      // Buscar TODOS os dados sem paginação
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        curvas: curvasSelecionadas.join(','),
        apenas_ativos: 'true',
        apenas_ruptura: 'true',
        page: '1',
        page_size: '10000'
      })
      
      if (filialSelecionada && filialSelecionada !== 'all') {
        params.append('filial_id', filialSelecionada)
      }
      
      const response = await fetch(`/api/relatorios/ruptura-abcd?${params}`)

      if (!response.ok) throw new Error('Erro ao buscar dados para exportação')

      const allData = await response.json()

      // Criar PDF
      const doc = new jsPDF({
        orientation: todasFiliais ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Configurar fonte para suportar caracteres especiais
      doc.setFont('helvetica')

      // Cabeçalho
      const filialNome = todasFiliais 
        ? 'Todas as Filiais' 
        : filiaisOptions.find(f => f.value === filialSelecionada)?.label || 'N/A'
      doc.setFontSize(16)
      doc.text('Relatório de Ruptura por Curva ABCD', doc.internal.pageSize.width / 2, 15, { align: 'center' })
      
      doc.setFontSize(10)
      doc.text(`Filial: ${filialNome}`, 14, 25)
      doc.text(`Curvas: ${curvasSelecionadas.join(', ')}`, 14, 30)
      doc.text(`Total de produtos: ${allData.total_records || 0}`, 14, 35)
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 40)

      // Preparar dados da tabela
      const tableData: (string | number | { content: string; colSpan: number; styles: { fillColor: number[]; fontStyle: string } })[][] = []
      
      allData.departamentos?.forEach((dept: { departamento_nome: string; produtos: Produto[] }) => {
        // Linha do departamento
        tableData.push([
          { content: dept.departamento_nome, colSpan: todasFiliais ? 8 : 7, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' as const } }
        ])
        
        // Produtos do departamento
        dept.produtos.forEach(prod => {
          const row: (string | number)[] = [
            prod.produto_id.toString(),
          ]
          
          if (todasFiliais) {
            row.push(prod.filial_nome || `Filial ${prod.filial_id}`)
          }
          
          row.push(
            prod.produto_descricao,
            prod.curva_lucro || '-',
            prod.curva_venda || '-',
            formatNumber(prod.estoque_atual),
            prod.filial_transfer_nome || '-',
            prod.estoque_transfer ? formatNumber(prod.estoque_transfer) : '-',
          )
          
          tableData.push(row)
        })
      })

      // Definir cabeçalho da tabela
      const headers = ['Código']
      if (todasFiliais) headers.push('Filial')
      headers.push('Descrição', 'C. Lucro', 'C. Venda', 'Estoque', 'Fil. Transf.', 'Est. Transf.')

      // Definir estilos de coluna baseado em se tem coluna de filial ou não
      const columnStyles: Record<number, { cellWidth?: number; halign?: 'center' | 'right' | 'left' }> = {}
      
      if (todasFiliais) {
        columnStyles[0] = { cellWidth: 20 } // Código
        columnStyles[1] = { cellWidth: 25 } // Filial
        columnStyles[2] = { cellWidth: 90 } // Descrição
        columnStyles[3] = { cellWidth: 20, halign: 'center' } // C. Lucro
        columnStyles[4] = { cellWidth: 20, halign: 'center' } // C. Venda
        columnStyles[5] = { cellWidth: 20, halign: 'right' } // Estoque
        columnStyles[6] = { cellWidth: 25, halign: 'center' } // Fil. Transf
        columnStyles[7] = { cellWidth: 25, halign: 'right' } // Est. Transf
      } else {
        columnStyles[0] = { cellWidth: 20 } // Código
        columnStyles[1] = { cellWidth: 60 } // Descrição
        columnStyles[2] = { cellWidth: 20, halign: 'center' } // C. Lucro
        columnStyles[3] = { cellWidth: 20, halign: 'center' } // C. Venda
        columnStyles[4] = { cellWidth: 20, halign: 'right' } // Estoque
        columnStyles[5] = { cellWidth: 25, halign: 'center' } // Fil. Transf
        columnStyles[6] = { cellWidth: 25, halign: 'right' } // Est. Transf
      }

      // Gerar tabela
      /* eslint-disable @typescript-eslint/no-explicit-any */
      autoTable(doc as any, {
        head: [headers],
        body: tableData as any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        columnStyles,
        margin: { top: 45, left: 14, right: 14 },
        didDrawPage: (data) => {
          // Rodapé com número da página
          const pageCount = doc.getNumberOfPages()
          doc.setFontSize(8)
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          )
        },
      })

      // Salvar PDF
      const fileName = `ruptura-abcd-${filialNome.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      alert('Erro ao exportar PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDept = (deptId: number) => {
    setCollapsedDepts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deptId)) {
        newSet.delete(deptId)
      } else {
        newSet.add(deptId)
      }
      return newSet
    })
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório de Ruptura por Curva ABCD</h1>
          <p className="text-muted-foreground">
            Análise de produtos com ruptura de estoque por curva de vendas
          </p>
        </div>
        
        {/* Botão de Exportar */}
        {data && data.total_records > 0 && (
          <Button
            onClick={handleExportarPDF}
            disabled={loading}
            variant="outline"
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configure os filtros para o relatório</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Filial */}
            <div className="space-y-2 flex-1">
              <Label>Filial</Label>
              <Select value={filialSelecionada} onValueChange={setFilialSelecionada}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Filiais</SelectItem>
                  {filiaisOptions.map((filial) => (
                    <SelectItem key={filial.value} value={filial.value}>
                      {filial.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Curvas */}
            <div className="space-y-2 flex-1">
              <Label>Curvas ABCD</Label>
              <div className="h-10">
                <MultiSelect
                  options={curvasOptions}
                  value={curvasSelecionadas.map(c => ({ value: c, label: `Curva ${c}` }))}
                  onValueChange={(selected) => setCurvasSelecionadas(selected.map(s => s.value))}
                  placeholder=""
                  className="w-full h-10"
                />
              </div>
            </div>

            {/* Busca */}
            <div className="space-y-2 flex-1">
              <Label>Buscar Produto</Label>
              <div className="relative h-10">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 w-full h-10"
                />
              </div>
            </div>

            {/* Botão Aplicar */}
            <div className="h-10">
              <Button onClick={handleAplicarFiltros} disabled={loading} className="w-full lg:w-auto min-w-[100px] h-10">
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Produtos em Ruptura</CardTitle>
              <CardDescription>
                {data ? `${data.total_records} produtos encontrados` : 'Carregando...'}
              </CardDescription>
            </div>
            {data && data.total_records > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.total_records} rupturas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-lg font-semibold">Erro ao carregar dados</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : !data || data.departamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Nenhum produto encontrado</p>
              <p className="text-muted-foreground">Ajuste os filtros para ver os resultados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.departamentos.map((dept) => (
                <Collapsible
                  key={dept.departamento_id}
                  open={!collapsedDepts.has(dept.departamento_id)}
                  onOpenChange={() => handleToggleDept(dept.departamento_id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer hover:bg-accent/50 transition-colors border rounded-lg p-4 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {collapsedDepts.has(dept.departamento_id) ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <h3 className="text-lg font-semibold">{dept.departamento_nome}</h3>
                        </div>
                        <Badge variant="secondary">
                          {dept.produtos.length} {dept.produtos.length === 1 ? 'produto' : 'produtos'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md border mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Código</TableHead>
                            {todasFiliais && <TableHead className="w-[120px]">Filial</TableHead>}
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-center w-[100px]">C. Lucro</TableHead>
                            <TableHead className="text-center w-[100px]">C. Venda</TableHead>
                            <TableHead className="text-right w-[100px]">Estoque</TableHead>
                            <TableHead className="text-center w-[120px]">Fil. Transf.</TableHead>
                            <TableHead className="text-right w-[100px]">Est. Transf.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dept.produtos.map((produto, idx) => (
                            <TableRow key={`${produto.produto_id}-${produto.filial_id || idx}`}>
                              <TableCell className="font-mono text-sm">
                                {produto.produto_id}
                              </TableCell>
                              {todasFiliais && (
                                <TableCell className="text-sm">
                                  <span className="font-medium text-primary">
                                    {produto.filial_nome || `Filial ${produto.filial_id}`}
                                  </span>
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="truncate" title={produto.produto_descricao}>
                                  {produto.produto_descricao}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={
                                    produto.curva_lucro === 'A'
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : produto.curva_lucro === 'B'
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                      : ''
                                  }
                                  variant={
                                    produto.curva_lucro === 'A' || produto.curva_lucro === 'B'
                                      ? 'default'
                                      : 'outline'
                                  }
                                >
                                  {produto.curva_lucro || '-'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={
                                    produto.curva_venda === 'A'
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : produto.curva_venda === 'B'
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                      : ''
                                  }
                                  variant={
                                    produto.curva_venda === 'A' || produto.curva_venda === 'B'
                                      ? 'default'
                                      : 'outline'
                                  }
                                >
                                  {produto.curva_venda}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  produto.estoque_atual <= 0 ? 'text-destructive' : ''
                                }`}
                              >
                                {formatNumber(produto.estoque_atual)}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {produto.filial_transfer_nome ? (
                                  <span className="text-primary font-medium">
                                    {produto.filial_transfer_nome}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {produto.estoque_transfer && produto.estoque_transfer > 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-semibold">
                                    {formatNumber(produto.estoque_transfer)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {/* Paginação */}
              {data.total_pages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {data.page} de {data.total_pages} • {data.total_records} produtos
                  </p>
                  <div className="flex justify-end">
                    <Pagination className="mx-0 w-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            aria-disabled={data.page === 1 || loading}
                            className={data.page === 1 || loading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {/* Sempre mostrar primeiras páginas */}
                        {[...Array(Math.min(data.total_pages, 5))].map((_, i) => {
                          const pageNum = i + 1
                          // Mostrar: 1, 2, 3 quando na página 1-3
                          // Mostrar: página atual e vizinhas
                          const showPage = 
                            pageNum === 1 || 
                            pageNum === data.total_pages ||
                            Math.abs(pageNum - data.page) <= 1
                          
                          if (!showPage) return null
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink 
                                onClick={() => setPage(pageNum)}
                                isActive={pageNum === data.page}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                            aria-disabled={data.page === data.total_pages || loading}
                            className={data.page === data.total_pages || loading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
