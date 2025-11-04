'use client'

import React, { useEffect, useState } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, ChevronDown, ChevronRight, CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { MultiSelect } from '@/components/ui/multi-select'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'

interface Meta {
  id: number
  filial_id: number
  data: string
  dia_semana: string
  meta_percentual: number
  data_referencia: string
  valor_referencia: number
  valor_meta: number
  valor_realizado: number
  diferenca: number
  diferenca_percentual: number
}

interface MetasReport {
  metas: Meta[]
  total_realizado: number
  total_meta: number
  percentual_atingido: number
}

interface GroupedByDate {
  [date: string]: {
    data: string
    dia_semana: string
    metas: Meta[]
    total_valor_referencia: number
    total_meta: number
    total_realizado: number
    total_diferenca: number
    media_meta_percentual: number
    diferenca_percentual: number
  }
}

export default function MetaMensalPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { options: todasAsFiliais, isLoading: isLoadingBranches, branchOptions: branches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant
  })

  const currentDate = new Date()
  const [mes, setMes] = useState(currentDate.getMonth() + 1)
  const [ano, setAno] = useState(currentDate.getFullYear())
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<MetasReport | null>(null)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  // Estados do formulário de criação
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMes, setFormMes] = useState(currentDate.getMonth() + 1)
  const [formAno, setFormAno] = useState(currentDate.getFullYear())
  const [formFilialId, setFormFilialId] = useState<string>('')
  const [formMetaPercentual, setFormMetaPercentual] = useState('')
  const [formDataReferencia, setFormDataReferencia] = useState<Date | undefined>()
  const [generating, setGenerating] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Estados para edição inline
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'percentual' | 'valor' } | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Log audit on mount
  useEffect(() => {
    const logAccess = async () => {
      if (currentTenant && userProfile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        logModuleAccess({
          module: 'metas',
          tenantId: currentTenant.id,
          userName: userProfile.full_name,
          userEmail: user?.email || ''
        })
      }
    }
    
    logAccess()
  }, [currentTenant, userProfile])

  // Ao carregar filiais, selecionar todas por padrão
  useEffect(() => {
    if (!isLoadingBranches && todasAsFiliais.length > 0 && filiaisSelecionadas.length === 0) {
      setFiliaisSelecionadas(todasAsFiliais)
    }
  }, [isLoadingBranches, todasAsFiliais, filiaisSelecionadas.length])

  const loadReport = async () => {
    if (!currentTenant?.supabase_schema) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes: mes.toString(),
        ano: ano.toString()
      })

      // Se nenhuma filial selecionada, buscar todas
      // Se tiver filiais selecionadas, buscar apenas as selecionadas
      if (filiaisSelecionadas.length > 0) {
        // Filtrar "all" e pegar apenas os IDs numéricos das filiais
        const filialIds = filiaisSelecionadas
          .filter(f => f.value !== 'all')
          .map(f => f.value)
          .join(',')
        
        if (filialIds) {
          params.append('filial_id', filialIds)
        }
      }

      const response = await fetch(`/api/metas/report?${params}`)

      if (!response.ok) {
        let errorMessage = 'Erro ao carregar relatório'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }
        console.error('Error response:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[METAS] Report data loaded:', data)
      setReport(data)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros automaticamente quando mudarem
  useEffect(() => {
    if (currentTenant?.supabase_schema && mes && ano) {
      loadReport()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.supabase_schema, mes, ano, filiaisSelecionadas])

  const handleGenerateMetas = async () =>  {
    if (!currentTenant?.supabase_schema) return
    if (!formFilialId || !formMetaPercentual || !formDataReferencia) {
      alert('Preencha todos os campos')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/metas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant.supabase_schema,
          filialId: parseInt(formFilialId),
          mes: formMes,
          ano: formAno,
          metaPercentual: parseFloat(formMetaPercentual),
          dataReferenciaInicial: format(formDataReferencia, 'yyyy-MM-dd')
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message || 'Metas geradas com sucesso')
        setDialogOpen(false)
        loadReport()
      } else {
        alert(`Erro: ${data.error || 'Erro ao gerar metas'}`)
      }
    } catch (error) {
      console.error('Error generating metas:', error)
      alert('Erro ao gerar metas')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateValues = async () => {
    if (!currentTenant?.supabase_schema) return

    setUpdating(true)
    try {
      const response = await fetch('/api/metas/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant.supabase_schema,
          mes,
          ano,
          filial_id: filiaisSelecionadas.length > 0 
            ? filiaisSelecionadas.filter(f => f.value !== 'all').map(f => f.value).join(',') 
            : null
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message || 'Valores atualizados com sucesso')
        loadReport()
      } else {
        alert(`Erro: ${data.error || 'Erro ao atualizar valores'}`)
      }
    } catch (error) {
      console.error('Error updating values:', error)
      alert('Erro ao atualizar valores')
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    if (currentTenant?.supabase_schema) {
      loadReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.supabase_schema])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00%'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Verificar se a data é hoje ou futuro
  const isTodayOrFuture = (dateString: string): boolean => {
    const metaDate = parseISO(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    metaDate.setHours(0, 0, 0, 0)
    return metaDate >= today
  }

  // Verificar se deve mostrar diferença (não mostra se for dia futuro com realizado zero)
  const shouldShowDifference = (meta: Meta): boolean => {
    // Se é hoje ou futuro E realizado é zero, não mostra diferença
    if (isTodayOrFuture(meta.data) && meta.valor_realizado === 0) {
      return false
    }
    return true
  }

  const getFilialLabel = () => {
    if (filiaisSelecionadas.length === 0) {
      return 'Todas as Filiais'
    }
    if (filiaisSelecionadas.length === 1) {
      return filiaisSelecionadas[0].label
    }
    return `${filiaisSelecionadas.length} Filiais`
  }

  const getFilialName = (filial_id: number) => {
    const branch = todasAsFiliais.find(f => f.value === filial_id.toString())
    return branch ? branch.label : `Filial ${filial_id}`
  }

  const toggleDateExpanded = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  const groupMetasByDate = (metas: Meta[]): GroupedByDate => {
    const grouped: GroupedByDate = {}
    
    metas.forEach(meta => {
      const dateKey = meta.data
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          data: meta.data,
          dia_semana: meta.dia_semana,
          metas: [],
          total_valor_referencia: 0,
          total_meta: 0,
          total_realizado: 0,
          total_diferenca: 0,
          media_meta_percentual: 0,
          diferenca_percentual: 0
        }
      }
      
      grouped[dateKey].metas.push(meta)
      grouped[dateKey].total_valor_referencia += meta.valor_referencia || 0
      grouped[dateKey].total_meta += meta.valor_meta || 0
      grouped[dateKey].total_realizado += meta.valor_realizado || 0
      grouped[dateKey].total_diferenca += meta.diferenca || 0
    })
    
    // Calcular média e percentuais
    Object.keys(grouped).forEach(dateKey => {
      const group = grouped[dateKey]
      const numFiliais = group.metas.length
      
      if (numFiliais > 0) {
        group.media_meta_percentual = group.metas.reduce((sum, m) => sum + (m.meta_percentual || 0), 0) / numFiliais
        
        if (group.total_meta > 0) {
          group.diferenca_percentual = ((group.total_realizado - group.total_meta) / group.total_meta) * 100
        }
      }
    })
    
    return grouped
  }

  // Funções de edição inline
  const startEditing = (metaId: number, field: 'percentual' | 'valor', currentValue: number) => {
    setEditingCell({ id: metaId, field })
    setEditingValue(field === 'percentual' ? currentValue.toFixed(2) : currentValue.toFixed(2))
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const saveEdit = async () => {
    if (!editingCell || !currentTenant?.supabase_schema) return

    const newValue = parseFloat(editingValue)
    if (isNaN(newValue)) {
      alert('Valor inválido')
      return
    }

    setSavingEdit(true)

    try {
      const meta = report?.metas.find(m => m.id === editingCell.id)
      if (!meta) return

      let valorMeta: number
      let metaPercentual: number

      if (editingCell.field === 'percentual') {
        // Usuário alterou o percentual
        metaPercentual = newValue
        valorMeta = meta.valor_referencia * (1 + metaPercentual / 100)
      } else {
        // Usuário alterou o valor da meta
        valorMeta = newValue
        metaPercentual = ((valorMeta / meta.valor_referencia) - 1) * 100
      }

      const response = await fetch('/api/metas/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant.supabase_schema,
          metaId: editingCell.id,
          valorMeta,
          metaPercentual
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar meta')
      }

      // Atualizar estado local
      setReport(prev => {
        if (!prev) return prev
        
        const updatedMetas = prev.metas.map(m => {
          if (m.id === editingCell.id) {
            const diferenca = m.valor_realizado - valorMeta
            const diferenca_percentual = valorMeta > 0 ? (diferenca / valorMeta) * 100 : 0
            
            return {
              ...m,
              meta_percentual: metaPercentual,
              valor_meta: valorMeta,
              diferenca,
              diferenca_percentual
            }
          }
          return m
        })

        // Recalcular totais
        const total_meta = updatedMetas.reduce((sum, m) => sum + m.valor_meta, 0)
        const percentual_atingido = total_meta > 0 ? (prev.total_realizado / total_meta) * 100 : 0

        return {
          ...prev,
          metas: updatedMetas,
          total_meta,
          percentual_atingido
        }
      })

      cancelEditing()
    } catch (error) {
      console.error('Error saving edit:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar alteração')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleUpdateValues}
            disabled={updating || loading}
          >
            {updating ? 'Atualizando...' : 'Atualizar Valores'}
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Cadastrar Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Meta Mensal</DialogTitle>
                <DialogDescription>
                  Preencha os dados para gerar as metas do mês. Se já existirem metas para o período, elas serão substituídas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-medium">ℹ️ Atenção:</p>
                  <p className="mt-1">Ao gerar metas para um período já cadastrado, as metas anteriores serão substituídas pelos novos valores.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-mes">Mês</Label>
                    <Select value={formMes.toString()} onValueChange={(v) => setFormMes(parseInt(v))}>
                      <SelectTrigger id="form-mes">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {format(new Date(2024, m - 1, 1), 'MMMM', { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-ano">Ano</Label>
                    <Select value={formAno.toString()} onValueChange={(v) => setFormAno(parseInt(v))}>
                      <SelectTrigger id="form-ano">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-filial">Filial</Label>
                  <Select value={formFilialId} onValueChange={setFormFilialId}>
                    <SelectTrigger id="form-filial">
                      <SelectValue placeholder="Selecione a filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.value} value={branch.value}>
                          {branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-meta">Meta (%)</Label>
                  <Input
                    id="form-meta"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10"
                    value={formMetaPercentual}
                    onChange={(e) => setFormMetaPercentual(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-data-ref">Data de Referência Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formDataReferencia && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formDataReferencia ? format(formDataReferencia, "dd/MM/yyyy") : <span>Selecione...</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={formDataReferencia} 
                        onSelect={setFormDataReferencia}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button 
                  onClick={handleGenerateMetas} 
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? 'Gerando...' : 'Gerar Metas'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 rounded-md border p-4 lg:flex-row lg:items-end lg:gap-6">
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

        {/* MÊS */}
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Label>Mês</Label>
          <div className="h-10">
            <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {format(new Date(2024, m - 1, 1), 'MMMM', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ANO */}
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Label>Ano</Label>
          <div className="h-10">
            <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
              <SelectTrigger className="w-full sm:w-[120px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="relative">
            <div className="absolute top-6 right-6">
              <div className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {getFilialLabel()}
              </div>
            </div>
            <CardTitle>Vendas do Período</CardTitle>
            <CardDescription>
              {format(new Date(ano, mes - 1, 1), 'MMMM yyyy', { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{formatCurrency(report?.total_realizado || 0)}</div>
              <div className="text-sm text-muted-foreground">
                Meta: {formatCurrency(report?.total_meta || 0)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {(report?.percentual_atingido || 0) >= 100 ? (
                  <>
                    <ArrowUpIcon className="h-4 w-4 text-green-500" />
                    <span className="text-green-500 font-medium">
                      {formatPercentage((report?.percentual_atingido || 0) - 100)}
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                    <span className="text-red-500 font-medium">
                      {formatPercentage((report?.percentual_atingido || 0) - 100)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="relative">
            <div className="absolute top-6 right-6">
              <div className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {getFilialLabel()}
              </div>
            </div>
            <CardTitle>Progresso da Meta</CardTitle>
            <CardDescription>Percentual atingido até o momento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <svg className="h-32 w-32 -rotate-90 transform">
                    <circle
                      className="text-muted"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className={`${(report?.percentual_atingido || 0) >= 100 ? 'text-green-500' : 'text-primary'}`}
                      strokeWidth="10"
                      strokeDasharray={`${((report?.percentual_atingido || 0) / 100) * 351.86} 351.86`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="56"
                      cx="64"
                      cy="64"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {(report?.percentual_atingido || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de metas */}
      <Card>
        <CardHeader className="relative">
          <div className="absolute top-6 right-6">
            <div className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {getFilialLabel()}
            </div>
          </div>
          <CardTitle>Metas Diárias</CardTitle>
          <CardDescription>Acompanhamento detalhado por dia</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : report?.metas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma meta cadastrada para este período
            </div>
          ) : filiaisSelecionadas.length !== 1 ? (
            // Visualização agrupada por data quando múltiplas ou nenhuma filial está selecionada
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Dia da Semana</TableHead>
                    <TableHead className="text-right">Venda Ref.</TableHead>
                    <TableHead className="text-right">Meta %</TableHead>
                    <TableHead className="text-right">Valor Meta</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Dif. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    groupMetasByDate(
                      report?.metas
                        .filter((meta) => {
                          const [year, month] = meta.data.split('-').map(Number)
                          return month === mes && year === ano
                        })
                        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) || []
                    )
                  ).map(([dateKey, group]) => {
                    const isExpanded = expandedDates[dateKey] === true // Fechado por padrão
                    const diferencaValor = group.total_diferenca || 0
                    const diferencaPerc = group.diferenca_percentual || 0
                    
                    // Verificar se deve mostrar diferença (não mostrar se for dia futuro com realizado zero)
                    const isDateFuture = isTodayOrFuture(dateKey)
                    const hasNoSales = group.total_realizado === 0
                    const showDifference = !(isDateFuture && hasNoSales)
                    
                    return (
                      <React.Fragment key={dateKey}>
                        {/* Linha agregada principal */}
                        <TableRow 
                          className="bg-muted/50 hover:bg-muted/70 cursor-pointer font-medium"
                          onClick={() => toggleDateExpanded(dateKey)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {format(parseISO(group.data), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {group.metas[0]?.dia_semana || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(group.total_valor_referencia)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {group.media_meta_percentual.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(group.total_meta)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(group.total_realizado)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {showDifference ? (
                              <span className={diferencaValor === 0 ? '' : diferencaValor > 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatCurrency(diferencaValor)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {showDifference ? (
                              <span className={diferencaPerc === 0 ? '' : diferencaPerc > 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatPercentage(diferencaPerc)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                        
                        {/* Linhas detalhadas por filial */}
                        {isExpanded && group.metas.map((meta) => {
                          const metaDiferencaValor = meta.diferenca || 0
                          const metaDiferencaPerc = meta.diferenca_percentual || 0
                          const isEditingPercentual = editingCell?.id === meta.id && editingCell?.field === 'percentual'
                          const isEditingValor = editingCell?.id === meta.id && editingCell?.field === 'valor'
                          const showMetaDifference = shouldShowDifference(meta)
                          
                          return (
                            <TableRow 
                              key={`${dateKey}-${meta.filial_id}`}
                              className="bg-background/50"
                            >
                              <TableCell></TableCell>
                              <TableCell className="pl-8 text-sm">
                                <span className="font-medium">{getFilialName(meta.filial_id)}</span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                Ref: {meta.data_referencia ? format(parseISO(meta.data_referencia), 'dd/MM/yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(meta.valor_referencia)}
                              </TableCell>
                              
                              {/* Meta % - Editável */}
                              <TableCell 
                                className="text-right text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                                onDoubleClick={() => startEditing(meta.id, 'percentual', meta.meta_percentual)}
                                title="Duplo clique para editar"
                              >
                                {isEditingPercentual ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={saveEdit}
                                    autoFocus
                                    disabled={savingEdit}
                                    className="h-8 text-right"
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    {meta.meta_percentual.toFixed(2)}%
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏️</span>
                                  </span>
                                )}
                              </TableCell>
                              
                              {/* Valor Meta - Editável */}
                              <TableCell 
                                className="text-right text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                                onDoubleClick={() => startEditing(meta.id, 'valor', meta.valor_meta)}
                                title="Duplo clique para editar"
                              >
                                {isEditingValor ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={saveEdit}
                                    autoFocus
                                    disabled={savingEdit}
                                    className="h-8 text-right"
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    {formatCurrency(meta.valor_meta)}
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏️</span>
                                  </span>
                                )}
                              </TableCell>
                              
                              <TableCell className="text-right text-sm">
                                {formatCurrency(meta.valor_realizado)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {showMetaDifference ? (
                                  <span className={metaDiferencaValor === 0 ? '' : metaDiferencaValor > 0 ? 'text-green-500' : 'text-red-500'}>
                                    {formatCurrency(metaDiferencaValor)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {showMetaDifference ? (
                                  <span className={metaDiferencaPerc === 0 ? '' : metaDiferencaPerc > 0 ? 'text-green-500' : 'text-red-500'}>
                                    {formatPercentage(metaDiferencaPerc)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            // Visualização normal para filial específica
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Dia da Semana</TableHead>
                    <TableHead>Data Ref.</TableHead>
                    <TableHead className="text-right">Venda Ref.</TableHead>
                    <TableHead className="text-right">Meta %</TableHead>
                    <TableHead className="text-right">Valor Meta</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Dif. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.metas
                    .filter((meta) => {
                      const metaDate = new Date(meta.data)
                      return metaDate.getMonth() + 1 === mes && metaDate.getFullYear() === ano
                    })
                    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                    .map((meta) => {
                      const diferencaValor = meta.diferenca || 0
                      const diferencaPerc = meta.diferenca_percentual || 0
                      const isEditingPercentual = editingCell?.id === meta.id && editingCell?.field === 'percentual'
                      const isEditingValor = editingCell?.id === meta.id && editingCell?.field === 'valor'
                      const showDiff = shouldShowDifference(meta)
                      
                      return (
                        <TableRow key={meta.id}>
                          <TableCell>
                            {format(parseISO(meta.data), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{meta.dia_semana}</TableCell>
                          <TableCell>
                            {meta.data_referencia ? format(parseISO(meta.data_referencia), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(meta.valor_referencia)}
                          </TableCell>
                          
                          {/* Meta % - Editável */}
                          <TableCell 
                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                            onDoubleClick={() => startEditing(meta.id, 'percentual', meta.meta_percentual)}
                            title="Duplo clique para editar"
                          >
                            {isEditingPercentual ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={saveEdit}
                                autoFocus
                                disabled={savingEdit}
                                className="h-9 text-right"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                {meta.meta_percentual.toFixed(2)}%
                              </span>
                            )}
                          </TableCell>
                          
                          {/* Valor Meta - Editável */}
                          <TableCell 
                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                            onDoubleClick={() => startEditing(meta.id, 'valor', meta.valor_meta)}
                            title="Duplo clique para editar"
                          >
                            {isEditingValor ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={saveEdit}
                                autoFocus
                                disabled={savingEdit}
                                className="h-9 text-right"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                {formatCurrency(meta.valor_meta)}
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right font-medium">
                            {formatCurrency(meta.valor_realizado)}
                          </TableCell>
                          <TableCell className="text-right">
                            {showDiff ? (
                              <span className={diferencaValor === 0 ? '' : diferencaValor > 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatCurrency(diferencaValor)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {showDiff ? (
                              <span className={diferencaPerc === 0 ? '' : diferencaPerc > 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatPercentage(diferencaPerc)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
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
