'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'

interface Departamento {
  id: number
  departamento_id: number
  descricao: string
}

interface Setor {
  id: number
  nome: string
  departamento_nivel: number
  departamento_ids: number[]
  created_at: string
}

export default function SetoresPage() {
  const { currentTenant } = useTenantContext()
  const [setores, setSetores] = useState<Setor[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    departamento_nivel: '1',
    departamento_ids: [] as number[]
  })

  const loadSetores = useCallback(async () => {
    if (!currentTenant) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `/api/setores?schema=${currentTenant.supabase_schema}`
      )
      
      if (!response.ok) throw new Error('Erro ao carregar setores')
      
      const data = await response.json()
      setSetores(data)
    } catch (error) {
      console.error('Error loading setores:', error)
      alert('Não foi possível carregar os setores')
    } finally {
      setLoading(false)
    }
  }, [currentTenant])

  const loadDepartamentos = useCallback(async () => {
    if (!currentTenant) return
    
    try {
      const response = await fetch(
        `/api/setores/departamentos?schema=${currentTenant.supabase_schema}&nivel=${formData.departamento_nivel}`
      )
      
      if (!response.ok) throw new Error('Erro ao carregar departamentos')
      
      const data = await response.json()
      setDepartamentos(data)
    } catch (error) {
      console.error('Error loading departamentos:', error)
      alert('Não foi possível carregar os departamentos')
    }
  }, [currentTenant, formData.departamento_nivel])

  useEffect(() => {
    if (currentTenant) {
      loadSetores()
    }
  }, [currentTenant, loadSetores])

  useEffect(() => {
    if (formData.departamento_nivel && currentTenant) {
      loadDepartamentos()
    }
  }, [formData.departamento_nivel, currentTenant, loadDepartamentos])

  const handleOpenDialog = (setor?: Setor) => {
    if (setor) {
      setEditingSetor(setor)
      setFormData({
        nome: setor.nome,
        departamento_nivel: setor.departamento_nivel.toString(),
        departamento_ids: setor.departamento_ids
      })
    } else {
      setEditingSetor(null)
      setFormData({
        nome: '',
        departamento_nivel: '1',
        departamento_ids: []
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingSetor(null)
    setFormData({
      nome: '',
      departamento_nivel: '1',
      departamento_ids: []
    })
  }

  const handleSaveSetor = async () => {
    if (!currentTenant) return
    
    if (!formData.nome || formData.departamento_ids.length === 0) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const url = editingSetor
        ? `/api/setores/${editingSetor.id}`
        : '/api/setores'
      
      const response = await fetch(url, {
        method: editingSetor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant.supabase_schema,
          nome: formData.nome,
          departamento_nivel: parseInt(formData.departamento_nivel),
          departamento_ids: formData.departamento_ids
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar setor')

      alert(`Setor ${editingSetor ? 'atualizado' : 'cadastrado'} com sucesso`)

      handleCloseDialog()
      loadSetores()
    } catch (error) {
      console.error('Error saving setor:', error)
      alert('Não foi possível salvar o setor')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSetor = async (id: number) => {
    if (!currentTenant || !confirm('Deseja realmente excluir este setor?')) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/setores/${id}?schema=${currentTenant.supabase_schema}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Erro ao excluir setor')

      alert('Setor excluído com sucesso')

      loadSetores()
    } catch (error) {
      console.error('Error deleting setor:', error)
      alert('Não foi possível excluir o setor')
    } finally {
      setLoading(false)
    }
  }

  const toggleDepartamento = (deptId: number) => {
    setFormData(prev => ({
      ...prev,
      departamento_ids: prev.departamento_ids.includes(deptId)
        ? prev.departamento_ids.filter(id => id !== deptId)
        : [...prev.departamento_ids, deptId]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Setor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setores Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os setores e seus departamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && setores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : setores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum setor cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Departamentos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setores.map(setor => (
                  <TableRow key={setor.id}>
                    <TableCell className="font-medium">{setor.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Nível {setor.departamento_nivel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {setor.departamento_ids.length} departamento(s)
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(setor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSetor(setor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSetor ? 'Editar' : 'Novo'} Setor
            </DialogTitle>
            <DialogDescription>
              Configure o setor e selecione os departamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Setor *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Açougue, Padaria, Bebidas..."
              />
            </div>

            <div>
              <Label htmlFor="nivel">Nível de Departamento *</Label>
              <Select
                value={formData.departamento_nivel}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  departamento_nivel: value,
                  departamento_ids: [] // Reset selection on level change
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Nível 1</SelectItem>
                  <SelectItem value="2">Nível 2</SelectItem>
                  <SelectItem value="3">Nível 3</SelectItem>
                  <SelectItem value="4">Nível 4</SelectItem>
                  <SelectItem value="5">Nível 5</SelectItem>
                  <SelectItem value="6">Nível 6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Departamentos *</Label>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                {departamentos.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Nenhum departamento encontrado neste nível
                  </div>
                ) : (
                  departamentos.map(dept => (
                    <div key={dept.departamento_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept.departamento_id}`}
                        checked={formData.departamento_ids.includes(dept.departamento_id)}
                        onCheckedChange={() => toggleDepartamento(dept.departamento_id)}
                      />
                      <label
                        htmlFor={`dept-${dept.departamento_id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <span className="font-mono text-muted-foreground">{dept.departamento_id}</span> - {dept.descricao}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {formData.departamento_ids.length} departamento(s) selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSetor} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
