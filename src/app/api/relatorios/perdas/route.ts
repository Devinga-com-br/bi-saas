import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

// Types
interface Produto {
  codigo: number
  nome: string
  filial_id: number
  quantidade: number
  valor_perda: number
}

interface DepartamentoNivel1 {
  nome: string
  nivel: number
  total_qtde: number
  total_valor: number
  produtos: Produto[]
}

interface DepartamentoNivel2 {
  nome: string
  nivel: number
  total_qtde: number
  total_valor: number
  filhos: Record<string, DepartamentoNivel1>
}

interface DepartamentoNivel3 {
  nome: string
  nivel: number
  total_qtde: number
  total_valor: number
  filhos: Record<string, DepartamentoNivel2>
}

interface Hierarquia {
  [key: string]: DepartamentoNivel3
}

interface RowData {
  dept_nivel3: string
  dept_nivel2: string
  dept_nivel1: string
  produto_codigo: number
  produto_descricao: string
  filial_id: number
  qtde: string | number
  valor_perda: string | number
}

// Helper para gerar ID único a partir de string
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get schema from query params
    const schema = searchParams.get('schema')
    if (!schema) {
      return NextResponse.json({ error: 'Schema não informado' }, { status: 400 })
    }

    // Get parameters
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
    const requestedFilialId = searchParams.get('filial_id') || null
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '50')

    // Validate filial_id is required
    if (!requestedFilialId) {
      return NextResponse.json({ error: 'Filial é obrigatória' }, { status: 400 })
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filials to use based on authorization
    let finalFilialIds: number[] = []

    if (authorizedBranches === null) {
      // User has no restrictions - use requested values
      const ids = requestedFilialId.split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id))

      if (ids.length === 0) {
        return NextResponse.json({ error: 'Filial específica é obrigatória para este relatório' }, { status: 400 })
      }
      finalFilialIds = ids
    } else {
      // User has restrictions - filter requested filials by authorized branches
      const requestedIds = requestedFilialId.split(',').map(id => id.trim())
      const authorizedIds = requestedIds.filter(id => authorizedBranches.includes(id))

      if (authorizedIds.length === 0) {
        return NextResponse.json({
          error: 'Você não tem permissão para acessar as filiais solicitadas',
          authorized_filiais: authorizedBranches
        }, { status: 403 })
      }

      finalFilialIds = authorizedIds.map(id => parseInt(id, 10))
    }

    // Validate parameters
    if (isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Mês inválido' }, { status: 400 })
    }

    if (isNaN(ano) || ano < 2000 || ano > 2100) {
      return NextResponse.json({ error: 'Ano inválido' }, { status: 400 })
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: 'Página inválida' }, { status: 400 })
    }

    if (isNaN(pageSize) || pageSize < 1 || pageSize > 10000) {
      return NextResponse.json({ error: 'Tamanho de página inválido' }, { status: 400 })
    }

    console.log('[Perdas] Calling RPC with params:', {
      p_schema: schema,
      p_mes: mes,
      p_ano: ano,
      p_filial_ids: finalFilialIds,
      p_page: page,
      p_page_size: pageSize,
    })

    // Call RPC function for each filial in parallel
    const promises = finalFilialIds.map(async (filialId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_perdas_report', {
        p_schema: schema,
        p_mes: mes,
        p_ano: ano,
        p_filial_id: filialId,
        p_page: page,
        p_page_size: pageSize,
      })

      if (error) {
        console.error('[Perdas] Error fetching report for filial', filialId, ':', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new Error(`Erro ao buscar dados da filial ${filialId}: ${error.message}`)
      }

      return (data || []) as RowData[]
    })

    const results = await Promise.all(promises)
    const dataArray = results.flat()

    if (dataArray.length === 0) {
      console.log('[Perdas] No data received')
      return NextResponse.json({
        total_records: 0,
        page: 1,
        page_size: pageSize,
        total_pages: 0,
        hierarquia: []
      })
    }

    console.log('[Perdas] Received', dataArray.length, 'rows total from', finalFilialIds.length, 'filiais')

    // Organize data hierarchically
    const hierarquiaObj = organizeHierarchyFlat(dataArray)

    // Convert hierarchy object to array format expected by frontend
    // Sort nivel3 by total_valor DESC
    const hierarquiaArray = Object.values(hierarquiaObj)
      .map((dept3) => ({
        dept3_id: hashCode(dept3.nome),
        dept_nivel3: dept3.nome,
        total_qtde: dept3.total_qtde,
        total_valor: dept3.total_valor,
        // Sort nivel2 by total_valor DESC
        nivel2: Object.values(dept3.filhos)
          .map((dept2) => ({
            dept2_id: hashCode(dept2.nome),
            dept_nivel2: dept2.nome,
            total_qtde: dept2.total_qtde,
            total_valor: dept2.total_valor,
            // Sort nivel1 by total_valor DESC
            nivel1: Object.values(dept2.filhos)
              .map((dept1) => ({
                dept1_id: hashCode(dept1.nome),
                dept_nivel1: dept1.nome,
                total_qtde: dept1.total_qtde,
                total_valor: dept1.total_valor,
                produtos: dept1.produtos.map((p) => ({
                  codigo: p.codigo,
                  descricao: p.nome,
                  filial_id: p.filial_id,
                  qtde: p.quantidade,
                  valor_perda: p.valor_perda
                }))
              }))
              .sort((a, b) => b.total_valor - a.total_valor) // Sort nivel1
          }))
          .sort((a, b) => b.total_valor - a.total_valor) // Sort nivel2
      }))
      .sort((a, b) => b.total_valor - a.total_valor) // Sort nivel3

    console.log('[Perdas] Hierarchy array length:', hierarquiaArray.length)

    return NextResponse.json({
      total_records: hierarquiaArray.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(hierarquiaArray.length / pageSize),
      hierarquia: hierarquiaArray
    })
  } catch (error) {
    console.error('[Perdas] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao buscar relatório' },
      { status: 500 }
    )
  }
}

