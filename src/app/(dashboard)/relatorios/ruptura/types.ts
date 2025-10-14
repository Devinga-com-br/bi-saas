export interface ReportFilters {
  filialId?: string
  mes: number
  ano: number
  page: number
  pageSize: number
}

export interface RupturaData {
  departamento_id: number
  departamento_nome: string
  codigo: number
  descricao: string
  estoque_atual: number
}

export interface RupturaResponse {
  data: RupturaData[]
  total: number
  page: number
  pageSize: number
}