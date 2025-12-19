import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'
import { safeRpcError } from '@/lib/api/error-handler'

interface ContextParam {
  id: string
  label: string
  filiais: string[]
  mes: number
  ano: number
}

interface DREData {
  // Receita separada por origem
  receita_bruta_pdv: number
  receita_bruta_faturamento: number
  receita_bruta: number
  desconto_venda: number
  receita_liquida: number
  // CMV separado por origem
  cmv_pdv: number
  cmv_faturamento: number
  cmv: number
  lucro_bruto: number
  margem_bruta: number
  despesas_operacionais: number
  resultado_operacional: number
  margem_operacional: number
  despesas_json: {
    departamento_id: number
    departamento: string
    valor: number
  }[]
}

interface DRELineData {
  descricao: string
  tipo: 'header' | 'subitem' | 'total'
  nivel: number
  valores: Record<string, number>
  expandable?: boolean
  items?: DRELineData[]
  isDeduction?: boolean  // Indica se é linha de dedução (CMV, despesas)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const contextsParam = searchParams.get('contexts')

    // Validations
    if (!schema || !contextsParam) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: schema, contexts' },
        { status: 400 }
      )
    }

    let contexts: ContextParam[]
    try {
      contexts = JSON.parse(contextsParam)
    } catch {
      return NextResponse.json(
        { error: 'Parâmetro contexts inválido' },
        { status: 400 }
      )
    }

    if (!Array.isArray(contexts) || contexts.length < 2 || contexts.length > 4) {
      return NextResponse.json(
        { error: 'São necessários entre 2 e 4 contextos de comparação' },
        { status: 400 }
      )
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Validate each context has valid branches
    for (const ctx of contexts) {
      if (!ctx.filiais || ctx.filiais.length === 0) {
        return NextResponse.json(
          { error: `${ctx.label}: ao menos uma filial é obrigatória` },
          { status: 400 }
        )
      }

      // Check authorization if user has branch restrictions
      if (authorizedBranches !== null) {
        const unauthorized = ctx.filiais.filter(f => !authorizedBranches.includes(f))
        if (unauthorized.length > 0) {
          return NextResponse.json(
            { error: `${ctx.label}: acesso negado a filiais: ${unauthorized.join(', ')}` },
            { status: 403 }
          )
        }
      }
    }

    console.log('[API DRE Comparativo] Params:', {
      schema,
      contextsCount: contexts.length,
      contexts: contexts.map(c => ({
        id: c.id,
        label: c.label,
        filiais: c.filiais,
        mes: c.mes,
        ano: c.ano,
      })),
    })

    // Fetch DRE data for each context
    const dreDataByContext: Record<string, DREData> = {}

    for (const ctx of contexts) {
      const filiaisIds = ctx.filiais.map(f => parseInt(f, 10))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_dre_comparativo_data', {
        p_schema: schema,
        p_filiais_ids: filiaisIds,
        p_mes: ctx.mes,
        p_ano: ctx.ano,
      })

      if (rpcError) {
        console.error('[API DRE Comparativo] RPC Error for context:', ctx.id, rpcError)
        return safeRpcError(rpcError, 'dre-comparativo')
      }

      // RPC returns array with single row
      const result = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData
      if (result) {
        dreDataByContext[ctx.id] = {
          // Receita separada
          receita_bruta_pdv: parseFloat(result.receita_bruta_pdv) || 0,
          receita_bruta_faturamento: parseFloat(result.receita_bruta_faturamento) || 0,
          receita_bruta: parseFloat(result.receita_bruta) || 0,
          desconto_venda: parseFloat(result.desconto_venda) || 0,
          receita_liquida: parseFloat(result.receita_liquida) || 0,
          // CMV separado
          cmv_pdv: parseFloat(result.cmv_pdv) || 0,
          cmv_faturamento: parseFloat(result.cmv_faturamento) || 0,
          cmv: parseFloat(result.cmv) || 0,
          lucro_bruto: parseFloat(result.lucro_bruto) || 0,
          margem_bruta: parseFloat(result.margem_bruta) || 0,
          despesas_operacionais: parseFloat(result.despesas_operacionais) || 0,
          resultado_operacional: parseFloat(result.resultado_operacional) || 0,
          margem_operacional: parseFloat(result.margem_operacional) || 0,
          despesas_json: result.despesas_json || [],
        }
      } else {
        // No data for this context
        dreDataByContext[ctx.id] = {
          receita_bruta_pdv: 0,
          receita_bruta_faturamento: 0,
          receita_bruta: 0,
          desconto_venda: 0,
          receita_liquida: 0,
          cmv_pdv: 0,
          cmv_faturamento: 0,
          cmv: 0,
          lucro_bruto: 0,
          margem_bruta: 0,
          despesas_operacionais: 0,
          resultado_operacional: 0,
          margem_operacional: 0,
          despesas_json: [],
        }
      }
    }

    console.log('[API DRE Comparativo] Data fetched for contexts:', Object.keys(dreDataByContext))

    // Build DRE lines structure
    const linhas: DRELineData[] = buildDRELines(contexts, dreDataByContext)

    // Build response
    const response = {
      linhas,
      contextos: contexts.map(c => ({
        id: c.id,
        label: c.label,
      })),
    }

    console.log('[API DRE Comparativo] Response:', {
      linhasCount: linhas.length,
      contextosCount: response.contextos.length,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API DRE Comparativo] General error:', error)
    return safeRpcError(error, 'dre-comparativo')
  }
}

