"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiFilialFilter, type FilialOption } from "@/components/filters"
import { Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const getAnosDisponiveis = () => {
  const anoAtual = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => anoAtual - i)
}

interface MetasFiltersProps {
  filiaisSelecionadas: FilialOption[]
  setFiliaisSelecionadas: (filiais: FilialOption[]) => void
  mes: number
  setMes: (mes: number) => void
  ano: number
  setAno: (ano: number) => void
  branches: FilialOption[]
  isLoadingBranches: boolean
  onFilter: (filiais: FilialOption[], mes: number, ano: number) => void
}

export function MetasFilters({
  filiaisSelecionadas,
  setFiliaisSelecionadas,
  mes,
  setMes,
  ano,
  setAno,
  branches,
  isLoadingBranches,
  onFilter,
}: MetasFiltersProps) {
  // Estados locais para os filtros (não aplicados ainda)
  const [localFiliais, setLocalFiliais] = useState<FilialOption[]>(filiaisSelecionadas)
  const [localMes, setLocalMes] = useState<number>(mes)
  const [localAno, setLocalAno] = useState<number>(ano)

  // Sincronizar quando filtros externos mudarem (ex: inicialização)
  useEffect(() => {
    setLocalFiliais(filiaisSelecionadas)
  }, [filiaisSelecionadas])

  useEffect(() => {
    setLocalMes(mes)
  }, [mes])

  useEffect(() => {
    setLocalAno(ano)
  }, [ano])

  // Aplicar filtros
  const handleFilter = () => {
    if (localFiliais.length === 0) {
      return // Não filtrar se não houver filiais selecionadas
    }
    
    // Atualiza os estados globais
    setFiliaisSelecionadas(localFiliais)
    setMes(localMes)
    setAno(localAno)
    
    // Chama onFilter passando os valores diretamente para evitar problemas de batching
    onFilter(localFiliais, localMes, localAno)
  }

  // Verificar se tem mudanças pendentes
  const hasChanges = 
    localFiliais.map(f => f.value).sort().join(',') !== filiaisSelecionadas.map(f => f.value).sort().join(',') ||
    localMes !== mes ||
    localAno !== ano

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Filtros em Layout Flexível */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filiais - Maior espaço */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between h-5">
              <Label htmlFor="filiais">Filiais</Label>
              {localFiliais.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{localFiliais.length} selecionada(s)</span>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {localFiliais.length}
                  </div>
                </div>
              )}
            </div>
            <MultiFilialFilter
              filiais={branches}
              selectedFiliais={localFiliais}
              onChange={setLocalFiliais}
              disabled={isLoadingBranches}
              placeholder={isLoadingBranches ? "Carregando..." : "Selecione as filiais"}
            />
          </div>

          {/* Mês e Ano - Juntos e menores */}
          <div className="flex gap-4">
            {/* Mês */}
            <div className="w-40 space-y-2">
              <div className="h-5 flex items-center">
                <Label htmlFor="mes">Mês</Label>
              </div>
              <Select value={localMes.toString()} onValueChange={(value) => setLocalMes(parseInt(value))}>
                <SelectTrigger id="mes" className="h-10">
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

            {/* Ano */}
            <div className="w-32 space-y-2">
              <div className="h-5 flex items-center">
                <Label htmlFor="ano">Ano</Label>
              </div>
              <Select value={localAno.toString()} onValueChange={(value) => setLocalAno(parseInt(value))}>
                <SelectTrigger id="ano" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAnosDisponiveis().map((anoItem) => (
                    <SelectItem key={anoItem} value={anoItem.toString()}>
                      {anoItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão Filtrar */}
            <div className="w-32 space-y-2">
              <div className="h-5" /> {/* Espaçador para alinhar com os outros campos */}
              <Button 
                onClick={handleFilter}
                className="h-10 w-full"
                disabled={isLoadingBranches || !hasChanges || localFiliais.length === 0}
              >
                <Search className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
