'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MultiSelect } from '@/components/ui/multi-select'
import { DashboardFilter, type FilterType } from '@/components/dashboard/dashboard-filter'
import { EmptyState } from '@/components/despesas/empty-state'

type SalesType = 'complete' | 'pdv' | 'faturamento'

type Row = {
  filial_id: number
  valor_total: number
  ticket_medio: number
  custo_total: number
  total_lucro: number
  margem_lucro: number
  total_entradas: number
  total_cupons: number
  total_sku: number
  pa_valor_total: number
  pa_ticket_medio: number
  pa_custo_total: number
  pa_total_lucro: number
  pa_margem_lucro: number
}

type SortColumn =
  | 'filial_id'
  | 'valor_total'
  | 'ticket_medio'
  | 'custo_total'
  | 'total_lucro'
  | 'margem_lucro'
  | 'total_entradas'
  | 'total_cupons'
  | 'total_sku'

const MOCK_ROWS: Row[] = [
  {
    filial_id: 101,
    valor_total: 180000,
    ticket_medio: 52.2,
    custo_total: 98000,
    total_lucro: 82000,
    margem_lucro: 45.6,
    total_entradas: 12450,
    total_cupons: 3400,
    total_sku: 780,
    pa_valor_total: 170000,
    pa_ticket_medio: 49.4,
    pa_custo_total: 101000,
    pa_total_lucro: 69000,
    pa_margem_lucro: 40.6,
  },
  {
    filial_id: 205,
    valor_total: 142000,
    ticket_medio: 48.7,
    custo_total: 82000,
    total_lucro: 60000,
    margem_lucro: 42.3,
    total_entradas: 9800,
    total_cupons: 2900,
    total_sku: 640,
    pa_valor_total: 150000,
    pa_ticket_medio: 51.2,
    pa_custo_total: 87000,
    pa_total_lucro: 63000,
    pa_margem_lucro: 42.0,
  },
]

const MOCK_FILIAIS = [
  { value: '101', label: 'Filial 101 - Centro' },
  { value: '205', label: 'Filial 205 - Norte' },
  { value: '309', label: 'Filial 309 - Sul' },
]

export default function ModuleStarterTemplate() {
  const [salesType, setSalesType] = useState<SalesType>('complete')
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState(MOCK_FILIAIS)
  const [periodo, setPeriodo] = useState<{ inicio: Date; fim: Date; tipo: FilterType } | null>(null)

  const [sortColumn, setSortColumn] = useState<SortColumn>('filial_id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortColumn(column)
    setSortDirection('asc')
  }

  const sortedRows = useMemo(() => {
    const sorted = [...MOCK_ROWS].sort((a, b) => {
      const aValue = a[sortColumn] ?? 0
      const bValue = b[sortColumn] ?? 0
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })
    return sorted
  }, [sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />
    return sortDirection === 'asc'
      ? <ChevronUp className="ml-1 h-3 w-3 inline" />
      : <ChevronDown className="ml-1 h-3 w-3 inline" />
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6" />
          Novo Modulo
        </h1>
        <p className="text-sm text-muted-foreground">
          Descricao curta do modulo e do objetivo principal.
        </p>
      </div>

      {/* Filters Bar (Dashboard 360 style) */}
      <div className="rounded-md border p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
          <div className="flex flex-col gap-2 w-full lg:w-[600px]">
            <Label>Filiais</Label>
            <div className="h-10">
              <MultiSelect
                options={MOCK_FILIAIS}
                value={filiaisSelecionadas}
                onValueChange={setFiliaisSelecionadas}
                placeholder="Selecione..."
                className="w-full h-10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label>Tipo de Venda</Label>
            <div className="h-10">
              <Select value={salesType} onValueChange={(value: SalesType) => setSalesType(value)}>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Completo</SelectItem>
                  <SelectItem value="pdv">Venda PDV</SelectItem>
                  <SelectItem value="faturamento">Venda Faturamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DashboardFilter
            onPeriodChange={(inicio, fim, tipo) => setPeriodo({ inicio, fim, tipo })}
          />
        </div>
      </div>

      {/* Actions / Toasts */}
      <Card>
        <CardHeader>
          <CardTitle>Acoes rapidas</CardTitle>
          <CardDescription>Exemplo de toasts no padrao Metas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => toast.success('Operacao concluida', { description: 'Dados atualizados com sucesso.' })}
          >
            Toast sucesso
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error('Erro ao processar', { description: 'Verifique os dados e tente novamente.' })}
          >
            Toast erro
          </Button>
          <Button
            variant="outline"
            onClick={() => toast('Info', { description: periodo ? `Filtro: ${periodo.tipo}` : 'Sem filtro aplicado' })}
          >
            Toast info
          </Button>
        </CardContent>
      </Card>

      {/* Data Table (Vendas por Filial style) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Vendas por Filial</CardTitle>
            <CardDescription>Exemplo de tabela padrao do Dashboard 360.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {sortedRows.length === 0 ? (
            <EmptyState type="no-data" />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent" onClick={() => handleSort('filial_id')}>
                        Filial
                        <SortIcon column="filial_id" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('valor_total')}>
                        Receita Bruta
                        <SortIcon column="valor_total" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('ticket_medio')}>
                        Ticket Medio
                        <SortIcon column="ticket_medio" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('custo_total')}>
                        Custo
                        <SortIcon column="custo_total" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('total_lucro')}>
                        Lucro Bruto
                        <SortIcon column="total_lucro" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('margem_lucro')}>
                        Margem Bruta
                        <SortIcon column="margem_lucro" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('total_entradas')}>
                        Entradas
                        <SortIcon column="total_entradas" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('total_cupons')}>
                        Cupons
                        <SortIcon column="total_cupons" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent ml-auto" onClick={() => handleSort('total_sku')}>
                        SKU
                        <SortIcon column="total_sku" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row) => {
                    const deltaReceita = row.pa_valor_total > 0
                      ? ((row.valor_total - row.pa_valor_total) / row.pa_valor_total) * 100
                      : 0
                    return (
                      <TableRow key={row.filial_id}>
                        <TableCell className="font-medium">{row.filial_id}</TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(row.valor_total)}</div>
                          <div className={`flex items-center justify-end gap-1 text-xs ${deltaReceita >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {deltaReceita >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            <span>{deltaReceita >= 0 ? '+' : ''}{deltaReceita.toFixed(2)}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(row.pa_valor_total)}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.ticket_medio)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_lucro)}</TableCell>
                        <TableCell className="text-right">{row.margem_lucro.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{row.total_entradas}</TableCell>
                        <TableCell className="text-right">{row.total_cupons}</TableCell>
                        <TableCell className="text-right">{row.total_sku}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
