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
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, ChevronDown, ChevronRight, Loader2, RefreshCw, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'
import { DatePicker } from '@/components/ui/date-picker'
import { type FilialOption } from '@/components/filters'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { MetasFilters } from '@/components/metas/filters'

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
  const { branchOptions: branches, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false // Não incluir opção "Todas as Filiais"
  })

  const currentDate = new Date()
  const [mes, setMes] = useState(currentDate.getMonth() + 1)
  const [ano, setAno] = useState(currentDate.getFullYear())
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])
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

  // Estados para edição inline
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'percentual' | 'valor' } | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Estado para botão atualizar valores
  const [isUpdatingValues, setIsUpdatingValues] = useState(false)

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

  // Ao carregar filiais, selecionar todas por padrão e carregar dados
  useEffect(() => {
    if (!isLoadingBranches && branches && branches.length > 0 && filiaisSelecionadas.length === 0) {
      console.log('[METAS] Selecionando todas as filiais automaticamente:', branches.length)
      setFiliaisSelecionadas(branches)
      // Carregar dados automaticamente com todas as filiais
      loadReport(branches, mes, ano)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingBranches, branches, filiaisSelecionadas.length])

  const loadReport = async (filiais?: FilialOption[], mesParam?: number, anoParam?: number) => {
    if (!currentTenant?.supabase_schema) return

    // Usar parâmetros passados ou estados atuais
    const filiaisToUse = filiais !== undefined ? filiais : filiaisSelecionadas
    const mesToUse = mesParam !== undefined ? mesParam : mes
    const anoToUse = anoParam !== undefined ? anoParam : ano

    console.log('[METAS] 📥 Loading report with:', { 
      numFiliais: filiaisToUse.length,
      filialIds: filiaisToUse.map(f => ({ id: f.value, nome: f.label })),
      mes: mesToUse, 
      ano: anoToUse 
    })

    setLoading(true)
    try {
      // PASSO 1: Atualizar valores realizados antes de carregar o relatório
      console.log('[METAS] 🔄 Atualizando valores realizados...')
      const updateResponse = await fetch('/api/metas/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant.supabase_schema,
          mes: mesToUse,
          ano: anoToUse
          // Não passa filial_id para atualizar todas as filiais
        })
      })

      if (!updateResponse.ok) {
        console.warn('[METAS] ⚠️ Aviso: Não foi possível atualizar valores realizados')
        // Continua mesmo se falhar a atualização
      } else {
        const updateData = await updateResponse.json()
        console.log('[METAS] ✅ Valores atualizados:', updateData)
      }

      // PASSO 2: Buscar relatório atualizado
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes: mesToUse.toString(),
        ano: anoToUse.toString()
      })

      // Se tiver filiais selecionadas, buscar apenas as selecionadas
      if (filiaisToUse.length > 0) {
        const filialIds = filiaisToUse
          .map(f => f.value)
          .join(',')

        params.append('filial_id', filialIds)
        console.log('[METAS] 🔗 URL params:', {
          schema: currentTenant.supabase_schema,
          mes: mesToUse,
          ano: anoToUse,
          filial_id: filialIds,
          fullURL: `/api/metas/report?${params}`
        })
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
      console.log('[METAS] 📊 Report data loaded:', {
        totalMetas: data.metas?.length || 0,
        firstDate: data.metas?.[0]?.data,
        firstMeta: data.metas?.[0],
        lastDate: data.metas?.[data.metas?.length - 1]?.data,
        lastMeta: data.metas?.[data.metas?.length - 1],
        filiaisUsadas: filiaisToUse.length,
        mes: mesToUse,
        ano: anoToUse,
        primeiras5Metas: data.metas?.slice(0, 5).map((m: Meta) => ({
          data: m.data,
          filial_id: m.filial_id,
          valor_realizado: m.valor_realizado,
          valor_meta: m.valor_meta
        }))
      })
      
      console.log('[METAS] 🎯 Verificando data inicial:', {
        primeiraData: data.metas?.[0]?.data,
        esperado: `${anoToUse}-${mesToUse.toString().padStart(2, '0')}-01`,
        match: data.metas?.[0]?.data === `${anoToUse}-${mesToUse.toString().padStart(2, '0')}-01`
      })
      
      // Se não há metas, mostrar mensagem informativa
      if (!data.metas || data.metas.length === 0) {
        console.log('[METAS] ℹ️ Nenhuma meta encontrada para o período')
      }
      
      setReport(data)
    } catch (error) {
      console.error('[METAS] ❌ Error loading report:', error)
      // Não mostrar alert, apenas setar report vazio para permitir uso do módulo
      setReport({
        metas: [],
        total_realizado: 0,
        total_meta: 0,
        percentual_atingido: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Handler para aplicar filtros
  const handleFilter = (filiais: FilialOption[], mesParam: number, anoParam: number) => {
    if (!currentTenant?.supabase_schema) return
    
    console.log('[METAS] handleFilter called with:', { filiais: filiais.length, mes: mesParam, ano: anoParam })
    
    // Atualizar os estados
    setFiliaisSelecionadas(filiais)
    setMes(mesParam)
    setAno(anoParam)
    
    // Carregar com os parâmetros diretamente para evitar delay de state
    loadReport(filiais, mesParam, anoParam)
  }

  const handleGenerateMetas = async () =>  {
    if (!currentTenant?.supabase_schema) return
    if (!formFilialId || !formMetaPercentual || !formDataReferencia) {
      toast.error('Campos obrigatórios', {
        description: 'Preencha todos os campos para gerar as metas'
      })
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
        toast.success('Metas geradas com sucesso', {
          description: data.message || `${data.metas_criadas || 31} metas criadas para o período`
        })
        setDialogOpen(false)
        loadReport(filiaisSelecionadas, mes, ano)
      } else {
        toast.error('Erro ao gerar metas', {
          description: data.error || 'Verifique os dados e tente novamente'
        })
      }
    } catch (error) {
      console.error('Error generating metas:', error)
      toast.error('Erro ao gerar metas', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateValues = async () => {
    setIsUpdatingValues(true)
    try {
      // Recarregar o relatório com os filtros atuais
      await loadReport(filiaisSelecionadas, mes, ano)
    } finally {
      setIsUpdatingValues(false)
    }
  }

  // Não mais necessário, carregamento feito no useEffect de seleção das filiais

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
    const branch = branches.find((f: { value: string; label: string }) => f.value === filial_id.toString())
    return branch ? branch.label : `Filial ${filial_id}`
  }

  const toggleDateExpanded = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  const groupMetasByDate = (metas: Meta[]): GroupedByDate => {
    console.log('[METAS] 📊 Iniciando agrupamento de metas:', {
      totalMetas: metas.length,
      primeiraMeta: metas[0],
      ultimaMeta: metas[metas.length - 1]
    })
    
    const grouped: GroupedByDate = {}
    
    metas.forEach((meta, index) => {
      const dateKey = meta.data
      
      if (!grouped[dateKey]) {
        console.log(`[METAS] ➕ Criando novo grupo para data: ${dateKey} (meta #${index})`)
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
      
      console.log(`[METAS] ➡️ Adicionando meta ao grupo ${dateKey}:`, {
        filial_id: meta.filial_id,
        valor_realizado: meta.valor_realizado,
        valor_meta: meta.valor_meta,
        diferenca: meta.diferenca
      })
      
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
      
      console.log(`[METAS] 📊 Grupo ${dateKey} finalizado:`, {
        numFiliais,
        total_realizado: group.total_realizado,
        total_meta: group.total_meta,
        diferenca_percentual: group.diferenca_percentual
      })
    })
    
    console.log('[METAS] ✅ Agrupamento concluído:', {
      totalGrupos: Object.keys(grouped).length,
      grupos: Object.keys(grouped).sort()
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
      toast.error('Valor inválido', {
        description: 'Digite um número válido'
      })
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
        // Tratar divisão por zero quando valor_referencia = 0 ou null
        if (meta.valor_referencia === 0 || meta.valor_referencia === null || !meta.valor_referencia) {
          metaPercentual = 0  // Não é possível calcular % sem referência
        } else {
          metaPercentual = ((valorMeta / meta.valor_referencia) - 1) * 100
        }
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

      toast.success('Meta atualizada', {
        description: `${editingCell.field === 'percentual' ? 'Percentual' : 'Valor'} alterado com sucesso`
      })
      cancelEditing()
    } catch (error) {
      console.error('Error saving edit:', error)
      toast.error('Erro ao atualizar meta', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
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
            disabled={loading || isUpdatingValues}
            className="h-10"
          >
            {isUpdatingValues ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar Valores
              </>
            )}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10">
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
                  <DatePicker
                    value={formDataReferencia}
                    onChange={setFormDataReferencia}
                    placeholder="dd/mm/aaaa"
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={handleGenerateMetas}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Metas'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <MetasFilters
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

      {/* Cards resumo */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="relative">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-4 w-24 mt-4" />
                </div>
                <div className="flex flex-col items-center">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-4 w-24 mt-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
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
            <CardDescription>Comparativo mensal e até o dia anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              {/* Gráfico Mês Completo */}
              <div className="flex flex-col items-center">
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
                <p className="text-sm font-medium text-muted-foreground mt-4">Mês Completo</p>
              </div>

              {/* Gráfico D-1 */}
              <div className="flex flex-col items-center">
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
                      className={`${(() => {
                        const hoje = new Date()
                        const diaAnterior = hoje.getDate() - 1
                        
                        if (diaAnterior <= 0 || !report?.metas) return 0
                        
                        const metasAteOntem = report.metas.filter(meta => {
                          const [year, month, day] = meta.data.split('-').map(Number)
                          return month === mes && year === ano && day < hoje.getDate()
                        })
                        
                        const totalRealizadoD1 = metasAteOntem.reduce((sum, meta) => sum + (meta.valor_realizado || 0), 0)
                        const totalMetaD1 = metasAteOntem.reduce((sum, meta) => sum + (meta.valor_meta || 0), 0)
                        const percentualD1 = totalMetaD1 > 0 ? (totalRealizadoD1 / totalMetaD1) * 100 : 0
                        
                        return percentualD1 >= 100 ? 'text-green-500' : 'text-primary'
                      })()}`}
                      strokeWidth="10"
                      strokeDasharray={`${(() => {
                        const hoje = new Date()
                        const diaAnterior = hoje.getDate() - 1
                        
                        if (diaAnterior <= 0 || !report?.metas) return 0
                        
                        const metasAteOntem = report.metas.filter(meta => {
                          const [year, month, day] = meta.data.split('-').map(Number)
                          return month === mes && year === ano && day < hoje.getDate()
                        })
                        
                        const totalRealizadoD1 = metasAteOntem.reduce((sum, meta) => sum + (meta.valor_realizado || 0), 0)
                        const totalMetaD1 = metasAteOntem.reduce((sum, meta) => sum + (meta.valor_meta || 0), 0)
                        const percentualD1 = totalMetaD1 > 0 ? (totalRealizadoD1 / totalMetaD1) * 100 : 0
                        
                        return ((percentualD1 / 100) * 351.86).toFixed(2)
                      })()} 351.86`}
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
                      {(() => {
                        const hoje = new Date()
                        const diaAnterior = hoje.getDate() - 1
                        
                        if (diaAnterior <= 0 || !report?.metas) return '0.0'
                        
                        const metasAteOntem = report.metas.filter(meta => {
                          const [year, month, day] = meta.data.split('-').map(Number)
                          return month === mes && year === ano && day < hoje.getDate()
                        })
                        
                        const totalRealizadoD1 = metasAteOntem.reduce((sum, meta) => sum + (meta.valor_realizado || 0), 0)
                        const totalMetaD1 = metasAteOntem.reduce((sum, meta) => sum + (meta.valor_meta || 0), 0)
                        const percentualD1 = totalMetaD1 > 0 ? (totalRealizadoD1 / totalMetaD1) * 100 : 0
                        
                        return percentualD1.toFixed(1)
                      })()}%
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground mt-4">Até Ontem (D-1)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

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
            <div className="space-y-2">
              {/* Header skeleton */}
              <div className="grid grid-cols-9 gap-4 pb-4 border-b">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              {/* Rows skeleton */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="grid grid-cols-9 gap-4 py-3 border-b">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : report?.metas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma meta cadastrada para este período.
                <br />
                Clique em &quot;Cadastrar Meta&quot; para criar.
              </p>
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
                  {(() => {
                    // Log para debug
                    const allMetas = report?.metas || []
                    console.log('[METAS] 🔍 Filtrando metas:', {
                      totalMetas: allMetas.length,
                      mesAtual: mes,
                      anoAtual: ano,
                      filiaisSelecionadas: filiaisSelecionadas.map(f => f.value),
                      primeiraData: allMetas[0]?.data,
                      ultimaData: allMetas[allMetas.length - 1]?.data,
                      primeiras5Metas: allMetas.slice(0, 5).map(m => ({ 
                        data: m.data, 
                        filial_id: m.filial_id,
                        valor_realizado: m.valor_realizado 
                      }))
                    })
                    
                    const filteredMetas = allMetas
                      .filter((meta) => {
                        const [year, month, day] = meta.data.split('-').map(Number)
                        const matches = month === mes && year === ano
                        if (!matches) {
                          console.log('[METAS] ❌ Meta não passa no filtro:', { 
                            data: meta.data,
                            parsedDate: { year, month, day },
                            metaMes: month, 
                            metaAno: year,
                            filtroMes: mes,
                            filtroAno: ano
                          })
                        }
                        return matches
                      })
                      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                    
                    console.log('[METAS] ✅ Metas após filtro:', {
                      total: filteredMetas.length,
                      primeira: filteredMetas[0]?.data,
                      ultima: filteredMetas[filteredMetas.length - 1]?.data,
                      primeiras3Filtradas: filteredMetas.slice(0, 3).map(m => ({ 
                        data: m.data, 
                        filial_id: m.filial_id 
                      }))
                    })
                    
                    const grouped = groupMetasByDate(filteredMetas)
                    const datasAgrupadas = Object.keys(grouped).sort()
                    console.log('[METAS] 📅 Datas agrupadas:', {
                      total: datasAgrupadas.length,
                      primeira: datasAgrupadas[0],
                      ultima: datasAgrupadas[datasAgrupadas.length - 1],
                      todasDatas: datasAgrupadas
                    })
                    
                    const sortedEntries = Object.entries(grouped).sort(([dateA], [dateB]) => {
                      return new Date(dateA).getTime() - new Date(dateB).getTime()
                    })
                    
                    console.log('[METAS] 🗂️ Entries ordenadas ANTES DE RENDERIZAR:', {
                      total: sortedEntries.length,
                      primeira: sortedEntries[0]?.[0],
                      ultima: sortedEntries[sortedEntries.length - 1]?.[0],
                      TODAS_AS_DATAS: sortedEntries.map(([date]) => date),
                      primeiras5: sortedEntries.slice(0, 5).map(([date, group]) => ({
                        data: date,
                        numFiliais: group.metas.length,
                        total_realizado: group.total_realizado,
                        total_meta: group.total_meta
                      }))
                    })
                    
                    return sortedEntries
                  })().map(([dateKey, group], index) => {
                    console.log(`[METAS] 🎨 Renderizando linha #${index}:`, {
                      data: dateKey,
                      numFiliais: group.metas.length,
                      total_realizado: group.total_realizado
                    })
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
                                className="text-right text-sm cursor-pointer hover:bg-muted/50 transition-colors group"
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
                                className="text-right text-sm cursor-pointer hover:bg-muted/50 transition-colors group"
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
                  {(() => {
                    const allMetas = report?.metas || []
                    console.log('[METAS] 🔍 FILIAL ÚNICA - Metas antes do filtro:', {
                      total: allMetas.length,
                      primeiraData: allMetas[0]?.data,
                      ultimaData: allMetas[allMetas.length - 1]?.data,
                      mes: mes,
                      ano: ano,
                      primeiras5: allMetas.slice(0, 5).map(m => ({
                        data: m.data,
                        filial_id: m.filial_id,
                        valor_realizado: m.valor_realizado
                      }))
                    })
                    
                    const filteredMetas = allMetas.filter((meta) => {
                      // Extrair mês e ano da string de data no formato YYYY-MM-DD
                      const [metaAno, metaMes] = meta.data.split('-').map(Number)
                      const matches = metaMes === mes && metaAno === ano
                      
                      if (!matches) {
                        console.log('[METAS] ❌ FILIAL ÚNICA - Meta não passa no filtro:', {
                          data: meta.data,
                          metaMes,
                          metaAno,
                          filtroMes: mes,
                          filtroAno: ano
                        })
                      }
                      
                      return matches
                    })
                    
                    console.log('[METAS] ✅ FILIAL ÚNICA - Metas após filtro:', {
                      total: filteredMetas.length,
                      primeiraData: filteredMetas[0]?.data,
                      ultimaData: filteredMetas[filteredMetas.length - 1]?.data,
                      todasDatas: filteredMetas.map(m => m.data)
                    })
                    
                    const sortedMetas = filteredMetas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                    
                    console.log('[METAS] 📅 FILIAL ÚNICA - Metas após ordenação:', {
                      total: sortedMetas.length,
                      primeiraData: sortedMetas[0]?.data,
                      ultimaData: sortedMetas[sortedMetas.length - 1]?.data
                    })
                    
                    return sortedMetas
                  })().map((meta, index) => {
                      console.log(`[METAS] 🎨 FILIAL ÚNICA - Renderizando linha #${index}:`, {
                        data: meta.data,
                        filial_id: meta.filial_id,
                        valor_realizado: meta.valor_realizado
                      })
                      
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
                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group"
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
                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏️</span>
                              </span>
                            )}
                          </TableCell>

                          {/* Valor Meta - Editável */}
                          <TableCell
                            className="text-right cursor-pointer hover:bg-muted/50 transition-colors group"
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
                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏️</span>
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
