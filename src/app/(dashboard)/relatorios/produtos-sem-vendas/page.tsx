'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { MultiSelect } from '@/components/ui/multi-select'
import { DepartmentFilterPopover, SectorFilterPopover } from '@/components/filters'
import { ChartCandlestick, FileDown, Loader2 } from 'lucide-react'
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
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Tipos para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
    autoTable: (options: Record<string, unknown>) => jsPDF
  }
}

interface ProdutoSemVenda {
  filial_id: number
  produto_id: number
  descricao: string
  estoque_atual: number
  data_ultima_venda: string | null
  preco_custo: number
  curva_abcd: string | null
  curva_lucro: string | null
  dias_sem_venda: number
  total_count?: number
}

interface ApiResponse {
  data: ProdutoSemVenda[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

// Opções de curvas
const curvasOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'A', label: 'Curva A' },
  { value: 'B', label: 'Curva B' },
  { value: 'C', label: 'Curva C' },
  { value: 'D', label: 'Curva D' },
]

export default function ProdutosSemVendasPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { branchOptions: branches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false,
  })

  // Estados de filtros
  const [selectedBranches, setSelectedBranches] = useState<Array<{ value: string; label: string }>>([])
  const [diasSemVendasMin, setDiasSemVendasMin] = useState<number>(15)
  const [diasSemVendasMax, setDiasSemVendasMax] = useState<number>(90)
  const [curvaAbc, setCurvaAbc] = useState<string>('all')
  const [filtroTipo, setFiltroTipo] = useState<string>('all')
  const [departamentosSelecionados, setDepartamentosSelecionados] = useState<number[]>([])
  const [setoresSelecionados, setSetoresSelecionados] = useState<number[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<number[]>([])

  // Estados de dados
  const [produtos, setProdutos] = useState<ProdutoSemVenda[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(100)
  const [departamentos, setDepartamentos] = useState<Array<{ id: number; departamento_id: number; descricao: string }>>([])
  const [setores, setSetores] = useState<Array<{ id: number; nome: string; departamento_nivel: number; departamento_ids: number[]; ativo: boolean }>>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [defaultFilialSet, setDefaultFilialSet] = useState(false)

  // Auto-selecionar primeira filial quando opções estiverem disponíveis
  useEffect(() => {
    if (branches.length > 0 && !defaultFilialSet) {
      // Ordena filiais por ID (numérico) e pega a menor
      const sortedFiliais = [...branches].sort((a, b) => {
        const idA = parseInt(a.value)
        const idB = parseInt(b.value)
        return idA - idB
      })
      console.log('✅ [Auto-select] Selecionando primeira filial:', sortedFiliais[0])
      setSelectedBranches([sortedFiliais[0]])
      setDefaultFilialSet(true)
    }
  }, [branches, defaultFilialSet])

  // Auto-load: Executar busca quando filtros estiverem prontos (APENAS PRIMEIRA VEZ)
  useEffect(() => {
    if (currentTenant?.supabase_schema && selectedBranches.length > 0 && !loading && defaultFilialSet) {
      console.log('✅ [Auto-load] Executando primeira busca automaticamente')
      fetchData(1)
    }
  }, [currentTenant, selectedBranches, defaultFilialSet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar departamentos e setores
  useEffect(() => {
    if (!currentTenant?.supabase_schema) return

    const loadData = async () => {
      const supabase = createClient()

      // Buscar departamentos
      const { data: deptData } = await supabase
        .schema(currentTenant.supabase_schema as 'public')
        .from('departments_level_1')
        .select('id, departamento_id, descricao')
        .order('descricao')

      if (deptData) {
        setDepartamentos(deptData)
      }

      // Buscar setores
      const { data: setoresData } = await supabase
        .schema(currentTenant.supabase_schema as 'public')
        .from('setores')
        .select('id, nome, departamento_nivel, departamento_ids, ativo')
        .eq('ativo', true)
        .order('nome')

      if (setoresData) {
        setSetores(setoresData)
      }
    }

    loadData()
  }, [currentTenant])

  // Buscar dados
  const fetchData = async (page: number = 1) => {
    if (!currentTenant?.supabase_schema) return

    setLoading(true)
    setCurrentPage(page)
    
    try {
      const filiaisParam = selectedBranches.length === 0
        ? 'all'
        : selectedBranches.map(b => b.value).join(',')

      let departamentoIds = null
      if (filtroTipo === 'departamento' && departamentosSelecionados.length > 0) {
        departamentoIds = departamentosSelecionados.join(',')
      } else if (filtroTipo === 'setor' && setoresSelecionados.length > 0) {
        departamentoIds = setoresSelecionados.join(',')
      }

      const produtoIds = filtroTipo === 'produto' && produtosSelecionados.length > 0
        ? produtosSelecionados.join(',')
        : null

      const offset = (page - 1) * pageSize

      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        filiais: filiaisParam,
        dias_sem_vendas_min: diasSemVendasMin.toString(),
        dias_sem_vendas_max: diasSemVendasMax.toString(),
        data_referencia: new Date().toISOString().split('T')[0],
        curva_abc: curvaAbc,
        filtro_tipo: filtroTipo,
        limit: pageSize.toString(),
        offset: offset.toString()
      })

      if (departamentoIds) params.append('departamento_ids', departamentoIds)
      if (produtoIds) params.append('produto_ids', produtoIds)

      const response = await fetch(`/api/relatorios/produtos-sem-vendas?${params}`)
      const result: ApiResponse = await response.json()

      if (response.ok) {
        setProdutos(result.data)
        setTotalCount(result.pagination.total)
      } else {
        console.error('Erro ao buscar produtos:', {
          status: response.status,
          statusText: response.statusText,
          error: result
        })
        alert(`Erro ao buscar produtos: ${'message' in result ? result.message : 'error' in result ? result.error : 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      alert('Erro ao buscar produtos. Verifique o console para mais detalhes.')
    } finally {
      setLoading(false)
    }
  }

  // Exportar para PDF (busca TODOS os dados)
  const exportToPDF = async () => {
    if (!currentTenant?.supabase_schema) return
    
    setExporting(true)
    try {
      // Buscar TODOS os dados para exportação
      const filiaisParam = selectedBranches.length === 0
        ? 'all'
        : selectedBranches.map(b => b.value).join(',')

      let departamentoIds = null
      if (filtroTipo === 'departamento' && departamentosSelecionados.length > 0) {
        departamentoIds = departamentosSelecionados.join(',')
      } else if (filtroTipo === 'setor' && setoresSelecionados.length > 0) {
        departamentoIds = setoresSelecionados.join(',')
      }

      const produtoIds = filtroTipo === 'produto' && produtosSelecionados.length > 0
        ? produtosSelecionados.join(',')
        : null

      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        filiais: filiaisParam,
        dias_sem_vendas_min: diasSemVendasMin.toString(),
        dias_sem_vendas_max: diasSemVendasMax.toString(),
        data_referencia: new Date().toISOString().split('T')[0],
        curva_abc: curvaAbc,
        filtro_tipo: filtroTipo,
        limit: '10000', // Máximo para exportação
        offset: '0'
      })

      if (departamentoIds) params.append('departamento_ids', departamentoIds)
      if (produtoIds) params.append('produto_ids', produtoIds)

      const response = await fetch(`/api/relatorios/produtos-sem-vendas?${params}`)
      const result: ApiResponse = await response.json()

      if (!response.ok) {
        alert('Erro ao buscar dados para exportação')
        return
      }

      const allProdutos = result.data

      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Título
      doc.setFontSize(16)
      doc.text('Produtos sem vendas', 14, 15)

      // Subtítulo
      doc.setFontSize(10)
      doc.text(`Dias sem vendas: ${diasSemVendasMin} a ${diasSemVendasMax} dias | Curva: ${curvaAbc === 'all' ? 'Todas' : curvaAbc}`, 14, 22)
      doc.text(`Total: ${allProdutos.length} produtos | Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 27)

      // Tabela
      const tableData = allProdutos.map(p => [
        getFilialNome(p.filial_id),
        p.produto_id,
        p.descricao,
        p.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        p.data_ultima_venda ? format(new Date(p.data_ultima_venda), 'dd/MM/yyyy') : '-',
        `R$ ${p.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        p.curva_abcd || '-',
        p.curva_lucro || '-',
        p.dias_sem_venda
      ])

      doc.autoTable({
        startY: 32,
        head: [[
          'Filial', 'Código', 'Descrição', 'Estoque', 
          'Últ. Venda', 'Custo', 
          'Curva Venda', 'Curva Lucro', 'Dias'
        ]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      doc.save(`produtos-sem-vendas-${diasSemVendasMin}-${diasSemVendasMax}d-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar PDF')
    } finally {
      setExporting(false)
    }
  }

  // Helper para obter nome da filial
  const getFilialNome = (filialId: number): string => {
    const filial = branches.find(f => parseInt(f.value) === filialId)
    return filial ? filial.label : filialId.toString()
  }

  // Log de acesso
  useEffect(() => {
    const logAccess = async () => {
      if (!currentTenant || !userProfile) return
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      await logModuleAccess({
        module: 'relatorios',
        subModule: 'produtos_sem_vendas',
        tenantId: currentTenant.id,
        userName: userProfile.full_name || 'Unknown',
        userEmail: user?.email || 'Unknown',
        action: 'access',
        metadata: { 
          dias_sem_vendas_min: diasSemVendasMin, 
          dias_sem_vendas_max: diasSemVendasMax, 
          curva_abc: curvaAbc 
        }
      })
    }
    logAccess()
  }, [currentTenant, userProfile, diasSemVendasMin, diasSemVendasMax, curvaAbc])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <ChartCandlestick className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos sem vendas a X dias</h1>
            <p className="text-sm text-muted-foreground">
              Produtos sem movimentação de vendas no período definido
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Configure os parâmetros para buscar produtos sem vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linha 1: Filiais, Dias MIN, Dias MAX, Curva ABC */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filiais */}
            <div className="space-y-2">
              <Label>Filiais</Label>
              <MultiSelect
                options={branches}
                value={selectedBranches}
                onValueChange={setSelectedBranches}
                placeholder="Todas as filiais"
              />
            </div>

            {/* Dias sem vendas - RANGE */}
            <div className="space-y-2">
              <Label htmlFor="dias-min">Dias sem vendas (Mínimo)</Label>
              <Input
                id="dias-min"
                type="number"
                min="1"
                value={diasSemVendasMin}
                onChange={(e) => setDiasSemVendasMin(parseInt(e.target.value) || 15)}
                className="h-10"
                placeholder="Ex: 15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias-max">Dias sem vendas (Máximo)</Label>
              <Input
                id="dias-max"
                type="number"
                min="1"
                value={diasSemVendasMax}
                onChange={(e) => setDiasSemVendasMax(parseInt(e.target.value) || 90)}
                className="h-10"
                placeholder="Ex: 90"
              />
            </div>

            {/* Curva ABC */}
            <div className="space-y-2">
              <Label htmlFor="curva-abc">Curva de Vendas</Label>
              <Select value={curvaAbc} onValueChange={setCurvaAbc}>
                <SelectTrigger id="curva-abc" className="h-10">
                  <SelectValue placeholder="Selecione a curva" />
                </SelectTrigger>
                <SelectContent>
                  {curvasOptions.map((curva) => (
                    <SelectItem key={curva.value} value={curva.value}>
                      {curva.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Filtro tipo + filtro específico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtrar por */}
            <div className="space-y-2">
              <Label htmlFor="filtro-tipo">Filtrar por</Label>
              <Select value={filtroTipo} onValueChange={(value) => {
                setFiltroTipo(value)
                setDepartamentosSelecionados([])
                setSetoresSelecionados([])
                setProdutosSelecionados([])
              }}>
                <SelectTrigger id="filtro-tipo" className="h-10">
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  <SelectItem value="departamento">Departamentos</SelectItem>
                  <SelectItem value="setor">Setores</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro específico dinâmico */}
            <div className="space-y-2">
              <Label>
                {filtroTipo === 'departamento' && 'Departamentos'}
                {filtroTipo === 'setor' && 'Setores'}
                {filtroTipo === 'produto' && 'Produtos'}
                {filtroTipo === 'all' && 'Filtro específico'}
              </Label>
              {filtroTipo === 'departamento' && (
                <DepartmentFilterPopover
                  departamentos={departamentos}
                  selectedIds={departamentosSelecionados}
                  onChange={setDepartamentosSelecionados}
                />
              )}
              {filtroTipo === 'setor' && (
                <SectorFilterPopover
                  setores={setores}
                  selectedIds={setoresSelecionados}
                  onChange={setSetoresSelecionados}
                />
              )}
              {filtroTipo === 'produto' && (
                <div className="text-sm text-muted-foreground pt-2">
                  Use a busca abaixo para filtrar produtos
                </div>
              )}
              {filtroTipo === 'all' && (
                <div className="text-sm text-muted-foreground pt-2">
                  Selecione um tipo de filtro
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4">
            <Button onClick={() => fetchData(1)} disabled={loading} className="min-w-[120px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                'Buscar'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={produtos.length === 0 || exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      ) : produtos.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Produtos sem vendas</CardTitle>
                <CardDescription>
                  Mostrando {produtos.length} de {totalCount} produto{totalCount !== 1 ? 's' : ''} (página {currentPage} de {Math.ceil(totalCount / pageSize)})
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {totalCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filial</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="min-w-[300px]">Descrição</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead>Últ. Venda</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-center">Curva Venda</TableHead>
                    <TableHead className="text-center">Curva Lucro</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={`${produto.filial_id}-${produto.produto_id}-${index}`}>
                      <TableCell className="font-medium">
                        {getFilialNome(produto.filial_id)}
                      </TableCell>
                      <TableCell>{produto.produto_id}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {produto.descricao}
                      </TableCell>
                      <TableCell className="text-right">
                        {produto.estoque_atual.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell>
                        {produto.data_ultima_venda
                          ? format(new Date(produto.data_ultima_venda), 'dd/MM/yyyy')
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {produto.preco_custo.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {produto.curva_abcd ? (
                          <Badge variant={
                            produto.curva_abcd === 'A' ? 'default' :
                            produto.curva_abcd === 'B' ? 'secondary' :
                            'outline'
                          }>
                            {produto.curva_abcd}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {produto.curva_lucro ? (
                          <Badge variant="outline">{produto.curva_lucro}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={produto.dias_sem_venda > 90 ? 'destructive' : 'secondary'}
                        >
                          {produto.dias_sem_venda}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Paginação */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} produtos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Página {currentPage} de {Math.ceil(totalCount / pageSize)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