// Organize data hierarchically from flat data
function organizeHierarchyFlat(data: RowData[]): Hierarquia {
  const hierarquia: Hierarquia = {}

  // Group by dept_nivel3
  for (const row of data) {
    const dept3 = row.dept_nivel3
    const dept2 = row.dept_nivel2
    const dept1 = row.dept_nivel1

    // Initialize nivel 3
    if (!hierarquia[dept3]) {
      hierarquia[dept3] = {
        nome: dept3,
        nivel: 3,
        total_qtde: 0,
        total_valor: 0,
        filhos: {}
      }
    }

    // Initialize nivel 2
    if (!hierarquia[dept3].filhos[dept2]) {
      hierarquia[dept3].filhos[dept2] = {
        nome: dept2,
        nivel: 2,
        total_qtde: 0,
        total_valor: 0,
        filhos: {}
      }
    }

    // Initialize nivel 1
    if (!hierarquia[dept3].filhos[dept2].filhos[dept1]) {
      hierarquia[dept3].filhos[dept2].filhos[dept1] = {
        nome: dept1,
        nivel: 1,
        total_qtde: 0,
        total_valor: 0,
        produtos: []
      }
    }

    // Add product
    const produto = {
      codigo: row.produto_codigo,
      nome: row.produto_descricao,
      filial_id: row.filial_id,
      quantidade: typeof row.qtde === 'string' ? parseFloat(row.qtde || '0') : (row.qtde || 0),
      valor_perda: typeof row.valor_perda === 'string' ? parseFloat(row.valor_perda || '0') : (row.valor_perda || 0),
    }
    hierarquia[dept3].filhos[dept2].filhos[dept1].produtos.push(produto)

    // Accumulate values for nivel 1
    hierarquia[dept3].filhos[dept2].filhos[dept1].total_qtde += produto.quantidade
    hierarquia[dept3].filhos[dept2].filhos[dept1].total_valor += produto.valor_perda

    // Accumulate values for nivel 2
    hierarquia[dept3].filhos[dept2].total_qtde += produto.quantidade
    hierarquia[dept3].filhos[dept2].total_valor += produto.valor_perda

    // Accumulate values for nivel 3
    hierarquia[dept3].total_qtde += produto.quantidade
    hierarquia[dept3].total_valor += produto.valor_perda
  }

  return hierarquia
}
