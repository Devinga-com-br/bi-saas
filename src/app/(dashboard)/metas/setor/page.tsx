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
import { useBranches } from '@/hooks/use-branches'
import { logModuleAccess } from '@/lib/audit'
import { Skeleton } from '@/components/ui/skeleton'

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
  const { branches } = useBranches({ tenantId: currentTenant?.id })

  const [setores, setSetores] = useState<Setor[]>([])
  const [selectedSetor, setSelectedSetor] = useState<string>('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [selectedFilial, setSelectedFilial] = useState<string>('all')
  const [metasData, setMetasData] = useState<Record<number, MetaSetor[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadingSetores, setLoadingSetores] = useState(true)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  // Dialog para gerar meta
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    setor_ids: [] as string[],
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    filial_ids: [] as string[],
    data_referencia: '',
    meta_percentual: 3,
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

  const loadSetores = useCallback(async () => {
    if (!currentTenant) return

    setLoadingSetores(true)
    try {
      const response = await fetch(`/api/setores?schema=${currentTenant.supabase_schema}`)
      if (!response.ok) throw new Error('Erro ao carregar setores')
      const data = await response.json()
      setSetores(data)
      if (data.length > 0 && !selectedSetor) {
        setSelectedSetor(data[0].id.toString())
      }
    } catch (error) {
      console.error('Error loading setores:', error)
      alert('Erro ao carregar setores')
    } finally {
      setLoadingSetores(false)
    }
  }, [currentTenant, selectedSetor])

  const loadMetasPorSetor = useCallback(async () => {
    if (!currentTenant || !selectedSetor) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema || '',
        setor_id: selectedSetor,
        mes: mes.toString(),
        ano: ano.toString(),
      })

      if (selectedFilial && selectedFilial !== 'all') {
        params.append('filial_id', selectedFilial)
      }

      const response = await fetch(`/api/metas/setor/report?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar metas')

      const data = await response.json()
      setMetasData({ [parseInt(selectedSetor)]: data })

      // Manter todas as datas fechadas por padrão
      const newExpanded: Record<string, boolean> = {}
      data.forEach((meta: MetaSetor) => {
        newExpanded[meta.data] = false
      })
      setExpandedDates(newExpanded)
    } catch (error) {
      console.error('Error loading metas:', error)
      alert('Erro ao carregar metas do setor')
    } finally {
      setLoading(false)
    }
  }, [currentTenant, selectedSetor, mes, ano, selectedFilial])

  useEffect(() => {
    loadSetores()
  }, [currentTenant, loadSetores])

  useEffect(() => {
    if (selectedSetor && mes && ano) {
      loadMetasPorSetor()
    }
  }, [selectedSetor, mes, ano, selectedFilial, currentTenant, loadMetasPorSetor])

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
    
    // Validar formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(generateForm.data_referencia)) {
      alert('Data de referência inválida. Use o formato YYYY-MM-DD (ex: 2025-09-15)')
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
                data_referencia: generateForm.data_referencia,
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
    const branch = branches?.find(
      (b) => b.store_code === filialId.toString() || b.branch_code === filialId.toString()
    )
    return branch ? `Filial ${branch.store_code || branch.branch_code}` : `Filial ${filialId}`
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meta por Setor</h1>
          <p className="text-muted-foreground">
            Acompanhe as metas de vendas por setor
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                    <div key={branch.branch_code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filial-${branch.branch_code}`}
                        checked={generateForm.filial_ids.includes(branch.store_code || branch.branch_code)}
                        onCheckedChange={(checked) => {
                          const filialId = branch.store_code || branch.branch_code
                          if (checked) {
                            setGenerateForm({
                              ...generateForm,
                              filial_ids: [...generateForm.filial_ids, filialId],
                            })
                          } else {
                            setGenerateForm({
                              ...generateForm,
                              filial_ids: generateForm.filial_ids.filter((id) => id !== filialId),
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor={`filial-${branch.branch_code}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Filial {branch.store_code || branch.branch_code}
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
                        filial_ids: branches?.map((b) => b.store_code || b.branch_code) || [],
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
                <Input
                  type="date"
                  value={generateForm.data_referencia}
                  onChange={(e) => {
                    const value = e.target.value
                    // Validar formato de data (YYYY-MM-DD)
                    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                      console.warn('Data inválida:', value)
                      return
                    }
                    setGenerateForm({ ...generateForm, data_referencia: value })
                  }}
                  placeholder="YYYY-MM-DD"
                  max="2099-12-31"
                />
              </div>

              <div className="grid gap-2">
                <Label>Meta (%)</Label>
                <Input
                  type="number"
                  value={generateForm.meta_percentual}
                  onChange={(e) =>
                    setGenerateForm({
                      ...generateForm,
                      meta_percentual: parseFloat(e.target.value),
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
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Setor</Label>
              <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                <SelectTrigger>
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

            <div className="flex-1">
              <Label>Filial</Label>
              <Select value={selectedFilial} onValueChange={setSelectedFilial}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Filiais</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.branch_code} value={branch.store_code || branch.branch_code}>
                      Filial {branch.store_code || branch.branch_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label>Mês</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
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

            <div className="w-32">
              <Label>Ano</Label>
              <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
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
              <Badge variant="secondary">
                {selectedFilial === 'all' ? 'Todas as Filiais' : `Filial ${selectedFilial}`}
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
                        </TableCell>
                        <TableCell className="text-right font-semibold">
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
                        </TableCell>
                      </TableRow>

                      {isExpanded &&
                        meta.filiais.map((filial) => {
                          const metaDiferencaValor = filial.diferenca || 0
                          const metaDiferencaPerc = filial.diferenca_percentual || 0
                          
                          return (
                            <TableRow
                              key={`${meta.data}-${filial.filial_id}`}
                              className="bg-background/50"
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
                              <TableCell className="text-right text-sm">
                                {filial.meta_percentual.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(filial.valor_meta)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(filial.valor_realizado)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
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
                              </TableCell>
                              <TableCell className="text-right text-sm">
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
