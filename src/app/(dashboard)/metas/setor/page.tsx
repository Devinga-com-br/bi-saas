'use client'

import { useState, useEffect, Fragment, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronRight, Plus, Target, Loader2 } from 'lucide-react'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { logModuleAccess } from '@/lib/audit'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { MultiFilialFilter, type FilialOption } from '@/components/filters'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { RefreshCw } from 'lucide-react'

interface Setor {
  id: number
  nome: string
  nivel: number
  departamento_ids: number[]
}

interface MetaSetor {
  data: string
  dia_semana: string
  filiais: {
    filial_id: number
    data_referencia: string
    dia_semana_ref: string
    valor_referencia: number
    meta_percentual: number
    valor_meta: number
    valor_realizado: number
    diferenca: number
    diferenca_percentual: number
  }[]
}

export default function MetaSetorPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { branchOptions: branches, isLoading: isLoadingBranches } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
    includeAll: false // Não incluir opção "Todas as Filiais"
  })

  const [setores, setSetores] = useState<Setor[]>([])
  const [selectedSetor, setSelectedSetor] = useState<string>('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<FilialOption[]>([])
  const [tempFiliaisSelecionadas, setTempFiliaisSelecionadas] = useState<FilialOption[]>([])
  const [metasData, setMetasData] = useState<Record<number, MetaSetor[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadingSetores, setLoadingSetores] = useState(true)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  // const [isUpdatingValues, setIsUpdatingValues] = useState(false) // Não usado na UI

  // Estados para edição inline
  const [editingCell, setEditingCell] = useState<{ data: string; filialId: number; field: 'percentual' | 'valor' } | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Dialog para gerar meta
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    setor_ids: [] as string[],
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    filial_ids: [] as string[],
    data_referencia: undefined as Date | undefined,
    meta_percentual: undefined as number | undefined,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    if (currentTenant && userProfile) {
      logModuleAccess({
        module: 'metas',
        tenantId: currentTenant.id,
        userName: userProfile.full_name,
        userEmail: '',
      })
    }
  }, [currentTenant, userProfile])

  // Ao carregar filiais, selecionar todas por padrão (apenas filiais reais, sem "all")
  useEffect(() => {
    if (!isLoadingBranches && branches && branches.length > 0 && filiaisSelecionadas.length === 0) {
      setFiliaisSelecionadas(branches)
      setTempFiliaisSelecionadas(branches)
    }
  }, [isLoadingBranches, branches, filiaisSelecionadas.length])

  // Limpar filiais selecionadas ao trocar de tenant
  useEffect(() => {
    if (currentTenant) {
      setFiliaisSelecionadas([])
      setTempFiliaisSelecionadas([])
    }
  }, [currentTenant?.id])

  const loadSetores = useCallback(async () => {
    if (!currentTenant) return

    setLoadingSetores(true)
    try {
      const response = await fetch(`/api/setores?schema=${currentTenant.supabase_schema}`)
      if (!response.ok) throw new Error('Erro ao carregar setores')
      const data = await response.json()
      setSetores(data)

      // Limpar setor selecionado ao trocar de empresa
      // para evitar tentar carregar metas com ID incorreto
      setSelectedSetor('')
      setMetasData({})
      setExpandedDates({})

      if (data.length > 0) {
        // Selecionar primeiro setor após um delay para garantir que
        // as filiais já foram carregadas para o novo tenant
        setTimeout(() => {
          setSelectedSetor(data[0].id.toString())
        }, 100)
      }
    } catch (error) {
      console.error('Error loading setores:', error)
      alert('Erro ao carregar setores')
    } finally {
      setLoadingSetores(false)
    }
  }, [currentTenant])

  const loadMetasPorSetor = useCallback(async () => {
    // Função para atualizar valores realizados de TODOS os setores
    const atualizarValoresRealizados = async () => {
      if (!currentTenant) return

      console.log('[METAS_SETOR] 🔄 Atualizando valores realizados de todos os setores...')
      
      try {
        const response = await fetch('/api/metas/setor/update-valores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema: currentTenant.supabase_schema,
            mes: mes,
            ano: ano
          }),
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Erro ao atualizar valores')
        }

        console.log('[METAS_SETOR] ✅ Valores atualizados:', result)
      } catch (error) {
        console.error('[METAS_SETOR] ❌ Erro ao atualizar valores:', error)
        // Não bloqueia o carregamento, apenas loga o erro
      }
    }

    if (!currentTenant || !selectedSetor || filiaisSelecionadas.length === 0) {
      console.log('[METAS_SETOR] ⚠️ Não carregar: filiais vazias')
      return
    }

    setLoading(true)
    try {
      console.log('[METAS_SETOR] 📥 Carregando metas do setor:', {
        setor_id: selectedSetor,
        mes,
        ano,
        filiais: filiaisSelecionadas.length
      })

      // Atualizar valores realizados primeiro
      await atualizarValoresRealizados()

      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema || '',
        setor_id: selectedSetor,
        mes: mes.toString(),
        ano: ano.toString(),
      })

      // Buscar apenas as filiais selecionadas
      const filialIds = filiaisSelecionadas
        .map(f => f.value)
        .join(',')

      params.append('filial_id', filialIds)

      const response = await fetch(`/api/metas/setor/report?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        console.error('[METAS_SETOR] ❌ Erro na API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })

        // Se for 404 ou não houver dados, é um caso esperado
        if (response.status === 404 || errorData.error?.includes('não encontrada')) {
          console.log('[METAS_SETOR] ℹ️ Nenhuma meta encontrada para o período')
          setMetasData({ [parseInt(selectedSetor)]: [] })
          setExpandedDates({})
          return
        }

        throw new Error(errorData.error || 'Erro ao carregar metas')
      }

      const data = await response.json()

      // Se retornou array vazio, não é erro
      if (Array.isArray(data) && data.length === 0) {
        console.log('[METAS_SETOR] ℹ️ Nenhuma meta encontrada para o período')
        setMetasData({ [parseInt(selectedSetor)]: [] })
        setExpandedDates({})
        return
      }

      console.log('[METAS_SETOR] 📊 Metas carregadas:', {
        total: data.length,
        primeiraData: data[0]?.data,
        ultimaData: data[data.length - 1]?.data
      })

      setMetasData({ [parseInt(selectedSetor)]: data })

      // Manter todas as datas fechadas por padrão
      const newExpanded: Record<string, boolean> = {}
      data.forEach((meta: MetaSetor) => {
        newExpanded[meta.data] = false
      })
      setExpandedDates(newExpanded)
    } catch (error) {
      console.error('[METAS_SETOR] ❌ Error loading metas:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert(`Erro ao carregar metas: ${errorMessage}\n\nDica: Certifique-se de ter gerado metas para este período.`)
    } finally {
      setLoading(false)
    }
  }, [currentTenant, selectedSetor, mes, ano, filiaisSelecionadas])

  // Carregar setores apenas uma vez quando o tenant está disponível
  useEffect(() => {
    if (currentTenant) {
      loadSetores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id])

  // Carregar metas ao montar com todas as filiais
  useEffect(() => {
    // Adiciona verificação para não carregar se estiver trocando de tenant
    // (verifica se tem tenant, setor e filiais disponíveis)
    if (
      currentTenant &&
      selectedSetor &&
      mes &&
      ano &&
      !isLoadingBranches &&
      !loadingSetores &&
      filiaisSelecionadas.length > 0 &&
      branches.length > 0
    ) {
      console.log('[METAS_SETOR] 📍 Carregamento inicial com todas as filiais')
      loadMetasPorSetor()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetor, mes, ano, isLoadingBranches, loadingSetores, filiaisSelecionadas, branches])

  // Função para aplicar filtros
  const handleFiltrar = () => {
    console.log('[METAS_SETOR] 🔍 Aplicando filtro:', {
      tempFiliais: tempFiliaisSelecionadas.length,
      mes,
      ano,
      setor: selectedSetor
    })
    
    if (tempFiliaisSelecionadas.length === 0) {
      alert('Selecione pelo menos uma filial')
      return
    }
    
    setFiliaisSelecionadas(tempFiliaisSelecionadas)
    // A atualização de filiaisSelecionadas vai disparar o useEffect acima
  }

  const handleGerarMeta = async () => {
    if (!currentTenant) return

    // Validar campos obrigatórios
    if (generateForm.setor_ids.length === 0) {
      alert('Selecione pelo menos um setor')
      return
    }
    if (generateForm.filial_ids.length === 0) {
      alert('Selecione pelo menos uma filial')
      return
    }
    if (!generateForm.data_referencia) {
      alert('Informe a data de referência')
      return
    }
    if (!generateForm.meta_percentual || generateForm.meta_percentual <= 0) {
      alert('Informe o percentual da meta')
      return
    }

    setIsGenerating(true)
    const total = generateForm.setor_ids.length * generateForm.filial_ids.length
    let current = 0
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    try {
      // Gerar meta para cada combinação de setor + filial
      for (const setor_id of generateForm.setor_ids) {
        for (const filial_id of generateForm.filial_ids) {
          current++
          setGenerationProgress({ current, total })

          try {
            const response = await fetch('/api/metas/setor/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                schema: currentTenant.supabase_schema,
                setor_id,
                filial_id,
                mes: generateForm.mes,
                ano: generateForm.ano,
                data_referencia: format(generateForm.data_referencia, 'yyyy-MM-dd'),
                meta_percentual: generateForm.meta_percentual,
              }),
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
              errorCount++
              const setorNome = setores.find(s => s.id.toString() === setor_id)?.nome || setor_id
              errors.push(`Setor ${setorNome} / Filial ${filial_id}: ${result.error || 'Erro desconhecido'}`)
            } else {
              successCount++
            }
          } catch (error) {
            errorCount++
            const setorNome = setores.find(s => s.id.toString() === setor_id)?.nome || setor_id
            errors.push(`Setor ${setorNome} / Filial ${filial_id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
          }
        }
      }

      // Mostrar resultado
      let message = `✅ Geração concluída!\n\n`
      message += `Sucesso: ${successCount}/${total}\n`
      if (errorCount > 0) {
        message += `Erros: ${errorCount}/${total}\n\n`
        message += `Detalhes dos erros:\n${errors.slice(0, 5).join('\n')}`
        if (errors.length > 5) {
          message += `\n... e mais ${errors.length - 5} erros`
        }
      }

      alert(message)

      if (successCount > 0) {
        // Limpar formulário após sucesso
        setGenerateForm({
          setor_ids: [],
          mes: new Date().getMonth() + 1,
          ano: new Date().getFullYear(),
          filial_ids: [],
          data_referencia: undefined,
          meta_percentual: undefined,
        })
        setDialogOpen(false)
        loadMetasPorSetor()
      }
    } catch (error) {
      console.error('Error generating metas:', error)
      alert(`❌ Erro ao gerar metas:\n${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsGenerating(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }

  // Verificar se a data é hoje ou futuro
  const isTodayOrFuture = (dateString: string): boolean => {
    const metaDate = parseISO(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    metaDate.setHours(0, 0, 0, 0)
    return metaDate >= today
  }

  // Verificar se deve mostrar diferença
  const shouldShowDifference = (data: string, valorRealizado: number): boolean => {
    if (isTodayOrFuture(data) && valorRealizado === 0) {
      return false
    }
    return true
  }

  // Iniciar edição de célula
  const startEditing = (data: string, filialId: number, field: 'percentual' | 'valor', currentValue: number) => {
    setEditingCell({ data, filialId, field })
    setEditingValue(currentValue.toString())
  }

  // Cancelar edição
  const cancelEditing = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  // Salvar edição
  const saveEdit = async () => {
    if (!editingCell || !currentTenant || !selectedSetor) return

    const newValue = parseFloat(editingValue)
    if (isNaN(newValue)) {
      alert('Valor inválido')
      return
    }

    setSavingEdit(true)
    try {
      // Encontrar a meta atual
      const filialIdNum = editingCell.filialId
      const setorIdNum = parseInt(selectedSetor)
      const metasDoSetor = metasData[setorIdNum] || []
      const metaDoDia = metasDoSetor.find(m => m.data === editingCell.data)
      const filialData = metaDoDia?.filiais.find(f => f.filial_id === filialIdNum)

      if (!filialData) {
        alert('Meta não encontrada')
        return
      }

      // Calcular valores
      let novoPercentual: number
      let novoValorMeta: number

      if (editingCell.field === 'percentual') {
        novoPercentual = newValue
        novoValorMeta = filialData.valor_referencia * (1 + novoPercentual / 100)
      } else {
        novoValorMeta = newValue
        novoPercentual = ((novoValorMeta / filialData.valor_referencia) - 1) * 100
      }

      // Chamar API para atualizar (usar a mesma API de meta mensal)
      const response = await fetch('/api/metas/setor/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant.supabase_schema,
          setor_id: setorIdNum,
          filial_id: filialIdNum,
          data: editingCell.data,
          meta_percentual: novoPercentual,
          valor_meta: novoValorMeta,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar meta')
      }

      // Atualizar estado local
      setMetasData(prev => {
        const updated = { ...prev }
        const setorMetas = [...(updated[setorIdNum] || [])]
        const diaIndex = setorMetas.findIndex(m => m.data === editingCell.data)
        
        if (diaIndex >= 0) {
          const filialIndex = setorMetas[diaIndex].filiais.findIndex(f => f.filial_id === filialIdNum)
          if (filialIndex >= 0) {
            setorMetas[diaIndex] = {
              ...setorMetas[diaIndex],
              filiais: setorMetas[diaIndex].filiais.map((f, idx) => 
                idx === filialIndex 
                  ? {
                      ...f,
                      meta_percentual: novoPercentual,
                      valor_meta: novoValorMeta,
                      diferenca: f.valor_realizado - novoValorMeta,
                      diferenca_percentual: ((f.valor_realizado / novoValorMeta) - 1) * 100
                    }
                  : f
              )
            }
          }
        }
        
        updated[setorIdNum] = setorMetas
        return updated
      })

      cancelEditing()
    } catch (error) {
      console.error('Error updating meta:', error)
      alert(error instanceof Error ? error.message : 'Erro ao atualizar meta')
    } finally {
      setSavingEdit(false)
    }
  }

  // Lidar com teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatPercentage = (value: number | null) => {
    if (value === null) return '-'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))
  }

  const currentSetorData = selectedSetor ? metasData[parseInt(selectedSetor)] || [] : []
  const currentSetor = setores.find(s => s.id.toString() === selectedSetor)
  
  // Função para obter nome da filial
  const getFilialName = (filialId: number) => {
    const branch = branches.find((f: { value: string; label: string }) => f.value === filialId.toString())
    return branch ? branch.label : `Filial ${filialId}`
  }

  if (loadingSetores) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={loadMetasPorSetor}
          disabled={loading}
          className="h-10"
        >
          {loading ? (
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
              <Plus className="mr-2 h-4 w-4" />
              Gerar Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerar Meta por Setor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Setores</Label>
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto space-y-2">
                  {setores.map((setor) => (
                    <div key={setor.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`setor-${setor.id}`}
                        checked={generateForm.setor_ids.includes(setor.id.toString())}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setGenerateForm({
                              ...generateForm,
                              setor_ids: [...generateForm.setor_ids, setor.id.toString()],
                            })
                          } else {
                            setGenerateForm({
                              ...generateForm,
                              setor_ids: generateForm.setor_ids.filter((id) => id !== setor.id.toString()),
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor={`setor-${setor.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {setor.nome}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setGenerateForm({
                        ...generateForm,
                        setor_ids: setores.map((s) => s.id.toString()),
                      })
                    }
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setGenerateForm({
                        ...generateForm,
                        setor_ids: [],
                      })
                    }
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Mês</Label>
                  <Select
                    value={generateForm.mes.toString()}
                    onValueChange={(value) =>
                      setGenerateForm({ ...generateForm, mes: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Ano</Label>
                  <Select
                    value={generateForm.ano.toString()}
                    onValueChange={(value) =>
                      setGenerateForm({ ...generateForm, ano: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Filiais</Label>
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto space-y-2">
                  {branches?.map((branch) => (
                    <div key={branch.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filial-${branch.value}`}
                        checked={generateForm.filial_ids.includes(branch.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setGenerateForm({
                              ...generateForm,
                              filial_ids: [...generateForm.filial_ids, branch.value],
                            })
                          } else {
                            setGenerateForm({
                              ...generateForm,
                              filial_ids: generateForm.filial_ids.filter((id) => id !== branch.value),
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor={`filial-${branch.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {branch.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setGenerateForm({
                        ...generateForm,
                        filial_ids: branches?.map((b) => b.value) || [],
                      })
                    }
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setGenerateForm({
                        ...generateForm,
                        filial_ids: [],
                      })
                    }
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Data de Referência</Label>
                <DatePicker
                  value={generateForm.data_referencia}
                  onChange={(date) => setGenerateForm({ ...generateForm, data_referencia: date })}
                  placeholder="dd/mm/aaaa"
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <Label>Meta (%)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 8"
                  value={generateForm.meta_percentual ?? ''}
                  onChange={(e) =>
                    setGenerateForm({
                      ...generateForm,
                      meta_percentual: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  step="0.01"
                />
              </div>

              {isGenerating && (
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Gerando metas... {generationProgress.current} de {generationProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isGenerating}>
                Cancelar
              </Button>
              <Button onClick={handleGerarMeta} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            {/* FILIAIS */}
            <div className="flex flex-col gap-2 w-full lg:w-[200px]">
              <Label>Filiais</Label>
              <MultiFilialFilter
                filiais={branches}
                selectedFiliais={tempFiliaisSelecionadas}
                onChange={setTempFiliaisSelecionadas}
                disabled={isLoadingBranches}
                placeholder={isLoadingBranches ? "Carregando filiais..." : "Selecione as filiais..."}
              />
            </div>

            {/* MÊS */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Mês</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ANO */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Ano</Label>
              <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[120px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* SETOR */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Label>Setor</Label>
              <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                <SelectTrigger className="w-full sm:w-[200px] h-10">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id.toString()}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BOTÃO FILTRAR */}
            <div className="flex flex-col gap-2">
              <Label className="invisible hidden sm:block">Ação</Label>
              <Button 
                onClick={handleFiltrar} 
                disabled={loading || tempFiliaisSelecionadas.length === 0}
                className="h-10 w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Filtrar'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Metas */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : currentSetorData.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {currentSetor?.nome}
              </CardTitle>
              <Badge>
                {filiaisSelecionadas.length === 0
                  ? 'Todas as Filiais'
                  : filiaisSelecionadas.length === 1
                  ? filiaisSelecionadas[0].label
                  : `${filiaisSelecionadas.length} Filiais`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                {currentSetorData.map((meta) => {
                  const isExpanded = expandedDates[meta.data] === true // Fechado por padrão
                  const totals = meta.filiais.reduce(
                    (acc, f) => ({
                      valor_referencia: acc.valor_referencia + (f.valor_referencia || 0),
                      valor_meta: acc.valor_meta + (f.valor_meta || 0),
                      valor_realizado: acc.valor_realizado + (f.valor_realizado || 0),
                      diferenca: acc.diferenca + (f.diferenca || 0),
                      meta_percentual: acc.meta_percentual + f.meta_percentual,
                      count: acc.count + 1,
                    }),
                    {
                      valor_referencia: 0,
                      valor_meta: 0,
                      valor_realizado: 0,
                      diferenca: 0,
                      meta_percentual: 0,
                      count: 0,
                    }
                  )

                  const avgMeta = totals.count > 0 ? totals.meta_percentual / totals.count : 0
                  const difPercentual =
                    totals.valor_meta > 0
                      ? ((totals.diferenca / totals.valor_meta) * 100)
                      : 0

                  // Verificar se deve mostrar diferença
                  const showDiff = shouldShowDifference(meta.data, totals.valor_realizado)

                  return (
                    <Fragment key={meta.data}>
                      <TableRow
                        className="bg-muted/50 hover:bg-muted/70 cursor-pointer font-medium"
                        onClick={() => toggleDate(meta.data)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {format(parseISO(meta.data), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {meta.dia_semana || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totals.valor_referencia)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {avgMeta.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totals.valor_meta)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totals.valor_realizado)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {showDiff ? (
                            <span
                              className={
                                totals.diferenca === 0
                                  ? ''
                                  : totals.diferenca > 0
                                  ? 'text-green-500'
                                  : 'text-red-500'
                              }
                            >
                              {formatCurrency(totals.diferenca)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {showDiff ? (
                            <span
                              className={
                                difPercentual === 0
                                  ? ''
                                  : difPercentual > 0
                                  ? 'text-green-500'
                                  : 'text-red-500'
                              }
                            >
                              {formatPercentage(difPercentual)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded &&
                        meta.filiais.map((filial) => {
                          const metaDiferencaValor = filial.diferenca || 0
                          const metaDiferencaPerc = filial.diferenca_percentual || 0
                          const isEditingPercentual = editingCell?.data === meta.data && editingCell?.filialId === filial.filial_id && editingCell?.field === 'percentual'
                          const isEditingValor = editingCell?.data === meta.data && editingCell?.filialId === filial.filial_id && editingCell?.field === 'valor'
                          const showFilialDiff = shouldShowDifference(meta.data, filial.valor_realizado)
                          
                          return (
                            <TableRow
                              key={`${meta.data}-${filial.filial_id}`}
                              className="bg-background/50 group"
                            >
                              <TableCell></TableCell>
                              <TableCell className="pl-8 text-sm">
                                <span className="font-medium">
                                  {getFilialName(filial.filial_id)}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                Ref: {format(parseISO(filial.data_referencia), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(filial.valor_referencia)}
                              </TableCell>
                              
                              {/* Meta % - Editável */}
                              <TableCell 
                                className="text-right text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                                onDoubleClick={() => startEditing(meta.data, filial.filial_id, 'percentual', filial.meta_percentual)}
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
                                    {filial.meta_percentual.toFixed(2)}%
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏️</span>
                                  </span>
                                )}
                              </TableCell>
                              
                              {/* Valor Meta - Editável */}
                              <TableCell 
                                className="text-right text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                                onDoubleClick={() => startEditing(meta.data, filial.filial_id, 'valor', filial.valor_meta)}
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
                                    {formatCurrency(filial.valor_meta)}
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏️</span>
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(filial.valor_realizado)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {showFilialDiff ? (
                                  <span
                                    className={
                                      metaDiferencaValor === 0
                                        ? ''
                                        : metaDiferencaValor > 0
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                    }
                                  >
                                    {formatCurrency(metaDiferencaValor)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {showFilialDiff ? (
                                  <span
                                    className={
                                      metaDiferencaPerc === 0
                                        ? ''
                                        : metaDiferencaPerc > 0
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                    }
                                  >
                                    {formatPercentage(metaDiferencaPerc)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma meta encontrada para este setor.
              <br />
              Clique em &quot;Gerar Meta&quot; para criar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
