'use client'

// Relatório de Venda por Curva ABC - MultiSelect de filiais sem opção "Todas"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { ChevronDown, ChevronRight, TrendingUp, DollarSign, FileDown } from 'lucide-react'
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
  valor_vendas: number
  valor_lucro: number
  percentual_lucro: number
  curva_venda: string
  curva_lucro: string
}

interface DeptNivel1 {
  dept1_id: number
  dept_nivel1: string
  total_vendas: number
  total_lucro: number
  margem: number
  produtos: Produto[]
}

interface DeptNivel2 {
  dept2_id: number
  dept_nivel2: string
  total_vendas: number
  total_lucro: number
  margem: number
  nivel1: DeptNivel1[]
}

interface DeptNivel3 {
  dept3_id: number
  dept_nivel3: string
  total_vendas: number
  total_lucro: number
  margem: number
  nivel2: DeptNivel2[]
}

interface ReportData {
  total_records: number
  page: number
  page_size: number
  total_pages: number
  hierarquia: DeptNivel3[]
}

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

  // Estados de expansão
  const [expandedDept1, setExpandedDept1] = useState<Record<string, boolean>>({})
  const [expandedDept2, setExpandedDept2] = useState<Record<string, boolean>>({})
  const [expandedDept3, setExpandedDept3] = useState<Record<string, boolean>>({})

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
  }, [mes, ano, filiaisSelecionadas])

  // Carregar dados quando a página mudar
  useEffect(() => {
    if (currentTenant?.supabase_schema && filiaisSelecionadas.length > 0 && page > 1) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

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
        page_size: '10000'
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
      })

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

      // Preparar dados da tabela - estrutura hierárquica achatada
      const tableData: (string | number | { content: string; colSpan: number; styles: { fillColor: number[]; fontStyle: string; textColor?: number[] } })[][] = []

      allData.hierarquia?.forEach((dept3: DeptNivel3) => {
        // Departamento Nível 3 (header principal)
        tableData.push([
          {
            content: `${dept3.dept_nivel3} - Vendas: ${formatCurrency(dept3.total_vendas)} | Lucro: ${formatCurrency(dept3.total_lucro)} | Margem: ${dept3.margem.toFixed(2)}%`,
            colSpan: 9,
            styles: {
              fillColor: [59, 130, 246],
              fontStyle: 'bold',
              textColor: [255, 255, 255]
            }
          }
        ])

        dept3.nivel2?.forEach((dept2: DeptNivel2) => {
          // Departamento Nível 2 (sub-header)
          tableData.push([
            {
              content: `  ${dept2.dept_nivel2} - Vendas: ${formatCurrency(dept2.total_vendas)} | Lucro: ${formatCurrency(dept2.total_lucro)} | Margem: ${dept2.margem.toFixed(2)}%`,
              colSpan: 9,
              styles: {
                fillColor: [200, 220, 240],
                fontStyle: 'bold'
              }
            }
          ])

          dept2.nivel1?.forEach((dept1: DeptNivel1) => {
            // Departamento Nível 1 (grupo)
            tableData.push([
              {
                content: `    ${dept1.dept_nivel1} - Vendas: ${formatCurrency(dept1.total_vendas)} | Lucro: ${formatCurrency(dept1.total_lucro)} | Margem: ${dept1.margem.toFixed(2)}%`,
                colSpan: 9,
                styles: {
                  fillColor: [240, 240, 240],
                  fontStyle: 'bold'
                }
              }
            ])

            // Produtos do departamento nível 1
            dept1.produtos?.forEach((produto: Produto) => {
              tableData.push([
                produto.codigo.toString(),
                produto.descricao.substring(0, 40), // Limitar tamanho
                produto.qtde.toFixed(2),
                formatCurrency(produto.valor_vendas),
                produto.curva_venda,
                formatCurrency(produto.valor_lucro),
                produto.percentual_lucro.toFixed(2) + '%',
                produto.curva_lucro,
                produto.filial_id.toString()
              ])
            })
          })
        })
      })

      // Cabeçalhos da tabela
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

      // Estilos de coluna
      const columnStyles: Record<number, { cellWidth?: number; halign?: 'center' | 'right' | 'left' }> = {
        0: { cellWidth: 20 }, // Código
        1: { cellWidth: 70 }, // Descrição
        2: { cellWidth: 20, halign: 'right' }, // Qtde
        3: { cellWidth: 30, halign: 'right' }, // Valor Vendas
        4: { cellWidth: 20, halign: 'center' }, // Curva Venda
        5: { cellWidth: 30, halign: 'right' }, // Valor Lucro
        6: { cellWidth: 20, halign: 'right' }, // % Lucro
        7: { cellWidth: 20, halign: 'center' }, // Curva Lucro
        8: { cellWidth: 15, halign: 'center' }, // Filial
      }

      // Gerar tabela
      /* eslint-disable @typescript-eslint/no-explicit-any */
      autoTable(doc as any, {
        head: [headers],
        body: tableData as any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        startY: 45,
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
        margin: { top: 45, left: 10, right: 10 },
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

  // Renderizar produtos
  const renderProdutos = (produtos: Produto[]) => {
    return (
      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="text-xs">Filial</TableHead>
            <TableHead className="text-xs">Código</TableHead>
            <TableHead className="text-xs">Descrição</TableHead>
            <TableHead className="text-right text-xs">Qtde</TableHead>
            <TableHead className="text-right text-xs">Valor Venda</TableHead>
            <TableHead className="text-xs">Curva Venda</TableHead>
            <TableHead className="text-right text-xs">Valor Lucro</TableHead>
            <TableHead className="text-right text-xs">% Lucro</TableHead>
            <TableHead className="text-xs">Curva Lucro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto, idx) => (
            <TableRow key={`${produto.codigo}-${produto.filial_id}-${idx}`} className="border-b">
              <TableCell className="text-xs">{produto.filial_id}</TableCell>
              <TableCell className="text-xs">{produto.codigo}</TableCell>
              <TableCell className="text-xs">{produto.descricao}</TableCell>
              <TableCell className="text-right text-xs">{produto.qtde.toFixed(2)}</TableCell>
              <TableCell className="text-right text-xs">{formatCurrency(produto.valor_vendas)}</TableCell>
              <TableCell>
                <Badge className={getCurvaBadgeColor(produto.curva_venda)}>
                  {produto.curva_venda}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs">{formatCurrency(produto.valor_lucro)}</TableCell>
              <TableCell className="text-right text-xs">{produto.percentual_lucro.toFixed(2)}%</TableCell>
              <TableCell>
                <Badge className={getCurvaBadgeColor(produto.curva_lucro)}>
                  {produto.curva_lucro}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Funções auxiliares
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getCurvaBadgeColor = (curva: string) => {
    switch (curva) {
      case 'A':
        return 'bg-green-500 hover:bg-green-600'
      case 'B':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'C':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'D':
        return 'bg-red-500 hover:bg-red-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
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

  const anos = Array.from({ length: 5 }, (_, i) => {
    const year = currentDate.getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  // Continua na próxima parte...
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatório de Venda por Curva</h2>
          <p className="text-muted-foreground">
            Análise de vendas agrupada por departamentos e curva ABC
          </p>
        </div>
        
        {/* Botão de Exportar */}
        {data && data.hierarquia && data.hierarquia.length > 0 && (
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vendas por Departamento e Curva
              </CardTitle>
              <CardDescription>
                Total de {data.total_records} departamentos nível 3 encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.hierarquia.map((dept3) => (
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
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Lucro</div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(dept3.total_lucro)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Margem</div>
                            <div className="font-semibold text-sm">{dept3.margem.toFixed(2)}%</div>
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
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Lucro</div>
                                      <div className="font-medium text-xs">
                                        {formatCurrency(dept2.total_lucro)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Margem</div>
                                      <div className="font-medium text-xs">{dept2.margem.toFixed(2)}%</div>
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
                                              </div>
                                              <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">Lucro</div>
                                                <div className="font-medium text-xs">
                                                  {formatCurrency(dept1.total_lucro)}
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">Margem</div>
                                                <div className="font-medium text-xs">{dept1.margem.toFixed(2)}%</div>
                                              </div>
                                            </div>
                                          </CollapsibleTrigger>

                                          <CollapsibleContent>
                                            <div className="border-t">
                                              {dept1.produtos && dept1.produtos.length > 0 && renderProdutos(dept1.produtos)}
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