/**
 * Build DRE lines structure from context data
 */
function buildDRELines(
  contexts: ContextParam[],
  dataByContext: Record<string, DREData>
): DRELineData[] {
  const linhas: DRELineData[] = []

  // Helper to create valores object
  const createValores = (getValue: (data: DREData) => number): Record<string, number> => {
    const valores: Record<string, number> = {}
    for (const ctx of contexts) {
      const data = dataByContext[ctx.id]
      valores[ctx.id] = data ? getValue(data) : 0
    }
    return valores
  }

  // Verificar se há dados de faturamento em algum contexto
  const hasFaturamento = Object.values(dataByContext).some(d => d.receita_bruta_faturamento > 0)

  // 1. RECEITA BRUTA - Com sublinhas de PDV e Faturamento
  const receitaSubItems: DRELineData[] = []

  // Sublinha: Vendas de PDV
  receitaSubItems.push({
    descricao: 'Vendas de PDV',
    tipo: 'subitem',
    nivel: 1,
    valores: createValores(d => d.receita_bruta_pdv),
    expandable: false,
  })

  // Sublinha: Vendas Faturamento (só mostra se houver dados)
  if (hasFaturamento) {
    receitaSubItems.push({
      descricao: 'Vendas Faturamento',
      tipo: 'subitem',
      nivel: 1,
      valores: createValores(d => d.receita_bruta_faturamento),
      expandable: false,
    })
  }

  linhas.push({
    descricao: 'RECEITA BRUTA',
    tipo: 'header',
    nivel: 0,
    valores: createValores(d => d.receita_liquida),
    expandable: receitaSubItems.length > 1, // Só expande se tiver mais de uma sublinha
    items: receitaSubItems.length > 1 ? receitaSubItems : undefined,
  })

  // 2. (-) CMV - Com sublinhas de PDV e Faturamento
  const cmvSubItems: DRELineData[] = []

  // Sublinha: CMV PDV
  cmvSubItems.push({
    descricao: 'CMV PDV',
    tipo: 'subitem',
    nivel: 2,
    valores: createValores(d => d.cmv_pdv),
    expandable: false,
    isDeduction: true,
  })

  // Sublinha: CMV Faturamento (só mostra se houver dados)
  if (hasFaturamento) {
    cmvSubItems.push({
      descricao: 'CMV Faturamento',
      tipo: 'subitem',
      nivel: 2,
      valores: createValores(d => d.cmv_faturamento),
      expandable: false,
      isDeduction: true,
    })
  }

  linhas.push({
    descricao: '(-) CMV - Custo da Mercadoria Vendida',
    tipo: 'subitem',
    nivel: 1,
    valores: createValores(d => d.cmv),
    expandable: cmvSubItems.length > 1, // Só expande se tiver mais de uma sublinha
    items: cmvSubItems.length > 1 ? cmvSubItems : undefined,
    isDeduction: true,
  })

  // 5. = LUCRO BRUTO
  linhas.push({
    descricao: '= LUCRO BRUTO',
    tipo: 'total',
    nivel: 0,
    valores: createValores(d => d.lucro_bruto),
    expandable: false,
  })

  // 5.1 Margem Bruta (%)
  linhas.push({
    descricao: 'Margem Bruta (%)',
    tipo: 'subitem',
    nivel: 1,
    valores: createValores(d => d.margem_bruta),
    expandable: false,
  })

  // 6. (-) DESPESAS OPERACIONAIS - With expandable items
  // Collect all unique departments across all contexts
  const allDepartments = new Map<number, string>()
  for (const ctx of contexts) {
    const data = dataByContext[ctx.id]
    if (data && data.despesas_json) {
      for (const dept of data.despesas_json) {
        if (dept.departamento_id && dept.departamento) {
          allDepartments.set(dept.departamento_id, dept.departamento)
        }
      }
    }
  }

  // Build despesas items
  const despesasItems: DRELineData[] = Array.from(allDepartments.entries()).map(([deptId, deptName]) => {
    const valores: Record<string, number> = {}
    for (const ctx of contexts) {
      const data = dataByContext[ctx.id]
      const deptData = data?.despesas_json?.find((d) => d.departamento_id === deptId)
      valores[ctx.id] = deptData ? deptData.valor : 0
    }
    return {
      descricao: deptName,
      tipo: 'subitem' as const,
      nivel: 2,
      valores,
      expandable: false,
      isDeduction: true,
    }
  }).sort((a, b) => {
    // Sort by first context value (absolute)
    const firstCtxId = contexts[0]?.id
    const aVal = Math.abs(a.valores[firstCtxId] || 0)
    const bVal = Math.abs(b.valores[firstCtxId] || 0)
    return bVal - aVal
  })

  linhas.push({
    descricao: '(-) DESPESAS OPERACIONAIS',
    tipo: 'header',
    nivel: 0,
    valores: createValores(d => d.despesas_operacionais),
    expandable: despesasItems.length > 0,
    items: despesasItems,
    isDeduction: true,
  })

  // 7. = LUCRO LÍQUIDO
  linhas.push({
    descricao: '= LUCRO LÍQUIDO',
    tipo: 'total',
    nivel: 0,
    valores: createValores(d => d.resultado_operacional),
    expandable: false,
  })

  // 7.1 Margem Líquida (%)
  linhas.push({
    descricao: 'Margem Líquida (%)',
    tipo: 'subitem',
    nivel: 1,
    valores: createValores(d => d.margem_operacional),
    expandable: false,
  })

  return linhas
}
