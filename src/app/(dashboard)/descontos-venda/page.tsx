'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTenantContext } from '@/contexts/tenant-context'
import { useBranchesOptions } from '@/hooks/use-branches'
import { Plus, Pencil, Trash2, TrendingDown } from 'lucide-react'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { logModuleAccess } from '@/lib/audit'
import { toast } from 'sonner'

interface DescontoVenda {
  id: string
  filial_id: number
  filial_nome?: string
  data_desconto: string
  valor_desconto: number
  observacao: string | null
  created_at: string
  updated_at: string
}

export default function DescontosVendaPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const { options: filiaisOptions } = useBranchesOptions({
    tenantId: currentTenant?.id,
    enabled: !!currentTenant,
  })

  const [descontos, setDescontos] = useState<DescontoVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    filial_id: '',
    data_desconto: '',
    valor_desconto: '',
    observacao: '',
  })

  // Helper para obter nome da filial
  const getFilialNome = (filialId: number) => {
    const filial = filiaisOptions.find(f => f.value === String(filialId))
    return filial?.label || `Filial ${filialId}`
  }

  // Log de acesso ao módulo
  useEffect(() => {
    if (currentTenant?.id && userProfile?.id) {
      logModuleAccess({
        module: 'descontos_venda',
        subModule: 'listagem',
        tenantId: currentTenant.id,
        userName: userProfile.full_name || 'Usuário',
        userEmail: userProfile.id
      })
    }
  }, [currentTenant?.id, userProfile?.id, userProfile?.full_name])

  // Buscar descontos
  const fetchDescontos = useCallback(async () => {
    if (!currentTenant?.supabase_schema) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/descontos-venda?schema=${currentTenant.supabase_schema}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao carregar descontos')
      }
      
      const data = await response.json()
      setDescontos(data || [])
    } catch (error) {
      console.error('Erro ao buscar descontos:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar descontos')
    } finally {
      setLoading(false)
    }
  }, [currentTenant?.supabase_schema])

  useEffect(() => {
    if (currentTenant?.supabase_schema) {
      fetchDescontos()
    }
    // Remover fetchDescontos das dependências para evitar loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.supabase_schema])

  // Abrir modal para novo desconto
  const handleNovoDesconto = () => {
    setEditingId(null)
    setFormData({
      filial_id: '',
      data_desconto: new Date().toISOString().split('T')[0],
      valor_desconto: '',
      observacao: '',
    })
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleEditar = (desconto: DescontoVenda) => {
    setEditingId(desconto.id)
    setFormData({
      filial_id: desconto.filial_id.toString(),
      data_desconto: desconto.data_desconto,
      valor_desconto: desconto.valor_desconto.toString(),
      observacao: desconto.observacao || '',
    })
    setShowModal(true)
  }

  // Confirmar exclusão
  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setShowDeleteDialog(true)
  }

  // Excluir desconto
  const handleDelete = async () => {
    if (!deletingId || !currentTenant?.supabase_schema) return

    setSubmitting(true)
    try {
      console.log('[DELETE] Deletando desconto:', deletingId, 'schema:', currentTenant.supabase_schema)
      
      const response = await fetch(
        `/api/descontos-venda?id=${deletingId}&schema=${currentTenant.supabase_schema}`,
        { method: 'DELETE' }
      )

      console.log('[DELETE] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[DELETE] Erro da API:', errorData)
        throw new Error(errorData.error || 'Erro ao excluir desconto')
      }

      toast.success('Desconto excluído com sucesso!')
      setShowDeleteDialog(false)
      setDeletingId(null)
      fetchDescontos()
    } catch (error) {
      console.error('[DELETE] Erro ao excluir desconto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir desconto')
    } finally {
      setSubmitting(false)
    }
  }

  // Salvar desconto (criar ou editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.filial_id || !formData.data_desconto || !formData.valor_desconto) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!currentTenant?.supabase_schema) {
      toast.error('Tenant não configurado')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...(editingId && { id: editingId }),
        filial_id: parseInt(formData.filial_id),
        data_desconto: formData.data_desconto,
        valor_desconto: parseFloat(formData.valor_desconto),
        observacao: formData.observacao || null,
        schema: currentTenant.supabase_schema,
      }

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch('/api/descontos-venda', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar desconto')
      }

      toast.success(editingId ? 'Desconto atualizado com sucesso!' : 'Desconto lançado com sucesso!')
      setShowModal(false)
      fetchDescontos()
    } catch (error) {
      console.error('Erro ao salvar desconto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar desconto')
    } finally {
      setSubmitting(false)
    }
  }

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  // Formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Formatar input com máscara de moeda
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Remove tudo que não é dígito
    
    if (value === '') {
      setFormData({ ...formData, valor_desconto: '' })
      return
    }
    
    // Converte para número e formata
    const numberValue = parseFloat(value) / 100
    setFormData({ ...formData, valor_desconto: numberValue.toString() })
  }

  // Formatar valor para exibir no input
  const getDisplayValue = (value: string) => {
    if (!value) return ''
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return ''
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageBreadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Descontos Venda</h1>
          <p className="text-muted-foreground">
            Gerencie os descontos aplicados nas vendas por filial
          </p>
        </div>
        <Button onClick={handleNovoDesconto}>
          <Plus className="mr-2 h-4 w-4" />
          Lançar Desconto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Descontos Lançados
          </CardTitle>
          <CardDescription>
            Lista de todos os descontos de venda registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : descontos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum desconto lançado</h3>
              <p className="text-muted-foreground mb-4">
                Comece lançando o primeiro desconto
              </p>
              <Button onClick={handleNovoDesconto}>
                <Plus className="mr-2 h-4 w-4" />
                Lançar Primeiro Desconto
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead className="text-right">Valor Desconto</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descontos.map((desconto) => (
                    <TableRow key={desconto.id}>
                      <TableCell className="font-medium">
                        {formatDate(desconto.data_desconto)}
                      </TableCell>
                      <TableCell>
                        {getFilialNome(desconto.filial_id)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(desconto.valor_desconto)}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {desconto.observacao || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditar(desconto)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(desconto.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Lançamento/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Desconto' : 'Lançar Desconto'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize as informações do desconto'
                : 'Preencha os dados para lançar um novo desconto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="data_desconto">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_desconto"
                  type="date"
                  value={formData.data_desconto}
                  onChange={(e) =>
                    setFormData({ ...formData, data_desconto: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="filial_id">
                  Filial <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.filial_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, filial_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    {filiaisOptions.map((filial) => (
                      <SelectItem key={filial.value} value={filial.value}>
                        {filial.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valor_desconto">
                  Valor do Desconto (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valor_desconto"
                  type="text"
                  placeholder="0,00"
                  value={getDisplayValue(formData.valor_desconto)}
                  onChange={handleCurrencyInput}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  placeholder="Observações sobre o desconto (opcional)"
                  value={formData.observacao}
                  onChange={(e) =>
                    setFormData({ ...formData, observacao: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Lançar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este desconto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
