'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Pencil, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

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

interface SetoresContentProps {
  tenantSchema: string
}

export function SetoresContent({ tenantSchema }: SetoresContentProps) {
  const [setores, setSetores] = useState<Setor[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null)

  // Listen for custom event to open dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      handleOpenDialogFunc()
    }
    window.addEventListener('openSetorDialog', handleOpenDialog)
    return () => window.removeEventListener('openSetorDialog', handleOpenDialog)
  }, [])

  const [formData, setFormData] = useState({
    nome: '',
    departamento_nivel: '1',
    departamento_ids: [] as number[]
  })

  const loadSetores = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/setores?schema=${tenantSchema}`
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
  }, [tenantSchema])

  const loadDepartamentos = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/setores/departamentos?schema=${tenantSchema}&nivel=${formData.departamento_nivel}`
      )

      if (!response.ok) throw new Error('Erro ao carregar departamentos')

      const data = await response.json()
      setDepartamentos(data)
    } catch (error) {
      console.error('Error loading departamentos:', error)
      alert('Não foi possível carregar os departamentos')
    }
  }, [tenantSchema, formData.departamento_nivel])

  useEffect(() => {
    loadSetores()
  }, [loadSetores])

  useEffect(() => {
    if (formData.departamento_nivel) {
      loadDepartamentos()
    }
  }, [formData.departamento_nivel, loadDepartamentos])

  const handleOpenDialogFunc = (setor?: Setor) => {
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
          schema: tenantSchema,
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
    if (!confirm('Deseja realmente excluir este setor?')) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/setores/${id}?schema=${tenantSchema}`,
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setores Cadastrados</CardTitle>
          <CardDescription className="text-xs">
            Gerencie os setores e seus departamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && setores.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : setores.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum setor cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Nível</TableHead>
                  <TableHead className="text-xs">Departamentos</TableHead>
                  <TableHead className="text-right text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setores.map(setor => (
                  <TableRow key={setor.id}>
                    <TableCell className="font-medium text-sm">{setor.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        Nível {setor.departamento_nivel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {setor.departamento_ids.length} departamento(s)
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialogFunc(setor)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSetor(setor.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
            <DialogTitle className="text-base">
              {editingSetor ? 'Editar' : 'Novo'} Setor
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure o setor e selecione os departamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-xs">Nome do Setor *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Açougue, Padaria, Bebidas..."
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="nivel" className="text-xs">Nível de Departamento *</Label>
              <Select
                value={formData.departamento_nivel}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  departamento_nivel: value,
                  departamento_ids: [] // Reset selection on level change
                }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-sm">Nível 1</SelectItem>
                  <SelectItem value="2" className="text-sm">Nível 2</SelectItem>
                  <SelectItem value="3" className="text-sm">Nível 3</SelectItem>
                  <SelectItem value="4" className="text-sm">Nível 4</SelectItem>
                  <SelectItem value="5" className="text-sm">Nível 5</SelectItem>
                  <SelectItem value="6" className="text-sm">Nível 6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Departamentos *</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {departamentos.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-3">
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
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <span className="font-mono text-muted-foreground">{dept.departamento_id}</span> - {dept.descricao}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formData.departamento_ids.length} departamento(s) selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSaveSetor} disabled={loading} size="sm">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
