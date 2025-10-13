'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Store } from 'lucide-react'
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

  // Form state
  const [branchCode, setBranchCode] = useState('')
  const [storeCode, setStoreCode] = useState('')

  useEffect(() => {
    loadBranches()
  }, [tenantId])

  const loadBranches = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/branches?tenant_id=${tenantId}`)
      const data = await response.json()

      if (response.ok) {
        setBranches(data.branches || [])
      } else {
        toast({
          title: 'Erro ao carregar filiais',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error loading branches:', error)
      toast({
        title: 'Erro ao carregar filiais',
        description: 'Erro de conexão',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddBranch = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_code: branchCode.trim(),
          store_code: storeCode.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Filial cadastrada',
          description: 'A filial foi cadastrada com sucesso',
        })
        setBranchCode('')
        setStoreCode('')
        setDialogOpen(false)
        loadBranches()
      } else {
        toast({
          title: 'Erro ao cadastrar filial',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error adding branch:', error)
      toast({
        title: 'Erro ao cadastrar filial',
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddBranch}>
                <DialogHeader>
                  <DialogTitle>Cadastrar Nova Filial</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova filial para esta empresa
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
                      required
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
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Cadastrando...' : 'Cadastrar'}
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
                className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">Filial {branch.branch_code}</h4>
                      {branch.store_code && (
                        <Badge variant="secondary" className="font-normal">
                          Loja: {branch.store_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Código: {branch.branch_code}
                    </p>
                  </div>
                </div>
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
