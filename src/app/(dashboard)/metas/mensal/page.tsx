'use client'

import { useEffect, useState } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranches } from '@/hooks/use-branches'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpIcon, ArrowDownIcon, PlusIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'

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

export default function MetaMensalPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { branches } = useBranches({ tenantId: currentTenant?.id })

  const currentDate = new Date()
  const [mes, setMes] = useState(currentDate.getMonth() + 1)
  const [ano, setAno] = useState(currentDate.getFullYear())
  const [filialId, setFilialId] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<MetasReport | null>(null)

  // Estados do formulário de criação
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMes, setFormMes] = useState(currentDate.getMonth() + 1)
  const [formAno, setFormAno] = useState(currentDate.getFullYear())
  const [formFilialId, setFormFilialId] = useState<string>('')
  const [formMetaPercentual, setFormMetaPercentual] = useState('')
  const [formDataReferencia, setFormDataReferencia] = useState('')
  const [generating, setGenerating] = useState(false)

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

  const loadReport = async () => {
    if (!currentTenant?.supabase_schema) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        schema: currentTenant.supabase_schema,
        mes: mes.toString(),
        ano: ano.toString()
      })

      if (filialId !== 'all') {
        params.append('filialId', filialId)
      }

      const response = await fetch(`/api/metas/report?${params}`)
      const data = await response.json()

      if (response.ok) {
        setReport(data)
      } else {
        alert(`Erro: ${data.error || 'Erro ao carregar relatório'}`)
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

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
          dataReferenciaInicial: formDataReferencia
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

  useEffect(() => {
    if (currentTenant?.supabase_schema) {
      loadReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.supabase_schema, mes, ano, filialId])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meta Mensal</h1>
          <p className="text-muted-foreground">Acompanhe as metas mensais por filial</p>
        </div>
        
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
                  Preencha os dados para gerar as metas do mês
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                        <SelectItem key={branch.branch_code} value={branch.branch_code}>
                          Filial {branch.branch_code}
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
                  <Input
                    id="form-data-ref"
                    type="date"
                    value={formDataReferencia}
                    onChange={(e) => setFormDataReferencia(e.target.value)}
                  />
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

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Mês</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger>
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
            <div className="flex-1 space-y-2">
              <Label>Ano</Label>
              <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                <SelectTrigger>
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
            <div className="flex-1 space-y-2">
              <Label>Filial</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Filiais</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.branch_code} value={branch.branch_code}>
                      Filial {branch.branch_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReport} disabled={loading}>
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards resumo */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
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
          <CardHeader>
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
        <CardHeader>
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
          ) : (
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
                  {report?.metas.map((meta) => (
                    <TableRow key={meta.id}>
                      <TableCell>
                        {format(new Date(meta.data), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{meta.dia_semana}</TableCell>
                      <TableCell>
                        {format(new Date(meta.data_referencia), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(meta.valor_referencia)}
                      </TableCell>
                      <TableCell className="text-right">
                        {meta.meta_percentual.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(meta.valor_meta)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(meta.valor_realizado)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={meta.diferenca >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(meta.diferenca)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={(meta.diferenca_percentual || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatPercentage(meta.diferenca_percentual)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
