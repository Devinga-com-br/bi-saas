'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Store, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
// Temporary toast helper
const toast = (options: { title: string; description: string; variant?: 'destructive' }) => {
  const message = `${options.title}\n${options.description}`
  if (options.variant === 'destructive') {
    alert(`❌ ${message}`)
  } else {
    alert(`✓ ${message}`)
  }
}
import type { Branch } from '@/types'

interface BranchManagerProps {
  tenantId: string
}

export function BranchManager({ tenantId }: BranchManagerProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  // Form state
  const [branchCode, setBranchCode] = useState('')
  const [storeCode, setStoreCode] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true)
      console.log('[BranchManager] Loading branches for tenant:', tenantId)
      const response = await fetch(`/api/branches?tenant_id=${tenantId}`)
      const data = await response.json()

      console.log('[BranchManager] Response status:', response.status)
      console.log('[BranchManager] Response data:', data)

      if (response.ok) {
        setBranches(data.branches || [])
        console.log('[BranchManager] Loaded branches:', data.branches?.length || 0)
      } else {
        console.error('[BranchManager] Error loading branches:', data.error)
        toast({
          title: 'Erro ao carregar filiais',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[BranchManager] Error loading branches:', error)
      toast({
        title: 'Erro ao carregar filiais',
        description: 'Erro de conexão',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const resetForm = () => {
    setBranchCode('')
    setStoreCode('')
    setDescricao('')
    setCep('')
    setRua('')
    setNumero('')
    setBairro('')
    setCidade('')
    setEstado('')
    setEditingBranch(null)
  }

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch)
    setBranchCode(branch.branch_code)
    setStoreCode(branch.store_code || '')
    setDescricao(branch.descricao || '')
    setCep(branch.cep || '')
    setRua(branch.rua || '')
    setNumero(branch.numero || '')
    setBairro(branch.bairro || '')
    setCidade(branch.cidade || '')
    setEstado(branch.estado || '')
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!branchCode.trim()) {
      toast({
        title: 'Código da filial obrigatório',
        description: 'Por favor, informe o código da filial',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      const url = editingBranch 
        ? `/api/branches?branch_code=${editingBranch.branch_code}`
        : '/api/branches'
      
      const response = await fetch(url, {
        method: editingBranch ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_code: branchCode.trim(),
          store_code: storeCode.trim() || null,
          descricao: descricao.trim() || null,
          cep: cep.trim() || null,
          rua: rua.trim() || null,
          numero: numero.trim() || null,
          bairro: bairro.trim() || null,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: editingBranch ? 'Filial atualizada' : 'Filial cadastrada',
          description: editingBranch 
            ? 'A filial foi atualizada com sucesso'
            : 'A filial foi cadastrada com sucesso',
        })
        resetForm()
        setDialogOpen(false)
        loadBranches()
      } else {
        toast({
          title: editingBranch ? 'Erro ao atualizar filial' : 'Erro ao cadastrar filial',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error submitting branch:', error)
      toast({
        title: editingBranch ? 'Erro ao atualizar filial' : 'Erro ao cadastrar filial',
        description: 'Erro de conexão',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBranch = async (branchCode: string) => {
    if (!confirm('Tem certeza que deseja excluir esta filial?')) {
      return
    }

    try {
      const response = await fetch(`/api/branches?branch_code=${branchCode}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Filial excluída',
          description: 'A filial foi excluída com sucesso',
        })
        loadBranches()
      } else {
        toast({
          title: 'Erro ao excluir filial',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting branch:', error)
      toast({
        title: 'Erro ao excluir filial',
        description: 'Erro de conexão',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Filiais
            </CardTitle>
            <CardDescription>
              Gerencie as filiais desta empresa
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingBranch ? 'Editar Filial' : 'Cadastrar Nova Filial'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBranch 
                      ? 'Atualize as informações da filial'
                      : 'Adicione uma nova filial para esta empresa'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch_code">
                      Código da Filial <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="branch_code"
                      placeholder="Ex: 001"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      disabled={!!editingBranch}
                      required
                    />
                    {editingBranch && (
                      <p className="text-xs text-muted-foreground">
                        O código da filial não pode ser alterado
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">
                      Descrição/Nome da Filial
                    </Label>
                    <Input
                      id="descricao"
                      placeholder="Ex: Filial Centro"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store_code">
                      Código da Loja <span className="text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      id="store_code"
                      placeholder="Ex: LJ001"
                      value={storeCode}
                      onChange={(e) => setStoreCode(e.target.value)}
                    />
                  </div>
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Endereço</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          maxLength={9}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado (UF)</Label>
                        <Input
                          id="estado"
                          placeholder="SP"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value.toUpperCase())}
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rua">Rua/Logradouro</Label>
                      <Input
                        id="rua"
                        placeholder="Ex: Rua das Flores"
                        value={rua}
                        onChange={(e) => setRua(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="numero">Número</Label>
                        <Input
                          id="numero"
                          placeholder="123"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input
                          id="bairro"
                          placeholder="Ex: Centro"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        placeholder="Ex: São Paulo"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      resetForm()
                    }}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting 
                      ? (editingBranch ? 'Salvando...' : 'Cadastrando...') 
                      : (editingBranch ? 'Salvar' : 'Cadastrar')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando filiais...
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-8">
            <Store className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma filial cadastrada</h3>
            <p className="text-muted-foreground mt-2">
              Comece cadastrando a primeira filial
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {branches.map((branch) => (
              <div
                key={branch.branch_code}
                className="flex items-start justify-between p-4 border border-border rounded-xl hover:bg-accent/50 transition-all duration-300"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 ring-1 ring-primary/20 mt-1">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">
                        {branch.descricao || `Filial ${branch.branch_code}`}
                      </h4>
                      {branch.store_code && (
                        <Badge variant="secondary" className="font-normal">
                          Loja: {branch.store_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Código: {branch.branch_code}
                    </p>
                    {(branch.rua || branch.cidade) && (
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        {branch.rua && (
                          <p>
                            {branch.rua}
                            {branch.numero && `, ${branch.numero}`}
                            {branch.bairro && ` - ${branch.bairro}`}
                          </p>
                        )}
                        {branch.cidade && (
                          <p>
                            {branch.cidade}
                            {branch.estado && ` - ${branch.estado}`}
                            {branch.cep && ` | CEP: ${branch.cep}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2"
                  onClick={() => openEditDialog(branch)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:border-destructive"
                  onClick={() => handleDeleteBranch(branch.branch_code)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
