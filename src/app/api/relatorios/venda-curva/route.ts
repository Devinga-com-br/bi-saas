import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

// Types
interface Produto {
  codigo: number
  nome: string
  filial_id: number
  quantidade_vendida: number
  valor_vendido: number
  lucro_total: number
  percentual_lucro: number
  curva_venda: string
  curva_lucro: string
}

interface DepartamentoNivel1 {
  nome: string
  nivel: number
  valor_vendido: number
  lucro_total: number
  percentual_lucro: number
  produtos: Produto[]
}

interface DepartamentoNivel2 {
  nome: string
  nivel: number
  valor_vendido: number
  lucro_total: number
  percentual_lucro: number
  filhos: Record<string, DepartamentoNivel1>
}

interface DepartamentoNivel3 {
  nome: string
  nivel: number
  valor_vendido: number
  lucro_total: number
  percentual_lucro: number
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
  valor_vendas: string | number
  valor_lucro: string | number
  percentual_lucro: string | number
  curva_venda: string
  curva_lucro: string
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
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth()))
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

    // Determine which filial to use based on authorization
    let finalFilialId: number | null = null

    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      if (requestedFilialId && requestedFilialId !== 'all') {
        finalFilialId = parseInt(requestedFilialId, 10)
      } else {
        // If 'all' requested but no restrictions, still need to pick one for this report
        // This shouldn't happen in normal flow, but handle gracefully
        return NextResponse.json({ error: 'Filial específica é obrigatória para este relatório' }, { status: 400 })
      }
    } else {
      // User has restrictions - check if requested filial is authorized
      if (!requestedFilialId || requestedFilialId === 'all') {
        // User requested all but has restrictions - use first authorized branch
        finalFilialId = parseInt(authorizedBranches[0], 10)
      } else if (authorizedBranches.includes(requestedFilialId)) {
        // Requested filial is authorized
        finalFilialId = parseInt(requestedFilialId, 10)
      } else {
        // User requested a filial they don't have access to
        return NextResponse.json({
          error: 'Você não tem permissão para acessar esta filial',
          authorized_filiais: authorizedBranches
        }, { status: 403 })
      }
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

    console.log('[Venda Curva] Calling RPC with params:', {
      p_schema: schema,
      p_mes: mes,
      p_ano: ano,
      p_filial_id: finalFilialId,
      p_page: page,
      p_page_size: pageSize,
      requestedFilialId,
      authorizedBranches,
    })

    // Call the RPC function - retorna dados flat
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_venda_curva_report', {
      p_schema: schema,
      p_mes: mes,
      p_ano: ano,
      p_filial_id: finalFilialId,
      p_page: page,
      p_page_size: pageSize,
    })

    if (error) {
      console.error('[Venda Curva] Error fetching report:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json(
        { error: 'Erro ao buscar relatório: ' + error.message },
        { status: 500 }
      )
    }

    const dataArray = (data || []) as RowData[]

    if (dataArray.length === 0) {
      console.log('[Venda Curva] No data received')
      return NextResponse.json({
        total_records: 0,
        page: 1,
        page_size: pageSize,
        total_pages: 0,
        hierarquia: []
      })
    }

    console.log('[Venda Curva] Received', dataArray.length, 'rows')

    // Organize data hierarchically
    const hierarquiaObj = organizeHierarchyFlat(dataArray)
    
    // Convert hierarchy object to array format expected by frontend
    // Sort nivel3 by total_vendas DESC
    const hierarquiaArray = Object.values(hierarquiaObj)
      .map((dept3) => ({
        dept3_id: hashCode(dept3.nome),
        dept_nivel3: dept3.nome,
        total_vendas: dept3.valor_vendido,
        total_lucro: dept3.lucro_total,
        margem: dept3.percentual_lucro,
        // Sort nivel2 by total_vendas DESC
        nivel2: Object.values(dept3.filhos)
          .map((dept2) => ({
            dept2_id: hashCode(dept2.nome),
            dept_nivel2: dept2.nome,
            total_vendas: dept2.valor_vendido,
            total_lucro: dept2.lucro_total,
            margem: dept2.percentual_lucro,
            // Sort nivel1 by total_vendas DESC
            nivel1: Object.values(dept2.filhos)
              .map((dept1) => ({
                dept1_id: hashCode(dept1.nome),
                dept_nivel1: dept1.nome,
                total_vendas: dept1.valor_vendido,
                total_lucro: dept1.lucro_total,
                margem: dept1.percentual_lucro,
                produtos: dept1.produtos.map((p) => ({
                  codigo: p.codigo,
                  descricao: p.nome,
                  filial_id: p.filial_id,
                  qtde: p.quantidade_vendida,
                  valor_vendas: p.valor_vendido,
                  valor_lucro: p.lucro_total,
                  percentual_lucro: p.percentual_lucro,
                  curva_venda: p.curva_venda,
                  curva_lucro: p.curva_lucro
                }))
              }))
              .sort((a, b) => b.total_vendas - a.total_vendas) // Sort nivel1
          }))
          .sort((a, b) => b.total_vendas - a.total_vendas) // Sort nivel2
      }))
      .sort((a, b) => b.total_vendas - a.total_vendas) // Sort nivel3

    console.log('[Venda Curva] Hierarchy array length:', hierarquiaArray.length)
    console.log('[Venda Curva] Sample dept3:', hierarquiaArray[0] ? {
      nome: hierarquiaArray[0].dept_nivel3,
      nivel2_count: hierarquiaArray[0].nivel2?.length
    } : 'N/A')

    return NextResponse.json({
      total_records: hierarquiaArray.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(hierarquiaArray.length / pageSize),
      hierarquia: hierarquiaArray
    })
  } catch (error) {
    console.error('[Venda Curva] Unexpected error:', error)
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
        valor_vendido: 0,
        lucro_total: 0,
        percentual_lucro: 0,
        filhos: {}
      }
    }

    // Initialize nivel 2
    if (!hierarquia[dept3].filhos[dept2]) {
      hierarquia[dept3].filhos[dept2] = {
        nome: dept2,
        nivel: 2,
        valor_vendido: 0,
        lucro_total: 0,
        percentual_lucro: 0,
        filhos: {}
      }
    }

    // Initialize nivel 1
    if (!hierarquia[dept3].filhos[dept2].filhos[dept1]) {
      hierarquia[dept3].filhos[dept2].filhos[dept1] = {
        nome: dept1,
        nivel: 1,
        valor_vendido: 0,
        lucro_total: 0,
        percentual_lucro: 0,
        produtos: []
      }
    }

    // Add product
    const produto = {
      codigo: row.produto_codigo,
      nome: row.produto_descricao,
      filial_id: row.filial_id,
      quantidade_vendida: typeof row.qtde === 'string' ? parseFloat(row.qtde || '0') : (row.qtde || 0),
      valor_vendido: typeof row.valor_vendas === 'string' ? parseFloat(row.valor_vendas || '0') : (row.valor_vendas || 0),
      lucro_total: typeof row.valor_lucro === 'string' ? parseFloat(row.valor_lucro || '0') : (row.valor_lucro || 0),
      percentual_lucro: typeof row.percentual_lucro === 'string' ? parseFloat(row.percentual_lucro || '0') : (row.percentual_lucro || 0),
      curva_venda: row.curva_venda,
      curva_lucro: row.curva_lucro
    }
    hierarquia[dept3].filhos[dept2].filhos[dept1].produtos.push(produto)

    // Accumulate values for nivel 1
    hierarquia[dept3].filhos[dept2].filhos[dept1].valor_vendido += produto.valor_vendido
    hierarquia[dept3].filhos[dept2].filhos[dept1].lucro_total += produto.lucro_total

    // Accumulate values for nivel 2
    hierarquia[dept3].filhos[dept2].valor_vendido += produto.valor_vendido
    hierarquia[dept3].filhos[dept2].lucro_total += produto.lucro_total

    // Accumulate values for nivel 3
    hierarquia[dept3].valor_vendido += produto.valor_vendido
    hierarquia[dept3].lucro_total += produto.lucro_total
  }

  // Calculate percentual_lucro for all levels
  for (const dept3 of Object.values(hierarquia)) {
    if (dept3.valor_vendido > 0) {
      dept3.percentual_lucro = (dept3.lucro_total / dept3.valor_vendido) * 100
    }

    for (const dept2 of Object.values(dept3.filhos)) {
      if (dept2.valor_vendido > 0) {
        dept2.percentual_lucro = (dept2.lucro_total / dept2.valor_vendido) * 100
      }

      for (const dept1 of Object.values(dept2.filhos)) {
        if (dept1.valor_vendido > 0) {
          dept1.percentual_lucro = (dept1.lucro_total / dept1.valor_vendido) * 100
        }
      }
    }
  }

  return hierarquia
}
