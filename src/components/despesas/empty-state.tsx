"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FileX, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface EmptyStateProps {
  type: "no-data" | "no-filters" | "error"
  message?: string
}

export function EmptyState({ type, message }: EmptyStateProps) {
  if (type === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          {message || "Ocorreu um erro ao buscar as informações. Por favor, tente novamente."}
        </AlertDescription>
      </Alert>
    )
  }

  if (type === "no-filters") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma filial selecionada</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Selecione uma ou mais filiais nos filtros acima para visualizar as despesas.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma despesa encontrada</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Não há registros de despesas para o período e filiais selecionadas.
        </p>
      </CardContent>
    </Card>
  )
}
